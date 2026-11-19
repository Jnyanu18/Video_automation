// v6 Instagram-question format (same components as c2-bubble v6): the persistent series tag and the anonymous IG DM
// cards for the questions he reads. HTML, drawn over the SVG scenes. No usernames, photos, timestamps or counts.
import React from "react";
import { B } from "../beats";
import { lerp, popS, progS } from "../lib";
import { T } from "./T";
import { SERIES } from "./kit";

const UI_FONT = `"Segoe UI", "Segoe UI Variable Display", Arial, sans-serif`;
const IG_GRAD = "linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5)";
const DM_GRAD = "linear-gradient(135deg, #a033ff 0%, #6a5cff 55%, #2f8bff 100%)";

// paper-plane (IG DM) icon
const Plane: React.FC<{ s: number; c?: string }> = ({ s, c = "#fff" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round">
    <path d="M22 3 L9.2 10.1" /><path d="M22 3 L14.6 21 L11.2 13.2 L3 10.4 Z" />
  </svg>
);

// persistent series tag (frame 0 to the end)
const SeriesTag: React.FC = () => (
  <div style={{ position: "absolute", left: 40, top: 230, fontFamily: UI_FONT, padding: 3, borderRadius: 999, background: IG_GRAD, boxShadow: "0 8px 24px rgba(0,0,0,.55)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 22px 8px 12px", borderRadius: 999, background: "rgba(14,14,20,.92)" }}>
      <div style={{ width: 34, height: 34, borderRadius: 17, background: IG_GRAD, display: "flex", alignItems: "center", justifyContent: "center" }}><Plane s={20} /></div>
      <div style={{ fontSize: 25, fontWeight: 800, color: "#fff", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{SERIES}</div>
    </div>
  </div>
);

// a question he reads out, as an anonymous Instagram DM in the top band
type QWord = { w: string; c?: string; at?: number };
const IGQuestion: React.FC<{ t: number; a: number; b: number; words: QWord[]; size?: number }> = ({ t, a, b, words, size = 66 }) => {
  const k = popS(t, a, 14) * (1 - progS(t, b - 0.2, 0.2));
  if (t < a || k <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 40, width: 900, top: 306, fontFamily: UI_FONT, opacity: Math.min(1, k * 1.3), transform: `scale(${lerp(0.94, 1, k)})`, transformOrigin: "10% 0" }}>
      <div style={{ padding: "22px 26px 30px", borderRadius: 38, background: "rgba(16,16,22,.95)", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 18px 50px rgba(0,0,0,.65)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 58, height: 58, borderRadius: 29, background: "#3a3a46", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900, color: "#cfcfe0" }}>?</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#fff" }}>Anonymous</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,.6)" }}><Plane s={30} c="rgba(255,255,255,.75)" /> IG question</div>
        </div>
        <div style={{ marginTop: 20, display: "inline-block", padding: "22px 30px 24px", borderRadius: "34px 34px 34px 10px", background: DM_GRAD }}>
          <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.015em", color: "#fff" }}>
            {words.map((x, i) => {
              const on = x.at === undefined ? 1 : progS(t, x.at - 0.05, 0.2);
              return <React.Fragment key={i}>{i ? " " : ""}<span style={{ color: x.c && on > 0.5 ? x.c : undefined }}>{x.w}</span></React.Fragment>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
const qWords = (s: string, marks: Record<string, [string, number]> = {}): QWord[] =>
  s.split(" ").map((w) => { const m = marks[w.toLowerCase().replace(/[^a-z']/g, "")]; return { w, c: m?.[0], at: m?.[1] }; });

const GOLD = "#ffd36a", CYAN = "#7df3ff";
export const IGOverlay: React.FC<{ t: number }> = ({ t }) => (
  <>
    <SeriesTag />
    <IGQuestion t={t} a={B.qwhy.s} b={B.news.s} size={80} words={qWords("Why did they ban DeepSeek?", { deepseek: [GOLD, T.qDeep] })} />
    <IGQuestion t={t} a={B.qthreat.s} b={B.take.s} size={70}
      words={qWords("So is it a security threat or a power struggle?", { security: [CYAN, T.qThreat], threat: [CYAN, T.qThreat], power: [GOLD, T.qPower], struggle: [GOLD, T.qPower] })} />
  </>
);
