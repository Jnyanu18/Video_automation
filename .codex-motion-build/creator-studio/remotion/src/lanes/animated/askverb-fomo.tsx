import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/askverb-fomo/scenes.json";
import wordsJson from "../../../../videos/askverb-fomo/words.json";

// Your competitor is adding AI. Ship yours first. (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const AskverbFomo: React.FC = () => (
  <Single slug="askverb-fomo" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
