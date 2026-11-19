// Every time the world uses, from the v5 words (Madhav reads his own questions, then answers; output seconds).
// No absolute seconds: a re-cut retimes everything.
import { OUTRO, WORDS, cue, cueEnd } from "../lib";

type QW = { q?: boolean };
// end of the question (q words) that starts at `phrase`
const qEnd = (phrase: string) => {
  let j = WORDS.findIndex((w) => w.s === cue(phrase));
  while (j + 1 < WORDS.length && (WORDS[j + 1] as QW).q) j++;
  return WORDS[j].e;
};

export const T = {
  // hook (his own words): "Robots will take these jobs first. Is yours on the list?"
  hook: 0,
  hookEnd: cueEnd("on the list"),
  // Q1 he reads
  askFirst: cue("which job will"),
  askFirstEnd: qEnd("which job will"),
  // answer 1: humanoid robots, supply chain, 24/7
  supply: cue("well humanoid"),
  humanoid: cue("humanoid robot", 0),
  penetration: cue("penetration"),
  everywhere: cue("everywhere"),
  anywhere: cue("anywhere"),
  supplyChain: cue("supply chain"),
  put: cue("you can put"),
  putRobot: cue("humanoid robot", 1),
  voila1: cue("voila", 0),
  system: cue("a system"),
  runs: cue("runs"),
  h247: cue("runs") + 0.25,
  supplyEnd: cueEnd("runs 24") + 0.3,
  // Q2 he reads
  askDecide: cue("but how does"),
  askDecideEnd: qEnd("but how does"),
  // answer 2: depends on the task
  depends: cue("well it depends"),
  dependsW: cue("depends"),
  task: cue("kind of task"),
  // repetitive / pattern-based
  repetitive0: cue("robots can take"),
  repetitive: cue("repetitive"),
  pattern: cue("pattern"),
  // art-based value
  art0: cue("but if you're"),
  artBased: cue("art"),
  imagine: cue("imagine"),
  valueOf: cue("value of a painting"),
  painting: cue("painting"),
  howAI: cue("how would ai"),
  valueFrom: cue("value comes from"),
  // feeling
  feeling0: cue("it's more like"),
  humanFeeling: cue("human feeling"),
  emotions: cue("emotions"),
  // chai: sit, sip, gossip
  chai: cue("a robot can't do"),
  today: cue("today"),
  sit: cue("sit with us"),
  sip: cue("sip"),
  gossip: cue("gossip"),
  voila2: cue("voila", 1),
  wouldLike: cue("would like"),
  valueStill: cue("that value is"),
  withHumans: cue("with the humans"),
  // jeweller + diamond
  jeweller: cue("jewelers who"),
  diamond1: cue("diamond", 0),
  whichDiamond: cue("which diamond"),
  whatPerson: cue("what person"),
  robotCant: cue("a robot can't take"),
  // close
  artistic: cue("the artistic"),
  touch: cue("artistic touch") + 0.2,
  staysHuman: cue("stays with"),
  // comment prompt (his words, not a read question)
  comment: cue("which job do"),
  safeFrom: cue("safe from robots"),
  commentBelow: cue("comment below"),
  outro: OUTRO.t,
  outroEnd: OUTRO.t + OUTRO.dur,
};
