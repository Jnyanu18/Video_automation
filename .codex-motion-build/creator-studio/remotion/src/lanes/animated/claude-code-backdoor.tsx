import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/claude-code-backdoor/scenes.json";
import wordsJson from "../../../../videos/claude-code-backdoor/words.json";

// Check your Claude Code extension (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const ClaudeCodeBackdoor: React.FC = () => (
  <Single slug="claude-code-backdoor" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
