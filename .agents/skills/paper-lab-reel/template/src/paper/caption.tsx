// Captions for the Paper Lab: Fraunces 800 ink on white paper strips; emphasis in red, the strongest
// with a marker underline that draws on as the word is spoken. The hook has its own composition (Hook).
import React from "react";
import type { Chunk } from "../captions";
import { isEmph } from "../captions";
import type { Region } from "../Film";
import { COND, Defs, INK, PAPERS, RED, SERIF, TYPE, back, boil, rnd, torn, twos } from "./kit";
import { HOOK_WORDS, T } from "./T";

const STRONG = new Set(["compression?", "compression.", "zettabyte", "rules", "terabytes", "patterns", "beautiful.", "mug", "works.", "everything",
  "amazing", "reality", "agi.", "agi,", "universe.", "parameters", "curiosity", "stem.", "scientists,", "engineers"]);

export const PaperCaption: React.FC<{ t: number; c: Chunk; r: Region }> = ({ t, c, r }) => {
  if (c.i <= 1) return null; // the hook is drawn by Hook
  const text = c.words.map((w) => w.w).join(" ");
  const side = r.mode === "SIDE";
  const size = side ? (text.length <= 12 ? 56 : 48) : text.length <= 26 ? 64 : 60;
  const tt = twos(t);
  const k = back((tt - c.s) / 0.22, 2.2);
  const rot = (rnd(`cap${c.i}`) - 0.5) * 2.4 * (1.6 - 0.6 * Math.min(1, k));
  const dy = (1 - Math.min(1, k)) * 26;
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y + dy, width: r.w, textAlign: r.align, transform: `rotate(${rot}deg)`, transformOrigin: side ? "0 0" : "50% 0", textWrap: "balance" as any, opacity: Math.min(1, (tt - c.s + 0.07) / 0.07) }}>
      <span style={{ fontFamily: SERIF, fontWeight: 800, fontSize: size, lineHeight: 1.22, color: INK, background: "#fffdf6", padding: "2px 14px 6px", boxShadow: "5px 7px 9px rgba(74,52,32,.32)", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
        {c.words.map((w, i) => {
          const lw = w.w.toLowerCase(), emph = isEmph(lw), strong = STRONG.has(lw);
          const u = strong ? Math.max(0, Math.min(1, (t - w.s) / 0.3)) : 0;
          return (
            <React.Fragment key={i}>
              <span style={{ color: emph ? RED : INK, backgroundImage: strong ? `linear-gradient(${RED}, ${RED})` : undefined, backgroundRepeat: "no-repeat", backgroundSize: `${u * 100}% 7px`, backgroundPosition: "0 96%" }}>{w.w}</span>
              {i < c.words.length - 1 ? " " : ""}
            </React.Fragment>
          );
        })}
      </span>
    </div>
  );
};

// ---------- Hook: torn-paper condensed words revealed on the voice; "compression?" lands hardest ----------
type HW = { w: string; line: number; size: number; x: number; base: number; red?: boolean };
const AW = 0.47; // Anton average advance per em (uppercase), used with textLength for exact widths
const LINES: { words: number[]; size: number; base: number }[] = [
  { words: [0, 1], size: 92, base: 330 },
  { words: [2], size: 132, base: 470 },
  { words: [3, 4, 5], size: 92, base: 574 },
  { words: [6], size: 150, base: 712 },
];
const LAYOUT: HW[] = (() => {
  const out: HW[] = [];
  LINES.forEach((L, li) => {
    const ws = L.words.map((i) => HOOK_WORDS[i].w.toUpperCase());
    const widths = ws.map((w) => w.length * L.size * AW + L.size * 0.36);
    const gap = 16, total = widths.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
    let x = 540 - total / 2 + (li % 2 ? 14 : -14);
    ws.forEach((w, j) => { out[L.words[j]] = { w, line: li, size: L.size, x: x + widths[j] / 2, base: L.base, red: L.words[j] === 6 }; x += widths[j] + gap; });
  });
  return out;
})();

const FLUTTER = ["arXiv", "def f(x):", "<html>", "news", "r/askscience", "wiki", "1 AU", "Ch. 4"];
const CLOUD: [number, number] = [860, 380];

