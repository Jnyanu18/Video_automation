import React from "react";
import { Word } from "../../kit/theme";
import { Single, SingleSpec } from "./single";
import scenesJson from "../../../../videos/free-business-email/scenes.json";
import wordsJson from "../../../../videos/free-business-email/words.json";

// The first faceless video (2026-10-26): Vishnu's r/SaaS post on a free business email, told by Christopher's
// voice with Ava acting every line, in one take (single.tsx). Everything it shows is scenes.json.

const words = wordsJson as Word[];
export const seconds = words[words.length - 1].end + 1.8;

export const FreeBusinessEmail: React.FC = () => (
  <Single slug="free-business-email" specs={scenesJson as SingleSpec[]} words={words} seconds={seconds} />
);
