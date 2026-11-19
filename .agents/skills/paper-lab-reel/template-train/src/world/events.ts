// v8 sound events (cut-line events removed); v5:: sparse and soft (<= 25/min), only on real visual hits. Same cues the world draws with.
import type { SoundEvent } from "../lib";
import { B, T } from "./T";

const E: SoundEvent[] = [
  { id: "hook-in", t: 0.0, what: "paper card land", x: 0 },
  { id: "still-stamp", t: T.important, what: "stamp impact", x: 0.5 },
  { id: "hill-climb", t: T.hill1 - 0.3, dur: 1.8, what: "toot roll", x: -0.2 },
  { id: "spec-torque", t: T.torque - 0.08, what: "check select", x: 0.5 },
  { id: "himal-drop", t: T.bulletH + 0.3, what: "land impact", x: 0 },
  { id: "wont-work", t: T.cant, what: "stamp impact", x: 0.4 },
  { id: "no-sale", t: T.dont + 0.35, what: "stamp impact", x: 0.5 },
  { id: "train-roll", t: T.knowsTrain - 0.1, dur: 0.8, what: "toot roll", x: -0.3 },
  { id: "where-to", t: T.doesnt, what: "stamp impact", x: -0.3 },
  { id: "you-choose", t: T.whatYouWant + 0.1, what: "stamp impact", x: 0.5 },
  { id: "q2-bubble", t: B.q2.s + 0.15, what: "pop card", x: 0.3 },
  { id: "track-lay", t: T.well + 0.05, dur: 0.9, what: "click land", x: 0.2 },
  { id: "cs-stamp", t: T.theCS, what: "stamp impact", x: 0.5 },
  { id: "book1", t: T.architecture - 0.08, what: "land", x: 0.5 },
  { id: "answered", t: T.answered, dur: 0.4, what: "check select", x: 0.5 },
  { id: "comment", t: B.comment.s, what: "pop card", x: 0 },
  { id: "end-card", t: B.end.s, what: "paper card land", x: 0 },
];
export const EVENTS: SoundEvent[] = E.sort((a, b) => a.t - b.t);
