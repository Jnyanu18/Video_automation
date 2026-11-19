// v6 Instagram-question format (copied from c2-bubble v6 overlay.tsx): the persistent series tag and the anonymous
// IG DM card for a question he reads. No usernames, photos, timestamps or counts.
import React from "react";
import { lerp, popS, progS } from "../lib";

// The persistent series tag (frame 0 to the end). Set per series; keep it short enough to fit one line at 25 px.
export const SERIES = "MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS";
export const UI_FONT = `"Segoe UI", "Segoe UI Variable Display", Arial, sans-serif`;
const IG_GRAD = "linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5)";
const DM_GRAD = "linear-gradient(135deg, #a033ff 0%, #6a5cff 55%, #2f8bff 100%)";

const Plane: React.FC<{ s: number; c?: string }> = ({ s, c = "#fff" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round">
    <path d="M22 3 L9.2 10.1" /><path d="M22 3 L14.6 21 L11.2 13.2 L3 10.4 Z" />
  </svg>
);

// persistent series tag (frame 0 to the end), styled like an IG chip; y ~230-276
export const SeriesTag: React.FC = () => (
  <div style={{ position: "absolute", left: 40, top: 230, fontFamily: UI_FONT, padding: 3, borderRadius: 999, background: IG_GRAD, boxShadow: "0 8px 24px rgba(0,0,0,.45)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 22px 8px 12px", borderRadius: 999, background: "rgba(14,14,20,.92)" }}>
      <div style={{ width: 34, height: 34, borderRadius: 17, background: IG_GRAD, display: "flex", alignItems: "center", justifyContent: "center" }}><Plane s={20} /></div>
      <div style={{ fontSize: 25, fontWeight: 800, color: "#fff", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{SERIES}</div>
    </div>
  </div>
);

// a question he reads out, as an anonymous Instagram DM in the top band (visible a..b)
export const IGQuestion: React.FC<{ t: number; a: number; b: number; text: string; size?: number; top?: number }> = ({ t, a, b, text, size = 84, top = 300 }) => {
  const k = popS(t, a, 14) * (1 - progS(t, b - 0.2, 0.2));
  if (k <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 40, width: 900, top, fontFamily: UI_FONT, opacity: Math.min(1, k * 1.3), transform: `scale(${lerp(0.94, 1, k)})`, transformOrigin: "10% 0" }}>
      <div style={{ padding: "24px 28px 34px", borderRadius: 38, background: "rgba(16,16,22,.95)", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 18px 50px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 62, height: 62, borderRadius: 31, background: "#3a3a46", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 900, color: "#cfcfe0" }}>?</div>
          <div style={{ fontSize: 38, fontWeight: 800, color: "#fff" }}>Anonymous</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 30, fontWeight: 700, color: "rgba(255,255,255,.6)" }}><Plane s={32} c="rgba(255,255,255,.75)" /> IG question</div>
        </div>
        <div style={{ marginTop: 24, display: "inline-block", padding: "24px 34px 28px", borderRadius: "36px 36px 36px 10px", background: DM_GRAD }}>
          <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.015em", color: "#fff" }}>{text}</div>
        </div>
      </div>
    </div>
  );
};
