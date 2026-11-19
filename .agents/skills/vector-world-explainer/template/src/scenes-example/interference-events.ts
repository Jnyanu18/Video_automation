// Sound events for this act (pure module: no React). The scene draws from the same constants.
import { ACTS, B, cue, ev, type SoundEvent } from "../beats";

export const INTF = {
  start: ACTS.interference[0], // close on the dead end (matched from myth)
  xOff: ACTS.interference[0] + 0.03, // the red X peels off (gone before the coin moves)
  back: ACTS.interference[0] + 0.2, // the coin hops out of the dead end and arcs over the walls (in the air) to the entrance
  backEnd: B.interference - 0.05, // ...and lands on the entrance just before "interference"
  press: B.interference - 0.2,
  lampOff: B.interference, // the lamp clicks off: the maze in the dark
  glow: B.interference, // the coin at the entrance flares teal: a big ring sweeps the board, teal light fills it
  source: cue("Every possible"), // the source swells, rings pulse out
  waves: B.wave - 0.2, // teal waves pour into every corridor
  wavesEnd: B.wave - 0.2 + 1.67,
  cancel: B.cancel, // wrong branches: crests meet troughs, flatten, go dark
  right: B.rightOne, // camera pulls out to the solution path
  stack: B.stack, // waves along the path grow tall and gold; the exit blazes
  press2: B.look2 - 0.2,
  look: B.look2, // the lamp clicks on again
  lift: B.look2 + 0.2, // the coin lifts off the entrance, flipping, and flies to the exit
  drop: B.rightAnswer - 0.37,
  land: B.rightAnswer + 0.05, // lands on the exit, heads up
  whipOut: ACTS.interference[1] - 0.45, // camera pushes into the exit's gold landing glow (into the pool)
  end: ACTS.interference[1],
};

export const EVENTS: SoundEvent[] = [
  ev("x-peel", INTF.xOff, "the red X peels off the dead end", 0.2),
  ev("coin-return", INTF.back, "the coin hops out of the dead end and arcs through the air back to the entrance", -0.2, INTF.backEnd - INTF.back),
  ev("coin-land-start", INTF.backEnd, "the coin lands on the entrance (soft clink)", -0.5),
  ev("lamp-press", INTF.press, "lamp switch pressed (anticipation)", 0.7),
  ev("lamp-off", INTF.lampOff, "the desk lamp clicks off: the maze goes dark", 0.7),
  ev("source-glow", INTF.glow, "the coin at the entrance flares teal, a big ring sweeps across the board", -0.5),
  ev("source", INTF.source, "the teal source swells, rings pulse out from the entrance", -0.5),
  ev("waves-in", INTF.waves, "teal waves pour from the entrance into every corridor", -0.3, INTF.wavesEnd - INTF.waves),
  ev("cancel", INTF.cancel, "crests meet troughs in the wrong branches: they flatten and go dark", 0, 1.3),
  ev("path-pull", INTF.right, "camera pulls out to the solution path", 0, 0.5),
  ev("stack", INTF.stack, "waves along the right path stack tall and gold, the exit blazes", 0.4, 1.0),
  ev("lamp-press-2", INTF.press2, "lamp switch pressed again (anticipation)", 0.7),
  ev("lamp-on-2", INTF.look, "the desk lamp clicks back on", 0.7),
  ev("coin-lift-2", INTF.lift, "the coin lifts off the entrance, flipping, and flies toward the exit", 0, INTF.drop - INTF.lift),
  ev("coin-fall-2", INTF.drop, "the coin falls toward the exit", 0.4, INTF.land - INTF.drop),
  ev("look-right", INTF.land, "coin lands on the exit, heads up, gold burst", 0.4),
  ev("push-glow", INTF.whipOut, "camera pushes into the gold landing glow at the exit (into the pool ripples)", 0.3, INTF.end - INTF.whipOut + 0.2),
];
