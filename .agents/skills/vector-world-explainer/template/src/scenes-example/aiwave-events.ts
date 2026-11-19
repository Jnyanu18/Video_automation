// Sound events for this act (pure module: no React). The scene draws from the same constants.
import { ACTS, B, ev, type SoundEvent } from "../beats";

// AI wave: out of the chip's glowing die into the night study (the chip on the desk turns to us),
// through the porthole onto a night sea where a great wave rises carrying AI (a chat reply streaming,
// an image resolving, a robot arm) with the quantum chip cresting it as the next one; a match cut on
// the chip to a lab bench where coral errors flicker on its qubits; an AI network sends pulses that
// turn them gold one by one (AI-decoded error correction); a whip-pan to dawn at sea where a student
// with a laptop surfs the rising wave and tosses the gold coin up toward camera (into the CTA).
export const AW = {
  start: ACTS.aiwave[0],
  pull1: ACTS.aiwave[0] + 1.05, // pull-back out of the die done: the study, chip on the desk
  turn0: B.heresWhy + 0.25, // the chip tilts up to face us
  turn1: B.heresWhy + 1.0,
  push0: B.quantumComputing - 0.36, // camera pushes into the porthole (the sea is in it)
  seaCut: B.quantumComputing + 0.24, // through the porthole: the night sea fills the frame
  rise0: B.quantumComputing + 0.1, // the great wave starts to rise
  rise1: B.quantumComputing + 0.85,
  chat: B.quantumComputing + 0.36, // a chat window rides up the face, its reply streaming
  image: B.quantumComputing + 0.6, // an image generator window, the picture resolving tile by tile
  robot: B.quantumComputing + 0.84, // a robot arm tile
  crest: B.aiWave, // "next AI wave": the quantum chip surges up onto the crest, gold flare
  curl: B.aiWave + 0.62, // "wave": the lip curls over, spray bursts
  chipPush: B.tryingBreak - 0.36, // camera dives onto the chip on the crest
  benchCut: B.tryingBreak - 0.02, // match cut on the chip: the lab bench
  err0: B.tryingBreak + 0.3, // coral errors start to flicker on qubits
  errMore: B.breakthroughThere, // "breakthrough": more errors burst, the chip's light goes coral
  net: B.aiEnabling, // "AI": the neural-net glyph pops in above the chip
  pulse0: B.aiEnabling + 0.3, // pulses run from the net into the chip...
  fix0: B.aiEnabling + 0.55, // ...and the errors turn gold one by one
  fix1: B.aiEnabling + 1.75,
  tag: B.aiEnabling + 0.7, // "e.g. AI-decoded error correction" writes on
  whip0: B.soQC - 0.32, // whip-pan out of the lab...
  seaCut2: B.soQC - 0.14, // ...into dawn at sea
  whip1: B.soQC + 0.06,
  rise2: B.soQC + 0.1, // the wave rises with the student surfing its crest
  surge: B.nextThing, // "next thing": the wave surges higher, lifting him
  look: B.nextThing + 1.12, // "you guys": he looks round at us
  toss: B.learn, // "learn": he tosses the gold coin up toward camera
  end: ACTS.aiwave[1],
};

// the errors and the order they are corrected in (QUBITS indices of the Willow-style chip)
export const ERRS = [22, 61, 39, 84, 13, 70, 47, 92];

export const EVENTS: SoundEvent[] = [
  ev("die-pullback", AW.start, "camera pulls back out of the chip's glowing gold die into the night study", 0, AW.pull1 - AW.start),
  ev("chip-turn", AW.turn0, "the chip on the desk tilts up to face us, its qubits twinkling", -0.2, AW.turn1 - AW.turn0),
  ev("porthole-push", AW.push0, "camera pushes into the porthole: a night sea inside", 0, AW.seaCut - AW.push0),
  ev("sea-open", AW.seaCut, "through the window: open night sea, moon, a distant mountain", 0),
  ev("wave-rise", AW.rise0, "a great wave rises out of the sea (deep roar building)", -0.2, AW.rise1 - AW.rise0),
  ev("tile-chat", AW.chat, "a chat window pops onto the wave's face, a reply streaming in", 0.3),
  ev("tile-image", AW.image, "an image generator window lands on the wave, picture resolving tile by tile", 0.4),
  ev("tile-robot", AW.robot, "a robot arm tile lands on the wave, arm swinging", 0.5),
  ev("chip-crest", AW.crest, "the quantum chip surges up onto the crest: gold flare", -0.1),
  ev("wave-curl", AW.curl, "the lip curls over, spray bursts off the crest", 0.1, 0.5),
  ev("chip-dive", AW.chipPush, "camera dives onto the chip on the crest", -0.1, AW.benchCut - AW.chipPush),
  ev("bench-cut", AW.benchCut, "match cut on the chip: a lab bench, camera pulling back", 0),
  ev("errors", AW.err0, "coral error flickers start on several qubits (glitchy ticks)", 0, 0.8),
  ev("errors-burst", AW.errMore, "more errors burst, the chip's light goes coral", 0),
  ev("net-in", AW.net, "a neural-network glyph pops in above the chip", -0.5),
  ev("net-pulses", AW.pulse0, "light pulses run from the network down into the chip", -0.3, AW.fix1 - AW.pulse0),
  ...ERRS.map((_, i) => ev(`fix-${i + 1}`, AW.fix0 + ((AW.fix1 - AW.fix0) * i) / (ERRS.length - 1), `error ${i + 1} of ${ERRS.length} corrected: coral qubit turns gold (bright tick)`, -0.1 + i * 0.03)),
  ev("tag", AW.tag, "small tag writes on: e.g. AI-decoded error correction", -0.4),
  ev("whip-pan", AW.whip0, "whip-pan out of the lab into dawn at sea", 0.5, AW.whip1 - AW.whip0),
  ev("wave-rise-2", AW.rise2, "the wave rises with a student surfing its crest, laptop in hand", -0.2, 0.8),
  ev("wave-surge", AW.surge, "the wave surges higher, lifting the student (whoosh)", -0.2),
  ev("student-look", AW.look, "the student looks round at us", -0.3),
  ev("coin-toss", AW.toss, "he tosses the gold coin up toward camera, camera rising with it", -0.2, AW.end - AW.toss),
];

// The gold coin the student tosses: where it is on screen on the act's last frame (the CTA's coin
// starts exactly there and drops onto the study table), and its turn angle over time (shared so the
// spin carries across the cut). It lands on "And that's why".
export const COIN_HANDOFF = { x: 400, y: 330, R: 200 };
export const COIN_LAND = B.thatsWhy + 0.3;
export const tossTh = (t: number) => {
  const u = Math.max(0, Math.min(1, (t - AW.toss) / (COIN_LAND - AW.toss)));
  return 0.3 + 6 * Math.PI * (1 - (1 - u) ** 2.2);
};
