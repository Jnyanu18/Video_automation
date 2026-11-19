// c5-spacex world: "Retro space-age poster" (v6: big cut-out bottom-left, graphics top band + right column,
// captions in the right column, IG series tag + anonymous IG DM question card).
import React from "react";
import { AbsoluteFill } from "remotion";
import type { WorldDef } from "../Film";
import { BLACK, CREAM, NAVY, ORANGE, PaperFinish, PosterDefs } from "./kit";
import { Back5, Front5 } from "./scenes";
import { isEmph } from "../captions";
import { progS } from "../lib";
import { B } from "../beats";
import { IGQuestion, SeriesTag } from "./ig";

const Back: React.FC<{ t: number; fr: number }> = ({ t, fr }) => (
  <AbsoluteFill style={{ background: CREAM }}>
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      <PosterDefs />
      <Back5 t={t} fr={fr} />
    </svg>
    <PaperFinish fr={fr} />
  </AbsoluteFill>
);

const Front: React.FC<{ t: number; fr: number }> = ({ t, fr }) => (
  <AbsoluteFill>
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      <PosterDefs />
      <Front5 t={t} fr={fr} />
    </svg>
    <IGQuestion t={t} a={B.q.s} b={B.plane.s + 0.05} text="What is SpaceX trying to do?" size={86} />
    <SeriesTag />
  </AbsoluteFill>
);

// Captions: a cream screen-print label with navy ink and an orange mis-registered block shadow.
// v6: right column (x 692-950 from y 1300, c2's approach): 42 -> 32 px so the chunk fits in <= 3 lines and its widest
// word fits the column; a word still too wide shifts the block left just enough to end at x 950.
let ctx: CanvasRenderingContext2D | null = null;
const measure = (s: string, px: number) => {
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  ctx!.font = `${px}px ${BLACK}`;
  return ctx!.measureText(s).width;
};
const lineCount = (words: string[], px: number, maxW: number) => {
  let n = 1, w = 0; const sp = measure(" ", px);
  for (const x of words) { const ww = measure(x, px); if (w && w + sp + ww > maxW) { n++; w = ww; } else w += (w ? sp : 0) + ww; }
  return n;
};
const fit = (words: string[], r: { x: number; w: number }) => {
  const inner = r.w - 34; // label padding + border
  for (const px of [42, 39, 36, 34, 32]) {
    if (lineCount(words, px, inner) <= 3 && Math.max(...words.map((w) => measure(w, px))) <= inner) return { px, x: r.x, w: r.w };
  }
  const wide = Math.max(...words.map((w) => measure(w, 32))) + 36, w = Math.max(r.w, wide);
  return { px: 32, x: Math.min(r.x, 950 - w), w };
};
const Caption: WorldDef["Caption"] = ({ t, c, r }) => {
  const k = progS(t, c.s, 0.15), out = progS(t, c.e - 0.1, 0.1);
  const F = fit(c.words.map((w) => w.w), r);
  return (
    <div style={{ position: "absolute", left: F.x, top: r.y, width: F.w, textAlign: r.align, opacity: k * (1 - out), transform: `translateY(${(1 - k) * 10}px)` }}>
      <span style={{
        fontFamily: BLACK, fontSize: F.px, lineHeight: 1.34, color: NAVY, background: CREAM, padding: "2px 14px 6px",
        boxShadow: `7px 8px 0 ${ORANGE}`, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", border: `3px solid ${NAVY}`,
      }}>
        {c.words.map((w, i) => (
          <React.Fragment key={i}>
            <span style={{ color: isEmph(w.w) ? ORANGE : NAVY, opacity: t >= w.s - 0.05 ? 1 : 0.45 }}>{w.w}</span>
            {i < c.words.length - 1 ? " " : ""}
          </React.Fragment>
        ))}
      </span>
    </div>
  );
};

export const World: WorldDef = {
  Back,
  Front,
  Caption,
  cutoutFilter: `drop-shadow(8px 8px 0 ${ORANGE}) drop-shadow(-4px 0 0 ${NAVY})`,
};
