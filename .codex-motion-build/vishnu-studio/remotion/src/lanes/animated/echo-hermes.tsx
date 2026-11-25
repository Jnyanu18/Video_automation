import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/echo-hermes/scenes.json";
import wordsJson from "../../../../videos/echo-hermes/words.json";

// Turn your old Amazon Echo into your own AI assistant (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const EchoHermes: React.FC = () => (
  <Single slug="echo-hermes" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
