import React from "react";
import { random } from "remotion";
import { C, Leaf, Star, Stars } from "./palette";

// The observatory-study at night, front view, in 1080x1920 world coords.
// Wall 0..1040, porthole window centred (540, 600), table top 1040..1690, table apron 1690..1830, floor below.
// `glow` is the hero light: it washes the wall, window frame and table around (x, y).
export type Glow = { x: number; y: number; r?: number; kind?: "Gold" | "Teal" | "Cold" | "Coral"; k?: number };

export const WIN = { x: 540, y: 600, r: 340 };

export const NightSky: React.FC<{ fr: number; planet?: boolean; moon?: React.ReactNode }> = ({ fr, planet = true, moon }) => (
  <g>
    <rect x={WIN.x - 400} y={WIN.y - 400} width={800} height={800} fill="url(#sky)" />
    <Stars seed="win" n={80} x={WIN.x - 360} y={WIN.y - 360} w={720} h={720} fr={fr} />
    {planet && (
      <g transform={`translate(${330 + Math.sin(fr * 0.004) * 6} ${520})`}>
        <ellipse rx={150} ry={36} fill="none" stroke="#F7C06A" strokeWidth={14} opacity={0.55} transform="rotate(-18)" />
        <circle r={92} fill="#F07A5C" />
        <path d="M-92,-10 Q0,-40 92,-18 L92,6 Q0,-14 -90,18Z" fill="#D85E4E" />
        <path d="M-80,40 Q0,20 84,36 L76,56 Q0,42 -70,60Z" fill="#D85E4E" />
        <circle r={92} fill="none" stroke="#FFB08A" strokeWidth={6} opacity={0.6} strokeDasharray="160 600" strokeDashoffset={-40} />
        <path d="M-150,10 A150 36 0 0 0 150,-10" transform="rotate(-18)" fill="none" stroke="#FFD58A" strokeWidth={14} opacity={0.9} />
      </g>
    )}
    {moon ?? (
      <g>
        <circle cx={760} cy={430} r={26} fill="#C9D4FF" opacity={0.85} />
        <circle cx={752} cy={424} r={26} fill={C.sky2} opacity={0.5} />
      </g>
    )}
    <path d="M180,860 Q300,780 420,840 Q540,770 660,830 Q780,770 900,820 L900,960 L180,960Z" fill="#2B3F86" />
    <path d="M180,910 Q320,850 460,900 Q600,850 740,895 Q840,860 900,880 L900,960 L180,960Z" fill="#26306E" />
  </g>
);

const BOOKS = [
  { w: 34, h: 150, c: C.rose }, { w: 26, h: 128, c: "#F4B860" }, { w: 40, h: 160, c: C.teal }, { w: 22, h: 120, c: "#7A64E0" }, { w: 36, h: 145, c: "#E3E0F5" },
];

export const Wall: React.FC<{ fr: number; sky?: React.ReactNode; frost?: number }> = ({ fr, sky, frost = 0 }) => (
  <g>
    <rect x={-400} y={-300} width={1880} height={1400} fill="url(#wall)" />
    {/* panelling rail */}
    {Array.from({ length: 9 }, (_, i) => (
      <rect key={i} x={-400 + i * 210} y={975} width={186} height={62} rx={14} fill="#43308A" opacity={0.5} />
    ))}
    <rect x={-400} y={958} width={1880} height={8} fill="#4C3896" opacity={0.6} />
    <clipPath id="winClip"><circle cx={WIN.x} cy={WIN.y} r={WIN.r} /></clipPath>
    <g clipPath="url(#winClip)">
      {sky ?? <NightSky fr={fr} />}
      {frost > 0 && <Frost amount={frost} />}
    </g>
    <circle cx={WIN.x} cy={WIN.y} r={WIN.r + 22} fill="none" stroke={C.frame} strokeWidth={46} />
    <circle cx={WIN.x} cy={WIN.y} r={WIN.r} fill="none" stroke={C.frameHi} strokeWidth={5} opacity={0.7} />
    <circle cx={WIN.x} cy={WIN.y} r={WIN.r + 44} fill="none" stroke="#4A3896" strokeWidth={4} opacity={0.6} />
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      return <circle key={i} cx={WIN.x + Math.cos(a) * (WIN.r + 22)} cy={WIN.y + Math.sin(a) * (WIN.r + 22)} r={8} fill="#4E3C9C" />;
    })}
    {/* shelf, right */}
    <rect x={858} y={330} width={300} height={18} rx={9} fill="#2A1C5E" />
    <rect x={858} y={820} width={300} height={18} rx={9} fill="#2A1C5E" />
    {BOOKS.map((b, i) => {
      const x = 880 + BOOKS.slice(0, i).reduce((s, q) => s + q.w + 6, 0);
      return <rect key={i} x={x} y={330 - b.h} width={b.w} height={b.h} rx={6} fill={b.c} opacity={0.82} />;
    })}
    <rect x={1050} y={190} width={30} height={140} rx={6} fill="#F4B860" opacity={0.6} transform="rotate(12 1065 330)" />
    {/* desk globe + jar on the lower shelf */}
    <g transform={`rotate(${Math.sin(fr * 0.01) * 4} 940 760)`}>
      <circle cx={940} cy={760} r={46} fill={C.teal} opacity={0.85} />
      <path d="M904,740 Q930,720 950,748 Q970,770 980,748" fill="none" stroke="#9EF0E2" strokeWidth={8} strokeLinecap="round" opacity={0.7} />
    </g>
    <rect x={930} y={804} width={20} height={16} fill="#2A1C5E" />
    <rect x={1006} y={720} width={64} height={100} rx={14} fill="#8C7CE8" opacity={0.45} />
    <rect x={1016} y={710} width={44} height={16} rx={6} fill="#6F5FD0" />
    {/* left wall: a framed star chart */}
    <g transform="translate(-10 230) rotate(-3)">
      <rect x={0} y={0} width={150} height={190} rx={8} fill="#2A1C5E" />
      <rect x={12} y={12} width={126} height={166} rx={4} fill="#1A2560" />
      <path d="M30,140 L60,90 L95,110 L120,50" fill="none" stroke={C.lilac} strokeWidth={2} opacity={0.7} />
      {[[30, 140], [60, 90], [95, 110], [120, 50]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4} fill={C.cream} />)}
    </g>
  </g>
);

