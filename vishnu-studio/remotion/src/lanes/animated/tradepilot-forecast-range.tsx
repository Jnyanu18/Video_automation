import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/tradepilot-forecast-range/scenes.json";
import wordsJson from "../../../../videos/tradepilot-forecast-range/words.json";

// tradepilot-forecast-range (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const TradepilotForecastRange: React.FC = () => (
  <Single slug="tradepilot-forecast-range" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
