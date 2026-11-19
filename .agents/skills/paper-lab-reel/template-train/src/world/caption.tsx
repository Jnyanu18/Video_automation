// Paper-strip captions: Fraunces 800 ink on white paper strips; emphasis words red, the strongest get a
// red marker underline that draws on as the word is spoken. Pops in on twos with a small overshoot.
// v6: a narrow right column (x 692-950, from y 1300; c2-bubble's approach). Up to 3 lines, 54 -> 42 px; a word wider than
// the column at 42 px shifts the block left just enough to end at x 950.
import React from "react";
import type { Chunk } from "../captions";
import { isEmph } from "../captions";
import type { Region } from "../Film";
import { INK, RED, SERIF, back, rnd, twos } from "./kit";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");
const STRONG = new Set(["important", "track", "bullet", "normal", "hill", "coal", "steam", "electricity", "torque", "himalayan", "customer", "want",
  "architecture", "answered"].map(norm));

const PAD = 28; // strip padding left + right
const CW = 0.6; // Fraunces 800 average glyph width (em)
const tw = (s: string, px: number) => s.length * px * CW;
const wrap = (words: string[], px: number, maxW: number) => {
  const lines: number[][] = [[]];
  let w = 0;
  words.forEach((x, i) => {
    const ww = tw(x, px), cur = lines[lines.length - 1];
    if (cur.length && w + px * 0.28 + ww > maxW) { lines.push([i]); w = ww; } else { w += (cur.length ? px * 0.28 : 0) + ww; cur.push(i); }
  });
  return lines;
};
const layout = (words: string[], r: Region) => {
  for (const px of [54, 50, 46, 42]) {
    const lines = wrap(words, px, r.w - PAD);
    const wide = Math.max(...words.map((w) => tw(w, px)));
    if (lines.length <= 3 && wide <= r.w - PAD) return { px, x: r.x, w: r.w, lines };
  }
  const px = 42, wide = Math.max(...words.map((w) => tw(w, px)));
  const w = Math.max(r.w, wide + PAD + 4);
  return { px, x: Math.min(r.x, 950 - w), w, lines: wrap(words, px, w - PAD) };
};

export const PaperCaption: React.FC<{ t: number; c: Chunk; r: Region }> = ({ t, c, r }) => {
  const L = layout(c.words.map((w) => w.w), r);
  const tt = twos(t);
  const k = back((tt - c.s) / 0.22, 2.2);
  const rot = (rnd(`cap${c.i}`) - 0.5) * 2.4 * (1.6 - 0.6 * Math.min(1, k));
  const dy = (1 - Math.min(1, k)) * 26;
  return (
    <div style={{ position: "absolute", left: L.x, top: r.y + dy, width: L.w, textAlign: "left", transform: `rotate(${rot}deg)`, transformOrigin: "0 0", opacity: Math.min(1, (tt - c.s + 0.07) / 0.07) }}>
      {L.lines.map((ln, li) => (
        <div key={li} style={{ whiteSpace: "nowrap", marginBottom: 4 }}>
          <span style={{ fontFamily: SERIF, fontWeight: 800, fontSize: L.px, lineHeight: 1.22, color: INK, background: "#fffdf6", padding: "2px 14px 6px", boxShadow: "5px 7px 9px rgba(74,52,32,.32)" }}>
            {ln.map((wi, j) => {
              const w = c.words[wi], n = norm(w.w), emph = isEmph(w.w), strong = emph && STRONG.has(n);
              const u = strong ? Math.max(0, Math.min(1, (t - w.s) / 0.3)) : 0;
              return (
                <React.Fragment key={wi}>
                  {j > 0 ? " " : ""}
                  <span style={{ color: emph ? RED : INK, backgroundImage: strong ? `linear-gradient(${RED}, ${RED})` : undefined, backgroundRepeat: "no-repeat", backgroundSize: `${u * 100}% 7px`, backgroundPosition: "0 96%" }}>{w.w}</span>
                </React.Fragment>
              );
            })}
          </span>
        </div>
      ))}
    </div>
  );
};
