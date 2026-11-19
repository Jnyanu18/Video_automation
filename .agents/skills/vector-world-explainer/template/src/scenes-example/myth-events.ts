// Sound events for this act (pure module: no React). The scene draws from the same constants.
import { ACTS, B, ev, f, type SoundEvent } from "../beats";

export const MYTH = {
  start: ACTS.myth[0], // lands from the whip-tilt, still moving down; settles
  settle: ACTS.myth[0] + 0.4,
  flood: B.checks - 0.13, // mouse clones start pouring out of the entrance
  no: B.no, // everything freezes, coral tint, a jolt; a big NO. stamps on centre
  noOut: B.no + 0.55, // the NO. stamp lifts away (Madhav pops in for the next sentence)
  floodEnd: B.no + 0.33, // (the flood would have finished here; it is frozen on "No")
  press: B.look1 - 0.2, // the lamp's switch is pressed (anticipation)
  look: B.look1, // the desk lamp clicks on: warm pool, ghosts vanish
  drop: B.look1 + 0.07, // the coin stops flipping and falls
  land: B.lands + 0.1, // the coin lands in one dead end
  push: B.lands - 0.55, // camera pushes in close on the dead end
  x: B.random + 0.3, // red X stamps
  end: ACTS.myth[1],
};
export const fz = (fr: number) => Math.min(fr, f(MYTH.no)); // frozen clock for the clones

export const EVENTS: SoundEvent[] = [
  ev("whip-land", MYTH.start, "whip-tilt lands on the desk top, camera settles over the maze", 0, MYTH.settle - MYTH.start),
  ev("coin-flip", MYTH.start, "the coin hangs over the maze, flipping (superposition)", 0, MYTH.drop - MYTH.start),
  ev("clones", MYTH.flood, "mouse clones scurry out of the entrance and flood every corridor", -0.4, MYTH.no - MYTH.flood),
  ev("no", MYTH.no, "everything freezes mid-stride, coral tint, small jolt; a big coral NO. stamps on centre", 0),
  ev("lamp-press", MYTH.press, "the desk lamp's switch is pressed down (anticipation)", 0.6),
  ev("lamp-on-1", MYTH.look, "desk lamp clicks on: warm pool of light over the maze", 0.6),
  ev("ghosts-vanish", MYTH.look + 0.05, "the clone ghosts blink out in the light", 0, 0.4),
  ev("coin-fall", MYTH.drop, "the coin stops flipping and falls", 0.1, MYTH.land - MYTH.drop),
  ev("land", MYTH.land, "coin lands flat in one random dead end (tails)", 0.2),
  ev("push-in", MYTH.push, "camera eases in close on the dead end", 0.2, 22 / 30),
  ev("red-x", MYTH.x, "red X stamps over the dead end", 0.2),
];
