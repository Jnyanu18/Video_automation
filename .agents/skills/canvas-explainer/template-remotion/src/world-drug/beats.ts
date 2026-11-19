// The clip's beat table (v3). He is ALWAYS the still cut-out bottom-left, so every beat is SIDE (END = end card);
// the beat only says which page of the drawn canvas is on screen. Every start comes from the spoken words.
import { FPS, OUTRO, TOTAL } from "../lib";
import { K } from "./cues";

export type Mode = "FULL" | "FWD" | "SIDE" | "OUT" | "END";
type B = { id: string; s: number; mode: Mode; tile?: [number, number] };

const raw: B[] = [
  { id: "hook", s: 0, mode: "SIDE" },           // EL: OpenAI just bought Orchestra Bio...
  { id: "years", s: K.getting - 0.1, mode: "SIDE" },      // EL: 10-15 years to approval, AI could change that
  { id: "q", s: K.couldHelp - 0.15, mode: "SIDE" },       // his: could AI help... I would think yes
  { id: "patt", s: K.reallyGood - 0.15, mode: "SIDE" },   // his: pattern recognition
  { id: "protein", s: K.finding - 0.1, mode: "SIDE" },    // his: the pattern that fits your protein, brute force, sticks
  { id: "keys", s: K.think - 0.12, mode: "SIDE" },        // EL: millions of keys, one fits the lock
  { id: "market", s: K.iThinkAI - 0.15, mode: "SIDE" },   // his: highest penetration in drug discovery
  { id: "cheaper", s: K.medCheaper - 0.12, mode: "SIDE" },// his: a lot of medicine will be cheaper
  { id: "live", s: K.humans - 0.12, mode: "SIDE" },       // his: live longer, celebrate
  { id: "comment", s: K.trust - 0.12, mode: "SIDE" },     // EL: would you trust... comment below
  { id: "end", s: OUTRO.t - 0.3, mode: "END" },
];
export const BEATS = raw.map((b, i) => ({ ...b, e: raw[i + 1]?.s ?? TOTAL / FPS }));
export type Beat = (typeof BEATS)[number];
export const beatIdx = (t: number) => { let i = 0; while (i + 1 < BEATS.length && BEATS[i + 1].s <= t) i++; return i; };
export const beatAt = (t: number) => BEATS[beatIdx(t)];
export const B = Object.fromEntries(BEATS.map((b) => [b.id, b])) as Record<string, Beat>;
export const inBeat = (t: number, id: string) => (t - B[id].s) / (B[id].e - B[id].s);
