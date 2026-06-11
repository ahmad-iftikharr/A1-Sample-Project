// app/page.tsx — ClaimPack redesigned UI (dark, vibrant)
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function mediaTypeOf(file: File): ImageMediaType {
  return (ACCEPTED.includes(file.type as ImageMediaType) ? file.type : "image/jpeg") as ImageMediaType;
}

function previewForLabel(label: string, pre: UploadedImage[], post: UploadedImage[]): string | undefined {
  const m = label.match(/^(pre|post)_(\d+)$/);
  if (!m) return undefined;
  const idx = parseInt(m[2], 10) - 1;
  return (m[1] === "pre" ? pre : post)[idx]?.previewUrl;
}

function Stamp({ status }: { status: Damage["verification_status"] }) {
  if (status === "confirmed_new") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center",
        borderRadius: 4, border: "1px solid #10B981",
        background: "rgba(16,185,129,0.12)",
        padding: "2px 8px", fontFamily: "monospace", fontSize: 11, fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase", color: "#34D399"
      }}>✓ Verified · New</span>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      borderRadius: 4, border: "1px dashed #F59E0B",
      background: "rgba(245,158,11,0.1)",
      padding: "2px 8px", fontFamily: "monospace", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.1em", textTransform: "uppercase", color: "#FBB040"
    }}>⚠ Unverified</span>
  );
}

function PhotoStrip({ labels, pre, post, caption }: { labels: string[]; pre: UploadedImage[]; post: UploadedImage[]; caption: string }) {
  if (labels.length === 0) return null;
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748B", marginBottom: 8 }}>{caption}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {labels.map((label) => {
          const url = previewForLabel(label, pre, post);
          return url ? (
            <figure key={label} style={{ margin: 0, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(99,102,241,0.3)" }}>
              <img src={url} alt={label} style={{ width: 96, height: 96, objectFit: "cover", display: "block" }} />
              <figcaption style={{ background: "#0F1829", padding: "3px 6px", textAlign: "center", fontFamily: "monospace", fontSize: 10, color: "#64748B" }}>{label}</figcaption>
            </figure>
          ) : (
            <span key={label} style={{
              display: "inline-flex", height: 28, alignItems: "center",
              borderRadius: 6, border: "1px solid rgba(99,102,241,0.2)",
              background: "rgba(99,102,241,0.06)", padding: "0 10px",
              fontFamily: "monospace", fontSize: 12, color: "#64748B"
            }}>{label}</span>
          );
        })}
      </div>
    </div>
  );
}

function DamageCard({ damage, pre, post }: { damage: Damage; pre: UploadedImage[]; post: UploadedImage[] }) {
  const severityColor: Record<Damage["severity"], string> = { minor: "#FBB040", moderate: "#FB923C", severe: "#F87171" };
  const severityBg: Record<Damage["severity"], string> = { minor: "rgba(251,176,64,0.1)", moderate: "rgba(251,146,60,0.1)", severe: "rgba(248,113,113,0.1)" };
  return (
    <article
      style={{ borderRadius: 12, border: "1px solid rgba(99,102,241,0.2)", background: "linear-gradient(135deg, #0F1829 0%, #111B2E 100%)", padding: 20, transition: "border-color 0.2s, box-shadow 0.2s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.5)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(99,102,241,0.08)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.2)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "#4B5563" }}>{damage.id}</span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#F1F5F9" }}>{damage.location}</h3>
        <span style={{ borderRadius: 6, border: `1px solid ${severityColor[damage.severity]}`, background: severityBg[damage.severity], padding: "2px 10px", fontSize: 12, fontWeight: 600, textTransform: "capitalize", color: severityColor[damage.severity] }}>{damage.severity}</span>
        <span style={{ borderRadius: 6, border: "1px solid rgba(148,163,184,0.2)", background: "rgba(148,163,184,0.06)", padding: "2px 10px", fontSize: 12, color: "#94A3B8", textTransform: "capitalize" }}>{damage.type.replace("_", " ")}</span>
        <span style={{ marginLeft: "auto" }}><Stamp status={damage.verification_status} /></span>
      </div>
      <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.7, color: "#CBD5E1" }}>{damage.description}</p>
      <p style={{ marginTop: 8, fontSize: 13, color: "#64748B" }}>
        <span style={{ fontWeight: 600, color: "#94A3B8" }}>Why: </span>{damage.evidence.reasoning}
        <span style={{ marginLeft: 8, fontFamily: "monospace", fontSize: 11, color: "#4B5563" }}>confidence: {damage.confidence}</span>
      </p>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <PhotoStrip labels={damage.evidence.pre_photos} pre={pre} post={post} caption="Pre-trip (clean)" />
        <PhotoStrip labels={damage.evidence.post_photos} pre={pre} post={post} caption="Post-trip (damage)" />
      </div>
    </article>
  );
}

