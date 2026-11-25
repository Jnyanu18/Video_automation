import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/floorplan-map/scenes.json";
import wordsJson from "../../../../videos/floorplan-map/words.json";

// floorplan-map (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const FloorplanMap: React.FC = () => (
  <Single slug="floorplan-map" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
