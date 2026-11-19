// Hero objects: the Starship stack (Super Heavy booster + ship), the catch tower with chopstick arms,
// engine flames and the smoke billow. All drawn in local units; origins documented per component.
import React from "react";
import { random } from "remotion";
import { CREAM, MUSTARD, NAVY, ORANGE, TEAL, ht, COND } from "./kit";

const OUT = 4.5; // outline weight

// Engine flame below an origin (0,0) pointing down. len in px; fr for flicker.
export const Flame: React.FC<{ len: number; w?: number; fr: number }> = ({ len, w = 70, fr }) => {
  if (len <= 2) return null;
  const fl = 1 + 0.12 * Math.sin(fr * 1.9) + 0.08 * Math.sin(fr * 3.7 + 1);
  const L = len * fl;
  const d = (wid: number, l: number) => `M${-wid / 2} 0 C${-wid / 2} ${l * 0.35} ${-wid * 0.18} ${l * 0.7} 0 ${l} C${wid * 0.18} ${l * 0.7} ${wid / 2} ${l * 0.35} ${wid / 2} 0 Z`;
  return (
    <g>
      <path d={d(w, L)} fill={ORANGE} />
      <path d={d(w * 0.7, L * 0.72)} fill={MUSTARD} />
      <path d={d(w * 0.38, L * 0.45)} fill={CREAM} />
    </g>
  );
};

// Super Heavy booster. Origin = bottom centre (engine plane). Height 310, width 96.
export const Booster: React.FC<{ fr: number; flame?: number; fins?: number }> = ({ fr, flame = 0, fins = 1 }) => {
  const w = 96, h = 310;
  return (
    <g>
      <g transform="translate(0 6)"><Flame len={flame} w={84} fr={fr} /></g>
      <g filter="url(#misreg-t)">
        {/* engine skirt */}
        <path d={`M${-w / 2 + 4} 0 L${-w / 2 + 12} 14 L${w / 2 - 12} 14 L${w / 2 - 4} 0 Z`} fill={NAVY} />
        <rect x={-w / 2} y={-h} width={w} height={h} fill={CREAM} stroke={NAVY} strokeWidth={OUT} />
        <rect x={w / 2 - 34} y={-h + 2} width={32} height={h - 4} fill={ht("teal-s")} />
        <rect x={-w / 2 + 2} y={-h * 0.36} width={w - 4} height={22} fill={ORANGE} />
        <rect x={-w / 2 + 2} y={-h + 34} width={w - 4} height={10} fill={NAVY} />
        {/* grid fins */}
        {[-1, 1].map((sd) => (
          <g key={sd} transform={`translate(${sd * (w / 2 + 2)} ${-h + 26}) scale(${sd} 1)`}>
            <rect x={0} y={-14} width={22 * fins} height={28} fill={NAVY} />
            <rect x={4} y={-9} width={Math.max(0, 22 * fins - 8)} height={18} fill={ht("cream-m")} />
          </g>
        ))}
        <text x={-4} y={-h * 0.62} transform={`rotate(-90 -4 ${-h * 0.62})`} textAnchor="middle" fontFamily={COND} fontSize={30} letterSpacing={3} fill={NAVY}>SUPER HEAVY</text>
      </g>
    </g>
  );
};

// Starship (the ship). Origin = bottom centre. Height 250, width 96.
export const Ship: React.FC<{ fr: number; flame?: number }> = ({ fr, flame = 0 }) => {
  const w = 96, body = 170, nose = 84;
  return (
    <g>
      <g transform="translate(0 4)"><Flame len={flame} w={70} fr={fr} /></g>
      <g filter="url(#misreg-t)">
        {/* aft flaps */}
        <path d={`M${-w / 2} -6 L${-w / 2 - 26} -10 L${-w / 2 - 22} -62 L${-w / 2} -70 Z`} fill={ORANGE} stroke={NAVY} strokeWidth={3.5} />
        <path d={`M${w / 2} -6 L${w / 2 + 26} -10 L${w / 2 + 22} -62 L${w / 2} -70 Z`} fill={ORANGE} stroke={NAVY} strokeWidth={3.5} />
        {/* forward flaps */}
        <path d={`M${-w / 2 + 6} ${-body - 18} L${-w / 2 - 14} ${-body - 10} L${-w / 2 - 6} ${-body - 46} L${-w / 2 + 14} ${-body - 54} Z`} fill={ORANGE} stroke={NAVY} strokeWidth={3.5} />
        <path d={`M${w / 2 - 6} ${-body - 18} L${w / 2 + 14} ${-body - 10} L${w / 2 + 6} ${-body - 46} L${w / 2 - 14} ${-body - 54} Z`} fill={ORANGE} stroke={NAVY} strokeWidth={3.5} />
        <path d={`M${-w / 2} 0 L${-w / 2} ${-body} C${-w / 2} ${-body - nose * 0.6} ${-w * 0.2} ${-body - nose} 0 ${-body - nose} C${w * 0.2} ${-body - nose} ${w / 2} ${-body - nose * 0.6} ${w / 2} ${-body} L${w / 2} 0 Z`} fill={CREAM} stroke={NAVY} strokeWidth={OUT} />
        <path d={`M${w / 2 - 32} -2 L${w / 2 - 32} ${-body} C${w / 2 - 30} ${-body - nose * 0.55} ${w * 0.12} ${-body - nose * 0.9} ${w * 0.1} ${-body - nose * 0.92} C${w * 0.3} ${-body - nose * 0.8} ${w / 2 - 2} ${-body - nose * 0.5} ${w / 2 - 2} ${-body} L${w / 2 - 2} -2 Z`} fill={ht("teal-s")} />
        <rect x={-w / 2 + 2} y={-46} width={w - 4} height={16} fill={NAVY} />
        <circle cx={-6} cy={-body + 6} r={13} fill={MUSTARD} stroke={NAVY} strokeWidth={3.5} />
      </g>
    </g>
  );
};

