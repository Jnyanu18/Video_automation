// In front of the full-frame footage (FULL/FWD beats): a small transparent 3D canvas with the hook's
// motes squeezing on "compression", the cloud on "Think about it", and the seed floating beside him
// (right column, never on his face). Mounted only while the footage covers the frame.
import React from "react";
import { random } from "remotion";
import { B } from "../beats";
import { H, W, lerp, popS, progS, smooth } from "../lib";
import { ThreeCanvas } from "../kit/three-canvas";
import { type Pose, type V3, unproject } from "./cam";
import { AMBER, CYAN, CamRig, EnvMap, GlowPoints, RigCtx, Seed, VIOLET, type Rig } from "./parts";
import { HOOK, T } from "./timing";

const POSE: Pose = { p: [0, 0, 12], t: [0, 0, 0], fov: 40 };
const at = (x: number, y: number, d = 12): V3 => unproject(POSE, x, y, d);
const inB = (t: number, id: string) => t >= B[id].s && t < B[id].e;

export const frontActive = (t: number) => ["hook", "think", "beautiful", "maybe", "amazing", "question", "agi"].some((id) => inB(t, id));

const SEED_XY: Record<string, [number, number]> = { beautiful: [850, 700], maybe: [860, 640], amazing: [850, 700], agi: [840, 760] };

const Scene: React.FC<{ t: number }> = ({ t }) => {
  const rig: Rig = { pose: POSE, t, fog: 0 };
  const hookK = inB(t, "hook") || inB(t, "think");
  const squeeze = progS(t, HOOK.comp, 0.5);
  const gather = progS(t, T.think, 0.7);
  const seedBeat = (["beautiful", "maybe", "amazing", "agi"] as const).find((id) => inB(t, id));
  const seedIn = seedBeat ? popS(t, B[seedBeat].s + (seedBeat === "beautiful" ? 0.55 : 0.2), 12) : 0;
  const pulse = Math.exp(-Math.pow((t - T.pops - 0.2) / 0.3, 2)) + Math.exp(-Math.pow((t - T.soSmall - 0.1) / 0.3, 2));
  const xy = seedBeat ? SEED_XY[seedBeat] : [850, 700];
  return (
    <RigCtx.Provider value={rig}>
      <CamRig pose={POSE} />
      <EnvMap />
      <ambientLight intensity={0.3} />
      {hookK && (
        <GlowPoints n={150} maxSize={46} fill={(g) => {
          const tgt = at(800, 400, 12);
          for (let i = 0; i < 150; i++) {
            const hx = 120 + random(`hx${i}`) * 840, hy = 250 + random(`hy${i}`) * 260;
            const drift = at(hx + Math.sin(t * 0.7 + i) * 18, hy + Math.cos(t * 0.5 + i) * 14, 9 + random(`hz${i}`) * 6);
            const k = smooth(squeeze * 1.3 - random(`hk${i}`) * 0.3);
            const ca = random(`ca${i}`) * Math.PI * 2 + t * 0.6, cr = Math.sqrt(random(`cr${i}`)) * 80;
            const cloud = at(820 + Math.cos(ca) * cr, 420 + Math.sin(ca) * cr * 0.7, 11 + random(`cz${i}`) * 2);
            const p0: V3 = [lerp(drift[0], tgt[0], k), lerp(drift[1], tgt[1], k), lerp(drift[2], tgt[2], k)];
            const p: V3 = [lerp(p0[0], cloud[0], gather), lerp(p0[1], cloud[1], gather), lerp(p0[2], cloud[2], gather)];
            const a = progS(t, 0.1 + random(`ha${i}`) * 0.8, 0.5) * (0.5 + 0.5 * Math.sin(t * 2 + i));
            g.set(i, p, k > 0.8 || gather > 0.5 ? AMBER : i % 3 ? CYAN : VIOLET, 0.075 + 0.03 * k, a);
          }
        }} />
      )}
      {seedIn > 0.001 && <Seed p={at(xy[0], xy[1] + Math.sin(t * 1.1) * 10)} s={0.62 * seedIn} t={t} glow={1 + 1.2 * pulse} light={0} halo={0.8} />}
    </RigCtx.Provider>
  );
};

export const FrontCanvas: React.FC<{ t: number }> = ({ t }) => (
  <ThreeCanvas width={W} height={H} dpr={1} gl={{ antialias: true, alpha: true, premultipliedAlpha: true }} camera={{ fov: 40, near: 0.05, far: 500 }} style={{ position: "absolute", inset: 0 }}>
    <Scene t={t} />
  </ThreeCanvas>
);
