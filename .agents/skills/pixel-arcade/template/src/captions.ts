// Captions, chunked automatically from the words (news batch: no hand-chunking per clip).
// A chunk breaks at sentence punctuation, at a pause > 0.35 s, or at ~4 words / 24 characters.
// Worlds style the chunk however they like; EMPH (per clip, src/world/emph.ts) marks emphasis words.
import { WORDS, type Word } from "./lib";
import { EMPH_WORDS } from "./world/emph";

export const EMPH = new Set(EMPH_WORDS.map((w) => w.toLowerCase()));
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");
export const isEmph = (w: string) => EMPH.has(norm(w));

export type Chunk = { s: number; e: number; words: Word[]; i: number };
export const CHUNKS: Chunk[] = (() => {
  const groups: Word[][] = [];
  let cur: Word[] = [];
  WORDS.forEach((w, i) => {
    cur.push(w);
    const next = WORDS[i + 1];
    const chars = cur.map((x) => x.w).join(" ").length;
    const end = /[.?!,;:]$/.test(w.w) && (cur.length >= 2 || /[.?!]$/.test(w.w));
    if (!next || end || next.s - w.e > 0.35 || cur.length >= 4 || chars >= 24) { groups.push(cur); cur = []; }
  });
  return groups.map((g, i) => {
    const last = g[g.length - 1], next = groups[i + 1]?.[0];
    return { s: g[0].s - 0.05, e: next ? Math.min(next.s - 0.05, last.e + 0.6) : last.e + 0.8, words: g, i };
  });
})();
export const chunkAt = (t: number) => CHUNKS.find((c) => t >= c.s && t < c.e);
