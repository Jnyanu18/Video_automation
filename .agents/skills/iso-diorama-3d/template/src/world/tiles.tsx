// The nine tiles of the island. All local coordinates: tile centre at 0, slab top at y = 0.
// +x = screen down-right, +z = screen down-left; the camera looks from (+x, +y, +z).
import React from "react";
import * as THREE from "three";
import { lerp, popS, progS, smooth } from "../lib";
import type { V3 } from "./cam";
import { T } from "./timing";
import { SW, SCALE, GLOW, SQUAD, BELT } from "./times";
import { Ball, Blob, Box, C, Cap, Coin, Cyl, FACE_CAM, G, Human, Puff, Robot, Tree, Bush, clay, swapAt } from "./parts";

export const HALF = 1.85;

// ---- swap slot helpers ----
const WALKERS = false; // v5: robots stream out of the plaza on "everywhere"; the swaps are puff pops
const Walker: React.FC<{ t: number; ts: number; from: V3; to: V3; pre?: { from0: V3; t0: number; t1: number } }> = ({ t, ts, from, to, pre }) => {
  if (!WALKERS) return null;
  const appear = pre ? -10 : ts - 1.7;
  if (t < appear || t > ts + 0.12) return null;
  const vis = pre ? 1 : popS(t, appear, 12);
  const shrink = 1 - progS(t, ts, 0.12);
  let pos: V3, walk = 0, ry = FACE_CAM;
  if (pre && t < pre.t1) {
    const k = (t - pre.t0) / (pre.t1 - pre.t0);
    const q = Math.max(0, Math.min(1, k));
    pos = [lerp(pre.from0[0], from[0], q), lerp(pre.from0[1], from[1], smooth(q * 1.4)), lerp(pre.from0[2], from[2], q)];
    if (q < 1) { walk = (t * 1.6 + 0.25) % 1; ry = Math.atan2(from[0] - pre.from0[0], from[2] - pre.from0[2]); }
  } else {
    const k = progS(t, ts - 1.3, 1.15, (x) => x);
    pos = [lerp(from[0], to[0], smooth(k)), lerp(from[1], to[1], k), lerp(from[2], to[2], smooth(k))];
    if (k > 0 && k < 1) { walk = (t * 2.2) % 1; ry = Math.atan2(to[0] - from[0], to[2] - from[2]); }
  }
  return <Robot p={pos} ry={ry} s={vis * shrink} t={t} walk={walk} />;
};

const side = (p: V3, d: V3 = [0.62, 0, 0.32]): V3 => [p[0] + d[0], p[1] + d[1], p[2] + d[2]];

// ---- tile base + flag ----
const TileBase: React.FC<{ color: string; t: number; taken?: number; human?: boolean }> = ({ color, t, taken, human }) => {
  const glow = human ? progS(t, GLOW, 0.8) : 0;
  const tk = taken !== undefined ? popS(t, taken, 11) : 0;
  return (
    <>
      <Box p={[0, -0.2, 0]} size={[HALF * 2, 0.4, HALF * 2]} color={color} round={0.1} e={glow > 0 ? "#ffcf7a" : undefined} ei={glow * 0.55} />
      {/* flag on the back-left corner: lavender robot flag when taken, warm heart flag for human tiles */}
      {(tk > 0.01 || glow > 0.01) && (
        <G p={[-HALF + 0.3, 0, HALF - 0.3]} s={Math.max(tk, glow)}>
          <Cyl p={[0, 0.55, 0]} rt={0.03} h={1.1} color={C.cream} seg={8} />
          <Box p={[0.0, 0.92, -0.22]} size={[0.04, 0.3, 0.42]} color={human ? C.butter : C.lav} e={human ? C.butter : C.lav} ei={0.35} round={0.03} r={[0, 0, 0]} />
          <Ball p={[0, 1.12, 0]} r={0.05} color={human ? C.coral : C.visor} e={human ? C.coral : C.visor} ei={1} seg={10} />
        </G>
      )}
    </>
  );
};

// ---- FOOD DELIVERY ----
const ring = (r0: number, r1: number, color: string, y = 0.01) => (
  <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} material={clay(color)} receiveShadow>
    <ringGeometry args={[r0, r1, 48]} />
  </mesh>
);

const Scooter: React.FC<{ rider: React.ReactNode }> = ({ rider }) => (
  <group>
    <Blob r={0.55} />
    <Cyl p={[0.3, 0.12, 0]} rt={0.12} h={0.08} color={C.navy} r={[Math.PI / 2, 0, 0]} seg={16} />
    <Cyl p={[-0.3, 0.12, 0]} rt={0.12} h={0.08} color={C.navy} r={[Math.PI / 2, 0, 0]} seg={16} />
    <Box p={[0, 0.24, 0]} size={[0.72, 0.14, 0.26]} color={C.coral} round={0.06} />
    <Box p={[0.3, 0.42, 0]} size={[0.1, 0.38, 0.18]} color={C.coral} round={0.04} />
    <Box p={[0.32, 0.62, 0]} size={[0.06, 0.05, 0.42]} color={C.navy} round={0.02} />
    <Box p={[-0.3, 0.48, 0]} size={[0.32, 0.3, 0.32]} color={C.butter} round={0.06} />
    <Box p={[-0.3, 0.48, 0.165]} size={[0.16, 0.12, 0.01]} color={C.coral} round={0.005} />
    <group position={[-0.02, 0.24, 0]} rotation={[0, Math.PI / 2, 0]}>{rider}</group>
  </group>
);

