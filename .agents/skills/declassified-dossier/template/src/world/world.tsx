// Declassified Dossier world: desk + documents behind him (Back), stamps/tabs over his footage (Front),
// typewriter-on-paper captions.
import React from "react";
import { AbsoluteFill, Img } from "remotion";
import type { WorldDef } from "../Film";
import { isEmph } from "../captions";
import { Defs, HI, IMG, INK, MEMO, MONO, RED, rnd, sm } from "./kit";
import { Scenes } from "./scenes";
import { IGOverlay } from "./ig";


const Back: React.FC<{ t: number; fr: number }> = () => (
  <AbsoluteFill style={{ background: "#141210" }}>
    <Img src={IMG.desk} style={{ position: "absolute", left: -80, top: -140, width: 1240, height: 2200 }} />
    {/* desk lamp: warm pool over the top band, falloff to charcoal */}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 45% at 50% 24%, rgba(255,207,122,0.18) 0%, rgba(255,190,100,0.05) 50%, rgba(0,0,0,0) 75%)", mixBlendMode: "screen" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 70% at 50% 40%, rgba(0,0,0,0) 50%, rgba(8,6,4,0.6) 100%)" }} />
  </AbsoluteFill>
);

// ---- Front: every panel (top band + right column); the cut-out sits underneath at the bottom-left
const Front: React.FC<{ t: number; fr: number }> = ({ t }) => (
  <>
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <Defs />
      <Scenes t={t} />
    </svg>
    <IGOverlay t={t} />
  </>
);

// ---- Captions: typewriter on a memo-paper strip; emphasis in stamp red, strongest words highlighted
const STRONG = new Set(["banned", "fair", "enigma", "threat", "struggle", "byd", "tariff", "factories", "employment", "learning", "war", "broken", "national", "competitors", "healthy"]);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");
const PAD = 14;
const wrapChars = (words: string[], max: number) => {
  const lines: number[][] = [[]];
  let n = 0;
  words.forEach((w, i) => {
    const cur = lines[lines.length - 1];
    if (cur.length && n + 1 + w.length > max) { lines.push([i]); n = w.length; }
    else { n += (cur.length ? 1 : 0) + w.length; cur.push(i); }
  });
  return lines;
};
const capLayout = (words: string[], r: { x: number; w: number }) => {
  const wide = Math.max(...words.map((w) => w.length));
  for (const px of [46, 42, 38, 34]) {
    const max = Math.floor((r.w - 2 * PAD) / (0.6 * px));
    const lines = wrapChars(words, max);
    if (lines.length <= 3 && wide <= max) return { px, x: r.x, w: r.w, lines };
  }
  const px = 34, w = Math.max(r.w, Math.ceil(wide * 0.6 * px) + 2 * PAD + 4);
  return { px, x: Math.min(r.x, 950 - w), w, lines: wrapChars(words, Math.floor((w - 2 * PAD) / (0.6 * px))) };
};
const Caption: WorldDef["Caption"] = ({ t, c, r }) => {
  const L = capLayout(c.words.map((w) => w.w), r);
  const k = sm((t - c.s) / 0.12);
  return (
    <div style={{ position: "absolute", left: L.x, top: r.y + 8 + (1 - k) * 14, width: L.w, opacity: k, transform: `rotate(${(rnd(`cap${c.i}`) - 0.5) * 1.6}deg)`, transformOrigin: "0 0" }}>
      {L.lines.map((ln, li) => (
      <div key={li} style={{ whiteSpace: "nowrap", marginBottom: 4 }}>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: L.px, lineHeight: 1.22, color: INK, background: MEMO, padding: `3px ${PAD}px 5px`, boxShadow: "6px 9px 14px rgba(0,0,0,.45)", display: "inline-block" }}>
        {ln.map((i) => c.words[i]).map((w, j, arr) => { const i = j;
          const emph = isEmph(w.w), strong = STRONG.has(norm(w.w));
          const u = strong ? Math.max(0, Math.min(1, (t - w.s) / 0.25)) : 0;
          // typewriter: each word lands as it is spoken (unspoken words faint)
          const said = t >= w.s - 0.04;
          return (
            <React.Fragment key={i}>
              <span style={{ color: emph ? RED : INK, opacity: said ? 1 : 0.28, backgroundImage: strong ? `linear-gradient(${HI}, ${HI})` : undefined, backgroundRepeat: "no-repeat", backgroundSize: `${u * 100}% 62%`, backgroundPosition: "0 70%" }}>{w.w}</span>
              {i < arr.length - 1 ? " " : ""}
            </React.Fragment>
          );
        })}
      </span>
      </div>
      ))}
    </div>
  );
};

export const World: WorldDef = {
  Back,
  Front,
  Caption,
  cutoutFilter: "drop-shadow(0 0 0 #f3ead6) drop-shadow(10px 16px 14px rgba(0,0,0,0.6))",
};
