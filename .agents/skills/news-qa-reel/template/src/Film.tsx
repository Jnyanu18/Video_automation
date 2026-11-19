// Film shell: world Back -> presenter cut-out -> world Front -> caption, plus vo.wav and the style bed.
// A new style only supplies src/world (a WorldDef). Layout zones: src/ig/zones.ts.
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { beatAt, type Mode } from "./beats";
import { chunkAt, type Chunk } from "./captions";
import { FPS, IS_SAMPLE } from "./lib";
import { Presenter } from "./presenter";
import { ZONES } from "./ig/zones";

export type Region = { mode: Mode; x: number; y: number; w: number; align: "center" | "left" };
// v6: captions live in the right column under the graphics, clear of his head (x 692-950 from y 1300, up to 3 lines).
export const CAPTION_REGION: Region = { mode: "SIDE", ...ZONES.caption, align: "left" };
export const regionFor = (_mode: Mode): Region => CAPTION_REGION; // compatibility: one caption region in this format

export type WorldDef = {
  Back: React.FC<{ t: number; fr: number }>;   // behind the presenter (full-bleed backgrounds are fine)
  Front: React.FC<{ t: number; fr: number }>;  // in front of him: series tag, DM cards, graphics, end card
  Caption: React.FC<{ t: number; c: Chunk; r: Region }>;
  cutoutFilter?: string;                       // e.g. a soft glow or a sticker edge around the cut-out
  tileStyle?: React.CSSProperties;             // unused in this format (kept for older worlds)
  bed?: string;                                // public/bed-<style>.wav for previews; render_ig.sh mixes it itself
};

export const Film: React.FC<{ world: WorldDef }> = ({ world }) => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  const c = chunkAt(t);
  const { Back, Front, Caption } = world;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Back t={t} fr={fr} />
      <Presenter cutoutFilter={world.cutoutFilter} />
      <Front t={t} fr={fr} />
      {c && beatAt(c.s + 0.06).mode !== "END" && <Caption t={t} c={c} r={CAPTION_REGION} />}
      {!IS_SAMPLE && <Audio src={staticFile("vo.wav")} />}
      {world.bed && <Audio src={staticFile(world.bed)} />}
    </AbsoluteFill>
  );
};