export const FoodTile: React.FC<{ t: number }> = ({ t }) => {
  const ts = SW.food, sw = swapAt(t, ts);
  const a0 = Math.PI * 0.25;
  const a = a0 - 1.9 * smooth((t - ts - 0.3) / 2.0);
  const R = 1.25;
  const sp: V3 = [Math.cos(a) * R, 0, Math.sin(a) * R];
  const head = -a + Math.PI; // tangent heading (clockwise as seen from above)
  const rider = t < ts ? <Human p={[0, 0, 0]} ry={0} t={t} s={sw.human} sit shirt={C.coralDeep} hat="cap" hatColor={C.butter} /> : <Robot p={[0, 0, 0]} ry={0} t={t} s={sw.rs} sit />;
  return (
    <>
      <TileBase color={C.teal} t={t} taken={ts} />
      {ring(1.02, 1.48, C.sand)}
      {/* stall with a giant burger */}
      <G p={[-0.05, 0, -0.05]}>
        <Blob r={0.7} />
        <Box p={[0, 0.32, 0]} size={[0.8, 0.64, 0.7]} color={C.cream} round={0.08} />
        <Box p={[0.12, 0.45, 0.36]} size={[0.5, 0.26, 0.02]} color={C.coralDeep} round={0.01} />
        {[0, 1, 2, 3, 4].map((i) => <Box key={i} p={[-0.32 + i * 0.16, 0.7, 0.42]} size={[0.16, 0.06, 0.22]} color={i % 2 ? C.cream : C.coral} round={0.02} r={[0.4, 0, 0]} />)}
        <G p={[0, 0.82, 0]} r={[0, 0.5, 0]}>
          <Ball p={[0, 0.06, 0]} r={0.28} color={C.butterDeep} s={[1, 0.36, 1]} />
          <Cyl p={[0, 0.16, 0]} rt={0.29} h={0.07} color={C.greenDeep} />
          <Cyl p={[0, 0.22, 0]} rt={0.27} h={0.08} color="#8a4f3a" />
          <Ball p={[0, 0.27, 0]} r={0.28} color={C.butterDeep} s={[1, 0.55, 1]} />
        </G>
      </G>
      <G p={sp} r={[0, head, 0]}><Scooter rider={rider} /></G>
      <Puff p={sp} k={sw.puff} />
      <Walker t={t} ts={ts} from={[1.42, 0, -0.35]} to={side(sp, [0.35, 0, -0.45])} pre={{ from0: [2.9, -0.18, -0.35], t0: -0.75, t1: 0.75 }} />
      <Tree p={[-1.4, 0, 1.3]} s={0.85} />
      <Bush p={[1.4, 0, -1.4]} />
    </>
  );
};

// ---- CAR DRIVING ----
const Car: React.FC<{ driver: React.ReactNode }> = ({ driver }) => (
  <group>
    <Blob r={0.62} />
    {[[0.26, 0.21], [-0.26, 0.21], [0.26, -0.21], [-0.26, -0.21]].map(([x, z], i) => (
      <Cyl key={i} p={[x, 0.11, z]} rt={0.11} h={0.07} color={C.navy} r={[Math.PI / 2, 0, 0]} seg={14} />
    ))}
    <Box p={[0, 0.25, 0]} size={[0.9, 0.24, 0.48]} color={C.butter} round={0.1} />
    <Box p={[-0.05, 0.44, 0]} size={[0.5, 0.2, 0.42]} color={C.glass} round={0.08} />
    <Ball p={[0.45, 0.27, 0.15]} r={0.04} color={C.white} e={C.butter} ei={1} seg={8} />
    <Ball p={[0.45, 0.27, -0.15]} r={0.04} color={C.white} e={C.butter} ei={1} seg={8} />
    <group position={[0.02, 0.36, 0]}>{driver}</group>
  </group>
);
const humanHead = (s: number) => (
  <G s={s} p={[0, 0.17, 0]}>
    <Ball r={0.13} color={C.skin} />
    <Ball p={[0, 0.035, -0.01]} r={0.135} color={C.hair} s={[1.02, 0.78, 1.02]} />
  </G>
);
const robotHead = (s: number) => (
  <G s={s} p={[0, 0.17, 0]}>
    <Box size={[0.28, 0.22, 0.26]} color={C.lavPale} round={0.08} />
    <Box p={[0.12, 0, 0]} size={[0.06, 0.09, 0.22]} color={C.visor} e={C.visor} ei={1.6} round={0.03} noShadow />
    <Ball p={[0, 0.17, 0]} r={0.035} color={C.coral} e={C.coral} ei={0.6} seg={8} />
  </G>
);

