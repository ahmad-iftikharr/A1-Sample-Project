// app/api/analyze/route.ts  — GEMINI version
//
// POST /api/analyze
// Body: { trip: TripDetails, preImages: InputImage[], postImages: InputImage[] }
//   - image data must be RAW base64 (strip the "data:...;base64," prefix on the client)
// Returns: DamageReport
//
// Install:  npm i @google/genai
// Env:      GEMINI_API_KEY in .env.local  (free key from aistudio.google.com, no card)

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  SYSTEM_PROMPT,
  DAMAGE_SCHEMA,
  buildContents,
  type DamageReport,
  type InputImage,
  type TripDetails,
} from "@/app/lib/damageAssessment";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Free-tier, vision-capable. Swap if AI Studio shows a newer free Flash model
// (e.g. "gemini-3.5-flash"). Flash-Lite has higher rate limits but lower quality.
const MODEL = "gemini-2.5-flash";
const MAX_IMAGES_PER_SET = 6;

interface AnalyzeBody {
  trip: TripDetails;
  preImages: InputImage[];
  postImages: InputImage[];
}

export async function POST(request: Request) {
  let body: AnalyzeBody;
  try {
    body = (await request.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { trip, preImages, postImages } = body;

  // --- validation ---------------------------------------------------------
  if (!trip?.renterName || !trip?.vehicle) {
    return NextResponse.json(
      { error: "trip.renterName and trip.vehicle are required." },
      { status: 400 },
    );
  }
  if (!preImages?.length || !postImages?.length) {
    return NextResponse.json(
      { error: "At least one pre-trip and one post-trip photo are required." },
      { status: 400 },
    );
  }
  if (
    preImages.length > MAX_IMAGES_PER_SET ||
    postImages.length > MAX_IMAGES_PER_SET
  ) {
    return NextResponse.json(
      { error: `Each set is limited to ${MAX_IMAGES_PER_SET} photos.` },
      { status: 400 },
    );
  }

  // --- call Gemini --------------------------------------------------------
  let rawText: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildContents(trip, preImages, postImages),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json", // JSON mode
        responseSchema: DAMAGE_SCHEMA, // constrains the shape
        temperature: 0, // deterministic for consistent assessments
        maxOutputTokens: 4096, // generous so the letter never truncates
      },
    });
    rawText = response.text; // getter, not a function, in @google/genai
  } catch (err) {
    console.error("[analyze] Gemini call failed:", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 },
    );
  }

  if (!rawText) {
    // Empty text usually means a safety block or an empty candidate.
    return NextResponse.json(
      { error: "The model returned no result for these images." },
      { status: 422 },
    );
  }

  // Gemini JSON mode returns valid JSON; the try/catch is a safety net only.
  try {
    const report = JSON.parse(rawText) as DamageReport;
    return NextResponse.json(report);
  } catch (err) {
    console.error("[analyze] JSON parse failed. Raw text:", rawText, err);
    return NextResponse.json(
      { error: "Could not parse the assessment. Please retry." },
      { status: 500 },
    );
  }
}
