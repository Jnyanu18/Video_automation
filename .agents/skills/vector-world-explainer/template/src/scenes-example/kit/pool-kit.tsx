import React from "react";
import { random } from "remotion";
import { C, Leaf, Stars } from "../../kit/palette";

/*
 * The night pool (pool act): a cutaway diorama in world coords (1080 wide).
 *   sky / palms / string lights        y < 560
 *   far deck (lounge chair, plant)     y 540..620
 *   water surface in perspective       far edge y 620 (x 150..930) -> near edge y SURF (x 20..1060)
 *   the water in section (lane 1)      y SURF..FLOOR, x 60..1020, walls either side; the kids stand on
 *                                      underwater steps (top STEP) at either side, a deep well between
 *   earth in section below             y > FLOOR
 */
export const SURF = 1090; // water level at the cut (near edge of the surface)
export const FLOOR = 1700; // deep-end floor in section
export const STEP = 1278; // top of the underwater steps the kids stand on (x 60..330 and 750..1020)
export const FAR = 620; // far edge of the surface
export const KID_A = 210, KID_B = 870; // the two friends stand at the cut plane
export const nearX = (y: number) => { const t = (y - FAR) / (SURF - FAR); return [150 - 130 * t, 930 + 130 * t] as const; };
export const TRAP = `M150,${FAR} L930,${FAR} L1060,${SURF} L20,${SURF}Z`;
const smooth = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };
export { smooth };

export const PoolDefs: React.FC = () => (
  <defs>
    <linearGradient id="plSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#090A2C" />
      <stop offset="0.55" stopColor="#1A1556" />
      <stop offset="1" stopColor="#3A2779" />
    </linearGradient>
    <linearGradient id="plSurf" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#14306E" />
      <stop offset="0.6" stopColor="#156A86" />
      <stop offset="1" stopColor="#1C8F96" />
    </linearGradient>
    <linearGradient id="plSec" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#2FB7AE" stopOpacity={0.62} />
      <stop offset="0.25" stopColor="#1D7F8A" stopOpacity={0.66} />
      <stop offset="1" stopColor="#123C72" stopOpacity={0.82} />
    </linearGradient>
    <linearGradient id="plWall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#2D6FA0" />
      <stop offset="1" stopColor="#1A2F6C" />
    </linearGradient>
    <linearGradient id="plEarth" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#2A1B5E" />
      <stop offset="1" stopColor="#140B36" />
    </linearGradient>
    <linearGradient id="plDeck" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#4B3A92" />
      <stop offset="1" stopColor="#5E4AB0" />
    </linearGradient>
    <linearGradient id="plGoldCol" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={C.goldMid} />
      <stop offset="0.45" stopColor={C.goldHi} />
      <stop offset="1" stopColor={C.goldMid} />
    </linearGradient>
    <linearGradient id="plCoralCol" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={C.coralDeep} />
      <stop offset="0.45" stopColor="#FF9A85" />
      <stop offset="1" stopColor={C.coralDeep} />
    </linearGradient>
    <linearGradient id="plTealCol" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={C.tealDeep} />
      <stop offset="0.45" stopColor={C.tealHi} />
      <stop offset="1" stopColor={C.tealDeep} />
    </linearGradient>
    <clipPath id="plTrap"><path d={TRAP} /></clipPath>
    <clipPath id="plAbove"><rect x={-1000} y={-3000} width={3080} height={3000 + SURF - 2} /></clipPath>
    <clipPath id="plBelow"><rect x={-1000} y={SURF - 2} width={3080} height={3000} /></clipPath>
  </defs>
);

