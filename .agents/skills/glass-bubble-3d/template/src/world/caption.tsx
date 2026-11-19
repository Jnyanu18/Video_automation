// Captions for the bubble film: Segoe UI bold, white with a soft dark shadow; emphasis words get the
// bubble's iridescent gradient and a small pop. Hidden while the hook title is on screen.
import React from "react";
import type { Chunk } from "../captions";
import { isEmph } from "../captions";
import type { Region } from "../Film";
import { lerp, popS, progS } from "../lib";
import { B } from "../beats";
import { UI_FONT } from "./tex";

const SHADOW = "0 3px 16px rgba(0,0,0,.92), 0 0 3px rgba(0,0,0,.8), 0 0 30px rgba(2,4,20,.6)";

let ctx: CanvasRenderingContext2D | null = null;
const measure = (s: string, px: number) => {
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  ctx!.font = `800 ${px}px ${UI_FONT}`;
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
// v6: a narrow right column (x 692-950). Up to 3 lines, 54 -> 42 px; a word wider than the column at 42 px
// (e.g. "transportation,") shifts the block left just enough to end at x 950.
const layout = (c: Chunk, r: Region) => {
  const words = c.words.map((w) => w.w);
  for (const px of [54, 50, 46, 42]) {
    const lines = wrap(words, px, r.w);
    const wide = Math.max(...words.map((w) => measure(w, px)));
    if (lines.length <= 3 && wide <= r.w) return { px, x: r.x, w: r.w, lines };
  }
  const px = 42, wide = Math.max(...words.map((w) => measure(w, px)));
  const w = Math.max(r.w, wide + 4);
  return { px, x: Math.min(r.x, 950 - w), w, lines: wrap(words, px, w) };
};

export const BubbleCaption: React.FC<{ t: number; c: Chunk; r: Region }> = ({ t, c, r }) => {
  const L = layout(c, r);
  const k = progS(t, c.s, 0.16);
  const out = progS(t, c.e - 0.1, 0.1);
  const y = r.mode === "OUT" ? 1310 : r.mode === "SIDE" ? r.y + 8 : r.y + 30;
  let wi = 0;
  return (
    <div style={{ position: "absolute", left: L.x, top: y, width: L.w, textAlign: r.align, fontFamily: UI_FONT, fontWeight: 800, fontSize: L.px, lineHeight: 1.1, color: "#fff", textShadow: SHADOW, letterSpacing: "-0.01em", opacity: k * (1 - out), transform: `translateY(${(1 - k) * 14}px)` }}>
      {L.lines.map((ln, i) => (
        <div key={i} style={{ whiteSpace: "nowrap" }}>
          {ln.map((w, j) => {
            const word = { ...c.words[wi], i0: wi++ };
            const em = isEmph(w);
            const hit = em && t >= word.s ? popS(t, word.s, 12) : 1;
            const ec = ["#7df3ff", "#ff7ad9", "#ffd36a"][word.i0 % 3];
            return (
              <React.Fragment key={j}>
                {j > 0 ? " " : ""}
                <span style={{ display: "inline-block", color: em ? ec : undefined, transform: em ? `scale(${lerp(1.12, 1, hit)})` : undefined, textShadow: em ? `${SHADOW}, 0 0 14px rgba(160,120,255,.45)` : undefined }}>{w}</span>
              </React.Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
};
