// Hand-written caption sense units, checked word for word against src/words.json at load (v6:
// rec55 voice-over + his on-camera takes). "~word" = spoken but not shown (filler only: "Now,", "like", "a").
// `show` replaces the displayed words for a line (fact-check corrections, see NOTES.md); its words
// are highlighted across the spoken span in order. `em` marks displayed words by meaning:
// gold = the coin / the right answer, coral = the myth / wrong, teal = the quantum mechanism,
// big = a number that is the point of the line. `hide` = the line is carried by a big on-screen stamp.
import { chunk, WORDS, type CWord } from "./lib";

export type Em = "gold" | "coral" | "teal" | "big";
type Line = { t: string; em?: Record<string, Em>; show?: string; hide?: boolean };

const LINES: Line[] = [
  // hook (its own composition: condensed, word by word; see CaptionView)
  // v6: his on-camera take 131 (+135 for "And in the next 2 minutes")
  { t: "Google built a chip", em: { Google: "gold", chip: "gold" } },
  { t: "that solved a problem" },
  { t: "in 5 minutes", em: { "5": "big", minutes: "gold" } },
  { t: "that the world's fastest supercomputer" },
  { t: "would have taken 10 septillion years.", em: { "10": "big", septillion: "big" } },
  { t: "~Now what is it?", hide: true }, // the cover headline WHAT IS A QUANTUM COMPUTER? thumps these words
  { t: "It's a quantum computer.", hide: true },
  { t: "And in the next 2 minutes," },
  { t: "you'll actually understand it.", em: { understand: "gold" } },
  // bits
  { t: "~Now, your laptop runs on ~a billions", em: { billions: "gold" } },
  { t: "of tiny switches called bits.", em: { "bits.": "gold" } },
  { t: "Each one is ~like a zero or a one", em: { zero: "gold", one: "gold" } },
  { t: "like a coin lying flat,", em: { coin: "gold" } },
  { t: "heads or tails." },
  // qubit
  { t: "~Now, a qubit is that coin", em: { qubit: "gold" } },
  { t: "still spinning.", em: { "spinning.": "gold" } },
  { t: "It's when you do the operation", em: { operation: "teal" } },
  { t: "when they're still spinning.", em: { still: "gold", "spinning.": "gold" } },
  { t: "It's ~like a blend", em: { blend: "teal" } },
  { t: "of both heads and tails" },
  { t: "at the same time." },
  { t: "~Now, that's called a superposition.", em: { "superposition.": "teal" } },
  // myth
  { t: "So, does it try every answer at once?", em: { "once?": "coral" } },
  { t: "Well, no.", hide: true },
  { t: "The moment you look,", em: { "look,": "gold" } },
  { t: "it lands on just one random answer.", em: { random: "coral" } },
  // interference
  { t: "The real trick is ~the interference.", em: { "interference.": "teal" } },
  { t: "Every possible answer is ~like a wave.", em: { "wave.": "teal" } },
  { t: "The wrong answer cancels each other out", show: "The wrong answers cancel each other out", em: { wrong: "coral", cancel: "coral" } },
  { t: "and the right one stacks up.", em: { right: "gold", stacks: "gold", "up.": "gold" } },
  { t: "So when you look," },
  { t: "you almost always get the right answer.", em: { right: "gold", "answer.": "gold" } },
  // pool
  // v6: on-camera takes 137 / 133 / 135
  { t: "~Now, imagine you and your friends" },
  { t: "are in a pool", em: { pool: "teal" } },
  { t: "splashing water on each other,", em: { splashing: "teal" } },
  { t: "waving your hands.", em: { waving: "teal" } },
  { t: "When two waves", em: { two: "big" } },
  { t: "at the same length", em: { same: "teal" } },
  { t: "and the same width combine,", em: { same: "teal", "combine,": "teal" } },
  { t: "they form ~like a bigger wave.", em: { bigger: "gold", "wave.": "gold" } },
  { t: "~Now, that's what the right answers are.", em: { right: "gold", answers: "gold" } },
  { t: "They form a bigger wave.", em: { bigger: "gold" } },
  { t: "So, the probability", em: { probability: "teal" } },
  { t: "of the right answers goes up.", em: { right: "gold", "up.": "gold" } },
  // scale
  { t: "~Now, link qubits together", em: { link: "teal" } },
  { t: "and they move as one.", em: { "one.": "teal" } },
  { t: "So 50 qubits is", em: { "50": "big" } },
  { t: "~like a quadrillion combinations.", em: { quadrillion: "gold" } },
  // fact-check: he says "300 more than would be like an atom in the universe" (garbled); 2^300 ~ 2x10^90 > ~10^80 atoms
  { t: "300 more than would be like", show: "300 qubits → more combinations", em: { "300": "big", combinations: "gold" } },
  { t: "an atom in the universe.", show: "than atoms in the universe.", em: { "universe.": "gold" } },
  // uses + problems
  { t: "It won't make Instagram faster.", em: { "won't": "coral" } },
  { t: "It's built for things like" },
  { t: "designing new medicine,", em: { "medicine,": "gold" } },
  { t: "cracking codes.", em: { "codes.": "gold" } },
  { t: "~Basically, any problem ~which ~are very hard", em: { hard: "coral" } },
  { t: "to find the solution for,", em: { solution: "gold" } },
  { t: "that's where quantum computers", em: { quantum: "teal" } },
  { t: "will come in." },
  // ending
  // v6: on-camera takes 137 / 134 / 135
  { t: "So, a quantum computer" },
  { t: "isn't a faster laptop.", em: { "isn't": "coral" } },
  { t: "It's a whole new kind of computing.", em: { whole: "gold", new: "gold" } },
  // ai wave
  { t: "And here's why I want you to know this.", em: { you: "gold" } },
  { t: "Quantum computing could be" },
  { t: "the next AI wave.", em: { AI: "teal", "wave.": "teal" } },
  { t: "We're trying to have" },
  { t: "a breakthrough here", em: { breakthrough: "gold" } },
  { t: "and AI is helping make those breakthroughs.", em: { AI: "teal", "breakthroughs.": "gold" } },
  { t: "So, quantum computing could be" },
  { t: "the next thing you have to learn.", em: { "learn.": "gold" } },
  // cta
  { t: "And if you want" },
  { t: "to keep learning about", em: { learning: "gold" } },
  { t: "the next big breakthrough,", em: { next: "gold", big: "gold", "breakthrough,": "gold" } },
  { t: "hit follow.", em: { "follow.": "gold" } },
];

// A displayed word with its highlight time (s) and end (e).
export type DWord = { w: string; s: number; e: number };
const display = (words: CWord[], show?: string): DWord[] => {
  if (!show) return words.filter((w) => !w.hide).map((w) => ({ w: w.w, s: w.s, e: w.e }));
  const sp = words.filter((w) => !w.hide);
  const s0 = sp[0].s, s1 = sp[sp.length - 1].e;
  const toks = show.split(/\s+/);
  return toks.map((w, j) => ({ w, s: s0 + ((s1 - s0) * j) / toks.length, e: s0 + ((s1 - s0) * (j + 1)) / toks.length }));
};

export const CAPTIONS = chunk(WORDS, LINES.map((l) => l.t)).map((c, i) => ({
  ...c,
  shown: display(c.words, LINES[i].show),
  em: LINES[i].em ?? {},
  hide: !!LINES[i].hide,
  fixed: !!LINES[i].show,
}));
