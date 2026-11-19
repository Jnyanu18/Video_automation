// The questions he reads out, found from words.json (`q: true`, set by build_spine.py from the clip's "q" items).
// Each question becomes an anonymous IG DM card from its first word until his answer starts.
import { OUTRO, WORDS, type Word } from "../lib";

export type Question = { i: number; text: string; s: number; e: number; answerS: number; words: Word[] };
export const QUESTIONS: Question[] = (() => {
  const out: Question[] = [];
  let cur: Word[] = [];
  const flush = (next?: Word) => {
    if (!cur.length) return;
    out.push({ i: out.length, words: cur, text: cur.map((w) => w.w).join(" "), s: cur[0].s, e: cur[cur.length - 1].e, answerS: next ? next.s : OUTRO.t });
    cur = [];
  };
  WORDS.forEach((w) => {
    if (w.q) {
      if (cur.length && w.s - cur[cur.length - 1].e >= 1.0) flush(w); // a second question right after the first
      cur.push(w);
    } else flush(w);
  });
  flush();
  return out;
})();
