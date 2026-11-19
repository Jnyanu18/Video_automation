import { Easing, interpolate, spring } from "remotion";
import words from "./words.json";
import env from "./vo_env.json";
import edl from "./edl.json";

export const FPS = 30;
export const W = 1080, H = 1920;
// Presenter staging. "v6" (Madhav 2026-10-24, the default for new films): a big mirrored cut-out bottom-left
// (scale 0.88, x -80, y 234, head top ~y 780-950), graphics in the top band (y 220-760) + right column
// (x 720-940, y 760-1300), captions in the right column under the graphics (x 692, from y 1300).
// "v3" (the drug-discovery film as shipped): a smaller cut-out (scale 0.66, flush bottom-left), top band
// y 220-640, right column x 580-940 / y 660-1180, captions x 555 y 1215. src/world-drug/ is laid out for v3.
export const STAGING = "v6" as "v3" | "v6";
export type Word = { w: string; s: number; e: number; src: number };
export const WORDS = words as Word[];
const ENV = env as number[];

// Output EDL (src/edl.json; schema in SPINE.md), built by the project's spine script: his source segments laid end to end (after an optional
// ElevenLabs news intro), every cut on the 1/30 s grid; then the ElevenLabs outro and a held end card.
// Source times are LOCAL to this clip's proxy (public/proxy-1440.mp4).
export type Seg = { out: number; src: number; len: number };
export const EDL = edl.segments as Seg[];
const LAST = EDL[EDL.length - 1];
export const SRC_END_OUT = LAST.out + LAST.len; // the footage ends here; the rest is the outro + held ending
export const OUTRO = edl.outro as { t: number; dur: number; text: string };
// Optional ElevenLabs news line before his first words (no footage under it: use an OUT beat).
export const INTRO = (edl as { intro: { t: number; dur: number; text: string } | null }).intro;
export const FOOT_START = EDL[0].out; // his footage starts here
export const segIdx = (t: number) => { let i = 0; while (i + 1 < EDL.length && EDL[i + 1].out <= t) i++; return i; };
export const srcAt = (t: number) => { const s = EDL[segIdx(t)]; return s.src + t - s.out; };
// source time -> output time; a source time inside a removed stretch maps to the next kept frame
export const outOf = (src: number) => {
  for (const s of EDL) { if (src < s.src) return s.out; if (src < s.src + s.len) return s.out + src - s.src; }
  return SRC_END_OUT;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");
// Start time (out seconds) of the nth occurrence of `phrase`; throws if ambiguous or missing.
export const cue = (phrase: string, nth?: number): number => {
  const p = phrase.split(/\s+/).map(norm), hits: number[] = [];
  for (let i = 0; i + p.length <= WORDS.length; i++) {
    if (p.every((x, j) => norm(WORDS[i + j].w) === x)) hits.push(WORDS[i].s);
  }
  if (nth === undefined && hits.length > 1) throw new Error(`cue "${phrase}" is said ${hits.length} times; pass nth`);
  const s = hits[nth ?? 0];
  if (s === undefined) throw new Error(`cue not found: ${phrase}`);
  return s;
};
export const cueEnd = (phrase: string, nth?: number): number => {
  const i = WORDS.findIndex((w) => w.s === cue(phrase, nth));
  return WORDS[i + phrase.split(/\s+/).length - 1].e;
};

export const f = (sec: number) => Math.round(sec * FPS);
export const TOTAL = edl.frames as number;
export const voLevel = (fr: number) => ENV[fr] ?? 0;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
export const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);
export const easeIn = Easing.bezier(0.5, 0, 0.9, 0.4);
// 0->1 over `dur` frames starting at frame `at`.
export const prog = (fr: number, at: number, dur = 12, e = ease) =>
  interpolate(fr, [at, at + dur], [0, 1], { ...clamp, easing: e });
// same, in seconds
export const progS = (t: number, at: number, dur = 0.4, e = ease) =>
  interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing: e });
export const pop = (fr: number, at: number, damping = 14) =>
  spring({ frame: fr - at, fps: FPS, config: { damping, stiffness: 180, mass: 0.7 } });
export const popS = (t: number, at: number, damping = 14) => pop(Math.round(t * FPS), Math.round(at * FPS), damping);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

export type SoundEvent = { id: string; t: number; dur?: number; what: string; x?: number };
