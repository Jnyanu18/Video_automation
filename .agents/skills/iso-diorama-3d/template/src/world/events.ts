// Sound events (output seconds) from the same constants the world draws with. v5: sparse and soft, only on real
// visual hits (<= 25/min). Keywords drive the mixer: whoosh, pop, land, card, stamp, coin, chime, beep, bloom.
import type { SoundEvent } from "../lib";
import { B } from "../beats";
import { OUTRO } from "../lib";
import { T } from "./timing";
import { CHAIN, NIGHT, SCALE, GLOW } from "./times";

const e = (id: string, t: number, what: string, x?: number, dur?: number): SoundEvent => ({ id, t: +t.toFixed(3), what, x, dur });

export const EVENTS: SoundEvent[] = [
  e("hook-card", 0.05, "card land soft"),
  e("q-first", T.askFirst, "pop card soft", -0.2),
  e("squad", T.humanoid + 0.1, "pop soft", 0.3),
  e("stream", T.everywhere, "whoosh soft"),
  e("chain-1", CHAIN[0], "pop beep soft", 0.2),
  e("chain-5", CHAIN[4], "pop beep soft", 0.4),
  e("night", NIGHT.on, "bloom soft"),
  e("q-decide", T.askDecide, "pop card soft", -0.2),
  e("scale-tip", SCALE.tip, "land soft", 0.3),
  e("pattern", T.pattern, "whoosh soft", 0.3),
  e("push-painting", T.valueOf + 0.1, "whoosh soft", 0.3),
  e("hearts", T.humanFeeling + 0.2, "chime soft", 0.4),
  e("chai-sip", T.sip, "pop soft", 0.4),
  e("gossip", T.gossip, "pop soft", 0.4),
  e("diamond", T.whichDiamond, "chime soft", 0.4),
  e("robot-cant", T.robotCant, "pop card soft", 0.3),
  e("stamp-human", T.staysHuman, "stamp soft"),
  e("glow", GLOW, "bloom soft"),
  e("comment", B.comment.s, "card soft"),
  e("follow", OUTRO.t, "pop card soft", 0.3),
];
