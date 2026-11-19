import React from "react";
import { interpolate } from "remotion";
import { ACTS, B, clamp, easeIn, easeInOut, f, mix, pop, prog, type SceneProps } from "../lib";
import { C, COND, NUNITO } from "../kit/palette";
import { Sparkles } from "../kit/room";
import { Motes } from "../kit/life";
import { Layer, type Key } from "../kit/camera";
import { Dino, DyingSun, GoogleLockup, Hall, MiniGalaxy, Odometer, Stopwatch, WillowChip, WillowDefs, type QState } from "./kit/hook-kit";
import { Stage } from "./stage";
import { T } from "./hook-events";

// Hook v5 (0-13.24 s), Madhav's real words: "Google built a chip that solved a problem in 5 minutes
// that the world's fastest supercomputer would need 10 septillion years for. What is it? It's called
// a quantum computer. And in 60 seconds, you will actually understand it."
// Frame 0 = the cover: the question headline (CaptionView HookTitle), Google's chip in a stopwatch
// bezel in a supercomputer hall, the race "5 MIN vs 10 SEPTILLION YEARS" beside the chip, and Madhav
// big in the lower right (Film.tsx draws him). On "supercomputer" the hall powers on and he drops to the
// corner; the 10^25 odometer and the deep-time tape run the race; on "what is it?" the qubits ripple a
// question; on "quantum computer" they light gold; "60 seconds" re-arms the stopwatch; "understand it"
// dives into the die.
const CHIP: [number, number] = [430, 690];
const FLOOR_Y = 960; // where the chip's reflection mirrors (world y)
const LAT_R = 26 * 7;
const END = ACTS.hook[1];

