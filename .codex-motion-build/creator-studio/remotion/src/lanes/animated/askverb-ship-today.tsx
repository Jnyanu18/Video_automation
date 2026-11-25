import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/askverb-ship-today/scenes.json";
import wordsJson from "../../../../videos/askverb-ship-today/words.json";

// Your users asked for AI. Here's how to ship it today. (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const AskverbShipToday: React.FC = () => (
  <Single slug="askverb-ship-today" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
