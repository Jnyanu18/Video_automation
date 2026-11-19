import React from "react";
import { random } from "remotion";
import { C, COND, NUNITO, Stars } from "../../kit/palette";
import { Face } from "../../kit/coin";
import { WillowTop } from "./hook-kit";

// Kit for the qubit / aiwave / cta acts (v5): a pointing hand, the night sea with a Hokusai-like
// wave, AI things that ride it (chat window, image generator, robot arm), a neural-net glyph,
// a student surfer, the lab bench and the small "next topic" coins. World coords, all frame-driven.

// ---- A pointing hand with its sleeve. Fingertip at (x, y); the arm runs away from the tip along
// angle `a` (deg, 0 = arm to the right of the tip, hand pointing left). Thumb on top.
export const Hand: React.FC<{ x: number; y: number; a: number; s?: number; curl?: number }> = ({ x, y, a, s = 1, curl = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
    {/* soft cast shadow below the arm */}
    <path d="M40,40 L900,70 L900,170 L60,90Z" fill="#0C0526" opacity={0.3} filter="url(#soft14)" />
    {/* sleeve */}
    <path d="M150,-66 L900,-80 L900,82 L150,64 Q132,0 150,-66Z" fill="#4C3D9E" />
    <path d="M160,-56 L900,-66 L900,-40 L162,-34Z" fill="#7A68D0" opacity={0.7} />
    <path d="M300,-70 Q330,0 300,72" fill="none" stroke="#3A2D80" strokeWidth={6} opacity={0.6} />
    {/* cuff */}
    <path d="M128,-68 L176,-70 Q190,0 176,68 L128,66 Q112,0 128,-68Z" fill="#E9E2FF" />
    <path d="M132,-60 L170,-62 L168,-46 L132,-44Z" fill="#FFFFFF" opacity={0.6} />
    {/* back of the hand / fist */}
    <path d="M40,-46 Q60,-60 104,-56 L134,-52 Q148,0 134,54 L80,58 Q44,58 36,30 Z" fill="#E9A07A" />
    {/* curled fingers (knuckles under the index) */}
    {[-8, 16, 38].map((yy, i) => (
      <g key={i}>
        <ellipse cx={46 - i * 2} cy={yy} rx={22} ry={13} fill="#E9A07A" />
        <path d={`M${30 - i * 2},${yy + 4} Q${46 - i * 2},${yy + 12} ${62 - i * 2},${yy + 6}`} fill="none" stroke="#B9684B" strokeWidth={3} opacity={0.7} />
      </g>
    ))}
    {/* index finger, extended toward the tip (bends a little with `curl`) */}
    <g transform={`rotate(${curl * 14} 50 -34)`}>
      <path d="M50,-50 L6,-46 Q-6,-44 -6,-34 Q-6,-22 6,-21 L54,-20Z" fill="#F2B48E" />
      <ellipse cx={4} cy={-38} rx={9} ry={6} fill="#FFD8C0" opacity={0.85} />
      <path d="M26,-48 L26,-22" stroke="#C97A5C" strokeWidth={2.5} opacity={0.5} />
    </g>
    {/* thumb along the top */}
    <path d="M110,-56 Q84,-74 56,-62 Q46,-56 56,-50 Q84,-48 112,-40Z" fill="#F2B48E" />
    <path d="M108,-52 Q86,-64 62,-58" fill="none" stroke="#FFD8C0" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
    {/* rim light from the coin's side */}
    <path d="M40,-46 Q60,-60 104,-56" fill="none" stroke="#FFE38A" strokeWidth={3} opacity={0.6} />
  </g>
);

// ---- The night sea (world 1080x1920, drawn wider than the frame). horizon = sea line y.
export const SeaWorld: React.FC<{ fr: number; horizon?: number; dawn?: number }> = ({ fr, horizon = 1180, dawn = 0 }) => (
  <g>
    <defs>
      <linearGradient id="seaSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#0A1240" />
        <stop offset="0.6" stopColor="#173C80" />
        <stop offset="1" stopColor={dawn > 0 ? "#6A4A9A" : "#2A5A9E"} />
      </linearGradient>
      <linearGradient id="seaDeep" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1B4C86" />
        <stop offset="1" stopColor="#0C1A44" />
      </linearGradient>
    </defs>
    <rect x={-900} y={-1400} width={2880} height={horizon + 1400} fill="url(#seaSky)" />
    <Stars seed="seaS" n={110} x={-500} y={-600} w={2080} h={horizon + 400} fr={fr} />
    {/* dawn band on the horizon (gold light from the right) */}
    {dawn > 0 && <ellipse cx={760} cy={horizon} rx={900} ry={260} fill="url(#glowGold)" opacity={0.9 * dawn} />}
    {/* moon */}
    <circle cx={830} cy={380} r={180} fill="url(#glowCold)" opacity={0.55} />
    <circle cx={830} cy={380} r={62} fill="#EAF0FF" />
    <circle cx={812} cy={366} r={14} fill="#C9D4FF" />
    <circle cx={850} cy={400} r={9} fill="#C9D4FF" />
    {/* a tiny snow-capped mountain on the horizon (Hokusai nod) */}
    <path d={`M120,${horizon} L250,${horizon - 120} L380,${horizon}Z`} fill="#3A3A8E" />
    <path d={`M220,${horizon - 90} L250,${horizon - 120} L280,${horizon - 90} L262,${horizon - 96} L250,${horizon - 84} L238,${horizon - 96}Z`} fill="#E6ECFF" />
    {/* sea */}
    <rect x={-900} y={horizon} width={2880} height={2000} fill="url(#seaDeep)" />
    <ellipse cx={830} cy={horizon + 40} rx={60} ry={8} fill="#EAF0FF" opacity={0.45} />
    {Array.from({ length: 16 }, (_, i) => {
      const y = horizon + 18 + i * i * 4.5;
      const off = ((fr * (1 + i * 0.2) + i * 97) % 300) - 150;
      return <path key={i} d={`M${-600 + off},${y} q60,-${6 + i} 120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0`} fill="none" stroke="#5FA0D8" strokeWidth={2 + i * 0.4} opacity={0.18 + i * 0.01} />;
    })}
  </g>
);

// ---- A great wave (Hokusai-like), curling to the right. Crest at (cx, cy), sea level S.
// Returns the face curve so things can ride it: faceAt(t) t 0 (under the lip) .. 1 (the trough).
const bz = (p: number[][], t: number) => {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k]) as [number, number];
};
export const waveGeo = (cx: number, cy: number, S: number) => {
  const H = S - cy;
  const face = [[cx + 0.26 * H, cy + 0.22 * H], [cx + 0.16 * H, cy + 0.32 * H], [cx + 0.3 * H, cy + 0.82 * H], [cx + 0.9 * H + 200, S]];
  const lip = [[cx - 0.12 * H, cy + 0.02 * H], [cx + 0.05 * H, cy - 0.08 * H], [cx + 0.35 * H, cy - 0.06 * H], [cx + 0.48 * H, cy + 0.12 * H]];
  return {
    H,
    faceAt: (t: number) => bz(face, t),
    lipAt: (t: number) => bz(lip, t),
    d:
      `M${cx - 1.6 * H - 300},${S} C${cx - 0.9 * H},${S - 0.05 * H} ${cx - 0.55 * H},${cy + 0.35 * H} ${cx - 0.12 * H},${cy + 0.02 * H} ` +
      `C${cx + 0.05 * H},${cy - 0.08 * H} ${cx + 0.35 * H},${cy - 0.06 * H} ${cx + 0.48 * H},${cy + 0.12 * H} ` +
      `C${cx + 0.56 * H},${cy + 0.24 * H} ${cx + 0.5 * H},${cy + 0.36 * H} ${cx + 0.4 * H},${cy + 0.33 * H} ` +
      `C${cx + 0.44 * H},${cy + 0.24 * H} ${cx + 0.36 * H},${cy + 0.17 * H} ${cx + 0.26 * H},${cy + 0.22 * H} ` +
      `C${cx + 0.16 * H},${cy + 0.32 * H} ${cx + 0.3 * H},${cy + 0.82 * H} ${cx + 0.9 * H + 200},${S} L${cx + 0.9 * H + 900},${S + 1400} L${cx - 1.6 * H - 900},${S + 1400}Z`,
  };
};
export const Wave: React.FC<{ id: string; fr: number; cx: number; cy: number; S: number; gold?: number; foam?: number }> = ({ id, fr, cx, cy, S, gold = 0.6, foam = 1 }) => {
  const g = waveGeo(cx, cy, S), H = g.H;
  return (
    <g>
      <defs>
        <linearGradient id={`wv${id}`} gradientUnits="userSpaceOnUse" x1={cx} y1={cy} x2={cx - 200} y2={S + 200}>
          <stop offset="0" stopColor="#4FD8C6" />
          <stop offset="0.3" stopColor="#1E8C88" />
          <stop offset="0.75" stopColor="#164E78" />
          <stop offset="1" stopColor="#0E2552" />
        </linearGradient>
        <clipPath id={`wc${id}`}><path d={g.d} /></clipPath>
      </defs>
      {/* the wave's shadow on the sea ahead of it */}
      <ellipse cx={cx + 0.7 * H} cy={S + 40} rx={0.8 * H} ry={60} fill="#06102E" opacity={0.45} filter="url(#soft14)" />
      <path d={g.d} fill={`url(#wv${id})`} />
      <g clipPath={`url(#wc${id})`}>
        {/* inner bands following the face and the back (Hokusai stripes) */}
        {Array.from({ length: 7 }, (_, i) => {
          const k = (i + 1) * 0.07 * H;
          const sh = Math.sin(fr * 0.05 + i) * 6;
          return (
            <path key={i} d={`M${cx - 0.1 * H - k},${cy + 0.06 * H + k * 0.6} C${cx - 0.5 * H - k},${cy + 0.4 * H + k * 0.5} ${cx - 0.9 * H - k},${S - 0.1 * H} ${cx - 1.5 * H - k},${S + 20} M${cx + 0.2 * H - k * 0.4 + sh},${cy + 0.3 * H + k * 0.5} C${cx + 0.18 * H - k * 0.3},${cy + 0.5 * H + k * 0.4} ${cx + 0.32 * H - k * 0.2},${cy + 0.86 * H} ${cx + 0.9 * H + 200 - k},${S + 10}`} fill="none" stroke={i % 2 ? "#7FE9DA" : "#0F3A66"} strokeWidth={i % 2 ? 6 : 14} opacity={i % 2 ? 0.45 : 0.35} />
          );
        })}
        {/* gold light raking the crest */}
        <ellipse cx={cx + 0.1 * H} cy={cy + 0.05 * H} rx={0.5 * H} ry={0.25 * H} fill="url(#glowGold)" opacity={gold} />
      </g>
      {/* foam claws along the lip and its curl */}
      {Array.from({ length: 22 }, (_, i) => {
        const t = i / 21;
        const [x, y] = g.lipAt(0.15 + t * 0.85);
        const r = (10 + 18 * Math.sin(Math.PI * t)) * (H / 800);
        const wob = Math.sin(fr * 0.25 + i * 1.7) * 3;
        return (
          <g key={i} opacity={foam}>
            <circle cx={x + wob} cy={y - r * 0.2} r={r} fill="#EAF7F2" />
            <path d={`M${x - r},${y} q${r * 0.5},${-r * 1.6} ${r * 1.4},${-r * 1.1}`} fill="none" stroke="#FFFFFF" strokeWidth={r * 0.35} strokeLinecap="round" opacity={0.9} />
          </g>
        );
      })}
      {/* spray flung off the lip */}
      {Array.from({ length: 26 }, (_, i) => {
        const ph = (fr * 0.03 + random(`spr${id}${i}`)) % 1;
        const [x, y] = g.lipAt(0.4 + random(`spx${id}${i}`) * 0.6);
        return <circle key={i} cx={x + ph * 120 * (0.4 + random(`sv${i}`))} cy={y - 40 * Math.sin(Math.PI * ph) + ph * 60} r={(2 + random(`sr${i}`) * 5) * (1 - ph * 0.6)} fill="#EAF7F2" opacity={foam * 0.8 * (1 - ph)} />;
      })}
    </g>
  );
};

