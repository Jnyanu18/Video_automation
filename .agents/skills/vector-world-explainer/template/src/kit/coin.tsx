import React from "react";
import { C } from "./palette";

// The hero coin. Heads = 1, tails = 0. Faces are drawn in a local unit space (radius 100) and
// mapped by a transform, so the numeral, bead ring and rim always foreshorten together.

// Hand-drawn numerals (no font): a clean "1" with a flag and no slab base, and an oval "0".
const ONE = "M-4,-66 L22,-66 L22,62 L-8,62 L-8,-24 L-30,-12 L-38,-36 Z";
const Glyph: React.FC<{ face: 0 | 1; depth: [number, number] }> = ({ face, depth }) => {
  const [dx, dy] = depth;
  const shape = (fill: string, ox: number, oy: number, op = 1) =>
    face === 1 ? (
      <path d={ONE} transform={`translate(${ox} ${oy})`} fill={fill} stroke={fill} strokeWidth={8} strokeLinejoin="round" opacity={op} />
    ) : (
      <ellipse cx={ox} cy={oy} rx={30} ry={52} fill="none" stroke={fill} strokeWidth={24} opacity={op} />
    );
  return (
    <g>
      {shape("#FFF0B8", -dx * 1.2, -dy * 1.2, 0.85)}
      {shape(C.edge, dx, dy, 0.9)}
      {shape(C.goldDeep, 0, 0)}
    </g>
  );
};

export const Face: React.FC<{ face: 0 | 1; fill?: string; light?: [number, number]; dim?: number; children?: React.ReactNode }> = ({ face, fill = "url(#faceLit)", light = [1, 1], dim = 0, children }) => (
  <g>
    <circle r={100} fill={fill} />
    <circle r={86} fill="none" stroke={C.goldDeep} strokeWidth={3.5} opacity={0.7} />
    <circle r={92} fill="none" stroke="#FFF0B8" strokeWidth={2} opacity={0.6} />
    {Array.from({ length: 44 }, (_, i) => {
      const a = (i / 44) * Math.PI * 2;
      return <circle key={i} cx={Math.cos(a) * 79} cy={Math.sin(a) * 79} r={2.4} fill={C.goldDeep} opacity={0.75} />;
    })}
    {children ?? <Glyph face={face} depth={[light[0] * 2.5, light[1] * 2.5]} />}
    {/* broad specular sheen */}
    <path d="M-70,-40 Q-40,-80 10,-86" fill="none" stroke="#FFFBEA" strokeWidth={9} strokeLinecap="round" opacity={0.55} />
    {dim > 0 && <circle r={100} fill="#1A0E3E" opacity={dim} />}
  </g>
);

// A coin lying on a surface, seen from above at tilt k (ry/rx). Thickness t in px.
export const FlatCoin: React.FC<{ x: number; y: number; r: number; k?: number; t?: number; face?: 0 | 1; shadow?: boolean; rimGlow?: number; dim?: number; children?: React.ReactNode }> = ({ x, y, r, k = 0.52, t, face = 1, shadow = true, rimGlow = 0.8, dim = 0, children }) => {
  const th = t ?? r * 0.14;
  const ry = r * k;
  return (
    <g transform={`translate(${x} ${y})`}>
      {shadow && <ellipse cx={r * 0.1} cy={th + ry * 0.35} rx={r * 1.08} ry={ry * 1.1} fill="#120830" opacity={0.55} filter="url(#soft8)" />}
      {/* rim */}
      <path d={`M${-r},0 L${-r},${th} A${r} ${ry} 0 0 0 ${r},${th} L${r},0Z`} fill={C.edge} />
      <clipPath id={`rim${x}_${y}`}><path d={`M${-r},0 L${-r},${th} A${r} ${ry} 0 0 0 ${r},${th} L${r},0 A${r} ${ry} 0 0 1 ${-r},0Z`} /></clipPath>
      <g clipPath={`url(#rim${x}_${y})`}>
        {Array.from({ length: 48 }, (_, i) => {
          const a = Math.PI * (i / 47);
          const px = -Math.cos(a) * r;
          return <line key={i} x1={px} x2={px} y1={0} y2={th + ry} stroke="#7E3F0E" strokeWidth={Math.max(1.5, r * 0.012)} opacity={0.5} />;
        })}
        <rect x={0} y={0} width={r} height={th + ry} fill="url(#rimLight)" opacity={rimGlow} />
      </g>
      <g transform={`scale(${r / 100} ${(r / 100) * k})`}>
        <Face face={face} fill="url(#faceFlat)" light={[0.6, 1]} dim={dim}>{children}</Face>
      </g>
      <path d={`M${r * 0.05},${-ry * 0.99} A${r} ${ry} 0 0 1 ${r},0`} fill="none" stroke="#FFF1C2" strokeWidth={Math.max(2, r * 0.025)} strokeLinecap="round" opacity={0.85 * rimGlow} />
    </g>
  );
};

