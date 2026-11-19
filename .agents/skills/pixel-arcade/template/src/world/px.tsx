// Pixel kit: a hand-made 5x7 bitmap font, sprite bitmaps and pixel panels, all drawn as crisp SVG paths.
import React from "react";
import { AbsoluteFill } from "remotion";

export const C = {
  bg: "#05060a", panel: "#0b0d1a", panel2: "#141834",
  green: "#39ff6a", xbox: "#107c10", xboxDark: "#0a4a0a",
  blue: "#2fa8ff", ps: "#0070d1", psDark: "#003a75",
  mag: "#ff2bd6", yellow: "#ffe14a", red: "#ff3b3b", white: "#f4f4ff", grey: "#6b7090", ink: "#000000",
};
export const CELL = 9; // 1080 / 120

const G: Record<string, string> = {
  A: "01110 10001 10001 11111 10001 10001 10001", B: "11110 10001 10001 11110 10001 10001 11110",
  C: "01110 10001 10000 10000 10000 10001 01110", D: "11110 10001 10001 10001 10001 10001 11110",
  E: "11111 10000 10000 11110 10000 10000 11111", F: "11111 10000 10000 11110 10000 10000 10000",
  G: "01110 10001 10000 10111 10001 10001 01111", H: "10001 10001 10001 11111 10001 10001 10001",
  I: "01110 00100 00100 00100 00100 00100 01110", J: "00111 00010 00010 00010 00010 10010 01100",
  K: "10001 10010 10100 11000 10100 10010 10001", L: "10000 10000 10000 10000 10000 10000 11111",
  M: "10001 11011 10101 10101 10001 10001 10001", N: "10001 10001 11001 10101 10011 10001 10001",
  O: "01110 10001 10001 10001 10001 10001 01110", P: "11110 10001 10001 11110 10000 10000 10000",
  Q: "01110 10001 10001 10001 10101 10010 01101", R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110", T: "11111 00100 00100 00100 00100 00100 00100",
  U: "10001 10001 10001 10001 10001 10001 01110", V: "10001 10001 10001 10001 10001 01010 00100",
  W: "10001 10001 10001 10101 10101 10101 01010", X: "10001 10001 01010 00100 01010 10001 10001",
  Y: "10001 10001 01010 00100 00100 00100 00100", Z: "11111 00001 00010 00100 01000 10000 11111",
  "0": "01110 10001 10011 10101 11001 10001 01110", "1": "00100 01100 00100 00100 00100 00100 01110",
  "2": "01110 10001 00001 00010 00100 01000 11111", "3": "11111 00010 00100 00010 00001 10001 01110",
  "4": "00010 00110 01010 10010 11111 00010 00010", "5": "11111 10000 11110 00001 00001 10001 01110",
  "6": "00110 01000 10000 11110 10001 10001 01110", "7": "11111 00001 00010 00100 01000 01000 01000",
  "8": "01110 10001 10001 01110 10001 10001 01110", "9": "01110 10001 10001 01111 00001 00010 01100",
  "?": "01110 10001 00001 00010 00100 00000 00100", "!": "00100 00100 00100 00100 00100 00000 00100",
  "'": "00100 00100 01000 00000 00000 00000 00000", ".": "00000 00000 00000 00000 00000 01100 01100",
  ",": "00000 00000 00000 00000 01100 00100 01000", ":": "00000 01100 01100 00000 01100 01100 00000",
  "-": "00000 00000 00000 11111 00000 00000 00000", ">": "01000 00100 00010 00001 00010 00100 01000",
  "<": "00010 00100 01000 10000 01000 00100 00010", "/": "00001 00010 00010 00100 01000 01000 10000",
  "+": "00000 00100 00100 11111 00100 00100 00000", "↓": "00100 00100 00100 10101 01110 00100 00000",
  "↑": "00100 01110 10101 00100 00100 00100 00000", "♥": "00000 01010 11111 11111 01110 00100 00000",
  "@": "01110 10001 10111 10101 10111 10000 01110", _: "00000 00000 00000 00000 00000 00000 11111",
  "%": "11001 11010 00010 00100 01000 01011 10011", "\"": "01010 01010 00000 00000 00000 00000 00000",
  "★": "00100 00100 11111 01110 01010 10001 00000", "▶": "01000 01100 01110 01111 01110 01100 01000",
  "◀": "00010 00110 01110 11110 01110 00110 00010",
  "·": "00000 00000 00000 01100 01100 00000 00000",
  "x": "00000 10001 01010 00100 01010 10001 00000", " ": "00000 00000 00000 00000 00000 00000 00000",
};
const rows = (ch: string) => (G[ch] ?? G[ch.toUpperCase()] ?? G["?"]).split(" ");
const normText = (s: string) => s.replace(/[’‘]/g, "'").replace(/[—–]/g, "-").replace(/[“”]/g, "\"");

