// c3-cs-degree v8 beat table (v8: the build / trains / choose beats were cut with their words; v5 header follows)
// c3-cs-degree v5 beat table ("I read the question, then I answer"). Every word is his (DJI 0161). He is ALWAYS the
// still cut-out bottom-left (SIDE); END = silent end card right after his last word. q1 / q2 = questions he reads out.
// Starts come from words.json via cue().
import { FPS, OUTRO, TOTAL, cue } from "./lib";

export type Mode = "FULL" | "FWD" | "SIDE" | "OUT" | "END";
type B = { id: string; s: number; mode: Mode; tile?: [number, number] };

const raw: B[] = [
  { id: "q1", s: 0, mode: "SIDE" },                                          // Q: if AI writes all the code, do you still need to learn CS?
  { id: "still", s: cue("I would think") - 0.15, mode: "SIDE" },            // diploma, product, software
  { id: "hill", s: cue("Imagine") - 0.15, mode: "SIDE" },                   // my hill train climbing a mountain
  { id: "engine", s: cue("It needs engines") - 0.15, mode: "SIDE" },        // spec card: heavy, throttle, torque
  { id: "himal", s: cue("So I can't ask") - 0.15, mode: "SIDE" },           // bullet train perched on the Himalayan plateau
  { id: "customer", s: cue("would customer") - 0.15, mode: "SIDE" },              // would the customer buy it? no sale
  { id: "q2", s: cue("So what does") - 0.15, mode: "SIDE" },                // Q: what does a CS degree actually give you?
  { id: "track", s: cue("Well AI knows") - 0.1, mode: "SIDE" },             // AI lays the track; the question is yours
  { id: "want", s: cue("You can only") - 0.15, mode: "SIDE" },              // what you want? -> CS
  { id: "cs", s: cue("The computer science part") - 0.15, mode: "SIDE" },   // blueprint + ARCHITECTURE / SYSTEM DESIGN
  { id: "answer", s: cue("These questions") - 0.15, mode: "SIDE" },         // diploma, ? -> checks
  { id: "comment", s: cue("Would you still pick") - 0.15, mode: "SIDE" },   // comment prompt + YES / NO
  { id: "end", s: OUTRO.t, mode: "END" },                                    // silent end card
];
export const BEATS = raw.map((b, i) => ({ ...b, e: raw[i + 1]?.s ?? TOTAL / FPS }));
export type Beat = (typeof BEATS)[number];
export const beatIdx = (t: number) => { let i = 0; while (i + 1 < BEATS.length && BEATS[i + 1].s <= t) i++; return i; };
export const beatAt = (t: number) => BEATS[beatIdx(t)];
export const B = Object.fromEntries(BEATS.map((b) => [b.id, b])) as Record<string, Beat>;
export const inBeat = (t: number, id: string) => (t - B[id].s) / (B[id].e - B[id].s);
