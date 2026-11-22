import React from "react";
import { useCurrentFrame } from "remotion";
import { C, F, FPS, Word } from "./theme";
import type { Theme } from "./themes";

/** Groups words into short captions: at most `max` words, broken on pauses longer than 0.35s, and, with
 * `sentences`, after a full stop, question mark or exclamation mark (cut footage has no pauses left). */
export function chunk(words: Word[], max = 4, sentences = false): Word[][] {
  const out: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const ended = sentences && prev !== undefined && /[.?!]$/.test(prev.w);
    if (cur.length && (cur.length >= max || ended || (prev && w.start - prev.end > 0.35))) {
      out.push(cur);
      cur = [];
    }
    cur.push(w);
  });
  if (cur.length) out.push(cur);
  return out;
}

/** Burned-in captions. The word being spoken sits on a gold wash, or on the theme's accent. */
export const Captions: React.FC<{ words: Word[]; size?: number; dark?: boolean; max?: number; sentences?: boolean; theme?: Theme }> = ({
  words,
  size = 56,
  dark = false,
  max = 4,
  sentences = false,
  theme,
}) => {
  const t = useCurrentFrame() / FPS;
  const group = chunk(words, max, sentences).find((g) => t >= g[0].start - 0.05 && t <= g[g.length - 1].end + 0.25);
  if (!group) return null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: size * 0.28,
        fontFamily: theme ? theme.body : F.body,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1.15,
        color: theme ? theme.text : dark ? C.paper : C.ink,
        textShadow: theme && theme.shadow !== "none" ? theme.shadow : undefined,
      }}
    >
      {group.map((w, i) => {
        const on = t >= w.start && t <= w.end + 0.08;
        return (
          <span
            key={i}
            style={{
              padding: `0 ${size * 0.12}px`,
              borderRadius: size * 0.12,
              background: on ? (theme ? theme.accent : C.gold) : "transparent",
              color: on ? (theme ? theme.accentText : C.ink) : undefined,
              textShadow: on ? "none" : undefined,
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};
