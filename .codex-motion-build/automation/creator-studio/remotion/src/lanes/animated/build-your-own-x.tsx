import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/build-your-own-x/scenes.json";
import wordsJson from "../../../../videos/build-your-own-x/words.json";

// The most starred repo on GitHub (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const BuildYourOwnX: React.FC = () => (
  <Single slug="build-your-own-x" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
