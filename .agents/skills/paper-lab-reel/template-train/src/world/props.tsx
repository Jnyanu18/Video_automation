// Paper props for the CS-degree train set: hero train, four train cut-outs, track, the "AI" robot arm,
// the paper student with a ticket, ticket, diploma, magnifier, gear, balance scale, departure board.
// All SVG, deterministic from t. Cut-outs get a white sticker edge (stroke drawn under the fill).
import React from "react";
import { BLUE, GOLD, HAND, INK, RED, SERIF, TAPE, TYPE, back, boil, rnd, torn, twos } from "./kit";

const EDGE = "#fffdf6";

// draw children twice: once as a fat white outline (sticker edge), once normally
const Sticker: React.FC<{ children: React.ReactNode; w?: number; shadow?: boolean }> = ({ children, w = 12, shadow = true }) => (
  <g filter={shadow ? "url(#psh)" : undefined}>
    <g stroke={EDGE} strokeWidth={w} strokeLinejoin="round" fill={EDGE}>{children}</g>
    {children}
  </g>
);

const Wheel: React.FC<{ x: number; y: number; r: number; a: number; hub?: string }> = ({ x, y, r, a, hub = GOLD }) => (
  <g transform={`translate(${x} ${y}) rotate(${a})`}>
    <circle r={r} fill={INK} />
    <circle r={r * 0.72} fill="#3a3550" />
    {[0, 60, 120].map((d) => <rect key={d} x={-r * 0.7} y={-2} width={r * 1.4} height={4} fill="#8b86a0" transform={`rotate(${d})`} />)}
    <circle r={r * 0.28} fill={hub} />
  </g>
);

// Smoke puffs (cut paper circles) rising from x,y.
export const Smoke: React.FC<{ x: number; y: number; t: number; n?: number; color?: string; s?: number; seed?: string }> = ({ x, y, t, n = 4, color = "#f4f1ea", s = 1, seed = "sm" }) => {
  const tt = twos(t);
  return <g>{Array.from({ length: n }, (_, i) => {
    const ph = (tt * 0.9 + i / n) % 1;
    const r = (14 + ph * 34) * s;
    return <circle key={i} cx={x - ph * 70 * s + Math.sin(i * 2 + tt * 3) * 6} cy={y - ph * 130 * s} r={r} fill={color} opacity={0.95 * (1 - ph * 0.85)} stroke="#cfc6b4" strokeWidth={2} />;
  })}</g>;
};

