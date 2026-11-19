// Retro space-age poster kit: palette, fonts, halftone patterns, paper grain, mis-registered ink, badges.
import React, { useMemo } from "react";
import { random } from "remotion";
import { loadFont as anton } from "@remotion/google-fonts/Anton";
import { loadFont as archivo } from "@remotion/google-fonts/ArchivoBlack";

export const COND = anton().fontFamily;
export const BLACK = archivo().fontFamily;

export const CREAM = "#f2e6cf", ORANGE = "#e0632b", TEAL = "#1f6f78", NAVY = "#1b2a49", MUSTARD = "#e8b13a";
export const SHADE = "#e3d1b0", PAPER = "#efe0c4";
// The creator handle on the end card (set per creator).
export const HANDLE = "@your_handle";

// Halftone dot patterns: id `ht-<name>`. Use as fill="url(#ht-navy-s)".
const HT: [string, string, number, number][] = [
  // name, colour, cell, dot radius
  ["navy-s", NAVY, 11, 2.2], ["navy-m", NAVY, 11, 3.4], ["navy-l", NAVY, 11, 4.6],
  ["teal-s", TEAL, 11, 2.4], ["teal-m", TEAL, 11, 3.6], ["teal-l", TEAL, 11, 4.8],
  ["orange-s", ORANGE, 11, 2.4], ["orange-m", ORANGE, 11, 3.6], ["orange-l", ORANGE, 11, 4.8],
  ["mustard-m", MUSTARD, 11, 3.6], ["mustard-l", MUSTARD, 11, 4.8],
  ["cream-m", CREAM, 11, 3.2], ["cream-l", CREAM, 11, 4.6],
];
export const ht = (name: string) => `url(#ht-${name})`;

// <defs> every poster svg includes once.
export const PosterDefs: React.FC = () => (
  <defs>
    {HT.map(([n, c, cell, r]) => (
      <pattern key={n} id={`ht-${n}`} width={cell} height={cell} patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <circle cx={cell / 2} cy={cell / 2} r={r} fill={c} />
      </pattern>
    ))}
    {/* ink mis-registration: an offset orange ghost of the artwork printed under it */}
    <filter id="misreg" x="-10%" y="-10%" width="120%" height="120%">
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0.878  0 0 0 0 0.388  0 0 0 0 0.169  0 0 0 0.55 0" result="g" />
      <feOffset in="g" dx="6" dy="4" result="go" />
      <feMerge><feMergeNode in="go" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="misreg-t" x="-10%" y="-10%" width="120%" height="120%">
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0.122  0 0 0 0 0.435  0 0 0 0 0.471  0 0 0 0.6 0" result="g" />
      <feOffset in="g" dx="-5" dy="4" result="go" />
      <feMerge><feMergeNode in="go" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="poster-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="8" dy="10" stdDeviation="0" floodColor={NAVY} floodOpacity="0.9" />
    </filter>
  </defs>
);

// Paper grain + fibres, built once as a texture, plus a soft print-wear blotch layer.
export const usePaper = () =>
  useMemo(() => {
    const S = 512;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d");
    if (!g) return "";
    const d = g.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      const v = 128 + (random(`pp${i}`) - 0.5) * 70;
      d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v;
      d.data[i * 4 + 3] = 255;
    }
    g.putImageData(d, 0, 0);
    g.globalAlpha = 0.18;
    for (let k = 0; k < 260; k++) {
      const x = random(`fx${k}`) * S, y = random(`fy${k}`) * S, a = random(`fa${k}`) * Math.PI, l = 6 + random(`fl${k}`) * 22;
      g.strokeStyle = random(`fc${k}`) > 0.5 ? "#fff" : "#000";
      g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    return c.toDataURL();
  }, []);

