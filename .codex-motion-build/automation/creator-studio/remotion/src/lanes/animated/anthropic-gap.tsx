import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/anthropic-gap/scenes.json";
import wordsJson from "../../../../videos/anthropic-gap/words.json";

// anthropic-gap (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const AnthropicGap: React.FC = () => (
  <Single slug="anthropic-gap" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
