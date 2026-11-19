// Sound events (output seconds) from the same constants the world draws with. Sparse and soft: only real visual
// hits, <= 25 per minute. `what` keywords drive audio/mix.py's sound_for(): whoosh, pop, card, stamp, type, glitch,
// pulse, node, bloom, chime, coin, check, marker, draw ... add "soft". x = stereo pan -1..1.
import type { SoundEvent } from "../lib";
import { B } from "../beats";
import { OUTRO, cue } from "../lib";
import { QUESTIONS } from "../ig";

export const EVENTS: SoundEvent[] = [
  ...QUESTIONS.map((q) => ({ id: `q${q.i + 1}`, t: q.s - 0.15, what: "pop soft", x: 0 })),
  { id: "decide", t: cue("decide") - 0.1, what: "card soft", x: 0.2 },
  { id: "answer", t: B.a1.s, what: "node soft", x: 0.3 },
  { id: "follow", t: OUTRO.t, what: "land soft", x: 0.3 },
];
