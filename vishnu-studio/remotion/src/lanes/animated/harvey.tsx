import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/harvey/scenes.json";
import wordsJson from "../../../../videos/harvey/words.json";

// This Claude agent gets you customers (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const Harvey: React.FC = () => (
  <Single slug="harvey" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
