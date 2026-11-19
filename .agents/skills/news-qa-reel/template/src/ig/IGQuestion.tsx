// A question he reads out, shown as an anonymous Instagram DM (Madhav 2026-10-24: "make it like someone is asking
// anonymously in my Instagram DM and I'm answering it"). "Anonymous", a "?" avatar, a paper-plane label and a
// purple-blue DM bubble with the EXACT question. Never a username, photo, timestamp or count.
import React from "react";
import { lerp, popS, progS } from "../lib";
import { SERIES } from "../series";
import { Plane } from "./Plane";
import { QUESTIONS } from "./questions";
import { DM_GRAD, UI_FONT } from "./theme";
import { ZONES } from "./zones";

export type QWord = { w: string; c?: string; at?: number }; // optional colour that switches on at `at` (s)
export const qWords = (s: string, marks: Record<string, [string, number]> = {}): QWord[] =>
  s.split(" ").map((w) => { const m = marks[w.toLowerCase().replace(/[^a-z']/g, "")]; return { w, c: m?.[0], at: m?.[1] }; });

export const IGQuestion: React.FC<{ t: number; a: number; b: number; words: QWord[]; size?: number; top?: number }> = ({ t, a, b, words, size = 66, top = 306 }) => {
  const k = popS(t, a, 14) * (1 - progS(t, b - 0.2, 0.2));
  if (k <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: ZONES.topBand.x, width: ZONES.topBand.w, top, fontFamily: UI_FONT, opacity: Math.min(1, k * 1.3), transform: `scale(${lerp(0.94, 1, k)})`, transformOrigin: "10% 0" }}>
      <div style={{ padding: "22px 26px 30px", borderRadius: 38, background: "rgba(16,16,22,.95)", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 18px 50px rgba(0,0,0,.65)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 58, height: 58, borderRadius: 29, background: "#3a3a46", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900, color: "#cfcfe0" }}>?</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#fff" }}>{SERIES.asker}</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,.6)" }}><Plane s={30} c="rgba(255,255,255,.75)" /> {SERIES.questionLabel}</div>
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

// Every question in words.json as a DM card: in 0.15 s before his first word, out 0.1 s after his answer starts.
// Pass `marks` per question index to colour key words when he says them; `size` per index for long questions.
export const AutoQuestions: React.FC<{ t: number; marks?: Record<number, Record<string, [string, number]>>; size?: Record<number, number> }> = ({ t, marks = {}, size = {} }) => (
  <>
    {QUESTIONS.map((q) => (
      <IGQuestion key={q.i} t={t} a={q.s - 0.15} b={q.answerS + 0.1} words={qWords(q.text, marks[q.i])} size={size[q.i] ?? (q.text.length > 48 ? 62 : 70)} />
    ))}
  </>
);
