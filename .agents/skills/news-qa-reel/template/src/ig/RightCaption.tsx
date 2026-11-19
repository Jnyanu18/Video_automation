// v6 captions: a narrow right column (x 692-950 from y 1300). Up to 3 lines, 54 -> 42 px; a word wider than the
// column at 42 px (e.g. "transportation,") shifts the block left just enough to end at x 950. Emphasis words
// (src/world/emph.ts) get a colour and a small pop when said. Worlds may restyle colours/font via props.
import React from "react";
import type { Chunk } from "../captions";
import { isEmph } from "../captions";
import type { Region } from "../Film";
import { lerp, popS, progS } from "../lib";
import { SHADOW, UI_FONT } from "./theme";

let ctx: CanvasRenderingContext2D | null = null;
const measure = (s: string, px: number, font: string) => {
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  ctx!.font = `800 ${px}px ${font}`;
  return ctx!.measureText(s).width;
};
const wrap = (words: string[], px: number, maxW: number, font: string) => {
  const lines: string[][] = [[]];
  let w = 0;
  const sp = measure(" ", px, font);
  for (const x of words) {
    const ww = measure(x, px, font);
    const cur = lines[lines.length - 1];
    if (cur.length && w + sp + ww > maxW) { lines.push([x]); w = ww; }
    else { w += (cur.length ? sp : 0) + ww; cur.push(x); }
  }
  return lines;
};
const RIGHT_EDGE = 950;
const layout = (c: Chunk, r: Region, font: string) => {
  const words = c.words.map((w) => w.w);
  for (const px of [54, 50, 46, 42]) {
    const lines = wrap(words, px, r.w, font);
    const wide = Math.max(...words.map((w) => measure(w, px, font)));
    if (lines.length <= 3 && wide <= r.w) return { px, x: r.x, w: r.w, lines };
  }
  const px = 42, wide = Math.max(...words.map((w) => measure(w, px, font)));
  const w = Math.max(r.w, wide + 4);
  return { px, x: Math.min(r.x, RIGHT_EDGE - w), w, lines: wrap(words, px, w, font) };
};

type P = { t: number; c: Chunk; r: Region; font?: string; color?: string; emph?: string[] };
export const RightCaption: React.FC<P> = ({ t, c, r, font = UI_FONT, color = "#fff", emph = ["#7df3ff", "#ff7ad9", "#ffd36a"] }) => {
  const L = layout(c, r, font);
  const k = progS(t, c.s, 0.16);
  const out = progS(t, c.e - 0.1, 0.1);
  let wi = 0;
  return (
    <div style={{ position: "absolute", left: L.x, top: r.y + 8, width: L.w, textAlign: r.align, fontFamily: font, fontWeight: 800, fontSize: L.px, lineHeight: 1.1, color, textShadow: SHADOW, letterSpacing: "-0.01em", opacity: k * (1 - out), transform: `translateY(${(1 - k) * 14}px)` }}>
      {L.lines.map((ln, i) => (
        <div key={i} style={{ whiteSpace: "nowrap" }}>
          {ln.map((w, j) => {
            const word = { ...c.words[wi], i0: wi++ };
            const em = isEmph(w);
            const hit = em && t >= word.s ? popS(t, word.s, 12) : 1;
            return (
              <React.Fragment key={j}>
                {j > 0 ? " " : ""}
                <span style={{ display: "inline-block", color: em ? emph[word.i0 % emph.length] : undefined, transform: em ? `scale(${lerp(1.12, 1, hit)})` : undefined }}>{w}</span>
              </React.Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
};
