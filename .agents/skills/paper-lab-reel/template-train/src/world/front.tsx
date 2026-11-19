// v6 HTML overlays (REVISION-V6, copied from c2-bubble's v6 overlay.tsx): the persistent series tag and the anonymous
// Instagram DM cards for the questions he reads (no username, photo, time or counts). Both sit in the top band, clear of his head.
import React from "react";
import { lerp, popS, progS } from "../lib";
import { B, T } from "./T";
import { HOOK_END } from "./v6";

const UI_FONT = `"Segoe UI", "Segoe UI Variable Display", Arial, sans-serif`;
const IG_GRAD = "linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5)";
const DM_GRAD = "linear-gradient(135deg, #a033ff 0%, #6a5cff 55%, #2f8bff 100%)";
const GOLD = "#ffd36a";

const Plane: React.FC<{ s: number; c?: string }> = ({ s, c = "#fff" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round">
    <path d="M22 3 L9.2 10.1" /><path d="M22 3 L14.6 21 L11.2 13.2 L3 10.4 Z" />
  </svg>
);

// persistent series tag (frame 0 to the end)
const SeriesTag: React.FC = () => (
  <div style={{ position: "absolute", left: 40, top: 230, fontFamily: UI_FONT, padding: 3, borderRadius: 999, background: IG_GRAD, boxShadow: "0 8px 24px rgba(74,52,32,.45)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 22px 8px 12px", borderRadius: 999, background: "rgba(14,14,20,.92)" }}>
      <div style={{ width: 34, height: 34, borderRadius: 17, background: IG_GRAD, display: "flex", alignItems: "center", justifyContent: "center" }}><Plane s={20} /></div>
      <div style={{ fontSize: 25, fontWeight: 800, color: "#fff", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS</div>
    </div>
  </div>
);

// a question he reads out, as an anonymous Instagram DM
type QWord = { w: string; c?: string };
const IGQuestion: React.FC<{ t: number; a: number; b: number; words: QWord[]; size?: number }> = ({ t, a, b, words, size = 66 }) => {
  const k = popS(t, a, 14) * (1 - progS(t, b - 0.2, 0.2));
  if (t < a || k <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 40, width: 900, top: 306, fontFamily: UI_FONT, opacity: Math.min(1, k * 1.3), transform: `scale(${lerp(0.94, 1, k)})`, transformOrigin: "10% 0" }}>
      <div style={{ padding: "22px 26px 30px", borderRadius: 38, background: "rgba(16,16,22,.95)", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 18px 50px rgba(74,52,32,.55)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 58, height: 58, borderRadius: 29, background: "#3a3a46", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900, color: "#cfcfe0" }}>?</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#fff" }}>Anonymous</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,.6)" }}><Plane s={30} c="rgba(255,255,255,.75)" /> IG question</div>
        </div>
        <div style={{ marginTop: 20, display: "inline-block", padding: "22px 30px 24px", borderRadius: "34px 34px 34px 10px", background: DM_GRAD }}>
          <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.015em", color: "#fff" }}>
            {words.map((x, i) => <React.Fragment key={i}>{i ? " " : ""}<span style={{ color: x.c }}>{x.w}</span></React.Fragment>)}
          </div>
        </div>
      </div>
    </div>
  );
};
const qWords = (s: string, gold: string[] = []): QWord[] =>
  s.split(" ").map((w) => ({ w, c: gold.includes(w.toLowerCase().replace(/[^a-z]/g, "")) ? GOLD : undefined }));

const Q1 = qWords("If AI writes all the code, do you still need to learn computer science?", ["computer", "science"]);
const Q2 = qWords("So what does a CS degree actually give you?", ["cs", "degree"]);

export const V6Front: React.FC<{ t: number; fr: number }> = ({ t }) => (
  <>
    <SeriesTag />
    <IGQuestion t={t} a={HOOK_END} b={T.csStill - 0.1} words={Q1} size={64} />
    <IGQuestion t={t} a={B.q2.s + 0.1} b={B.track.s} words={Q2} size={70} />
  </>
);
