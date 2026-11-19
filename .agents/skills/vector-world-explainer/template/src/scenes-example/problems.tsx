import React from "react";
import { random } from "remotion";
import { f, lerp, mix, prog, type SceneProps } from "../lib";
import { Chandelier } from "../kit/objects";
import { Mug, NearLeaf, Sparkles, type Glow } from "../kit/room";
import { camAt } from "../kit/camera";
import { Motes, Steam } from "../kit/life";
import { BatDefs, CAM_KEYS, CHIP_W, CH_S, Gallery, SLOT, StudySky, Threads, camHH, chandAt, lockAt, outXY } from "./kit/problems-kit";
import { Stage, Study } from "./stage";
import { P } from "./problems-events";

// Problems: the molecule and padlock (from uses) settle into a small gallery of genuinely hard
// search problems around the study: medicines (a drug molecule over a protein's empty pocket),
// routes (a folded city delivery map), batteries (a cell and its cathode's crystal lattice) and
// codes (a combination padlock). On "very hard" the camera pushes into the map and every possible
// delivery tour multiplies into a coral tangle (the lattice jumbles, the lock's wheels spin). On
// "find the solution" a gold best tour starts drawing, flickers and breaks, twice. On "that's where
// quantum computers will come in" the camera pulls back and up as the gold dilution-refrigerator
// chandelier lowers into the study; its chip lights, frost creeps in, teal threads reach every
// problem and each one resolves (gold tour + van, ordered lattice + charge, docked molecule, open
// lock). END STATE (ending starts from it): camera {540, 860, 1.0} still, chandelier x 540 top -40
// s 1, frost 1, cold 1 (cool wash), threads retracting and the gallery starting to leave.

// One room for problems' tail and ending's head (ending passes its own chandelier state + props).
export const ColdRoom: React.FC<{
  fr: number; glow: Glow; frost: number; cold: number; vapour: number;
  ch: { x: number; top: number; s: number; sway?: number; chipGlow: number; frost: number };
  mug?: number; leaf?: number; behind?: React.ReactNode; children?: React.ReactNode; washK?: number;
}> = ({ fr, glow, frost, cold, vapour, ch, mug = 0, leaf = 0, behind, children }) => {
  const chip: [number, number] = [ch.x, ch.top + 1160 * ch.s];
  return (
    <Study fr={fr} frost={frost} sky={<StudySky fr={fr} />} glow={glow} fore={false}>
      {/* the chip's light on the wall around it */}
      <circle cx={chip[0]} cy={chip[1] - 60} r={420 * ch.s + 120} fill="url(#glowGold)" opacity={0.45 * Math.max(0, Math.min(1, (ch.chipGlow - 0.15) / 1.15))} />
      {/* cold light from the cryostat */}
      <ellipse cx={chip[0]} cy={lerp(620, 560, 1 - ch.s)} rx={520 * ch.s + 40} ry={700 * ch.s} fill="url(#glowCold)" opacity={0.55 * cold} />
      {behind}
      {/* the support rods it hangs from (up out of frame) */}
      <g transform={`rotate(${ch.sway ?? 0} ${ch.x} ${ch.top - 900})`}>
        {[-0.62, 0, 0.62].map((u, i) => (
          <g key={i}>
            <line x1={ch.x + u * 300 * ch.s} y1={ch.top - 1600} x2={ch.x + u * 300 * ch.s} y2={ch.top + 4} stroke="#2A1C5E" strokeWidth={16 * ch.s} />
            <line x1={ch.x + u * 300 * ch.s - 4} y1={ch.top - 1600} x2={ch.x + u * 300 * ch.s - 4} y2={ch.top + 4} stroke="#8E80C4" strokeWidth={4 * ch.s} opacity={0.6} />
          </g>
        ))}
        <Chandelier x={ch.x} top={ch.top} s={ch.s} fr={fr} frost={ch.frost} chipGlow={ch.chipGlow} />
      </g>
      {children}
      {/* cold vapour spilling off the bottom stage and pooling on the desk */}
      {vapour > 0 && [0, 1, 2, 3, 4, 5].map((i) => {
        const t = ((fr - f(P.frost)) * 0.02 + i / 6 + 10) % 1;
        return <ellipse key={i} cx={chip[0] + (i - 2.5) * 70 * (0.4 + t) * ch.s + Math.sin(fr * 0.05 + i) * 20} cy={chip[1] + 40 * ch.s + t * 120 * ch.s} rx={(60 + 160 * t) * ch.s} ry={(20 + 30 * t) * ch.s} fill="#E6FBFF" opacity={0.3 * Math.sin(Math.PI * t) * vapour} filter="url(#soft14)" />;
      })}
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse key={`p${i}`} cx={300 + i * 120 + Math.sin(fr * 0.05 + i) * 30} cy={1240 + (i % 2) * 40 + Math.sin(fr * 0.03 + i) * 10} rx={200} ry={46} fill="#E6FBFF" opacity={0.18 * cold * vapour} filter="url(#soft14)" />
      ))}
      <Steam fr={fr} x={1030 + mug} y={1150} o={1 - 0.7 * frost} />
      <Mug x={930 + mug} />
      <NearLeaf x={-20 - leaf} y={430 + 0.2 * leaf} />
    </Study>
  );
};

