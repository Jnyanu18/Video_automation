import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/linkedin-os/scenes.json";
import wordsJson from "../../../../videos/linkedin-os/words.json";

// This free Claude skill plans your LinkedIn (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const LinkedinOs: React.FC = () => (
  <Single slug="linkedin-os" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
