import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/ai-chatbot-liability/scenes.json";
import wordsJson from "../../../../videos/ai-chatbot-liability/words.json";

// The second faceless video (2026-10-26): what an AI chatbot says is legally yours. Structure from adilet.fndr's
// "sued" reel, our own cases, each checked in brief.md. One take with Ava (single.tsx); everything is scenes.json.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const AiChatbotLiability: React.FC = () => (
  <Single slug="ai-chatbot-liability" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