// ---- A chat app window with a reply streaming in. (x, y) = centre, w ~ 300*s. k = stream 0..1.
const Win: React.FC<{ w: number; h: number; title?: string; children?: React.ReactNode }> = ({ w, h, children }) => (
  <g>
    <rect x={-w / 2 + 8} y={-h / 2 + 14} width={w} height={h} rx={22} fill="#06102E" opacity={0.45} filter="url(#soft8)" />
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={22} fill="#F7F4FF" />
    <rect x={-w / 2} y={-h / 2} width={w} height={40} rx={22} fill="#E1DAF7" />
    <rect x={-w / 2} y={-h / 2 + 22} width={w} height={18} fill="#E1DAF7" />
    {["#FF8A78", "#FFCB57", "#35C3B4"].map((c, i) => <circle key={i} cx={-w / 2 + 24 + i * 22} cy={-h / 2 + 20} r={7} fill={c} />)}
    {children}
  </g>
);
export const ChatTile: React.FC<{ x: number; y: number; s?: number; k: number; rot?: number; fr: number }> = ({ x, y, s = 1, k, rot = 0, fr }) => {
  const lines = [200, 230, 170, 210];
  const shown = k * lines.length;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <Win w={320} h={250}>
        {/* the user's prompt bubble */}
        <rect x={-10} y={-90} width={140} height={44} rx={18} fill="#7A64E0" />
        <rect x={6} y={-74} width={100} height={10} rx={5} fill="#EDE8FF" />
        {/* assistant avatar: a little four-point sparkle */}
        <circle cx={-128} cy={-18} r={18} fill="#2B2470" />
        <path d="M-128,-30 Q-128,-18 -116,-18 Q-128,-18 -128,-6 Q-128,-18 -140,-18 Q-128,-18 -128,-30Z" fill="#FFCB57" />
        {lines.map((L, i) => {
          const p = Math.max(0, Math.min(1, shown - i));
          return p > 0 ? <rect key={i} x={-100} y={-30 + i * 26} width={L * p} height={12} rx={6} fill="#5B4FA0" opacity={0.75} /> : null;
        })}
        {/* the streaming cursor */}
        {k < 1 && (() => {
          const i = Math.min(lines.length - 1, Math.floor(shown));
          const p = shown - i;
          return <rect x={-100 + lines[i] * Math.min(1, p) + 4} y={-32 + i * 26} width={9} height={16} rx={2} fill="#2B2470" opacity={Math.sin(fr * 0.6) > -0.3 ? 1 : 0} />;
        })()}
        {/* the input bar */}
        <rect x={-140} y={84} width={280} height={30} rx={15} fill="#E8E3F8" />
        <circle cx={124} cy={99} r={11} fill="#2B2470" />
      </Win>
    </g>
  );
};

