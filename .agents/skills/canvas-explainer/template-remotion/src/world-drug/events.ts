// Sound events (v3: sparse and soft, only on real visual hits; <= 25 per minute -> <= 20 for 48 s).
import type { SoundEvent } from "../lib";
import { B } from "./beats";
import { OUTRO } from "../lib";
import { K } from "./cues";

export const EVENTS: SoundEvent[] = [
  { id: "card", t: 3.0, what: "card" },
  { id: "chips", t: K.track, what: "pop", x: 0.5 },
  { id: "years", t: K.takes + 0.2, what: "stamp" },
  { id: "aiChange", t: K.aiCould, what: "marker", x: 0.5 },
  { id: "yes", t: K.yes + 0.3, what: "stamp", x: 0.5 },
  { id: "pattern", t: K.patt, what: "bloom" },
  { id: "protein", t: K.finding, what: "marker draw", dur: 1.0 },
  { id: "brute", t: K.brute, what: "pop", x: 0.5 },
  { id: "fit", t: K.sticks, what: "click" },
  { id: "check", t: K.sticks + 0.05, what: "check", x: 0.4 },
  { id: "chip", t: K.body - 0.15, what: "card", x: 0.5 },
  { id: "gauge", t: K.penetration, what: "rise", x: 0.5 },
  { id: "cross", t: K.medCheaper + 0.4, what: "scribble", x: 0.5 },
  { id: "keys", t: K.millions - 0.1, what: "pop" },
  { id: "unlock", t: K.fitsLock + 0.3, what: "click" },
  { id: "lifeline", t: K.humans, what: "pulse" },
  { id: "confetti", t: K.celebrate, what: "pop", x: 0.5 },
  { id: "comment", t: K.comment, what: "pop", x: 0.5 },
  { id: "zoomOut", t: B.end.s, what: "whoosh" },
  { id: "follow", t: OUTRO.t, what: "marker" },
];