export const ADV = 6; // glyph advance in font pixels
export const textW = (s: string, scale: number) => Math.max(0, normText(s).length * ADV - 1) * scale;

// One path for a whole string; horizontal runs merged.
const cache = new Map<string, string>();
export const textPath = (s: string, scale: number) => {
  const key = s + "|" + scale;
  const hit = cache.get(key);
  if (hit) return hit;
  let d = "";
  [...normText(s)].forEach((ch, i) => {
    const ox = i * ADV * scale;
    rows(ch).forEach((r, y) => {
      let x = 0;
      while (x < 5) {
        if (r[x] === "1") {
          let e = x; while (e < 5 && r[e] === "1") e++;
          d += `M${ox + x * scale} ${y * scale}h${(e - x) * scale}v${scale}h${-(e - x) * scale}z`;
          x = e;
        } else x++;
      }
    });
  });
  cache.set(key, d);
  return d;
};

type TextProps = {
  x: number; y: number; s: number; text: string; fill?: string; align?: "left" | "center" | "right";
  shadow?: string | null; outline?: string | null; glow?: boolean; opacity?: number; chars?: number;
};
// Pixel text. `chars` reveals a typewriter prefix. y = top of the glyph box (7*s tall).
export const PxText: React.FC<TextProps> = ({ x, y, s, text, fill = C.white, align = "left", shadow = C.ink, outline = null, glow, opacity = 1, chars }) => {
  const str = chars === undefined ? text : normText(text).slice(0, Math.max(0, Math.floor(chars)));
  const full = textW(text, s);
  const x0 = Math.round(align === "center" ? x - full / 2 : align === "right" ? x - full : x);
  const d = textPath(str, s);
  const o = Math.max(2, Math.round(s * 0.5));
  return (
    <g transform={`translate(${x0} ${Math.round(y)})`} opacity={opacity}>
      {outline && [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, o], [-o, o], [o, -o]].map(([dx, dy], i) => <path key={i} d={d} fill={outline} transform={`translate(${dx} ${dy})`} />)}
      {shadow && <path d={d} fill={shadow} transform={`translate(${Math.max(2, Math.round(s * 0.6))} ${Math.max(2, Math.round(s * 0.6))})`} />}
      <path d={d} fill={fill} filter={glow ? "url(#bloom)" : undefined} />
    </g>
  );
};

// Sprite bitmaps: rows of palette chars, '.' transparent.
export type Pal = Record<string, string>;
const spriteCache = new Map<string, { c: string; d: string }[]>();
export const spritePaths = (rowsS: string[], s: number, mirror = false) => {
  const key = rowsS.join("/") + s + mirror;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const w = Math.max(...rowsS.map((r) => r.length));
  const byC: Record<string, string> = {};
  rowsS.forEach((r0, y) => {
    const r = mirror ? r0.padEnd(w, ".").split("").reverse().join("") : r0;
    let x = 0;
    while (x < r.length) {
      const ch = r[x];
      if (ch === ".") { x++; continue; }
      let e = x; while (e < r.length && r[e] === ch) e++;
      byC[ch] = (byC[ch] ?? "") + `M${x * s} ${y * s}h${(e - x) * s}v${s}h${-(e - x) * s}z`;
      x = e;
    }
  });
  const out = Object.entries(byC).map(([c, d]) => ({ c, d }));
  spriteCache.set(key, out);
  return out;
};
export const Sprite: React.FC<{ rows: string[]; pal: Pal; x: number; y: number; s: number; mirror?: boolean; opacity?: number; glow?: boolean }> = ({ rows: r, pal, x, y, s, mirror, opacity = 1, glow }) => (
  <g transform={`translate(${Math.round(x)} ${Math.round(y)})`} opacity={opacity} filter={glow ? "url(#bloom)" : undefined}>
    {spritePaths(r, s, mirror).map(({ c, d }) => <path key={c} d={d} fill={pal[c] ?? "#f0f"} />)}
  </g>
);