export const Hook: React.FC<{ t: number }> = ({ t }) => {
  if (t > 5.75) return null;
  const tt = twos(t);
  // gather into the crumpled cloud on "Think about it", then the cloud is pulled into the polaroid
  const g = (i: number) => Math.max(0, Math.min(1, (tt - T.think + 0.08 - i * 0.04) / 0.42));
  const pull = Math.max(0, Math.min(1, (tt - 5.0) / 0.6));
  const cloud: [number, number] = [CLOUD[0] + (540 - CLOUD[0]) * pull, CLOUD[1] + (760 - CLOUD[1]) * pull];
  const ease = (x: number) => x * x * (3 - 2 * x);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <Defs />
      {/* fluttering scraps in the top band */}
      {FLUTTER.map((s, i) => {
        const at = 0.2 + i * 0.42;
        if (tt < at) return null;
        const k = Math.min(1, (tt - at) / 0.5);
        const bx = 60 + rnd(`fx${i}`) * 960, by = 240 + rnd(`fy${i}`) * 440;
        const x0 = bx + Math.sin(tt * 1.7 + i) * 18, y0 = by - (1 - k) * 60 + Math.cos(tt * 1.3 + i * 2) * 10;
        const gg = ease(g(i + 7));
        const x = x0 + (cloud[0] - x0) * gg, y = y0 + (cloud[1] - y0) * gg;
        const sc = (0.55 + 0.25 * rnd(`fs${i}`)) * (1 - 0.7 * gg) * (1 - pull * 0.9);
        return <g key={i} opacity={0.9}><g transform={`translate(${x} ${y}) rotate(${Math.sin(tt * 2.1 + i) * 14 + (rnd(`fr${i}`) - 0.5) * 30}) scale(${sc})`} filter="url(#psh)">
          <path d={torn(s.length * 15 + 26, 44, `fl${i}`)} fill={PAPERS[i % 4]} />
          <text textAnchor="middle" y={9} fontFamily={TYPE} fontSize={24} fill={INK}>{s}</text>
        </g></g>;
      })}
      {/* crumpled paper cloud */}
      {tt > T.think - 0.05 && pull < 1 && (() => {
        const k = Math.max(0, Math.min(1, (tt - T.think) / 0.5));
        return <g transform={`translate(${cloud[0]} ${cloud[1]}) scale(${back(k, 2) * (1 - pull * 0.94)})`} filter="url(#psh)">
          {Array.from({ length: 9 }, (_, i) => {
            const a = (i / 9) * Math.PI * 2, rr = i === 0 ? 0 : 52;
            const r = 46 + rnd(`cl${i}`) * 26;
            const pts = Array.from({ length: 11 }, (_, j) => { const b = (j / 11) * Math.PI * 2, q = r * (0.75 + 0.3 * rnd(`cr${i}${j}`)) + boil(`c${i}${j}`, tt, 2); return `${(Math.cos(a) * rr * 1.3 + Math.cos(b) * q).toFixed(1)},${(Math.sin(a) * rr * 0.7 + Math.sin(b) * q).toFixed(1)}`; });
            return <g key={i}><path d={"M" + pts.join("L") + "Z"} fill={i % 3 === 0 ? "#f3e7c9" : "#fffaf0"} stroke="#b9a988" strokeWidth={1.5} />
              <path d={`M${pts[1]}L${pts[5]}M${pts[3]}L${pts[8]}`} stroke="#c8b998" strokeWidth={1.4} /></g>;
          })}
        </g>;
      })()}
      {/* the words */}
      {LAYOUT.map((L, i) => {
        const w = HOOK_WORDS[i];
        const at = i === 0 ? -0.4 : w.s - 0.04; // the first word is up on frame 0 (the cover)
        if (tt < at) return null;
        const big = L.red;
        const k = (tt - at) / (big ? 0.3 : 0.2);
        const s = back(k, big ? 2.6 : 2.0);
        const natural = L.w.length * L.size * AW;
        // compression?: letters arrive spread wide, then squash together past their width and settle
        let tw = natural, sy = 1;
        if (big) {
          const q = (tt - at) / 0.42;
          tw = q < 0.35 ? natural * (1.45 - q / 0.35 * 0.65) : q < 1 ? natural * (0.8 + (q - 0.35) / 0.65 * 0.2) : natural;
          sy = q < 0.35 ? 0.92 : q < 1 ? 1.12 - (q - 0.35) / 0.65 * 0.12 : 1;
        }
        const pw = tw + L.size * 0.36, ph = L.size * 1.08;
        const rot = (rnd(`hr${i}`) - 0.5) * 6 + (1 - Math.min(1, k)) * (big ? -8 : 5);
        const gg = ease(g(i));
        const x = L.x + (cloud[0] - L.x) * gg, y = L.base - L.size * 0.36 + (cloud[1] - L.base) * gg;
        const sc = (big ? 0.94 + 0.06 * Math.min(1, s) : s) * (1 - 0.85 * gg);
        const shake = big && tt - at < 0.35 ? Math.sin((tt - at) * 90) * 6 * (1 - (tt - at) / 0.35) : 0;
        return (
          <g key={i} transform={`translate(${x + shake} ${y}) rotate(${rot * (1 - gg) + gg * 40}) scale(${Math.max(0.01, sc)} ${Math.max(0.01, sc * sy)})`} filter="url(#psh2)">
            <path d={torn(pw, ph, `hk${i}`, "tlrb", 5)} fill={big ? RED : i % 2 ? "#fffaf0" : "#f6eedb"} />
            <text textAnchor="middle" y={L.size * 0.36} fontFamily={COND} fontSize={L.size} fill={big ? "#fffaf0" : INK} textLength={tw} lengthAdjust="spacingAndGlyphs">{L.w}</text>
          </g>
        );
      })}
    </svg>
  );
};
