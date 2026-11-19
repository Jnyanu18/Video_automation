import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { beatAt, type Mode } from "./beats";
import { chunkAt, type Chunk } from "./captions";
import { FPS } from "./lib";
import { Presenter } from "./presenter";

export type Region = { mode: Mode; x: number; y: number; w: number; align: "center" | "left" };
// Face-safe caption regions per presenter mode (his face: upper-middle in FULL/FWD, x 90-370 y 940-1240 in SIDE).
export const regionFor = (mode: Mode): Region =>
  mode === "SIDE" ? { mode, x: 692, y: 1300, w: 258, align: "left" } // v6: right column under the graphics, clear of his head
  : mode === "OUT" ? { mode, x: 90, y: 1300, w: 900, align: "center" }
  : { mode, x: 90, y: 1260, w: 900, align: "center" };

export type WorldDef = {
  Back: React.FC<{ t: number; fr: number }>;   // behind the presenter
  Front: React.FC<{ t: number; fr: number }>;  // in front of the presenter (overlays, ending)
  Caption: React.FC<{ t: number; c: Chunk; r: Region }>;
  cutoutFilter?: string;
  tileStyle?: React.CSSProperties;
  bed?: string;
};

export const Film: React.FC<{ world: WorldDef }> = ({ world }) => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  const c = chunkAt(t);
  const { Back, Front, Caption } = world;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Back t={t} fr={fr} />
      <Presenter t={t} cutoutFilter={world.cutoutFilter} tileStyle={world.tileStyle} />
      <Front t={t} fr={fr} />
      {c && beatAt(c.s + 0.06).mode !== "END" && <Caption t={t} c={c} r={regionFor("SIDE")} />}
      <Audio src={staticFile("vo.wav")} />
      {world.bed && <Audio src={staticFile(world.bed)} />}
    </AbsoluteFill>
  );
};
