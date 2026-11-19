// The world camera: one page per beat. Same-row pages: a quick 0.35 s pan on the beat change; a row change: a cut
// (mid-pan frames of a long diagonal move are half-empty). Holds still inside a beat; never zooms toward his face.
// The ending zooms out to the whole (dimmed) map in 0.9 s.
import { camAt, type Cam, type Key } from "../kit/camera";
import { B } from "../beats";
import { f } from "../lib";

// World origin of each page (each page is one 1080x1920 screen at zoom 1). Leave ~220 px gutters for connector arrows.
export const PG = { hook: [0, 0], q: [1300, 0], take: [650, 2100] } as const;
type PageId = keyof typeof PG;
const ctr = (id: PageId) => ({ x: PG[id][0] + 540, y: PG[id][1] + 960, zoom: 1 });

// The end-card framing: centre and zoom that show every page (zoom ~0.24-0.45 depending on the map size).
export const MAP = { x: 1190, y: 2000, zoom: 0.42 };

const ORDER: PageId[] = ["hook", "q", "take"];
const k = (t: number, c: Partial<Cam>): Key => [f(t), c];
export const KEYS: Key[] = (() => {
  const keys: Key[] = [k(0, ctr("hook"))];
  for (let i = 1; i < ORDER.length; i++) {
    const a = ORDER[i - 1], b = ORDER[i], s = B[b].s;
    const sameRow = PG[a][1] === PG[b][1];
    keys.push(k(sameRow ? s - 0.15 : s - 0.02, ctr(a)), k(sameRow ? s + 0.2 : s - 0.01, ctr(b)));
  }
  keys.push(k(B.end.s, ctr(ORDER[ORDER.length - 1])), k(B.end.s + 0.9, MAP));
  return keys;
})();

export const camera = (t: number): Cam => camAt(t * 30, KEYS);
