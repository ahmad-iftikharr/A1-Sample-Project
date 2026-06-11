// app/page.tsx
//
// ClaimPack — single-page UI. Replaces the default page.tsx from create-next-app.
// Design: a forensic "inspection report" — evidentiary data (photo labels, IDs,
// counts, dates) is set in mono; verification status reads like a rubber stamp;
// damage uses functional severity colors. The honesty layer (confirmed vs
// unverifiable + coverage gaps) is shown plainly, never hidden.
//
// Depends only on the exports in app/lib/damageAssessment.ts.

"use client";

import { useState } from "react";
import {
  type DamageReport,
  type Damage,
  type ImageMediaType,
  type TripDetails,
  MOCK_REPORT,
} from "@/app/lib/damageAssessment";

const MAX_IMAGES = 6;
const ACCEPTED: ImageMediaType[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface UploadedImage {
  file: File;
  previewUrl: string;
}

/* ---------- helpers ---------- */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]); // strip "data:...;base64,"
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function mediaTypeOf(file: File): ImageMediaType {
  return (ACCEPTED.includes(file.type as ImageMediaType) ? file.type : "image/jpeg") as ImageMediaType;
}

function previewForLabel(
  label: string,
  pre: UploadedImage[],
  post: UploadedImage[],
): string | undefined {
  const m = label.match(/^(pre|post)_(\d+)$/);
  if (!m) return undefined;
  const idx = parseInt(m[2], 10) - 1;
  return (m[1] === "pre" ? pre : post)[idx]?.previewUrl;
}

const severityStyles: Record<Damage["severity"], string> = {
  minor: "bg-amber-50 text-amber-700 border-amber-200",
  moderate: "bg-orange-50 text-orange-700 border-orange-200",
  severe: "bg-red-50 text-red-700 border-red-200",
};

/* ---------- small components ---------- */