export const CarTile: React.FC<{ t: number }> = ({ t }) => {
  const ts = SW.car, sw = swapAt(t, ts);
  const a0 = Math.PI * 0.25;
  const a = a0 + 1.6 * smooth((t - ts - 0.3) / 2.0);
  const R = 1.2;
  const cp: V3 = [Math.cos(a) * R, 0, Math.sin(a) * R];
  const head = -a - Math.PI / 2;
  return (
    <>
      <TileBase color={C.tealDeep} t={t} taken={ts} />
      {ring(0.95, 1.48, C.road)}
      {Array.from({ length: 14 }, (_, i) => {
        const b = (i / 14) * Math.PI * 2;
        return <Box key={i} p={[Math.cos(b) * 1.215, 0.015, Math.sin(b) * 1.215]} size={[0.16, 0.02, 0.05]} r={[0, -b + Math.PI / 2, 0]} color={C.cream} round={0.01} noShadow />;
      })}
      <Cyl p={[0, 0.04, 0]} rt={0.92} h={0.08} color={C.green} seg={40} />
      <Tree p={[-0.15, 0.08, -0.2]} s={1.05} />
      <Tree p={[0.35, 0.08, 0.25]} s={0.7} kind={1} />
      <G p={cp} r={[0, head, 0]}><Car driver={t < ts ? humanHead(sw.human) : robotHead(sw.rs)} /></G>
      <Puff p={cp} k={sw.puff} />
      <Walker t={t} ts={ts} from={[1.7, 0, -1.2]} to={side(cp, [0.25, 0, -0.55])} />
      <Bush p={[-1.55, 0, 1.5]} />
      <G p={[1.6, 0, -1.6]}><Cyl p={[0, 0.35, 0]} rt={0.03} h={0.7} color={C.navy} seg={8} /><Box p={[0, 0.72, 0]} size={[0.12, 0.3, 0.12]} color={C.navy} round={0.03} /><Ball p={[0.07, 0.8, 0]} r={0.035} color={C.coral} e={C.coral} ei={1.2} seg={8} /><Ball p={[0.07, 0.64, 0]} r={0.035} color={C.green} e={C.green} ei={1} seg={8} /></G>
    </>
  );
};

// ---- WAREHOUSE (autonomous work) ----
const Crate: React.FC<{ p: V3; color?: string; s?: number }> = ({ p, color = C.wood, s = 1 }) => <Box p={p} size={[0.3 * s, 0.26 * s, 0.3 * s]} color={color} round={0.03} />;

export const WareTile: React.FC<{ t: number }> = ({ t }) => {
  const ts = SW.ware, sw = swapAt(t, ts);
  const slot: V3 = [0.35, 0, 0.45];
  // after the swap the robot shuttles crates between the rack and the pallet
  const sh = smooth((t - ts - 0.3) / 1.4);
  const rp: V3 = [lerp(slot[0], -0.55, sh), 0, lerp(slot[2], 0.75, sh)];
  const dir = 1;
  const cx = 0.7;
  return (
    <>
      <TileBase color={C.teal} t={t} taken={ts} />
      {/* rack along the back (-x) edge */}
      <G p={[-1.35, 0, -0.1]}>
        <Blob r={1.1} />
        {[-1.2, 1.2].map((z) => <Box key={z} p={[0, 0.7, z]} size={[0.5, 1.4, 0.08]} color={C.navy} round={0.03} />)}
        {[0.25, 0.75, 1.25].map((y) => <Box key={y} p={[0, y, 0]} size={[0.52, 0.05, 2.5]} color={C.road} round={0.02} />)}
        {[0.25, 0.75, 1.25].flatMap((y, i) => [-0.9, -0.45, 0, 0.45, 0.9].map((z, j) => ((i + j) % 4 === 3 ? null : <Crate key={`${y}${z}`} p={[0, y + 0.16, z]} color={[C.wood, C.butter, C.coral, C.butterDeep][(i * 2 + j) % 4]} />)))}
      </G>
      {/* pallet + stack */}
      <G p={[-0.55, 0, 1.15]}>
        <Box p={[0, 0.05, 0]} size={[0.7, 0.1, 0.7]} color={C.wood} round={0.02} />
        <Crate p={[-0.15, 0.24, -0.15]} /><Crate p={[0.17, 0.24, -0.15]} color={C.butter} /><Crate p={[-0.15, 0.24, 0.17]} color={C.coral} />
        {t > ts + 1.8 && <Crate p={[0.17, 0.24, 0.17]} color={C.butterDeep} />}
      </G>
      {/* little autonomous cart on a lane */}
      <Box p={[1.15, 0.006, 0]} size={[0.5, 0.012, 3.3]} color={C.butter} round={0.005} noShadow />
      <G p={[1.15, 0, cx]}>
        <Blob r={0.35} />
        <Box p={[0, 0.14, 0]} size={[0.36, 0.18, 0.46]} color={C.lavPale} round={0.07} />
        <Ball p={[0, 0.27, 0]} r={0.05} color={C.visor} e={C.visor} ei={1.5} seg={10} />
        <Crate p={[0, 0.36, 0]} color={C.coral} s={0.8} />
      </G>
      {t < ts && <Human p={slot} t={t} s={sw.human} shirt={C.butter} hat="cap" hatColor={C.coral} act={0.15} tool={<Crate p={[0, 0, 0.12]} />} />}
      {t >= ts && <Robot p={rp} ry={dir > 0 ? Math.atan2(-0.9, 0.3) : Math.atan2(0.9, -0.3)} t={t} s={sw.rs} walk={sh > 0 && sh < 1 ? (t * 2.2) % 1 : 0} tool={<Crate p={[0, 0, 0.12]} color={C.butterDeep} />} />}
      <Puff p={slot} k={sw.puff} />
      <Walker t={t} ts={ts} from={[1.6, 0, -1.5]} to={side(slot, [0.55, 0, -0.35])} />
    </>
  );
};

