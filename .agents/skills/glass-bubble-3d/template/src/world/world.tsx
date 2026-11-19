// "Real 3D glass bubble" world (c2-bubble). Back = one three.js canvas (studio, bubble, city, coins,
// threads, desk), mounted only when the world is visible; Front = HTML overlays plus a small transparent
// 3D canvas (the bubble beside him) only while the footage covers the frame. One canvas at a time.
import React from "react";
import { AbsoluteFill } from "remotion";
import type { WorldDef } from "../Film";
import { H, W, smooth } from "../lib";
import { presenter, SIDE_FACE } from "../presenter";
import { ThreeCanvas } from "../kit/three-canvas";
import { Finish } from "../kit/finish";
import { CamRig, EnvMap, RigCtx, type Rig } from "./parts";
import { FACE } from "./mats";
import { Bubble, City, Coins, Desk, Objects, Studio } from "./scene";
import { B } from "../beats";
import { bubbleAt, cityK, deskK, poseAt } from "./rig";
import { T, tw } from "./timing";
import { progS } from "../lib";
import { Overlays } from "./overlay";
import { BubbleCaption } from "./caption";

export const covered = (t: number) => {
  const st = presenter(t);
  return st.vis && st.alpha >= 0.999 && st.tile < 0.001 && st.garden > 0.999 && st.s >= 0.999;
};

const BackScene: React.FC<{ t: number }> = ({ t: t0 }) => {
  const t = tw(t0);
  const pose = poseAt(t);
  const st = bubbleAt(t);
  const ps = presenter(t0);
  FACE.uFace.value.set(SIDE_FACE.x, SIDE_FACE.y, SIDE_FACE.x + SIDE_FACE.w, SIDE_FACE.y + SIDE_FACE.h);
  FACE.uFaceK.value = ps.vis && ps.tile < 0.01 ? (1 - ps.garden) * smooth((ps.x + 500) / 400) : 0;
  const rig: Rig = { pose, t, fog: 0 };
  const ck = cityK(t), dk = deskK(t);
  const coins = t > T.pouring - 0.6 && t < B.touch.s + 0.6;
  const glyphOut = 0;
  return (
    <RigCtx.Provider value={rig}>
      <CamRig pose={pose} />
      <EnvMap />
      <Studio st={st} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-6, 8, 6]} intensity={2.2} />
      <directionalLight position={[6, 2, -6]} intensity={1.4} color="#7fdcff" />
      {ck > 0.002 && <City k={ck} s={st.R / 4.2} t={t} glyphOut={glyphOut} />}
      {coins && <Coins st={st} />}
      {dk < 0.5 && t < B.q2.s && <Objects st={st} />}
      {dk > 0.002 && <Desk k={dk} />}
      <Bubble st={st} />
    </RigCtx.Provider>
  );
};

const Back: React.FC<{ t: number; fr: number }> = ({ t, fr }) => {
  // v3: he is always the cut-out at the left, so the world is always on screen behind him
  return (
    <AbsoluteFill style={{ background: "#02040c" }}>
      <Finish fr={Math.min(fr, Math.round(tw(t) * 30))} bloom={0.75}>
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
      <Overlays t={t} covered={cov} />
    </AbsoluteFill>
  );
};

export const World: WorldDef = {
  Back,
  Front,
  Caption: BubbleCaption,
  bed: undefined, // render_ig.sh renders --muted and mixes public/vo.wav + public/bed-bubble.wav itself; set "bed-bubble.wav" only for Studio previews
  cutoutFilter: "drop-shadow(0 0 16px rgba(125,243,255,.45)) drop-shadow(0 0 3px rgba(255,122,217,.45))",
  tileStyle: {
    border: "8px solid rgba(220,240,255,.8)",
    boxShadow: "0 0 0 6px rgba(255,122,217,.3), 0 0 90px 24px rgba(125,243,255,.5), 0 30px 120px rgba(0,0,0,.8)",
  },
};