// A plant behind the table edge, left. Sways gently.
export const Plant: React.FC<{ fr: number; x?: number; y?: number }> = ({ fr, x = 120, y = 1060 }) => {
  const s = Math.sin(fr * 0.035) * 2.5;
  return (
    <g>
      <Leaf x={x} y={y} a={-28 + s} s={2.0} c={C.tealDeep} />
      <Leaf x={x - 10} y={y} a={8 + s * 0.6} s={2.5} c={C.teal} />
      <Leaf x={x + 10} y={y} a={36 + s} s={1.9} c="#2AA393" />
      <Leaf x={x - 30} y={y} a={-55 + s * 0.8} s={1.6} c={C.teal} />
      <Leaf x={x + 30} y={y} a={62 + s} s={1.3} c={C.tealDeep} />
      <path d={`M${x - 70},${y} L${x + 70},${y} L${x + 55},${y + 40} L${x - 55},${y + 40}Z`} fill="#C9604E" />
      <rect x={x - 76} y={y - 8} width={152} height={16} rx={6} fill="#E07A62" />
    </g>
  );
};

// Table top, its front apron (drawers, beading, brass pulls) and the floor. The apron is the
// calm bottom band for the Instagram UI: low contrast, but real furniture, not a flat strip.
export const Table: React.FC<{ fr: number; glow?: Glow; top?: number }> = ({ glow, top = 1040 }) => {
  const apron = 1690;
  return (
    <g>
      <rect x={-400} y={top} width={1880} height={apron - top} fill="url(#tableTop)" />
      <rect x={-400} y={top - 4} width={1880} height={10} fill={C.tableHi} opacity={0.9} />
      {[-500, -260, -60, 140, 340, 540, 780, 1040, 1300, 1600].map((x, i) => (
        <path key={i} d={`M${540 + (x - 540) * 0.45},${top + 6} L${x},${apron}`} stroke="#3B2373" strokeWidth={4} opacity={0.45} />
      ))}
      {/* knots in the grain */}
      <ellipse cx={210} cy={1560} rx={34} ry={9} fill="none" stroke="#3B2373" strokeWidth={3} opacity={0.5} />
      <ellipse cx={860} cy={1180} rx={22} ry={6} fill="none" stroke="#3B2373" strokeWidth={3} opacity={0.5} />
      {glow && <ellipse cx={glow.x} cy={Math.max(top + 90, glow.y + 120)} rx={(glow.r ?? 560) * 0.85} ry={(glow.r ?? 560) * 0.28} fill={!glow.kind || glow.kind === "Gold" ? "url(#poolGold)" : `url(#glow${glow.kind})`} opacity={glow.k ?? 1} />}
      {/* rounded front edge of the top */}
      <rect x={-400} y={apron - 14} width={1880} height={16} rx={8} fill="#7A5BC4" />
      <rect x={-400} y={apron - 14} width={1880} height={5} fill="#A88AE8" opacity={0.5} />
      {/* apron with two drawers */}
      <rect x={-400} y={apron + 2} width={1880} height={140} fill="url(#apron)" />
      {[[40, 470], [570, 1000]].map(([a, b], i) => (
        <g key={i}>
          <rect x={a} y={apron + 22} width={b - a} height={96} rx={10} fill="#2E1C60" />
          <rect x={a + 6} y={apron + 26} width={b - a - 12} height={4} rx={2} fill="#5A44A8" opacity={0.5} />
          <ellipse cx={(a + b) / 2} cy={apron + 70} rx={34} ry={9} fill="#B07A2E" />
          <ellipse cx={(a + b) / 2} cy={apron + 67} rx={28} ry={5} fill="#E9B45C" opacity={0.8} />
        </g>
      ))}
      {/* floor + rug edge */}
      <rect x={-400} y={apron + 142} width={1880} height={300} fill="#150B33" />
      <path d={`M-400,${apron + 190} Q540,${apron + 165} 1480,${apron + 190} L1480,${apron + 400} L-400,${apron + 400}Z`} fill="#22124A" />
      {Array.from({ length: 30 }, (_, i) => (
        <rect key={i} x={-60 + i * 42} y={apron + 186} width={14} height={14} rx={3} fill="#3A1F6E" opacity={0.6} />
      ))}
    </g>
  );
};