// ---------- sprites ----------
// Fighter (faces right). K outline, H hair, S skin, B headband, C team, D team dark, G glove, W shoe, Y belt
export const FIGHTER_IDLE = [
  "....KKKKKK......",
  "...KHHHHHHK.....",
  "...KHHHHHHHK....",
  "..BBBBBBBBBBB...",
  "...KSSSSKSKK....",
  "...KSSSSKSSK....",
  "...KSSSSSSSK....",
  "....KSSSSSK.....",
  "...KKCCCCCKK....",
  "..KCCCCCCCCCK...",
  ".KCCKCCCCCKCCK..",
  ".KCCKCCCCCKCCK..",
  ".KSSKCCCCCKSSK..",
  ".KGGGKCCCKGGGK..",
  ".KGGGKYYYKGGGK..",
  "..KK.KDDDK.KK...",
  "....KDDKDDK.....",
  "...KDDK.KDDK....",
  "...KDDK.KDDK....",
  "..KDDK...KDDK...",
  "..KWWK...KWWK...",
  "..KKKK...KKKK...",
];
export const FIGHTER_PUNCH = [
  "....KKKKKK..........",
  "...KHHHHHHK.........",
  "...KHHHHHHHK........",
  "..BBBBBBBBBBB.......",
  "...KSSSSKSKK........",
  "...KSSSSKSSK........",
  "...KSSSSSSSK........",
  "....KSSSSSK.........",
  "...KKCCCCCKKKKKKKK..",
  "..KCCCCCCCCCCCCKGGGK",
  ".KCCKCCCCCCCCCCKGGGK",
  ".KCCKCCCCCKKKKKKGGGK",
  ".KSSKCCCCCK.....KKK.",
  ".KGGGKCCCK..........",
  ".KGGGKYYYK..........",
  "..KK.KDDDK..........",
  "....KDDKDDK.........",
  "...KDDK..KDDK.......",
  "...KDDK...KDDK......",
  "..KDDK.....KDDK.....",
  "..KWWK.....KWWK.....",
  "..KKKK.....KKKK.....",
];
export const fighterPal = (team: "x" | "p"): Pal => ({
  K: "#000", H: "#1a1020", S: "#e0a070", B: team === "x" ? C.yellow : C.mag,
  C: team === "x" ? C.xbox : C.ps, D: team === "x" ? C.xboxDark : C.psDark,
  G: team === "x" ? C.green : C.blue, W: C.white, Y: team === "x" ? C.yellow : C.mag,
});

// crowd player holding a controller
export const PLAYER = [
  "..KKK..",
  ".KHHHK.",
  ".KSSSK.",
  ".KSKSK.",
  "..KSK..",
  ".KCCCK.",
  "KCCCCCK",
  "KSKKKSK",
  ".KQQQK.",
  ".KDKDK.",
  ".KDKDK.",
  ".KK.KK.",
];
export const COIN = [".KKKK.", "KYYYWK", "KYKYYK", "KYKYYK", "KYYYOK", ".KKKK."];
export const coinPal: Pal = { K: "#000", Y: C.yellow, W: "#fff8c0", O: "#c08a00" };
export const CART = [
  "KKKKKKKK",
  "KGGGGGGK",
  "KGLLLLGK",
  "KGLWWLGK",
  "KGLLLLGK",
  "KGGGGGGK",
  "KGGGGGGK",
  "KGKGKGKK",
  "KKKKKKKK",
];
export const HEART = [".KK.KK.", "KMMKMMK", "KMWMMMK", "KMMMMMK", ".KMMMK.", "..KMK..", "...K..."];
export const heartPal: Pal = { K: "#000", M: C.mag, W: "#ffd0f4" };
export const QBLOCK = [
  "KKKKKKKKKK",
  "KYYYYYYYYK",
  "KYOKKKKOYK",
  "KYKKOOKKYK",
  "KYOOOKKOYK",
  "KYOOKKOOYK",
  "KYOOKKOOYK",
  "KYOOOOOOYK",
  "KYOOKKOOYK",
  "KKKKKKKKKK",
];
export const qPal: Pal = { K: "#000", Y: "#fff3a0", O: "#e8a400" };
export const CROWN = ["Y...Y...Y", "YY.YYY.YY", "YYYYYYYYY", "YRYYBYYRY", "YYYYYYYYY"];
export const crownPal: Pal = { Y: C.yellow, R: C.red, B: C.blue };
export const LOCK_OPEN = ["...KKKK", "..K...K", "..K...K", "..K....", "KKKKKK.", "KYYYYK.", "KYKKYK.", "KYKKYK.", "KYYYYK.", "KKKKKK."];
export const FLAG = ["KCCCCC", "KCCCC.", "KCCC..", "K.....", "K.....", "K.....", "KK...."];

