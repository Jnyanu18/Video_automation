import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/security-top-10/scenes.json";
import wordsJson from "../../../../videos/security-top-10/words.json";

// Ten security tools for Claude Code, ranked (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const SecurityTop10: React.FC = () => (
  <Single slug="security-top-10" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
