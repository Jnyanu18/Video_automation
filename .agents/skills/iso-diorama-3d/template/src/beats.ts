// c4-robots beat table. Every start comes from his words (cue) or the outro time, so a re-cut retimes.
// Modes = where the real presenter is:
//   FULL  real footage, full frame          FWD  real footage, slow push-in for a big thought
//   SIDE  cut-out, bottom-left in the world  OUT  presenter out; full-frame graphics
//   END   held end card (footage has run out)
import { FPS, OUTRO, TOTAL, cue } from "./lib";

export type Mode = "FULL" | "FWD" | "SIDE" | "OUT" | "END";
type B = { id: string; s: number; mode: Mode; tile?: [number, number] };

// v5: every word is his real voice; he reads two questions (askFirst, askDecide) and answers them. He is always
// the still cut-out bottom-left (SIDE); the end card is silent text.
const raw: B[] = [
  { id: "hook", s: 0, mode: "SIDE" },                          // "Robots will take these jobs first. Is yours on the list?"
  { id: "askFirst", s: cue("which job will"), mode: "SIDE" },  // Q he reads
  { id: "supply", s: cue("well humanoid"), mode: "SIDE" },     // humanoid robots, supply chain, 24/7
  { id: "askDecide", s: cue("but how does"), mode: "SIDE" },   // Q he reads
  { id: "depends", s: cue("well it depends"), mode: "SIDE" },
  { id: "repetitive", s: cue("robots can take"), mode: "SIDE" },
  { id: "art", s: cue("but if you're"), mode: "SIDE" },
  { id: "feeling", s: cue("it's more like"), mode: "SIDE" },
  { id: "chai", s: cue("a robot can't do"), mode: "SIDE" },     // sit, sip, gossip
  { id: "jeweller", s: cue("jewelers who"), mode: "SIDE" },
  { id: "close", s: cue("the artistic"), mode: "SIDE" },
  { id: "comment", s: cue("which job do"), mode: "SIDE" },
  { id: "end", s: OUTRO.t - 0.3, mode: "END" },
];
export const BEATS = raw.map((b, i) => ({ ...b, e: raw[i + 1]?.s ?? TOTAL / FPS }));
export type Beat = (typeof BEATS)[number];
export const beatIdx = (t: number) => { let i = 0; while (i + 1 < BEATS.length && BEATS[i + 1].s <= t) i++; return i; };
export const beatAt = (t: number) => BEATS[beatIdx(t)];
export const B = Object.fromEntries(BEATS.map((b) => [b.id, b])) as Record<string, Beat>;
export const inBeat = (t: number, id: string) => (t - B[id].s) / (B[id].e - B[id].s);