// ---- Palm: a curved trunk and a crown of fronds that sway.
const Palm: React.FC<{ fr: number; x: number; y: number; s: number; flip?: boolean; seed: number }> = ({ fr, x, y, s, flip, seed }) => {
  const sw = Math.sin(fr * 0.03 + seed) * 4;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M0,0 C10,-120 40,-260 90,-380" fill="none" stroke="#1A1240" strokeWidth={34} strokeLinecap="round" />
      {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${-14 + i * 4},${-30 - i * 40} q20,-8 34,4`} stroke="#2C2066" strokeWidth={6} fill="none" opacity={0.8} />)}
      <g transform={`translate(90 -380) rotate(${sw})`}>
        {[-150, -110, -70, -30, 10, 50, 95, 140].map((a, i) => <Leaf key={i} x={0} y={0} a={a + Math.sin(fr * 0.05 + i + seed) * 3} s={0.95 + (i % 3) * 0.12} c={i % 2 ? "#1E5E5E" : "#17484F"} vein="#8FF3E3" />)}
        <circle r={16} fill="#2A1C5E" />
      </g>
    </g>
  );
};

// String lights hung in a sag between two points; bulbs twinkle.
const STRING_COLS = ["#FFF4D6", "#F2678E", "#8FF3E3", "#CFC4F5"];
export const StringLights: React.FC<{ fr: number; a: [number, number]; b: [number, number]; sag: number; n: number; seed: string; r?: number }> = ({ fr, a, b, sag, n, seed, r = 9 }) => {
  const pt = (t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t)];
  const d = Array.from({ length: 21 }, (_, i) => { const [x, y] = pt(i / 20); return `${i ? "L" : "M"}${x},${y}`; }).join(" ");
  return (
    <g>
      <path d={d} fill="none" stroke="#0E0828" strokeWidth={3} />
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = pt((i + 0.5) / n);
        const c = STRING_COLS[i % 4];
        const tw = 0.7 + 0.3 * Math.sin(fr * (0.05 + random(`${seed}${i}`) * 0.06) + i * 2);
        return (
          <g key={i}>
            <circle cx={x} cy={y + r + 4} r={r * 3.2} fill={c} opacity={0.12 * tw} filter="url(#soft8)" />
            <rect x={x - 3} y={y} width={6} height={6} fill="#0E0828" />
            <ellipse cx={x} cy={y + r + 4} rx={r * 0.8} ry={r} fill={c} opacity={0.75 + 0.25 * tw} />
          </g>
        );
      })}
    </g>
  );
};

// Sky, palms, far deck, lounge chair, plant, string lights. bulbs on surface reflections are drawn by Surface.
export const Backdrop: React.FC<{ fr: number }> = ({ fr }) => (
  <g>
    <rect x={-900} y={-1400} width={2880} height={2060} fill="url(#plSky)" />
    <Stars seed="plst" n={120} x={-300} y={-1300} w={1680} h={1700} fr={fr} />
    {/* moon + its halo */}
    <circle cx={800} cy={250} r={190} fill="url(#glowCold)" opacity={0.35} />
    <circle cx={800} cy={250} r={44} fill="#E9ECFF" />
    <circle cx={788} cy={240} r={44} fill="#B8C2F2" opacity={0.35} />
    <circle cx={814} cy={262} r={8} fill="#C6CCF2" />
    {/* far hills, hedge and a little pool house with a warm window */}
    <path d="M-600,470 Q-200,380 200,440 Q520,390 820,430 Q1100,380 1700,450 L1700,600 L-600,600Z" fill="#1B1450" />
    <g transform="translate(560 410)">
      <rect x={0} y={0} width={230} height={150} fill="#251A5E" />
      <path d="M-20,4 L115,-60 L250,4Z" fill="#2E2170" />
      <rect x={30} y={40} width={64} height={54} rx={4} fill="#3A2B7E" />
      <rect x={130} y={40} width={64} height={54} rx={4} fill="#F7B868" opacity={0.85} />
      <rect x={130} y={40} width={64} height={54} rx={4} fill="url(#glowGold)" opacity={0.6} />
      <line x1={162} y1={40} x2={162} y2={94} stroke="#7A4A2E" strokeWidth={4} />
    </g>
    <path d="M-600,520 Q-500,480 -400,515 Q-300,470 -200,510 Q-100,470 0,505 Q100,470 200,505 Q300,478 420,508 Q480,490 560,520 L560,600 L-600,600Z" fill="#162E4E" />
    <path d="M790,520 Q860,486 930,512 Q1010,476 1090,508 Q1200,480 1700,515 L1700,600 L790,600Z" fill="#162E4E" />
    {/* deck */}
    <path d={`M-700,556 L1780,556 L1780,${SURF + 20} L-700,${SURF + 20}Z`} fill="url(#plDeck)" />
    {Array.from({ length: 22 }, (_, i) => { const x = -700 + i * 120; return <line key={i} x1={540 + (x - 540) * 0.55} y1={556} x2={540 + (x - 540) * 1.25} y2={SURF + 20} stroke="#3A2B7E" strokeWidth={3} opacity={0.55} />; })}
    {[590, 700, 850, 1010].map((y, i) => <line key={i} x1={-700} y1={y} x2={1780} y2={y} stroke="#3A2B7E" strokeWidth={3} opacity={0.4} />)}
    {/* coping: a pale stone rim around the water */}
    <path d={`M136,${FAR - 14} L944,${FAR - 14} L1080,${SURF} L1060,${SURF} L930,${FAR} L150,${FAR} L20,${SURF} L0,${SURF}Z`} fill="#A99BE6" />
    <path d={`M136,${FAR - 14} L944,${FAR - 14} L946,${FAR - 8} L134,${FAR - 8}Z`} fill="#D9D1FF" opacity={0.7} />
    {/* lounge chair + towel, far right */}
    <g transform="translate(770 506)">
      <ellipse cx={80} cy={66} rx={110} ry={10} fill="#120830" opacity={0.45} />
      <path d="M0,40 L130,40 L170,-16 L184,-10 L146,48 L0,48Z" fill="#E9E1FF" />
      <path d="M10,40 L120,40 L158,-12" fill="none" stroke={C.rose} strokeWidth={14} strokeLinecap="round" />
      {[10, 60, 120].map((x) => <line key={x} x1={x} y1={48} x2={x} y2={66} stroke="#8F88C9" strokeWidth={6} />)}
    </g>
    {/* potted plant, far left */}
    <g transform="translate(70 560)">
      <path d="M-34,-52 L34,-52 L26,0 L-26,0Z" fill="#B9568E" />
      {[-60, -30, 0, 30, 60].map((a, i) => <Leaf key={i} x={0} y={-52} a={a + Math.sin(fr * 0.04 + i) * 4} s={0.42} c={i % 2 ? "#2F9C8C" : C.teal} vein="#0B3A38" />)}
    </g>
    {/* ladder rails at the left side, far end */}
    <g>
      <path d="M190,640 C190,590 230,590 230,620 L230,640" fill="none" stroke="#DCD6FF" strokeWidth={8} strokeLinecap="round" />
      <path d="M250,640 C250,590 290,590 290,620 L290,640" fill="none" stroke="#DCD6FF" strokeWidth={8} strokeLinecap="round" />
    </g>
    <Palm fr={fr} x={-40} y={600} s={1.25} seed={1} />
    <Palm fr={fr} x={1120} y={600} s={1.1} flip seed={2} />
    <StringLights fr={fr} a={[-60, 220]} b={[1140, 200]} sag={150} n={16} seed="sl" />
  </g>
);

// The water surface in perspective (clipped to the pool shape). children = ripples / crests.
export const Surface: React.FC<{ fr: number; gold: number; children?: React.ReactNode }> = ({ fr, gold, children }) => (
  <g>
    <path d={TRAP} fill="url(#plSurf)" />
    <g clipPath="url(#plTrap)">
      {/* the underwater lights glow up through the water */}
      <ellipse cx={300} cy={1000} rx={260} ry={90} fill="url(#glowTeal)" opacity={0.85} />
      <ellipse cx={720} cy={1010} rx={240} ry={80} fill="url(#glowTeal)" opacity={0.7} />
      {/* moon reflection: broken wobbling streaks */}
      <g filter="url(#soft4)">{Array.from({ length: 9 }, (_, i) => {
        const y = 640 + i * 26, w = 50 - i * 3 + Math.sin(fr * 0.12 + i * 1.7) * 10;
        return <rect key={i} x={800 - w / 2 + Math.sin(fr * 0.08 + i) * 6} y={y} width={w} height={5} rx={2.5} fill="#E9ECFF" opacity={0.5 - i * 0.04} />;
      })}</g>
      {/* string-light reflections */}
      <g filter="url(#soft4)">{Array.from({ length: 12 }, (_, i) => {
        const x = 170 + i * 66, y = 660 + (i % 3) * 18;
        return <rect key={i} x={x - 4} y={y + Math.sin(fr * 0.1 + i) * 4} width={8} height={26} rx={4} fill={STRING_COLS[i % 4]} opacity={0.3} />;
      })}</g>
      {/* caustic glints drifting */}
      {Array.from({ length: 26 }, (_, i) => {
        const y = FAR + 20 + random(`plg${i}`) * (SURF - FAR - 40);
        const [l, r] = nearX(y);
        const x = l + ((random(`plgx${i}`) * (r - l) + fr * (0.4 + random(`plgv${i}`))) % (r - l));
        const w = 14 + 22 * ((y - FAR) / (SURF - FAR));
        const o = 0.25 + 0.25 * Math.sin(fr * 0.09 + i * 2.3);
        return <path key={i} d={`M${x - w},${y} q${w / 2},-5 ${w},0 q${w / 2},5 ${w},0`} fill="none" stroke={C.tealHi} strokeWidth={2.5} opacity={o} />;
      })}
      {gold > 0 && <ellipse cx={540} cy={1060} rx={520} ry={170} fill="url(#poolGold)" opacity={gold} />}
      {children}
    </g>
    {/* the near edge of the surface: a bright meniscus line along the cut */}
    <line x1={20} y1={SURF} x2={1060} y2={SURF} stroke={C.tealHi} strokeWidth={3} opacity={0.5} />
  </g>
);

// A ring on the surface in perspective.
export const Ring: React.FC<{ x: number; y: number; r: number; k: number; c?: string; w?: number }> = ({ x, y, r, k, c = C.tealHi, w = 5 }) =>
  k > 0 && k < 1 ? <ellipse cx={x} cy={y} rx={r} ry={r * 0.3} fill="none" stroke={c} strokeWidth={w * (1 - k) + 1.5} opacity={0.85 * (1 - k)} /> : null;

// The earth in section around and below the pool: strata and pebbles.
export const Earth: React.FC = () => (
  <g>
    <rect x={-900} y={SURF} width={2880} height={2400} fill="url(#plEarth)" />
    {[1340, 1520, 1760, 2050].map((y, i) => <path key={i} d={`M-900,${y} Q-300,${y - 30} 200,${y + 10} T1200,${y} T2000,${y + 10}`} fill="none" stroke="#3B2A7A" strokeWidth={10} opacity={0.5} />)}
    {Array.from({ length: 60 }, (_, i) => (
      <ellipse key={i} cx={-500 + random(`peb${i}`) * 2080} cy={SURF + 260 + random(`peby${i}`) * 1600} rx={8 + random(`pebr${i}`) * 18} ry={5 + random(`pebr${i}`) * 10} fill="#3A2A78" opacity={0.6} />
    ))}
  </g>
);

// The pool in section: walls, tiled back wall with teal lamps, the kids' steps, a deep well,
// light shafts and bubbles.
const Tiles: React.FC<{ x: number; y: number; w: number; h: number; o?: number }> = ({ x, y, w, h, o = 0.35 }) => (
  <g>
    {Array.from({ length: Math.floor(w / 40) + 1 }, (_, i) => <line key={`v${i}`} x1={x + i * 40} y1={y} x2={x + i * 40} y2={y + h} stroke="#5FB4D8" strokeWidth={1.5} opacity={o} />)}
    {Array.from({ length: Math.floor(h / 40) + 1 }, (_, i) => <line key={`h${i}`} x1={x} y1={y + 20 + i * 40} x2={x + w} y2={y + 20 + i * 40} stroke="#5FB4D8" strokeWidth={1.5} opacity={o} />)}
  </g>
);
export const SectionBack: React.FC<{ fr: number; gold: number }> = ({ fr, gold }) => (
  <g>
    {/* walls and floor slab */}
    <path d={`M14,${SURF} L60,${SURF} L60,${FLOOR} L1020,${FLOOR} L1020,${SURF} L1066,${SURF} L1066,${FLOOR + 40} L14,${FLOOR + 40}Z`} fill="#8E80D4" />
    <rect x={60} y={SURF} width={960} height={FLOOR - SURF} fill="url(#plWall)" />
    <Tiles x={60} y={SURF} w={960} h={FLOOR - SURF} />
    {/* the teal underwater lamps */}
    {[[300, 1185], [640, 1185], [420, 1480], [760, 1520]].map(([x, y], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r={i < 2 ? 170 : 210} fill="url(#glowTeal)" opacity={(i < 2 ? 0.75 : 0.55) + 0.1 * Math.sin(fr * 0.07 + i)} />
        <circle cx={x} cy={y} r={20} fill="#3D8FAE" stroke="#BFF6EE" strokeWidth={4} />
        <circle cx={x} cy={y} r={11} fill="#E6FFFB" />
      </g>
    ))}
    {/* caustic web wobbling on the back wall, near the surface */}
    {Array.from({ length: 7 }, (_, i) => {
      const y = SURF + 30 + i * 24;
      const d = Array.from({ length: 25 }, (_, j) => `${j ? "L" : "M"}${60 + j * 40},${y + Math.sin(fr * 0.07 + j * 0.9 + i * 1.3) * 9}`).join(" ");
      return <path key={i} d={d} fill="none" stroke="#9FF1E6" strokeWidth={2} opacity={0.18 - i * 0.015} />;
    })}
    {/* the steps the kids stand on (side view), a deep well between */}
    {[[60, 330], [750, 1020]].map(([x0, x1], i) => (
      <g key={i}>
        <rect x={x0} y={STEP} width={x1 - x0} height={FLOOR - STEP} fill="#2A5E96" />
        <Tiles x={x0} y={STEP} w={x1 - x0} h={FLOOR - STEP} o={0.25} />
        <rect x={x0} y={STEP} width={x1 - x0} height={10} fill="#BFF6EE" opacity={0.75} />
        <rect x={i ? x0 : x1 - 12} y={STEP} width={12} height={FLOOR - STEP} fill="#173A73" opacity={0.6} />
      </g>
    ))}
    <rect x={60} y={FLOOR - 16} width={960} height={16} fill="#16306A" />
    {/* lane line on the deep floor */}
    <rect x={380} y={FLOOR - 40} width={320} height={14} rx={7} fill="#122A5E" />
    {gold > 0 && <ellipse cx={540} cy={SURF + 120} rx={600} ry={340} fill="url(#glowGold)" opacity={gold} />}
    {/* ladder rails down the left wall */}
    <g stroke="#DCD6FF" strokeWidth={7} strokeLinecap="round" opacity={0.85}>
      <path d={`M78,${SURF - 60} C78,${SURF - 100} 118,${SURF - 100} 118,${SURF - 60} L118,${STEP - 6}`} fill="none" />
      {[SURF + 40, SURF + 100, SURF + 160].map((y) => <line key={y} x1={96} y1={y} x2={118} y2={y} />)}
    </g>
  </g>
);

// Light in the water (drawn over the water fill): shafts from the surface and rising bubbles.
export const WaterLight: React.FC<{ fr: number; gold: number }> = ({ fr, gold }) => (
  <g style={{ mixBlendMode: "screen" }}>
    {[140, 330, 520, 720, 900].map((x, i) => {
      const sw = Math.sin(fr * 0.025 + i * 1.9) * 30;
      const w = 50 + (i % 2) * 30;
      return <path key={i} d={`M${x},${SURF + 6} L${x + w},${SURF + 6} L${x + w + 160 + sw},${FLOOR - 60} L${x + 90 + sw},${FLOOR - 60}Z`} fill={gold > 0.3 ? "#FFE3A0" : "#BFF6EE"} opacity={0.07 + 0.03 * Math.sin(fr * 0.06 + i)} filter="url(#soft14)" />;
    })}
    {Array.from({ length: 22 }, (_, i) => {
      const x0 = 120 + random(`plb${i}`) * 840;
      const sp = 1.4 + random(`plbs${i}`) * 2.2;
      const span = FLOOR - SURF - 40;
      const y = FLOOR - 30 - ((fr * sp + random(`plby${i}`) * span) % span);
      return <circle key={i} cx={x0 + Math.sin(fr * 0.08 + i) * 8} cy={y} r={3 + (i % 4) * 2} fill="none" stroke="#CFFBF4" strokeWidth={2.5} opacity={0.5} />;
    })}
  </g>
);

// A strip of water in section whose top edge is `disp(x)` above `Y` (upward = positive).
// stroke: colour of the surface line; glow 0..1 thickens a glow under the line.
export const WaterBody: React.FC<{ Y: number; x0: number; x1: number; bottom: number; disp: (x: number) => number; stroke: string; glow?: number; glowC?: string; fill?: string; step?: number; id: string }> = ({ Y, x0, x1, bottom, disp, stroke, glow = 0, glowC = C.gold, fill = "url(#plSec)", step = 6, id }) => {
  const pts: string[] = [];
  for (let x = x0; x <= x1 + 0.1; x += step) pts.push(`${x.toFixed(1)},${(Y - disp(x)).toFixed(1)}`);
  const top = "M" + pts.join(" L");
  return (
    <g>
      <path d={`${top} L${x1},${bottom} L${x0},${bottom}Z`} fill={fill} />
      {/* a lighter band just below the surface */}
      <path d={top} fill="none" stroke="#7FE7DA" strokeWidth={26} opacity={0.18} transform="translate(0 14)" />
      {glow > 0 && <path d={top} fill="none" stroke={glowC} strokeWidth={34} opacity={0.35 * glow} filter="url(#soft8)" />}
      <path id={id} d={top} fill="none" stroke={stroke} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

// A component wave drawn as a thin dashed line over a lane (to show what is being added).
export const Component: React.FC<{ Y: number; x0: number; x1: number; disp: (x: number) => number; c: string; o: number; dash?: string }> = ({ Y, x0, x1, disp, c, o, dash = "12 9" }) => {
  if (o <= 0.01) return null;
  const pts: string[] = [];
  for (let x = x0; x <= x1 + 0.1; x += 6) pts.push(`${x.toFixed(1)},${(Y - disp(x)).toFixed(1)}`);
  return <path d={"M" + pts.join(" L")} fill="none" stroke={c} strokeWidth={3.5} strokeDasharray={dash} strokeLinecap="round" opacity={o} />;
};

// ---- The two friends. Origin = the waterline at the kid's waist; up is negative.
export type Arm = [number, number]; // [shoulder angle, elbow bend] in degrees; 0 = hanging down, + = toward `dir`
export type Pose = { front: Arm; back: Arm; mouth: "smile" | "laugh" | "o"; squint?: number; look?: number; blink?: number; dy?: number; lean?: number };
type Style = { skin: string; skinSh: string; top: string; topHi: string; shorts: string; kind: "A" | "B" };
export const STYLE_A: Style = { skin: "#B97A56", skinSh: "#97603F", top: C.rose, topHi: "#FF9AB6", shorts: "#3B2C8A", kind: "A" };
export const STYLE_B: Style = { skin: "#EDB98F", skinSh: "#C98F68", top: "#7C6CE0", topHi: "#B4A8FF", shorts: C.tealDeep, kind: "B" };

const armPts = (sx: number, sy: number, side: number, [a1, a2]: Arm): [number, number][] => {
  const r1 = (a1 * Math.PI) / 180, r2 = ((a1 + a2) * Math.PI) / 180;
  const ex = sx + Math.sin(r1) * 52 * side, ey = sy + Math.cos(r1) * 52;
  const hx = ex + Math.sin(r2) * 48 * side, hy = ey + Math.cos(r2) * 48;
  return [[sx, sy], [ex, ey], [hx, hy]];
};

export const Kid: React.FC<{ x: number; y: number; dir: 1 | -1; st: Style; pose: Pose; fr: number; rim?: number; s?: number }> = ({ x, y, dir, st, pose, fr, rim = 0, s = 1 }) => {
  const look = (pose.look ?? 0.6) * dir;
  const dy = pose.dy ?? 0;
  const blink = pose.blink ?? 1;
  const sq = pose.squint ?? 0;
  const lean = (pose.lean ?? 0) * dir;
  const arm = (side: number, a: Arm, front: boolean) => {
    const sideSign = front ? dir : -dir;
    const p = armPts(42 * sideSign, -108, sideSign, a);
    const d = `M${p[0][0]},${p[0][1]} L${p[1][0]},${p[1][1]} L${p[2][0]},${p[2][1]}`;
    return (
      <g key={side}>
        <path d={d} fill="none" stroke={front ? st.skin : st.skinSh} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M${p[0][0]},${p[0][1]} L${p[0][0] + (p[1][0] - p[0][0]) * 0.45},${p[0][1] + (p[1][1] - p[0][1]) * 0.45}`} stroke={st.top} strokeWidth={26} strokeLinecap="round" />
        <circle cx={p[2][0]} cy={p[2][1]} r={13} fill={front ? st.skin : st.skinSh} />
      </g>
    );
  };
  const eye = (ex: number) => (
    <g>
      {sq > 0.5 ? (
        <path d={`M${ex - 10},-168 Q${ex},-180 ${ex + 10},-168`} fill="none" stroke="#1A0E3E" strokeWidth={5} strokeLinecap="round" />
      ) : (
        <g transform={`translate(${ex} -172) scale(1 ${blink})`}>
          <ellipse rx={10} ry={12} fill="#FFFDF5" />
          <circle cx={look * 4} cy={1} r={6.5} fill="#1A0E3E" />
          <circle cx={look * 4 - 2} cy={-2} r={2.2} fill="#FFFFFF" />
        </g>
      )}
    </g>
  );
  const mx = look * 9;
  return (
    <g transform={`translate(${x} ${y + dy}) scale(${s}) rotate(${lean})`}>
      {arm(0, pose.back, false)}
      {/* legs + shorts (seen in section under water) */}
      <g>
        <path d={`M-30,40 L-34,170 Q-34,186 -18,186 L-8,186 L-6,60Z`} fill={st.skinSh} transform={`rotate(${Math.sin(fr * 0.06) * 3} -20 40)`} />
        <path d={`M30,40 L34,170 Q34,186 18,186 L8,186 L6,60Z`} fill={st.skin} transform={`rotate(${-Math.sin(fr * 0.06) * 3} 20 40)`} />
        <path d="M-42,-6 L42,-6 L44,64 L4,64 L0,40 L-4,64 L-44,64Z" fill={st.shorts} />
      </g>
      {/* torso */}
      <path d="M-46,-112 Q0,-124 46,-112 L42,0 L-42,0Z" fill={st.top} />
      <path d="M-44,-60 L44,-60" stroke={st.topHi} strokeWidth={10} opacity={0.8} />
      <path d={`M${-30 * dir},-110 L${-28 * dir},-4`} stroke="#000" strokeWidth={14} opacity={0.08} />
      <rect x={-14} y={-128} width={28} height={20} fill={st.skinSh} />
      {/* head */}
      <circle cx={-52} cy={-166} r={12} fill={st.skinSh} />
      <circle cx={52} cy={-166} r={12} fill={st.skinSh} />
      <circle cx={0} cy={-170} r={56} fill={st.skin} />
      {st.kind === "A" ? (
        <g fill="#2A1838">
          <path d="M-58,-170 C-62,-236 62,-236 58,-170 C44,-196 -44,-196 -58,-170Z" />
          {[-46, -26, -4, 18, 40].map((cx, i) => <circle key={i} cx={cx} cy={-214 + Math.abs(cx) * 0.25} r={17} />)}
          <circle cx={-52} cy={-188} r={13} />
          <circle cx={52} cy={-188} r={13} />
        </g>
      ) : (
        <g>
          <path d="M-60,-166 C-64,-244 64,-244 60,-166 C40,-190 -40,-190 -60,-166Z" fill="#9A86F0" />
          <path d="M-40,-222 Q0,-238 40,-222" fill="none" stroke="#D2C8FF" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
          <path d="M-58,-196 Q0,-206 58,-196" fill="none" stroke={C.tealDeep} strokeWidth={8} />
          <circle cx={-20} cy={-202} r={14} fill={C.tealHi} stroke={C.tealDeep} strokeWidth={5} />
          <circle cx={20} cy={-202} r={14} fill={C.tealHi} stroke={C.tealDeep} strokeWidth={5} />
        </g>
      )}
      {eye(-20 + look * 8)}
      {eye(20 + look * 8)}
      <circle cx={-34 + look * 6} cy={-150} r={9} fill={C.rose} opacity={0.45} />
      <circle cx={34 + look * 6} cy={-150} r={9} fill={C.rose} opacity={0.45} />
      {pose.mouth === "smile" && <path d={`M${mx - 14},-146 Q${mx},-134 ${mx + 14},-146`} fill="none" stroke="#5A1E2E" strokeWidth={5} strokeLinecap="round" />}
      {pose.mouth === "laugh" && (
        <g>
          <path d={`M${mx - 17},-148 Q${mx},-118 ${mx + 17},-148Z`} fill="#5A1E2E" />
          <path d={`M${mx - 9},-133 Q${mx},-128 ${mx + 9},-133`} fill="none" stroke="#F27A8E" strokeWidth={5} />
        </g>
      )}
      {pose.mouth === "o" && <ellipse cx={mx} cy={-140} rx={8} ry={10} fill="#5A1E2E" />}
      {/* light from the middle of the pool (gold when the big wave rises) */}
      {rim > 0 && (
        <g opacity={rim}>
          <path d={`M${36 * dir},-214 A56 56 0 0 ${dir > 0 ? 1 : 0} ${36 * dir},-126`} fill="none" stroke={C.goldHi} strokeWidth={8} strokeLinecap="round" />
          <path d={`M${44 * dir},-108 L${41 * dir},-4`} stroke={C.goldHi} strokeWidth={7} strokeLinecap="round" opacity={0.8} />
        </g>
      )}
      {arm(1, pose.front, true)}
    </g>
  );
};