// One pair of chopstick arms. Pivot at (0,0) on the tower's right face; k 0 open .. 1 closed (may overshoot).
export const Arms: React.FC<{ k: number; len?: number }> = ({ k, len = 190 }) => {
  const a = 30 * (1 - k);
  const arm = (sgn: number) => (
    <g transform={`rotate(${sgn * a}) translate(0 ${sgn * 14})`}>
      <rect x={-6} y={-9} width={len} height={18} rx={4} fill={MUSTARD} stroke={NAVY} strokeWidth={4} />
      <rect x={len - 32} y={-14} width={28} height={28} rx={4} fill={ORANGE} stroke={NAVY} strokeWidth={4} />
      {[0.25, 0.45, 0.65].map((p) => <line key={p} x1={len * p} y1={-9} x2={len * p + 12} y2={9} stroke={NAVY} strokeWidth={3} />)}
    </g>
  );
  return (
    <g>
      {arm(-1)}
      {arm(1)}
      <rect x={-14} y={-26} width={22} height={52} rx={4} fill={NAVY} />
    </g>
  );
};

// Catch tower. Origin = ground at the tower centre. Height 680. Arms at yLow/yHigh (negative, local).
export const TOWER_H = 680;
export const Tower: React.FC<{ low: number; high: number; yLow?: number; yHigh?: number; armsFront?: boolean; children?: React.ReactNode }> =
  ({ low, high, yLow = -312, yHigh = -560, children }) => {
    const H = TOWER_H, hw = 38;
    const braces: React.ReactNode[] = [];
    for (let y = 0; y > -H + 40; y -= 58) {
      braces.push(<line key={`a${y}`} x1={-hw} y1={y} x2={hw} y2={y - 58} stroke={NAVY} strokeWidth={4} />);
      braces.push(<line key={`b${y}`} x1={hw} y1={y} x2={-hw} y2={y - 58} stroke={NAVY} strokeWidth={4} />);
      braces.push(<line key={`c${y}`} x1={-hw} y1={y} x2={hw} y2={y} stroke={NAVY} strokeWidth={4} />);
    }
    return (
      <g>
        <g filter="url(#misreg)">
          <rect x={-hw} y={-H} width={hw * 2} height={H} fill={ht("navy-s")} />
          {braces}
          <rect x={-hw - 4} y={-H} width={10} height={H} fill={NAVY} />
          <rect x={hw - 6} y={-H} width={10} height={H} fill={NAVY} />
          <rect x={-hw - 10} y={-H - 22} width={hw * 2 + 20} height={26} fill={NAVY} />
          <rect x={-5} y={-H - 70} width={10} height={50} fill={NAVY} />
          <circle cx={0} cy={-H - 74} r={9} fill={ORANGE} />
          {/* launch mount */}
          <rect x={60} y={-22} width={112} height={22} fill={NAVY} />
          <rect x={72} y={-40} width={88} height={20} fill={TEAL} stroke={NAVY} strokeWidth={4} />
        </g>
        {children}
        <g transform={`translate(${hw + 4} ${yLow})`}><Arms k={low} /></g>
        <g transform={`translate(${hw + 4} ${yHigh})`}><Arms k={high} /></g>
      </g>
    );
  };

// Snap burst: short radial ink strokes around (0,0) for ~0.35 s after a clamp. k 0..1 progress.
export const SnapBurst: React.FC<{ k: number; r?: number; label?: string }> = ({ k, r = 70, label }) => {
  if (k <= 0 || k >= 1) return null;
  const o = 1 - k;
  return (
    <g opacity={o}>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2 + 0.3;
        const r0 = r * (0.6 + k * 0.6), r1 = r * (1.0 + k * 0.9);
        return <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} stroke={i % 2 ? ORANGE : NAVY} strokeWidth={8} strokeLinecap="round" />;
      })}
      {label && <text x={r * 1.2} y={-r * 0.9} fontFamily={COND} fontSize={64} fill={ORANGE} stroke={NAVY} strokeWidth={3} paintOrder="stroke" transform={`rotate(-10 ${r * 1.2} ${-r * 0.9})`}>{label}</text>}
    </g>
  );
};

// Smoke billow from a launch point at (0,0) (ground). amt 0..1 grows the cloud; fade 0..1 thins it.
export const Smoke: React.FC<{ amt: number; fade?: number; seed?: string; spread?: number }> = ({ amt, fade = 0, seed = "s", spread = 1 }) => {
  if (amt <= 0.001 || fade >= 0.999) return null;
  const N = 22;
  const puffs = Array.from({ length: N }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const dir = random(`${seed}d${i}`);
    const reach = (60 + dir * 330) * spread * amt;
    const r = (34 + random(`${seed}r${i}`) * 52) * (0.4 + 0.6 * amt);
    const lift = random(`${seed}l${i}`) * 80 * amt + (1 - dir) * 40 * amt;
    return { x: side * reach, y: -r * 0.6 - lift, r, i };
  }).sort((a, b) => a.y - b.y);
  return (
    <g opacity={1 - fade}>
      {puffs.map((p) => (
        <g key={p.i}>
          <circle cx={p.x} cy={p.y} r={p.r} fill={CREAM} stroke={NAVY} strokeWidth={4} />
          <circle cx={p.x + p.r * 0.28} cy={p.y + p.r * 0.22} r={p.r * 0.72} fill={ht(p.i % 3 ? "mustard-m" : "orange-s")} />
        </g>
      ))}
    </g>
  );
};
