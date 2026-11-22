import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/meta-astryx/scenes.json";
import wordsJson from "../../../../videos/meta-astryx/words.json";

// Build your app with Meta's own design system (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const MetaAstryx: React.FC = () => (
  <Single slug="meta-astryx" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
