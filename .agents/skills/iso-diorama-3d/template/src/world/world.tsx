// Isometric 3D diorama world: Back = sky + one orthographic three.js canvas of the floating toy island
// (unmounted while his footage covers the frame); Front = HTML labels / chips / end card.
import React from "react";
import { AbsoluteFill } from "remotion";
import type { WorldDef } from "../Film";
import { beatAt } from "../beats";
import { H, W, progS } from "../lib";
import { presenter } from "../presenter";
import { ThreeCanvas } from "../kit/three-canvas";
import { Scene } from "./scene";
import { Overlays } from "./overlays";
import { DioramaCaption } from "./caption";
import { NIGHT, SUNSET } from "./times";

export const covered = (t: number) => {
  const st = presenter(t);
  return st.vis && st.alpha >= 0.999 && st.tile < 0.001 && st.garden > 0.999 && st.s >= 0.999;
};

const Sky: React.FC<{ t: number }> = ({ t }) => {
  const sun = progS(t, SUNSET, 1.0);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #ffe3cf 0%, #fdf0dc 30%, #d7eef3 62%, #cfd8f6 100%)" }} />
      <AbsoluteFill style={{ opacity: sun, background: "linear-gradient(180deg, #ff9f7a 0%, #ffb98e 28%, #f59bb0 60%, #8f7cc9 100%)" }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${78 - sun * 30}% ${16 + sun * 22}%, rgba(255,250,220,${0.75 - sun * 0.2}) 0%, rgba(255,240,200,0) 26%)` }} />
    </AbsoluteFill>
  );
};

// v5 "runs 24/7": the island goes to night for a moment (behind him; robots keep their glowing visors)
const Night: React.FC<{ t: number }> = ({ t }) => {
  const k = progS(t, NIGHT.on, 0.45) * (1 - progS(t, NIGHT.off, 0.4));
  if (k <= 0.001) return null;
  return (
    <AbsoluteFill style={{ opacity: k }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(28,24,78,.78) 0%, rgba(40,34,100,.55) 55%, rgba(30,26,80,.6) 100%)", mixBlendMode: "multiply" }} />
      {[[120, 300], [230, 520], [960, 260], [880, 560], [640, 200], [380, 640], [1000, 420], [80, 760]].map(([x, y], i) => (
        <div key={i} style={{ position: "absolute", left: x, top: y, width: i % 2 ? 6 : 9, height: i % 2 ? 6 : 9, borderRadius: 5, background: "#fff8d8", boxShadow: "0 0 10px #fff3b0" }} />
      ))}
    </AbsoluteFill>
  );
};

const Back: React.FC<{ t: number; fr: number }> = ({ t }) => {
  if (covered(t)) return null;
  return (
    <AbsoluteFill>
      <Sky t={t} />
      <ThreeCanvas width={W} height={H} dpr={1} orthographic shadows flat gl={{ antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" }} camera={{ zoom: 50, position: [30, 30, 30], near: 0.1, far: 300 }}>
        <Scene t={t} />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 64% at 50% 48%, rgba(0,0,0,0) 60%, rgba(70,50,110,0.22) 100%)" }} />
      <Night t={t} />
    </AbsoluteFill>
  );
};

const Front: React.FC<{ t: number; fr: number }> = ({ t }) => {
  const m = beatAt(t).mode;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Overlays t={t} covered={m === "FULL" || m === "FWD"} worldVis={!covered(t)} />
    </AbsoluteFill>
  );
};

export const World: WorldDef = {
  Back,
  Front,
  Caption: DioramaCaption,
  cutoutFilter: "drop-shadow(0 0 3px #ffffff) drop-shadow(0 0 2px #ffffff) drop-shadow(0 18px 24px rgba(70,50,110,.35))",
  tileStyle: { border: "10px solid #fff6e6", boxShadow: "0 14px 0 rgba(59,47,92,.25), 0 30px 60px rgba(59,47,92,.35)" },
};
