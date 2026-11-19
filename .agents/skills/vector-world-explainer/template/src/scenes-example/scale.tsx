import React from "react";
import { interpolate, random } from "remotion";
import { clamp, ease, easeIn, easeInOut, f, pop, prog, type SceneProps } from "../lib";
import { FlatCoin, SpinCoin } from "../kit/coin";
import { C, COND, NUNITO, Stars } from "../kit/palette";
import { NightSky, WIN } from "../kit/room";
import { camAt, type Key } from "../kit/camera";
import { Motes, Steam, WhipDefs } from "../kit/life";
import { Stage, Study } from "./stage";
import { SCALE } from "./scale-events";
import { WHIP_UP } from "./interference";

// Scale: lands from the whip-tilt up as the five bit coins pop up onto their edges (qubits);
// teal threads link them, their spins snap into step and they hop as one. The chain grows to 50
// coiling toward the window (2^50 = 1,125,899,906,842,624 rolls up), streams up into the window,
// and the camera flies through the porthole into space: nebula, a big spiral galaxy, the chain
// streaming into it, a haze of atoms doubling and doubling. Then a dive back down: the porthole
// closes in around us (uses starts framed on the window and pulls back to the desk).
const ROW = [0, 1, 2, 3, 4].map((i) => ({ x: 250 + i * 150, y: 1150 }));
export const USES_WIN_ZOOM = 2.4; // uses' first-frame zoom on the window (the ring we close onto)

const Thread: React.FC<{ a: [number, number]; b: [number, number]; k: number; fr: number; seed: number; pulse?: number }> = ({ a, b, k, fr, seed, pulse = 0 }) => {
  if (k <= 0) return null;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - 30 + Math.sin(fr * 0.15 + seed) * 8;
  const d = `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`;
  return (
    <g>
      <path d={d} fill="none" stroke={C.teal} strokeWidth={16} opacity={0.3 * k} strokeLinecap="round" />
      <path d={d} fill="none" stroke={C.tealHi} strokeWidth={5} strokeLinecap="round" strokeDasharray={400} strokeDashoffset={400 * (1 - k)} />
      {pulse > 0 && pulse < 1 && <path d={d} fill="none" stroke="#E6FFFB" strokeWidth={12} strokeLinecap="round" strokeDasharray="50 400" strokeDashoffset={50 - 210 * pulse} opacity={Math.sin(Math.PI * pulse)} />}
    </g>
  );
};

// 2^50 = 1,125,899,906,842,624 rolls up digit by digit.
const BIG = "1,125,899,906,842,624";
const rolled = (k: number) => BIG.split("").map((ch, i) => (ch === "," || i / BIG.length < k ? ch : String(Math.floor(random(`d${i}${Math.floor(k * 40)}`) * 10)))).join("");

