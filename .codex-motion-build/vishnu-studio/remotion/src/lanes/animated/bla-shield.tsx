import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/bla-shield/scenes.json";
import wordsJson from "../../../../videos/bla-shield/words.json";

// A student just built the counter to REA (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const BlaShield: React.FC = () => (
  <Single slug="bla-shield" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
