// Sound events (output seconds) from the same constants the world draws with. v5: sparse and soft, only on
// real visual hits (<= 25 per minute). `what` keywords drive the mixer; x = stereo -1..1.
import type { SoundEvent } from "../lib";
import { B } from "../beats";
import { OUTRO } from "../lib";
import { T } from "./timing";
import { OBJ_ARRIVE } from "./rig";

export const EVENTS: SoundEvent[] = [
  { id: "q1", t: B.q1.s, what: "pop soft", x: 0 },
  { id: "crack", t: T.pop, what: "glitch crack soft", x: 0.4 },
  { id: "coins", t: T.pouring, what: "coin soft", x: 0.4, dur: 1.6 },
  { id: "threads", t: OBJ_ARRIVE(0), what: "node soft", x: -0.2 },
  { id: "icons-more", t: OBJ_ARRIVE(2), what: "node soft", x: 0.3 },
  { id: "q2", t: B.q2.s, what: "pop soft", x: 0 },
  { id: "desk", t: B.msft.s, what: "whoosh soft", x: 0.2 },
  { id: "agent", t: T.evolved - 0.1, what: "type soft", x: 0.3, dur: 1.2 },
  { id: "moon", t: T.night, what: "chime soft", x: -0.2 },
  { id: "orch", t: T.orchestrate, what: "card soft", x: 0.3 },
  { id: "output", t: T.output, what: "stamp soft", x: 0.3 },
  { id: "plain", t: B.plain.s, what: "card soft", x: 0.4 },
  { id: "pipeline", t: B.old.s, what: "whoosh soft", x: 0.3 },
  { id: "stamp-qa", t: T.aiQA, what: "stamp soft", x: 0.4 },
  { id: "stamp-review", t: T.aiReview, what: "stamp soft", x: 0.4 },
  { id: "stamp-build", t: T.aiBuild, what: "stamp soft", x: 0.4 },
  { id: "stamp-approve", t: T.aiApprove, what: "stamp soft", x: 0.4 },
  { id: "stamp-deploy", t: T.aiDeploy, what: "stamp soft", x: 0.4 },
  { id: "harden", t: T.stayW + 0.2, what: "bloom glass soft", x: 0.3 },
  { id: "comment", t: B.comment.s, what: "pop soft", x: 0.4 },
  { id: "follow", t: OUTRO.t, what: "land soft", x: 0.3 },
];
