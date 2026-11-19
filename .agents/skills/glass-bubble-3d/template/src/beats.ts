// The clip's beat table (c2-bubble, v5). Every start comes from the spoken words (cue) or the outro time.
// v5: his own re-recorded take; he reads two questions out (q1, q2) and answers them. He is always the still cut-out
// bottom-left, so every beat is SIDE (END for the end card); a beat = a new picture.
import { FPS, OUTRO, TOTAL } from "./lib";
import { T } from "./world/timing";

export type Mode = "FULL" | "FWD" | "SIDE" | "OUT" | "END";
type B = { id: string; s: number; mode: Mode; tile?: [number, number] };

const S = (id: string, s: number): B => ({ id, s, mode: "SIDE" });
const raw: B[] = [
  S("hook", 0),                       // I barely write code anymore. And here is what I do instead.
  S("q1", T.q1 - 0.15),               // Q: Is the AI boom the future, or a bubble about to pop?
  S("money", T.bigTech - 0.1),        // Big tech is pouring billions into it
  S("touch", T.think - 0.1),          // Think about it. AI now touches everything: robotics, medical, ... drug discovery
  S("q2", T.q2 - 0.15),               // Q: What's actually changed in your job?
  S("msft", T.working - 0.1),         // I'm working at Microsoft, so I've seen how AI completely evolved the way we work
  S("code", T.dontCode - 0.1),        // I don't code a lot these days
  S("night", T.night - 0.45),         // I used to code every single night, but now I don't
  S("orch", T.nowIf - 0.1),           // Now, if I think about it, the way I do is I orchestrate stuff
  S("steps", T.guide - 0.25),         // I guide, I design, I verify, and I babysit the AI and get the output
  S("plain", T.plain - 0.1),          // In plain words, I manage AI agents more than I'm writing code
  S("old", T.usedTo - 0.1),           // we used to write code, raise a PR, approve by reviewing, QA, deploy
  S("ai", T.myQA - 0.1),              // So my QA is AI, my reviewer is AI, ... deploying is AI
  S("stay", T.stay - 0.1),            // And I think it's gonna stay
  S("comment", T.bubbleOrNot - 0.1),  // Bubble or not, comment your take
  { id: "end", s: OUTRO.t - 0.3, mode: "END" },
];
export const BEATS = raw.map((b, i) => ({ ...b, e: raw[i + 1]?.s ?? TOTAL / FPS }));
export type Beat = (typeof BEATS)[number];
export const beatIdx = (t: number) => { let i = 0; while (i + 1 < BEATS.length && BEATS[i + 1].s <= t) i++; return i; };
export const beatAt = (t: number) => BEATS[beatIdx(t)];
export const B = Object.fromEntries(BEATS.map((b) => [b.id, b])) as Record<string, Beat>;
export const inBeat = (t: number, id: string) => (t - B[id].s) / (B[id].e - B[id].s);
