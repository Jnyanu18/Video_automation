import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/why-it-went-viral/scenes.json";
import wordsJson from "../../../../videos/why-it-went-viral/words.json";

// Claude can tell you why a reel went viral (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const WhyItWentViral: React.FC = () => (
  <Single slug="why-it-went-viral" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
