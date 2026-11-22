import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/three-agents/scenes.json";
import wordsJson from "../../../../videos/three-agents/words.json";

// three-agents (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const ThreeAgents: React.FC = () => (
  <Single slug="three-agents" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