// ---- An image generator window: a picture (a mountain lake at sunset) resolving tile by tile out
// of noise. k 0..1 = how many of the 16 tiles are done.
export const ImageGenTile: React.FC<{ x: number; y: number; s?: number; k: number; rot?: number; fr: number }> = ({ x, y, s = 1, k, rot = 0, fr }) => {
  const n = 4, W = 240, cell = W / n;
  const order = [0, 1, 4, 2, 5, 8, 3, 6, 9, 12, 7, 10, 13, 11, 14, 15];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <Win w={290} h={330}>
        <clipPath id={`ig${Math.round(x)}`}><rect x={-W / 2} y={-118} width={W} height={W} rx={10} /></clipPath>
        <g clipPath={`url(#ig${Math.round(x)})`}>
          <g transform={`translate(${-W / 2} -118)`}>
            <rect width={W} height={W} fill="#FF9E6A" />
            <rect width={W} height={110} fill="#F26A7E" />
            <rect width={W} height={50} fill="#7A4FC0" />
            <circle cx={150} cy={110} r={34} fill="#FFE38A" />
            <path d="M0,170 L60,90 L100,140 L150,70 L240,170Z" fill="#3B2B8E" />
            <path d="M138,86 L150,70 L162,86Z" fill="#F7F4FF" />
            <rect y={170} width={W} height={70} fill="#2E6FB0" />
            <rect x={110} y={182} width={80} height={6} rx={3} fill="#FFE38A" opacity={0.7} />
            <rect x={130} y={200} width={40} height={5} rx={2.5} fill="#FFE38A" opacity={0.5} />
            {/* tiles not yet generated: noise */}
            {order.map((c, j) => {
              if (j < k * 16) return null;
              const cxp = (c % n) * cell, cyp = Math.floor(c / n) * cell;
              return (
                <g key={c}>
                  <rect x={cxp} y={cyp} width={cell} height={cell} fill="#6E6696" />
                  {Array.from({ length: 10 }, (_, q) => <rect key={q} x={cxp + random(`ng${c}${q}${Math.floor(fr / 3)}`) * (cell - 8)} y={cyp + random(`nh${c}${q}${Math.floor(fr / 3)}`) * (cell - 8)} width={8} height={8} fill={q % 2 ? "#A9A1D0" : "#4A4378"} />)}
                </g>
              );
            })}
          </g>
        </g>
        <rect x={-120} y={132} width={190} height={22} rx={11} fill="#E8E3F8" />
        <rect x={-108} y={139} width={120} height={8} rx={4} fill="#9C93C8" />
        <rect x={80} y={130} width={44} height={26} rx={13} fill="#7A64E0" />
      </Win>
    </g>
  );
};

