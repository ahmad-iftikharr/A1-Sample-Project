// app/lib/damageAssessment.ts  — GEMINI version
//
// ClaimPack core, rewritten for the Google Gemini free tier.
// What changed from the Anthropic version:
//   - buildContents() returns Gemini "parts" instead of Anthropic content blocks.
//   - DAMAGE_SCHEMA drops every `additionalProperties` (Gemini's responseSchema
//     doesn't support it). Everything else in the schema is identical.
//   - SYSTEM_PROMPT, the TS types, and MOCK_REPORT are UNCHANGED.
//
// Install:  npm i @google/genai
// Env:      GEMINI_API_KEY  (get a free key at aistudio.google.com, no card)

/* ===========================================================================
 * 1. SYSTEM PROMPT — identical to the Anthropic version. ITERATE HERE.
 * Passed via config.systemInstruction in the route.
 * ========================================================================= */
export const SYSTEM_PROMPT = `You are a professional vehicle condition assessor for a peer-to-peer car rental platform (similar to Turo). You compare a vehicle's PRE-TRIP photos (taken at handover to the renter) against its POST-TRIP photos (taken when the renter returned it) and identify NEW damage that occurred during the rental.

Your assessment may support a real financial damage claim. A false accusation unfairly charges an honest renter; a missed finding costs the owner. Accuracy and honesty matter more than producing findings. When evidence is weak, say so plainly rather than guessing.

ASSESSMENT RULES

1. New damage only. Include an item only when damage is visible in a POST-TRIP photo AND the same area, where it appears in a PRE-TRIP photo, was undamaged. If the same damage is visible in BOTH sets, it is pre-existing — do not report it.

2. Damage vs non-damage. Do NOT report dirt, mud, dust, road grime, water droplets, wet-vs-dry surfaces, reflections, glare, or shadows — these are not damage. If you cannot confidently separate a mark from these artifacts, lower its confidence or omit it entirely.

3. Verify coverage for every finding. For each post-trip damage, decide whether the same panel/area is actually shown in a pre-trip photo:
   - A pre-trip photo shows that area and it was clean -> verification_status = "confirmed_new".
   - NO pre-trip photo shows that area -> verification_status = "unverifiable". You cannot prove the damage is new: evidence.pre_photos MUST be empty and reasoning MUST state the area was not photographed pre-trip.

4. Record blind spots. In coverage_gaps, list every vehicle area that appears in one set but not the other. These are the areas where damage cannot be attributed to this rental. An honest report names its own limits.

5. Cite specific photos. Reference images by their exact labels (e.g. "pre_2", "post_3"). evidence.post_photos lists the photo(s) showing the damage; evidence.pre_photos lists the pre-trip photo(s) proving the area was previously clean (empty if unverifiable); reasoning is one sentence describing what you see.

6. Severity. minor = cosmetic/surface (light scratch, small chip). moderate = clearly visible, likely chargeable (dent, deep scratch, cracked trim). severe = structural, safety, or large-area (broken light, panel deformation, cracked glass).

7. Claim letter. Write a letter the owner can send. State the renter name, vehicle, and rental dates. Itemise ONLY "confirmed_new" damage with location and severity. Keep it factual, firm, and neutral — no exaggeration, threats, or emotional language. If there are no confirmed_new findings, the letter states the vehicle was returned in matching condition and no claim is warranted.

8. evidence_checklist. List the concrete items the owner should attach when filing (the specific photo pairs, capture timestamps, the signed condition report), so the claim is well-evidenced.

Set summary.new_damage_confirmed to true ONLY if at least one item is "confirmed_new". summary.note is a one-to-two sentence plain-language verdict for the owner.`;

/* ===========================================================================
 * 2. OUTPUT SCHEMA — for Gemini's config.responseSchema.
 * Same shape as the Anthropic schema, MINUS `additionalProperties` (unsupported
 * by Gemini). Every field is still required; "none" is an empty array/string.
 * ========================================================================= */
export const DAMAGE_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "object",
      properties: {
        new_damage_confirmed: { type: "boolean" },
        confirmed_count: { type: "integer" },
        unverifiable_count: { type: "integer" },
        overall_confidence: { type: "string", enum: ["high", "medium", "low"] },
        note: { type: "string" },
      },
      required: [
        "new_damage_confirmed",
        "confirmed_count",
        "unverifiable_count",
        "overall_confidence",
        "note",
      ],
    },
    damages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          location: { type: "string" },
          type: {
            type: "string",
            enum: [
              "scratch",
              "dent",
              "crack",
              "chip",
              "paint_transfer",
              "stain",
              "tear",
              "missing_part",
              "glass_damage",
              "other",
            ],
          },
          severity: { type: "string", enum: ["minor", "moderate", "severe"] },
          description: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          verification_status: {
            type: "string",
            enum: ["confirmed_new", "unverifiable"],
          },
          evidence: {
            type: "object",
            properties: {
              pre_photos: { type: "array", items: { type: "string" } },
              post_photos: { type: "array", items: { type: "string" } },
              reasoning: { type: "string" },
            },
            required: ["pre_photos", "post_photos", "reasoning"],
          },
        },
        required: [
          "id",
          "location",
          "type",
          "severity",
          "description",
          "confidence",
          "verification_status",
          "evidence",
        ],
      },
    },
    coverage_gaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          area: { type: "string" },
          note: { type: "string" },
        },
        required: ["area", "note"],
      },
    },
    claim_letter: { type: "string" },
    evidence_checklist: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "damages", "coverage_gaps", "claim_letter", "evidence_checklist"],
};