// Water droplets: a teardrop pointed along its velocity.
export const Drop: React.FC<{ x: number; y: number; vx: number; vy: number; r: number; c?: string; o?: number }> = ({ x, y, vx, vy, r, c = "#CFFBF4", o = 1 }) => {
  const a = (Math.atan2(vy, vx) * 180) / Math.PI;
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`} opacity={o}>
      <path d={`M${-r * 2.6},0 Q${-r * 0.2},${-r} ${r},0 Q${-r * 0.2},${r} ${-r * 2.6},0Z`} fill={c} />
      <circle cx={r * 0.1} cy={-r * 0.3} r={r * 0.35} fill="#FFFFFF" opacity={0.7} />
    </g>
  );
};

// A water pillar rising from the surface at (x, Y): wobbling sides, a foamy cap.
export const Pillar: React.FC<{ x: number; Y: number; h: number; w: number; fill: string; cap: string; fr: number; seed: number; glow?: number; glowId?: string }> = ({ x, Y, h, w, fill, cap, fr, seed, glow = 0, glowId = "glowGold" }) => {
  if (h <= 2) return null;
  const top = Y - h;
  const wob = (k: number) => Math.sin(fr * 0.22 + seed + k * 3) * 4;
  const d = `M${x - w / 2 - 14},${Y} C${x - w / 2 + wob(0)},${Y - h * 0.3} ${x - w / 2 + wob(1)},${top + 30} ${x - w / 2 + 4},${top + 10} Q${x},${top - 16} ${x + w / 2 - 4},${top + 10} C${x + w / 2 + wob(2)},${top + 30} ${x + w / 2 + wob(3)},${Y - h * 0.3} ${x + w / 2 + 14},${Y}Z`;
  return (
    <g>
      {glow > 0 && <ellipse cx={x} cy={top + h / 2} rx={w * 2.4} ry={h * 0.7 + 80} fill={`url(#${glowId})`} opacity={glow} />}
      <path d={d} fill={fill} />
      {/* streaks running down */}
      {[-0.22, 0.08, 0.26].map((u, i) => {
        const off = ((fr * 6 + i * 40 + seed * 13) % Math.max(40, h));
        return <line key={i} x1={x + u * w} y1={top + 20 + off * 0.5} x2={x + u * w} y2={Math.min(Y, top + 60 + off)} stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" opacity={0.35} />;
      })}
      <ellipse cx={x} cy={top + 4} rx={w / 2 + 6} ry={14} fill={cap} />
      {[-1, 0, 1].map((k) => <circle key={k} cx={x + k * (w / 3) + Math.sin(fr * 0.3 + k) * 3} cy={top - 6 - Math.abs(Math.sin(fr * 0.25 + k + seed)) * 12} r={7} fill={cap} />)}
      <ellipse cx={x} cy={Y} rx={w / 2 + 26} ry={9} fill="none" stroke="#FFFFFF" strokeWidth={3} opacity={0.4} />
    </g>
  );
};
