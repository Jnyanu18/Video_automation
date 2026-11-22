import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/agent-reach/scenes.json";
import wordsJson from "../../../../videos/agent-reach/words.json";

// Your AI agent can't read where your customers complain (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const AgentReach: React.FC = () => (
  <Single slug="agent-reach" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
