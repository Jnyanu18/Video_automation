import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/fridge-hack-news/scenes.json";
import wordsJson from "../../../../videos/fridge-hack-news/words.json";

// fridge-hack-news (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const FridgeHackNews: React.FC = () => (
  <Single slug="fridge-hack-news" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
