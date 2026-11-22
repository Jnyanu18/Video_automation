import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/open-inbox/scenes.json";
import wordsJson from "../../../../videos/open-inbox/words.json";

// Free business email on your own domain (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const OpenInbox: React.FC = () => (
  <Single slug="open-inbox" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
