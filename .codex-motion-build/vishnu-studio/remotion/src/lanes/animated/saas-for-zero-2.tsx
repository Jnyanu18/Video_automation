import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/saas-for-zero-2/scenes.json";
import wordsJson from "../../../../videos/saas-for-zero-2/words.json";

// Your startup on 0 dollars, part 2 (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const SaasForZero2: React.FC = () => (
  <Single slug="saas-for-zero-2" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
