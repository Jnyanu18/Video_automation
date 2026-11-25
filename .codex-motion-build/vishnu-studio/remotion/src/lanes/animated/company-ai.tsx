import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/company-ai/scenes.json";
import wordsJson from "../../../../videos/company-ai/words.json";

// Every company builds its own AI the same way (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const CompanyAi: React.FC = () => (
  <Single slug="company-ai" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
