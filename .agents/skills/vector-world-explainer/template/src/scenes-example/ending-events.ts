// Sound events for this act (pure module: no React). The scene draws from the same constants.
import { ACTS, B, cue, cueEnd, ev, type SoundEvent } from "../beats";

// Ending (92.66-96.86): "So a quantum computer isn't a faster laptop." The chandelier glides right
// as the solved gallery slides away and a laptop on books slides in; a coral "faster laptop" ghost
// smashes into a teal ≠. "It's a whole new kind of computer.": the chandelier is the hero: frost
// melts to glitter, gold light runs down its plates, the chip turns to face us and hums teal rings;
// the camera pushes in and dives into the chip's glowing die (aiwave pulls back out of it).
export const E = {
  start: ACTS.ending[0],
  slide0: B.soA, // chandelier slides right and shrinks, camera eases back
  slide1: B.soA + 0.95,
  lap0: B.soA + 0.3, // laptop slides in from the left
  lap1: B.soA + 0.88, // ...and lands on its stack of books
  ghost0: B.isnt - 0.7, // a coral "faster laptop" ghost streaks in, trying to overtake
  neq: B.isnt, // a teal ≠ slams down between them
  smash: B.isnt + 0.07, // the ghost hits the ≠ and shatters
  hum: B.isnt + 0.36, // a teal ripple rings out of the chandelier's chip
  fizzle: B.fasterLaptop + 0.12, // the last coral shards land and the speed lines die
  push0: B.fasterLaptop + 0.85, // camera starts pushing in on the chandelier
  neqOut: B.fasterLaptop + 0.9, // the ≠ pops away
  warm: cue("It's a whole") , // frost melts to glitter, a gold light runs down the plates
  chipTurn: B.wholeNew, // the chip turns to face us, its qubits light in a wave
  hums: [B.wholeNew + 0.16, cue("kind", 0), cue("computing", 0)], // teal rings on "new", "kind", "computer"
  dive: cueEnd("kind of computing") - 0.02, // camera dives into the glowing die once "computer." is said
  end: ACTS.ending[1],
};

export const EVENTS: SoundEvent[] = [
  ev("gallery-away", E.start, "the solved problems slide away off the frame edges", 0, 0.5),
  ev("chandelier-slide", E.slide0, "the gold chandelier glides right and shrinks, camera eases back", 0.3, E.slide1 - E.slide0),
  ev("laptop-in", E.lap0, "a laptop slides in from the left", -0.6, E.lap1 - E.lap0),
  ev("laptop-land", E.lap1, "laptop on its book stack lands on the table (soft thud, small bounce)", -0.5),
  ev("ghost-zoom", E.ghost0, "a coral speed-lined 'faster laptop' ghost streaks in from the left", -0.8, E.smash - E.ghost0),
  ev("neq", E.neq, "a big teal ≠ slams down between laptop and chandelier (heavy thud, shake)", 0),
  ev("ghost-smash", E.smash, "the ghost laptop hits the ≠ and shatters into coral shards", -0.1),
  ev("machine-hum", E.hum, "teal ripple rings out of the chandelier's chip", 0.45, 0.8),
  ev("shards-land", E.fizzle, "coral shards tinkle down and vanish, speed lines die", -0.2),
  ev("push-hero", E.push0, "camera starts pushing in on the chandelier", 0.4, E.dive - E.push0),
  ev("neq-out", E.neqOut, "the ≠ pops away", 0),
  ev("warm", E.warm, "frost melts into glitter, a gold light runs down the plates top to bottom", 0.4, 0.5),
  ev("chip-turn", E.chipTurn, "the chip turns to face camera, its qubits light up in a wave", 0.3, 0.4),
  ev("hum-1", E.hums[0], "teal ring hums out of the chip", 0.2),
  ev("hum-2", E.hums[1], "teal ring hums out of the chip", 0.1),
  ev("hum-3", E.hums[2], "teal ring hums out of the chip (biggest)", 0),
  ev("dive-die", E.dive, "camera dives into the chip's glowing die (whoosh into gold light)", 0, E.end - E.dive),
];
