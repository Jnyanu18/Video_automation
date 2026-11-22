import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/yc-pitch-data/scenes.json";
import wordsJson from "../../../../videos/yc-pitch-data/words.json";

// What 93 YC founder videos show (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const YcPitchData: React.FC = () => (
  <Single slug="yc-pitch-data" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
