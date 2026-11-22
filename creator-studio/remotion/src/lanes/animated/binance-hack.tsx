import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/binance-hack/scenes.json";
import wordsJson from "../../../../videos/binance-hack/words.json";

// The biggest crypto hack ever (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const BinanceHack: React.FC = () => (
  <Single slug="binance-hack" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
