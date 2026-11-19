// Caption lines, hand-chunked as sense units and checked word-for-word against the transcript at load.
// Words in EMPH get the film's emphasis treatment; the hook line has its own design.
import { WORDS, type Word } from "./lib";

const LINES = [
  "What if intelligence", "is just good compression?",
  "Think about it.",
  "We have one zettabyte", "of information,", "online data,", "just raw data everywhere,", "spread across the internet.",
  "We used all of that data", "and we compressed it", "into an LLM model.",
  "We trained a neural network on it", "so it can pattern recognize", "the information.",
  "It can figure out", "the best and the smallest", "set of rules", "you can use to express", "the raw data.",
  "So one zettabyte", "was converted into", "just two terabytes", "of weights of a neural network.",
  "You just compress something", "to something so small,", "intelligence came out of it.",
  "Maybe intelligence", "is a good compression.",
  "Now this raises", "a lot of questions.", "We have done this", "in human history too.",
  "When we learn something,", "you have 10 different books,", "you take a page,", "you turn it,", "you keep on turning it,",
  "but you don't mug up", "the information.", "You try to build", "patterns out of it.",
  "If X plus Y", "is equal to Z", "and X and Z is given,", "you can find the value of Y.",
  "You do it and you find it", "in your brain", "is because you've practiced so much.",
  "You have read so much data", "that you know this equation would work", "if I move the Y", "on the other side", "and Z on the left side", "and it just works.",
  "That's how beautiful", "a pattern recognition is", "and that's how", "neural network works.",
  "If you ask Gandhiji's birthday,", "it would be there.",
  "If you ask the distance", "between sun and moon,", "it would be there", "in those two terabyte.",
  "If you ask the capital of China,", "it would be there.", "Everything would be there.",
  "It's just amazing", "how you can compress information", "and intelligence", "pops out of it.",
  "Now, question to you,", "are there a small set of rules,", "so small", "that they can represent", "the reality itself?",
  "That could be the holy grail,", "that could be AGI.",
  "Something so small", "which could just represent", "every rule,", "every regulation,", "every information", "out there in the universe.",
  "Maybe that is", "what we need to find.",
  "Now, this is a path", "I want you guys to think about.",
  "Maybe AI would help you build", "that small compressed", "set of parameters", "which could represent", "the reality itself.",
  "Maybe this is AGI,", "right?",
  "So I hope this helps you out", "and do let me know", "if this random thought with Madhav", "helps you keep the curiosity going", "on in computer science.",
  "Keep following", "the beauty of science", "and we keep on inspiring", "more and more people", "to take STEM.",
  "Please do", "because we are missing out", "on scientists.", "We need more scientists,", "we need more engineers", "and I will keep on asking you", "these kinds of questions", "so it keeps you", "excited about life.",
  "All right,", "best of luck.",
];

export const EMPH = new Set([
  "intelligence", "compression?", "compression.", "zettabyte", "internet.", "llm", "rules", "patterns", "terabytes", "weights",
  "beautiful.", "small,", "books,", "mug", "practiced", "equation", "works.", "birthday,", "moon,", "china,", "everything",
  "amazing", "reality", "grail,", "agi.", "agi,", "universe.", "find.", "path", "parameters", "madhav", "curiosity",
  "following", "science", "stem.", "scientists,", "scientists.", "engineers", "questions", "luck.",
]);
export const isEmph = (w: string) => EMPH.has(w.toLowerCase());

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");
export type Chunk = { s: number; e: number; words: Word[]; i: number };
export const CHUNKS: Chunk[] = (() => {
  let k = 0;
  const groups = LINES.map((l) => {
    const n = l.split(/\s+/).length, g = WORDS.slice(k, k + n);
    if (g.map((w) => norm(w.w)).join(" ") !== l.split(/\s+/).map(norm).join(" ")) throw new Error(`caption mismatch at "${l}" vs "${g.map((w) => w.w).join(" ")}"`);
    k += n; return g;
  });
  if (k !== WORDS.length) throw new Error(`captions cover ${k} of ${WORDS.length} words`);
  return groups.map((g, i) => {
    const last = g[g.length - 1], next = groups[i + 1]?.[0];
    return { s: g[0].s - 0.05, e: next ? Math.min(next.s - 0.05, last.e + 0.6) : last.e + 1.0, words: g, i };
  });
})();
export const chunkAt = (t: number) => CHUNKS.find((c) => t >= c.s && t < c.e);
