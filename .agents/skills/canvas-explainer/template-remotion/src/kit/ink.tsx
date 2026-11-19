// Marker-on-black primitives (reusable kit). Everything is a pure function of t (output seconds).
// Stroke = SVG pathLength=1 dash reveal; Write = Ink Free letters written on one by one; Pop = spring pop;
// ellipseD/rectD/arrowD/checkD/crossD = hand-drawn path builders; Bottle/Tag = example props from the drug film.
import React from "react";
import { Easing, random } from "remotion";
import { popS, progS } from "../lib";

export const INK = "'Ink Free', 'Segoe Print', cursive";
export const MONO = "'IBM Plex Mono', Consolas, monospace";
export const SANS = "'Segoe UI', Arial, sans-serif";
export const COL = {
  bg: "#07070A", white: "#F4F4EF", yellow: "#FFD84D", cyan: "#4FD8FF", pink: "#FF6FB5", green: "#6BFF8F", red: "#FF4D4D",
  grey: "#9A9CA6", dim: "#5B5E68",
};

const drawEase = Easing.bezier(0.45, 0.05, 0.55, 0.95);
const lin = (x: number) => x;
export const drawP = (t: number, at: number, dur: number) => progS(t, at, dur, drawEase);

// Rough marker filter (feTurbulence + feDisplacementMap), so every SVG stroke and letter under it looks hand-inked.
// `boil` = frames per noise-seed step. The first film (v1) used boil 4, so the ink "boiled" like hand-drawn
// animation; Madhav found the v1 motion too busy, and v2+ ship a STATIC seed (boil 0, the default). Turn it on only
// if he asks for a livelier, hand-animated feel.
export const RoughDefs: React.FC<{ fr: number; id?: string; scale?: number; boil?: number }> = ({ fr, id = "rough", scale = 4.5, boil = 0 }) => (
  <defs>
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={3 + (boil > 0 ? Math.floor(fr / boil) : 0)} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={scale} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
);

type SP = { t: number; d: string; at: number; dur?: number; c?: string; w?: number; op?: number; fill?: string; fillOp?: number };
// A marker stroke that draws itself from start to end over [at, at+dur].
export const Stroke: React.FC<SP> = ({ t, d, at, dur = 0.5, c = COL.white, w = 6, op = 1, fill, fillOp = 1 }) => {
  const p = drawP(t, at, dur);
  if (p <= 0) return null;
  const fo = fill ? progS(t, at + dur * 0.8, 0.3) * fillOp : 0;
  return (
    <g opacity={op}>
      {fill && fo > 0 && <path d={d} fill={fill} fillOpacity={fo} stroke="none" />}
      <path d={d} pathLength={1} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="1 2" strokeDashoffset={1 - p} />
    </g>
  );
};

// Dashed marker line, revealed along its length with a mask.
export const DashStroke: React.FC<SP & { id: string; dash?: number }> = ({ t, d, at, dur = 0.6, c = COL.yellow, w = 6, op = 1, id, dash = 22 }) => {
  const p = drawP(t, at, dur);
  if (p <= 0) return null;
  return (
    <g opacity={op}>
      <mask id={id} maskUnits="userSpaceOnUse" x={-20000} y={-20000} width={40000} height={40000}>
        <path d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth={w * 4} strokeDasharray="1 2" strokeDashoffset={1 - p} strokeLinecap="round" />
      </mask>
      <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeDasharray={`${dash} ${dash * 0.8}`} mask={`url(#${id})`} />
    </g>
  );
};

type WP = { t: number; x: number; y: number; at: number; s: string; size?: number; c?: string; font?: string; dur?: number;
  anchor?: "start" | "middle" | "end"; weight?: number | string; rot?: number; op?: number; ls?: number; glow?: boolean };
