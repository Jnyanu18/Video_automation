import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/openjarvis/scenes.json";
import wordsJson from "../../../../videos/openjarvis/words.json";

// Your own Jarvis in one command (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const Openjarvis: React.FC = () => (
  <Single slug="openjarvis" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
