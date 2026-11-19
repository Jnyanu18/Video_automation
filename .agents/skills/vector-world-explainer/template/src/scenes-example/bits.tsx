import React from "react";
import { interpolate } from "remotion";
import { clamp, ease, easeIn, f, mix, pop, prog, type SceneProps } from "../lib";
import { Laptop, SwitchGrid } from "../kit/props";
import { FlatCoin } from "../kit/coin";
import { C, NUNITO } from "../kit/palette";
import { Sparkles } from "../kit/room";
import { camAt, type Key } from "../kit/camera";
import { Motes, Steam } from "../kit/life";
import { Stage, Study } from "./stage";
import { BITS } from "./bits-events";

// Bits: starts pushed into the laptop's glowing screen (the hook's chip light lands there), pulls
// back to the laptop on the desk -> x-ray onto its processor -> dive into billions of switches ->
// a ripple of flips on "bits" -> push in on one switch (0, then 1) -> it rounds into the gold coin,
// lifts off and (match on the coin) tips flat onto the desk: heads = 1, then it hops to tails = 0.
const LAP = { x: 540, y: 1250 };
const CPU: [number, number] = [540, 1250 + 125];
const SCREEN_C: [number, number] = [540, 1015]; // centre of the laptop screen, world
const HERO: [number, number] = [600, 960]; // the hero switch, screen px (centre of the field)
const COIN = { x: 600, y: 1290 };

