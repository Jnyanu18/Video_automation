// The clip's beat table: one beat = one new picture. Every start comes from his words (cue) or the outro time.
// He is ALWAYS the still cut-out bottom-left, so every beat is SIDE; END = the end card (captions hidden).
// THIS IS THE SAMPLE: each film rewrites the raw list from its own words.json.
import { FPS, OUTRO, TOTAL, cue } from "./lib";

// Only SIDE and END are used in this format; the other names stay so worlds written for older shells still typecheck.
export type Mode = "SIDE" | "END" | "FULL" | "FWD" | "OUT";
type B = { id: string; s: number; mode: Mode };

const S = (id: string, s: number): B => ({ id, s, mode: "SIDE" });
const raw: B[] = [
  S("hook", 0),                           // his spoken hook = the frame-0 headline
  S("q1", cue("Why learn CS") - 0.15),    // a question he reads -> anonymous IG DM card
  S("a1", cue("Because you") - 0.1),      // his answer
  S("comment", cue("Would you still") - 0.1), // his comment prompt -> IG comment card
  { id: "end", s: OUTRO.t - 0.3, mode: "END" },
];
export const BEATS = raw.map((b, i) => ({ ...b, e: raw[i + 1]?.s ?? TOTAL / FPS }));
export type Beat = (typeof BEATS)[number];
export const beatIdx = (t: number) => { let i = 0; while (i + 1 < BEATS.length && BEATS[i + 1].s <= t) i++; return i; };
export const beatAt = (t: number) => BEATS[beatIdx(t)];
export const B = Object.fromEntries(BEATS.map((b) => [b.id, b])) as Record<string, Beat>;
export const inBeat = (t: number, id: string) => (t - B[id].s) / (B[id].e - B[id].s);
