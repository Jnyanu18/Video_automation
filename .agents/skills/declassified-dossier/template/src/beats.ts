// The clip's beat table (v5b: his re-recorded take at 1.18x, + security / employment / war lines, "I read the question, then I answer"). He is always the still
// cut-out bottom-left; every beat is SIDE except the END card. Every start comes from his words (words.json) or OUTRO.
import { FPS, OUTRO, TOTAL, cue } from "./lib";

export type Mode = "FULL" | "FWD" | "SIDE" | "OUT" | "END";
type B = { id: string; s: number; mode: Mode; tile?: [number, number] };

const raw: B[] = [
  { id: "hook", s: 0, mode: "SIDE" },                                    // The US just banned a Chinese AI. Was that fair?
  { id: "qwhy", s: cue("Why did they") - 0.15, mode: "SIDE" },           // Q: why did they ban DeepSeek?
  { id: "news", s: cue("on October") - 0.15, mode: "SIDE" },             // Oct 20: banning DeepSeek from the federal system
  { id: "data", s: cue("Homeland Security") - 0.12, mode: "SIDE" },      // DHS: could send sensitive data to China
  { id: "outside", s: cue("No one wants") - 0.12, mode: "SIDE" },        // no one sends sensitive data outside their country
  { id: "enigma", s: cue("Imagine Enigma.") - 0.12, mode: "SIDE" },      // WHAT IF? Enigma leaking to Germany
  { id: "restrict", s: cue("And it's just") - 0.12, mode: "SIDE" },      // not just US: S. Korea, Italy, Germany
  { id: "qthreat", s: cue("So is it a") - 0.12, mode: "SIDE" },          // Q: security threat or power struggle?
  { id: "take", s: cue("My honest take") - 0.12, mode: "SIDE" },         // A: not OR, it's AND
  { id: "cars", s: cue("For example,") - 0.12, mode: "SIDE" },           // BYD 100% tariff; security risk? no. power struggle
  { id: "jobs", s: cue("You wanna keep") - 0.12, mode: "SIDE" },        // automotive industry employs people; cheap car; jobs lost
  { id: "ailoss", s: cue("So if you think") - 0.12, mode: "SIDE" },     // buy AI instead of make it: employment / tech front / learning
  { id: "war", s: cue("And when the war") - 0.12, mode: "SIDE" },       // IF there is a war: borrowed AI on the strategy table
  { id: "plug", s: cue("the other person") - 0.12, mode: "SIDE" },      // supplier pulls the plug: "I am not gonna give it to you"
  { id: "stuck", s: cue("You are basically") - 0.12, mode: "SIDE" },    // stuck with broken hardware
  { id: "natsec", s: cue("So it becomes") - 0.12, mode: "SIDE" },       // national security AND power struggle
  { id: "verdict", s: cue("I would say") - 0.1, mode: "SIDE" },          // ban it, restrict it, allow more competitors
  { id: "healthy", s: cue("So the competition") - 0.12, mode: "SIDE" },  // competition always stays healthy
  { id: "comment", s: cue("Would you ban") - 0.12, mode: "SIDE" },       // would you ban it? comments
  { id: "end", s: OUTRO.t - 0.3, mode: "END" },
];
export const BEATS = raw.map((b, i) => ({ ...b, e: raw[i + 1]?.s ?? TOTAL / FPS }));
export type Beat = (typeof BEATS)[number];
export const beatIdx = (t: number) => { let i = 0; while (i + 1 < BEATS.length && BEATS[i + 1].s <= t) i++; return i; };
export const beatAt = (t: number) => BEATS[beatIdx(t)];
export const B = Object.fromEntries(BEATS.map((b) => [b.id, b])) as Record<string, Beat>;
export const inBeat = (t: number, id: string) => (t - B[id].s) / (B[id].e - B[id].s);