// ---------- the hero train: red/gold locomotive + cream carriage. Origin = rail level, centre of the set.
// Carriage tile window centre is at local (-140, -100).
export const HERO_WINDOW = { x: -140, y: -100, w: 74, h: 52 };
export const HeroTrain: React.FC<{ x: number; y: number; s?: number; t: number; roll?: number; smoke?: number; window?: number }> = ({ x, y, s = 1, t, roll = 0, smoke = 0, window = 0 }) => {
  const tt = twos(t);
  const a = roll * 2.2; // wheel angle in degrees (roll = distance in px)
  const bob = 0; void tt;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {smoke > 0 && <g opacity={smoke}><Smoke x={210} y={-190} t={t} /></g>}
      <g transform={`translate(0 ${bob})`}>
        <Sticker>
          {/* carriage */}
          <rect x={-275} y={-158} width={262} height={124} rx={12} fill="#f3e7c9" />
          {/* loco cab + boiler */}
          <rect x={0} y={-178} width={98} height={146} rx={8} fill="#c8352b" />
          <rect x={80} y={-128} width={160} height={92} rx={40} fill="#c8352b" />
          <rect x={186} y={-188} width={30} height={64} fill={INK} />
          <path d="M236,-40 L274,-8 L236,-8 Z" fill="#5b5770" />
        </Sticker>
        {/* carriage details */}
        <rect x={-283} y={-170} width={278} height={20} rx={8} fill="#c8352b" />
        <rect x={-275} y={-70} width={262} height={10} fill={GOLD} />
        <rect x={-255} y={-126} width={60} height={50} rx={6} fill="#2b2a3d" />
        <rect x={-255} y={-126} width={60} height={14} rx={4} fill="#4c5a86" opacity={0.6} />
        {/* the tile window: lit warm when `window` > 0 */}
        <rect x={HERO_WINDOW.x - HERO_WINDOW.w / 2} y={HERO_WINDOW.y - HERO_WINDOW.h / 2} width={HERO_WINDOW.w} height={HERO_WINDOW.h} rx={6} fill={window > 0 ? `rgb(${255},${Math.round(200 + 30 * window)},${Math.round(110 + 40 * window)})` : "#2b2a3d"} />
        <rect x={HERO_WINDOW.x - HERO_WINDOW.w / 2 - 4} y={HERO_WINDOW.y - HERO_WINDOW.h / 2 - 4} width={HERO_WINDOW.w + 8} height={HERO_WINDOW.h + 8} rx={8} fill="none" stroke={GOLD} strokeWidth={4} />
        <rect x={-75} y={-126} width={44} height={50} rx={6} fill="#2b2a3d" />
        {/* loco details */}
        <rect x={0} y={-188} width={110} height={18} rx={6} fill={INK} />
        <rect x={18} y={-156} width={58} height={44} rx={6} fill="#ffe9a0" />
        <rect x={80} y={-74} width={160} height={8} fill={GOLD} />
        {[120, 160, 200].map((bx) => <rect key={bx} x={bx} y={-128} width={6} height={92} fill="#a12a22" />)}
        <circle cx={236} cy={-86} r={13} fill="#ffe9a0" stroke={GOLD} strokeWidth={4} />
        <rect x={180} y={-200} width={42} height={14} rx={4} fill={INK} />
        <rect x={-14} y={-56} width={22} height={8} fill="#5b5770" />
        {/* wheels */}
        {[-235, -55].map((wx) => <Wheel key={wx} x={wx} y={-16} r={22} a={a} />)}
        {[38, 118, 196].map((wx) => <Wheel key={wx} x={wx} y={-22} r={wx === 38 ? 26 : 24} a={a} />)}
        <line x1={38 + Math.cos((a * Math.PI) / 180) * 12} y1={-22 + Math.sin((a * Math.PI) / 180) * 12} x2={196 + Math.cos((a * Math.PI) / 180) * 12} y2={-22 + Math.sin((a * Math.PI) / 180) * 12} stroke="#c9c4d8" strokeWidth={6} strokeLinecap="round" />
      </g>
    </g>
  );
};

