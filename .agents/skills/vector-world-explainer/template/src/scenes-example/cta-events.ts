// Sound events for this act (pure module: no React). The scene draws from the same constants.
import { ACTS, B, ev, type SoundEvent } from "../beats";
import { COIN_LAND } from "./aiwave-events";

// CTA: the coin the student tossed drops into the study and lands on the table (its face the chip
// die with the film's maze); on "keep learning" the maze's solution lights; on "next big
// breakthroughs" three small topic coins pop onto ledges beside it (an AI chip, the quantum chip, a
// mystery "?") under NEXT BIG BREAKTHROUGHS; on "follow" FOLLOW slams in above the coin. Madhav
// leaves; the end card holds with a glint sweep, motes, the planet drifting and steam.
export const K = {
  start: ACTS.cta[0],
  land: COIN_LAND, // the coin lands on the table (thud, dust, light pool)
  bounce: COIN_LAND + 0.2, // small bounce settles
  learn: B.keepLearning, // the maze solution on the coin's die lights up
  sweep: B.keepLearning + 0.5, // light sweeps across the coin's face
  pan: B.nextBig - 0.3, // camera eases right to make room for the shelf
  label: B.nextBig, // NEXT BIG BREAKTHROUGHS writes on
  topic1: B.nextBig + 0.04, // AI chip coin pops onto its ledge
  topic2: B.nextBig + 0.24, // quantum chip coin
  topic3: B.nextBig + 0.64, // mystery "?" coin
  hit: B.hit, // anticipation: the coin dips
  follow: B.follow - 0.05, // FOLLOW lands (warm thud, shake), 2 frames ahead of the word
  handle: B.follow + 0.25, // @madhav_somani writes on under it
  settle: 113.95, // Madhav has left: camera settles into the end card...
  hold: 114.65, // ...and holds still (subtle life only) to the last frame
  glint: 114.45, // final glint sweeps the coin
  end: ACTS.cta[1],
};

export const EVENTS: SoundEvent[] = [
  ev("coin-drop", K.start, "the tossed coin tumbles down into the study", -0.25, K.land - K.start),
  ev("coin-land", K.land, "the coin lands upright on the table (heavy thud, dust puff, light pool flares)", -0.25),
  ev("coin-bounce", K.bounce, "small bounce, settles", -0.25),
  ev("maze-lights", K.learn, "the maze's solution lights up gold across the coin's die", -0.25, 0.9),
  ev("coin-sweep", K.sweep, "a light sweep glints across the coin's face", -0.2, 0.6),
  ev("pan-shelf", K.pan, "camera eases right toward the wall ledges", 0.2, 0.7),
  ev("label", K.label, "NEXT BIG BREAKTHROUGHS writes on beside the coin", 0.55),
  ev("topic-ai", K.topic1, "a small AI-chip coin pops onto its ledge (tick)", 0.55),
  ev("topic-quantum", K.topic2, "a small quantum-chip coin pops on (tick)", 0.55),
  ev("topic-mystery", K.topic3, "a mystery ? coin pops on (tick, slight wobble)", 0.55),
  ev("hit-dip", K.hit, "the big coin dips (anticipation)", -0.25),
  ev("follow", K.follow, "FOLLOW slams in above the coin (warm thud, shake, sparkle)", -0.25),
  ev("handle", K.handle, "@madhav_somani slides in under FOLLOW (soft tick)", -0.25),
  ev("end-settle", K.settle, "camera eases in and settles into the end card", 0, K.hold - K.settle),
  ev("end-glint", K.glint, "a last glint sweeps the coin; the end card holds", -0.25, 0.6),
];
