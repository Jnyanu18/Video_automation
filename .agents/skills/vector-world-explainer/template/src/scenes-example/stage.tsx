import React from "react";
import { Camera, type Key } from "../kit/camera";
import { Defs } from "../kit/palette";
import { ChipDefs, LaptopDefs } from "../kit/props";
import { PhoneDefs } from "../kit/objects";
import { Glow, Mug, NearLeaf, Plant, Table, Wall, WallGlow } from "../kit/room";

// Every scene draws inside one Camera svg with all shared defs mounted.
export const Stage: React.FC<{ fr: number; keys?: Key[]; cam?: { x?: number; y?: number; zoom?: number; rot?: number }; handheld?: number; children: React.ReactNode; bg?: string }> = ({ fr, keys, cam, handheld = 0.5, children, bg = "#1E1550" }) => (
  <Camera fr={fr} keys={keys} cam={cam} handheld={handheld} background={bg}>
    <Defs />
    <ChipDefs />
    <LaptopDefs />
    <PhoneDefs />
    {children}
  </Camera>
);

// The study, front view: wall + window, hero light on the wall, plant, table. Children sit on the table.
// `fore` draws the out-of-focus foreground (mug, near leaf) unless disabled.
export const Study: React.FC<{ fr: number; glow?: Glow; sky?: React.ReactNode; frost?: number; fore?: boolean; plant?: boolean; children?: React.ReactNode; over?: React.ReactNode }> = ({ fr, glow, sky, frost, fore = true, plant = true, children, over }) => (
  <g>
    <Wall fr={fr} sky={sky} frost={frost} />
    {glow && <WallGlow glow={glow} />}
    {plant && <Plant fr={fr} />}
    <Table fr={fr} glow={glow} />
    {children}
    {over}
    {fore && <Mug />}
    {fore && <NearLeaf />}
  </g>
);