// ---------- four train cut-outs (origin = rail level centre, ~400 wide) ----------
export type TrainKind = "bullet" | "normal" | "hill" | "coal";
export const TrainCut: React.FC<{ kind: TrainKind; x: number; y: number; s?: number; t: number; rot?: number }> = ({ kind, x, y, s = 1, t, rot = 0 }) => {
  const tt = twos(t);
  const bob = 0, a = 0; void tt;
  let body: React.ReactNode, extra: React.ReactNode = null, wheels: number[] = [];
  if (kind === "bullet") {
    body = <Sticker><path d="M-190,-18 L-190,-104 Q-190,-122 -170,-122 L70,-122 Q160,-116 200,-34 Q204,-18 186,-18 Z" fill="#f7f8fb" /></Sticker>;
    extra = <>
      <path d="M-190,-62 L150,-62 Q178,-58 194,-44 L-190,-44 Z" fill={BLUE} />
      <path d="M-190,-36 L196,-36 L190,-26 L-190,-26 Z" fill="#9cb7e2" />
      {[-170, -120, -70, -20, 30].map((wx) => <rect key={wx} x={wx} y={-102} width={34} height={22} rx={5} fill="#2b3550" />)}
      <path d="M92,-110 Q140,-104 166,-80 L104,-80 Z" fill="#2b3550" />
    </>;
    wheels = [-150, -100, 90, 140];
  } else if (kind === "normal") {
    body = <Sticker><rect x={-190} y={-142} width={380} height={124} rx={14} fill="#3f8f5a" /></Sticker>;
    extra = <>
      <rect x={-190} y={-76} width={380} height={20} fill="#f3e7c9" />
      {[-170, -110, -50, 70, 130].map((wx) => <rect key={wx} x={wx} y={-124} width={40} height={36} rx={5} fill="#22303a" />)}
      <rect x={4} y={-128} width={44} height={100} rx={4} fill="#2f6e45" stroke="#22303a" strokeWidth={3} />
      <path d="M-40,-142 L-10,-176 L20,-142 M-10,-176 L-50,-176" stroke={INK} strokeWidth={4} fill="none" />
      <circle cx={178} cy={-40} r={8} fill="#ffe9a0" />
    </>;
    wheels = [-150, -110, 110, 150];
  } else if (kind === "hill") {
    // a little blue tank engine + red open coach, climbing (the card adds the mountain)
    body = <Sticker>
      <rect x={-190} y={-100} width={170} height={82} rx={10} fill="#d4483b" />
      <rect x={0} y={-150} width={80} height={132} rx={8} fill="#3d6fc4" />
      <rect x={60} y={-112} width={130} height={94} rx={30} fill="#3d6fc4" />
      <rect x={150} y={-176} width={26} height={70} fill={INK} />
    </Sticker>;
    extra = <>
      {[-170, -125, -80].map((wx) => <rect key={wx} x={wx} y={-92} width={30} height={26} rx={4} fill="#fbe6c4" />)}
      <rect x={-196} y={-106} width={182} height={12} rx={4} fill="#8a2c22" />
      <rect x={14} y={-136} width={50} height={40} rx={5} fill="#ffe9a0" />
      <rect x={0} y={-160} width={90} height={14} rx={5} fill={INK} />
      <rect x={60} y={-64} width={130} height={8} fill={GOLD} />
    </>;
    wheels = [-160, -50, 40, 110, 165];
  } else {
    // coal: black steam engine + two hoppers heaped with coal
    body = <Sticker>
      <rect x={-196} y={-92} width={120} height={74} rx={6} fill="#4a4652" />
      <rect x={-66} y={-92} width={110} height={74} rx={6} fill="#4a4652" />
      <rect x={52} y={-150} width={70} height={132} rx={6} fill="#26232e" />
      <rect x={110} y={-112} width={86} height={94} rx={28} fill="#26232e" />
      <rect x={160} y={-178} width={26} height={70} fill="#26232e" />
    </Sticker>;
    extra = <>
      {[-136, -11].map((cx) => <path key={cx} d={`M${cx - 58},-92 Q${cx - 30},-128 ${cx},-118 Q${cx + 30},-134 ${cx + 56},-92 Z`} fill="#111018" />)}
      {Array.from({ length: 10 }, (_, i) => <circle key={i} cx={-180 + i * 23 + (i > 4 ? 12 : 0)} cy={-100 - rnd(`cl${i}`) * 14} r={6 + rnd(`cr${i}`) * 4} fill="#2a2830" />)}
      <rect x={60} y={-140} width={44} height={36} rx={5} fill="#f2b36b" />
      <rect x={110} y={-66} width={86} height={8} fill={RED} />
      {[0, 1, 2].map((i) => <circle key={i} cx={176 - i * 26} cy={-200 - i * 30} r={16 + i * 8} fill="#8d8a92" opacity={0.85 - i * 0.2} />)}
    </>;
    wheels = [-170, -102, -40, 28, 82, 150];
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <g transform={`translate(0 ${bob})`}>
        {body}{extra}
        {wheels.map((wx) => <Wheel key={wx} x={wx} y={-16} r={kind === "bullet" ? 12 : 17} a={a} hub={kind === "coal" ? RED : GOLD} />)}
      </g>
    </g>
  );
};

// ---------- track: sleepers + two rails from x0 to x1 at rail level y (screen units) ----------
export const Track: React.FC<{ x0: number; x1: number; y: number; s?: number; seed?: string }> = ({ x0, x1, y, s = 1, seed = "tr" }) => {
  const n = Math.max(1, Math.floor((x1 - x0) / (34 * s)));
  return (
    <g filter="url(#psh)">
      {Array.from({ length: n }, (_, i) => <rect key={i} x={x0 + i * 34 * s + 4} y={y - 6 * s} width={18 * s} height={22 * s} rx={2} fill={i % 3 ? "#8a5a35" : "#7a4e2d"} transform={`rotate(${(rnd(`${seed}${i}`) - 0.5) * 4} ${x0 + i * 34 * s + 13} ${y})`} />)}
      <rect x={x0} y={y - 2 * s} width={x1 - x0} height={6 * s} fill="#8d939c" />
      <rect x={x0} y={y + 8 * s} width={x1 - x0} height={6 * s} fill="#6c727b" />
    </g>
  );
};

