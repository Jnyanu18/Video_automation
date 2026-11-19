// Retro space-poster scenes (worked example from the source film, "Seattle to Delhi in 1 hour on a rocket?").
// v6 staging: the presenter is the big still cut-out bottom-left (scale 0.88, mirrored; head box = SIDE_FACE).
// Graphics live in the top band (x 40-940, y 290-760; series tag above at y 230-276) and the right column
// (x 744-940, y 776-1294); captions sit in the right column from y 1300 (Film.tsx regionFor SIDE).
// Back5 = full-bleed poster backgrounds only (landscape with sun + hills, then the night board).
// Front5 = every graphic, scene by scene (so nothing hides behind his shoulder): catch tower + chopstick arms,
// plane panels, car/grocery road card, new-car row, best-reusable-rocket headline, fact chips, globe with dotted
// rocket arcs, vertical boarding pass, end card. Rewrite the scene blocks for a new topic; keep the helpers.
import React from "react";
import { interpolate } from "remotion";
import { B } from "../beats";
import { clamp, ease, easeIn, easeInOut, lerp, popS, progS } from "../lib";
import { Badge, BLACK, COND, HANDLE, CREAM, Ink, MUSTARD, NAVY, ORANGE, TEAL, ht, starPath } from "./kit";
import { Booster, Ship, SnapBurst, Smoke, Tower } from "./rocket";
import { Arc, CITY, Globe, MiniRocket, proj, type View } from "./globe";
import { Burst, Calendar } from "./widgets";
import { T } from "./times";

type P = { t: number; fr: number };
// visible from a (fade in 0.2 s) until b (fade out over 0.2 s)
const vis = (t: number, a: number, b: number) => (t < a || t >= b ? 0 : Math.min(progS(t, a, 0.2), 1 - progS(t, b - 0.2, 0.2)));
const G: React.FC<{ o: number; children: React.ReactNode; dy?: number }> = ({ o, children, dy = 0 }) =>
  o <= 0.001 ? null : <g opacity={o} transform={dy ? `translate(0 ${dy})` : undefined}>{children}</g>;
const k1 = (k: number) => Math.min(1, k);

// ---------------- backgrounds ----------------
const sunStripes = (cx: number, cy: number, r: number) =>
  [0.25, 0.42, 0.56, 0.68, 0.78].map((p, i) => <rect key={i} x={cx - r} y={cy + r * (p * 2 - 1)} width={r * 2} height={5 + i * 3} fill={CREAM} />);

const Landscape: React.FC<{ horizon: number; sun: [number, number, number] }> = ({ horizon, sun }) => {
  const [sx, sy, sr] = sun;
  const hills = `M-200 ${horizon} L-60 ${horizon - 150} L120 ${horizon - 60} L300 ${horizon - 210} L520 ${horizon - 50} L720 ${horizon - 170} L940 ${horizon - 40} L1150 ${horizon - 190} L1300 ${horizon} Z`;
  return (
    <g>
      <rect x={0} y={0} width={1080} height={1920} fill={CREAM} />
      <rect x={0} y={horizon - 520} width={1080} height={180} fill={ht("mustard-m")} opacity={0.35} />
      <rect x={0} y={horizon - 340} width={1080} height={200} fill={ht("mustard-l")} opacity={0.45} />
      <rect x={0} y={horizon - 140} width={1080} height={140} fill={ht("orange-m")} opacity={0.45} />
      <clipPath id="sunclip"><circle cx={sx} cy={sy} r={sr} /></clipPath>
      <circle cx={sx + 8} cy={sy + 6} r={sr} fill={MUSTARD} />
      <circle cx={sx} cy={sy} r={sr} fill={ORANGE} />
      <g clipPath="url(#sunclip)">{sunStripes(sx, sy, sr)}</g>
      <g filter="url(#misreg)">
        <path d={hills} fill={TEAL} />
        <path d={hills} fill={ht("navy-s")} opacity={0.6} />
      </g>
      <path d={`M-200 ${horizon + 10} Q200 ${horizon - 70} 560 ${horizon + 4} T1300 ${horizon - 20} V1920 H-200 Z`} fill={NAVY} />
      <rect x={0} y={horizon + 60} width={1080} height={1920} fill={ht("teal-s")} opacity={0.5} />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={560 + i * 140} y={horizon + 300} width={90} height={12} fill={MUSTARD} opacity={0.8} />)}
    </g>
  );
};

const Night: React.FC = () => (
  <g>
    <rect x={0} y={0} width={1080} height={1920} fill={CREAM} />
    <circle cx={760} cy={430} r={330} fill={ht("mustard-m")} opacity={0.5} />
    {Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2;
      return <path key={i} d={`M760 430 L${760 + Math.cos(a) * 330} ${430 + Math.sin(a) * 330} L${760 + Math.cos(a + 0.12) * 330} ${430 + Math.sin(a + 0.12) * 330} Z`} fill={ORANGE} opacity={0.35} />;
    })}
    <rect x={0} y={1200} width={1080} height={720} fill={NAVY} />
    <rect x={0} y={1200} width={1080} height={720} fill={ht("teal-s")} opacity={0.5} />
    <rect x={0} y={1192} width={1080} height={10} fill={ORANGE} />
  </g>
);

export const Back5: React.FC<P> = ({ t }) => {
  const night = t >= B.delhi.s - 0.2;
  const nightO = progS(t, B.delhi.s - 0.2, 0.35);
  return (
    <g>
      <Landscape horizon={1200} sun={[800, 960, 180]} />
      {night && <g opacity={nightO}><Night /></g>}
    </g>
  );
};

