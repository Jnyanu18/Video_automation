// Sound events for audio/mix.py (dumped by dump-events.mts -> out/events.json). Sparse and soft: only real
// visual hits, <= ~25 per minute. `what` keywords pick the sound (see sound_for in audio/mix.py); x = pan -1..1.
import type { SoundEvent } from "../lib";
import { B } from "../beats";
import { OUTRO } from "../lib";
import { K } from "./cues";

export const EVENTS: SoundEvent[] = [
  { id: "card", t: K.startup, what: "card" },
  { id: "dm", t: B.q.s + 0.1, what: "pop", x: 0.5 },
  { id: "faster", t: K.faster, what: "marker", x: 0.5 },
  { id: "yes", t: K.yes + 0.3, what: "stamp", x: 0.5 },
  { id: "zoomOut", t: B.end.s, what: "whoosh" },
  { id: "follow", t: OUTRO.t, what: "marker" },
];
