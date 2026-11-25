import { C, F } from "./theme";

/**
 * A video's look, picked by name. The shared parts (captions, labels) read their colours and fonts from
 * here, so a new look is a new entry, not new code. `verb` is the AskVerb brand from brand/BRAND.md.
 */
export type Theme = {
  /** Caption and label text. */
  text: string;
  /** The word being spoken, and the one colour that carries the story. */
  accent: string;
  /** Text sitting on the accent. */
  accentText: string;
  /** Shadow behind text drawn over pictures; "none" on a plain ground. */
  shadow: string;
  display: string;
  body: string;
};

export const THEMES = {
  verb: { text: C.ink, accent: C.gold, accentText: C.ink, shadow: "none", display: F.display, body: F.body },
  /** Dusk on the Amazon: river teal, mud brown, dolphin pink, moon cream. First used by pink-dolphins. */
  "amazon-dusk": {
    text: "#fff4e6",
    accent: "#ff8fb3",
    accentText: "#2a0f1c",
    shadow: "0 4px 24px rgba(5,15,20,0.75)",
    display: F.display,
    body: F.body,
  },
  /** A dark Play Console look with Android green as the one accent. First used by play-store-12-testers. */
  "console-green": {
    text: "#eef5f0",
    accent: "#3ddc84",
    accentText: "#06210f",
    shadow: "0 4px 20px rgba(0,0,0,0.6)",
    display: F.display,
    body: F.body,
  },
} satisfies Record<string, Theme>;
