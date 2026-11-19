import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/yc-apply-guide/scenes.json";
import wordsJson from "../../../../videos/yc-apply-guide/words.json";

// How to apply to YC (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const YcApplyGuide: React.FC = () => (
  <Single slug="yc-apply-guide" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