// ---- An industrial robot arm on a small round plinth, picking up a box. ph = motion phase.
export const RobotArm: React.FC<{ x: number; y: number; s?: number; ph: number; rot?: number }> = ({ x, y, s = 1, ph, rot = 0 }) => {
  const a1 = -60 + 18 * Math.sin(ph), a2 = 70 + 26 * Math.sin(ph + 1.2), a3 = 40 + 20 * Math.sin(ph + 2.2);
  const L1 = 130, L2 = 110;
  const r = (d: number) => (d * Math.PI) / 180;
  const j1: [number, number] = [0, -60];
  const j2: [number, number] = [j1[0] + Math.cos(r(a1)) * L1, j1[1] + Math.sin(r(a1)) * L1];
  const j3: [number, number] = [j2[0] + Math.cos(r(a1 + a2)) * L2, j2[1] + Math.sin(r(a1 + a2)) * L2];
  const seg = (p: [number, number], q: [number, number], w: number) => (
    <g>
      <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#B9852F" strokeWidth={w + 8} strokeLinecap="round" />
      <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#F2A23A" strokeWidth={w} strokeLinecap="round" />
      <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#FFD58A" strokeWidth={w * 0.25} strokeLinecap="round" transform="translate(-3 -4)" opacity={0.8} />
    </g>
  );
  const ga = a1 + a2 + a3;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <ellipse cx={0} cy={6} rx={120} ry={26} fill="#06102E" opacity={0.4} filter="url(#soft8)" />
      <path d="M-90,0 L-70,-40 L70,-40 L90,0Z" fill="#3B3576" />
      <rect x={-100} y={-6} width={200} height={16} rx={8} fill="#2A2558" />
      <rect x={-34} y={-70} width={68} height={36} rx={10} fill="#4A4388" />
      {seg(j1, j2, 34)}
      {seg(j2, j3, 26)}
      {[j1, j2].map(([px, py], i) => <g key={i}><circle cx={px} cy={py} r={24} fill="#4A4388" /><circle cx={px} cy={py} r={11} fill={C.tealHi} /></g>)}
      <g transform={`translate(${j3[0]} ${j3[1]}) rotate(${ga})`}>
        <circle r={16} fill="#4A4388" />
        <rect x={10} y={-22} width={26} height={44} rx={6} fill="#8F88C9" />
        <rect x={34} y={-24} width={30} height={10} rx={4} fill="#CFC4F5" />
        <rect x={34} y={14} width={30} height={10} rx={4} fill="#CFC4F5" />
        <rect x={40} y={-14} width={30} height={28} rx={4} fill="#F4B860" />
        <path d="M40,0 L70,0" stroke="#C46F1D" strokeWidth={3} />
      </g>
    </g>
  );
};
// The robot arm as a tile (window with a small floor so it reads as a card riding the wave)
export const RobotTile: React.FC<{ x: number; y: number; s?: number; ph: number; rot?: number }> = ({ x, y, s = 1, ph, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <Win w={290} h={260}>
      <rect x={-135} y={-80} width={270} height={196} rx={10} fill="#2B2470" />
      <rect x={-135} y={60} width={270} height={56} fill="#3B3576" />
      {[-100, -40, 20, 80].map((xx) => <rect key={xx} x={xx} y={70} width={30} height={4} rx={2} fill="#5B5199" />)}
      <circle cx={-90} cy={-40} r={26} fill="url(#glowGold)" />
      <RobotArm x={10} y={66} s={0.62} ph={ph} />
    </Win>
  </g>
);

// ---- A neural-network glyph: layers of nodes joined by links; `pulse` 0..1 runs a wave of light
// left to right through it. (x, y) = centre.
export const NEURAL = [3, 5, 5, 2];
export const NeuralNet: React.FC<{ x: number; y: number; s?: number; fr: number; pulse: number; k?: number; grow?: number }> = ({ x, y, s = 1, fr, pulse, k = 1, grow = 1 }) => {
  const W = 360, H = 260;
  const pos = NEURAL.map((n, l) => Array.from({ length: n }, (_, i) => [-W / 2 + (l * W) / (NEURAL.length - 1), (i - (n - 1) / 2) * (H / 4.4)] as [number, number]));
  return (
    <g transform={`translate(${x} ${y}) scale(${s * k})`} opacity={Math.min(1, k * 1.5)}>
      <ellipse rx={W * 0.8} ry={H * 0.85} fill="url(#glowGold)" opacity={0.35 + 0.25 * pulse} />
      {pos.slice(0, -1).map((L, l) =>
        L.map(([x1, y1], i) =>
          pos[l + 1].map(([x2, y2], j) => {
            const lit = Math.max(0, 1 - Math.abs(pulse * (NEURAL.length + 1) - (l + 1)) * 1.2);
            const gk = Math.max(0, Math.min(1, grow * 3 - l * 0.9 - j * 0.12));
            return gk > 0 ? <line key={`${l}${i}${j}`} x1={x1} y1={y1} x2={x1 + (x2 - x1) * gk} y2={y1 + (y2 - y1) * gk} stroke={lit > 0.1 ? C.goldHi : "#A99AF0"} strokeWidth={2.5 + 2 * lit} opacity={0.5 + 0.5 * lit} /> : null;
          }),
        ),
      )}
      {pos.map((L, l) =>
        L.map(([nx, ny], i) => {
          const lit = Math.max(0, 1 - Math.abs(pulse * (NEURAL.length + 1) - (l + 0.5)) * 1.2);
          const tw = 0.5 + 0.5 * Math.sin(fr * 0.15 + l * 2 + i);
          return (
            <g key={`${l}n${i}`}>
              {lit > 0.1 && <circle cx={nx} cy={ny} r={34} fill="url(#glowGold)" opacity={lit} />}
              <circle cx={nx} cy={ny} r={17} fill={lit > 0.3 ? C.goldHi : "#CFC4F5"} />
              <circle cx={nx} cy={ny} r={9} fill={lit > 0.3 ? "#FFF6D8" : "#8C7CE8"} opacity={0.6 + 0.4 * tw} />
            </g>
          );
        }),
      )}
      <text x={0} y={H / 2 + 22} textAnchor="middle" fontFamily={NUNITO} fontWeight={900} fontSize={28} fill="#CFC4F5" letterSpacing={4}>AI</text>
    </g>
  );
};

// ---- A student surfing, side-on, riding to the right. Feet on the board at (0, 0), ~380 tall.
// toss 0..1 raises the right hand (the coin is drawn by the caller at the returned hand point).
export const studentHand = (toss: number): [number, number] => [70 + 40 * toss, -250 - 110 * toss];
export const Student: React.FC<{ x: number; y: number; s?: number; rot?: number; fr: number; toss: number; screen?: number; look?: number }> = ({ x, y, s = 1, rot = 0, fr, toss, screen = 1, look = 0 }) => {
  const bob = Math.sin(fr * 0.18) * 4;
  const [hx, hy] = studentHand(toss);
  const sh: [number, number] = [26, -222 + bob];
  const el: [number, number] = [sh[0] + (hx - sh[0]) * 0.5 + 34 - 30 * toss, sh[1] + (hy - sh[1]) * 0.5 + 34 - 20 * toss];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      {/* board */}
      <path d="M-150,6 Q-160,-12 -120,-14 L130,-14 Q190,-12 196,2 Q180,18 120,18 L-120,18 Q-150,18 -150,6Z" fill="#FFE38A" />
      <path d="M-140,4 L180,0" stroke="#F2678E" strokeWidth={8} />
      <path d="M-150,6 Q-150,18 -120,18 L120,18 Q180,18 196,2" fill="none" stroke="#C46F1D" strokeWidth={4} />
      {/* legs: knees bent in a surf stance */}
      <path d={`M-58,-14 L-70,${-70 + bob * 0.5} L-24,${-128 + bob}`} fill="none" stroke="#2E2A76" strokeWidth={34} strokeLinejoin="round" strokeLinecap="round" />
      <path d={`M62,-14 L48,${-72 + bob * 0.5} L14,${-128 + bob}`} fill="none" stroke="#3B3A8C" strokeWidth={34} strokeLinejoin="round" strokeLinecap="round" />
      <ellipse cx={-64} cy={-16} rx={30} ry={11} fill="#F7F4FF" />
      <ellipse cx={70} cy={-16} rx={30} ry={11} fill="#F7F4FF" />
      {/* hoodie */}
      <path d={`M-40,${-120 + bob} Q-50,${-200 + bob} -26,${-236 + bob} L36,${-236 + bob} Q56,${-196 + bob} 38,${-120 + bob}Z`} fill="#F2678E" />
      <path d={`M-30,${-226 + bob} Q0,${-206 + bob} 30,${-226 + bob}`} fill="none" stroke="#C94E78" strokeWidth={6} />
      <rect x={-34} y={-140 + bob} width={70} height={18} rx={8} fill="#D9557E" />
      {/* left arm: holding the open laptop out to the side, screen toward us */}
      <path d={`M-22,${-216 + bob} L-74,${-176 + bob} L-112,${-196 + bob}`} fill="none" stroke="#E2577F" strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" />
      <g transform={`translate(-150 ${-206 + bob}) rotate(-8)`}>
        <rect x={-74} y={-96} width={148} height={100} rx={10} fill="#2A2558" />
        <rect x={-66} y={-88} width={132} height={84} rx={6} fill="#141C4E" />
        <circle cx={0} cy={-46} r={60} fill="url(#glowTeal)" opacity={0.7 * screen} />
        {[0, 1, 2, 3].map((i) => <rect key={i} x={-56} y={-80 + i * 16} width={40 + ((i * 37) % 60)} height={7} rx={3.5} fill={i % 2 ? C.tealHi : "#8C7CE8"} opacity={0.8 * screen} />)}
        <path d="M-80,4 L80,4 L92,18 L-92,18Z" fill="#8E86C8" />
      </g>
      <ellipse cx={-112} cy={-196 + bob} rx={14} ry={12} fill="#C98C6A" />
      {/* head */}
      <g transform={`translate(6 ${-280 + bob}) rotate(${look * 10})`}>
        <rect x={-12} y={20} width={24} height={26} fill="#B27755" />
        <circle r={44} fill="#C98C6A" />
        <path d="M-46,-6 Q-50,-52 -4,-56 Q40,-58 48,-20 Q30,-30 6,-26 Q-20,-30 -30,-8 Q-36,0 -46,-6Z" fill="#1A1033" />
        <circle cx={22 - look * 14} cy={-2} r={5} fill="#1A1033" />
        <path d={`M${16 - look * 14},20 Q${26 - look * 14},28 ${34 - look * 14},18`} fill="none" stroke="#6B3A2A" strokeWidth={4} strokeLinecap="round" />
        <ellipse cx={-14} cy={4} rx={9} ry={12} fill="#B27755" />
      </g>
      {/* right arm, raising the coin */}
      <path d={`M${sh[0]},${sh[1]} L${el[0]},${el[1]} L${hx},${hy + bob}`} fill="none" stroke="#F2678E" strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={hx} cy={hy + bob} r={14} fill="#C98C6A" />
    </g>
  );
};