// ---- COAL MINE ----
export const CoalTile: React.FC<{ t: number }> = ({ t }) => {
  const ts = SW.coal, sw = swapAt(t, ts);
  const slot: V3 = [0.55, 0, -0.3];
  const swing = 0.5;
  const pick = (
    <group rotation={[0.3, 0, 0]}>
      <Cyl p={[0, 0, 0.12]} rt={0.025} h={0.42} color={C.wood} r={[Math.PI / 2, 0, 0]} seg={8} />
      <Box p={[0, 0.0, 0.33]} size={[0.06, 0.3, 0.06]} color={C.road} round={0.02} />
    </group>
  );
  // the cart rolls out of the mine once the robot works it
  const roll = smooth((t - ts - 0.4) / 1.6);
  const cartP: V3 = [lerp(-0.2, 1.1, roll), 0, lerp(-0.2, 1.1, roll)];
  return (
    <>
      <TileBase color={C.sand} t={t} taken={ts} />
      <G p={[-0.75, 0, -0.75]}>
        <Blob r={1.4} o={0.9} />
        <mesh position={[0, 0.25, 0]} scale={[1.35, 0.85, 1.35]} material={clay("#7a6f8c")} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
        <mesh position={[-0.2, 0.75, 0.3]} scale={[0.6, 0.45, 0.6]} material={clay(C.coal)} castShadow>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
        {/* entrance facing the camera */}
        <G p={[0.72, 0, 0.72]} r={[0, FACE_CAM, 0]}>
          <Box p={[0, 0.38, 0]} size={[0.66, 0.76, 0.16]} color="#2b2638" round={0.06} />
          <Box p={[-0.38, 0.42, 0.05]} size={[0.1, 0.84, 0.12]} color={C.wood} round={0.02} />
          <Box p={[0.38, 0.42, 0.05]} size={[0.1, 0.84, 0.12]} color={C.wood} round={0.02} />
          <Box p={[0, 0.86, 0.05]} size={[0.9, 0.1, 0.14]} color={C.wood} round={0.02} />
          <Ball p={[0, 0.7, 0.14]} r={0.05} color={C.white} e={C.butter} ei={1.6} seg={10} />
        </G>
      </G>
      {/* rails out of the mine */}
      <G p={[0.4, 0, 0.4]} r={[0, FACE_CAM, 0]}>
        <Box p={[-0.14, 0.02, 0]} size={[0.04, 0.04, 2.0]} color={C.road} round={0.01} noShadow />
        <Box p={[0.14, 0.02, 0]} size={[0.04, 0.04, 2.0]} color={C.road} round={0.01} noShadow />
        {Array.from({ length: 7 }, (_, i) => <Box key={i} p={[0, 0.01, -0.9 + i * 0.3]} size={[0.42, 0.02, 0.08]} color={C.wood} round={0.01} noShadow />)}
      </G>
      <G p={cartP} r={[0, FACE_CAM, 0]}>
        <Blob r={0.4} />
        <Box p={[0, 0.2, 0]} size={[0.42, 0.26, 0.52]} color={C.coralDeep} round={0.05} />
        {[[-0.08, -0.1], [0.08, 0.08], [-0.05, 0.12], [0.1, -0.12], [0, 0]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.36, z]} scale={0.1} material={clay(C.coal)} castShadow><icosahedronGeometry args={[1, 0]} /></mesh>
        ))}
      </G>
      {t < ts && <Human p={slot} ry={FACE_CAM + 0.6} t={t} s={sw.human} shirt={C.coral} hat="helmet" act={0} tool={<group rotation={[swing, 0, 0]}>{pick}</group>} />}
      {t >= ts && <Robot p={slot} ry={FACE_CAM + 0.6} t={t} s={sw.rs} arms={0} tool={<group rotation={[swing, 0, 0]}>{pick}</group>} />}
      <Puff p={slot} k={sw.puff} />
      <Walker t={t} ts={ts} from={[1.55, 0, 1.5]} to={side(slot, [0.55, 0, 0.45])} />
      <Bush p={[1.45, 0, -1.45]} color={C.greenDeep} />
    </>
  );
};

