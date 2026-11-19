// Sound events (output seconds), v5: soft and sparse, only on real visual hits (<= 25/min; ~36 s -> 14).
import type { SoundEvent } from "../lib";
import { B } from "../beats";
import { T } from "./times";

const ev: SoundEvent[] = [
  { id: "launch", t: T.launch, what: "rocket launch whoosh", dur: 1.2, x: 0.4 },
  { id: "q", t: B.q.s, what: "pop card", x: 0 },
  { id: "snap1", t: T.snap1, what: "clamp snap click", x: 0.4 },
  { id: "plane", t: T.plane - 0.1, what: "pop card", x: 0.3 },
  { id: "snap2", t: T.throwAway + 0.05, what: "clamp snap impact", x: 0.4 },
  { id: "car", t: T.carOut + 0.15, what: "soft whoosh", dur: 0.9, x: 0 },
  { id: "tomorrow", t: T.tomorrow + 0.1, what: "card page", x: 0.4 },
  { id: "buy", t: T.buy + 0.55, what: "pop", x: -0.2 },
  { id: "nosense", t: T.noSense - 0.05, what: "stamp", x: 0.4 },
  { id: "goal", t: T.building - 0.1, what: "paper page", x: 0 },
  { id: "f15", t: B.goal.s + 0.6, what: "card", x: 0.4 },
  { id: "pass", t: T.seattle, what: "card", x: 0.4 },
  { id: "end", t: B.end.s, what: "pop", x: 0 },
];
export const EVENTS: SoundEvent[] = ev.sort((a, b) => a.t - b.t);
