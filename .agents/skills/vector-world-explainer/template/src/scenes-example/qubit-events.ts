// Sound events for this act (pure module: no React). The scene draws from the same constants.
import { ACTS, B, cue, ev, type SoundEvent } from "../beats";

export const QUBIT = {
  start: ACTS.qubit[0],
  label: B.qubit + 0.2, // QUBIT label writes in on the wall
  rattle: cue("that coin"), // "that coin": the coin rattles on the desk (anticipation of the flick)
  flick: cue("still spinning", 0) - 0.03, // flicked up onto its edge on "still", spinning by "spinning"
  steady: cue("still spinning", 0) - 0.03 + 1.0, // spin-up done: steady spin with precession
  // the operation beat: two more coins hop up spinning, a hand reaches in and taps the spinning coin
  hop1: cue("It's when") + 0.04, // first neighbour coin hops onto its edge
  hop2: cue("It's when") + 0.26, // second one
  handIn: cue("It's when") + 0.1, // the hand reaches in from the right
  handReady: B.doIt, // ...hovers over the coin's top on "you do"
  gate1: B.operation, // tap on "operation": teal pulse flows into the coin, its axis leans, its 0 face goes teal
  gate2: B.stillSpin2, // second tap on "still spinning": pulses run out to both neighbour coins too
  handOut: B.stillSpin2 + 0.5, // the hand withdraws (gone by "It's like")
  handGone: B.stillSpin2 + 1.0,
  blend: B.blend, // teal mixes into the gold
  heads: B.heads2, // "a blend of heads ..." : gold sweep of the room
  tails: B.tails2, // "... and tails": teal sweep
  same: B.sameTime, // camera eases out around the coin
  superposition: B.superposition,
  whipOut: ACTS.qubit[1] - 0.27, // camera whips down to the desk top
  end: ACTS.qubit[1],
};

export const EVENTS: SoundEvent[] = [
  ev("qubit-label", QUBIT.label, "QUBIT label writes onto the wall", 0.6),
  ev("rattle", QUBIT.rattle, "coin rattles on the desk before the flick", 0.1, 0.5),
  ev("spin-up", QUBIT.flick, "coin flicked up onto its edge and spins up", 0.1, QUBIT.steady - QUBIT.flick),
  ev("spin", QUBIT.steady, "steady spin with a precessing wobble, contact point skittering on the desk", 0.1, QUBIT.whipOut - QUBIT.steady),
  ev("hop-1", QUBIT.hop1, "a small coin in the row hops up onto its edge and spins", 0.6),
  ev("hop-2", QUBIT.hop2, "a second small coin hops up and spins", 0.75),
  ev("hand-in", QUBIT.handIn, "a hand in a sleeve reaches in from the right toward the spinning coin", 0.7, QUBIT.handReady - QUBIT.handIn),
  ev("gate-tap-1", QUBIT.gate1, "fingertip taps the top of the spinning coin: teal pulse ring flows into it, its axis leans, the 0 face turns teal", 0.2),
  ev("gate-label", QUBIT.gate1 - 0.03, "label pops in above the coin: gate = an operation", 0.1),
  ev("gate-tap-2", QUBIT.gate2, "second tap: the coin wobbles again and teal pulses run out along links to the two small spinning coins", 0.3),
  ev("gate-reach", QUBIT.gate2 + 0.3, "pulses reach the small coins, which wobble and tint teal", 0.7),
  ev("hand-out", QUBIT.handOut, "the hand withdraws out of frame", 0.8, QUBIT.handGone - QUBIT.handOut),
  ev("blend", QUBIT.blend, "teal light mixes into the gold coin", 0.1),
  ev("sweep-heads", QUBIT.heads, "gold light sweeps the room (heads)", -0.3),
  ev("sweep-tails", QUBIT.tails, "teal light sweeps the room (tails)", 0.3),
  ev("ease-out", QUBIT.same, "camera eases out around the spinning coins", 0.1, 1.2),
  ev("ripple", QUBIT.superposition, "superposition ripples spread across the desk, a teal sphere wraps the coin", 0),
  ev("whip-down", QUBIT.whipOut, "camera whips down from the front view to the desk top (into myth)", 0, QUBIT.end - QUBIT.whipOut + 0.4),
];