/* ===========================================================================
 * 3. TYPES — UNCHANGED from the Anthropic version.
 * ========================================================================= */
export type Severity = "minor" | "moderate" | "severe";
export type Confidence = "high" | "medium" | "low";
export type VerificationStatus = "confirmed_new" | "unverifiable";
export type DamageType =
  | "scratch"
  | "dent"
  | "crack"
  | "chip"
  | "paint_transfer"
  | "stain"
  | "tear"
  | "missing_part"
  | "glass_damage"
  | "other";

export interface DamageEvidence {
  pre_photos: string[];
  post_photos: string[];
  reasoning: string;
}

export interface Damage {
  id: string;
  location: string;
  type: DamageType;
  severity: Severity;
  description: string;
  confidence: Confidence;
  verification_status: VerificationStatus;
  evidence: DamageEvidence;
}

export interface CoverageGap {
  area: string;
  note: string;
}

export interface DamageReport {
  summary: {
    new_damage_confirmed: boolean;
    confirmed_count: number;
    unverifiable_count: number;
    overall_confidence: Confidence;
    note: string;
  };
  damages: Damage[];
  coverage_gaps: CoverageGap[];
  claim_letter: string;
  evidence_checklist: string[];
}

/* ===========================================================================
 * 4. CONTENT BUILDER — Gemini "parts". Labels each image (pre_1, post_2, ...)
 * with a text part right before it so the model can cite exact photos.
 * IMPORTANT: data must be RAW base64 (strip the "data:image/...;base64," prefix
 * that FileReader.readAsDataURL adds on the client).
 * ========================================================================= */
export type ImageMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";

export interface InputImage {
  mediaType: ImageMediaType;
  data: string; // raw base64, no data: URI prefix
}

export interface TripDetails {
  renterName: string;
  vehicle: string;
  startDate: string;
  endDate: string;
  odometerOut?: string;
  odometerIn?: string;
}

// Minimal local type for a Gemini content part (avoids depending on SDK type exports).
type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: ImageMediaType; data: string } };

export function buildContents(
  trip: TripDetails,
  preImages: InputImage[],
  postImages: InputImage[],
): GeminiPart[] {
  const parts: GeminiPart[] = [];

  parts.push({
    text:
      "TRIP DETAILS\n" +
      `Renter: ${trip.renterName}\n` +
      `Vehicle: ${trip.vehicle}\n` +
      `Rental period: ${trip.startDate} to ${trip.endDate}\n` +
      `Odometer out / in: ${trip.odometerOut ?? "n/a"} / ${trip.odometerIn ?? "n/a"}`,
  });

  parts.push({ text: "\n=== PRE-TRIP PHOTOS (condition at handover) ===" });
  preImages.forEach((img, i) => {
    parts.push({ text: `pre_${i + 1}:` });
    parts.push({ inlineData: { mimeType: img.mediaType, data: img.data } });
  });

  parts.push({ text: "\n=== POST-TRIP PHOTOS (condition at return) ===" });
  postImages.forEach((img, i) => {
    parts.push({ text: `post_${i + 1}:` });
    parts.push({ inlineData: { mimeType: img.mediaType, data: img.data } });
  });

  parts.push({ text: "\nCompare the two photo sets and produce the assessment." });

  return parts;
}

/* ===========================================================================
 * 5. MOCK REPORT — UNCHANGED. Wire your results UI against this before the
 * vision call is tuned.
 * ========================================================================= */
export const MOCK_REPORT: DamageReport = {
  summary: {
    new_damage_confirmed: true,
    confirmed_count: 1,
    unverifiable_count: 1,
    overall_confidence: "high",
    note: "One new scratch confirmed on the driver-side front bumper. A scuff on the rear bumper could not be verified because the rear was not photographed pre-trip.",
  },
  damages: [
    {
      id: "D1",
      location: "front bumper, driver side",
      type: "scratch",
      severity: "moderate",
      description:
        "A roughly 15 cm horizontal scratch through the clear coat near the wheel arch.",
      confidence: "high",
      verification_status: "confirmed_new",
      evidence: {
        pre_photos: ["pre_2"],
        post_photos: ["post_3"],
        reasoning:
          "The same panel is clean and unmarked in pre_2 but shows a clear scratch in post_3.",
      },
    },
    {
      id: "D2",
      location: "rear bumper, center",
      type: "scratch",
      severity: "minor",
      description: "A light scuff mark near the license plate recess.",
      confidence: "medium",
      verification_status: "unverifiable",
      evidence: {
        pre_photos: [],
        post_photos: ["post_5"],
        reasoning:
          "The rear bumper does not appear in any pre-trip photo, so this scuff cannot be attributed to this rental.",
      },
    },
  ],
  coverage_gaps: [
    {
      area: "rear bumper and rear panels",
      note: "Not captured in the pre-trip set, so any rear damage cannot be proven new.",
    },
  ],
  claim_letter:
    "Dear Jordan Lee,\n\nThank you for renting the 2021 Toyota Corolla (ABC-1234) for the period of March 3–6, 2026. During the post-trip inspection we identified the following new damage not present at handover:\n\n- Front bumper, driver side: a moderate scratch (~15 cm) through the clear coat, visible in the return photos but absent from the handover photos of the same panel.\n\nWe are filing a damage claim limited to this item and have attached the supporting pre- and post-trip photographs. Please review at your earliest convenience.\n\nRegards,\n[Owner name]",
  evidence_checklist: [
    "Pre-trip photo pre_2 and post-trip photo post_3 of the driver-side front bumper (side by side).",
    "Capture timestamps for both photo sets.",
    "The signed pre-trip condition report.",
  ],
};
