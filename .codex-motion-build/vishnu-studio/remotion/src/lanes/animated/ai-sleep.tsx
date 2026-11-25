import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/ai-sleep/scenes.json";
import wordsJson from "../../../../videos/ai-sleep/words.json";

// Google just taught an AI to sleep (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const AiSleep: React.FC = () => (
  <Single slug="ai-sleep" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