// A coin standing on its edge, turned by angle phi (radians) about the vertical axis.
// cos(phi) > 0 shows heads (1), < 0 tails (0). `blur` 0..1 adds a motion trail of earlier turns.
export const SpinCoin: React.FC<{ x: number; y: number; r: number; phi: number; t?: number; blur?: number; tilt?: number; dphi?: number }> = ({ x, y, r, phi, t, blur = 0, tilt = -7, dphi = 0.5 }) => {
  const th = t ?? r * 0.13;
  const c = Math.cos(phi), s = Math.sin(phi);
  const rx = Math.max(r * Math.abs(c), 1.5);
  const face: 0 | 1 = c >= 0 ? 1 : 0;
  const side = s >= 0 ? -1 : 1; // which side the rim shows on
  const rimW = th * Math.abs(s);
  const ghosts = blur > 0 ? [1, 2, 3].map((g) => phi - g * dphi) : [];
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
      {blur > 0 && <ellipse rx={r + 8} ry={r + 8} fill="url(#glowGold)" opacity={0.6 * blur} />}
      {ghosts.map((g, i) => {
        const gc = Math.cos(g);
        return <ellipse key={i} rx={Math.max(r * Math.abs(gc), 2)} ry={r} fill={C.gold} opacity={(0.22 - i * 0.06) * blur} />;
      })}
      {blur > 0 && <ellipse rx={r} ry={r} fill="none" stroke={C.cream} strokeWidth={3} opacity={0.3 * blur} />}
      {/* rim (edge band) */}
      <g>
        <rect x={side < 0 ? -rimW : 0} y={-r} width={rimW} height={2 * r} fill={C.edge} />
        <ellipse cx={side * rimW} rx={rx} ry={r} fill={C.edge} />
        <clipPath id={`srim${x}_${y}`}>
          <rect x={side < 0 ? -rimW : 0} y={-r} width={rimW} height={2 * r} />
          <ellipse cx={side * rimW} rx={rx} ry={r} />
        </clipPath>
        <g clipPath={`url(#srim${x}_${y})`}>
          {Array.from({ length: 40 }, (_, i) => -r + 6 + i * (2 * r / 40)).map((yy, i) => (
            <line key={i} x1={-rx - rimW - 4} x2={rx + rimW + 4} y1={yy} y2={yy} stroke="#7E3F0E" strokeWidth={Math.max(1.5, r * 0.014)} opacity={0.5} />
          ))}
        </g>
      </g>
      <g transform={`scale(${rx / 100} ${r / 100})`}>
        <Face face={face} light={[1, 0.6]} />
      </g>
      {/* specular streak that slides across as it turns */}
      <path d={`M${-rx * 0.55 * Math.sign(c || 1)},${-r * 0.62} Q${-rx * 0.82 * Math.sign(c || 1)},0 ${-rx * 0.5 * Math.sign(c || 1)},${r * 0.55}`} fill="none" stroke="#FFF8E0" strokeWidth={r * 0.05} strokeLinecap="round" opacity={0.7} />
    </g>
  );
};

// Speed arcs wrapping the spin axis (front halves).
export const SpinArcs: React.FC<{ x: number; y: number; r: number; fr: number; o?: number; tilt?: number }> = ({ x, y, r, fr, o = 1, tilt = -7 }) => (
  <g transform={`translate(${x} ${y}) rotate(${tilt})`} opacity={o}>
    {[-0.66, 0.06, 0.7].map((yy, i) => {
      const Y = yy * r;
      const rr = Math.sqrt(Math.max(0, r * r - Y * Y)) + r * 0.2;
      const off = ((fr * 18 + i * 60) % 240) - 120;
      return (
        <g key={i}>
          <path d={`M${-rr},${Y} A${rr} ${r * 0.12} 0 0 0 ${rr},${Y}`} fill="none" stroke={C.cream} strokeWidth={r * (i === 1 ? 0.045 : 0.034)} strokeLinecap="round" strokeDasharray={`${rr * 1.2} ${rr * 2}`} strokeDashoffset={off} opacity={0.85} />
        </g>
      );
    })}
  </g>
);