// Paper finish over a full-frame poster (grain overlay + edge wear). `o` = strength.
export const PaperFinish: React.FC<{ fr: number; o?: number }> = ({ fr, o = 1 }) => {
  const tex = usePaper();
  return (
    <>
      <div style={{ position: "absolute", inset: 0, backgroundImage: tex ? `url(${tex})` : undefined, backgroundPosition: `${(fr % 2) * 3}px ${(fr % 3) * 2}px`, mixBlendMode: "multiply", opacity: 0.22 * o, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 70% at 50% 45%, rgba(0,0,0,0) 60%, rgba(60,30,10,0.28) 100%)", opacity: o, pointerEvents: "none" }} />
    </>
  );
};

// Condensed poster text with a mis-registered ghost (orange by default).
export const Ink: React.FC<{
  x: number; y: number; size: number; children: React.ReactNode; fill?: string; ghost?: string; anchor?: "start" | "middle" | "end";
  font?: string; ls?: number; off?: [number, number]; opacity?: number; width?: number; weight?: number;
}> = ({ x, y, size, children, fill = NAVY, ghost = ORANGE, anchor = "middle", font = COND, ls = 0, off = [5, 4], opacity = 1, width, weight }) => {
  const common = { x, textAnchor: anchor, fontFamily: font, fontSize: size, letterSpacing: ls, fontWeight: weight, ...(width ? { textLength: width, lengthAdjust: "spacingAndGlyphs" as const } : {}) };
  return (
    <g opacity={opacity}>
      {ghost !== "none" && <text {...common} x={x + off[0]} y={y + off[1]} fill={ghost} opacity={0.85}>{children}</text>}
      <text {...common} y={y} fill={fill}>{children}</text>
    </g>
  );
};

// Era badge: a rounded pill or a ticket-notched label.
export const Badge: React.FC<{ x: number; y: number; w: number; h?: number; text: string; bg?: string; fg?: string; size?: number; rot?: number; k?: number }> =
  ({ x, y, w, h = 64, text, bg = NAVY, fg = MUSTARD, size = 38, rot = 0, k = 1 }) => (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${0.6 + 0.4 * k})`} opacity={Math.min(1, k * 1.6)}>
      <rect x={-w / 2 + 6} y={-h / 2 + 5} width={w} height={h} rx={h / 2} fill={ORANGE} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={bg} />
      <rect x={-w / 2 + 7} y={-h / 2 + 7} width={w - 14} height={h - 14} rx={(h - 14) / 2} fill="none" stroke={fg} strokeWidth={2.5} />
      <text x={0} y={size * 0.36} textAnchor="middle" fontFamily={COND} fontSize={size} letterSpacing={2} fill={fg}>{text}</text>
    </g>
  );

// Rubber-stamp / starburst helpers
export const starPath = (r1: number, r2: number, n: number, seed = 0) => {
  let d = "";
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + seed;
    const r = i % 2 ? r2 : r1;
    d += `${i ? "L" : "M"}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
  }
  return d + "Z";
};

// A rotated rectangular stamp with a double border (screen-print style).
export const Stamp: React.FC<{ x: number; y: number; w: number; h: number; rot?: number; k: number; color?: string; bg?: string; children: React.ReactNode }> =
  ({ x, y, w, h, rot = -7, k, color = ORANGE, bg = CREAM, children }) => {
    if (k <= 0.001) return null;
    const s = 1.6 - 0.6 * Math.min(1, k) + (k > 1 ? 0 : 0);
    return (
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={Math.min(1, k * 2)}>
        <rect x={-w / 2 + 8} y={-h / 2 + 8} width={w} height={h} rx={10} fill={NAVY} />
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10} fill={bg} />
        <rect x={-w / 2 + 10} y={-h / 2 + 10} width={w - 20} height={h - 20} rx={6} fill="none" stroke={color} strokeWidth={6} />
        <rect x={-w / 2 + 20} y={-h / 2 + 20} width={w - 40} height={h - 40} rx={4} fill="none" stroke={color} strokeWidth={2} />
        {children}
      </g>
    );
  };
