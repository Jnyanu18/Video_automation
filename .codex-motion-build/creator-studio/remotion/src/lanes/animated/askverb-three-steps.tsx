import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/askverb-three-steps/scenes.json";
import wordsJson from "../../../../videos/askverb-three-steps/words.json";

// How to put an AI agent inside your product in 3 steps (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const AskverbThreeSteps: React.FC = () => (
  <Single slug="askverb-three-steps" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
