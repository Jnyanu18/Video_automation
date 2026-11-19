// Hook sound events and the hook's timing constants (the scene imports T from here). v5: real VO.
import { B, ev, type SoundEvent } from "../beats";

export const T = {
  googleIn: B.google - 0.06, // the Google Quantum AI lockup and the chip pulse on "Google built a chip"
  chipPulse: B.chip,
  sweep0: B.five - 0.12, // stopwatch starts on "5"
  done: B.done + 0.02, // completes as "minutes" ends
  power: B.supercomputer, // the supercomputer hall powers on (Madhav drops to the corner at 4.62)
  tag: B.septillion - 0.34, // the race stack shrinks into a tag beside the chip
  lockOff: B.septillion - 0.2, // the Google lockup drops away, making room for the odometer
  counter: B.septillion, // odometer starts slotting digits in
  counterIn: B.septillion + 1.0, // all 26 digits in
  tapeIn: B.years - 0.08, // deep-time tape slides up
  // v6: his take says "...10 septillion years." and goes straight on to "Now what is it?" (0.5 s), so
  // the deep-time beats are spaced from "years" and kept in order (sun < galaxy < times < clear)
  dino: B.years + 0.06, // T-rex crosses the playhead
  sun: B.years + 0.26, // the Sun swells and dies at the playhead
  galaxy: Math.max(B.ages - 0.07, B.years + 0.5), // the universe's age stops at the playhead
  times: Math.max(B.ages - 0.07, B.years + 0.5) + 0.1, // "x 725 trillion" lands
  clear: Math.max(B.ages - 0.07, B.years + 0.5) + 0.32, // counter, tape and race tag fly out (left)
  what: B.what, // "what is it?": every qubit blinks a question ripple, the headline thumps
  qc: B.quantumComputer, // "quantum computer": qubits light gold in a wave from the centre, camera leans in
  sixty: B.sixty, // "60 seconds": the stopwatch re-arms and starts a teal 60-second sweep
  push: B.understand - 0.1, // "understand it": camera accelerates into the die (into bits)
};

export const EVENTS: SoundEvent[] = [
  ev("chip-hum", 0, "Google chip glowing in the supercomputer hall (place tone)", 0.1, T.push + 0.6),
  ev("hall-room", 0, "supercomputer hall ambience: fans and hum", 0, T.push + 0.6),
  ev("google", T.googleIn, "the chip pulses as 'Google' is said", -0.2),
  ev("watch-start", T.sweep0, "stopwatch button pressed, bezel starts sweeping", -0.2),
  ev("watch-ticks", T.sweep0 + 0.05, "stopwatch sweeps round fast", -0.2, T.done - T.sweep0),
  ev("watch-done", T.done, "stopwatch completes: 5 minutes, done tick", 0.3),
  ev("power-on", T.power, "the supercomputer hall powers on far to near", 0, 0.9),
  ev("tag", T.tag, "the race stack shrinks into a tag beside the chip", 0.4, 0.35),
  ev("counter-in", T.counter, "10 septillion years odometer digits slot in", 0, T.counterIn - T.counter),
  ev("counter-roll", T.counterIn, "trailing digits keep rolling", 0, T.clear - T.counterIn),
  ev("tape-in", T.tapeIn, "deep-time tape slides up", 0),
  ev("dino-steps", T.dino - 0.4, "T-rex stomps past the playhead", -0.2, 0.8),
  ev("sun-dies", T.sun - 0.2, "the Sun swells red and collapses to a white dwarf", 0, 0.8),
  ev("galaxy", T.galaxy, "universe-age galaxy lands at the playhead", 0),
  ev("times", T.times, "x 725 trillion lands", 0.3),
  ev("clear", T.clear, "counter, tape and race tag fly out of frame to the left", -0.4),
  ev("question", T.what, "the qubits blink a question ripple; WHAT IS A thumps", 0),
  ev("qc-gold", T.qc, "QUANTUM COMPUTER thumps gold; qubits light gold in a wave", 0.1),
  ev("rearm", T.sixty, "the stopwatch re-arms with a click and a teal sweep starts", -0.2),
  ev("push-laptop", T.push, "camera dives into the chip die (to the laptop screen)", 0, B.laptop - 0.08 - T.push),
];