function Stamp({ status }: { status: Damage["verification_status"] }) {
  if (status === "confirmed_new") {
    return (
      <span className="inline-flex items-center rounded border border-emerald-400 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
        Verified · New
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded border border-dashed border-amber-400 bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-amber-700">
      Unverified
    </span>
  );
}

function PhotoStrip({
  labels,
  pre,
  post,
  caption,
}: {
  labels: string[];
  pre: UploadedImage[];
  post: UploadedImage[];
  caption: string;
}) {
  if (labels.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">{caption}</p>
      <div className="flex flex-wrap gap-2">
        {labels.map((label) => {
          const url = previewForLabel(label, pre, post);
          return url ? (
            <figure key={label} className="overflow-hidden rounded-md border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={label} className="h-24 w-24 object-cover" />
              <figcaption className="bg-neutral-50 px-1 py-0.5 text-center font-mono text-[10px] text-neutral-500">
                {label}
              </figcaption>
            </figure>
          ) : (
            <span
              key={label}
              className="inline-flex h-7 items-center rounded border border-neutral-200 bg-neutral-50 px-2 font-mono text-xs text-neutral-500"
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function DamageCard({
  damage,
  pre,
  post,
}: {
  damage: Damage;
  pre: UploadedImage[];
  post: UploadedImage[];
}) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold text-neutral-400">{damage.id}</span>
        <h3 className="text-base font-semibold text-neutral-900">{damage.location}</h3>
        <span className={`rounded border px-2 py-0.5 text-xs font-medium capitalize ${severityStyles[damage.severity]}`}>
          {damage.severity}
        </span>
        <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs capitalize text-neutral-600">
          {damage.type.replace("_", " ")}
        </span>
        <span className="ml-auto">
          <Stamp status={damage.verification_status} />
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-neutral-700">{damage.description}</p>
      <p className="mt-2 text-sm text-neutral-500">
        <span className="font-medium text-neutral-600">Why: </span>
        {damage.evidence.reasoning}
        <span className="ml-2 font-mono text-xs text-neutral-400">confidence: {damage.confidence}</span>
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <PhotoStrip labels={damage.evidence.pre_photos} pre={pre} post={post} caption="Pre-trip (clean)" />
        <PhotoStrip labels={damage.evidence.post_photos} pre={pre} post={post} caption="Post-trip (damage)" />
      </div>
    </article>
  );
}

/* ---------- upload zone ---------- */

function UploadZone({
  title,
  images,
  onPick,
}: {
  title: string;
  images: UploadedImage[];
  onPick: (files: FileList | null) => void;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-700">{title}</span>
        <span className="font-mono text-xs text-neutral-400">
          {images.length}/{MAX_IMAGES}
        </span>
      </div>
      <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-neutral-300 bg-white px-3 py-6 text-sm text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700">
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />
        Tap to add 2–6 photos
      </label>
      {images.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {images.map((img, i) => (
            <figure key={i} className="overflow-hidden rounded border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previewUrl} alt={`${title} ${i + 1}`} className="aspect-square w-full object-cover" />
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- page ---------- */

export default function Home() {
  const [trip, setTrip] = useState<TripDetails>({
    renterName: "",
    vehicle: "",
    startDate: "",
    endDate: "",
    odometerOut: "",
    odometerIn: "",
  });
  const [pre, setPre] = useState<UploadedImage[]>([]);
  const [post, setPost] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<DamageReport | null>(null);

  const setField = (k: keyof TripDetails) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setTrip((t) => ({ ...t, [k]: e.target.value }));

  const pickImages = (setter: (v: UploadedImage[]) => void) => (fileList: FileList | null) => {
    if (!fileList) return;
    const next = Array.from(fileList)
      .slice(0, MAX_IMAGES)
      .map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setter(next);
  };

  async function analyze() {
    setError(null);
    setReport(null);
    if (!trip.renterName || !trip.vehicle) {
      setError("Add the renter name and vehicle before analyzing.");
      return;
    }
    if (pre.length === 0 || post.length === 0) {
      setError("Upload at least one pre-trip and one post-trip photo.");
      return;
    }
    setLoading(true);
    try {
      const encode = (imgs: UploadedImage[]) =>
        Promise.all(imgs.map(async (i) => ({ mediaType: mediaTypeOf(i.file), data: await fileToBase64(i.file) })));
      const [preImages, postImages] = await Promise.all([encode(pre), encode(post)]);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip, preImages, postImages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "The analysis didn't complete. Try again.");
        return;
      }
      setReport(data as DamageReport);
    } catch {
      setError("Couldn't reach the analyzer. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }

  const confirmed = report?.summary.new_damage_confirmed;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      {/* Header */}
      <header className="print:hidden">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">Vehicle handover · return</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-neutral-900">ClaimPack</h1>
        <p className="mt-1 max-w-xl text-neutral-500">
          Compare handover and return photos, get a verified damage report, and copy a claim letter that only charges
          for damage you can actually prove.
        </p>
      </header>

      {/* Inputs */}
      <section className="mt-8 space-y-4 print:hidden">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Trip details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Renter name" value={trip.renterName} onChange={setField("renterName")} placeholder="Jordan Lee" />
            <Field label="Vehicle" value={trip.vehicle} onChange={setField("vehicle")} placeholder="2021 Toyota Corolla, ABC-1234" />
            <Field label="Trip start" type="date" value={trip.startDate} onChange={setField("startDate")} />
            <Field label="Trip end" type="date" value={trip.endDate} onChange={setField("endDate")} />
            <Field label="Odometer out" value={trip.odometerOut ?? ""} onChange={setField("odometerOut")} placeholder="34,210" mono />
            <Field label="Odometer in" value={trip.odometerIn ?? ""} onChange={setField("odometerIn")} placeholder="34,498" mono />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <UploadZone title="Pre-trip photos" images={pre} onPick={pickImages(setPre)} />
          <UploadZone title="Post-trip photos" images={post} onPick={pickImages(setPost)} />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={analyze}
            disabled={loading}
            className="inline-flex items-center rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:opacity-60"
          >
            {loading ? "Comparing photos…" : "Analyze"}
          </button>
          <button
            onClick={() => {
              setError(null);
              setReport(MOCK_REPORT);
            }}
            className="text-sm text-neutral-400 underline-offset-4 hover:text-neutral-600 hover:underline"
          >
            Load sample result
          </button>
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
      </section>

      {/* Results */}
      {report && (
        <section className="mt-10">
          {/* Summary */}
          <div
            className={`rounded-lg border-l-4 p-4 ${
              confirmed ? "border-l-red-500 bg-red-50/60" : "border-l-emerald-500 bg-emerald-50/60"
            }`}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-lg font-semibold text-neutral-900">
                {confirmed ? "New damage confirmed" : "No new damage confirmed"}
              </h2>
              <span className="font-mono text-xs text-neutral-500">
                {report.summary.confirmed_count} confirmed · {report.summary.unverifiable_count} unverifiable ·
                confidence {report.summary.overall_confidence}
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-700">{report.summary.note}</p>
          </div>

          {/* Findings */}
          {report.damages.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Findings</h2>
              <div className="space-y-3">
                {report.damages.map((d) => (
                  <DamageCard key={d.id} damage={d} pre={pre} post={post} />
                ))}
              </div>
            </div>
          )}

          {/* Coverage gaps */}
          {report.coverage_gaps.length > 0 && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">Not verifiable</h2>
              <p className="mt-1 text-xs text-amber-700/80">
                Areas missing from one of the photo sets — damage here can't be attributed to this rental.
              </p>
              <ul className="mt-3 space-y-2">
                {report.coverage_gaps.map((g, i) => (
                  <li key={i} className="text-sm text-neutral-700">
                    <span className="font-medium text-neutral-800">{g.area}.</span> {g.note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Claim letter */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Claim letter</h2>
              <div className="flex gap-2 print:hidden">
                <button
                  onClick={() => report && navigator.clipboard.writeText(report.claim_letter)}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition hover:bg-neutral-50"
                >
                  Copy
                </button>
                <button
                  onClick={() => window.print()}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition hover:bg-neutral-50"
                >
                  Print / Save PDF
                </button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap rounded-lg border border-neutral-200 bg-white p-5 font-sans text-sm leading-relaxed text-neutral-800">
              {report.claim_letter}
            </pre>
          </div>

          {/* Checklist */}
          {report.evidence_checklist.length > 0 && (
            <div className="mt-6 print:hidden">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Attach when filing
              </h2>
              <ul className="list-inside list-disc space-y-1 text-sm text-neutral-600">
                {report.evidence_checklist.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <footer className="mt-16 border-t border-neutral-200 pt-4 text-xs text-neutral-400 print:hidden">
        ClaimPack compares handover and return photos. It only confirms damage it can verify against a matching
        pre-trip photo; everything else is flagged, not charged.
      </footer>
    </main>
  );
}

/* ---------- field ---------- */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 ${
          mono ? "font-mono" : ""
        }`}
      />
    </label>
  );
}