export const Hook: React.FC<SceneProps> = ({ fr }) => {
  const t = fr / 30;
  const keys: Key[] = [
    [0, { x: 540, y: 960, zoom: 1.0 }],
    [f(T.chipPulse), { x: 534, y: 948, zoom: 1.018 }],
    [f(T.sweep0) + 4, { x: 528, y: 936, zoom: 1.05 }],
    [f(T.power) - 3, { x: 546, y: 950, zoom: 1.03 }],
    [f(T.power) + 14, { x: 552, y: 985, zoom: 0.97 }],
    [f(T.clear), { x: 552, y: 960, zoom: 1.0 }],
    [f(T.what) + 4, { x: 520, y: 930, zoom: 1.06 }],
    [f(T.qc) + 14, { x: CHIP[0] + 50, y: 830, zoom: 1.26 }],
    [f(T.push), { x: CHIP[0] + 20, y: 790, zoom: 1.36 }],
    [f(END), { x: CHIP[0], y: CHIP[1] - 8, zoom: 7.5 }, easeIn],
  ];
  const power = prog(fr, f(T.power), 27);
  const sweep5 = interpolate(fr, [f(T.sweep0), f(T.done)], [0, 1], clamp);
  const done = prog(fr, f(T.done), 14);
  // "60 seconds": the gold 5-minute arc unwinds and a new sweep starts (stylised running timer)
  const unwind = prog(fr, f(T.sixty) - 4, 8, easeInOut);
  const run = Math.max(0, fr - f(T.sixty) - 4) / 30 / 14;
  const sweep = fr < f(T.sixty) - 4 ? sweep5 : unwind < 1 ? 1 - unwind : Math.min(1, 0.001 + run);
  const press = Math.max(
    interpolate(fr, [f(T.sweep0) - 3, f(T.sweep0), f(T.sweep0) + 4], [0, 1, 0], clamp),
    interpolate(fr, [f(T.done) - 2, f(T.done), f(T.done) + 4], [0, 1, 0], clamp),
    interpolate(fr, [f(T.sixty) - 6, f(T.sixty) - 3, f(T.sixty) + 2], [0, 1, 0], clamp),
  );
  const asking = fr >= f(T.what) && fr < f(T.qc);
  const gold = prog(fr, f(T.qc), 22);
  const chipPulse = Math.exp(-Math.max(0, fr - f(T.chipPulse)) / 8) * (fr >= f(T.chipPulse) ? 1 : 0);
  const qubit = (k: number, x: number, y: number): QState => {
    const idle = 0.6 + 0.3 * Math.sin(fr * 0.13 + k * 0.7);
    const r = Math.hypot(x, y) / LAT_R;
    if (fr < f(T.what)) return { glow: idle + 0.6 * (1 - done) * (done > 0 ? 1 : 0) + 0.7 * chipPulse };
    if (asking) {
      // a question ripple: rings of qubits blink lilac outward from the centre, twice
      const ph = (t - T.what) * 3.2 - r * 1.4;
      const blink = Math.max(0, Math.sin(ph * Math.PI)) * (ph > 0 && ph < 2 ? 1 : 0);
      return { glow: 0.25 + 0.9 * blink, color: blink > 0.3 ? C.lilac : undefined };
    }
    const lit = Math.max(0, Math.min(1, (t - T.qc) * 2.6 - r * 0.9));
    return lit > 0 ? { glow: 0.3 + 1.1 * lit + (t > T.push ? (t - T.push) * 1.2 : 0) } : { glow: 0.1 };
  };
  const chipLight = asking ? 0.5 : fr < f(T.qc) ? 0.85 + 0.15 * Math.sin(fr * 0.15) + 0.3 * chipPulse : 0.4 + 0.9 * gold;
  const lockOff = prog(fr, f(T.lockOff), 10, easeIn);
  return (
    <>
      <Stage fr={fr} keys={keys} handheld={0.35} bg="#140C38">
        <WillowDefs />
        <Layer depth={0.55}>
          <Hall fr={fr} vx={CHIP[0]} vy={CHIP[1] - 70} power={power} />
        </Layer>
        {/* the chip lights the hall floor below it */}
        <ellipse cx={CHIP[0]} cy={1110} rx={520} ry={130} fill="url(#glowGold)" opacity={0.75 * chipLight} />
        <ellipse cx={CHIP[0]} cy={CHIP[1]} rx={330} ry={300} fill="url(#glowGold)" opacity={0.55 * chipLight} />
        <Stopwatch x={CHIP[0]} y={CHIP[1]} r={196} sweep={sweep} done={fr < f(T.sixty) ? done : 0} press={press} />
        {/* the re-armed sweep runs teal */}
        {fr >= f(T.sixty) + 4 && (() => {
          const e = sweep * Math.PI * 2 - Math.PI / 2;
          return <circle cx={CHIP[0] + Math.cos(e) * 196} cy={CHIP[1] + Math.sin(e) * 196} r={24} fill={C.tealHi} opacity={0.9} />;
        })()}
        <g transform={`translate(0 ${Math.sin(fr * 0.05) * 5 - 22 * chipPulse}) translate(${CHIP[0]} ${CHIP[1]}) scale(${1 + 0.05 * chipPulse}) translate(${-CHIP[0]} ${-CHIP[1]})`}>
          <WillowChip fr={fr} x={CHIP[0]} y={CHIP[1] - 8} s={0.54} k={0.66} qubit={qubit} />
        </g>
        {/* the chip's reflection on the hall's polished floor */}
        <mask id="reflFade" maskUnits="userSpaceOnUse" x={-400} y={FLOOR_Y} width={1880} height={900}>
          <rect x={-400} y={FLOOR_Y} width={1880} height={900} fill="url(#reflGrad)" />
        </mask>
        <linearGradient id="reflGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity={0.85} /><stop offset="0.8" stopColor="#fff" stopOpacity={0} /></linearGradient>
        <g mask="url(#reflFade)" opacity={0.75 + 0.25 * gold}>
          <g transform={`translate(0 ${2 * FLOOR_Y}) scale(1 -1)`} filter="url(#soft4)">
            <ellipse cx={CHIP[0]} cy={CHIP[1]} rx={330} ry={300} fill="url(#glowGold)" opacity={0.55 * chipLight} />
            <Stopwatch x={CHIP[0]} y={CHIP[1]} r={196} sweep={sweep} done={0} press={0} />
            <WillowChip fr={fr} x={CHIP[0]} y={CHIP[1] - 8} s={0.54} k={0.66} qubit={qubit} />
          </g>
        </g>
        <ellipse cx={CHIP[0]} cy={FLOOR_Y + 300} rx={640} ry={220} fill="url(#glowGold)" opacity={0.5 + 0.5 * gold} />
        {[-1, 1].map((sd) => <path key={sd} d={`M${CHIP[0] + sd * 40},${FLOOR_Y + 20} L${CHIP[0] + sd * 520},${FLOOR_Y + 980}`} stroke={C.gold} strokeWidth={10} opacity={0.12 + 0.18 * gold} filter="url(#soft14)" />)}
        <Motes fr={fr} x={60} y={980} w={960} h={760} n={30} seed="hkm" c="#FFE3A3" o={0.6 + 0.4 * gold} />
        {/* Google Quantum AI / Willow chip: pulses on "Google", drops away for the odometer (a move) */}
        <g transform={`translate(0 ${lockOff * 1500}) translate(${CHIP[0]} ${CHIP[1] + 240}) scale(${1 + 0.08 * chipPulse}) translate(${-CHIP[0]} ${-CHIP[1] - 240})`}>
          <GoogleLockup x={CHIP[0]} y={CHIP[1] + 248} size={46} />
          <text x={CHIP[0]} y={CHIP[1] + 280} textAnchor="middle" fontFamily={NUNITO} fontWeight={800} fontSize={28} fill={C.lilac} letterSpacing={2}>Willow chip</text>
        </g>
        {fr >= f(T.qc) - 2 && <Sparkles fr={fr} x={CHIP[0]} y={CHIP[1]} r={300} n={14} seed="hkc" />}
      </Stage>
      <RaceTag fr={fr} done={done} />
      <Overlay fr={fr} />
    </>
  );
};

