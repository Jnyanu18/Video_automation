import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/reverse-anything/scenes.json";
import wordsJson from "../../../../videos/reverse-anything/words.json";

// Claude can rebuild any app you pay for (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const ReverseAnything: React.FC = () => (
  <Single slug="reverse-anything" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
