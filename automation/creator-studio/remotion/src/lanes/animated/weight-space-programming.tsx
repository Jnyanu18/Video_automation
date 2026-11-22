import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/weight-space-programming/scenes.json";
import wordsJson from "../../../../videos/weight-space-programming/words.json";

// weight-space-programming (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const WeightSpaceProgramming: React.FC = () => (
  <Single slug="weight-space-programming" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