// ---------- the "AI" robot arm (cardboard + grey paper), 2-link IK from an off-frame shoulder ----------
export type ArmPose = { x: number; y: number; grip: number };
export const RobotArm: React.FC<{ t: number; shoulder: { x: number; y: number }; L1: number; L2: number; hand: ArmPose; flip?: boolean; tag?: string; s?: number }> = ({ t, shoulder, L1, L2, hand, flip = true, tag = "AI", s = 1 }) => {
  const tt = twos(t);
  const dx = hand.x - shoulder.x, dy = hand.y - shoulder.y, d = Math.max(1, Math.min(L1 + L2 - 1, Math.hypot(dx, dy)));
  const a = Math.atan2(dy, dx), b = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const sg = flip ? 1 : -1;
  const ex = shoulder.x + Math.cos(a + sg * b) * L1, ey = shoulder.y + Math.sin(a + sg * b) * L1;
  const seg = (x1: number, y1: number, x2: number, y2: number, w: number, fill: string) => {
    const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI, L = Math.hypot(x2 - x1, y2 - y1);
    return <g transform={`translate(${x1} ${y1}) rotate(${ang})`} filter="url(#psh)">
      <rect x={-w / 2} y={-w / 2} width={L + w} height={w} rx={w / 2.4} fill={fill} stroke="#5b6a80" strokeWidth={2} />
      {[0.15, 0.5, 0.85].map((q) => <circle key={q} cx={L * q} cy={-w / 2 + 9} r={4} fill="#8b97a8" />)}
      {[0.15, 0.5, 0.85].map((q) => <circle key={`b${q}`} cx={L * q} cy={w / 2 - 9} r={4} fill="#8b97a8" />)}
    </g>;
  };
  const wa = Math.atan2(hand.y - ey, hand.x - ex);
  const open = 1 - hand.grip;
  const finger = (k: number) => {
    const base = -0.55 + k * 0.55, spread = base * (0.5 + open * 0.8);
    return <g key={k} transform={`rotate(${(spread * 180) / Math.PI})`}>
      <rect x={34} y={-9} width={46} height={18} rx={8} fill="#c9d3e0" stroke="#5b6a80" strokeWidth={2} />
      <g transform={`translate(78 0) rotate(${(20 + hand.grip * 40) * (k === 0 ? -1 : 1) * (k === 1 ? 0.6 : 1)})`}><rect x={0} y={-8} width={36} height={16} rx={7} fill="#c9d3e0" stroke="#5b6a80" strokeWidth={2} /></g>
    </g>;
  };
  return (
    <g>
      {seg(shoulder.x, shoulder.y, ex, ey, 84 * s, "#a9b6c8")}
      {seg(ex, ey, hand.x, hand.y, 68 * s, "#b8c4d4")}
      <circle cx={ex} cy={ey} r={40 * s} fill="#8b97a8" stroke="#5b6a80" strokeWidth={3} />
      <circle cx={ex} cy={ey} r={9 * s} fill="#5b6a80" />
      <g transform={`translate(${(ex + hand.x) / 2} ${(ey + hand.y) / 2 + 40 * s}) rotate(-8)`}>
        <line x1={0} y1={-40 * s} x2={0} y2={-8} stroke="#8a6a3a" strokeWidth={2} />
        <g filter="url(#psh)"><path d={torn(100, 64, "aitag", "lr", 3)} fill="#fff4cf" /><text textAnchor="middle" y={18} fontFamily={TYPE} fontSize={46} fill={INK}>{tag}</text></g>
      </g>
      <g transform={`translate(${hand.x} ${hand.y}) rotate(${(wa * 180) / Math.PI}) scale(${1.45 * s})`} filter="url(#psh)">
        <rect x={-10} y={-38} width={56} height={76} rx={14} fill="#c9d3e0" stroke="#5b6a80" strokeWidth={2.5} />
        {[0, 1, 2].map(finger)}
        <g transform={`rotate(${70 - hand.grip * 30})`}><rect x={20} y={-8} width={44} height={16} rx={7} fill="#c9d3e0" stroke="#5b6a80" strokeWidth={2} /></g>
      </g>
    </g>
  );
};

