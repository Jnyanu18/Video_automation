// Sound events for the pool act (pure module: no React). The scene draws from the same constants.
// Madhav's own analogy: two friends in a night pool splash, wave their hands, and their waves meet.
// Cutaway diorama: the pool surface in perspective above, the water in section below it.
import { ACTS, B, ev, type SoundEvent } from "../beats";

export const POOL = {
  start: ACTS.pool[0], // close on the floating gold coin, ripple rings (continuity with the gold landing)
  rings: ACTS.pool[0] + 0.02,
  pullBack: ACTS.pool[0] + 0.25, // camera pulls up and back off the water
  hello: B.imagine + 0.85, // "you": kid A waves hello
  bubbles: B.friend - 0.7, // a bubble trail from the friend under water
  friend: B.friend, // the friend bursts up out of the water
  pool: B.pool, // the whole pool revealed
  windA: B.splash - 0.28, // kid A winds up
  splashA: B.splash, // ...and splashes the friend
  hitB: B.splash + 0.5, // droplets land on / around the friend
  windB: B.splash + 0.42,
  splashB: B.splash + 0.7, // the friend splashes back
  hitA: B.splash + 1.18,
  splashBoth: B.splash + 1.15, // both splash at once
  waving: B.waving, // both sweep the water: crests roll out toward the middle
  waving2: B.waving + 0.5,
  tilt: B.twoWaves - 0.3, // camera tilts down into the water section
  tiltEnd: B.twoWaves + 0.55,
  trains: B.waving + 0.1, // the wave trains leave the kids in the section
  twoWaves: B.twoWaves,
  hold: B.sameLength - 0.15, // trains slow almost to a stop for the comparison
  sameLength: B.sameLength, // wavelength brackets draw on both trains
  sameWidth: B.sameWidth, // height brackets draw on both trains
  surge: B.combined - 0.45, // the trains surge into each other
  combined: B.combined, // crest on crest: the overlap turns gold
  label1: B.combined + 0.75, // "in sync → bigger wave"
  bigger1: B.bigger1, // the big gold wave peaks, spray off its crest
  rightAnswers: B.rightAnswers, // the coin hops on the crest; tag becomes "right answer ✓"
  lane2: B.rightAnswers + 0.15, // a second lane drops in above the gold one (top stage)
  lane2Waves: B.rightAnswers + 0.3, // out-of-sync trains run in
  lane2Meet: B.rightAnswers + 0.95, // crest meets trough
  lane2Flat: B.rightAnswers + 1.3, // flat, coral: "out of sync → cancel (wrong answers)"
  lane2Out: B.bigger2 + 0.35, // the lane lifts away upward (gone before "So the probability")
  bigger2: B.bigger2, // the gold wave swells again
  probability: B.probability, // water pillars rise out of the gold lane, all equal
  pillarsUp: B.probability - 0.25,
  split: B.probability + 0.5, // the gold pillar climbs, the others sink and turn coral
  goesUp: B.goesUp, // the gold pillar tops out, coin on top, spray
  whipOut: ACTS.pool[1] - 0.32, // whip-tilt up into scale
  end: ACTS.pool[1],
};

export const EVENTS: SoundEvent[] = [
  ev("pool-rings", POOL.rings, "gold ripple rings spread from the floating coin (continuing the gold landing)", 0),
  ev("pool-pullback", POOL.pullBack, "camera pulls up and back off the water: kid A waves, the night pool, string lights, palms", 0, POOL.pool - POOL.pullBack),
  ev("pool-friend-up", POOL.friend, "the friend bursts up out of the water with a splash", 0.6),
  ev("pool-splashA", POOL.splashA, "kid A splashes a sheet of water at the friend", -0.4),
  ev("pool-hitB", POOL.hitB, "droplets rain on the friend, little rings on the water; the friend squeals", 0.6),
  ev("pool-splashB", POOL.splashB, "the friend splashes back", 0.4),
  ev("pool-wave1", POOL.waving, "both kids sweep the water: the first crests roll out toward the middle", 0, 0.5),
  ev("pool-tilt", POOL.tilt, "camera tilts down to the side section of the water", 0, POOL.tiltEnd - POOL.tilt),
  ev("pool-length", POOL.sameLength, "wavelength brackets draw on both trains: equal", 0),
  ev("pool-width", POOL.sameWidth, "height brackets draw on both trains: equal", 0),
  ev("pool-surge", POOL.surge, "the two trains surge into each other", 0, POOL.combined - POOL.surge),
  ev("pool-combined", POOL.combined, "crest on crest: the overlap grows and turns gold, gold light floods the water", 0),
  ev("pool-bigger1", POOL.bigger1, "the big gold wave peaks, spray bursts off its crest, the coin rides it", 0),
  ev("pool-right", POOL.rightAnswers, "the coin hops on the crest and flips; tag: right answer ✓", 0),
  ev("pool-lane2-waves", POOL.lane2Waves, "a second lane drops in above the gold one; coral out-of-sync wave trains run in from both ends", 0, POOL.lane2Meet - POOL.lane2Waves),
  ev("pool-cancel", POOL.lane2Flat, "the second lane flattens to a calm coral line: out of sync → cancel (wrong answers)", -0.3),
  ev("pool-lane2-out", POOL.lane2Out, "the cancelled lane lifts away upward", 0, 0.33),
  ev("pool-bigger2", POOL.bigger2, "the gold wave swells again, spray off the crest", 0),
  ev("pool-pillars", POOL.probability, "five water pillars rise out of the gold lane, all the same height", 0),
  ev("pool-split", POOL.split, "the middle pillar climbs gold while the other four sink and turn coral", 0, POOL.goesUp - POOL.split),
  ev("pool-goesup", POOL.goesUp, "the gold pillar tops out: spray, the coin lands on top, kids cheer", 0),
  ev("pool-whip", POOL.whipOut, "camera whips up out of the pool (into scale)", 0, POOL.end - POOL.whipOut + 0.35),
];
