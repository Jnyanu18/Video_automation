// Every Paper Lab timing comes from the words (cue) or the shared beat table (B). Seconds, output time.
import { B } from "../beats";
import { WORDS, cue } from "../lib";

export { B };
export const HOOK_WORDS = WORDS.slice(0, 7); // What if intelligence | is just good compression?

export const T = {
  // hook / think
  think: cue("Think about it"),
  // internet
  zetta: cue("zettabyte", 0), info: cue("of information"), online: cue("online data"), raw: cue("raw data everywhere"),
  spread: cue("spread across"), internet: cue("internet"),
  // slice
  used: cue("We used all"), compressed: cue("compressed it"), llm: cue("LLM"), model: cue("LLM model") + 0.28,
  // network
  trained: cue("trained"), neural: cue("neural network on"), pattern: cue("pattern recognize"), recognize: cue("recognize"), theInfo: cue("the information", 0),
  // rules
  figure: cue("figure out"), smallest: cue("smallest"), rules: cue("rules you"), express: cue("express"),
  // sizes
  so: cue("So one zettabyte"), zetta2: cue("zettabyte", 1), was: cue("was converted"), two: cue("two terabytes"), tb: cue("terabytes"), weights: cue("weights"),
  // beautiful
  beautiful: cue("You just compress"), compress1: cue("just compress something"), small1: cue("so small", 0), came: cue("came out of it"),
  // maybe
  maybe: cue("Maybe intelligence"), questions1: cue("questions", 0), history: cue("human history"),
  // books
  learn: cue("When we learn"), ten: cue("10 different books"), page: cue("take a page"), turn: cue("turn it"), turning: cue("keep on turning"),
  mug: cue("mug up"), build1: cue("try to build"), patterns: cue("patterns out"),
  // algebra
  ifx: cue("If X plus Y"), x1: cue("X plus"), plusY: cue("Y is equal"), z1: cue("equal to Z") + 0.26, xg: cue("X and Z"), zg: cue("Z is given"),
  given: cue("given"), find: cue("find the value"), valY: cue("value of Y") + 0.36,
  // practice
  doIt: cue("You do it"), findIt: cue("find it in"), brain: cue("in your brain"), practiced: cue("practiced"), readMuch: cue("read so much data"),
  equation: cue("equation would"), moveY: cue("move the Y"), otherSide: cue("other side"), zLeft: cue("Z on the left"), leftSide: cue("left side"),
  works: cue("just works"),
  // nn
  howBeautiful: cue("That's how beautiful"), recog: cue("pattern recognition"), thatsHow: cue("that's how neural"), nnWorks: cue("neural network works"),
  // recall
  gandhi: cue("Gandhiji's"), there1: cue("it would be there", 0), distance: cue("distance"), moon: cue("sun and moon"), there2: cue("it would be there", 1),
  twoTB: cue("two terabyte"), capital: cue("capital of China"), china: cue("China"), there3: cue("it would be there", 2), everything: cue("everything"),
  // amazing / question
  amazing: cue("amazing"), pops: cue("pops out"), question: cue("question to you"), smallSet: cue("small set of rules"), soSmall: cue("so small that"),
  reality1: cue("reality itself", 0),
  // cosmos
  holy: cue("holy grail"), agi1: cue("AGI", 0), something: cue("Something so small which"), everyRule: cue("every rule"), regulation: cue("every regulation"),
  everyInfo: cue("every information"), universe: cue("universe"), needFind: cue("what we need to find"), findEnd: cue("need to find") + 0.26,
  // path
  path: cue("path"), thinkAbout: cue("think about", 1), ai: cue("AI would"), build2: cue("build that"), smallComp: cue("small compressed"),
  params: cue("parameters"), reality2: cue("reality itself", 1),
  // agi / cta
  agi2: cue("AGI", 1), right: cue("right", 0), random: cue("random thought"), curiosity: cue("curiosity"), cs: cue("computer science"),
  follow: cue("keep following the"), beauty: cue("beauty of science"), inspiring: cue("inspiring"), people: cue("more and more people"), stem: cue("STEM"),
  scientists: cue("need more scientists"), engineers: cue("engineers"), questions2: cue("questions", 1), excited: cue("excited"), luck: cue("best of luck"),
};

// Presenter hand-off moments (presenter.tsx: transitions run boundary-0.25 .. boundary+0.4; tile flight 1.1 s after)
export const HAND = {
  inStart: B.internet.s - 0.25, inTile: B.internet.s + 0.4, inGone: B.internet.s + 1.5,      // tile at (540,760)
  outStart: B.beautiful.s - 0.25 - 1.0, outTile: B.beautiful.s - 0.25, outFull: B.beautiful.s + 0.4, // emerges at (740,1060)
  cosStart: B.cosmos.s - 0.25, cosTile: B.cosmos.s + 0.4, cosGone: B.cosmos.s + 1.5,         // (540,820)
  endStart: B.end.s - 0.25, endTile: B.end.s + 0.4, endGone: B.end.s + 1.5,                   // (540,900)
};
