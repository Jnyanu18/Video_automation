import React from "react";
import { Easing, random } from "remotion";
import { easeIn, easeInOut, f, lerp, pop, prog, type SceneProps } from "../lib";
import { camAt, shake, type Cam, type Key } from "../kit/camera";
import { Laptop, QuantumChipTop } from "../kit/props";
import { C } from "../kit/palette";
import { Sparkles, type Glow } from "../kit/room";
import { Motes } from "../kit/life";
import { BookStack, EStage, GhostLaptop, NeqSign, aimCam } from "./kit/endkit";
import { BatDefs, CHIP_W, CH_S, CH_TOP, Gallery, Threads, lockAt, outXY } from "./kit/problems-kit";
import { ColdRoom, leafAt } from "./problems";
import { E } from "./ending-events";

// Ending. "So a quantum computer isn't a faster laptop": from problems' last frame the solved
// gallery slides away, the chandelier glides right and shrinks while a laptop on books slides in
// on the left; a coral speed-lined ghost of a faster laptop tries to overtake and smashes into a
// teal ≠. "It's a whole new kind of computer": the chandelier is the hero: its frost melts into
// glitter, a gold light runs down its plates, the room warms, the chip turns to face us, its qubits
// light in a wave and it hums teal rings on "new", "kind", "computer"; the camera pushes in and,
// after "computer." (last ~0.24 s), dives into the chip's glowing die: the cut frame is a gold glow at (540, 960).

const CH0 = { x: 540, top: CH_TOP, s: CH_S }, CH1 = { x: 840, top: 175, s: 0.52 };
const CHIP_Y = 1160; // the chip holder's top face, chandelier-local
const PLATES = [[0, 300], [230, 270], [450, 235], [650, 195], [830, 155], [990, 115]];
const DIE: [number, number] = [CH1.x, CH1.top + CHIP_Y * CH1.s];
const HERO: [number, number] = [CH1.x, DIE[1] + 50]; // hero framing: chip at about (540, 880), above the captions
const Z_HERO = 1.6, Z_DIE = 30;
const LAP = { x: 200, base: 1040, s: 0.48 };
const LAP_HINGE = LAP.base - 3 * 46 - (250 + 14) * LAP.s;
const NEQ = { x: 556, y: 700 };
const GHOST_Y = LAP_HINGE;
const CAM_HOLD = { x: 548, y: 826, zoom: 0.95 };

const chAt = (fr: number) => {
  const k = prog(fr, f(E.slide0), f(E.slide1) - f(E.slide0), easeInOut);
  return { k, x: lerp(CH0.x, CH1.x, k), top: lerp(CH0.top, CH1.top, k), s: Math.exp(lerp(Math.log(CH0.s), Math.log(CH1.s), k)) };
};

const camE = (fr: number): Cam => {
  const keys: Key[] = [[f(E.start), { x: 540, y: 860, zoom: 1.0 }], [f(E.slide1) + 4, { x: 540, y: 830, zoom: 0.94 }], [f(E.push0), CAM_HOLD]];
  if (fr < f(E.push0)) return camAt(fr, keys);
  if (fr < f(E.dive)) {
    const t = prog(fr, f(E.push0), f(E.dive) - f(E.push0), easeInOut);
    return { ...aimCam(t, CAM_HOLD, HERO, Z_HERO), rot: 0 };
  }
  // reaches the die (Z_DIE, centred) on the act's last frame
  const u = prog(fr, f(E.dive), f(E.end) - 1 - f(E.dive), Easing.bezier(0.5, 0, 0.85, 0.6));
  return { ...aimCam(u, { x: HERO[0], y: HERO[1], zoom: Z_HERO }, DIE, Z_DIE), rot: 0 };
};

