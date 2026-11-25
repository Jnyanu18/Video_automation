import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/ecc-dev-team/scenes.json";
import wordsJson from "../../../../videos/ecc-dev-team/words.json";

// One developer turned Claude Code into a dev team (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const EccDevTeam: React.FC = () => (
  <Single slug="ecc-dev-team" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
