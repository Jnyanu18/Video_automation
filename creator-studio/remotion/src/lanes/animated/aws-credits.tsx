import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/aws-credits/scenes.json";
import wordsJson from "../../../../videos/aws-credits/words.json";

// Get 1,000 dollars in AWS credits (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const AwsCredits: React.FC = () => (
  <Single slug="aws-credits" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
