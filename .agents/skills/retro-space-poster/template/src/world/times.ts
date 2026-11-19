// Every animation time in the clip (v5 spine: his re-recorded take), from his words; shared by world + events.
import { OUTRO, cue } from "../lib";
import { B } from "../beats";

export const T = {
  // hook
  hell: cue("Hell"),
  launch: cue("ride") - 0.1,
  // q (he reads the question)
  q: B.q.s,
  boosterBack: B.q.s + 0.15,
  snap1: cue("SpaceX trying") + 0.75,
  // plane
  imagine: cue("imagine a rocket"),
  reuse: cue("reuse"),
  plane: cue("plane", 0),
  throwAway: cue("throw the plane"),
  destination: cue("reach your"),
  best: cue("isn't that the best"),
  // car
  carOut: cue("take your car"),
  store: cue("grocery store"),
  dontLeave: cue("don't leave"),
  back: cue("bring it back"),
  tomorrow: cue("back tomorrow"),
  // buy
  buy: cue("Imagine you have"),
  everyTime: cue("every time you go"),
  noSense: cue("doesn't make sense"),
  // goal
  goal: B.goal.s,
  building: cue("building the best"),
  // delhi
  ifThey: cue("If they can"),
  seattle: cue("Seattle to New"),
  mexico: cue("Mexico"),
  hour: cue("less than an hour"),
  // ten
  ten: cue("10 years"),
  everything: cue("everything will"),
  say: cue("That's what I"),
  outro: OUTRO.t,
  ends: B.end.s,
};
