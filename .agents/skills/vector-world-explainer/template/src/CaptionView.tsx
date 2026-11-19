import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { CAPTIONS, type Em } from "./captions";
import { ACTS, B, WORDS, f, pop, prog, clamp, easeIn } from "./lib";
import { C, COND, NUNITO } from "./kit/palette";
import { faceSpan } from "./kit/avatar";

const EM: Record<Em, string> = { gold: C.gold, coral: "#FF8A78", teal: C.tealHi, big: C.gold };

// Regular captions: one sense unit at a time, following Madhav's words with a word-timed highlight
// (a word brightens as he says it; emphasis words take their colour and pop on the word).
//  - centre layout: lower-middle (top 1362), clear of the bottom UI band.
//  - side layout (while Madhav is on screen, right): a left column ending 36 px before his face.
//  - hook (0 - 13.2 s): its own composition, condensed caps revealed word by word, numbers biggest.
export const Captions: React.FC<{ fr: number }> = ({ fr }) => {
  const t = fr / 30;
  const c = CAPTIONS.find((x) => t >= x.s - 0.05 && t < x.e);
  if (!c || c.hide) return null;
  const at = f(c.s - 0.05);
  // v6: his real head moves; keep the column clear of the face over the whole caption span
  const fb = faceSpan(at, f(c.e));
  const side = !!fb;
  const hook = c.s < ACTS.hook[1];
  const inP = prog(fr, at, 6);
  const out = interpolate(fr, [f(c.e) - 4, f(c.e)], [1, 0], clamp);
  const fs = hook ? 74 : side ? 62 : 70;
  const colRight = fb ? Math.min(fb.x - 36, 640) : 1010;
  const box: React.CSSProperties = side
    ? { left: 56, width: colRight - 56, top: 1215, textAlign: "left" }
    : { left: 70, right: 70, top: 1362, textAlign: "center" };
  return (
    <>
      {!side && <div style={{ position: "absolute", left: 0, right: 0, top: 1262, height: 420, background: "linear-gradient(rgba(18,8,48,0), rgba(18,8,48,0.55) 35%, rgba(18,8,48,0.6) 60%, rgba(18,8,48,0))", opacity: inP * out }} />}
      {side && <div style={{ position: "absolute", left: -80, width: colRight + 120, top: 1150, height: 330, background: "radial-gradient(ellipse 60% 50% at 40% 50%, rgba(18,8,48,0.62), rgba(18,8,48,0) 100%)", opacity: inP * out }} />}
      <div style={{ position: "absolute", ...box, fontFamily: hook ? COND : NUNITO, fontWeight: hook ? 800 : 900, fontSize: fs, lineHeight: hook ? 1.02 : 1.12, color: C.white, letterSpacing: hook ? 1 : -0.5, textTransform: hook ? "uppercase" : undefined, opacity: inP * out, transform: `translateY(${(1 - inP) * 16}px)`, textShadow: "0 4px 18px rgba(18,8,48,0.9), 0 2px 3px rgba(18,8,48,0.95)" }}>
        {c.shown.map((w, i) => {
          const role = c.em[w.w];
          const spoken = t >= w.s - 0.02;
          const k = spoken ? pop(fr, f(w.s), 11) : 0;
          const sz = role === "big" ? (hook ? 1.45 : 1.3) : hook && role ? 1.12 : 1;
          // hook: each word appears as it is said (scale-up pop); later lines show whole, dim ahead
          if (hook && !spoken) return <span key={i} style={{ display: "inline-block", margin: "0 16px 0 0", opacity: 0, fontSize: fs * sz }}>{w.w}</span>;
          const thump = role ? 0.1 * Math.sin(Math.min(1, k) * Math.PI) : 0.04 * Math.sin(Math.min(1, k) * Math.PI);
          const hookIn = hook ? 0.6 + 0.4 * Math.min(1, k * 1.6) : 1;
          return (
            <span key={i} style={{ display: "inline-block", margin: role ? `0 ${side ? 16 : 22}px 0 2px` : `0 ${side || hook ? 14 : 18}px 0 0`, color: role && spoken ? EM[role] : C.white, opacity: spoken ? 1 : 0.5, fontSize: fs * sz, transform: `scale(${(1 + thump) * hookIn})`, transformOrigin: "center bottom" }}>
              {w.w}
            </span>
          );
        })}
      </div>
    </>
  );
};

// The hook's cover headline: the question the film answers, on screen at frame 0 (the cover). Its
// words thump as Madhav says them ("what is it? ... a quantum computer"); it flies up out of frame as
// the camera dives into the chip ("understand it").
const ROWS: { w: string; said: [string, number] }[][] = [
  [{ w: "WHAT", said: ["what", 6.5] }, { w: "IS", said: ["is", 6.5] }, { w: "A", said: ["a", 7.5] }],
  [{ w: "QUANTUM", said: ["quantum", 7.5] }, { w: "COMPUTER?", said: ["computer.", 7.5] }],
];
export const HOOK_TITLE = { top: 214, lh: 132, fs: 124 };
export const HookTitle: React.FC<{ fr: number }> = ({ fr }) => {
  const { top: TOP, lh: LH, fs } = HOOK_TITLE;
  const ex = prog(fr, f(B.understand) - 6, 16, easeIn);
  const said = ([s, after]: [string, number]) => {
    const w = WORDS.find((x) => x.w.toLowerCase() === s && x.s >= after);
    return w ? w.s : 999;
  };
  const breathe = 0.5 + 0.5 * Math.sin(fr * 0.08);
  if (ex >= 1) return null;
  return (
    <AbsoluteFill style={{ transform: `translateY(${-ex * 560}px) scale(${1 + ex * 0.15})`, transformOrigin: "540px 300px" }}>
      <div style={{ position: "absolute", left: 40, top: TOP - 60, width: 1000, height: 2 * LH + 120, background: "radial-gradient(ellipse 52% 50% at 50% 50%, rgba(14,6,40,0.66), rgba(14,6,40,0) 100%)" }} />
      {ROWS.map((row, r) => (
        <div key={r} style={{ position: "absolute", left: 0, right: 0, top: TOP + r * LH, textAlign: "center", fontFamily: COND, fontWeight: 800, fontSize: fs * (r ? 1 : 0.86), lineHeight: 1, color: C.cream, letterSpacing: 1, whiteSpace: "nowrap", textShadow: `0 0 ${36 + 14 * breathe}px rgba(255,203,87,0.45), 0 6px 20px rgba(14,6,40,0.95)` }}>
          {row.map((w, i) => {
            const at = f(said(w.said)) - 1;
            const k = pop(fr, at, 10);
            const thump = fr >= at ? 0.12 * Math.sin(Math.min(1, k) * Math.PI) : 0;
            const lit = fr >= at && r === 1;
            return (
              <span key={i} style={{ display: "inline-block", margin: "0 14px", transform: `scale(${1 + thump})`, color: lit ? C.gold : thump > 0.02 ? "#FFE9B0" : C.cream }}>
                {w.w}
              </span>
            );
          })}
        </div>
      ))}
    </AbsoluteFill>
  );
};
