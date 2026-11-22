import React from "react";
import { useCurrentFrame, Easing } from "remotion";
import { loadFont as loadKalam } from "@remotion/google-fonts/Kalam";
import { F, FPS } from "../../kit/theme";
import type { View } from "./faceless";
import { SERIF } from "./keynote";

/** anthropic-teams v3 (2026-11-09): all 6 steps written on two pages, one page per bar of music/loop.wav (2.083 s).
 *  Each page holds, then scrolls up into the next, landing on the bar line; page 2 scrolls into a copy of page 1, so the
 *  restart is the same scroll as the middle and the loop never shows (Vishnu: "2 seconds for one thing and 2 seconds
 *  for the next ... sliding ... a slow scrolling thing"). props.hand = false for typed text.
 *  Facts: claude.com/blog/how-anthropic-teams-use-claude-code (2025-07-24). */

const HAND = loadKalam("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;
const CLAY = "#d97757", CREAM = "#fff6ee", INK = "#2a1a12";
const LOOP = 125 / 30, BAR = LOOP / 2, SLIDE = 0.6, H = 1920;
const STEPS: [string, string, string][] = [
  ["Plan before code", "Security team", "Write pseudocode first. Then a failing test before each piece."],
  ["Learn the codebase", "Infrastructure team", "Read this repo and explain what feeds what, like it's my first day."],
  ["Find before you fix", "Product team", "Which files should I read to fix this bug? Don't change anything yet."],
  ["Let it loop", "Design team", "Build this, run the tests, keep going until they pass. Then show me what changed."],
  ["Send screenshots", "Data infra team", "Here's the dashboard. Walk me to the cause, one screen at a time."],
  ["Build your own tools", "Growth team", "Read this CSV, find the weak ones, and draft better versions."],
];

const Step: React.FC<{ i: number; hand: boolean }> = ({ i, hand }) => {
  const [title, team, prompt] = STEPS[i];
  const body = hand ? HAND : F.body;
  return (
    <div style={{ display: "flex", gap: 20 }}>
      <div style={{ flex: "0 0 66px", height: 66, borderRadius: 33, background: CREAM, color: CLAY, fontFamily: body, fontWeight: 800, fontSize: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: body, fontWeight: 800, fontSize: hand ? 54 : 48, color: CREAM, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontFamily: body, fontSize: hand ? 32 : 28, color: CREAM, opacity: 0.85, marginTop: 2 }}>{team}</div>
        <div style={{ marginTop: 12, fontFamily: hand ? HAND : F.mono, fontSize: hand ? 42 : 34, color: INK, background: CREAM, borderRadius: 18, padding: "14px 22px", lineHeight: 1.25 }}>"{prompt}"</div>
      </div>
    </div>
  );
};

// a page sits inside Instagram's safe area: clear of the side buttons (right) and the caption bar (bottom)
const Page: React.FC<{ n: 0 | 1; hand: boolean; y: number }> = ({ n, hand, y }) => (
  <div style={{ position: "absolute", left: 0, top: y, width: 1080, height: H }}>
    <div style={{ position: "absolute", left: 60, right: 150, top: 150, bottom: 380, display: "flex", flexDirection: "column", justifyContent: "center", gap: 46 }}>
      {n === 0 ? (
        <>
          <div style={{ fontFamily: hand ? HAND : SERIF, fontWeight: hand ? 700 : 500, fontSize: hand ? 88 : 82, lineHeight: 1.05, color: CREAM }}>Here's how top devs at Anthropic use Claude</div>
          {[0, 1, 2].map((i) => <Step key={i} i={i} hand={hand} />)}
        </>
      ) : (
        <>
          {[3, 4, 5].map((i) => <Step key={i} i={i} hand={hand} />)}
          <div style={{ fontFamily: hand ? HAND : F.body, fontSize: hand ? 38 : 34, color: CREAM, lineHeight: 1.3 }}>Their own words: treat it "as a thought partner rather than a code generator."</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <span style={{ padding: "12px 30px", borderRadius: 999, background: INK, fontFamily: hand ? HAND : F.body, fontWeight: 800, fontSize: 36, color: CREAM }}>Comment GAP for the full doc</span>
            <span style={{ fontFamily: F.mono, fontSize: 20, letterSpacing: 1.2, color: CREAM, opacity: 0.85 }}>SOURCE: ANTHROPIC'S OWN WRITE-UP</span>
          </div>
        </>
      )}
    </div>
  </div>
);

export const AntTeamsView: View = {
  View: ({ t0, t1, p }) => {
    const now = t0 + useCurrentFrame() / FPS;
    const hand = p.hand !== false;
    // single.tsx pushes the camera in 5% over a scene; undone here so the loop is exact
    const cam = 1 + 0.05 * Math.min(1, Math.max(0, now - t0) / Math.max(1, t1 - t0));
    const ph = (((now - t0) % LOOP) + LOOP) % LOOP;
    const slide = (end: number) => Easing.inOut(Easing.cubic)(Math.max(0, Math.min(1, (ph - (end - SLIDE)) / SLIDE)));
    const scroll = (slide(BAR) + slide(LOOP)) * H; // page 1 -> page 2 on bar 1's line, page 2 -> page 1 (copy) on the loop's
    return (
      <div style={{ position: "absolute", inset: 0, background: CLAY, overflow: "hidden", transform: `scale(${1 / cam})`, transformOrigin: "50% 42%" }}>
        <Page n={0} hand={hand} y={-scroll} />
        <Page n={1} hand={hand} y={H - scroll} />
        <Page n={0} hand={hand} y={2 * H - scroll} />
      </div>
    );
  },
  hits: () => [],
};
