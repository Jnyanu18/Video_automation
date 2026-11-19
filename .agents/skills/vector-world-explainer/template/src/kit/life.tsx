import React from "react";
import { random } from "remotion";
import { C } from "./palette";

// Secondary-motion and lighting helpers for the middle acts (bits..cold). World coords, all
// deterministic from the frame number.

// Steam curling up from a mug seen from the front. (x, y) = the mug's rim centre.
export const Steam: React.FC<{ fr: number; x: number; y: number; s?: number; o?: number }> = ({ fr, x, y, s = 1, o = 1 }) => (
  <g opacity={o} filter="url(#soft8)">
    {[0, 1, 2].map((i) => {
      const t = ((fr * 0.012 + i / 3) % 1);
      const h = 220 * s;
      const yy = y - t * h;
      const sway = Math.sin(fr * 0.05 + i * 2.1) * 26 * s;
      const d = `M${x - 20 * s + i * 20 * s},${y} C${x - 40 * s + sway},${y - h * 0.3} ${x + 40 * s - sway},${y - h * 0.6} ${x + sway * 0.6},${yy - 40 * s}`;
      return <path key={i} d={d} fill="none" stroke="#EDE6FF" strokeWidth={14 * s * (1 - t * 0.5)} strokeLinecap="round" opacity={0.22 * Math.sin(Math.PI * t)} />;
    })}
  </g>
);

// Steam seen from straight above: soft rings drifting off the cup and fading.
export const SteamTop: React.FC<{ fr: number; x: number; y: number; o?: number }> = ({ fr, x, y, o = 1 }) => (
  <g opacity={o} filter="url(#soft8)">
    {[0, 1, 2, 3].map((i) => {
      const t = (fr * 0.01 + i / 4) % 1;
      const a = i * 1.9 + fr * 0.01;
      return <ellipse key={i} cx={x + Math.cos(a) * 60 * t - 40 * t} cy={y + Math.sin(a) * 40 * t + 60 * t} rx={50 + 90 * t} ry={34 + 60 * t} fill="none" stroke="#F1EBFF" strokeWidth={16 * (1 - t)} opacity={0.3 * Math.sin(Math.PI * t)} />;
    })}
  </g>
);

// Dust motes drifting slowly in a light (a box), twinkling as they turn.
export const Motes: React.FC<{ fr: number; x: number; y: number; w: number; h: number; n?: number; seed?: string; o?: number; c?: string }> = ({ fr, x, y, w, h, n = 24, seed = "mt", o = 1, c = "#FFF1CC" }) => (
  <g opacity={o}>
    {Array.from({ length: n }, (_, i) => {
      const px = x + ((random(`${seed}x${i}`) * w + Math.sin(fr * 0.013 + i) * 30 + fr * 0.25 * (random(`${seed}v${i}`) - 0.5)) % w + w) % w;
      const py = y + ((random(`${seed}y${i}`) * h - fr * (0.2 + random(`${seed}u${i}`) * 0.5)) % h + h) % h;
      const tw = 0.3 + 0.7 * Math.abs(Math.sin(fr * (0.04 + random(`${seed}t${i}`) * 0.05) + i));
      return <circle key={i} cx={px} cy={py} r={1.5 + random(`${seed}r${i}`) * 3} fill={c} opacity={0.65 * tw} />;
    })}
  </g>
);

// Vertical motion blur for whip-tilts. Wrap content in <g filter="url(#whipV)"> with the amount
// set by `WhipDefs k` (0 = none).
export const WhipDefs: React.FC<{ k: number; id?: string; vertical?: boolean }> = ({ k, id = "whipV", vertical = true }) => (
  <defs>
    <filter id={id} x="-10%" y="-30%" width="120%" height="160%">
      <feGaussianBlur stdDeviation={vertical ? `${0.5 + k * 2} ${0.5 + k * 40}` : `${0.5 + k * 40} ${0.5 + k * 2}`} />
    </filter>
  </defs>
);