// ---------------- catch tower (right column) ----------------
// hook: stacked rocket, launch at "ride"; q: booster returns, low arms SNAP; plane: ship returns, flips, high arms SNAP.
const RX = 115;
const SHIP_IN = T.reuse - 0.2, SHIP_FLIP = T.plane + 0.35, SNAP2 = T.throwAway + 0.05;
const towerRocket = (t: number) => {
  const rise = interpolate(t, [T.launch, T.launch + 1.2], [0, -1900], { ...clamp, easing: easeIn });
  const bk = progS(t, T.boosterBack, T.snap1 - T.boosterBack, ease);
  const boosterY = t < T.boosterBack ? -40 + rise : lerp(-1700, -50, bk);
  const boosterFlame = t < T.launch ? 0 : t < T.boosterBack ? 170 : t < T.snap1 ? 110 : 0;
  const sIn = progS(t, SHIP_IN, SHIP_FLIP - SHIP_IN, ease);
  const flip = progS(t, SHIP_FLIP, 0.5, easeInOut);
  const down = progS(t, SHIP_FLIP + 0.3, SNAP2 - SHIP_FLIP - 0.35, ease);
  let shipX = RX, shipY = -350 + rise, shipRot = 0, shipFlame = 0, shipVis = true;
  if (t >= T.boosterBack && t < SHIP_IN) shipVis = false;
  if (t >= SHIP_IN) {
    shipX = lerp(RX + 420, RX + 40, sIn) - 40 * flip;
    shipY = lerp(-1100, -760, sIn) + (-390 + 760) * down;
    shipRot = 90 * (1 - flip);
    shipFlame = flip > 0.4 && t < SNAP2 ? 90 : 0;
  }
  const low = t < T.snap1 ? 0 : popS(t, T.snap1, 9);
  const high = t < SNAP2 ? 0 : popS(t, SNAP2, 9);
  return { boosterY, boosterFlame, shipX, shipY, shipRot, shipFlame, shipVis, low, high };
};
const TOWER_AT = "translate(790 1296) scale(0.46)"; // v6: right column beside his head
const TowerScene: React.FC<{ t: number; fr: number }> = ({ t, fr }) => {
  const r = towerRocket(t);
  const smoke = progS(t, T.launch, 1.4, ease) * (1 - progS(t, T.launch + 2.2, 1.2));
  return (
    <g transform={TOWER_AT}>
      <g transform={`translate(${RX} -40)`}><Smoke amt={smoke} seed="intro" spread={0.65} /></g>
      <Tower low={r.low} high={r.high} yLow={-340} yHigh={-580}>
        <g transform={`translate(${RX} ${r.boosterY})`}><Booster fr={fr} flame={r.boosterFlame} /></g>
        {r.shipVis && <g transform={`translate(${r.shipX} ${r.shipY}) rotate(${r.shipRot} 0 -125)`}><Ship fr={fr} flame={r.shipFlame} /></g>}
      </Tower>
      <g transform="translate(162 -340)"><SnapBurst k={progS(t, T.snap1, 0.45, (x) => x)} r={80} label="SNAP!" /></g>
      <g transform="translate(162 -580)"><SnapBurst k={progS(t, SNAP2, 0.45, (x) => x)} r={80} label="SNAP!" /></g>
    </g>
  );
};
// ---------------- shared pieces ----------------
// Frame-0 hook headline, exactly his spoken hook: "Seattle to Delhi in 1 hour. On a rocket?" (v6: under the series tag,
// left-aligned so the HELL YEAH burst fits at the right of the top band).
const Hook: React.FC = () => (
  <g>
    <Ink x={48} y={418} size={128} width={880} anchor="start" fill={NAVY}>SEATTLE TO DELHI</Ink>
    <Ink x={48} y={556} size={128} width={520} anchor="start" fill={TEAL} ghost={ORANGE}>IN 1 HOUR.</Ink>
    <Ink x={48} y={706} size={136} width={640} anchor="start" fill={ORANGE} ghost={NAVY} off={[6, 6]}>ON A ROCKET?</Ink>
  </g>
);
// "A · MY ANSWER" tag (pill with a circled A).
const ATag: React.FC<{ x: number; y: number; k: number; text?: string }> = ({ x, y, k, text = "MY ANSWER" }) =>
  k <= 0 ? null : (
    <g transform={`translate(${x} ${y}) scale(${lerp(0.7, 1, k1(k))})`} opacity={k1(k * 2)}>
      <rect x={-6} y={-30} width={300} height={60} rx={30} fill={ORANGE} transform="translate(6 5)" />
      <rect x={-6} y={-30} width={300} height={60} rx={30} fill={NAVY} />
      <circle cx={24} cy={0} r={22} fill={MUSTARD} />
      <text x={24} y={14} textAnchor="middle" fontFamily={COND} fontSize={40} fill={NAVY}>A</text>
      <text x={60} y={13} fontFamily={COND} fontSize={36} letterSpacing={3} fill={CREAM}>{text}</text>
    </g>
  );

