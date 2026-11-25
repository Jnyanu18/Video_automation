import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/askverb-how-do-i/scenes.json";
import wordsJson from "../../../../videos/askverb-how-do-i/words.json";

// Every 'how do I' message means your product is failing quietly (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const AskverbHowDoI: React.FC = () => (
  <Single slug="askverb-how-do-i" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
