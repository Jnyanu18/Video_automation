// Sound events for this act (pure module: no React). The scene draws from the same constants.
import { ACTS, B, ev, type SoundEvent } from "../beats";

export const BITS = {
  start: ACTS.bits[0], // first frame: pushed into the laptop screen (the hook's chip light)
  pullDone: ACTS.bits[0] + 0.7, // pulled back to the laptop on the desk
  xray: B.xray,
  dive: B.switches, // camera dives into the processor
  diveIn: B.switches + 0.6, // inside: the field of switches
  ripple: B.bitsWord, // a ripple of flips runs out across the field on "bits"
  pushHero: B.bitsWord + 0.95, // "Each one": push in on one switch
  zero: B.zero,
  one: B.one,
  lift: B.coinFlat - 0.6, // the hero switch rounds into a coin and lifts off the field
  cut: B.coinFlat - 0.2, // match on the coin: the desk, coin face-on, tipping flat as it falls
  land: B.coinFlat + 0.2, // the coin lands flat on the desk
  heads: B.heads,
  tails: B.tails, // hops and flips to tails
  tailsLand: B.tails + 0.33,
};

export const EVENTS: SoundEvent[] = [
  ev("screen-pull", BITS.start, "camera pulls back out of the glowing laptop screen to the laptop on the desk", 0, BITS.pullDone - BITS.start),
  ev("xray", BITS.xray, "laptop x-ray opens onto the processor", 0),
  ev("dive", BITS.dive, "camera dives into the processor", 0, BITS.diveIn - BITS.dive),
  ev("switches", BITS.diveIn, "field of switches flickers 0/1", 0, 1.0),
  ev("ripple-bits", BITS.ripple, "a ring of flips ripples out across the switches on 'bits'", 0),
  ev("push-hero", BITS.pushHero, "push in on one switch", 0.1, 0.7),
  ev("zero", BITS.zero, "the hero switch pops to 0", 0.1),
  ev("one", BITS.one, "the hero switch pops to 1", 0.1),
  ev("coin-lift", BITS.lift, "the switch rounds into a gold coin and lifts off", 0.1),
  ev("coin-drop", BITS.land, "coin tips flat and lands on the desk", 0.1),
  ev("heads", BITS.heads, "coin glows heads (1)", 0.1),
  ev("tails", BITS.tails, "coin hops and flips over", 0.1),
  ev("tails-land", BITS.tailsLand, "coin lands tails (0)", 0.1),
];
