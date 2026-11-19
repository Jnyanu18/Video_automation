// The beat table of THIS film (starter sample). Every start comes from the spoken words via cue() (src/world/cues.ts).
// With the v3+/v6 staging he is ALWAYS the still cut-out bottom-left, so every beat is SIDE (END = end card); the beat
// only says which page of the drawn canvas is on screen. Modes FULL / FWD / OUT are kept for the older staging
// (full-frame footage, push-in, presenter hidden), see reference/remotion-variant.md.
// The drug-discovery film's real table is src/world-drug/beats.ts.
import { FPS, OUTRO, TOTAL } from "./lib";
import { K } from "./world/cues";

export type Mode = "FULL" | "FWD" | "SIDE" | "OUT" | "END";
type B = { id: string; s: number; mode: Mode; tile?: [number, number] };

const raw: B[] = [
  { id: "hook", s: 0, mode: "SIDE" },                 // EL intro: the news headline
  { id: "q", s: K.could - 0.15, mode: "SIDE" },       // he reads the question (IG DM card)
  { id: "take", s: K.yes - 0.12, mode: "SIDE" },      // his answer
  { id: "end", s: OUTRO.t - 0.3, mode: "END" },       // zoom out to the whole map + end card
];
export const BEATS = raw.map((b, i) => ({ ...b, e: raw[i + 1]?.s ?? TOTAL / FPS }));
export type Beat = (typeof BEATS)[number];
export const beatIdx = (t: number) => { let i = 0; while (i + 1 < BEATS.length && BEATS[i + 1].s <= t) i++; return i; };
export const beatAt = (t: number) => BEATS[beatIdx(t)];
export const B = Object.fromEntries(BEATS.map((b) => [b.id, b])) as Record<string, Beat>;
export const inBeat = (t: number, id: string) => (t - B[id].s) / (B[id].e - B[id].s);
