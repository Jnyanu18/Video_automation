import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/freellmapi/scenes.json";
import wordsJson from "../../../../videos/freellmapi/words.json";

// Someone just made a free tool that runs Claude Code on free AI models (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const Freellmapi: React.FC = () => (
  <Single slug="freellmapi" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
