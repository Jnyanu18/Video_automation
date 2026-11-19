// c6-xbox v3: "8-bit Pixel Arcade". He is always the still cut-out bottom-left (P1 MADHAV);
// each beat's screen fills the top band + right column behind/around him. Back draws everything.
import React from "react";
import { AbsoluteFill } from "remotion";
import type { WorldDef } from "../Film";
import { beatAt } from "../beats";
import { isEmph } from "../captions";
import { progS } from "../lib";
import { C, CRT, PxLayer, PxText, textW } from "./px";
import { Backdrop, Ceo, Cheap, Comment, Crowd, EndCard, Fight, Hook, MarketMap, P1Frame, Question, SplitBg, Studios, Titles } from "./scenes";

const SCENES: Record<string, React.FC<{ t: number }>> = {
  hook: Hook, ceo: Ceo, q: Question, vs: Fight, crowd: Crowd, studios: Studios,
  cheap: Cheap, titles: Titles, map: MarketMap, comment: Comment, end: EndCard,
};

const Back: WorldDef["Back"] = ({ t }) => {
  const b = beatAt(t);
  const S = SCENES[b.id];
  // quick fade-out of a screen in its last 0.12 s (the next one pops in on its own cue)
  const out = b.id === "end" ? 1 : 1 - progS(t, b.e - 0.12, 0.12);
  return (
    <AbsoluteFill>
      <PxLayer>
        {b.id === "vs" ? <SplitBg /> : <Backdrop tint={b.id === "map" || b.id === "comment" ? C.blue : b.id === "end" ? C.green : C.mag} />}
        <P1Frame />
        <g opacity={out}>{S && <S t={t} />}</g>
      </PxLayer>
      <CRT k={0.8} />
    </AbsoluteFill>
  );
};

const Front: WorldDef["Front"] = () => <CRT k={0.25} />;

// Pixel captions: bitmap font, black pixel outline (no box), words light up as they are spoken.
const EMPH_COL: Record<string, string> = { xbox: C.green, playstation: C.blue, fight: C.red };
const Caption: WorldDef["Caption"] = ({ t, c, r }) => {
  const s = 6, sp = 6 * s;
  const words = c.words.map((w) => ({ ...w, u: w.w.toUpperCase(), wd: textW(w.w, s) }));
  const lines: (typeof words)[] = [[]];
  let lw = 0;
  for (const w of words) {
    const add = (lines[lines.length - 1].length ? sp : 0) + w.wd;
    if (lw + add > r.w && lines[lines.length - 1].length) { lines.push([w]); lw = w.wd; }
    else { lines[lines.length - 1].push(w); lw += add; }
  }
  const k = progS(t, c.s, 0.1);
  const lh = 7 * s + 22;
  return (
    <AbsoluteFill style={{ opacity: k }}>
      <PxLayer>
        {lines.map((ln, li) => {
          let x = r.x;
          return ln.map((w) => {
            const key = w.w.toLowerCase().replace(/[^a-z0-9']/g, "");
            const said = t >= w.s - 0.03;
            const col = EMPH_COL[key] ?? (isEmph(w.w) ? C.yellow : C.white);
            const el = <PxText key={`${li}-${w.s}`} x={x} y={r.y + li * lh} s={s} text={w.u} fill={col} outline="#000" glow={said && isEmph(w.w)} opacity={said ? 1 : 0.45} />;
            x += w.wd + sp;
            return el;
          });
        })}
      </PxLayer>
    </AbsoluteFill>
  );
};

export const World: WorldDef = {
  Back,
  Front,
  Caption,
  cutoutFilter: "drop-shadow(0 0 14px rgba(0,0,0,0.55))",
};
