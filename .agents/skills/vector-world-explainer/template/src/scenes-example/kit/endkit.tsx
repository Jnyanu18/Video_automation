import React from "react";
import { random } from "remotion";
import { Camera, type Key, type Offset } from "../../kit/camera";
import { C, Defs } from "../../kit/palette";
import { ChipDefs, LaptopDefs } from "../../kit/props";
import { PhoneDefs } from "../../kit/objects";
import { Face } from "../../kit/coin";
import { MAZE, MAZE_H, MAZE_W, MZ, cellXY, pathD } from "./maze";
import { GlobeDefs } from "./globe2d";

// Shared kit for the ending / cta / tease acts.

// A Stage (as scenes/stage.tsx) that also takes impact shakes and can be transparent.
export const EStage: React.FC<{ fr: number; keys?: Key[]; cam?: { x?: number; y?: number; zoom?: number; rot?: number }; handheld?: number; shake?: Offset[]; bg?: string | null; children: React.ReactNode }> = ({ fr, keys, cam, handheld = 0.4, shake, bg = "#1E1550", children }) => (
  <Camera fr={fr} keys={keys} cam={cam} handheld={handheld} shake={shake} background={bg ?? undefined}>
    <Defs />
    <ChipDefs />
    <LaptopDefs />
    <PhoneDefs />
    <GlobeDefs />
    {children}
  </Camera>
);

// A push-in that keeps the target gliding smoothly to frame centre (a plain log-zoom key would
// fling it off-screen mid-move). t 0..1; returns the camera.
export const aimCam = (t: number, from: { x: number; y: number; zoom: number }, target: [number, number], zoom1: number) => {
  const z = Math.exp(Math.log(from.zoom) + (Math.log(zoom1) - Math.log(from.zoom)) * t);
  const sx = (target[0] - from.x) * from.zoom * (1 - t) ** 1.3, sy = (target[1] - from.y) * from.zoom * (1 - t) ** 1.3;
  return { x: target[0] - sx / z, y: target[1] - sy / z, zoom: z };
};

// ---- The coin's face as a chip die whose circuitry is the film's maze, solution lit to the exit.
const wallPath = () => {
  const { cols, rows } = MZ, cell = MAZE_W / cols;
  let d = "";
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (c < cols - 1 && !MAZE.open[i].has(i + 1)) d += `M${(c + 1) * cell},${r * cell} V${(r + 1) * cell} `;
      if (r < rows - 1 && !MAZE.open[i].has(i + cols)) d += `M${c * cell},${(r + 1) * cell} H${(c + 1) * cell} `;
    }
  return d + `M0,0 H${(cols - 1) * cell} M${cell},${rows * cell} H${cols * cell} M0,0 V${rows * cell} M${cols * cell},0 V${rows * cell}`;
};
const WALLS = wallPath();

export const ChipMazeFace: React.FC<{ fr: number; lit: number }> = ({ fr, lit }) => {
  const s = 0.094, w = MAZE_W * s, h = MAZE_H * s;
  const [ex, ey] = cellXY(MAZE.exit);
  return (
    <g>
      <rect x={-w / 2 - 9} y={-h / 2 - 9} width={w + 18} height={h + 18} rx={4} fill="#5B3410" opacity={0.55} transform="translate(1.5 2)" />
      <rect x={-w / 2 - 9} y={-h / 2 - 9} width={w + 18} height={h + 18} rx={4} fill="#2B2470" />
      <rect x={-w / 2 - 9} y={-h / 2 - 9} width={w + 18} height={h + 18} rx={4} fill="none" stroke="#FFE38A" strokeWidth={1.2} opacity={0.6} />
      {Array.from({ length: 8 }, (_, j) => (
        <g key={j} fill="#D9D2F2">
          <rect x={-w / 2 - 7} y={-h / 2 + 6 + (j * (h - 12)) / 7 - 1.5} width={3} height={3} />
          <rect x={w / 2 + 4} y={-h / 2 + 6 + (j * (h - 12)) / 7 - 1.5} width={3} height={3} />
        </g>
      ))}
      <g transform={`translate(${-w / 2} ${-h / 2}) scale(${s})`}>
        <rect width={MAZE_W} height={MAZE_H} fill="#33206C" />
        <path d={WALLS} fill="none" stroke="#120830" strokeWidth={26} strokeLinecap="round" opacity={0.4} transform="translate(6 8)" />
        <path d={WALLS} fill="none" stroke="#9C84E6" strokeWidth={22} strokeLinecap="round" />
        <path d={pathD(MAZE.path)} fill="none" stroke={C.gold} strokeWidth={64} strokeLinecap="round" strokeLinejoin="round" opacity={0.3 * lit} />
        <path d={pathD(MAZE.path)} fill="none" stroke={C.goldHi} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={6000} strokeDashoffset={6000 * (1 - lit)} />
        <circle cx={ex} cy={ey} r={72 + 10 * Math.sin(fr * 0.2)} fill="#FFF3C4" opacity={lit} />
      </g>
    </g>
  );
};

