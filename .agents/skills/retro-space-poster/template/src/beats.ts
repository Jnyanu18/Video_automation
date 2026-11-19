// c5-spacex v5 beat table: one beat per idea in his re-recorded take (DJI 0161; every word is his voice).
// He is always the still cut-out bottom-left. Every start comes from his words (words.json) or the outro time.
import { FPS, OUTRO, TOTAL, cue } from "./lib";

export type Mode = "FULL" | "FWD" | "SIDE" | "OUT" | "END";
type B = { id: string; s: number; mode: Mode; tile?: [number, number] };

const raw: B[] = [
  { id: "hook", s: 0, mode: "SIDE" },                                   // "Seattle to Delhi in one hour on a rocket? Hell yeah..."
  { id: "q", s: cue("SpaceX trying") - 0.45, mode: "SIDE" },            // Q he reads: "What is SpaceX trying to do?"
  { id: "plane", s: cue("imagine a rocket") - 0.1, mode: "SIDE" },      // reuse it as a plane, don't throw it away
  { id: "car", s: cue("take your car") - 0.25, mode: "SIDE" },          // car / grocery analogy
  { id: "buy", s: cue("Imagine you have") - 0.1, mode: "SIDE" },        // "buy a car every time ... doesn't make sense"
  { id: "goal", s: cue("What they're") - 0.1, mode: "SIDE" },           // "building the best reusable rocket"
  { id: "delhi", s: cue("If they can") - 0.1, mode: "SIDE" },           // Seattle -> New Delhi -> Mexico < 1 hour
  { id: "ten", s: cue("And I think in") - 0.1, mode: "SIDE" },          // "in 10 years, everything will be like that"
  { id: "end", s: OUTRO.t - 0.3, mode: "END" },                         // silent end card
];
export const BEATS = raw.map((b, i) => ({ ...b, e: raw[i + 1]?.s ?? TOTAL / FPS }));
export type Beat = (typeof BEATS)[number];
export const beatIdx = (t: number) => { let i = 0; while (i + 1 < BEATS.length && BEATS[i + 1].s <= t) i++; return i; };
export const beatAt = (t: number) => BEATS[beatIdx(t)];
export const B = Object.fromEntries(BEATS.map((b) => [b.id, b])) as Record<string, Beat>;
export const inBeat = (t: number, id: string) => (t - B[id].s) / (B[id].e - B[id].s);
