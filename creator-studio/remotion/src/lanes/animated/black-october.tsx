import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/black-october/scenes.json";
import wordsJson from "../../../../videos/black-october/words.json";

// Black October isn't over yet (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const BlackOctober: React.FC = () => (
  <Single slug="black-october" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