// ---- The hero coin, face-on, turned by `th` (rad) about its vertical axis (the rim shows on one
// side), rolled by `roll` (deg). Front face = the chip-maze die; back = plain "0". `sweep` 0..1 runs
// a light band across the face. Radius R, centred (x, y).
export const BigCoin: React.FC<{ id: string; fr: number; x: number; y: number; R: number; th?: number; roll?: number; lit?: number; sweep?: number; glow?: number }> = ({ id, fr, x, y, R, th = 0.25, roll = 0, lit = 1, sweep = -1, glow = 1 }) => {
  const c = Math.cos(th), s = Math.sin(th);
  const sx = Math.max(Math.abs(c), 0.02);
  const T = R * 0.12, dx = s * T;
  const front = c >= 0;
  return (
    <g transform={`translate(${x} ${y}) rotate(${roll})`}>
      {glow > 0 && <circle r={R * 1.75} fill="url(#glowGold)" opacity={0.85 * glow} />}
      {/* rim: the far face's outline plus the band between */}
      <ellipse cx={dx} rx={R * sx} ry={R} fill={C.edge} />
      <rect x={Math.min(0, dx)} y={-R} width={Math.abs(dx)} height={2 * R} fill={C.edge} />
      <clipPath id={`bcRim${id}`}><ellipse cx={dx} rx={R * sx} ry={R} /><rect x={Math.min(0, dx)} y={-R} width={Math.abs(dx)} height={2 * R} /></clipPath>
      <g clipPath={`url(#bcRim${id})`}>
        {Array.from({ length: 36 }, (_, i) => -R + 4 + (i * 2 * R) / 36).map((yy, i) => (
          <line key={i} x1={-R} x2={R + Math.abs(dx) + 4} y1={yy} y2={yy} stroke="#7E3F0E" strokeWidth={Math.max(1.2, R * 0.012)} opacity={0.5} />
        ))}
        <rect x={dx > 0 ? R * sx * 0.2 : -R - Math.abs(dx)} y={-R} width={R + Math.abs(dx)} height={2 * R} fill="url(#rimLight)" opacity={0.8} />
      </g>
      <g transform={`scale(${(sx * R) / 100} ${R / 100})`}>
        <Face face={front ? 1 : 0} light={[1, 0.6]}>{front ? <ChipMazeFace fr={fr} lit={lit} /> : undefined}</Face>
        {sweep >= 0 && sweep <= 1 && (
          <g>
            <clipPath id={`bcSw${id}`}><circle r={100} /></clipPath>
            <g clipPath={`url(#bcSw${id})`}>
              <rect x={-170 + sweep * 340} y={-140} width={34} height={280} fill="#FFFBEA" opacity={0.45} transform={`rotate(24 ${-153 + sweep * 340} 0)`} />
              <rect x={-130 + sweep * 340} y={-140} width={10} height={280} fill="#FFFBEA" opacity={0.35} transform={`rotate(24 ${-125 + sweep * 340} 0)`} />
            </g>
          </g>
        )}
      </g>
      {/* rim highlight on the lit edge */}
      <path d={`M${R * sx * 0.15},${-R * 0.99} A${R * sx} ${R} 0 0 1 ${R * sx * 0.98},${R * 0.2}`} fill="none" stroke="#FFF1C2" strokeWidth={Math.max(2, R * 0.02)} strokeLinecap="round" opacity={0.7} />
    </g>
  );
};