// The race, readable on the cover: a stack right of the chip, above Madhav's head: "5 MIN" (gold,
// check on done) over "vs 10 / SEPTILLION / YEARS". Each part thumps as he says it. On T.tag it
// shrinks into a tag; on T.clear it flies off left with the readouts.
const RaceTag: React.FC<{ fr: number; done: number }> = ({ fr, done }) => {
  const m = prog(fr, f(T.tag), 11, easeInOut);
  const off = prog(fr, f(T.clear), 10, easeIn);
  if (off >= 1) return null;
  const x = 826 + (842 - 826) * m + off * 520, y = 600 + (560 - 600) * m - off * 40;
  const sc = 1 - 0.28 * m;
  const th = (at: number) => (fr >= at ? 0.12 * Math.sin(Math.min(1, pop(fr, at, 10)) * Math.PI) : 0);
  const t5 = th(f(B.five) - 1), t10 = th(f(B.septillion) - 1), tY = th(f(B.years) - 1);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <g transform={`translate(${x} ${y}) scale(${sc})`} style={{ filter: "drop-shadow(0 5px 12px rgba(14,6,40,0.95))" }}>
        <ellipse cx={0} cy={90} rx={230} ry={200} fill="#0E0628" opacity={0.42} filter="url(#soft14)" />
        <g transform={`scale(${1 + t5})`}>
          <text x={-22} y={0} textAnchor="middle" fontFamily={COND} fontWeight={800} fontSize={118} fill={C.gold} letterSpacing={2}>5 MIN</text>
          <path d="M120,-50 l18,20 l38,-50" fill="none" stroke={C.cream} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={110} strokeDashoffset={110 * (1 - done)} />
        </g>
        <g fontFamily={COND} fontWeight={800} textAnchor="middle" fill={C.cream}>
          <text x={0} y={74} fontSize={60} transform={`translate(0 52) scale(${1 + t10}) translate(0 -52)`}><tspan fill={C.lilac} fontSize={50}>vs </tspan>10</text>
          <text x={0} y={138} fontSize={66} transform={`translate(0 116) scale(${1 + t10}) translate(0 -116)`}>SEPTILLION</text>
          <text x={0} y={198} fontSize={60} transform={`translate(0 178) scale(${1 + tY}) translate(0 -178)`}>YEARS</text>
        </g>
      </g>
    </svg>
  );
};