// ---- CHAI CORNER (v5; the old house tile): two friends on a bench with chai, sip + gossip; a robot can't join ----
const Cup: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <G s={s} p={[0, 0.02, 0.1]}>
    <Cyl p={[0, 0, 0]} rt={0.07} rb={0.055} h={0.12} color={C.cream} seg={14} />
    <Cyl p={[0, 0.055, 0]} rt={0.062} h={0.012} color="#b97a4a" seg={14} />
  </G>
);
export const CHAI_A: V3 = [0.55, 0, 0.15];
export const CHAI_B: V3 = [0.15, 0, 0.55];
export const CHAI_BOT: V3 = [1.25, 0, 1.15];
export const HouseTile: React.FC<{ t: number }> = ({ t }) => {
  const sip = progS(t, T.sip, 0.35) * (1 - progS(t, T.sip + 1.1, 0.35));
  const botIn = popS(t, T.chai + 0.25, 12);
  return (
    <>
      <TileBase color={C.mint} t={t} human />
      <G p={[-0.6, 0, -0.6]}>
        <Blob r={1.2} />
        <Box p={[0, 0.48, 0]} size={[1.4, 0.96, 1.2]} color={C.cream} round={0.08} />
        {/* gable roof */}
        <mesh position={[0, 1.18, 0]} material={clay(C.coral)} castShadow>
          <cylinderGeometry args={[0.62, 0.62, 1.6, 3]} />
        </mesh>
        <Box p={[0.71, 0.3, 0.1]} size={[0.04, 0.5, 0.28]} color={C.coralDeep} round={0.02} />
        <Box p={[0.71, 0.58, -0.35]} size={[0.04, 0.26, 0.26]} color={C.glass} e="#ffe7a8" ei={0.5} round={0.02} />
        <Box p={[0.3, 0.6, 0.61]} size={[0.3, 0.28, 0.04]} color={C.glass} e="#ffe7a8" ei={0.5} round={0.02} />
        <Box p={[-0.3, 0.6, 0.61]} size={[0.3, 0.28, 0.04]} color={C.glass} e="#ffe7a8" ei={0.5} round={0.02} />
        <Box p={[-0.35, 1.45, -0.3]} size={[0.16, 0.36, 0.16]} color={C.clay} round={0.03} />
      </G>
      {/* chai stall: little table with a kettle, two benches for the two friends */}
      <G p={[0.75, 0, 0.75]}>
        <Blob r={0.4} />
        <Cyl p={[0, 0.22, 0]} rt={0.05} h={0.44} color={C.wood} seg={8} />
        <Cyl p={[0, 0.45, 0]} rt={0.3} h={0.05} color={C.butter} seg={22} />
        <Ball p={[0.02, 0.56, 0.02]} r={0.1} color={C.coralDeep} s={[1, 0.85, 1]} seg={14} />
        <Cyl p={[0.12, 0.6, 0.02]} rt={0.015} rb={0.025} h={0.12} color={C.coralDeep} r={[0, 0, -0.9]} seg={6} />
        <G p={[-0.12, 0.47, 0.08]}><Cup s={0.8} /></G>
      </G>
      <Box p={[CHAI_A[0] - 0.05, 0.12, CHAI_A[2] - 0.05]} size={[0.5, 0.24, 0.42]} color={C.wood} round={0.05} />
      <Box p={[CHAI_B[0] - 0.05, 0.12, CHAI_B[2] - 0.05]} size={[0.42, 0.24, 0.5]} color={C.wood} round={0.05} />
      <Human p={[CHAI_A[0], 0.24, CHAI_A[2]]} ry={Math.PI / 2 - 0.25} t={t} sit shirt={C.coral} act={0.1 + sip * 0.9} tool={<Cup />} />
      <Human p={[CHAI_B[0], 0.24, CHAI_B[2]]} ry={0.25} t={t} sit shirt={C.lav} act={0.12} tool={<Cup />} />
      {/* the robot stands at the edge, not part of the chat */}
      {botIn > 0.01 && <Robot p={CHAI_BOT} ry={FACE_CAM + 0.9} t={t} s={botIn} tilt={progS(t, T.sit, 0.4) * 0.16} />}
      <Tree p={[-1.45, 0, 1.4]} s={0.8} kind={1} />
      <Bush p={[0.2, 0, -1.5]} color={C.pink} />
    </>
  );
};