function UploadZone({ title, images, onPick }: { title: string; images: UploadedImage[]; onPick: (files: FileList | null) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.04)", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8" }}>{title}</span>
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#4B5563" }}>{images.length}/{MAX_IMAGES}</span>
      </div>
      <label
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          borderRadius: 10, border: `2px dashed ${dragging ? "#6366F1" : "rgba(99,102,241,0.3)"}`,
          background: dragging ? "rgba(99,102,241,0.08)" : "rgba(15,24,41,0.6)",
          padding: "28px 16px", cursor: "pointer", transition: "all 0.2s",
          boxShadow: dragging ? "0 0 20px rgba(99,102,241,0.15)" : "none",
        }}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDrop={() => setDragging(false)}
      >
        <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => onPick(e.target.files)} />
        <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
        <span style={{ fontSize: 13, color: dragging ? "#818CF8" : "#64748B", fontWeight: 500 }}>{dragging ? "Drop photos here" : "Tap to add 2–6 photos"}</span>
        <span style={{ fontSize: 11, color: "#374151", marginTop: 4 }}>JPEG · PNG · WebP</span>
      </label>
      {images.length > 0 && (
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {images.map((img, i) => (
            <figure key={i} style={{ margin: 0, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(99,102,241,0.25)" }}>
              <img src={img.previewUrl} alt={`${title} ${i + 1}`} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", mono = false }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string; mono?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#64748B" }}>{label}</span>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: "100%", borderRadius: 8, border: `1px solid ${focused ? "#6366F1" : "rgba(99,102,241,0.2)"}`,
          background: focused ? "rgba(99,102,241,0.06)" : "#0C1423",
          padding: "9px 12px", fontSize: 14, color: "#F1F5F9", outline: "none",
          boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.15)" : "none",
          transition: "all 0.15s", fontFamily: mono ? "monospace" : "inherit", boxSizing: "border-box",
        }}
      />
    </label>
  );
}

