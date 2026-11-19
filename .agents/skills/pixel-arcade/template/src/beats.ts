// v3 beat table: he is always the still cut-out bottom-left (SIDE); END = end card. Starts come from the words.
import { FPS, TOTAL } from "./lib";
import { T } from "./world/timing";

export type Mode = "FULL" | "FWD" | "SIDE" | "OUT" | "END";
type B = { id: string; s: number; mode: Mode; tile?: [number, number] };

const raw: B[] = [
  { id: "hook", s: T.hook, mode: "SIDE" },
  { id: "ceo", s: T.ceo, mode: "SIDE" },
  { id: "q", s: T.q, mode: "SIDE" },
  { id: "vs", s: T.vs, mode: "SIDE" },
  { id: "crowd", s: T.crowd, mode: "SIDE" },
  { id: "studios", s: T.studios, mode: "SIDE" },
  { id: "cheap", s: T.cheap, mode: "SIDE" },
  { id: "titles", s: T.titles, mode: "SIDE" },
  { id: "map", s: T.map, mode: "SIDE" },
  { id: "comment", s: T.comment, mode: "SIDE" },
  { id: "end", s: T.end, mode: "END" },
];
export const BEATS = raw.map((b, i) => ({ ...b, e: raw[i + 1]?.s ?? TOTAL / FPS }));
export type Beat = (typeof BEATS)[number];
export const beatIdx = (t: number) => { let i = 0; while (i + 1 < BEATS.length && BEATS[i + 1].s <= t) i++; return i; };
export const beatAt = (t: number) => BEATS[beatIdx(t)];
export const B = Object.fromEntries(BEATS.map((b) => [b.id, b])) as Record<string, Beat>;
export const inBeat = (t: number, id: string) => (t - B[id].s) / (B[id].e - B[id].s);
