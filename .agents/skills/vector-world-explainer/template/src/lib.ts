import { Easing, interpolate, spring } from "remotion";
import env from "./vo_env.json";
import { FPS, WORDS, norm, type Word } from "./beats";
export * from "./beats";

const ENV = env as number[];
export const voLevel = (fr: number) => ENV[fr] ?? 0;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
export const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);
export const easeIn = Easing.bezier(0.5, 0, 0.9, 0.4);
// 0→1 over `dur` frames starting at frame `at`.
export const prog = (fr: number, at: number, dur = 12, e = ease) => interpolate(fr, [at, at + dur], [0, 1], { ...clamp, easing: e });
export const pop = (fr: number, at: number, damping = 14) => spring({ frame: fr - at, fps: FPS, config: { damping, stiffness: 180, mass: 0.7 } });
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mix = (fr: number, keys: [number, number][]) =>
  interpolate(fr, keys.map((k) => k[0]), keys.map((k) => k[1]), { ...clamp, easing: easeInOut });

// Caption chunks, authored by hand so every break falls on a sense unit. Each line must
// match the transcript word for word (a mismatch throws at load). A word written with a leading
// "~" is spoken but not shown (light filler cleanup: "Now,", "like", "a").
export type CWord = Word & { hide?: boolean };
export type Chunk = { s: number; e: number; words: CWord[] };
export const chunk = (ws: Word[], lines: string[]): Chunk[] => {
  let i = 0;
  const groups = lines.map((l) => {
    const toks = l.split(/\s+/);
    const g = ws.slice(i, i + toks.length);
    if (g.map((w) => norm(w.w)).join(" ") !== toks.map((t) => norm(t.replace(/^~/, ""))).join(" ")) throw new Error(`caption mismatch at "${l}" vs "${g.map((w) => w.w).join(" ")}"`);
    i += toks.length;
    return g.map((w, j) => ({ ...w, hide: toks[j].startsWith("~") }));
  });
  if (i !== ws.length) throw new Error(`captions cover ${i} of ${ws.length} words`);
  return groups.map((g) => {
    const vis = g.filter((w) => !w.hide);
    const last = g[g.length - 1];
    const next = ws[ws.indexOf(ws.find((w) => w.s === last.s && w.w === last.w)!) + 1];
    return { s: (vis[0] ?? g[0]).s, e: next ? Math.min(next.s, last.e + 0.5) : last.e + 0.8, words: g };
  });
};
export { WORDS };
export type SceneProps = { fr: number };
