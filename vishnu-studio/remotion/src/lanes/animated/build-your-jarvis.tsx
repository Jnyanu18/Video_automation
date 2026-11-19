import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/build-your-jarvis/scenes.json";
import wordsJson from "../../../../videos/build-your-jarvis/words.json";

// Build your own Jarvis (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const BuildYourJarvis: React.FC = () => (
  <Single slug="build-your-jarvis" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
