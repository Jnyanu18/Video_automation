// Every time the Cosmos world uses, from the words (pure module: no React / three imports).
// world, sets and events.ts all read these, so picture and sound share one clock.
import { B } from "../beats";
import { cue, WORDS } from "../lib";

const w = (i: number) => WORDS[i].s;
export const HOOK = {
  what: w(0), ifw: w(1), intel: w(2), is: w(3), just: w(4), good: w(5), comp: w(6),
};
export const T = {
  // think / internet / slice
  think: cue("Think about it"),
  zetta: cue("zettabyte of information"),
  online: cue("online data"),
  raw: cue("just raw data"),
  spread: cue("spread across"),
  internet: cue("internet"),
  used: cue("We used all"),
  thatData: cue("of that data"),
  compressed: cue("compressed it"),
  intoLLM: cue("into an LLM"),
  llm: cue("LLM model"),
  // network / rules
  trained: cue("We trained"),
  neural: cue("neural network on"),
  pattern: cue("pattern recognize"),
  info1: cue("recognize the information") + 0.4,
  figure: cue("figure out"),
  smallest: cue("smallest set"),
  rules: cue("set of rules", 0) + 0.34,
  express: cue("to express"),
  // sizes
  soOne: cue("So one zettabyte"),
  converted: cue("was converted"),
  twoTB: cue("two terabytes"),
  terabytes: cue("terabytes"),
  weights: cue("weights of"),
  // beautiful / maybe
  beautiful: cue("That's beautiful") + 0.5,
  soSmall: cue("so small", 0),
  intelCame: cue("intelligence came"),
  maybe1: cue("Maybe intelligence is"),
  questions1: cue("a lot of questions"),
  // books
  learn: cue("When we learn"),
  books: cue("different books"),
  takePage: cue("take a page"),
  turn: cue("you turn it"),
  turning: cue("keep on turning"),
  mug: cue("mug up"),
  build1: cue("try to build"),
  patterns: cue("patterns out"),
  // algebra / practice / nn
  ifX: cue("If X plus"),
  eqZ: cue("equal to Z"),
  xAndZ: cue("and X and Z") + 0.44,
  given: cue("is given"),
  findY: cue("find the value"),
  doIt: cue("You do it"),
  brain: cue("in your brain"),
  practiced: cue("practiced so much"),
  readMuch: cue("read so much"),
  equation: cue("this equation would"),
  moveY: cue("move the Y"),
  otherSide: cue("on the other side"),
  zLeft: cue("Z on the left"),
  works: cue("it just works") + 0.14,
  howBeaut: cue("That's how beautiful"),
  recog: cue("pattern recognition"),
  nnWorks: cue("neural network works"),
  // recall
  q1: cue("Gandhiji's birthday"),
  a1: cue("it would be there", 0),
  q2: cue("the distance"),
  a2: cue("it would be there", 1),
  twoTB2: cue("those two terabyte"),
  q3: cue("capital of China"),
  china: cue("China"),
  everything: cue("everything"),
  // amazing / question
  amazing: cue("just amazing"),
  pops: cue("pops out"),
  qToYou: cue("question to you"),
  smallSet: cue("a small set of rules"),
  reality1: cue("the reality itself", 0),
  // cosmos / path
  holy: cue("holy grail"),
  agi1: cue("AGI", 0),
  somethingSmall: cue("Something so small", 1),
  every1: cue("every rule"),
  every2: cue("every regulation"),
  every3: cue("every information"),
  universe: cue("universe"),
  maybeFind: cue("Maybe that is"),
  find: cue("need to find"),
  path: cue("a path"),
  ai: cue("AI would"),
  build2: cue("help you build"),
  smallComp: cue("small compressed"),
  params: cue("parameters"),
  reality2: cue("the reality itself", 1),
  // agi / ctas / end
  agi2: cue("Maybe this is AGI"),
  random: cue("random thought"),
  curiosity: cue("curiosity"),
  followingMe: cue("following me"),
  beauty: cue("beauty of science"),
  inspiring: cue("inspiring"),
  morePeople: cue("more and more people"),
  stem: cue("take STEM") + 0.18,
  scientists: cue("more scientists") + 0.28,
  engineers: cue("more engineers") + 0.16,
  questions2: cue("these kinds of questions") + 0.4,
  excited: cue("excited about life"),
  luck: cue("best of luck"),
};

// Hand-off windows (presenter.tsx): the footage tile flies to / from these screen points.
export const HAND = {
  internet: { at: [540, 760] as const, t0: B.internet.s - 0.25, t1: B.internet.s + 0.4 + 1.1 },
  sizes: { at: [740, 1060] as const, t0: B.beautiful.s - 0.25 - 1.0, t1: B.beautiful.s + 0.4 },
  cosmos: { at: [540, 820] as const, t0: B.cosmos.s - 0.25, t1: B.cosmos.s + 0.4 + 1.1 },
  end: { at: [540, 900] as const, t0: B.end.s - 0.25, t1: B.end.s + 0.4 + 1.1 },
};

// The 3D sets of the Back canvas and when they are on screen (Back is shown whenever the presenter
// does not cover the frame; each set starts a little before its beat so transitions never show a gap).
export const TW = 0.4; // half-length of a fly-through between chained sets
export const SET_T = {
  galaxy: [B.internet.s - 0.3, B.network.s - TW],
  network: [B.network.s + TW, B.sizes.s - TW],
  cubes: [B.sizes.s + TW, B.beautiful.s + 0.5],
  books: [B.books.s - 0.32, B.algebra.s - TW],
  board: [B.algebra.s + TW, B.recall.s - TW],
  recall: [B.recall.s + TW, B.amazing.s + 0.5],
  cosmos: [B.cosmos.s - 0.3, B.agi.s + 0.5],
  stem: [B.cta2.s - 0.3, B.cta3.s + 0.5],
  end: [B.end.s - 0.3, 157.64],
} as const;
