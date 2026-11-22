import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/claude-killed-instagram/scenes.json";
import wordsJson from "../../../../videos/claude-killed-instagram/words.json";

// claude-killed-instagram (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const ClaudeKilledInstagram: React.FC = () => (
  <Single slug="claude-killed-instagram" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