// Hero light washing the wall (call between Wall and Table).
export const WallGlow: React.FC<{ glow: Glow }> = ({ glow }) => (
  <circle cx={glow.x} cy={glow.y} r={glow.r ?? 560} fill={`url(#glow${glow.kind ?? "Gold"})`} opacity={glow.k ?? 1} />
);

// Frost creeping in from the window rim (0..1).
export const Frost: React.FC<{ amount: number }> = ({ amount }) => (
  <g opacity={Math.min(1, amount * 1.2)}>
    <circle cx={WIN.x} cy={WIN.y} r={WIN.r} fill="none" stroke="#DDF6FF" strokeWidth={140 * amount} opacity={0.35} filter="url(#soft14)" />
    {Array.from({ length: 26 }, (_, i) => {
      const a = (i / 26) * Math.PI * 2 + random(`fa${i}`) * 0.2;
      const L = (60 + random(`fl${i}`) * 110) * amount;
      const x0 = WIN.x + Math.cos(a) * WIN.r, y0 = WIN.y + Math.sin(a) * WIN.r;
      const x1 = WIN.x + Math.cos(a) * (WIN.r - L), y1 = WIN.y + Math.sin(a) * (WIN.r - L);
      const nx = -Math.sin(a), ny = Math.cos(a);
      return (
        <g key={i} stroke="#EFFBFF" strokeWidth={3} strokeLinecap="round" opacity={0.8}>
          <line x1={x0} y1={y0} x2={x1} y2={y1} />
          {[0.35, 0.6, 0.8].map((t, j) => {
            const px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t, b = L * 0.22 * (1 - t);
            return (
              <g key={j}>
                <line x1={px} y1={py} x2={px + (nx - Math.cos(a)) * b} y2={py + (ny - Math.sin(a)) * b} />
                <line x1={px} y1={py} x2={px + (-nx - Math.cos(a)) * b} y2={py + (-ny - Math.sin(a)) * b} />
              </g>
            );
          })}
        </g>
      );
    })}
  </g>
);

// Sparkles hovering around a light source.
export const Sparkles: React.FC<{ fr: number; x: number; y: number; r: number; n?: number; seed?: string; c?: string }> = ({ fr, x, y, r, n = 10, seed = "sp", c = C.cream }) => (
  <g>
    {Array.from({ length: n }, (_, i) => {
      const a = random(`${seed}a${i}`) * Math.PI * 2 + fr * 0.01 * (i % 2 ? 1 : -1);
      const d = r * (0.5 + random(`${seed}d${i}`) * 0.6);
      const o = 0.3 + 0.7 * Math.abs(Math.sin(fr * 0.07 + i * 1.7));
      return <Star key={i} x={x + Math.cos(a) * d} y={y + Math.sin(a) * d * 0.8} s={5 + random(`${seed}s${i}`) * 9} o={o} c={c} />;
    })}
  </g>
);

// Foreground mug, out of focus, right edge.
export const Mug: React.FC<{ x?: number; y?: number }> = ({ x = 930, y = 1170 }) => (
  <g filter="url(#soft8)" opacity={0.95}>
    <rect x={x} y={y} width={200} height={260} rx={30} fill="#23766F" />
    <ellipse cx={x + 100} cy={y + 2} rx={100} ry={26} fill="#3AB0A3" />
    <path d={`M${x + 8},${y + 60} C${x - 70},${y + 60} ${x - 70},${y + 190} ${x + 8},${y + 190}`} fill="none" stroke="#23766F" strokeWidth={30} />
    <ellipse cx={x + 100} cy={y + 6} rx={84} ry={16} fill="#123F3B" />
    <rect x={x + 20} y={y + 30} width={18} height={200} rx={9} fill="#5FD3C3" opacity={0.5} />
  </g>
);

export const NearLeaf: React.FC<{ x?: number; y?: number; a?: number; s?: number }> = ({ x = -20, y = 430, a = 130, s = 2.6 }) => (
  <g filter="url(#soft14)" opacity={0.9}>
    <Leaf x={x} y={y} a={a} s={s} c="#155E5A" />
  </g>
);
