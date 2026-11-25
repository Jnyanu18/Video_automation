import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/why-we-dream/scenes.json";
import wordsJson from "../../../../videos/why-we-dream/words.json";

// AI might have explained why you dream (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const WhyWeDream: React.FC = () => (
  <Single slug="why-we-dream" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
