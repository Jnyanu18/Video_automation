import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/claude-mouse-surgery/scenes.json";
import wordsJson from "../../../../videos/claude-mouse-surgery/words.json";

// Claude just injected a gene therapy into a living mouse's brain (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const ClaudeMouseSurgery: React.FC = () => (
  <Single slug="claude-mouse-surgery" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