// Screen-space race readouts (they fly out at T.clear): the exact 10^25-years figure (frozen once its
// digits have slotted in) and the deep-time tape: 66 million years (T-rex), 5 billion (the Sun dies),
// 13.8 billion (the universe's age) ... and 10 septillion years is 725 trillion of those. Placed above
// the caption column and clear of Madhav in the corner (his hair top ~1150 on the right).
const Overlay: React.FC<{ fr: number }> = ({ fr }) => {
  const k = interpolate(fr, [f(T.counter), f(T.counterIn)], [0, 1], clamp);
  const drop = prog(fr, f(T.clear), 8, easeIn);
  if (fr < f(T.counter) - 1 || drop >= 1) return null;
  const tapeIn = prog(fr, f(T.tapeIn), 10);
  const off = mix(fr, [[f(T.tapeIn), 540 + 460], [f(T.dino), 470], [f(T.sun), -170], [f(T.galaxy), -810]]);
  const BASE = 1158;
  const sunK = interpolate(fr, [f(T.sun) - 8, f(T.sun) + 14], [0, 1], clamp);
  const times = pop(fr, f(T.times), 11);
  const lbl = (x: number, s: string, icon: number) => <text x={x} y={BASE - 30} fontFamily={COND} fontWeight={800} fontSize={46} fill={C.cream} opacity={Math.max(0, Math.min(1, 1.6 - Math.abs(icon - 470) / 280))}>{s}</text>;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, transform: `translate(${-drop * 1150}px, ${-drop * 60}px)` }}>
      <defs>
        <radialGradient id="ovShade" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#0E0628" stopOpacity={0.62} />
          <stop offset="0.6" stopColor="#0E0628" stopOpacity={0.42} />
          <stop offset="1" stopColor="#0E0628" stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={540} cy={1040} rx={720} ry={230} fill="url(#ovShade)" />
      <g style={{ filter: "drop-shadow(0 4px 12px rgba(14,6,40,0.9))" }}>
        <Odometer fr={fr} x={540} y={956} size={62} k={k} spin={0} />
        <text x={540} y={996} textAnchor="middle" fontFamily={NUNITO} fontWeight={900} fontSize={32} letterSpacing={4} fill={C.lilac} opacity={Math.min(1, k * 2)}>YEARS ON A SUPERCOMPUTER</text>
        {/* unspoken footnote: what the race really was */}
        <text x={540} y={1026} textAnchor="middle" fontFamily={NUNITO} fontWeight={700} fontSize={24} letterSpacing={1} fill="#B8AEE8" opacity={0.9 * Math.min(1, k * 2)}>Willow, Dec 2024 · benchmark task</text>
      </g>
      {tapeIn > 0 && (
        <g opacity={tapeIn} transform={`translate(0 ${(1 - tapeIn) * 60})`} style={{ filter: "drop-shadow(0 4px 10px rgba(14,6,40,0.85))" }}>
          <line x1={0} y1={BASE} x2={1080} y2={BASE} stroke="#8C7CE8" strokeWidth={4} opacity={0.7} />
          {Array.from({ length: 40 }, (_, i) => {
            const x = (((i * 60 + off) % 2400) + 2400) % 2400 - 300;
            return <line key={i} x1={x} y1={BASE} x2={x} y2={BASE + (i % 5 ? 10 : 20)} stroke="#8C7CE8" strokeWidth={3} opacity={0.6} />;
          })}
          <Dino x={off} y={BASE} s={0.95} step={fr * 0.55} />
          {lbl(off + 112, "66 MILLION YRS", off)}
          <g transform={`translate(${off + 640} ${BASE - 72}) scale(1.0)`}><DyingSun x={0} y={0} k={sunK} fr={fr} /></g>
          {lbl(off + 640 + 112, "5 BILLION YRS", off + 640)}
          <MiniGalaxy x={off + 1280} y={BASE - 60} s={1.0} fr={fr} />
          {lbl(off + 1280 + 120, "13.8 BILLION YRS", off + 1280)}
          {times > 0 && (
            <g transform={`translate(${off + 1280 + 120} ${BASE - 86}) scale(${0.6 + 0.4 * Math.min(1.1, times)})`}>
              <text x={0} y={0} fontFamily={COND} fontWeight={800} fontSize={54} fill="#FF8A78" opacity={Math.min(1, times)}>× 725 TRILLION</text>
            </g>
          )}
        </g>
      )}
    </svg>
  );
};
export { B };
