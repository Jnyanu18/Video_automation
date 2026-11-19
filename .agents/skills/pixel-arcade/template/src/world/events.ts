// Sound events (output seconds) from the same constants the world draws with. v3: sparse, soft (<= 25/min).
import type { SoundEvent } from "../lib";
import { T } from "./timing";

export const EVENTS: SoundEvent[] = [
  { id: "gp", t: T.gp, what: "pop", x: 0.5 },
  { id: "labs", t: T.labs, what: "click unlock", x: 0.5 },
  { id: "news", t: T.labs + 0.44, what: "card" },
  { id: "ceo", t: T.ceo + 0.1, what: "card coin" },
  { id: "retired", t: T.retired, what: "stamp", x: 0.5 },
  { id: "prep", t: T.prep, what: "select beep" },
  { id: "vs", t: T.vs + 0.05, what: "impact vs" },
  { id: "fight", t: T.fight, what: "hit fight" },
  { id: "anywhere", t: T.anywhere, what: "pop" },
  { id: "studios", t: T.biggest, what: "bloom", x: 0.5 },
  { id: "cheaper", t: T.cheaper, what: "coin" },
  { id: "block", t: T.lotMore, what: "hit block", x: 0.5 },
  { id: "go", t: T.capture, what: "beep" },
  { id: "rival", t: T.psMap, what: "pulse", x: 0.5 },
  { id: "comment", t: T.commentW, what: "pop", x: 0.5 },
  { id: "follow", t: T.follow, what: "card" },
];
