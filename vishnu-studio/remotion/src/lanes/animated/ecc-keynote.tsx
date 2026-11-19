import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/ecc-keynote/scenes.json";
import wordsJson from "../../../../videos/ecc-keynote/words.json";

// One developer turned Claude Code into a dev team (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const EccKeynote: React.FC = () => (
  <Single slug="ecc-keynote" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
