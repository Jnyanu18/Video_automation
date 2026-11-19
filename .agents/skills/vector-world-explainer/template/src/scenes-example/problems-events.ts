// Sound events for this act (pure module: no React). The scene draws from the same constants.
import { ACTS, B, cue, ev, type SoundEvent } from "../beats";

// Problems (85.94-92.66): a gallery of genuinely hard search problems around the study (drug
// molecule + protein pocket, delivery routes on a city map, a battery and its crystal lattice, a
// combination padlock). "very hard": the routes multiply into a tangle, the lattice jumbles, the
// lock's wheels spin. "find the solution": a gold best route flickers and breaks. "that's where
// quantum computers will come in": the gold dilution-refrigerator chandelier lowers into the study,
// its chip lights, teal threads reach every problem and each one resolves.
export const P = {
  start: ACTS.problems[0],
  slots: B.basically + 0.4, // molecule and padlock arrive in their gallery places
  protein: B.basically + 0.15, // a protein with an empty pocket rises under the molecule
  map: B.anyProblem, // a city delivery map unfolds on the wall, pins pop in
  battery: B.anyProblem + 0.3, // a battery pops up on the table, its crystal lattice assembles above
  tags: B.anyProblem + 0.2, // small labels pop in, one per problem
  push: B.veryHard - 0.25, // camera pushes into the map
  tangle0: B.veryHard, // possible routes multiply into a tangle
  tangle1: B.solution - 0.1,
  flick1: B.solution, // a gold best route starts drawing, flickers and breaks
  flick2: B.solution + 0.36, // a second try gets further, breaks again
  pull: B.thatsWhere - 0.12, // camera pulls back and tilts up
  lower0: B.thatsWhere, // the chandelier lowers into the study from above
  land: B.thatsWhere + 0.85, // ...and lands (overshoot, sway)
  chipOn: cue("where quantum") + 0.2, // its chip lights up ("quantum")
  threads: B.comeIn, // teal threads reach out to each problem (stagger 0.1 s)
  solve: B.comeIn + 0.26, // each one resolves (stagger 0.15 s)
  frost: B.thatsWhere + 0.8, // frost creeps over the window and plates, cold vapour
  exit: ACTS.problems[1] - 0.58, // threads retract and the gallery starts to leave (continues into ending)
  end: ACTS.problems[1],
};
// thread / solve order: map (routes), lattice (batteries), molecule (medicines), lock (codes)
export const ORDER = ["map", "bat", "mol", "lock"] as const;
export type SlotName = (typeof ORDER)[number];
export const threadAt = (n: SlotName) => P.threads + ORDER.indexOf(n) * 0.1;
export const solveAt = (n: SlotName) => P.solve + ORDER.indexOf(n) * 0.15;

export const EVENTS: SoundEvent[] = [
  ev("protein-rise", P.protein, "a lilac protein with an empty pocket rises under the molecule", -0.7),
  ev("slots", P.slots, "molecule and padlock settle into their gallery places", 0),
  ev("map-unfold", P.map, "a city delivery map unfolds on the wall, depot and pins pop in", 0.6),
  ev("tags", P.tags, "small labels tick in: medicines, routes, batteries, codes", 0, 0.5),
  ev("battery-pop", P.battery, "a battery pops up on the table, a crystal lattice clicks together above it", -0.6),
  ev("push-map", P.push, "camera pushes into the city map", 0.6, 0.55),
  ev("routes-multiply", P.tangle0, "possible delivery routes multiply, doubling into a coral tangle", 0.5, P.tangle1 - P.tangle0),
  ev("lattice-jumble", P.tangle0 + 0.1, "the lattice atoms jumble, the lock's wheels spin", -0.5, 0.9),
  ev("gold-try-1", P.flick1, "a gold route starts drawing ... flickers and breaks", 0.5),
  ev("gold-try-2", P.flick2, "a second gold try gets further, breaks again", 0.5),
  ev("pull-up", P.pull, "camera pulls back and tilts up to the ceiling", 0, 0.9),
  ev("chandelier-lower", P.lower0, "the gold dilution-refrigerator chandelier lowers into the study", 0, P.land - P.lower0),
  ev("chip-on", P.chipOn, "its chip flickers on, the hottest light in the room", 0),
  ev("chandelier-land", P.land, "chandelier stops with a heavy overshoot and sway (metal creak)", 0),
  ev("frost", P.frost, "frost creeps over the window and the plates, cold vapour spills", 0, 1.4),
  ev("thread-map", threadAt("map"), "teal thread reaches from the chip to the map", 0.6),
  ev("thread-bat", threadAt("bat"), "teal thread reaches to the battery lattice", -0.6),
  ev("thread-mol", threadAt("mol"), "teal thread reaches to the molecule", -0.6),
  ev("thread-lock", threadAt("lock"), "teal thread reaches to the padlock", 0.5),
  ev("solve-map", solveAt("map"), "tangle clears, the gold best route draws, a van sets off", 0.6, 0.6),
  ev("solve-bat", solveAt("bat"), "the lattice snaps into order, the battery fills gold", -0.6),
  ev("solve-mol", solveAt("mol"), "the molecule turns and docks into the protein pocket", -0.6),
  ev("solve-lock", solveAt("lock"), "the lock's wheels stop, the shackle springs open", 0.5),
  ev("gallery-exit", P.exit, "threads retract into the chip, the gallery starts to slide away", 0, 0.6),
];
