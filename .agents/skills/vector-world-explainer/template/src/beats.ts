// Pure timing module (no React / remotion imports) so the sound mixer can bundle it with esbuild.
// Every time in the film comes from a cue() on the aligned VO words; re-align and the film re-times.
// VO = public/vo.wav = spine/vo-spine.wav: his voice-over recording + his on-camera DJI takes in the
// face windows (spine/splice-map.json); words from align.py + fix_words.py (faster-whisper medium.en, cpu).
// The generic part is FPS / Word / cue / cueEnd / f / ev; ACTS and B below are the quantum film's
// (worked example): rewrite them per film, always via cue("phrase") on HIS words.
import words from "./words.json";

export const FPS = 30;
export type Word = { w: string; s: number; e: number };
export const WORDS = words as Word[];
export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");

export const cue = (phrase: string, nth?: number): number => {
  const p = phrase.split(/\s+/).map(norm), hits: number[] = [];
  for (let i = 0; i + p.length <= WORDS.length; i++) {
    if (p.every((x, j) => norm(WORDS[i + j].w) === x)) hits.push(WORDS[i].s);
  }
  if (nth === undefined && hits.length > 1) throw new Error(`cue "${phrase}" is said ${hits.length} times; pass nth`);
  const s = hits[nth ?? 0];
  if (s === undefined) throw new Error(`cue not found: ${phrase}`);
  return s;
};
export const cueEnd = (phrase: string, nth?: number): number => {
  const i = WORDS.findIndex((w) => w.s === cue(phrase, nth));
  return WORDS[i + phrase.split(/\s+/).length - 1].e;
};
export const f = (sec: number) => Math.round(sec * FPS);
export const VO_END = WORDS[WORDS.length - 1].e;
export const VO_FILE_END = 100.485; // PER FILM: public/vo.wav length in s (splice-map.json "duration")
export const TOTAL = f(VO_END + 1.45);

// ---- Acts: [start, end) seconds. Cut ~0.08s before each act's first word ("Now," included).
const pre = (s: number) => s - 0.08;
export const ACTS = {
  hook: [0, pre(cue("Now your laptop"))],
  bits: [pre(cue("Now your laptop")), pre(cue("Now a qubit"))],
  qubit: [pre(cue("Now a qubit")), pre(cue("So does it try"))],
  myth: [pre(cue("So does it try")), pre(cue("The real trick"))],
  interference: [pre(cue("The real trick")), pre(cue("Now imagine"))],
  pool: [pre(cue("Now imagine")), pre(cue("Now link"))],
  scale: [pre(cue("Now link")), pre(cue("It won't"))],
  uses: [pre(cue("It won't")), pre(cue("Basically"))],
  problems: [pre(cue("Basically")), pre(cue("So a quantum computer"))],
  ending: [pre(cue("So a quantum computer")), pre(cue("And here's why"))],
  aiwave: [pre(cue("And here's why")), pre(cue("And if you want"))],
  cta: [pre(cue("And if you want")), TOTAL / FPS],
} as const;
export type ActName = keyof typeof ACTS;

// ---- Beat moments (seconds), named for what visibly happens. Scenes and the mixer share these.
export const B = {
  // hook
  google: cue("Google"),
  chip: cue("chip"),
  five: cue("5 minutes"),
  done: cueEnd("5 minutes"),
  supercomputer: cue("supercomputer"),
  septillion: cue("10 septillion"),
  years: cue("years"),
  ages: cueEnd("septillion years"),
  what: cue("what is it"),
  called: cue("It's a quantum"), // v6: "It's a quantum computer"
  quantumComputer: cue("quantum computer", 0),
  sixty: cue("2 minutes"), // v6: he now says "in the next 2 minutes"
  understand: cue("understand it"),
  // bits
  laptop: cue("your laptop"),
  xray: cue("billions"),
  switches: cue("tiny switches"),
  bitsWord: cue("bits"),
  zero: cue("zero"),
  one: cue("or a one"),
  coinFlat: cue("coin lying flat"),
  heads: cue("heads", 0),
  tails: cue("tails", 0),
  // qubit
  qubit: cue("a qubit"),
  spin: cue("still spinning", 0),
  doIt: cue("you do the operation"),
  operation: cue("operation"),
  stillSpin2: cue("still spinning", 1),
  blend: cue("blend"),
  heads2: cue("heads", 1),
  tails2: cue("tails", 1),
  sameTime: cue("same time"),
  superposition: cue("superposition"),
  // myth
  checks: cue("try every answer"),
  no: cue("no"),
  look1: cue("look", 0),
  lands: cue("lands"),
  random: cue("random answer"),
  // interference
  interference: cue("interference"),
  everyPossible: cue("Every possible"),
  wave: cue("like a wave"),
  cancel: cue("cancels"),
  rightOne: cue("the right one"),
  stack: cue("stacks up"),
  look2: cue("look", 1),
  rightAnswer: cue("right answer"),
  // pool
  imagine: cue("Imagine"),
  friend: cue("friends"),
  pool: cue("pool"),
  splash: cue("splashing"),
  waving: cue("waving"),
  twoWaves: cue("two waves"),
  sameLength: cue("same length"),
  sameWidth: cue("same width"),
  combined: cue("combine"),
  bigger1: cue("bigger wave", 0),
  rightAnswers: cue("right answers", 0),
  bigger2: cue("bigger wave", 1),
  probability: cue("probability"),
  goesUp: cue("goes up"),
  // scale
  link: cue("link qubits"),
  asOne: cue("move as one"),
  fifty: cue("50 qubits"),
  quadrillion: cue("quadrillion"),
  threeHundred: cue("300"),
  atoms: cue("atom"),
  universe: cue("universe"),
  // uses
  instagram: cue("Instagram"),
  built: cue("It's built"),
  designing: cue("designing"),
  medicines: cue("medicine"),
  codes: cue("cracking codes"),
  // problems
  basically: cue("Basically"),
  anyProblem: cue("any problem"),
  veryHard: cue("very hard"),
  solution: cue("solution"),
  thatsWhere: cue("that's where"),
  comeIn: cue("come in"),
  // ending
  soA: cue("So a quantum computer"),
  isnt: cue("isn't"),
  fasterLaptop: cue("faster laptop"),
  wholeNew: cue("whole new kind"),
  // ai wave
  heresWhy: cue("here's why"),
  quantumComputing: cue("Quantum computing", 0),
  aiWave: cue("next AI wave"),
  tryingBreak: cue("We're trying"),
  breakthroughThere: cue("breakthrough here"),
  aiEnabling: cue("AI is helping"),
  soQC: cue("So quantum computing"),
  nextThing: cue("next thing"),
  learn: cue("have to learn"),
  // cta
  thatsWhy: cue("And if you want"),
  keepLearning: cue("keep learning"),
  nextBig: cue("next big breakthrough"),
  hit: cue("hit follow"),
  follow: cue("follow"),
};

// A visible event worth hearing. fr = absolute frame it visibly happens; x = -1..1 screen position.
export type SoundEvent = { id: string; fr: number; dur?: number; what: string; x?: number };
export const ev = (id: string, sec: number, what: string, x = 0, dur?: number): SoundEvent => ({ id, fr: f(sec), what, x, dur: dur === undefined ? undefined : f(dur) });