export const Bits: React.FC<SceneProps> = ({ fr }) => {
  const s = f(BITS.start), tx = f(BITS.xray), tz = f(BITS.dive), tc = f(BITS.cut), tl = f(BITS.land);
  const coinPhase = fr >= tc;
  // pushed in: the screen centre sits at screen y 700 (where the hook's die glow lands)
  const z0 = 2.5;
  const keys: Key[] = coinPhase
    ? [[tc, { x: 540, y: COIN.y - 125, zoom: 1.0 }], [tl + 10, { x: 560, y: 1090, zoom: 1.12 }, ease], [f(BITS.tails), { x: 560, y: 1060, zoom: 1.1 }], [f(BITS.tails) + 25, { x: 560, y: 1040, zoom: 1.08 }]]
    : [[s, { x: SCREEN_C[0], y: SCREEN_C[1] + 260 / z0, zoom: z0 }], [f(BITS.pullDone), { x: 540, y: 1150, zoom: 1.22 }, ease], [tx, { x: 540, y: 1135, zoom: 1.12 }], [tz - 4, { x: 540, y: 1300, zoom: 1.3 }], [tz + 18, { x: CPU[0], y: CPU[1], zoom: 9 }, easeIn]];
  const cam = camAt(fr, keys);
  const grid = coinPhase ? 0 : interpolate(cam.zoom, [3, 6], [0, 1], clamp);
  const xray = prog(fr, tx, 14);
  const screenHot = 1 - prog(fr, s, 16);
  // ---- coin on the desk
  const fallT = prog(fr, tc, tl - tc, easeIn);
  const tiltT = prog(fr, tc, tl - tc + 2, ease);
  const k = 1 - 0.5 * tiltT;
  const bounce = fr >= tl ? Math.sin(Math.min(1, (fr - tl) / 7) * Math.PI) * 18 * (1 - Math.min(1, (fr - tl) / 7)) : 0;
  const landSq = fr >= tl ? 1 - 0.12 * Math.exp(-(fr - tl) / 3) * Math.cos((fr - tl) * 0.9) : 1;
  const flip = prog(fr, f(BITS.tails) - 1, 10);
  const face: 0 | 1 = flip < 0.5 ? 1 : 0;
  const squash = Math.max(0.06, Math.abs(Math.cos(flip * Math.PI)));
  const hop = Math.sin(flip * Math.PI) * 90;
  const headsPop = pop(fr, f(BITS.heads), 9);
  const heroGlow = coinPhase ? mix(fr, [[tc, 0.75], [tl, 0.8], [f(BITS.heads), 1.15], [f(BITS.heads) + 10, 0.95]]) : 0;
  const coinY = COIN.y - 120 * (1 - fallT) - bounce - hop;
  // ---- the switch field (screen space)
  const g0 = interpolate(fr, [tz + 10, f(BITS.ripple)], [0.8, 1.0], clamp);
  const push = prog(fr, f(BITS.pushHero), 20);
  const liftK = prog(fr, f(BITS.lift), tc - f(BITS.lift), easeIn);
  const g = g0 * (1 + 0.9 * push + 0.08 * prog(fr, f(BITS.zero), 60)) * (1 - 0.15 * liftK);
  const morph = prog(fr, f(BITS.lift) - 8, 8);
  const ripple = prog(fr, f(BITS.ripple), 26);
  return (
    <>
      <Stage fr={fr} keys={keys}>
        {!coinPhase ? (
          <Study fr={fr} glow={{ x: 540, y: 1000, r: 620, kind: "Teal", k: 0.55 + 0.4 * screenHot }} over={<Steam fr={fr} x={1030} y={1150} />}>
            <Laptop fr={fr} x={LAP.x} y={LAP.y} s={1} xray={xray} xrayR={135} cpuGlow={0.6 + 0.4 * xray} />
            {/* the hook's chip light still on the screen as we pull out */}
            <path d={`M${LAP.x - 352},${LAP.y - 14} L${LAP.x - 334},${LAP.y - 448} L${LAP.x + 334},${LAP.y - 448} L${LAP.x + 352},${LAP.y - 14}Z`} fill="#FFE6A0" opacity={0.4 * screenHot * screenHot} />
            <circle cx={SCREEN_C[0]} cy={SCREEN_C[1]} r={520} fill="url(#glowGold)" opacity={screenHot} />
            <FlatCoin x={58} y={1330} r={60} face={1} rimGlow={0.5} />
            <Motes fr={fr} x={160} y={700} w={760} h={560} n={22} seed="bm" c="#CFE0FF" />
          </Study>
        ) : (
          <Study fr={fr} glow={{ x: 600, y: 1150, r: 640, k: heroGlow }} over={<Steam fr={fr} x={1030} y={1150} />}>
            <g opacity={0.9}>
              <Laptop fr={fr} x={250} y={1090} s={0.5} />
            </g>
            {/* a row of other bits on the desk, each a coin lying 1 or 0 */}
            {[1, 0, 1, 1, 0].map((b, i) => (
              <FlatCoin key={i} x={640 + i * 82} y={1095 + i * 4} r={34} k={0.42} face={b as 0 | 1} rimGlow={0.4} dim={0.15} />
            ))}
            {/* contact shadow grows as the coin comes down */}
            <ellipse cx={COIN.x + 16} cy={COIN.y + 40} rx={190 * (0.6 + 0.4 * fallT) * (1 - hop / 300)} ry={56 * (0.6 + 0.4 * fallT)} fill="#120830" opacity={0.45 * fallT} filter="url(#soft8)" />
            <g transform={`translate(${COIN.x} ${coinY}) scale(${1 + 0.06 * Math.min(1, headsPop) * (1 - prog(fr, f(BITS.heads) + 8, 10))})`}>
              <g transform={`scale(${2 - landSq} ${(0.25 + 0.75 * squash) * landSq})`}>
                <FlatCoin x={0} y={0} r={170} k={k} face={face} shadow={false} />
              </g>
            </g>
            <Sparkles fr={fr} x={600} y={1230} r={260} n={9} seed="bt" />
            <Motes fr={fr} x={300} y={900} w={600} h={420} n={18} seed="bc" />
          </Study>
        )}
      </Stage>
      {/* inside the processor: a field of switches, each a 0 or a 1 */}
      {grid > 0 && (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: grid }}>
          <rect width={1080} height={1920} fill="#1A1146" />
          <g transform={`translate(${HERO[0]} ${HERO[1]}) scale(${g}) translate(${-HERO[0]} ${-HERO[1]})`}>
            <g opacity={1 - 0.75 * liftK}>
              <SwitchGrid fr={fr} x={-60} y={60} cols={10} rows={14} cell={120} hero={[5, 7]} />
            </g>
            {/* the ripple of flips on "bits": a ring of light running out from the hero */}
            {ripple > 0 && ripple < 1 && (
              <circle cx={HERO[0]} cy={HERO[1]} r={60 + ripple * 1100} fill="none" stroke={C.goldHi} strokeWidth={70 * (1 - ripple) + 10} opacity={0.55 * (1 - ripple)} />
            )}
            {/* the hero switch: 0 on "zero", 1 on "one"; then it rounds into the coin and lifts */}
            {(() => {
              const v = fr >= f(BITS.one) ? 1 : 0;
              const pk = pop(fr, f(v ? BITS.one : BITS.zero), 10);
              const sc = (1 + 0.25 * Math.min(1, pk) * (1 - morph)) * (1 + 0.8 * liftK);
              return (
                <g transform={`translate(${HERO[0]} ${HERO[1]}) scale(${sc})`}>
                  <circle r={130} fill="url(#glowGold)" opacity={0.9 + 0.3 * liftK} />
                  {morph < 1 ? (
                    <g>
                      <rect x={-56} y={-56} width={112} height={112} rx={20 + 36 * morph} fill={v ? C.gold : "#4B3FA0"} stroke={C.cream} strokeWidth={5} />
                      <text y={26} textAnchor="middle" fontFamily={NUNITO} fontWeight={900} fontSize={76} fill={v ? "#7A3F10" : C.cream}>{v}</text>
                    </g>
                  ) : (
                    <FlatCoin x={0} y={0} r={56} k={1} face={1} shadow={false} />
                  )}
                </g>
              );
            })()}
          </g>
          {/* keep the caption band calm: the tiles dim under it */}
          <defs>
            <linearGradient id="capDim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#120A33" stopOpacity={0} />
              <stop offset="0.25" stopColor="#120A33" stopOpacity={0.45} />
              <stop offset="0.75" stopColor="#120A33" stopOpacity={0.45} />
              <stop offset="1" stopColor="#120A33" stopOpacity={0} />
            </linearGradient>
          </defs>
          <rect x={0} y={1330} width={1080} height={300} fill="url(#capDim)" />
        </svg>
      )}
    </>
  );
};