// A spiral galaxy: dust lanes, two star arms, a hot core. Local coords, ~ radius 330.
export const Galaxy: React.FC<{ fr: number; x: number; y: number; s: number; rot: number; bright?: number; n?: number }> = ({ fr, x, y, s, rot, bright = 1, n = 700 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${1.7 * s} ${0.95 * s})`}>
    <circle r={420} fill="url(#glowGold)" opacity={0.55 * bright} />
    <circle r={300} fill="url(#glowTeal)" opacity={0.25 * bright} />
    {[0, 1].map((arm) => (
      <g key={arm} filter="url(#soft14)">
        <path d={Array.from({ length: 30 }, (_, j) => { const u = (j / 29) * 4.2, a = u * 2.2 + arm * Math.PI, r = 20 + u * 70; return `${j ? "L" : "M"}${Math.cos(a) * r},${Math.sin(a) * r}`; }).join(" ")} fill="none" stroke={arm ? "#B9568E" : "#6C5BD8"} strokeWidth={46} opacity={0.4 * bright} strokeLinecap="round" />
      </g>
    ))}
    {Array.from({ length: n }, (_, i) => {
      const arm = i % 2, u = (i / n) * 4.4;
      const a = u * 2.2 + arm * Math.PI + (random(`ga${i}`) - 0.5) * 0.6;
      const r = 16 + u * 70 + (random(`gr${i}`) - 0.5) * 38;
      const tw = 0.55 + 0.45 * Math.sin(fr * 0.1 + i);
      return <circle key={i} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={1.4 + random(`gs${i}`) * 3.2} fill={i % 7 === 0 ? C.tealHi : i % 5 === 0 ? "#FFC2D6" : C.cream} opacity={0.85 * tw} />;
    })}
    <circle r={70} fill="#FFE9A8" opacity={0.6 * bright} filter="url(#soft14)" />
    <circle r={34} fill="#FFF8E0" />
  </g>
);

// The ringed planet from the study window (same drawing as NightSky's), at a given height: it sets
// during scale so the counter on the wall stays clear of it.
const Planet: React.FC<{ fr: number; y: number }> = ({ fr, y }) => (
  <g transform={`translate(${330 + Math.sin(fr * 0.004) * 6} ${y})`}>
    <ellipse rx={150} ry={36} fill="none" stroke="#F7C06A" strokeWidth={14} opacity={0.55} transform="rotate(-18)" />
    <circle r={92} fill="#F07A5C" />
    <path d="M-92,-10 Q0,-40 92,-18 L92,6 Q0,-14 -90,18Z" fill="#D85E4E" />
    <path d="M-80,40 Q0,20 84,36 L76,56 Q0,42 -70,60Z" fill="#D85E4E" />
    <circle r={92} fill="none" stroke="#FFB08A" strokeWidth={6} opacity={0.6} strokeDasharray="160 600" strokeDashoffset={-40} />
    <path d="M-150,10 A150 36 0 0 0 150,-10" transform="rotate(-18)" fill="none" stroke="#FFD58A" strokeWidth={14} opacity={0.9} />
  </g>
);

export const Scale: React.FC<SceneProps> = ({ fr }) => {
  const s = f(SCALE.start), tl = f(SCALE.link), ta = f(SCALE.asOne), t50 = f(SCALE.fifty), tq = f(SCALE.quadrillion), t300 = f(SCALE.threeHundred), tat = f(SCALE.atoms), tsp = f(SCALE.space), end = f(SCALE.end);
  const space = fr >= tsp;
  if (!space) {
    const whipIn = 1 - prog(fr, s, 9);
    const sync = prog(fr, ta, 10);
    const hopT = prog(fr, f(SCALE.hop), f(SCALE.hopLand) - f(SCALE.hop));
    const hop = Math.sin(hopT * Math.PI) * 64;
    const preSq = Math.sin(Math.PI * prog(fr, f(SCALE.hop) - 3, 4));
    const pulse = prog(fr, f(SCALE.hopLand), 12);
    const land = fr >= f(SCALE.hopLand) ? Math.exp(-(fr - f(SCALE.hopLand)) / 3) * Math.cos((fr - f(SCALE.hopLand)) * 1.2) : 0;
    const grow = prog(fr, t50, 30);
    const stream = prog(fr, f(SCALE.stream), t300 - f(SCALE.stream) + 6, easeIn);
    const n = Math.round(5 + 45 * grow);
    // chain layout: the first 5 on the table; the rest coil back toward the window, then stream up into it
    const coil = (u: number) => {
      const a = u * Math.PI * 3.2;
      return { x: 540 + Math.cos(a) * (360 - u * 250), y: 980 - u * 420 + Math.sin(a) * (90 - u * 60), r: 52 * (1 - u * 0.75) };
    };
    const pos = Array.from({ length: n }, (_, i) => {
      if (i < 5) return { x: ROW[i].x, y: ROW[i].y - hop - 320 * stream, r: 62 * (1 - 0.35 * stream) };
      const u = Math.min(1.25, (i - 5) / 45 + stream * 0.9);
      const c = coil(Math.min(1, u));
      const into = Math.max(0, u - 1) * 4; // past the coil's end: shrink into the window
      return { x: c.x + (WIN.x - c.x) * into, y: c.y + (WIN.y - c.y) * into, r: c.r * (1 - 0.8 * into) };
    });
    const roll = prog(fr, tq - 6, f(SCALE.rollEnd) - tq + 6);
    const keys: Key[] = [
      [s, { x: 540, y: 1040 - WHIP_UP * 0.35, zoom: 1.12 }],
      [s + 10, { x: 540, y: 1040, zoom: 1.12 }, (t) => 1 - Math.pow(1 - t, 3)],
      [ta, { x: 540, y: 1030, zoom: 1.18 }],
      [f(SCALE.hopLand) + 6, { x: 540, y: 1020, zoom: 1.16 }],
      [t50 + 20, { x: 540, y: 960, zoom: 1.0 }],
      [f(SCALE.stream), { x: 540, y: 930, zoom: 1.0 }],
      [t300 - 2, { x: 540, y: 720, zoom: 1.5 }],
      [tsp, { x: WIN.x, y: WIN.y, zoom: 2.6 }, easeIn],
    ];
    const cam = camAt(fr, keys);
    const leave = prog(fr, t300 - 16, 16, easeIn); // the counter lifts away as we fly through the window
    return (
      <>
      <Stage fr={fr} cam={cam} handheld={0.5}>
        <WhipDefs k={whipIn} id="whipS" />
        <g filter={whipIn > 0.02 ? "url(#whipS)" : undefined}>
          <Study fr={fr} sky={<g><NightSky fr={fr} planet={false} /><Planet fr={fr} y={520 + 300 * prog(fr, s + 12, t50 - s - 12, easeInOut)} /></g>} glow={{ x: 540, y: 1050, r: 700, kind: "Teal", k: 0.5 + 0.5 * sync }} over={<Steam fr={fr} x={1030} y={1150} />}>
            {/* the window fills with light as the chain streams in */}
            <circle cx={WIN.x} cy={WIN.y} r={WIN.r} fill="url(#glowTeal)" opacity={0.8 * stream} />
            {pos.slice(0, -1).map((p, i) => (i < 4 || grow > 0 ? <Thread key={`t${i}`} a={[p.x, p.y]} b={[pos[i + 1].x, pos[i + 1].y]} k={i < 4 ? prog(fr, tl + i * 4, 10) : 1} fr={fr} seed={i} pulse={i < 4 ? pulse : 0} /> : null))}
            {[...pos].reverse().map((p, j) => {
              const i = n - 1 - j;
              if (i < 5) {
                // stand up: lying flat -> on edge, popping one after another
                const t0 = f(SCALE.standUp) + i * 3;
                const up = prog(fr, t0, 9, ease);
                if (up < 1) {
                  return (
                    <g key={i}>
                      <ellipse cx={p.x + 6} cy={p.y + 62 + 10} rx={66} ry={14} fill="#120830" opacity={0.5} filter="url(#soft4)" />
                      <FlatCoin x={p.x} y={p.y + 62 * (1 - up) + 8} r={62} k={0.3 + 0.7 * up} face={(i % 2) as 0 | 1} shadow={false} />
                    </g>
                  );
                }
              }
              const own = fr * 0.5 + i * 1.7;
              const phi = own + (fr * 0.5 - own) * sync;
              const bob = i < 5 ? Math.sin(fr * 0.12 + (1 - sync) * i) * 6 * (1 - hopT) : Math.sin(fr * 0.12 + i) * 4;
              const sq = i < 5 ? 1 - 0.15 * preSq - 0.14 * land : 1;
              return (
                <g key={i}>
                  {i < 5 && <ellipse cx={p.x + 6} cy={ROW[i].y + 62 + 10} rx={50 * (1 - hop / 200)} ry={10} fill="#120830" opacity={0.5 * (1 - hop / 140)} filter="url(#soft4)" />}
                  <g transform={`translate(${p.x} ${p.y + p.r}) scale(${2 - sq} ${sq}) translate(${-p.x} ${-p.y - p.r})`}>
                    <SpinCoin x={p.x} y={p.y + bob} r={p.r} phi={phi} blur={0.6} tilt={0} dphi={0.3} />
                  </g>
                </g>
              );
            })}
            <Motes fr={fr} x={150} y={700} w={780} h={600} n={20} seed="sm" c="#CFFFF6" />
          </Study>
        </g>
      </Stage>
      {/* counter (screen space, inside the safe zone: top >= 300, clear of the planet) */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <g fontFamily={NUNITO} textAnchor="middle" opacity={prog(fr, t50, 10) * (1 - leave)} transform={`translate(0 ${-150 * leave})`}>
          <ellipse cx={540} cy={560} rx={470} ry={150} fill="url(#ctrShade)" opacity={prog(fr, tq - 6, 8)} />
          <defs><radialGradient id="ctrShade"><stop offset="0" stopColor="#0E0628" stopOpacity={0.55} /><stop offset="1" stopColor="#0E0628" stopOpacity={0} /></radialGradient></defs>
          <text x={540} y={440} fontFamily={COND} fontWeight={800} fontSize={150} fill={C.gold} transform={`translate(540 400) scale(${0.8 + 0.2 * Math.min(1.1, pop(fr, t50, 12))}) translate(-540 -400)`}>{Math.round(5 + 45 * grow)}</text>
          <text x={540} y={500} fontWeight={900} fontSize={46} fill="#F3EEFF" letterSpacing={6}>QUBITS</text>
          <text x={540} y={612} fontFamily={COND} fontWeight={800} fontSize={92} fill={C.cream} opacity={prog(fr, tq - 6, 8)}>{rolled(roll)}</text>
          {/* the label sits on its own soft plate, in front of the coin coil streaming behind it */}
          <rect x={385} y={626} width={310} height={52} rx={26} fill="#160A3C" opacity={0.8 * prog(fr, tq - 6, 8)} />
          <text x={540} y={663} fontWeight={800} fontSize={36} fill="#E4DCFF" opacity={prog(fr, tq - 6, 8)}>combinations</text>
        </g>
      </svg>
      </>
    );
  }
  // ---- out in space
  const k = prog(fr, tsp, 30);
  const atomsK = prog(fr, tat, 8);
  const more = prog(fr, f(SCALE.more), 14);
  const flight = (fr - t300) * 0.012;
  const dive = prog(fr, f(SCALE.dive), end - f(SCALE.dive), (t) => t * t * (1.6 - 0.6 * t));
  const keys: Key[] = [
    [tsp, { x: 540, y: 960, zoom: 1.35 }],
    [tsp + 34, { x: 540, y: 940, zoom: 1.0 }],
    [f(SCALE.atoms), { x: 540, y: 930, zoom: 1.0 }],
    [f(SCALE.universe), { x: 540, y: 905, zoom: 0.82 }],
    [f(SCALE.dive), { x: 540, y: 900, zoom: 0.8 }],
    [end, { x: 540, y: 960, zoom: 1.9 }, easeIn],
  ];
  const cam = camAt(fr, keys);
  // atoms: a haze that doubles every 5 frames from "atoms" (each new dot pops in)
  const born = (i: number) => tat + Math.log2(Math.max(1, (i + 1) / 24)) * 5;
  const NA = 1400;
  // the closing porthole (screen space): inner radius shrinks to the window as uses frames it
  const Rin = interpolate(dive, [0, 1], [1180, WIN.r * USES_WIN_ZOOM], clamp);
  return (
    <>
      <Stage fr={fr} cam={cam} handheld={0.3} bg="#0A0B2E">
        <rect x={-500} y={-500} width={2080} height={2920} fill="url(#space)" />
        {/* nebula */}
        <g filter="url(#soft30)">
          <ellipse cx={240} cy={520} rx={560} ry={330} fill="#7A3FB0" opacity={0.5} />
          <ellipse cx={880} cy={640} rx={420} ry={280} fill="#C2457E" opacity={0.32} />
          <ellipse cx={760} cy={1260} rx={560} ry={360} fill="#2A8FA6" opacity={0.38} />
          <ellipse cx={200} cy={1300} rx={420} ry={300} fill="#4B2FA8" opacity={0.45} />
          <ellipse cx={560} cy={820} rx={700} ry={420} fill="#3B2A9E" opacity={0.4} />
          <ellipse cx={600} cy={300} rx={500} ry={200} fill="#2A5FB0" opacity={0.3} />
        </g>
        <Stars seed="sp" n={320} x={-300} y={-300} w={1680} h={2520} fr={fr} big={14} />
        <Galaxy fr={fr} x={560} y={830} s={1.2 + 0.08 * more} rot={-20 + fr * 0.15} bright={1 + 0.5 * more * (1 - prog(fr, f(SCALE.more) + 14, 20))} />
        {/* atoms of the universe: a haze of points that keeps doubling */}
        <g>
          {Array.from({ length: NA }, (_, i) => {
            const b = born(i);
            if (fr < b) return null;
            const pk = Math.min(1, (fr - b) / 4);
            const x = -500 + random(`at${i}`) * 2080, y = -400 + random(`aty${i}`) * 2700, r = 3.2 + random(`ar${i}`) * 3.4;
            return (
              <g key={i}>
                {pk < 1 && <circle cx={x} cy={y} r={r * (2 + 5 * pk)} fill="none" stroke={C.tealHi} strokeWidth={1.5} opacity={0.8 * (1 - pk)} />}
                <circle cx={x} cy={y} r={r * (pk < 1 ? 1.8 - 0.8 * pk : 1)} fill={i % 3 ? "#BFF7EE" : C.tealHi} opacity={0.9 * atomsK} />
              </g>
            );
          })}
        </g>
        {/* the coin chain, linked, streaming toward the galaxy from the near foreground */}
        {(() => {
          const items = Array.from({ length: 46 }, (_, i) => {
            const z = i * 0.12 + 0.12 - (flight % 0.12);
            const sc = 1 / (0.28 + z);
            const a = z * 2.4 + fr * 0.02;
            const u = 1 - Math.exp(-z * 0.8);
            return { x: 40 + (560 - 40) * u + Math.cos(a) * 90 * (1 - u), y: 1320 + (830 - 1320) * u + Math.sin(a) * 60 * (1 - u), r: 64 * sc * 0.5, z };
          });
          return (
            <g opacity={k}>
              {items.slice(0, -1).map((p, i) => (
                <path key={`l${i}`} d={`M${p.x},${p.y} L${items[i + 1].x},${items[i + 1].y}`} stroke={C.tealHi} strokeWidth={Math.max(1.5, p.r * 0.07)} opacity={0.75} />
              ))}
              {[...items].reverse().map((p, i) => <SpinCoin key={i} x={p.x} y={p.y} r={Math.max(4, p.r)} phi={fr * 0.5 + p.z * 3} blur={0.5} tilt={0} dphi={0.3} />)}
            </g>
          );
        })()}
        {/* the porthole rim we just flew through, sliding off the edges */}
        <circle cx={540} cy={960} r={900 + 900 * k} fill="none" stroke="#22184F" strokeWidth={160} opacity={1 - k} />
      </Stage>
      {/* foreground dust streaming past the camera (screen space) */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 70 }, (_, i) => {
          const a = random(`fd${i}`) * Math.PI * 2;
          const t = ((fr - tsp) * (0.006 + random(`fv${i}`) * 0.01) + random(`fo${i}`)) % 1;
          const r0 = 60 + t * t * 1300, r1 = r0 + 10 + t * 60;
          const cx = 560, cy = 900;
          return <line key={i} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * r1} y2={cy + Math.sin(a) * r1} stroke={i % 4 ? "#E9E3FF" : C.goldHi} strokeWidth={1 + 3 * t} strokeLinecap="round" opacity={0.7 * Math.min(1, t * 4) * k} />;
        })}
        <g fontFamily={NUNITO} textAnchor="middle" opacity={Math.min(1, pop(fr, t300, 12))} transform={`translate(0 ${-700 * dive})`} stroke="#120A33" strokeWidth={10} strokeLinejoin="round" style={{ paintOrder: "stroke" }}>
          <text x={540} y={500} fontFamily={COND} fontWeight={800} fontSize={190} fill={C.gold}>300</text>
          <text x={540} y={560} fontWeight={900} fontSize={46} fill="#F3EEFF" letterSpacing={6}>QUBITS</text>
          {/* honest comparison: 2^300 ~ 2 x 10^90, atoms in the observable universe ~ 10^80 */}
          <text x={540} y={645} fontWeight={900} fontSize={44} fill={C.lilac} opacity={prog(fr, f(SCALE.more), 10)}>
            2<tspan dy={-18} fontSize={28}>300</tspan><tspan dy={18}>{" > 10"}</tspan><tspan dy={-18} fontSize={28}>80</tspan><tspan dy={18}>{" atoms"}</tspan>
          </text>
        </g>
        {/* dive back down: the porthole closes in around us */}
        {dive > 0 && (
          <g>
            <circle cx={540} cy={960} r={Rin + 1000} fill="none" stroke="#2A1C66" strokeWidth={2000} />
            <circle cx={540} cy={960} r={Rin + 22 * USES_WIN_ZOOM} fill="none" stroke={C.frame} strokeWidth={46 * USES_WIN_ZOOM} />
            <circle cx={540} cy={960} r={Rin} fill="none" stroke={C.frameHi} strokeWidth={5 * USES_WIN_ZOOM} opacity={0.7} />
          </g>
        )}
      </svg>
    </>
  );
};