// Handwriting: letters appear one by one at a fixed position (the unwritten rest is laid out but transparent).
export const Write: React.FC<WP> = ({ t, x, y, at, s, size = 48, c = COL.white, font = INK, dur, anchor = "start", weight = 400, rot = 0, op = 1, ls = 0, glow }) => {
  if (t < at) return null;
  const d = dur ?? Math.min(1.1, Math.max(0.22, s.length * 0.045));
  const n = Math.min(s.length, Math.ceil(progS(t, at, d, lin) * s.length));
  return (
    <text x={x} y={y} fontSize={size} fontFamily={font} fill={c} textAnchor={anchor} fontWeight={weight} opacity={op}
      letterSpacing={ls} transform={rot ? `rotate(${rot} ${x} ${y})` : undefined} style={{ whiteSpace: "pre" }}
      stroke={glow ? "#000" : undefined} strokeWidth={glow ? size * 0.16 : undefined} paintOrder="stroke" strokeLinejoin="round">
      <tspan>{s.slice(0, n)}</tspan>
      <tspan fillOpacity={0} strokeOpacity={0}>{s.slice(n)}</tspan>
    </text>
  );
};

// Spring pop around (x, y).
export const Pop: React.FC<{ t: number; at: number; x: number; y: number; damping?: number; out?: number; children: React.ReactNode }> = ({ t, at, x, y, damping = 12, out, children }) => {
  if (t < at) return null;
  let s = popS(t, at, damping);
  if (out !== undefined) s *= 1 - progS(t, out, 0.3);
  if (s <= 0.001) return null;
  return <g transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`}>{children}</g>;
};

// A hand-drawn ellipse: one loose loop that overshoots its start, like a marker circle.
export const ellipseD = (cx: number, cy: number, rx: number, ry: number, seed = 1) => {
  const N = 44, a0 = -2.2 + random(`e${seed}`) * 0.6, span = Math.PI * 2 + 0.55;
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const a = a0 + (span * i) / N;
    const k = 1 + (random(`e${seed}-${i}`) - 0.5) * 0.04 + (i / N) * 0.07;
    pts.push(`${(cx + rx * k * Math.cos(a)).toFixed(1)} ${(cy + ry * k * Math.sin(a)).toFixed(1)}`);
  }
  return "M" + pts.join(" L");
};

// A hand-drawn rectangle whose corners overshoot a little.
export const rectD = (x: number, y: number, w: number, h: number, seed = 1) => {
  const j = (i: number) => (random(`r${seed}-${i}`) - 0.5) * 10;
  return `M${x - 8 + j(0)} ${y + j(1)} L${x + w + 6} ${y + j(2)} M${x + w + j(3)} ${y - 7} L${x + w + j(4)} ${y + h + 8} M${x + w + 8} ${y + h + j(5)} L${x - 6} ${y + h + j(6)} M${x + j(7)} ${y + h + 6} L${x + j(8)} ${y - 9}`;
};

// A curved arrow from a to b (bend = sideways offset of the control point). Returns body + head paths.
export const arrowD = (x1: number, y1: number, x2: number, y2: number, bend = 0, head = 26) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / L) * bend, cy = my + (dx / L) * bend;
  const a = Math.atan2(y2 - cy, x2 - cx);
  const h1 = `${x2 - head * Math.cos(a - 0.45)} ${y2 - head * Math.sin(a - 0.45)}`;
  const h2 = `${x2 - head * Math.cos(a + 0.45)} ${y2 - head * Math.sin(a + 0.45)}`;
  return { body: `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`, head: `M${h1} L${x2} ${y2} L${h2}` };
};

export const Arrow: React.FC<{ t: number; at: number; dur?: number; x1: number; y1: number; x2: number; y2: number; bend?: number; c?: string; w?: number; head?: number; op?: number }> = ({ t, at, dur = 0.5, x1, y1, x2, y2, bend = 0, c = COL.red, w = 7, head = 28, op = 1 }) => {
  const a = arrowD(x1, y1, x2, y2, bend, head);
  return (
    <g opacity={op}>
      <Stroke t={t} d={a.body} at={at} dur={dur} c={c} w={w} />
      <Stroke t={t} d={a.head} at={at + dur * 0.92} dur={0.18} c={c} w={w} />
    </g>
  );
};

// A green tick.
export const checkD = (x: number, y: number, s = 1) => `M${x - 40 * s} ${y} L${x - 10 * s} ${y + 32 * s} L${x + 50 * s} ${y - 42 * s}`;
// A red X.
export const crossD = (x: number, y: number, s = 1) => `M${x - 22 * s} ${y - 22 * s} L${x + 22 * s} ${y + 22 * s} M${x + 22 * s} ${y - 22 * s} L${x - 22 * s} ${y + 22 * s}`;

// A medicine bottle (body + cap + label band), drawn around its bottom-centre (x, y), height h.
export const bottleD = (x: number, y: number, h: number) => {
  const w = h * 0.62, cw = w * 0.7, ch = h * 0.2, top = y - h;
  return {
    body: `M${x - w / 2} ${top + ch + 10} Q${x - w / 2} ${top + ch} ${x - w / 2 + 14} ${top + ch} L${x + w / 2 - 14} ${top + ch} Q${x + w / 2} ${top + ch} ${x + w / 2} ${top + ch + 10} L${x + w / 2} ${y - 10} Q${x + w / 2} ${y} ${x + w / 2 - 12} ${y} L${x - w / 2 + 12} ${y} Q${x - w / 2} ${y} ${x - w / 2} ${y - 10} Z`,
    cap: `M${x - cw / 2} ${top + ch} L${x - cw / 2} ${top + 6} Q${x - cw / 2} ${top} ${x - cw / 2 + 8} ${top} L${x + cw / 2 - 8} ${top} Q${x + cw / 2} ${top} ${x + cw / 2} ${top + 6} L${x + cw / 2} ${top + ch} Z`,
    label: `M${x - w / 2 + 6} ${top + ch + h * 0.22} L${x + w / 2 - 6} ${top + ch + h * 0.22} L${x + w / 2 - 6} ${top + ch + h * 0.55} L${x - w / 2 + 6} ${top + ch + h * 0.55} Z`,
    labelY: top + ch + h * 0.385, w,
  };
};

export const Bottle: React.FC<{ t: number; at: number; x: number; y: number; h: number; c?: string; label?: string; labelC?: string }> = ({ t, at, x, y, h, c = COL.white, label, labelC = COL.white }) => {
  const b = bottleD(x, y, h);
  return (
    <Pop t={t} at={at} x={x} y={y - h / 2}>
      <Stroke t={t} d={b.body} at={at} dur={0.35} c={c} w={6} fill="#14151b" />
      <Stroke t={t} d={b.cap} at={at + 0.1} dur={0.25} c={c} w={6} fill={COL.pink} fillOp={0.85} />
      <Stroke t={t} d={b.label} at={at + 0.2} dur={0.25} c={c} w={4} />
      {label && <Write t={t} x={x} y={b.labelY + h * 0.06} at={at + 0.3} s={label} size={Math.max(34, h * 0.15)} c={labelC} font={MONO} anchor="middle" weight={700} />}
    </Pop>
  );
};

// A price tag pointing left, hole + string; text inside.
export const Tag: React.FC<{ t: number; at: number; x: number; y: number; s: string; c?: string; rot?: number; w?: number; size?: number }> = ({ t, at, x, y, s, c = COL.red, rot = -8, w = 170, size = 54 }) => {
  const h = 78;
  const d = `M${x} ${y} L${x + 34} ${y - h / 2} L${x + w} ${y - h / 2} L${x + w} ${y + h / 2} L${x + 34} ${y + h / 2} Z`;
  return (
    <Pop t={t} at={at} x={x + w / 2} y={y}>
      <g transform={`rotate(${rot} ${x} ${y})`}>
        <Stroke t={t} d={d} at={at} dur={0.3} c={c} w={6} fill="#14151b" />
        <circle cx={x + 26} cy={y} r={7} fill="none" stroke={c} strokeWidth={4} />
        <Write t={t} x={x + 34 + (w - 34) / 2} y={y + size * 0.35} at={at + 0.15} s={s} size={size} c={c} anchor="middle" weight={700} dur={0.3} />
      </g>
    </Pop>
  );
};
