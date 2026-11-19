// Luminous Cosmos 3D world (style A in real 3D). Back = one three.js canvas with the current set(s),
// mounted only when the world is visible; Front = HTML labels/tags/end card, plus a small transparent
// 3D canvas (seed, motes) only while the footage covers the frame (FULL/FWD), so one canvas at a time.
import React from "react";
import { AbsoluteFill } from "remotion";
import type { WorldDef } from "../Film";
import { H, W } from "../lib";
import { presenter } from "../presenter";
import { ThreeCanvas } from "../kit/three-canvas";
import { Finish } from "../kit/finish";
import { CosmosCaption } from "./caption";
import { useFontsReady } from "./fonts";
import { CamRig, EnvMap, Fog, Motes, RigCtx, Sky, type Rig } from "./parts";
import { MAT, rigAt, type SetId } from "./rig";
import { FACE } from "./mats";
import { smooth } from "../lib";
import { FrontCanvas, frontActive } from "./front";
import { Overlays } from "./overlay";
import { SET_VIEWS } from "./sets";

export const covered = (t: number) => {
  const st = presenter(t);
  return st.vis && st.tile < 0.001 && st.garden > 0.999 && st.s >= 0.999;
};

const BackScene: React.FC<{ t: number }> = ({ t }) => {
  const a = rigAt(t);
  // keep bright points off his face while he stands beside the world (SIDE)
  const st = presenter(t);
  FACE.uFace.value.set(70, 900, 400, 1270);
  FACE.uFaceK.value = st.vis && st.tile < 0.01 ? (1 - st.garden) * smooth((st.x + 500) / 400) : 0;
  const rig: Rig = { pose: a.pose, t, fog: a.fog };
  const fonts = useFontsReady();
  return (
    <RigCtx.Provider value={rig}>
      <CamRig pose={a.pose} />
      <Fog />
      <EnvMap />
      <Sky />
      <Motes />
      {fonts && a.sets.map((id: SetId) => {
        const View = SET_VIEWS[id];
        const fade = a.trans && a.trans.from === id ? 1 - a.trans.k : 1;
        return (
          <group key={id} matrixAutoUpdate={false} matrix={MAT[id]}>
            <View fade={fade} />
          </group>
        );
      })}
    </RigCtx.Provider>
  );
};

const Back: React.FC<{ t: number; fr: number }> = ({ t, fr }) => {
  if (covered(t)) return null;
  return (
    <AbsoluteFill style={{ background: "#07051c" }}>
      <Finish fr={fr} bloom={0.8}>
        <ThreeCanvas width={W} height={H} dpr={1} gl={{ antialias: true, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.05, far: 5000 }}>
          <BackScene t={t} />
        </ThreeCanvas>
      </Finish>
    </AbsoluteFill>
  );
};

const Front: React.FC<{ t: number; fr: number }> = ({ t }) => {
  const cov = covered(t);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {cov && frontActive(t) && <FrontCanvas t={t} />}
      <Overlays t={t} covered={cov} />
    </AbsoluteFill>
  );
};

export const CosmosWorld: WorldDef = {
  Back,
  Front,
  Caption: CosmosCaption,
  bed: "bed-cosmos.wav",
  cutoutFilter: "drop-shadow(0 0 16px rgba(94,231,255,.5)) drop-shadow(0 0 2px rgba(150,240,255,.55))",
  tileStyle: {
    border: "9px solid rgba(190,245,255,.75)",
    boxShadow: "0 0 0 6px rgba(94,231,255,.35), 0 0 90px 24px rgba(94,231,255,.55), 0 30px 120px rgba(7,5,28,.8)",
  },
};
