// The shared beat table: every beat's start comes from the words, so both films re-time together.
// Mode = where the real presenter is:
//   FULL  real footage, full frame          FWD  real footage, slow push-in for a big thought
//   SIDE  cut-out, bottom-left in the world  OUT  presenter out; full-frame teaching
//   END   held ending card (footage has run out)
import { FPS, TOTAL, cue } from "./lib";

export type Mode = "FULL" | "FWD" | "SIDE" | "OUT" | "END";
type B = { id: string; s: number; mode: Mode; tile?: [number, number] };

const raw: B[] = [
  { id: "hook", s: 0, mode: "FWD" },
  { id: "think", s: cue("Think about it") - 0.1, mode: "FULL" },
  { id: "internet", s: cue("We have one zettabyte") - 0.05, mode: "OUT", tile: [540, 760] },
  { id: "slice", s: cue("We used all of") - 0.1, mode: "SIDE" },
  { id: "network", s: cue("We trained a neural") - 0.1, mode: "SIDE" },
  { id: "rules", s: cue("It can figure out") - 0.05, mode: "SIDE" },
  { id: "sizes", s: cue("So one zettabyte") - 0.05, mode: "OUT" },
  { id: "beautiful", s: cue("You just compress") - 0.5, mode: "FULL", tile: [740, 1060] },
  { id: "maybe", s: cue("Maybe intelligence is a good") - 0.1, mode: "FWD" },
  { id: "books", s: cue("When we learn") - 0.1, mode: "SIDE" },
  { id: "algebra", s: cue("If X plus Y") - 0.1, mode: "OUT" },
  { id: "practice", s: cue("You do it and") - 0.1, mode: "SIDE" },
  { id: "nn", s: cue("That's how beautiful a pattern") - 0.1, mode: "OUT" },
  { id: "recall", s: cue("If you ask Gandhiji's") - 0.12, mode: "SIDE" },
  { id: "amazing", s: cue("It's just amazing") - 0.1, mode: "FULL" },
  { id: "question", s: cue("Now question to you") - 0.1, mode: "FWD" },
  { id: "cosmos", s: cue("That could be the holy") - 0.22, mode: "OUT", tile: [540, 820] },
  { id: "path", s: cue("Now this is a path") - 0.1, mode: "SIDE" },
  { id: "agi", s: cue("Maybe this is AGI") - 0.15, mode: "FULL" },
  { id: "cta1", s: cue("So I hope this") - 0.05, mode: "FULL" },
  { id: "cta2", s: cue("keep following the beauty") - 0.1, mode: "SIDE" },
  { id: "cta3", s: cue("Please do because") - 0.1, mode: "FULL" },
  { id: "end", s: cue("best of luck") + 0.45, mode: "END", tile: [540, 900] },
];
export const BEATS = raw.map((b, i) => ({ ...b, e: raw[i + 1]?.s ?? TOTAL / FPS }));
export type Beat = (typeof BEATS)[number];
export const beatIdx = (t: number) => { let i = 0; while (i + 1 < BEATS.length && BEATS[i + 1].s <= t) i++; return i; };
export const beatAt = (t: number) => BEATS[beatIdx(t)];
export const B = Object.fromEntries(BEATS.map((b) => [b.id, b])) as Record<string, Beat>;
// local 0..1 progress through a beat
export const inBeat = (t: number, id: string) => (t - B[id].s) / (B[id].e - B[id].s);