// ---- A desk lamp from straight above: base off in a corner, two arm segments, a domed shade
// pointing at `aim`. on 0..1 lights the bulb (and the caller draws the pool with <LampPool>),
// press 0..1 is the anticipation dip on the switch button before the click.
export const DeskLamp: React.FC<{ base: [number, number]; elbow: [number, number]; head: [number, number]; aim: [number, number]; on: number; press?: number; fr?: number; s?: number }> = ({ base, elbow, head, aim, on, press = 0, fr = 0, s = 1 }) => {
  const ang = (Math.atan2(aim[1] - head[1], aim[0] - head[0]) * 180) / Math.PI;
  const hx = head[0], hy = head[1];
  const arm = (a: [number, number], b: [number, number], w: number) => (
    <g>
      <line x1={a[0] + 14} y1={a[1] + 18} x2={b[0] + 14} y2={b[1] + 18} stroke="#0C0526" strokeWidth={w + 6} strokeLinecap="round" opacity={0.45} filter="url(#soft8)" />
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#2E2A5E" strokeWidth={w} strokeLinecap="round" />
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#8F88C9" strokeWidth={w * 0.28} strokeLinecap="round" opacity={0.8} transform="translate(-3 -3)" />
    </g>
  );
  // the cable leaves the base toward the frame edge with a lazy curve
  const cable = `M${base[0]},${base[1]} C${base[0] + 60},${base[1] + 120} ${base[0] - 40},${base[1] + 260} ${base[0] + 120},${base[1] + 420}`;
  const dip = (1 - press * 0.05) * s;
  return (
    <g>
      <path d={cable} fill="none" stroke="#0C0526" strokeWidth={16} opacity={0.4} filter="url(#soft4)" transform="translate(10 12)" />
      <path d={cable} fill="none" stroke="#231C4C" strokeWidth={12} strokeLinecap="round" />
      {/* weighted round base */}
      <circle cx={base[0] + 16} cy={base[1] + 22} r={92} fill="#0C0526" opacity={0.5} filter="url(#soft8)" />
      <circle cx={base[0]} cy={base[1]} r={86} fill="#2A2558" />
      <circle cx={base[0]} cy={base[1]} r={74} fill="#3B3576" />
      <path d={`M${base[0] - 60},${base[1] - 30} A70 70 0 0 1 ${base[0] + 20},${base[1] - 66}`} fill="none" stroke="#A9A2E0" strokeWidth={6} strokeLinecap="round" opacity={0.6} />
      {arm(base, elbow, 26)}
      {arm(elbow, head, 22)}
      {/* spring along the lower arm */}
      <path d={Array.from({ length: 12 }, (_, i) => { const t = 0.15 + (i / 11) * 0.7; const x = base[0] + (elbow[0] - base[0]) * t, y = base[1] + (elbow[1] - base[1]) * t; return `${i ? "L" : "M"}${x + (i % 2 ? 10 : -10)},${y}`; }).join(" ")} fill="none" stroke="#B9B2E6" strokeWidth={4} opacity={0.7} />
      {[base, elbow].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={20} fill="#4A4388" stroke="#8F88C9" strokeWidth={4} />)}
      {/* shade: a dome seen from above, its open mouth toward `aim` */}
      <g transform={`translate(${hx} ${hy}) rotate(${ang}) scale(${dip})`}>
        <ellipse cx={18} cy={30} rx={150} ry={112} fill="#0C0526" opacity={0.45} filter="url(#soft8)" />
        <path d="M-120,0 C-120,-92 -40,-104 30,-100 L120,-78 C150,-40 150,40 120,78 L30,100 C-40,104 -120,92 -120,0Z" fill="#4C4699" stroke="#8E88D8" strokeWidth={5} />
        <path d="M-104,-6 C-104,-74 -40,-86 26,-84 L100,-66 C88,-40 60,-30 -20,-40 C-70,-46 -96,-30 -104,-6Z" fill="#9C95E0" opacity={0.75} />
        {/* mouth rim: lit from inside when on */}
        <ellipse cx={128} cy={0} rx={24} ry={82} fill={on > 0 ? "#FFF2C8" : "#3A2150"} opacity={0.3 + 0.7 * on} />
        <ellipse cx={128} cy={0} rx={14} ry={64} fill="#FFFBEA" opacity={on} />
        {on > 0 && <circle cx={150} cy={0} r={150} fill="url(#glowGold)" opacity={on * (0.85 + 0.15 * Math.sin(fr * 0.3))} />}
        {/* switch button on the back of the shade */}
        <circle cx={-86} cy={0} r={18} fill="#2E2A5E" />
        <circle cx={-86} cy={0} r={13 - press * 4} fill={on > 0.5 ? "#FFCB57" : "#8F88C9"} />
      </g>
    </g>
  );
};

// The lamp's light on the desk: darkness outside the pool, a warm pool inside. `dark` is the room
// darkness with the lamp off (0..1); on 0..1. Draw over the board, under foreground leaves.
export const LampPool: React.FC<{ id: string; c: [number, number]; r: number; on: number; dark: number; tint?: string }> = ({ id, c, r, on, dark, tint = "#FFC873" }) => (
  <g style={{ pointerEvents: "none" }}>
    <defs>
      <radialGradient id={`lp${id}`} gradientUnits="userSpaceOnUse" cx={c[0]} cy={c[1]} r={r * 1.5}>
        <stop offset="0" stopColor="#0A0420" stopOpacity={0} />
        <stop offset="0.5" stopColor="#0A0420" stopOpacity={0.08} />
        <stop offset="1" stopColor="#0A0420" stopOpacity={0.75} />
      </radialGradient>
      <radialGradient id={`lw${id}`} gradientUnits="userSpaceOnUse" cx={c[0]} cy={c[1]} r={r}>
        <stop offset="0" stopColor={tint} stopOpacity={0.38} />
        <stop offset="0.55" stopColor="#F2A050" stopOpacity={0.16} />
        <stop offset="1" stopColor="#E07A40" stopOpacity={0} />
      </radialGradient>
    </defs>
    <rect x={-600} y={-600} width={2280} height={3120} fill="#0A0420" opacity={dark * (1 - on)} />
    <rect x={-600} y={-600} width={2280} height={3120} fill={`url(#lp${id})`} opacity={on * 0.9} />
    <circle cx={c[0]} cy={c[1]} r={r} fill={`url(#lw${id})`} opacity={on} style={{ mixBlendMode: "screen" }} />
  </g>
);

// Lamp click timing: a small press (anticipation) for `pre` frames, then a flicker into full on.
export const lampOn = (fr: number, at: number) => {
  if (fr < at) return 0;
  const t = fr - at;
  if (t === 0) return 0.75;
  if (t === 1) return 0.25;
  if (t === 2) return 0.9;
  return Math.min(1, 0.9 + 0.1 * (t - 2) / 6);
};
export const lampPress = (fr: number, at: number, pre = 6) => (fr >= at - pre && fr < at + 2 ? Math.sin(((fr - (at - pre)) / (pre + 2)) * Math.PI) : 0);

// A soft cold-light pulse ring (for frost moments).
export const Pulse: React.FC<{ x: number; y: number; k: number; r: number; c?: string; ry?: number }> = ({ x, y, k, r, c = C.tealHi, ry }) =>
  k > 0 && k < 1 ? <ellipse cx={x} cy={y} rx={r * k} ry={(ry ?? r) * k} fill="none" stroke={c} strokeWidth={14 * (1 - k) + 2} opacity={0.8 * (1 - k)} /> : null;