// ---- FACTORY LINE ----
export const FACTORY_SLOTS: V3[] = [-0.85, 0, 0.85].map((s) => [s * Math.SQRT1_2 - 0.45 * Math.SQRT1_2, 0, -s * Math.SQRT1_2 - 0.45 * Math.SQRT1_2] as V3);
export const FactoryTile: React.FC<{ t: number }> = ({ t }) => {
  const times = [SW.f1, SW.f2, SW.f3];
  const all = progS(t, SW.allRobot, 0.5);
  const roof = new THREE.Color(C.butter).lerp(new THREE.Color(C.lav), all).getStyle();
  return (
    <>
      <TileBase color={C.tealDeep} t={t} taken={SW.allRobot} />
      {/* back walls + sawtooth roof */}
      <Box p={[-1.6, 0.6, 0]} size={[0.2, 1.2, 3.5]} color={C.cream} round={0.06} />
      <Box p={[0, 0.6, -1.6]} size={[3.5, 1.2, 0.2]} color={C.cream} round={0.06} />
      {[-1.1, -0.35, 0.4].map((x, i) => (
        <mesh key={i} position={[x, 1.38, -1.25]} rotation={[0, 0, Math.PI / 2]} material={clay(roof)} castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.62, 3]} />
        </mesh>
      ))}
      <Cyl p={[-1.35, 0.8, -1.35]} rt={0.16} rb={0.2} h={1.6} color={C.coral} />
      {[0, 1, 2, 3].map((i) => {
        const ph = i / 4;
        return <Ball key={i} p={[-1.35 + ph * 0.6, 1.7 + ph * 0.8, -1.35 + ph * 0.3]} r={(0.1 + ph * 0.16) * (1 - ph * 0.6)} color={C.white} seg={12} />;
      })}
      {/* conveyor along the screen-horizontal */}
      <G r={[0, 3 * Math.PI / 4, 0]} p={[0.1, 0, 0.1]}>
        <Blob r={1.3} o={0.7} />
        <Box p={[0, 0.3, 0]} size={[0.5, 0.12, 3.0]} color={C.navy} round={0.05} />
        {[-1.2, 0, 1.2].map((z) => <Box key={z} p={[0, 0.12, z]} size={[0.4, 0.24, 0.1]} color={C.road} round={0.02} />)}
        {Array.from({ length: 5 }, (_, i) => {
          const z = -1.4 + (((smooth((t - BELT.a) / (BELT.b - BELT.a)) * 1.6 + i / 5) % 1) * 2.8);
          const painted = z > 0.1;
          return <Box key={i} p={[0, 0.48, z]} size={[0.26, 0.22, 0.26]} color={painted ? (all > 0.5 ? C.lav : C.coral) : C.wood} round={0.04} />;
        })}
      </G>
      {FACTORY_SLOTS.map((p, i) => {
        const ts = times[i], sw = swapAt(t, ts);
        const work = <group />;
        return (
          <React.Fragment key={i}>
            {t < ts && <Human p={p} t={t} s={sw.human} shirt={[C.coral, C.butter, C.lav][i]} hat="cap" hatColor={C.navy} act={0.35} />}
            {t >= ts && <Robot p={p} t={t} s={sw.rs} arms={0.4} tool={work} />}
            <Puff p={p} k={sw.puff} />
            <Walker t={t} ts={ts} from={[1.7, 0, 1.7 - i * 0.6]} to={side(p, [0.0, 0, 0.6])} />
          </React.Fragment>
        );
      })}
    </>
  );
};

// ---- JEWELLER ----
export const DIAMOND: V3 = [0.05, 1.05, 0.05];
export const JewelTile: React.FC<{ t: number }> = ({ t }) => {
  const glow = progS(t, GLOW, 0.8);
  const sp = popS(t, T.whichDiamond, 10);
  const robotIn = popS(t, T.robotCant, 12);
  const custIn = popS(t, T.whatPerson - 0.2, 12);
  return (
    <>
      <TileBase color={C.pink} t={t} human />
      {/* back walls */}
      <Box p={[-1.62, 0.7, 0]} size={[0.18, 1.4, 3.5]} color={C.cream} round={0.06} />
      <Box p={[0, 0.7, -1.62]} size={[3.5, 1.4, 0.18]} color={C.cream} round={0.06} />
      {/* striped awning over the back */}
      {Array.from({ length: 7 }, (_, i) => <Box key={i} p={[-1.35 + i * 0.45, 1.45, -1.3]} size={[0.45, 0.07, 0.6]} r={[0.35, 0, 0]} color={i % 2 ? C.cream : C.coral} round={0.02} />)}
      {/* display shelves on the side wall */}
      {[0.5, 0.95].map((y) => <Box key={y} p={[-1.42, y, 0]} size={[0.24, 0.05, 2.4]} color={C.wood} round={0.02} />)}
      {[-0.8, -0.2, 0.4, 1.0].map((z, i) => <mesh key={z} position={[-1.42, (i % 2 ? 1.06 : 0.6), z]} scale={0.09} material={clay([C.visor, C.pink, C.butter, C.lav][i], [C.visor, C.pink, C.butter, C.lav][i], 0.5)} castShadow><octahedronGeometry args={[1, 0]} /></mesh>)}
      {/* counter */}
      <Box p={[0.05, 0.38, 0.05]} size={[1.5, 0.76, 0.6]} color={C.lav} round={0.08} r={[0, FACE_CAM, 0]} />
      <Box p={[0.05, 0.79, 0.05]} size={[1.6, 0.06, 0.7]} color={C.cream} round={0.03} r={[0, FACE_CAM, 0]} />
      <Cyl p={[0.05, 0.86, 0.05]} rt={0.12} rb={0.16} h={0.1} color={C.navy} />
      {/* the diamond */}
      <mesh position={[DIAMOND[0], DIAMOND[1], DIAMOND[2]]} rotation={[0, 0.5 + smooth((t - T.whichDiamond) / 1.2) * Math.PI / 2, 0]} scale={[0.2 * (1 + sp * 0.25), 0.26 * (1 + sp * 0.25), 0.2 * (1 + sp * 0.25)]} castShadow>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#d9fbff" emissive="#9ff3ff" emissiveIntensity={0.55 + sp * 0.4 + glow * 0.2} roughness={0.15} metalness={0.1} flatShading />
      </mesh>
      {/* jeweller with a loupe behind the counter */}
      <Human p={[-0.55, 0, -0.55]} t={t} shirt={C.navy} apron={C.butter} act={0.05} tool={<Cyl p={[0, 0.03, 0.12]} rt={0.06} h={0.05} color={C.butterDeep} r={[Math.PI / 2, 0, 0]} seg={12} />} />
      {/* v5: the customer the diamond is chosen for, then a robot that shows up and is lost */}
      {custIn > 0.01 && <Human p={[0.75, 0, 0.75]} ry={FACE_CAM + Math.PI} t={t} s={custIn} shirt={C.pink} />}
      {robotIn > 0.01 && <Robot p={[1.3, 0, -0.2]} ry={FACE_CAM + Math.PI + 0.7} t={t} s={robotIn} tilt={0.14} />}
      <Tree p={[1.45, 0, -1.4]} s={0.75} color={C.green} />
    </>
  );
};

