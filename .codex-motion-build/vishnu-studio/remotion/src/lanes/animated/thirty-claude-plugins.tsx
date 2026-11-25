import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/thirty-claude-plugins/scenes.json";
import wordsJson from "../../../../videos/thirty-claude-plugins/words.json";

// The 30 best Claude plugins (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const ThirtyClaudePlugins: React.FC = () => (
  <Single slug="thirty-claude-plugins" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