// ---------- the paper student (origin at the feet). raise 0..1 lifts the ticket arm; look -1..1 ----------
export const Student: React.FC<{ x: number; y: number; s?: number; t: number; raise?: number; ticket?: boolean; scroll?: boolean; look?: number }> = ({ x, y, s = 1, t, raise = 0, ticket = true, scroll = false, look = 0 }) => {
  const tt = twos(t);
  const sway = 0; void tt;
  const armA = -20 - raise * 110; // degrees from hanging down (positive = forward/right)
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${sway})`}>
      <Sticker w={14}>
        {/* legs */}
        <rect x={-34} y={-120} width={30} height={120} rx={10} fill="#2f3550" />
        <rect x={6} y={-120} width={30} height={120} rx={10} fill="#2f3550" />
        {/* hoodie body */}
        <path d="M-62,-110 Q-66,-210 -30,-226 L30,-226 Q66,-210 62,-110 Z" fill="#6b6fa8" />
        {/* head */}
        <circle cx={0} cy={-262} r={38} fill="#c98b62" />
        <path d="M-40,-270 Q-46,-312 -10,-306 Q4,-322 22,-308 Q50,-312 42,-272 Q36,-292 14,-290 Q-6,-298 -24,-286 Q-36,-290 -40,-270 Z" fill="#1d1a22" />
      </Sticker>
      {/* face */}
      <circle cx={-12 + look * 6} cy={-262} r={4} fill={INK} />
      <circle cx={14 + look * 6} cy={-262} r={4} fill={INK} />
      <circle cx={-12 + look * 6} cy={-262} r={11} fill="none" stroke={INK} strokeWidth={2.5} />
      <circle cx={14 + look * 6} cy={-262} r={11} fill="none" stroke={INK} strokeWidth={2.5} />
      <path d={`M${-9 + look * 5},-240 Q${2 + look * 5},-232 ${12 + look * 5},-240`} stroke="#6b3a28" strokeWidth={3} fill="none" strokeLinecap="round" />
      {/* hood + pocket */}
      <path d="M-28,-226 Q0,-206 28,-226" stroke="#4f5288" strokeWidth={5} fill="none" />
      <rect x={-30} y={-160} width={60} height={30} rx={8} fill="#5d6198" />
      {/* other arm */}
      <rect x={-72} y={-214} width={22} height={92} rx={10} fill="#5d6198" transform="rotate(8 -60 -210)" />
      {/* ticket arm */}
      <g transform={`translate(52 -208) rotate(${armA})`}>
        <rect x={-11} y={0} width={22} height={92} rx={10} fill="#5d6198" stroke={EDGE} strokeWidth={4} />
        <circle cx={0} cy={96} r={13} fill="#c98b62" />
        {ticket && <g transform={`translate(0 110) rotate(${-armA - 8})`}><MiniTicket /></g>}
        {scroll && <g transform={`translate(0 104) rotate(${-armA - 70})`}>
          <rect x={-14} y={-40} width={28} height={80} rx={6} fill="#fffaf0" stroke="#c9b892" strokeWidth={2} />
          <rect x={-16} y={-6} width={32} height={10} fill={RED} />
        </g>}
      </g>
    </g>
  );
};

const MiniTicket: React.FC = () => (
  <g filter="url(#psh)">
    <path d="M-34,-20 H34 V-6 A6,6 0 0 0 34,6 V20 H-34 V6 A6,6 0 0 0 -34,-6 Z" fill={TAPE} stroke="#c9a94a" strokeWidth={1.5} />
    <line x1={-14} y1={-18} x2={-14} y2={18} stroke="#a8862e" strokeWidth={2} strokeDasharray="3 3" />
    <rect x={-6} y={-8} width={32} height={5} fill="#a8862e" />
    <rect x={-6} y={3} width={22} height={5} fill="#a8862e" />
  </g>
);

// ---------- a paper ticket (centred), notched ends + perforation ----------
export const Ticket: React.FC<{ x: number; y: number; w: number; h: number; rot?: number; s?: number; fill?: string; children?: React.ReactNode }> = ({ x, y, w, h, rot = 0, s = 1, fill = "#fbe7a1", children }) => {
  const a = w / 2, b = h / 2, n = h * 0.14;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${Math.max(0.001, s)})`}>
      <path filter="url(#psh2)" d={`M${-a},${-b} H${a} V${-n} A${n},${n} 0 0 0 ${a},${n} V${b} H${-a} V${n} A${n},${n} 0 0 0 ${-a},${-n} Z`} fill={fill} stroke="#c9a94a" strokeWidth={2} />
      <line x1={-a + w * 0.24} y1={-b + 8} x2={-a + w * 0.24} y2={b - 8} stroke="#a8862e" strokeWidth={3} strokeDasharray="6 7" />
      {children}
    </g>
  );
};

