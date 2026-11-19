// Sound events for this act (pure module: no React). The scene draws from the same constants.
import { ACTS, B, cue, ev, type SoundEvent } from "../beats";

export const SCALE = {
  start: ACTS.scale[0], // lands from the whip-tilt up; the bit coins stand up as qubits
  standUp: ACTS.scale[0] + 0.07,
  link: B.link, // teal threads join the coins one by one
  asOne: B.asOne, // their spins snap into one
  hop: cue("as one") - 0.13, // they hop together ...
  hopLand: cue("as one") + 0.27, // ... and land together on "one"
  fifty: B.fifty, // the chain grows to 50, coiling toward the window; counter "50 QUBITS"
  quadrillion: B.quadrillion, // 2^50 rolls up digit by digit
  rollEnd: B.quadrillion + 0.67,
  stream: cue("combinations") + 0.16, // the coil streams up into the window, camera pushes in
  threeHundred: B.threeHundred, // through the porthole into space
  space: B.threeHundred + 0.27,
  more: cue("More than"), // the galaxy flares
  atoms: B.atoms, // a haze of atoms doubles and doubles
  universe: cue("universe"), // camera eases out: the whole sky full
  dive: ACTS.scale[1] - 0.6, // dive back down: the porthole closes in around us (into uses)
  end: ACTS.scale[1],
};

export const EVENTS: SoundEvent[] = [
  ev("whip-land-up", SCALE.start, "whip-tilt up lands on the front view of the desk", 0, 0.35),
  ev("stand-up", SCALE.standUp, "five bit coins pop up onto their edges, one after another", 0, 0.5),
  ev("link", SCALE.link, "teal threads join the coins one by one", 0, 0.6),
  ev("as-one", SCALE.asOne, "their spins snap into step", 0),
  ev("hop", SCALE.hop, "the linked coins squash and hop together (~60 px)", 0),
  ev("hop-land", SCALE.hopLand, "they land together with a squash; a teal pulse runs along the threads", 0),
  ev("count-50", SCALE.fifty, "the chain grows to 50 coins coiling toward the window; 50 QUBITS", 0, 1.0),
  ev("quadrillion", SCALE.quadrillion, "1,125,899,906,842,624 rolls up digit by digit", 0, SCALE.rollEnd - SCALE.quadrillion),
  ev("stream", SCALE.stream, "the coil streams up into the window, camera pushes in", 0, SCALE.threeHundred - SCALE.stream),
  ev("out-window", SCALE.threeHundred, "flight through the porthole into space; 300 QUBITS", 0, 0.6),
  ev("galaxy", SCALE.more, "the spiral galaxy flares as the chain streams in; 2^300 > 10^80 atoms writes in under 300 QUBITS", 0),
  ev("atoms", SCALE.atoms, "a haze of atoms appears and doubles again and again", 0, 0.9),
  ev("universe", SCALE.universe, "camera eases back: space full of atoms", 0, 0.6),
  ev("dive-window", SCALE.dive, "dive back down: the porthole closes in around us", 0, SCALE.end - SCALE.dive),
];
