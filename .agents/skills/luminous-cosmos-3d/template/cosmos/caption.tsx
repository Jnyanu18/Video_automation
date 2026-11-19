// Captions for the Cosmos film: Inter Tight 800, white with a soft dark shadow, emphasis in amber.
// The hook (chunks 0-1) is its own composition: big words revealed on the voice, "compression?"
// squeezing its letters together with a glow pulse.
import React from "react";
import type { Chunk } from "../captions";
import { isEmph } from "../captions";
import type { Region } from "../Film";
import { lerp, popS, progS } from "../lib";
import { CFONT, SANS, useFontsReady } from "./fonts";

const AMBER = "#ffbf3c";
const SHADOW = "0 3px 16px rgba(7,5,28,.92), 0 0 3px rgba(7,5,28,.75), 0 0 30px rgba(7,5,28,.5)";

let ctx: CanvasRenderingContext2D | null = null;
const measure = (s: string, px: number) => {
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  ctx!.font = CFONT(800, px);
  return ctx!.measureText(s).width;
};
const wrap = (words: string[], px: number, maxW: number) => {
  const lines: string[][] = [[]];
  let w = 0;
  const sp = measure(" ", px);
  for (const x of words) {
    const ww = measure(x, px);
    const cur = lines[lines.length - 1];
    if (cur.length && w + sp + ww > maxW) { lines.push([x]); w = ww; }
    else { w += (cur.length ? sp : 0) + ww; cur.push(x); }
  }
  return lines;
};

// pick size and width so the chunk fits in 2 lines (SIDE may widen leftwards, never past the face)
const layout = (c: Chunk, r: Region) => {
  const words = c.words.map((w) => w.w);
  const tries: { px: number; x: number; w: number }[] = [];
  const top = r.mode === "SIDE" ? 60 : 62;
  for (const px of [top, 58, 56]) tries.push({ px, x: r.x, w: r.w });
  if (r.mode === "SIDE") for (const px of [60, 58, 56, 54, 52]) for (const ext of [60, 120, 150]) tries.push({ px, x: r.x - ext, w: r.w + ext });
  for (const tr of tries) {
    const lines = wrap(words, tr.px, tr.w);
    if (lines.length <= 2) return { ...tr, lines };
  }
  const last = tries[tries.length - 1];
  return { ...last, lines: wrap(words, last.px, last.w) };
};

const Word: React.FC<{ w: string; color?: string }> = ({ w, color }) => <span style={{ color }}>{w}</span>;

export const CosmosCaption: React.FC<{ t: number; c: Chunk; r: Region }> = ({ t, c, r }) => {
  useFontsReady();
  if (c.i <= 1) return <Hook t={t} c={c} />;
  const L = layout(c, r);
  const k = progS(t, c.s, 0.16);
  const out = progS(t, c.e - 0.1, 0.1);
  const y = r.mode === "OUT" ? 1310 : r.mode === "SIDE" ? r.y + 8 : r.y + 34;
  let wi = 0;
  return (
    <div style={{ position: "absolute", left: L.x, top: y, width: L.w, textAlign: r.align, fontFamily: SANS, fontWeight: 800, fontSize: L.px, lineHeight: 1.08, color: "#fff", textShadow: SHADOW, letterSpacing: "-0.01em", opacity: k * (1 - out), transform: `translateY(${(1 - k) * 14}px)` }}>
      {L.lines.map((ln, i) => (
        <div key={i} style={{ whiteSpace: "nowrap" }}>
          {ln.map((w, j) => {
            const word = c.words[wi++];
            const em = isEmph(w);
            const hit = em ? popS(t, word.s, 12) : 1;
            return (
              <React.Fragment key={j}>
                <span style={{ display: "inline-block", marginLeft: j > 0 ? "0.26em" : 0, transform: em ? `scale(${lerp(1.12, 1, hit)})` : undefined, textShadow: em ? `${SHADOW}, 0 0 ${18 * (1 - hit) + 6}px rgba(255,191,60,.55)` : undefined }}>
                  <Word w={(j > 0 ? " " : "") + w} color={em ? AMBER : undefined} />
                </span>
              </React.Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ---- the hook --------------------------------------------------------------------------------
const Hook: React.FC<{ t: number; c: Chunk }> = ({ t, c }) => {
  const rows = c.i === 0 ? [[0, 1], [2]] : [[0, 1, 2], [3]];
  const big = c.i === 0 ? 140 : 148;
  const out = c.i === 1 ? progS(t, c.e - 0.12, 0.12) : 0;
  return (
    <div style={{ position: "absolute", left: 40, top: 1236, width: 1000, textAlign: "center", fontFamily: SANS, fontWeight: 800, color: "#fff", textShadow: SHADOW, opacity: 1 - out }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ whiteSpace: "nowrap", fontSize: ri === 0 ? 84 : big, lineHeight: ri === 0 ? 1.05 : 0.98, letterSpacing: "-0.035em" }}>
          {row.map((wi) => {
            const w = c.words[wi];
            const a = progS(t, w.s - 0.04, 0.2);
            const s = popS(t, w.s - 0.04, 11);
            const em = isEmph(w.w);
            if (em && c.i === 1) return <Squeeze key={wi} t={t} s0={w.s} text={w.w} />;
            return (
              <span key={wi} style={{ display: "inline-block", marginRight: ri === 0 ? 22 : 0, opacity: a, transform: `translateY(${(1 - s) * 40}px) scale(${lerp(0.7, 1, s)})`, filter: `blur(${(1 - a) * 8}px)`, color: em ? AMBER : "#fff", textShadow: em ? `${SHADOW}, 0 0 26px rgba(255,191,60,.45)` : SHADOW }}>
                {w.w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// "compression?": letters fly in spread wide and squeeze together hard, then a glow pulse.
const Squeeze: React.FC<{ t: number; s0: number; text: string }> = ({ t, s0, text }) => {
  const a = progS(t, s0 - 0.06, 0.14);
  const sq = popS(t, s0 - 0.02, 9);
  const spacing = lerp(0.28, -0.045, sq); // em
  const sx = lerp(1.18, 1, sq) * (1 - 0.06 * Math.exp(-Math.pow((t - s0 - 0.28) / 0.08, 2)));
  const pulse = Math.exp(-Math.max(0, t - s0 - 0.25) * 2.2) * (t > s0 + 0.12 ? 1 : 0);
  return (
    <span style={{ display: "inline-block", opacity: a, letterSpacing: `${spacing}em`, transform: `scaleX(${sx})`, color: AMBER, textShadow: `${SHADOW}, 0 0 ${16 + 60 * pulse}px rgba(255,191,60,${0.45 + 0.5 * pulse})` }}>
      {text}
    </span>
  );
};
