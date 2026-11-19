// Declassified Dossier kit: palette, fonts, textures, filters and the document primitives every scene uses.
// Everything is deterministic from t (seeded random()).
import React from "react";
import { interpolate, random } from "remotion";
import { loadFont as courier } from "@remotion/google-fonts/CourierPrime";
import { loadFont as anton } from "@remotion/google-fonts/Anton";
import { clamp, ease } from "../lib";
import deskImg from "./tex/desk.jpg";
import manilaImg from "./tex/manila.jpg";
import memoImg from "./tex/memo.jpg";

export const MONO = courier("normal", { weights: ["400", "700"] }).fontFamily;
export const COND = anton().fontFamily;
export const IMG = { desk: deskImg, manila: manilaImg, memo: memoImg };

export const MANILA = "#d8c08a", MANILA_D = "#b99d62", DESK = "#1c1a18", INK = "#16130f", RED = "#c0282d";
export const HI = "#f5e34a", MEMO = "#f3ead6", LAMP = "#ffcf7a", BLUE = "#3d6fd1", STEEL = "#8a8f96";

// Creator handle (end card) and the series tag over every frame: change per creator / series.
export const HANDLE = "@madhav_somani";
export const SERIES = "MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS";

export const rnd = (s: string | number) => random(`dd${s}`);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const pS = (t: number, at: number, dur = 0.4, e = ease) => interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing: e });
export const back = (x: number, s = 1.9) => { const k = Math.max(0, Math.min(1, x)) - 1; return 1 + k * k * ((s + 1) * k + s); };
export const pB = (t: number, at: number, dur = 0.35, s = 1.9) => back((t - at) / dur, s);
export const sm = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
// pencil boil: jitter that changes every 2 frames
export const boil = (seed: string | number, t: number, amp = 1) => (random(`b${seed}-${Math.floor(t * 15)}`) - 0.5) * 2 * amp;

export const Defs: React.FC = () => (
  <defs>
    <filter id="dsh" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="10" dy="16" stdDeviation="11" floodColor="#000" floodOpacity="0.6" /></filter>
    <filter id="dsh2" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="4" dy="6" stdDeviation="4" floodColor="#1a0f05" floodOpacity="0.45" /></filter>
    {/* worn rubber-stamp ink: knock holes out of the shape with noise */}
    <filter id="dink" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.62" result="m" />
      <feComposite in="SourceGraphic" in2="m" operator="in" result="a" />
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="w" />
      <feDisplacementMap in="a" in2="w" scale="5" />
    </filter>
    <filter id="dpencil" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="4" result="n" />
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.45" result="m" />
      <feComposite in="SourceGraphic" in2="m" operator="in" />
    </filter>
    <pattern id="pmanila" width="1024" height="1024" patternUnits="userSpaceOnUse"><image href={IMG.manila} width="1024" height="1024" /></pattern>
    <pattern id="pmemo" width="1024" height="1024" patternUnits="userSpaceOnUse"><image href={IMG.memo} width="1024" height="1024" /></pattern>
    <linearGradient id="gsteel" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#e8ebef" /><stop offset="0.5" stopColor="#9aa1aa" /><stop offset="1" stopColor="#d5d9de" /></linearGradient>
    <linearGradient id="gbrass" x1="0" x2="1"><stop offset="0" stopColor="#8a6422" /><stop offset="0.45" stopColor="#f2cf7a" /><stop offset="1" stopColor="#9b7228" /></linearGradient>
  </defs>
);

// Torn/irregular rectangle path centred on 0,0. `edges` = which sides are torn (t r b l).
export const torn = (w: number, h: number, seed: string | number, edges = "lr", amp = 3) => {
  const pts: [number, number][] = [];
  const side = (x0: number, y0: number, x1: number, y1: number, tornSide: boolean, k: string) => {
    const L = Math.hypot(x1 - x0, y1 - y0), n = tornSide ? Math.max(2, Math.round(L / 10)) : 1;
    const nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    for (let i = 0; i < n; i++) {
      const u = i / n, j = tornSide && i > 0 ? (rnd(`${seed}${k}${i}`) - 0.5) * 2 * amp : 0;
      pts.push([x0 + (x1 - x0) * u + nx * j, y0 + (y1 - y0) * u + ny * j]);
    }
  };
  const a = w / 2, b = h / 2;
  side(-a, -b, a, -b, edges.includes("t"), "t");
  side(a, -b, a, b, edges.includes("r"), "r");
  side(a, b, -a, b, edges.includes("b"), "b");
  side(-a, b, -a, -b, edges.includes("l"), "l");
  return "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L") + "Z";
};

