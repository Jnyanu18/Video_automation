import React from "react";
import { random } from "remotion";
import { loadFont } from "@remotion/google-fonts/Nunito";
import { loadFont as loadCond } from "@remotion/google-fonts/BarlowCondensed";

export const { fontFamily: NUNITO } = loadFont("normal", { weights: ["700", "800", "900"] });
export const { fontFamily: COND } = loadCond("normal", { weights: ["700", "800"] });

// Art bible palette. Indigo night world; gold = the coin / the answer and the one hot light;
// teal = the quantum mechanism (waves, links, cold); coral = the myth / wrong; rose for world props.
export const C = {
  ink: "#120A33",
  wallTop: "#1E1550",
  wallBot: "#3A2779",
  sky1: "#0B1F4E",
  sky2: "#1F4C8E",
  frame: "#22184F",
  frameHi: "#5442A8",
  table: "#4B2F86",
  tableHi: "#6A4AB0",
  tableDark: "#2D1B5C",
  gold: "#FFCB57",
  goldHi: "#FFE38A",
  goldMid: "#F2A23A",
  goldDeep: "#C46F1D",
  edge: "#A95817",
  cream: "#FFF4D6",
  teal: "#35C3B4",
  tealHi: "#8FF3E3",
  tealDeep: "#1D7F78",
  coral: "#FF6B5A",
  coralDeep: "#C9413A",
  rose: "#F2678E",
  lilac: "#CFC4F5",
  white: "#FFF8EC",
};

export const Star: React.FC<{ x: number; y: number; s: number; o?: number; c?: string }> = ({ x, y, s, o = 1, c = C.cream }) => (
  <path d={`M${x},${y - s} Q${x},${y} ${x + s},${y} Q${x},${y} ${x},${y + s} Q${x},${y} ${x - s},${y} Q${x},${y} ${x},${y - s}Z`} fill={c} opacity={o} />
);

// Seeded starfield in a box. Twinkles from the frame number.
export const Stars: React.FC<{ seed: string; n: number; x: number; y: number; w: number; h: number; fr: number; big?: number }> = ({ seed, n, x, y, w, h, fr, big = 9 }) => (
  <g>
    {Array.from({ length: n }, (_, i) => {
      const sx = x + random(`${seed}x${i}`) * w, sy = y + random(`${seed}y${i}`) * h;
      const s = 1.6 + random(`${seed}s${i}`) * (i % big === 0 ? 10 : 3.5);
      const o = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(fr * (0.05 + random(`${seed}t${i}`) * 0.08) + i));
      return s > 5 ? <Star key={i} x={sx} y={sy} s={s} o={o} /> : <circle key={i} cx={sx} cy={sy} r={s * 0.6} fill={C.cream} opacity={o} />;
    })}
  </g>
);

export const Leaf: React.FC<{ x: number; y: number; a: number; s: number; c: string; vein?: string }> = ({ x, y, a, s, c, vein = "#000" }) => (
  <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
    <path d="M0,0 C40,-30 60,-110 0,-190 C-60,-110 -40,-30 0,0Z" fill={c} />
    <path d="M0,-6 L0,-170" stroke={vein} strokeWidth={4} opacity={0.25} strokeLinecap="round" />
  </g>
);

// Shared gradients and filters. Mount once per <svg>.
export const Defs: React.FC = () => (
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={C.wallTop} />
      <stop offset="1" stopColor={C.wallBot} />
    </linearGradient>
    <radialGradient id="sky" cx="0.5" cy="0.35" r="0.75">
      <stop offset="0" stopColor={C.sky2} />
      <stop offset="1" stopColor={C.sky1} />
    </radialGradient>
    <radialGradient id="glowGold" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#FFD574" stopOpacity={0.7} />
      <stop offset="0.35" stopColor="#FFB547" stopOpacity={0.28} />
      <stop offset="1" stopColor="#FF9F40" stopOpacity={0} />
    </radialGradient>
    <radialGradient id="glowTeal" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#8FF3E3" stopOpacity={0.65} />
      <stop offset="0.4" stopColor="#35C3B4" stopOpacity={0.25} />
      <stop offset="1" stopColor="#1D7F78" stopOpacity={0} />
    </radialGradient>
    <radialGradient id="glowCoral" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#FF8A6A" stopOpacity={0.7} />
      <stop offset="0.4" stopColor="#FF6B5A" stopOpacity={0.25} />
      <stop offset="1" stopColor="#C9413A" stopOpacity={0} />
    </radialGradient>
    <radialGradient id="glowCold" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#E6FBFF" stopOpacity={0.75} />
      <stop offset="0.35" stopColor="#9EDFF5" stopOpacity={0.3} />
      <stop offset="1" stopColor="#4A7BD0" stopOpacity={0} />
    </radialGradient>
    <radialGradient id="poolGold" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#FFC45A" stopOpacity={0.75} />
      <stop offset="0.45" stopColor="#E98A55" stopOpacity={0.3} />
      <stop offset="1" stopColor="#B05A8A" stopOpacity={0} />
    </radialGradient>
    <linearGradient id="faceLit" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={C.goldHi} />
      <stop offset="0.5" stopColor={C.gold} />
      <stop offset="1" stopColor={C.goldMid} />
    </linearGradient>
    <linearGradient id="faceFlat" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={C.goldMid} />
      <stop offset="0.55" stopColor={C.gold} />
      <stop offset="1" stopColor={C.goldHi} />
    </linearGradient>
    <linearGradient id="rimLight" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#FFB547" stopOpacity={0} />
      <stop offset="1" stopColor="#FFC965" stopOpacity={0.7} />
    </linearGradient>
    <linearGradient id="tableTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={C.tableHi} />
      <stop offset="0.5" stopColor={C.table} />
      <stop offset="1" stopColor="#3A2370" />
    </linearGradient>
    <linearGradient id="apron" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#3A2472" />
      <stop offset="1" stopColor="#24164F" />
    </linearGradient>
    <linearGradient id="captionShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#1A0E3E" stopOpacity={0} />
      <stop offset="0.4" stopColor="#1A0E3E" stopOpacity={0.4} />
      <stop offset="1" stopColor="#1A0E3E" stopOpacity={0.5} />
    </linearGradient>
    <linearGradient id="space" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#0A0B2E" />
      <stop offset="0.55" stopColor="#1B1052" />
      <stop offset="1" stopColor="#2A1460" />
    </linearGradient>
    <filter id="soft4" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" /></filter>
    <filter id="soft8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" /></filter>
    <filter id="soft14" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14" /></filter>
    <filter id="soft30" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30" /></filter>
  </defs>
);
