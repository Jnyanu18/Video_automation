import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/ghost-vs-substack/scenes.json";
import wordsJson from "../../../../videos/ghost-vs-substack/words.json";

// Substack keeps 10% of every paid subscription. Ghost keeps none. (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const GhostVsSubstack: React.FC = () => (
  <Single slug="ghost-vs-substack" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