// ---- A big teal "not equal" sign as a solid object (two bars and a slash), centred at 0,0.
export const NeqSign: React.FC<{ s?: number; glow?: number }> = ({ s = 1, glow = 1 }) => {
  const bar = (y: number) => (
    <g key={y}>
      <rect x={-78} y={y - 15} width={156} height={30} rx={15} fill={C.tealDeep} transform="translate(0 7)" />
      <rect x={-78} y={y - 15} width={156} height={30} rx={15} fill={C.teal} />
      <rect x={-66} y={y - 11} width={132} height={7} rx={3.5} fill={C.tealHi} opacity={0.75} />
    </g>
  );
  return (
    <g transform={`scale(${s})`}>
      <circle r={260} fill="url(#glowTeal)" opacity={0.8 * glow} />
      {/* cast shadow on the wall */}
      <g transform="translate(16 22)" opacity={0.35} fill="#0E0628">
        <rect x={-78} y={-49} width={156} height={30} rx={15} />
        <rect x={-78} y={19} width={156} height={30} rx={15} />
        <rect x={-15} y={-100} width={30} height={200} rx={15} transform="rotate(28)" />
      </g>
      {bar(-34)}
      {bar(34)}
      <g transform="rotate(28)">
        <rect x={-15} y={-100} width={30} height={200} rx={15} fill={C.tealDeep} transform="translate(6 5)" />
        <rect x={-15} y={-100} width={30} height={200} rx={15} fill={C.teal} />
        <rect x={-10} y={-90} width={7} height={170} rx={3.5} fill={C.tealHi} opacity={0.75} />
      </g>
    </g>
  );
};

// ---- A coral "faster laptop" ghost: a laptop silhouette with speed lines trailing left.
export const GhostLaptop: React.FC<{ fr: number; s?: number; speed?: number }> = ({ fr, s = 1, speed = 1 }) => (
  <g transform={`scale(${s})`}>
    {Array.from({ length: 7 }, (_, i) => {
      const y = -380 + i * 95 + (i % 2) * 20;
      const L = (260 + random(`gsl${i}`) * 420) * speed;
      const o = (fr * 40 + i * 70) % 160;
      return <rect key={i} x={-420 - L - o * 0.3} y={y} width={L} height={14} rx={7} fill={C.coral} opacity={0.55} />;
    })}
    <g transform="skewX(-10)">
      <path d="M-370,0 L-350,-470 L350,-470 L370,0Z" fill={C.coralDeep} opacity={0.85} />
      <path d="M-342,-16 L-324,-446 L324,-446 L342,-16Z" fill={C.coral} opacity={0.55} />
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={-280 + (i % 2) * 40} y={-400 + i * 62} width={260 + random(`gl${i}`) * 200} height={16} rx={8} fill="#FFD2C8" opacity={0.6} />)}
      <path d="M-380,0 L380,0 L430,250 L-430,250Z" fill={C.coral} opacity={0.9} />
      <path d="M-430,250 L430,250 L426,264 L-426,264Z" fill={C.coralDeep} />
      <path d="M-100,170 L100,170 L108,230 L-108,230Z" fill="#FFB3A6" opacity={0.7} />
    </g>
  </g>
);

// ---- A stack of three books, (x, y) = centre of the bottom book's base. Height 3*h.
export const BookStack: React.FC<{ x: number; y: number; h?: number }> = ({ x, y, h = 46 }) => {
  const books = [
    { w: 470, c: "#C9604E", hi: "#E07A62", dx: 0 },
    { w: 430, c: "#3A9C93", hi: "#5FD3C3", dx: 14 },
    { w: 450, c: "#6F5FD0", hi: "#9A8BF0", dx: -10 },
  ];
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={20} cy={4} rx={280} ry={22} fill="#120830" opacity={0.45} filter="url(#soft8)" />
      {books.map((b, i) => {
        const top = -(i + 1) * h;
        return (
          <g key={i} transform={`translate(${b.dx} 0)`}>
            <rect x={-b.w / 2} y={top} width={b.w} height={h} rx={8} fill={b.c} />
            <rect x={-b.w / 2 + 10} y={top + 6} width={b.w - 40} height={h - 12} rx={4} fill="#F4EEDD" opacity={0.85} />
            <rect x={b.w / 2 - 30} y={top} width={30} height={h} rx={6} fill={b.hi} />
            <rect x={-b.w / 2} y={top} width={b.w} height={5} rx={2.5} fill={b.hi} opacity={0.7} />
          </g>
        );
      })}
    </g>
  );
};

// The coin's slow life (a slight turn and roll) once it is the big CTA coin.
export const coinTurn = (fr: number) => 0.3 + 0.13 * Math.sin(fr * 0.045);
export const coinRoll = (fr: number) => -3 + 1.6 * Math.sin(fr * 0.031 + 1);
