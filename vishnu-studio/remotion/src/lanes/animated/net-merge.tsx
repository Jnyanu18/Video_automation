import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/net-merge/scenes.json";
import wordsJson from "../../../../videos/net-merge/words.json";

// Download over Wi-Fi and your phone hotspot at the same time (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const NetMerge: React.FC = () => (
  <Single slug="net-merge" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