// ---- ART GALLERY ----
const paintingTex = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas"); c.width = 512; c.height = 360;
  const g = c.getContext("2d");
  if (!g) return null;
  const sky = g.createLinearGradient(0, 0, 0, 360);
  sky.addColorStop(0, "#ffb38a"); sky.addColorStop(0.55, "#ff8fa3"); sky.addColorStop(1, "#b49cf2");
  g.fillStyle = sky; g.fillRect(0, 0, 512, 360);
  g.fillStyle = "#ffe27a"; g.beginPath(); g.arc(340, 150, 62, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#6fc8b4"; g.beginPath(); g.moveTo(0, 270); g.bezierCurveTo(120, 190, 220, 300, 320, 240); g.bezierCurveTo(400, 200, 470, 250, 512, 230); g.lineTo(512, 360); g.lineTo(0, 360); g.fill();
  g.fillStyle = "#3f8f86"; g.beginPath(); g.moveTo(0, 320); g.bezierCurveTo(140, 270, 260, 350, 512, 300); g.lineTo(512, 360); g.lineTo(0, 360); g.fill();
  g.strokeStyle = "#fff6e6"; g.lineWidth = 9; g.lineCap = "round";
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(120 + i * 40, 90 + i * 12, 30 + i * 8, 3.6, 5.6); g.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
})();
export const PAINTING: V3 = [-0.05, 1.05, -1.47];
export const ART_GUY: V3 = [0.05, 0, -0.2];
export const ART_BOT: V3 = [0.9, 0, -0.35];
export const GalleryTile: React.FC<{ t: number }> = ({ t }) => {
  const glow = progS(t, GLOW, 0.8);
  const paintGlow = Math.max(progS(t, T.painting - 0.3, 0.5) * (1 - progS(t, T.artistic, 0.4)) * 0.6, glow * 0.5);
  const botIn = popS(t, T.howAI, 12);
  const botWalk = progS(t, T.howAI, 1.2);
  const botP: V3 = [lerp(1.6, ART_BOT[0], smooth(botWalk)), 0, lerp(1.3, ART_BOT[2], smooth(botWalk))];
  const confused = progS(t, T.valueFrom, 0.4);
  return (
    <>
      <TileBase color={C.lavPale} t={t} human />
      <Box p={[-1.62, 0.85, 0]} size={[0.18, 1.7, 3.5]} color={C.cream} round={0.06} />
      <Box p={[0, 0.85, -1.62]} size={[3.5, 1.7, 0.18]} color={C.white} round={0.06} />
      {/* main painting on the back wall */}
      <Box p={[PAINTING[0], PAINTING[1], -1.53]} size={[1.42, 1.02, 0.08]} color={C.butterDeep} e={C.butter} ei={paintGlow * 0.6} round={0.03} />
      {paintingTex && (
        <mesh position={[PAINTING[0], PAINTING[1], -1.485]}>
          <planeGeometry args={[1.24, 0.86]} />
          <meshStandardMaterial map={paintingTex} roughness={0.7} emissive="#ffffff" emissiveMap={paintingTex} emissiveIntensity={0.25 + paintGlow * 0.5} />
        </mesh>
      )}
      {/* small painting + bench + sculpture */}
      <Box p={[-1.52, 1.0, 0.4]} size={[0.06, 0.6, 0.8]} color={C.coral} round={0.02} />
      <Box p={[-1.5, 1.0, 0.4]} size={[0.06, 0.48, 0.66]} color={C.lav} round={0.02} />
      <Box p={[0.3, 0.17, 0.75]} size={[1.0, 0.1, 0.36]} color={C.wood} round={0.03} r={[0, FACE_CAM, 0]} />
      <Box p={[-0.9, 0.3, 1.0]} size={[0.36, 0.6, 0.36]} color={C.cream} round={0.04} />
      <mesh position={[-0.9, 0.82, 1.0]} rotation={[0.6, 0.8, 0]} scale={0.2} material={clay(C.coral)} castShadow><torusKnotGeometry args={[1, 0.35, 64, 10]} /></mesh>
      {/* the art guy, admiring */}
      <Human p={ART_GUY} ry={Math.PI - 0.35} t={t} shirt={C.butter} hat="beret" hatColor={C.coral} act={0.04} />
      {botIn > 0.01 && <Robot p={botP} ry={botWalk < 1 ? Math.atan2(ART_BOT[0] - 1.6, ART_BOT[2] - 1.3) : Math.PI + 0.25} t={t} s={botIn} walk={botWalk > 0 && botWalk < 1 ? (t * 2.2) % 1 : 0} tilt={confused * 0.2} />}
      <Bush p={[1.5, 0, 1.45]} color={C.green} />
    </>
  );
};


