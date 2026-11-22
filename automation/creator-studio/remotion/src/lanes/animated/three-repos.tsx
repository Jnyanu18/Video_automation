import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/three-repos/scenes.json";
import wordsJson from "../../../../videos/three-repos/words.json";

// 3 GitHub repos with 187,000 stars (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const ThreeRepos: React.FC = () => (
  <Single slug="three-repos" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