// ---------- a rolled diploma (centred) ----------
export const Diploma: React.FC<{ x: number; y: number; w?: number; rot?: number; s?: number; unroll?: number; label?: string; t: number }> = ({ x, y, w = 380, rot = 0, s = 1, unroll = 1, label = "CS DEGREE", t }) => {
  const ww = Math.max(40, w * unroll), h = 150;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} filter="url(#psh)">
      <rect x={-ww / 2} y={-h / 2} width={ww} height={h} fill="#fffaf0" />
      <rect x={-ww / 2 + 10} y={-h / 2 + 10} width={ww - 20} height={h - 20} fill="none" stroke={GOLD} strokeWidth={3} />
      {unroll > 0.6 && <g opacity={Math.min(1, (unroll - 0.6) / 0.3)}>
        <text textAnchor="middle" y={4} fontFamily={SERIF} fontSize={46} fill={INK}>{label}</text>
        <rect x={-ww * 0.3} y={24} width={ww * 0.6} height={4} fill="#a39c8c" />
        <rect x={-ww * 0.22} y={38} width={ww * 0.44} height={4} fill="#a39c8c" />
      </g>}
      {[-1, 1].map((k) => <g key={k} transform={`translate(${(k * ww) / 2} 0)`}>
        <rect x={-16} y={-h / 2 - 8} width={32} height={h + 16} rx={14} fill="#f1e2bf" stroke="#c9b892" strokeWidth={2} />
        <ellipse cx={0} cy={-h / 2 - 8} rx={16} ry={6} fill="#e3cfa2" />
      </g>)}
      {unroll > 0.9 && <g transform={`translate(${ww / 2 - 70} ${h / 2 - 10}) rotate(0)`}>
        <path d="M-12,0 L-26,56 L-10,46 L0,62 L4,0 Z" fill={RED} />
        <path d="M12,0 L26,56 L10,46 L0,62 L-4,0 Z" fill="#b8241b" />
        <circle r={26} fill={GOLD} stroke="#a8780f" strokeWidth={3} />
        <circle r={16} fill="none" stroke="#ffe9a0" strokeWidth={2} />
      </g>}
    </g>
  );
};

// ---------- magnifying glass (lens centre at x,y) ----------
export const Magnifier: React.FC<{ x: number; y: number; r?: number; rot?: number }> = ({ x, y, r = 70, rot = 35 }) => (
  <g transform={`translate(${x} ${y})`} filter="url(#psh)">
    <g transform={`rotate(${rot})`}><rect x={r * 0.95} y={-14} width={r * 1.5} height={28} rx={12} fill="#7a4e2d" /><rect x={r * 0.9} y={-10} width={24} height={20} fill="#b8bec8" /></g>
    <circle r={r} fill="#dff1ff" opacity={0.35} />
    <circle r={r} fill="none" stroke={INK} strokeWidth={12} />
    <path d={`M${-r * 0.5},${-r * 0.35} A${r * 0.6},${r * 0.6} 0 0 1 ${-r * 0.1},${-r * 0.62}`} stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" />
  </g>
);