// ---- v5 squad: three humanoid robots on the plaza on "humanoid robot"; on "penetration everywhere" eight robots
// walk out in all directions (towards every tile), then fade once the camera has pulled out ----
const RT: V3 = [Math.SQRT1_2, 0, -Math.SQRT1_2]; // screen-right along the ground
const SQ_C: V3 = [0.15, 0, 0.15];
const sq = (k: number): V3 => [SQ_C[0] + RT[0] * k, 0, SQ_C[2] + RT[2] * k];
const Squad: React.FC<{ t: number }> = ({ t }) => {
  const vis = popS(t, SQUAD.in, 12) * (1 - progS(t, SQUAD.gone, 0.4));
  if (vis <= 0.01) return null;
  if (t < SQUAD.stream) return (
    <>
      <Robot p={sq(0.85)} t={t} s={vis} />
      <Robot p={sq(0)} t={t} s={vis * 1.08} />
      <Robot p={sq(-0.85)} t={t} s={vis} />
    </>
  );
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const out = progS(t, SQUAD.stream + (i % 4) * 0.1, 2.2, (q) => q);
        const r = 0.7 + out * 4.2;
        return <Robot key={i} p={[Math.cos(a) * r, 0, Math.sin(a) * r]} ry={Math.atan2(Math.cos(a), Math.sin(a))} t={t} s={vis * 0.95} walk={out < 1 ? (t * 2.4 + i * 0.13) % 1 : 0} />;
      })}
    </>
  );
};

// ---- PLAZA: deployment squad, plaza robots, the scale ----
export const SCALE_POS = { left: -1.25, right: 1.25, top: 2.05 };
// beam angle (rotation about the scale's local z): + = left (human) pan down, right (robot) pan up
export const scaleTilt = (t: number) => {
  return -popS(t, SCALE.tip, 9) * 0.32; // robot (right) pan goes down: repetitive work goes to the robot
};
export const PlazaTile: React.FC<{ t: number }> = ({ t }) => {
  const rise = popS(t, SCALE.rise, 12);
  const tiltA = scaleTilt(t);
  const L = SCALE_POS.left, R = SCALE_POS.right, top = SCALE_POS.top;
  // pan centres hang straight down from the beam ends (beam rotates about the post top)
  const lp: V3 = [L * Math.cos(tiltA), top + L * Math.sin(tiltA), 0];
  const rp: V3 = [R * Math.cos(tiltA), top + R * Math.sin(tiltA), 0];
  const pan = (p: V3, color: string, content: React.ReactNode) => (
    <G p={[p[0], p[1], 0]}>
      <Cyl p={[0, -0.45, 0]} rt={0.012} h={0.9} color={C.navy} seg={6} />
      <G p={[0, -0.92, 0]}>
        <Cyl p={[0, 0, 0]} rt={0.62} rb={0.48} h={0.12} color={color} seg={28} />
        <G p={[0, 0.06, 0]}>{content}</G>
      </G>
    </G>
  );
  const humanS = popS(t, SCALE.human, 11), robotS = popS(t, SCALE.robot, 11);

  return (
    <>
      <TileBase color={C.sand} t={t} />
      {[[-0.9, -0.9], [0.9, 0.9], [-0.9, 0.9], [0.9, -0.9]].map(([x, z], i) => <Box key={i} p={[x, 0.005, z]} size={[1.5, 0.01, 1.5]} color={i < 2 ? C.cream : "#f8e7c3"} round={0.004} noShadow />)}
      <Squad t={t} />
      {rise > 0.01 && (
        <G s={rise} r={[0, FACE_CAM, 0]}>
          <Blob r={1.5} />
          <Cyl p={[0, 0.08, 0]} rt={0.55} rb={0.65} h={0.16} color={C.lav} />
          <Cyl p={[0, top / 2, 0]} rt={0.08} rb={0.11} h={top} color={C.cream} seg={16} />
          <Ball p={[0, top + 0.12, 0]} r={0.14} color={C.butter} e={C.butter} ei={0.3} />
          <G p={[0, top, 0]} r={[0, 0, tiltA]}>
            <Box size={[R - L + 0.2, 0.12, 0.16]} color={C.coral} round={0.05} />
          </G>
          {pan(lp, C.butter, <>
            <Human p={[-0.18, 0, -0.05]} t={t} s={humanS} shirt={C.coral} />
          </>)}
          {pan(rp, C.lavPale, <>
            <Robot p={[0.18, 0, -0.05]} t={t} s={robotS} />
          </>)}
        </G>
      )}
    </>
  );
};
// screen anchors for the pans (scale group is rotated by FACE_CAM)
export const panWorld = (t: number, side: "L" | "R"): V3 => {
  const tiltA = scaleTilt(t);
  const x = side === "L" ? SCALE_POS.left : SCALE_POS.right;
  const lx = x * Math.cos(tiltA), ly = SCALE_POS.top + x * Math.sin(tiltA) - 0.92;
  return [lx * Math.cos(FACE_CAM), ly, -lx * Math.sin(FACE_CAM)];
};