// ---------- frames / panels ----------
// A pixel window: black fill, double neon border with notched corners.
export const PxPanel: React.FC<{ x: number; y: number; w: number; h: number; color?: string; fill?: string; fillOpacity?: number; b?: number }> = ({ x, y, w, h, color = C.green, fill = C.panel, fillOpacity = 0.92, b = CELL }) => (
  <g>
    <rect x={x + b} y={y + b} width={w - 2 * b} height={h - 2 * b} fill={fill} opacity={fillOpacity} />
    <path fill={color} d={`M${x + b} ${y}h${w - 2 * b}v${b}h${-(w - 2 * b)}z M${x + b} ${y + h - b}h${w - 2 * b}v${b}h${-(w - 2 * b)}z M${x} ${y + b}h${b}v${h - 2 * b}h${-b}z M${x + w - b} ${y + b}h${b}v${h - 2 * b}h${-b}z`} />
    <path fill={color} opacity={0.45} d={`M${x + 2 * b} ${y + 2 * b}h${w - 4 * b}v${b / 3}h${-(w - 4 * b)}z M${x + 2 * b} ${y + h - 2 * b - b / 3}h${w - 4 * b}v${b / 3}h${-(w - 4 * b)}z`} />
  </g>
);

// Segmented health / progress bar.
export const PxBar: React.FC<{ x: number; y: number; w: number; h: number; v: number; color: string; back?: string; dir?: 1 | -1; seg?: number }> = ({ x, y, w, h, v, color, back = "#2a0a12", dir = 1, seg = 18 }) => {
  const n = Math.max(1, Math.floor((w - 12) / seg));
  const lit = Math.round(Math.max(0, Math.min(1, v)) * n);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#000" />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} fill={back} />
      {Array.from({ length: n }, (_, i) => {
        const on = dir === 1 ? i < lit : i >= n - lit;
        return on ? <rect key={i} x={x + 6 + i * seg} y={y + 6} width={seg - 4} height={h - 12} fill={color} /> : null;
      })}
      <rect x={x + 6} y={y + 6} width={w - 12} height={Math.max(2, (h - 12) / 4)} fill="#fff" opacity={0.25} />
    </g>
  );
};

// SVG root for a full 1080x1920 layer, with the bloom filter defined once per layer.
export const PxLayer: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={style}>
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" shapeRendering="crispEdges" style={{ position: "absolute", left: 0, top: 0 }}>
      <defs>
        <filter id="bloom" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {children}
    </svg>
  </AbsoluteFill>
);

// CRT: scanlines + vignette (+ a faint RGB mask). `k` = strength 0..1.
export const CRT: React.FC<{ k: number }> = ({ k }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ opacity: 0.55 * k, background: "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 3px, rgba(0,0,0,0.55) 3px, rgba(0,0,0,0.55) 6px)" }} />
    <AbsoluteFill style={{ opacity: 0.12 * k, background: "repeating-linear-gradient(to right, rgba(255,0,80,0.6) 0px, rgba(0,255,120,0.6) 3px, rgba(0,120,255,0.6) 6px)" }} />
    <AbsoluteFill style={{ opacity: k, background: "radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.55) 100%)" }} />
  </AbsoluteFill>
);