// the out-of-focus foreground leaf slides off left, clear of the molecule (ending carries it on)
export const leafAt = (fr: number) => 300 * prog(fr, f(P.start), f(P.slots) - f(P.start) + 8);

export const Problems: React.FC<SceneProps> = ({ fr }) => {
  const cam = camAt(fr, CAM_KEYS);
  const c = chandAt(fr);
  const frost = prog(fr, f(P.frost), 50);
  const cold = prog(fr, f(P.frost) - 6, 44);
  const on = prog(fr, f(P.chipOn), 20);
  const glow: Glow = {
    x: mix(fr, [[f(P.start), 600], [f(P.slots), 560], [f(P.chipOn), 540]]),
    y: mix(fr, [[f(P.start), 980], [f(P.slots), 900], [f(P.chipOn), 1060]]),
    r: mix(fr, [[f(P.start), 650], [f(P.slots), 700], [f(P.chipOn) + 20, 520]]),
    kind: "Gold",
    k: mix(fr, [[f(P.start), 0.85], [f(P.slots) + 6, 0.6], [f(P.tangle0), 0.5], [f(P.chipOn), 0.5], [f(P.chipOn) + 14, 0.9]]),
  };
  const lk = lockAt(fr);
  // the tangle's coral light on the wall while it's "very hard"
  const tangleLight = prog(fr, f(P.tangle0), 20) * (1 - prog(fr, f(P.lower0) + 10, 16));
  return (
    <Stage fr={fr} cam={cam} handheld={camHH(fr)}>
      <BatDefs />
      <ColdRoom
        fr={fr}
        glow={glow}
        frost={frost}
        cold={cold}
        vapour={prog(fr, f(P.frost), 30)}
        ch={{ x: 540, top: c.top, s: CH_S, sway: c.sway, chipGlow: c.chipGlow, frost }}
        leaf={leafAt(fr)}
        behind={<circle cx={SLOT.map.x} cy={SLOT.map.y} r={440} fill="url(#glowCoral)" opacity={0.45 * tangleLight} />}
      >
        <Threads fr={fr} chip={CHIP_W} />
        <Gallery fr={fr} />
        {/* the chip's light flaring as it switches on */}
        {on > 0 && on < 1 && <circle cx={CHIP_W[0]} cy={CHIP_W[1]} r={60 + 260 * on} fill="none" stroke="#FFF3C4" strokeWidth={12 * (1 - on)} opacity={0.9 * (1 - on)} />}
        <Sparkles fr={fr} x={lk.x + outXY("lock", fr).dx} y={lk.y + 40 + outXY("lock", fr).dy} r={300 * lk.s} n={10} seed="lk" />
        <Sparkles fr={fr} x={540} y={640} r={420} n={Math.round(16 * frost)} seed="ice" c="#E6FBFF" />
        <Motes fr={fr} x={200} y={720} w={700} h={560} n={20} seed="um" />
        {/* frost dust drifting down as it lowers through the cold */}
        {fr > f(P.lower0) && Array.from({ length: 24 }, (_, i) => {
          const t = ((fr - f(P.lower0)) * (0.01 + random(`fz${i}`) * 0.01) + random(`fo${i}`)) % 1;
          return <circle key={`fz${i}`} cx={240 + random(`fx${i}`) * 600 + Math.sin(fr * 0.05 + i) * 14} cy={c.top + 100 + t * 1100} r={2 + random(`fr${i}`) * 3} fill="#EAF9FF" opacity={0.6 * Math.sin(Math.PI * t) * (1 - prog(fr, f(P.land) + 20, 24))} />;
        })}
      </ColdRoom>
      {/* everything chills: a cool wash over the warm room */}
      <rect x={-2000} y={-2000} width={5080} height={5920} fill="#7FB8F0" opacity={0.16 * cold} />
    </Stage>
  );
};