export const Ending: React.FC<SceneProps> = ({ fr }) => {
  const ch = chAt(fr);
  const warm = prog(fr, f(E.warm), 18);
  const frost = lerp(1, 0.35, ch.k) * (1 - 0.7 * warm);
  const cold = (1 - 0.65 * ch.k) * (1 - warm);
  const chip: [number, number] = [ch.x, ch.top + CHIP_Y * ch.s];
  const cam = camE(fr);
  const diveK = prog(fr, f(E.dive), f(E.end) - f(E.dive), easeIn);
  const hh = Math.max(1e-4, 0.3 * prog(fr, f(E.start), 18) * (1 - diveK));
  // laptop on its book stack slides in from the left and lands
  const lk = pop(fr, f(E.lap0), 13);
  const lx = lerp(-560, LAP.x, lk);
  const lapLand = fr >= f(E.lap1) ? Math.exp(-(fr - f(E.lap1)) / 5) * Math.sin((fr - f(E.lap1)) * 0.9) : 0;
  // the ghost: accelerates in from the left, hits the ≠
  const tg0 = f(E.ghost0), tSm = f(E.smash);
  const gp = prog(fr, tg0, tSm - tg0, (x) => x ** 1.15);
  const gx = lerp(-420, NEQ.x - 78 * 0.95 - 430 * LAP.s - 8, gp);
  // the ≠ falls and slams down on "isn't"; pops away before the hero push
  const nk = prog(fr, f(E.neq) - 7, 7, easeIn);
  const ny = lerp(NEQ.y - 300, NEQ.y, nk);
  const nOut = prog(fr, f(E.neqOut), 7, easeIn);
  const dn = fr - f(E.neq);
  const nsq = dn < 0 ? 0 : dn < 2 ? 1 : Math.exp(-(dn - 2) / 3.5) * Math.cos((dn - 2) * 0.9);
  const npulse = 0.75 + 0.25 * Math.sin(fr * 0.18) + (fr >= f(E.fizzle) ? 0.4 * Math.exp(-(fr - f(E.fizzle)) / 6) : 0);
  // the chip turns to face us; its qubits light in a wave from the centre
  const tk = Math.min(1.06, pop(fr, f(E.chipTurn), 15));
  const turned = fr >= f(E.chipTurn);
  const qWave = (i: number) => {
    const r = Math.floor(i / 4), c = i % 4;
    const d = Math.abs(r - 1.5) + Math.abs(c - 1.5);
    const k = prog(fr, f(E.chipTurn) + 2 + d * 2, 6);
    return 0.35 + 0.9 * k + 0.25 * k * Math.sin(fr * 0.25 + i);
  };
  const glow: Glow = {
    x: lerp(540, ch.x, ch.k), y: lerp(1060, 860, ch.k), r: lerp(520, 460, ch.k) + 160 * warm, kind: "Gold", k: 0.9 + 0.1 * warm,
  };
  const lkS = lockAt(fr);
  const bloom = Math.pow(diveK, 1.4);
  const hums = [f(E.hum), ...E.hums.map(f)];
  return (
    <EStage fr={fr} cam={cam} handheld={hh} shake={[shake(fr, f(E.neq), 15, 10), shake(fr, f(E.lap1), 5, 10)]}>
      <BatDefs />
      <ColdRoom
        fr={fr}
        glow={glow}
        frost={frost}
        cold={cold}
        vapour={1 - 0.6 * ch.k - 0.4 * warm}
        ch={{ x: ch.x, top: ch.top, s: ch.s, chipGlow: 1.3 + 0.4 * warm, frost }}
        mug={160 * ch.k}
        leaf={leafAt(fr) + 300 * ch.k}
        behind={
          <g>
            {/* the room warms: gold light swells behind the chandelier */}
            <circle cx={ch.x} cy={ch.top + 560 * ch.s} r={700 * ch.s + 200} fill="url(#glowGold)" opacity={0.55 * warm} />
            {/* the laptop's screen light on the wall */}
            <circle cx={lx} cy={LAP_HINGE - 120} r={360} fill="url(#glowCold)" opacity={0.35 * lk} />
          </g>
        }
      >
        {/* the solved gallery slides away (it started in problems' last frames) */}
        <Threads fr={fr} chip={CHIP_W} />
        <Gallery fr={fr} />
        <Sparkles fr={fr} x={lkS.x + outXY("lock", fr).dx} y={lkS.y + 40 + outXY("lock", fr).dy} r={300 * lkS.s} n={10} seed="lk" />
        {/* the laptop, on a stack of books */}
        <g transform={`translate(0 ${lapLand * 4})`}>
          <BookStack x={lx} y={LAP.base} />
          <Laptop fr={fr} x={lx} y={LAP_HINGE} s={LAP.s} />
        </g>
        {/* warm: a gold light runs down the plates, top to bottom */}
        {PLATES.map(([py, pr], i) => {
          const t = prog(fr, f(E.warm) + i * 2, 12);
          return t > 0 && t < 1 ? <ellipse key={i} cx={ch.x} cy={ch.top + (py + 11) * ch.s} rx={pr * ch.s * (1 + 0.12 * t)} ry={pr * 0.22 * ch.s * (1 + 0.4 * t)} fill="none" stroke={C.goldHi} strokeWidth={14 * (1 - t) + 2} opacity={0.95 * Math.sin(Math.PI * t)} /> : null;
        })}
        {/* the chip, turned to face us */}
        {turned && (
          <g transform={`translate(${ch.x} ${ch.top}) scale(${ch.s}) translate(0 ${CHIP_Y})`}>
            <circle r={300} fill="url(#glowGold)" opacity={0.7 * Math.min(1, tk)} />
            <g transform={`scale(0.24 ${lerp(0.105, 0.24, tk)})`}>
              <QuantumChipTop fr={fr} glow={1.2} qubitGlow={qWave} />
            </g>
          </g>
        )}
        {/* the quantum machine hums: teal rings out of the chip */}
        {hums.map((h, n) => [0, 1].map((j) => {
          const a = prog(fr, h + j * 6, 24, Easing.out(Easing.quad));
          if (a <= 0 || a >= 1) return null;
          const R = (40 + (n === 3 ? 240 : 200) * a) * (ch.s / CH1.s) * 0.9;
          return <ellipse key={`${n}${j}`} cx={chip[0]} cy={chip[1]} rx={R} ry={R * (turned ? 0.85 : 0.55)} fill="none" stroke={C.tealHi} strokeWidth={8 * (1 - a)} opacity={0.9 * (1 - a)} />;
        }))}
        {/* the coral "faster laptop" ghost, then its shards */}
        {fr >= tg0 && fr < tSm && (
          <g transform={`translate(${gx} ${GHOST_Y - 26}) rotate(${-3 + 3 * gp})`}>
            <GhostLaptop fr={fr} s={LAP.s} speed={0.6 + gp} />
          </g>
        )}
        {fr >= tSm && fr < tSm + 40 && Array.from({ length: 16 }, (_, i) => {
          const age = (fr - tSm) / 30;
          const a = Math.PI * (0.6 + random(`gs${i}`) * 0.9);
          const sp = 260 + random(`gv${i}`) * 520;
          const x = NEQ.x - 90 + Math.cos(a) * sp * age, y = GHOST_Y - 150 + random(`gy${i}`) * 80 - Math.sin(a) * sp * 0.6 * age + 0.5 * 1600 * age * age;
          const sz = 8 + random(`gz${i}`) * 16;
          return <path key={i} transform={`translate(${x} ${y}) rotate(${age * 600 * (i % 2 ? 1 : -1)})`} d={`M${-sz},0 L0,${-sz * 0.7} L${sz},${sz * 0.3} L${-sz * 0.2},${sz * 0.8}Z`} fill={i % 3 ? C.coral : "#FFB3A6"} opacity={Math.max(0, 1 - age * 0.9)} />;
        })}
        {fr >= tSm && fr < tSm + 8 && <circle cx={NEQ.x - 80} cy={GHOST_Y - 110} r={60 + 18 * (fr - tSm)} fill="none" stroke="#FFD2C8" strokeWidth={10 - (fr - tSm)} opacity={0.8} />}
        {/* the ≠ */}
        {fr >= f(E.neq) - 7 && nOut < 1 && (
          <g transform={`translate(${NEQ.x} ${ny + 40 * 0.22 * nsq - 60 * nOut}) scale(${(0.45 + 0.55 * nk) * (1 - nOut) * (1 + 0.14 * nsq)} ${(0.45 + 0.55 * nk) * (1 - nOut) * (1 - 0.22 * nsq)})`}>
            <circle r={150} fill="#0B0626" opacity={0.45} filter="url(#soft14)" />
            <NeqSign s={0.95} glow={nk * npulse} />
          </g>
        )}
        {/* ice glitter: cold first, then the melting frost glints gold */}
        <Sparkles fr={fr} x={lerp(540, chip[0], ch.k)} y={lerp(640, 560, ch.k)} r={lerp(420, 280, ch.k)} n={16} seed="ice" c="#E6FBFF" />
        {warm > 0 && <Sparkles fr={fr} x={ch.x} y={ch.top + 560 * ch.s} r={420 * ch.s * (1 + 0.3 * warm)} n={Math.round(18 * warm)} seed="glit" c={C.goldHi} />}
        <Motes fr={fr} x={200} y={720} w={700} h={560} n={20} seed="um" />
        {/* the die's light swallowing the frame as we dive in */}
        {bloom > 0 && (
          <g>
            <circle cx={DIE[0]} cy={DIE[1]} r={1500 / cam.zoom} fill="url(#glowGold)" opacity={Math.min(1, 2 * bloom)} />
            <circle cx={DIE[0]} cy={DIE[1]} r={700 / cam.zoom} fill="#FFD574" opacity={0.85 * bloom} filter="url(#soft30)" />
            <circle cx={DIE[0]} cy={DIE[1]} r={360 / cam.zoom} fill="#FFF8E0" opacity={bloom} filter="url(#soft14)" />
          </g>
        )}
      </ColdRoom>
      <rect x={-2000} y={-2000} width={5080} height={5920} fill="#7FB8F0" opacity={0.16 * cold} />
    </EStage>
  );
};