const Slap: React.FC<{ x: number; y: number; k: number; text: string; w: number; size?: number; rot?: number; bg?: string }> = ({ x, y, k, text, w, size = 52, rot = -8, bg = ORANGE }) =>
  k <= 0 ? null : (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${1.6 - 0.6 * Math.min(1.05, k)})`} opacity={Math.min(1, k * 2)}>
      <rect x={-w / 2 + 7} y={-40} width={w} height={88} rx={10} fill={NAVY} />
      <rect x={-w / 2} y={-46} width={w} height={88} rx={10} fill={bg} stroke={NAVY} strokeWidth={5} />
      <rect x={-w / 2 + 9} y={-37} width={w - 18} height={70} rx={6} fill="none" stroke={CREAM} strokeWidth={3} />
      <text x={0} y={size * 0.36 - 4} textAnchor="middle" fontFamily={COND} fontSize={size} letterSpacing={2} fill={CREAM}>{text}</text>
    </g>
  );

// A fact chip (navy card, mustard head line, cream body lines). (x,y) = top-left.
const Chip: React.FC<{ x: number; y: number; w: number; k: number; head: string; lines: string[]; size?: number }> = ({ x, y, w, k, head, lines, size = 40 }) => {
  if (k <= 0) return null;
  const h = 64 + lines.length * (size + 8);
  return (
    <g opacity={k1(k * 2)} transform={`translate(${x} ${y + (1 - k1(k)) * 24})`}>
      <rect x={0} y={0} width={w} height={h} rx={12} fill={ORANGE} transform="translate(6 7)" />
      <rect x={0} y={0} width={w} height={h} rx={12} fill={NAVY} />
      <text x={20} y={46} fontFamily={COND} fontSize={34} letterSpacing={2} fill={MUSTARD} {...(head.length * 34 * 0.47 > w - 40 ? { textLength: w - 40, lengthAdjust: "spacingAndGlyphs" as const } : {})}>{head}</text>
      {lines.map((l, i) => <text key={i} x={20} y={46 + (i + 1) * (size + 8)} fontFamily={COND} fontSize={size} letterSpacing={1} fill={CREAM} {...(l.length * size * 0.42 > w - 40 ? { textLength: w - 40, lengthAdjust: "spacingAndGlyphs" as const } : {})}>{l}</text>)}
    </g>
  );
};

const PlaneIcon: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} filter="url(#misreg-t)">
    <path d="M-110 6 C-110 -10 -96 -16 -80 -16 L80 -16 C104 -16 120 -6 124 4 C120 12 104 18 80 18 L-80 18 C-96 18 -110 14 -110 6 Z" fill={CREAM} stroke={NAVY} strokeWidth={5} />
    <path d="M-10 -12 L-40 -70 L-14 -70 L40 -12 Z" fill={TEAL} stroke={NAVY} strokeWidth={4} />
    <path d="M-10 14 L-40 66 L-14 66 L40 14 Z" fill={TEAL} stroke={NAVY} strokeWidth={4} />
    <path d="M-104 -10 L-118 -48 L-96 -48 L-80 -14 Z" fill={ORANGE} stroke={NAVY} strokeWidth={4} />
    {[-60, -36, -12, 12, 36, 60].map((wx) => <circle key={wx} cx={wx} cy={-2} r={5} fill={NAVY} />)}
  </g>
);
const LoopArrow: React.FC<{ x: number; y: number; r: number; k: number; color?: string }> = ({ x, y, r, k, color = ORANGE }) => {
  if (k <= 0) return null;
  const a1 = -90 + 300 * Math.min(1, k);
  const p = (deg: number) => [x + Math.cos((deg * Math.PI) / 180) * r, y + Math.sin((deg * Math.PI) / 180) * r];
  const [x0, y0] = p(-90), [x1, y1] = p(a1);
  const hd = ((a1 + 90) * Math.PI) / 180;
  return (
    <g>
      <path d={`M${x0} ${y0} A${r} ${r} 0 ${a1 + 90 > 180 ? 1 : 0} 1 ${x1} ${y1}`} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round" />
      {k >= 1 && <path d={`M${x1 + Math.cos(hd) * 22} ${y1 + Math.sin(hd) * 22} L${x1 - Math.cos(hd) * 22} ${y1 - Math.sin(hd) * 22} L${x1 + Math.cos(hd - Math.PI / 2) * 26} ${y1 + Math.sin(hd - Math.PI / 2) * 26} Z`} fill={color} />}
    </g>
  );
};

// Retro side-view car (faces right at dir 1). Origin = ground centre, ~200 x 100.
const Car: React.FC<{ x: number; y: number; s?: number; dir?: 1 | -1; color?: string }> = ({ x, y, s = 1, dir = 1, color = ORANGE }) => (
  <g transform={`translate(${x} ${y}) scale(${s * dir} ${s})`}>
    <path d="M-100 -22 L-100 -50 Q-98 -60 -86 -62 L-52 -64 L-28 -98 Q-24 -104 -14 -104 L42 -104 Q52 -104 58 -96 L84 -64 L96 -60 Q104 -56 104 -46 L104 -22 Z" fill={color} stroke={NAVY} strokeWidth={5} />
    <path d="M-40 -66 L-20 -94 L10 -94 L10 -66 Z M20 -66 L20 -94 L44 -94 L66 -66 Z" fill={CREAM} stroke={NAVY} strokeWidth={4} />
    <rect x={-100} y={-48} width={204} height={10} fill={CREAM} opacity={0.7} />
    {[-58, 62].map((wx) => <g key={wx}><circle cx={wx} cy={-20} r={24} fill={NAVY} /><circle cx={wx} cy={-20} r={10} fill={MUSTARD} /></g>)}
  </g>
);
const House: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`} filter="url(#misreg-t)">
    <rect x={-70} y={-110} width={140} height={110} fill={CREAM} stroke={NAVY} strokeWidth={5} />
    <path d="M-90 -106 L0 -178 L90 -106 Z" fill={TEAL} stroke={NAVY} strokeWidth={5} />
    <rect x={-20} y={-64} width={40} height={64} fill={ORANGE} stroke={NAVY} strokeWidth={4} />
    <rect x={-56} y={-92} width={28} height={26} fill={MUSTARD} stroke={NAVY} strokeWidth={3} />
    <text x={0} y={88} textAnchor="middle" fontFamily={COND} fontSize={36} letterSpacing={3} fill={NAVY}>HOME</text>
  </g>
);
const Store: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`} filter="url(#misreg-t)">
    <rect x={-84} y={-130} width={168} height={130} fill={CREAM} stroke={NAVY} strokeWidth={5} />
    {[-84, -42, 0, 42].map((ax, i) => <rect key={ax} x={ax} y={-130} width={42} height={30} fill={i % 2 ? CREAM : ORANGE} stroke={NAVY} strokeWidth={3} />)}
    <rect x={-60} y={-86} width={60} height={50} fill={MUSTARD} stroke={NAVY} strokeWidth={3} />
    <rect x={12} y={-80} width={46} height={80} fill={TEAL} stroke={NAVY} strokeWidth={4} />
    <text x={0} y={88} textAnchor="middle" fontFamily={COND} fontSize={36} letterSpacing={3} fill={NAVY}>GROCERY</text>
  </g>
);

// ---------------- globe (top band, right) ----------------
const VIEW: View = { cx: 702, cy: 528, R: 168, lon0: -30, lat0: 50 };
const PAIRS: [string, string][] = [["NYC", "LON"], ["SFO", "TYO"], ["LON", "DXB"], ["MOW", "BJS"], ["CHI", "MEX"], ["DXB", "SIN"]];
const GlobeBadge: React.FC = () => (
  <g>
    <circle cx={VIEW.cx} cy={VIEW.cy} r={VIEW.R * 1.28} fill={NAVY} />
    <circle cx={VIEW.cx} cy={VIEW.cy} r={VIEW.R * 1.28} fill={ht("teal-s")} opacity={0.5} />
    <circle cx={VIEW.cx} cy={VIEW.cy} r={VIEW.R * 1.28} fill="none" stroke={MUSTARD} strokeWidth={8} />
    {Array.from({ length: 12 }, (_, i) => {
      const a = i * 2.39996, rr = VIEW.R * (1.08 + ((i * 37) % 11) / 70);
      return <circle key={i} cx={VIEW.cx + Math.cos(a) * rr} cy={VIEW.cy + Math.sin(a) * rr} r={3 + (i % 3)} fill={CREAM} />;
    })}
    <Globe v={VIEW} id="g5" />
  </g>
);
const Dot: React.FC<{ c: [number, number]; big?: boolean }> = ({ c, big }) => {
  const q = proj(c, VIEW);
  if (q.z < 0.05) return null;
  return <g><circle cx={q.x} cy={q.y} r={big ? 13 : 8} fill={NAVY} /><circle cx={q.x} cy={q.y} r={big ? 8 : 5} fill={big ? ORANGE : CREAM} /></g>;
};

// ---------------- Front: every graphic, scene by scene (v6 layout) ----------------
// Top band: x 40-940, y 290-760 (series tag above at y 230-276). Right column: x 720-940, y 770-1290 (captions from 1300).
// His head + hair: SIDE_FACE (presenter.tsx). Nothing here crosses x < 720 below y 770.
const RC = 744, RW = 196; // right column left edge + width (his hair reaches x ~735 when he leans in)
// squeeze a text line to fit `max` px when its estimated Anton width is larger
const fitW = (txt: string, size: number, max: number) => (txt.length * size * 0.43 > max ? { textLength: max, lengthAdjust: "spacingAndGlyphs" as const } : {});

// vertical boarding pass for the narrow right column
const VPass: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => {
  if (k <= 0) return null;
  const w = RW, h = 246;
  return (
    <g opacity={k1(k * 2)} transform={`translate(${x} ${y + (1 - k1(k)) * 24})`}>
      <rect x={0} y={0} width={w} height={h} rx={14} fill={NAVY} transform="translate(7 8)" />
      <rect x={0} y={0} width={w} height={h} rx={14} fill={CREAM} stroke={NAVY} strokeWidth={4} />
      <rect x={0} y={0} width={w} height={48} rx={14} fill={TEAL} />
      <rect x={0} y={30} width={w} height={18} fill={TEAL} />
      <text x={w / 2} y={34} textAnchor="middle" fontFamily={COND} fontSize={26} letterSpacing={2} fill={CREAM}>BOARDING PASS</text>
      <Ink x={20} y={118} size={66} anchor="start" fill={NAVY}>SEA</Ink>
      <path d={`M120 96 L176 96 M162 82 L178 96 L162 110`} fill="none" stroke={ORANGE} strokeWidth={8} strokeLinecap="round" />
      <Ink x={w / 2} y={186} size={66} fill={NAVY}>DEL</Ink>
      <line x1={14} x2={w - 14} y1={204} y2={204} stroke={NAVY} strokeWidth={3} strokeDasharray="8 7" />
      <text x={w / 2} y={236} textAnchor="middle" fontFamily={COND} fontSize={32} letterSpacing={1} fill={ORANGE} textLength={w - 24} lengthAdjust="spacingAndGlyphs">FLIGHT TIME · 1 HOUR</text>
    </g>
  );
};

export const Front5: React.FC<P> = ({ t, fr }) => {
  const els: React.ReactNode[] = [];
  const push = (k: string, n: React.ReactNode) => els.push(<React.Fragment key={k}>{n}</React.Fragment>);

  // ===== right column: catch tower (hook -> q -> plane), clipped to the column so stages never cross the top band =====
  const towerO = vis(t, -1, T.best - 0.05);
  if (towerO > 0) push("tower", <G o={towerO}><clipPath id="towerclip"><rect x={740} y={772} width={340} height={530} /></clipPath><g clipPath="url(#towerclip)"><TowerScene t={t} fr={fr} /></g></G>);

  // ===== hook: headline from frame 0 until the question; HELL YEAH burst; launch at "ride" =====
  const hookO = t < B.q.s - 0.1 ? 1 : 1 - progS(t, B.q.s - 0.1, 0.2);
  if (hookO > 0) push("hook", <G o={hookO}><Hook /></G>);
  const hellO = vis(t, T.hell - 0.05, B.q.s + 0.05);
  if (hellO > 0) push("hell", <G o={hellO}><Burst x={836} y={556} r={100} k={popS(t, T.hell - 0.05, 11)} text="HELL YEAH!" size={44} /></G>);

  // (q: the anonymous IG DM card is HTML, see world.tsx)

  // ===== plane: MY ANSWER; rocket reused = a plane; not thrown away; chip "Plan: catch BOTH stages" =====
  const planeO = vis(t, B.plane.s, B.car.s + 0.05);
  if (planeO > 0) {
    const rk = popS(t, T.reuse - 0.15), pk = popS(t, T.plane - 0.1), bk = popS(t, T.throwAway, 11);
    push("plane", (
      <G o={planeO}>
        <ATag x={50} y={330} k={popS(t, B.plane.s)} />
        <Ink x={936} y={352} size={64} anchor="end" fill={NAVY} opacity={popS(t, B.plane.s + 0.1)}>IMAGINE A ROCKET...</Ink>
        {rk > 0 && (
          <g opacity={k1(rk * 2)} transform={`translate(252 514) scale(${lerp(0.85, 1, k1(rk))})`}>
            <rect x={-208} y={-122} width={416} height={244} rx={20} fill={NAVY} transform="translate(8 9)" />
            <rect x={-208} y={-122} width={416} height={244} rx={20} fill={CREAM} stroke={NAVY} strokeWidth={5} />
            <MiniRocket x={-92} y={-6} rot={0} s={2.3} />
            <LoopArrow x={-92} y={-6} r={94} k={progS(t, T.reuse, 0.9)} />
            <text x={36} y={-14} fontFamily={COND} fontSize={60} fill={NAVY}>ROCKET</text>
            <text x={36} y={54} fontFamily={COND} fontSize={56} fill={ORANGE}>REUSED</text>
          </g>
        )}
        {pk > 0 && (
          <g>
            <g transform={`translate(492 514) scale(${k1(pk)})`}><circle r={38} fill={NAVY} /><text y={22} textAnchor="middle" fontFamily={COND} fontSize={64} fill={MUSTARD}>=</text></g>
            <g opacity={k1(pk * 2)} transform={`translate(728 514) scale(${lerp(0.85, 1, k1(pk))})`}>
              <rect x={-196} y={-122} width={392} height={244} rx={20} fill={NAVY} transform="translate(8 9)" />
              <rect x={-196} y={-122} width={392} height={244} rx={20} fill={CREAM} stroke={NAVY} strokeWidth={5} />
              <PlaneIcon x={-6} y={-30} s={1.15} />
              <text x={0} y={94} textAnchor="middle" fontFamily={COND} fontSize={58} fill={NAVY}>A PLANE</text>
            </g>
          </g>
        )}
        {bk > 0 && (
          <g transform={`translate(490 704) rotate(-2) scale(${lerp(1.3, 1, k1(bk))})`} opacity={k1(bk * 2)}>
            <rect x={-442} y={-36} width={884} height={72} rx={36} fill={ORANGE} stroke={NAVY} strokeWidth={5} />
            <text y={17} textAnchor="middle" fontFamily={COND} fontSize={46} letterSpacing={2} fill={CREAM} textLength={820} lengthAdjust="spacingAndGlyphs">DON'T THROW IT AWAY AT THE DESTINATION</text>
          </g>
        )}
        {t < T.best - 0.1 && <Chip x={RC} y={776} w={RW} k={popS(t, SNAP2 + 0.35)} head="PLAN:" lines={["CATCH BOTH", "STAGES"]} size={40} />}
      </G>
    ));
  }

  // ===== right column across plane -> car: "best thing" (his take), then rocket = your car =====
  const bestO = vis(t, T.best - 0.1, T.store + 0.1);
  if (bestO > 0) push("best", <G o={bestO}><Chip x={RC} y={790} w={RW} k={popS(t, T.best - 0.1)} head="MY TAKE:" lines={["BEST", "THING!"]} size={62} /></G>);
  const mapO = vis(t, T.dontLeave, T.tomorrow + 0.1);
  if (mapO > 0) {
    const mk = popS(t, T.dontLeave);
    push("map", (
      <G o={mapO}>
        <g opacity={k1(mk * 2)} transform={`translate(0 ${(1 - k1(mk)) * 24})`}>
          <rect x={RC} y={790} width={RW} height={330} rx={16} fill={NAVY} transform="translate(8 9)" />
          <rect x={RC} y={790} width={RW} height={330} rx={16} fill={CREAM} stroke={NAVY} strokeWidth={5} />
          <text x={RC + RW / 2} y={842} textAnchor="middle" fontFamily={COND} fontSize={34} letterSpacing={2} fill={TEAL}>A ROCKET</text>
          <MiniRocket x={RC + RW / 2} y={898} rot={90} s={1.9} />
          <text x={RC + RW / 2} y={968} textAnchor="middle" fontFamily={COND} fontSize={34} letterSpacing={2} fill={TEAL}>= YOUR CAR</text>
          <Car x={RC + RW / 2} y={1040} s={0.7} />
          <text x={RC + RW / 2} y={1100} textAnchor="middle" fontFamily={COND} fontSize={34} letterSpacing={1} fill={ORANGE} {...fitW("USE IT, BRING IT BACK", 34, RW - 20)}>USE IT, BRING IT BACK</text>
        </g>
      </G>
    ));
  }

  // ===== car: home -> grocery store -> back home -> again tomorrow (top band card) =====
  const carO = vis(t, B.car.s, B.buy.s + 0.05);
  if (carO > 0) {
    const go1 = progS(t, T.carOut + 0.15, T.store + 0.3 - T.carOut, easeInOut);
    const back = progS(t, T.back, T.tomorrow - T.back + 0.1, easeInOut);
    const go2 = progS(t, T.tomorrow + 0.4, 1.1, easeInOut);
    const HX = 150, SX = 830, RY = 620;
    const atStore = go1 >= 1 && back <= 0;
    const carX = go2 > 0 ? lerp(HX + 140, SX - 150, go2) : back > 0 ? lerp(SX - 150, HX + 140, back) : lerp(HX + 140, SX - 150, go1);
    const dir: 1 | -1 = back > 0 && go2 <= 0 ? -1 : 1;
    const leaveK = popS(t, T.dontLeave, 11);
    const tk = popS(t, T.tomorrow + 0.1);
    push("car", (
      <G o={carO}>
        <g opacity={popS(t, B.car.s)}>
          <rect x={40} y={300} width={900} height={450} rx={20} fill={NAVY} transform="translate(9 10)" />
          <rect x={40} y={300} width={900} height={450} rx={20} fill={CREAM} stroke={NAVY} strokeWidth={6} />
          <text x={490} y={368} textAnchor="middle" fontFamily={COND} fontSize={54} letterSpacing={2} fill={NAVY}>YOUR CAR: <tspan fill={ORANGE}>USED AGAIN AND AGAIN</tspan></text>
          <rect x={60} y={RY} width={860} height={40} fill={NAVY} />
          {Array.from({ length: 8 }, (_, i) => <rect key={i} x={100 + i * 104} y={RY + 16} width={52} height={8} fill={MUSTARD} />)}
          <g transform={`translate(${HX} ${RY}) scale(1.25) translate(${-HX} ${-RY})`}><House x={HX} y={RY} /></g>
          <g transform={`translate(${SX} ${RY}) scale(1.25) translate(${-SX} ${-RY})`}><Store x={SX} y={RY} /></g>
          <Car x={carX} y={RY + 4} s={1.0} dir={dir} />
          {leaveK > 0 && atStore && (
            <g transform={`translate(490 446) rotate(-3) scale(${lerp(1.3, 1, k1(leaveK))})`} opacity={k1(leaveK * 2)}>
              <rect x={-236} y={-40} width={472} height={80} rx={12} fill={TEAL} stroke={NAVY} strokeWidth={5} />
              <text y={16} textAnchor="middle" fontFamily={COND} fontSize={46} letterSpacing={2} fill={CREAM} textLength={430} lengthAdjust="spacingAndGlyphs">YOU DON'T LEAVE IT THERE</text>
            </g>
          )}
          {back > 0 && go2 <= 0 && <text x={480} y={480} textAnchor="middle" fontFamily={COND} fontSize={76} letterSpacing={2} fill={TEAL} opacity={k1(back * 4)}>BACK HOME</text>}
          {go2 > 0 && <LoopArrow x={480} y={470} r={62} k={go2} color={ORANGE} />}
        </g>
        {tk > 0 && <g transform={`translate(${RC} 790) scale(0.65)`}><Calendar x={0} y={0} k={tk} flip={1} label="AGAIN" sub="TOMORROW" color={TEAL} /></g>}
      </G>
    ));
  }

  // ===== buy: a new car every trip? -> doesn't make sense =====
  const buyO = vis(t, B.buy.s, B.goal.s + 0.05);
  const FLIGHT15 = B.goal.s + 0.6;
  const nsO = vis(t, T.noSense - 0.05, FLIGHT15);
  if (nsO > 0) {
    const nk = popS(t, T.noSense - 0.05, 10);
    push("nosense", (
      <G o={nsO}>
        <g transform={`translate(${RC + RW / 2} 950) rotate(-5) scale(${lerp(1.4, 1, k1(nk)) * 0.53})`} opacity={k1(nk * 2)}>
          <rect x={-180} y={-150} width={360} height={300} rx={18} fill={NAVY} transform="translate(9 10)" />
          <rect x={-180} y={-150} width={360} height={300} rx={18} fill={ORANGE} stroke={NAVY} strokeWidth={6} />
          <path d="M-60 -110 L60 -10 M60 -110 L-60 -10" stroke={CREAM} strokeWidth={22} strokeLinecap="round" />
          <text y={56} textAnchor="middle" fontFamily={COND} fontSize={62} letterSpacing={2} fill={CREAM}>DOESN'T</text>
          <text y={120} textAnchor="middle" fontFamily={COND} fontSize={62} letterSpacing={2} fill={NAVY}>MAKE SENSE</text>
        </g>
      </G>
    ));
  }
  if (buyO > 0) {
    const span = Math.max(0.6, T.noSense - T.everyTime);
    const ks = [0, 1, 2].map((i) => popS(t, T.buy + 0.55 + i * (span / 3 + 0.2), 12));
    push("buy", (
      <G o={buyO}>
        <Ink x={490} y={392} size={100} width={880} fill={NAVY} opacity={k1(popS(t, B.buy.s) * 2)}>A NEW CAR EVERY TRIP?</Ink>
        {ks.map((k, i) => k > 0 && (
          <g key={i} opacity={k1(k * 2)} transform={`translate(${190 + i * 300} 630) scale(${lerp(0.7, 1, k1(k))})`}>
            <Car x={0} y={20} s={1.25} color={[ORANGE, TEAL, MUSTARD][i]} />
            <g transform="translate(80 -170) rotate(8)">
              <rect x={-66} y={-34} width={132} height={68} rx={8} fill={CREAM} stroke={NAVY} strokeWidth={4} />
              <text y={20} textAnchor="middle" fontFamily={COND} fontSize={50} fill={NAVY}>$$$</text>
            </g>
            <text x={0} y={96} textAnchor="middle" fontFamily={COND} fontSize={46} letterSpacing={2} fill={NAVY}>{`TRIP ${i + 1}`}</text>
          </g>
        ))}
      </G>
    ));
  }

  // ===== goal: "building the best reusable rocket"; chip "Next: Starship Flight 15, targeted for November 2026" =====
  const goalO = vis(t, B.goal.s, B.delhi.s + 0.05);
  if (goalO > 0) {
    const hk = popS(t, B.goal.s + 0.1, 12);
    push("goal", (
      <G o={goalO}>
        <ATag x={50} y={330} k={popS(t, B.goal.s)} text="SPACEX'S GOAL" />
        <g opacity={k1(hk * 2)} transform={`translate(0 ${(1 - k1(hk)) * 20})`}>
          <Ink x={490} y={516} size={118} width={860} fill={NAVY}>THE BEST REUSABLE</Ink>
          <Ink x={490} y={712} size={176} width={600} fill={ORANGE} ghost={NAVY} off={[7, 7]}>ROCKET</Ink>
        </g>
      </G>
    ));
  }
  const f15O = vis(t, FLIGHT15, T.seattle);
  if (f15O > 0) {
    const fk = popS(t, FLIGHT15);
    push("f15", (
      <G o={f15O}>
        <g opacity={k1(fk * 2)} transform={`translate(0 ${(1 - k1(fk)) * 24})`}>
          <rect x={RC} y={786} width={RW} height={400} rx={14} fill={ORANGE} transform="translate(7 8)" />
          <rect x={RC} y={786} width={RW} height={400} rx={14} fill={NAVY} />
          <text x={RC + 18} y={834} fontFamily={COND} fontSize={36} letterSpacing={3} fill={MUSTARD} {...fitW("NEXT UP", 36, RW - 36)}>NEXT UP</text>
          <text x={RC + 18} y={902} fontFamily={COND} fontSize={62} fill={CREAM} {...fitW("STARSHIP", 62, RW - 36)}>STARSHIP</text>
          <text x={RC + 18} y={968} fontFamily={COND} fontSize={62} fill={ORANGE} {...fitW("FLIGHT 15", 62, RW - 36)}>FLIGHT 15</text>
          <line x1={RC + 18} x2={RC + RW - 18} y1={994} y2={994} stroke={MUSTARD} strokeWidth={3} strokeDasharray="10 8" />
          <text x={RC + 18} y={1040} fontFamily={COND} fontSize={36} letterSpacing={1} fill={CREAM} {...fitW("TARGETED FOR", 36, RW - 36)}>TARGETED FOR</text>
          <text x={RC + 18} y={1100} fontFamily={COND} fontSize={52} fill={MUSTARD} {...fitW("NOVEMBER", 52, RW - 36)}>NOVEMBER</text>
          <text x={RC + 18} y={1160} fontFamily={COND} fontSize={52} fill={MUSTARD} {...fitW("2026", 52, RW - 36)}>2026</text>
        </g>
      </G>
    ));
  }

  // ===== delhi + ten: globe in the top band; boarding pass + concept chip in the right column (held to the end card) =====
  const globeO = vis(t, B.delhi.s, B.end.s + 0.05);
  if (globeO > 0) {
    const inTen = t >= B.ten.s;
    const sd = progS(t, T.seattle, 1.0, easeInOut);
    const dm = progS(t, T.mexico - 0.3, 1.0, easeInOut);
    const arcs = PAIRS.map((p, i) => ({ p, k: progS(t, T.everything - 0.1 + i * 0.12, 0.9, easeInOut) }));
    const leftT = (lines: [string, string, number][], at: number) => (
      <g opacity={progS(t, at, 0.25)} transform={`translate(${(1 - progS(t, at, 0.3)) * -30} 0)`}>
        {lines.map(([s, c, y], i) => <Ink key={i} x={50} y={y} size={104} anchor="start" fill={c} ghost={c === ORANGE ? NAVY : ORANGE} width={s.length > 6 ? 410 : undefined}>{s}</Ink>)}
      </g>
    );
    push("globe", (
      <G o={globeO}>
        <GlobeBadge />
        {!inTen && <Arc a={CITY.SEA} b={CITY.DEL} v={VIEW} p={sd} lift={0.35} w={9} />}
        {!inTen && <Arc a={CITY.DEL} b={CITY.MEX} v={VIEW} p={dm} lift={0.35} w={9} color={MUSTARD} />}
        {!inTen && <><Dot c={CITY.SEA} big /><Dot c={CITY.DEL} big />{dm > 0 && <Dot c={CITY.MEX} big />}</>}
        {inTen && t < T.everything - 0.1 && <><Arc a={CITY.SEA} b={CITY.DEL} v={VIEW} p={1} lift={0.35} w={9} rocket={false} /><Arc a={CITY.DEL} b={CITY.MEX} v={VIEW} p={1} lift={0.35} w={9} color={MUSTARD} rocket={false} /></>}
        {inTen && t >= T.everything - 0.1 && arcs.map(({ p, k }, i) => <Arc key={i} a={CITY[p[0]]} b={CITY[p[1]]} v={VIEW} p={k} color={i % 2 ? ORANGE : MUSTARD} lift={0.25} w={7} rocket={false} />)}
        {inTen && t >= T.everything - 0.1 && Object.keys(CITY).map((c) => <Dot key={c} c={CITY[c]} />)}
        {!inTen && <Badge x={230} y={332} w={360} h={58} text="IF THEY CAN DO THAT" size={34} bg={ORANGE} fg={CREAM} k={popS(t, B.delhi.s)} />}
        {inTen && <Badge x={240} y={332} w={380} h={58} text="MADHAV'S PREDICTION" size={34} bg={ORANGE} fg={CREAM} k={popS(t, B.ten.s)} />}
        {!inTen && t < T.mexico - 0.3 && leftT([["SEATTLE", NAVY, 470], ["TO", NAVY, 578], ["DELHI", ORANGE, 700]], T.seattle - 0.1)}
        {!inTen && t >= T.mexico - 0.3 && leftT([["DELHI", NAVY, 470], ["TO", NAVY, 578], ["MEXICO", ORANGE, 700]], T.mexico - 0.3)}
        {inTen && leftT([["IN 10", NAVY, 470], ["YEARS,", NAVY, 578], ["EVERYWHERE", ORANGE, 700]], B.ten.s + 0.05)}
      </G>
    ));
    const passO = vis(t, T.seattle, B.end.s + 0.05);
    if (passO > 0) push("pass", <G o={passO}><VPass x={RC} y={782} k={popS(t, T.seattle, 13)} /></G>);
    const conceptO = vis(t, T.hour - 0.3, B.end.s + 0.05);
    if (conceptO > 0) push("concept", <G o={conceptO}><Chip x={RC} y={1030} w={RW} k={popS(t, T.hour - 0.3)} head="REALITY CHECK" lines={["EARTH-TO-", "EARTH ROCKET", "TRAVEL IS", "STILL A", "CONCEPT"]} size={32} /></G>);
  }

  // ===== end card (silent): question + comment prompt (top band), follow + handle (right column) =====
  if (t >= B.end.s - 0.05) {
    const o = progS(t, B.end.s - 0.05, 0.25);
    const e0 = B.end.s;
    const ck = popS(t, e0 + 0.25, 12), fk = popS(t, e0 + 0.45, 12), ak = popS(t, e0 + 0.65, 10), hk = popS(t, e0 + 0.85, 12);
    const bub = "M-440 -150 H440 Q470 -150 470 -120 V110 Q470 140 440 140 H-180 L-262 214 L-246 140 H-440 Q-470 140 -470 110 V-120 Q-470 -150 -440 -150 Z";
    push("end", (
      <G o={o}>
        <g transform="translate(490 468) scale(0.94)">
          <path d={bub} fill={NAVY} transform="translate(10 10)" />
          <path d={bub} fill={CREAM} stroke={NAVY} strokeWidth={6} />
          <circle cx={-370} cy={-80} r={46} fill={ORANGE} stroke={NAVY} strokeWidth={4} />
          <MiniRocket x={-370} y={-84} rot={35} s={1.1} />
          <text x={-300} y={-64} fontFamily={COND} fontSize={46} letterSpacing={2} fill={TEAL}>YOUR TURN</text>
          <Ink x={0} y={86} size={150} width={860} fill={NAVY}>WOULD YOU RIDE ONE?</Ink>
        </g>
        <g opacity={k1(ck * 2)} transform={`translate(0 ${(1 - k1(ck)) * 20})`}>
          <rect x={430} y={676} width={500} height={80} rx={40} fill={ORANGE} stroke={NAVY} strokeWidth={5} />
          <text x={656} y={732} textAnchor="middle" fontFamily={COND} fontSize={54} letterSpacing={3} fill={CREAM}>COMMENT BELOW</text>
          <path d="M876 694 L876 738 M858 720 L876 742 L894 720" fill="none" stroke={CREAM} strokeWidth={8} strokeLinecap="round" />
        </g>
        <g transform={`translate(${RC + RW / 2} 868) scale(${fk})`} opacity={k1(fk * 2)}>
          <rect x={-98} y={-66} width={196} height={132} rx={16} fill={NAVY} transform="translate(8 9)" />
          <rect x={-98} y={-66} width={196} height={132} rx={16} fill={NAVY} stroke={MUSTARD} strokeWidth={5} />
          <text y={-6} textAnchor="middle" fontFamily={COND} fontSize={44} letterSpacing={1} fill={CREAM}>FOLLOW FOR</text>
          <text y={46} textAnchor="middle" fontFamily={COND} fontSize={44} letterSpacing={4} fill={MUSTARD}>MORE</text>
        </g>
        <g transform={`translate(${RC + RW / 2} 1062) scale(${ak})`} opacity={k1(ak * 2)}>
          <path d={starPath(108, 92, 18)} fill={NAVY} transform="translate(8 9)" />
          <path d={starPath(108, 92, 18)} fill={MUSTARD} stroke={NAVY} strokeWidth={5} />
          <Ink x={0} y={26} size={74} width={172} fill={NAVY}>AI NEWS</Ink>
        </g>
        <g opacity={k1(hk * 2)}>
          <rect x={48} y={680} width={364} height={72} rx={36} fill={CREAM} stroke={NAVY} strokeWidth={4} />
          <text x={230} y={728} textAnchor="middle" fontFamily={BLACK} fontSize={34} fill={NAVY}>{HANDLE}</text>
        </g>
      </G>
    ));
  }

  return <g>{els}</g>;
};