// ---------- cog (paper cut) ----------
export const Gear: React.FC<{ x: number; y: number; r: number; a: number; fill?: string }> = ({ x, y, r, a, fill = GOLD }) => {
  const n = 10, pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const ang = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.78 : r;
    pts.push(`${(Math.cos(ang - 0.08) * rr).toFixed(1)},${(Math.sin(ang - 0.08) * rr).toFixed(1)}`, `${(Math.cos(ang + 0.08) * rr).toFixed(1)},${(Math.sin(ang + 0.08) * rr).toFixed(1)}`);
  }
  return <g transform={`translate(${x} ${y}) rotate(${a})`} filter="url(#psh)"><path d={"M" + pts.join("L") + "Z"} fill={fill} stroke="#8a6a1a" strokeWidth={2} /><circle r={r * 0.3} fill="#fffaf0" stroke="#8a6a1a" strokeWidth={2} /></g>;
};

// ---------- departure board (black paper with typed white letters), centred ----------
export const Departures: React.FC<{ x: number; y: number; w: number; s?: number; text: string; t: number; flip?: number }> = ({ x, y, w, s = 1, text, t, flip = 1 }) => {
  const shown = text.slice(0, Math.round(text.length * Math.max(0, Math.min(1, flip))));
  return (
    <g transform={`translate(${x} ${y}) scale(${Math.max(0.001, s)})`}>
      <line x1={-w * 0.3} y1={-80} x2={-w * 0.3} y2={-44} stroke="#5b5770" strokeWidth={6} />
      <line x1={w * 0.3} y1={-80} x2={w * 0.3} y2={-44} stroke="#5b5770" strokeWidth={6} />
      <g filter="url(#psh)"><path d={torn(w, 92, "dep", "lr", 3)} fill="#22202c" /></g>
      <text textAnchor="middle" y={15} fontFamily={TYPE} fontSize={42} fill="#fff6d8" letterSpacing={3}>{shown}{shown.length < text.length && Math.floor(twos(t) * 7) % 2 ? "_" : ""}</text>
    </g>
  );
};

// ---------- cut-paper "?" with white edge ----------
export const QMark: React.FC<{ x: number; y: number; s: number; rot?: number; color?: string; size?: number }> = ({ x, y, s, rot = 0, color = RED, size = 160 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${Math.max(0.001, s)})`} filter="url(#psh2)">
    <text textAnchor="middle" y={size * 0.33} fontFamily={SERIF} fontSize={size} fill="#fff" stroke="#fff" strokeWidth={size * 0.1} strokeLinejoin="round">?</text>
    <text textAnchor="middle" y={size * 0.33} fontFamily={SERIF} fontSize={size} fill={color}>?</text>
  </g>
);

// handwritten check mark path at x,y (size ~60)
export const checkPath = (x: number, y: number, k = 1) => `M${x - 26 * k},${y} L${x - 6 * k},${y + 22 * k} L${x + 34 * k},${y - 30 * k}`;

// a typed label on a torn paper tag, centred
export const Tag: React.FC<{ x: number; y: number; text: string; size?: number; rot?: number; s?: number; fill?: string; color?: string; seed?: string }> = ({ x, y, text, size = 36, rot = 0, s = 1, fill = "#fffaf0", color = INK, seed }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${Math.max(0.001, s)})`} filter="url(#psh)">
    <path d={torn(text.length * size * 0.62 + size * 1.1, size * 1.75, seed ?? `tag${text}`, "lr", size * 0.14)} fill={fill} />
    <text textAnchor="middle" y={size * 0.36} fontFamily={TYPE} fontSize={size} fill={color}>{text}</text>
  </g>
);

export const HandText: React.FC<{ x: number; y: number; text: string; size?: number; p?: number; color?: string; anchor?: "start" | "middle"; rot?: number; id: string }> = ({ x, y, text, size = 52, p = 1, color = INK, anchor = "start", rot = 0, id }) => {
  if (p <= 0) return null;
  const w = text.length * size * 0.5 + 20;
  const x0 = anchor === "middle" ? x - w / 2 : x - 6;
  return <g transform={`rotate(${rot} ${x} ${y})`}>
    <clipPath id={id}><rect x={x0} y={y - size} width={w * Math.min(1, p)} height={size * 1.5} /></clipPath>
    <text x={x} y={y} textAnchor={anchor} fontFamily={HAND} fontSize={size} fill={color} clipPath={`url(#${id})`}>{text}</text>
  </g>;
};

export { back, boil };