export default function Home() {
  const [trip, setTrip] = useState<TripDetails>({ renterName: "", vehicle: "", startDate: "", endDate: "", odometerOut: "", odometerIn: "" });
  const [pre, setPre] = useState<UploadedImage[]>([]);
  const [post, setPost] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<DamageReport | null>(null);

  const setField = (k: keyof TripDetails) => (e: React.ChangeEvent<HTMLInputElement>) => setTrip((t) => ({ ...t, [k]: e.target.value }));
  const pickImages = (setter: (v: UploadedImage[]) => void) => (fileList: FileList | null) => {
    if (!fileList) return;
    setter(Array.from(fileList).slice(0, MAX_IMAGES).map((file) => ({ file, previewUrl: URL.createObjectURL(file) })));
  };

  async function analyze() {
    setError(null); setReport(null);
    if (!trip.renterName || !trip.vehicle) { setError("Add the renter name and vehicle before analyzing."); return; }
    if (pre.length === 0 || post.length === 0) { setError("Upload at least one pre-trip and one post-trip photo."); return; }
    setLoading(true);
    try {
      const encode = (imgs: UploadedImage[]) => Promise.all(imgs.map(async (i) => ({ mediaType: mediaTypeOf(i.file), data: await fileToBase64(i.file) })));
      const [preImages, postImages] = await Promise.all([encode(pre), encode(post)]);
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trip, preImages, postImages }) });
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? "The analysis didn't complete. Try again."); return; }
      setReport(data as DamageReport);
    } catch { setError("Couldn't reach the analyzer. Check your connection and retry."); }
    finally { setLoading(false); }
  }

  const confirmed = report?.summary.new_damage_confirmed;

  return (
    <main style={{ minHeight: "100vh", background: "#070B14", padding: "0 0 80px" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
        * { box-sizing: border-box; }
        @media (max-width: 600px) { .two-col { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(99,102,241,0.15)", background: "rgba(7,11,20,0.95)", backdropFilter: "blur(12px)", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔍</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#F1F5F9", letterSpacing: "-0.01em" }}>ClaimPack</span>
        </div>
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#374151", letterSpacing: "0.12em", textTransform: "uppercase" }}>Vehicle Damage Analyzer</span>
      </nav>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "48px 24px 0" }}>

        {/* Hero */}
        <header style={{ marginBottom: 40 }}>
          <div style={{ display: "inline-block", borderRadius: 20, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.1)", padding: "4px 14px", marginBottom: 16, fontFamily: "monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#818CF8" }}>
            Handover · Return Analysis
          </div>
          <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, background: "linear-gradient(135deg, #F1F5F9 0%, #818CF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Verify damage.<br />Build airtight claims.
          </h1>
          <p style={{ marginTop: 12, fontSize: 15, color: "#64748B", maxWidth: 520, lineHeight: 1.7 }}>
            Compare handover and return photos side-by-side. ClaimPack only charges for damage it can verify — everything else is flagged, not billed.
          </p>
        </header>

        {/* Inputs */}
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ borderRadius: 16, border: "1px solid rgba(99,102,241,0.2)", background: "linear-gradient(135deg, #0C1423 0%, #0F1829 100%)", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366F1" }} />
              <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748B" }}>Trip Details</h2>
            </div>
            <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Renter name" value={trip.renterName} onChange={setField("renterName")} placeholder="Jordan Lee" />
              <Field label="Vehicle" value={trip.vehicle} onChange={setField("vehicle")} placeholder="2021 Toyota Corolla · ABC-1234" />
              <Field label="Trip start" type="date" value={trip.startDate} onChange={setField("startDate")} />
              <Field label="Trip end" type="date" value={trip.endDate} onChange={setField("endDate")} />
              <Field label="Odometer out" value={trip.odometerOut ?? ""} onChange={setField("odometerOut")} placeholder="34,210 km" mono />
              <Field label="Odometer in" value={trip.odometerIn ?? ""} onChange={setField("odometerIn")} placeholder="34,498 km" mono />
            </div>
          </div>

          <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <UploadZone title="Pre-trip photos" images={pre} onPick={pickImages(setPre)} />
            <UploadZone title="Post-trip photos" images={post} onPick={pickImages(setPost)} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4 }}>
            <button
              onClick={analyze} disabled={loading}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 10, border: "none",
                background: loading ? "#1E2A3B" : "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                padding: "12px 28px", fontSize: 14, fontWeight: 700,
                color: loading ? "#4B5563" : "#fff", cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 4px 24px rgba(99,102,241,0.35)", transition: "all 0.2s",
              }}
            >
              {loading ? (
                <><span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: "2px solid #4B5563", borderTopColor: "#6366F1", animation: "spin 0.7s linear infinite" }} /> Comparing photos…</>
              ) : <>⚡ Analyze damage</>}
            </button>
            <button
              onClick={() => { setError(null); setReport(MOCK_REPORT); }}
              style={{ fontSize: 13, color: "#4B5563", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#818CF8"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4B5563"; }}
            >Load sample result</button>
          </div>

          {error && (
            <div style={{ borderRadius: 10, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", padding: "12px 16px", fontSize: 14, color: "#FCA5A5", display: "flex", alignItems: "center", gap: 8 }}>
              <span>⚠</span> {error}
            </div>
          )}
        </section>

        {/* Results */}
        {report && (
          <section style={{ marginTop: 48 }}>
            {/* Verdict */}
            <div style={{
              borderRadius: 16, border: `1px solid ${confirmed ? "rgba(248,113,113,0.4)" : "rgba(16,185,129,0.4)"}`,
              background: confirmed ? "linear-gradient(135deg, rgba(248,113,113,0.1) 0%, rgba(239,68,68,0.06) 100%)" : "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(52,211,153,0.06) 100%)",
              padding: "20px 24px", marginBottom: 32,
              boxShadow: confirmed ? "0 0 40px rgba(248,113,113,0.08)" : "0 0 40px rgba(16,185,129,0.08)",
            }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "8px 16px" }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#F1F5F9" }}>{confirmed ? "🔴 New damage confirmed" : "✅ No new damage confirmed"}</h2>
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "#64748B" }}>
                  {report.summary.confirmed_count} confirmed · {report.summary.unverifiable_count} unverifiable · confidence {report.summary.overall_confidence}
                </span>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "#94A3B8", lineHeight: 1.7 }}>{report.summary.note}</p>
            </div>

            {/* Findings */}
            {report.damages.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F87171" }} />
                  <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748B" }}>Findings</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {report.damages.map((d) => <DamageCard key={d.id} damage={d} pre={pre} post={post} />)}
                </div>
              </div>
            )}

            {/* Coverage gaps */}
            {report.coverage_gaps.length > 0 && (
              <div style={{ borderRadius: 14, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.06)", padding: "20px 24px", marginBottom: 32 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FBB040" }}>Not verifiable</h2>
                <p style={{ margin: "0 0 16px", fontSize: 12, color: "#78350F" }}>Areas missing from one photo set — damage here can't be attributed to this rental.</p>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {report.coverage_gaps.map((g, i) => (
                    <li key={i} style={{ fontSize: 14, color: "#CBD5E1" }}>
                      <span style={{ fontWeight: 600, color: "#F1F5F9" }}>{g.area}.</span> {g.note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Claim letter */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#818CF8" }} />
                  <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748B" }}>Claim Letter</h2>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ label: "📋 Copy", action: () => navigator.clipboard.writeText(report.claim_letter) }, { label: "🖨 Print / PDF", action: () => window.print() }].map(btn => (
                    <button key={btn.label} onClick={btn.action} style={{ borderRadius: 8, border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.08)", padding: "7px 14px", fontSize: 13, color: "#818CF8", cursor: "pointer" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.16)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.08)"; }}
                    >{btn.label}</button>
                  ))}
                </div>
              </div>
              <pre style={{ whiteSpace: "pre-wrap", borderRadius: 14, border: "1px solid rgba(99,102,241,0.15)", background: "#0C1423", padding: "24px 28px", fontFamily: "monospace", fontSize: 13, lineHeight: 1.8, color: "#CBD5E1", margin: 0 }}>
                {report.claim_letter}
              </pre>
            </div>

            {/* Checklist */}
            {report.evidence_checklist.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
                  <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748B" }}>Attach when filing</h2>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                  {report.evidence_checklist.map((item, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#94A3B8" }}>
                      <span style={{ color: "#10B981", marginTop: 1, flexShrink: 0 }}>✓</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <footer style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid rgba(99,102,241,0.1)", fontSize: 12, color: "#374151", lineHeight: 1.7 }}>
          ClaimPack compares handover and return photos. It only confirms damage it can verify against a matching pre-trip photo — everything else is flagged, not charged.
        </footer>
      </div>
    </main>
  );
}