// ---- A small topic coin standing on its edge (the "next breakthroughs" shelf). icon: "ai" | "q" | "?".
export const TopicCoin: React.FC<{ x: number; y: number; R: number; icon: "ai" | "q" | "?"; th?: number; fr: number; lit?: number }> = ({ x, y, R, icon, th = 0.3, fr, lit = 1 }) => {
  const sx = Math.max(0.05, Math.abs(Math.cos(th)));
  const dx = Math.sin(th) * R * 0.12;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={R * 1.6} fill="url(#glowGold)" opacity={0.55 * lit} />
      <ellipse cx={dx} rx={R * sx} ry={R} fill={C.edge} />
      <rect x={Math.min(0, dx)} y={-R} width={Math.abs(dx)} height={2 * R} fill={C.edge} />
      <g transform={`scale(${(sx * R) / 100} ${R / 100})`}>
        <Face face={1}>
          {icon === "ai" && (
            <g>
              <rect x={-44} y={-44} width={88} height={88} rx={10} fill="#2B2470" />
              {[-30, -10, 10, 30].map((p) => (
                <g key={p} fill="#C46F1D">
                  <rect x={p - 4} y={-58} width={8} height={14} /><rect x={p - 4} y={44} width={8} height={14} />
                  <rect x={-58} y={p - 4} width={14} height={8} /><rect x={44} y={p - 4} width={14} height={8} />
                </g>
              ))}
              <text y={17} textAnchor="middle" fontFamily={COND} fontWeight={800} fontSize={50} fill={C.goldHi}>AI</text>
            </g>
          )}
          {icon === "q" && (
            <g transform="scale(0.2)">
              <WillowTop fr={fr} />
            </g>
          )}
          {icon === "?" && (
            <g>
              <circle r={54} fill="#2B2470" />
              <text y={30} textAnchor="middle" fontFamily={COND} fontWeight={800} fontSize={92} fill={C.goldHi}>?</text>
            </g>
          )}
        </Face>
      </g>
    </g>
  );
};
