import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/anthropic-teams/scenes.json";
import wordsJson from "../../../../videos/anthropic-teams/words.json";

// How Anthropic's own teams use Claude Code (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = 125 / 30; // exactly 2 bars of music/loop.wav, a seamless loop (no voice)

export const AnthropicTeams: React.FC = () => (
  <Single slug="anthropic-teams" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