// A sheet of paper, top-left at 0,0 of its own frame (w x h).
export const Sheet: React.FC<{ w: number; h: number; fill?: "memo" | "manila"; children?: React.ReactNode; shadow?: boolean }> = ({ w, h, fill = "memo", children, shadow = true }) => (
  <g>
    <rect width={w} height={h} fill={`url(#p${fill})`} filter={shadow ? "url(#dsh)" : undefined} />
    {children}
  </g>
);

// Typewriter text: chars revealed from `at` at `cps` chars/s (at <= -99: fully typed).
export const Type: React.FC<{ x: number; y: number; text: string; t: number; at?: number; cps?: number; size?: number; fill?: string; weight?: number; anchor?: "start" | "middle" | "end"; ls?: number; opacity?: number }> =
  ({ x, y, text, t, at = -99, cps = 38, size = 34, fill = INK, weight = 700, anchor = "start", ls = 0, opacity }) => {
    const n = at <= -99 ? text.length : Math.max(0, Math.min(text.length, Math.floor((t - at) * cps)));
    if (n <= 0) return null;
    return <text x={x} y={y} fontFamily={MONO} fontWeight={weight} fontSize={size} fill={fill} textAnchor={anchor} letterSpacing={ls} opacity={opacity}>{text.slice(0, n)}</text>;
  };

// Rubber stamp that slams in at `at`: double border, worn ink, multiply onto paper. Centred at x,y.
export const Stamp: React.FC<{ x: number; y: number; t: number; at: number; text: string; sub?: string; size?: number; rot?: number; color?: string; w?: number; pad?: number }> =
  ({ x, y, t, at, text, sub, size = 90, rot = -8, color = RED, w, pad = 0.32 }) => {
    if (t < at - 0.1) return null;
    const k = (t - at + 0.1) / 0.14; // falls from big & soft to flat & sharp
    const s = k < 1 ? lerp(1.9, 1, k * k) : 1 + Math.max(0, 0.04 * (1 - (t - at - 0.04) / 0.15)) * Math.sin((t - at) * 60);
    const op = k < 1 ? 0.25 + 0.75 * k : 1;
    const ww = w ?? text.length * size * 0.5 + size * 0.9, hh = size * (sub ? 1.75 : 1.32);
    return (
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={op * 0.96}>
        <g filter="url(#dink)">
          <rect x={-ww / 2} y={-hh / 2} width={ww} height={hh} rx={size * 0.12} fill="none" stroke={color} strokeWidth={size * 0.085} />
          <rect x={-ww / 2 + size * pad * 0.5} y={-hh / 2 + size * pad * 0.5} width={ww - size * pad} height={hh - size * pad} rx={size * 0.06} fill="none" stroke={color} strokeWidth={size * 0.04} />
          <text y={sub ? -hh / 2 + size * 1.0 : size * 0.36} textAnchor="middle" fontFamily={COND} fontSize={size} fill={color} letterSpacing={size * 0.04}>{text}</text>
          {sub && <text y={hh / 2 - size * 0.24} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={size * 0.3} fill={color}>{sub}</text>}
        </g>
      </g>
    );
  };

// Black redaction bar: slides over [x..x+w] at `on`, rips away in two torn halves at `off`.
export const Redact: React.FC<{ x: number; y: number; w: number; h?: number; t: number; on: number; off?: number; seed: string }> = ({ x, y, w, h = 40, t, on, off = 1e9, seed }) => {
  if (t < on) return null;
  const k = sm((t - on) / 0.22);
  if (t < off) return <rect x={x} y={y} width={w * k} height={h} fill="#0c0b0a" />;
  const r = (t - off) / 0.5;
  if (r > 1) return null;
  const half = (side: number) => (
    <g transform={`translate(${x + w * (side ? 0.75 : 0.25) + side * 0} ${y + h / 2}) translate(${(side ? 1 : -1) * 260 * r * r} ${-120 * r + 600 * r * r}) rotate(${(side ? 1 : -1) * 40 * r})`} opacity={1 - r * 0.6}>
      <path d={torn(w / 2, h, `${seed}${side}`, side ? "l" : "r", 7)} fill="#0c0b0a" filter="url(#dsh2)" />
    </g>
  );
  return <g>{half(0)}{half(1)}</g>;
};

