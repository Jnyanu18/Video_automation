import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/clone-apps-short/scenes.json";
import wordsJson from "../../../../videos/clone-apps-short/words.json";

// Warning: you can now clone apps (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const CloneAppsShort: React.FC = () => (
  <Single slug="clone-apps-short" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