// Highlighter swipe under a word (left to right).
export const Hi: React.FC<{ x: number; y: number; w: number; h: number; t: number; at: number; color?: string; dur?: number }> = ({ x, y, w, h, t, at, color = HI, dur = 0.3 }) => {
  const k = sm((t - at) / dur);
  if (k <= 0) return null;
  return <path d={`M${x},${y + 3} L${x + w * k},${y} L${x + w * k},${y + h} L${x},${y + h - 2} Z`} fill={color} opacity={0.72} style={{ mixBlendMode: "multiply" }} />;
};

// Paper clip (steel wire), its long axis vertical, top at 0,0.
export const Clip: React.FC<{ x: number; y: number; rot?: number; s?: number }> = ({ x, y, rot = 0, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} filter="url(#dsh2)">
    <path d="M10,90 L10,12 A12,12 0 0 1 34,12 L34,108 A18,18 0 0 1 -2,108 L-2,26 A6,6 0 0 1 10,26" fill="none" stroke="url(#gsteel)" strokeWidth={5} strokeLinecap="round" transform="translate(0 0)" />
  </g>
);

// Red-pencil stroke revealed along its length (p 0..1).
export const Pencil: React.FC<{ d: string; p: number; stroke?: string; w?: number; opacity?: number }> = ({ d, p, stroke = RED, w = 6, opacity = 0.95 }) => {
  if (p <= 0) return null;
  return <path d={d} pathLength={1} fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - Math.min(1, p)} opacity={opacity} filter="url(#dpencil)" />;
};

// Hand-drawn loop around cx,cy.
export const loopPath = (cx: number, cy: number, rx: number, ry: number, seed: string | number) => {
  const n = 30, pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const a = -2.4 + (i / n) * Math.PI * 2.18, j = 1 + (rnd(`${seed}c${i}`) - 0.5) * 0.07;
    pts.push(`${(cx + Math.cos(a) * rx * j).toFixed(1)},${(cy + Math.sin(a) * ry * j).toFixed(1)}`);
  }
  return "M" + pts.join("L");
};

// Arrow head for a pencil arrow ending at (x,y) pointing along angle a (radians).
export const arrowHead = (x: number, y: number, a: number, L = 26) =>
  `M${x - Math.cos(a - 0.45) * L},${y - Math.sin(a - 0.45) * L} L${x},${y} L${x - Math.cos(a + 0.45) * L},${y - Math.sin(a + 0.45) * L}`;

// Red string between two pins (sags a little), revealed by p.
export const StringLine: React.FC<{ a: [number, number]; b: [number, number]; p: number; sag?: number; w?: number }> = ({ a, b, p, sag = 30, w = 4 }) => {
  if (p <= 0) return null;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + sag;
  return <path d={`M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`} pathLength={1} fill="none" stroke="#d3262c" strokeWidth={w} strokeDasharray="1 1" strokeDashoffset={1 - Math.min(1, p)} strokeLinecap="round" filter="url(#dsh2)" />;
};

export const Pin: React.FC<{ x: number; y: number; color?: string; s?: number }> = ({ x, y, color = RED, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={8} cy={11} rx={10} ry={5} fill="rgba(0,0,0,.45)" />
    <circle r={11} fill={color} />
    <circle r={4} cx={-3.5} cy={-3.5} fill="#fff" opacity={0.6} />
  </g>
);

// Stylised whale (DeepSeek-like mark, drawn) centred on 0,0, ~200 wide.
export const Whale: React.FC<{ color?: string; s?: number }> = ({ color = BLUE, s = 1 }) => (
  <g transform={`scale(${s})`}>
    <path d="M-100,10 C-90,-55 10,-70 60,-30 C78,-16 88,0 98,-8 C108,-16 116,-34 112,-48 C126,-34 126,-6 110,6 C96,16 80,14 74,22 C56,60 -20,78 -70,52 C-90,42 -102,28 -100,10 Z" fill={color} />
    <circle cx={-52} cy={-8} r={7} fill="#fff" />
    <path d="M-60,34 C-30,46 10,44 40,26" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={5} strokeLinecap="round" />
  </g>
);

// A "dealt" document: slides in from the right with a spin at `inAt`, out to the left at `outAt`.
export const dealt = (t: number, inAt: number, outAt: number, rot = 0, from: [number, number] = [1300, 160], to: [number, number] = [-1350, 220]) => {
  const ki = sm((t - inAt) / 0.5), ko = sm((t - outAt) / 0.5);
  const x = lerp(from[0], 0, ease(ki)) + lerp(0, to[0], ko * ko);
  const y = lerp(from[1], 0, ease(ki)) + lerp(0, to[1], ko * ko);
  const r = lerp(14, rot, ki) + lerp(0, -18, ko);
  return { x, y, r, vis: t >= inAt - 0.02 && ko < 1 };
};
