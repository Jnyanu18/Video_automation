// The world camera (v3): one page per beat. Same-row pages: a quick 0.35 s pan on the beat change; row changes: a cut.
// Holds still inside a beat; never zooms toward his face. The ending zooms out to the whole (dimmed) map.
import { camAt, type Cam, type Key } from "../kit/camera";
import { B } from "./beats";
import { f } from "../lib";

export const PG = {
  hook: [0, 0], years: [1300, 0], q: [2600, 0],
  patt: [0, 2100], protein: [1300, 2100], keys: [2600, 2100],
  market: [0, 4200], cheaper: [1300, 4200], live: [2600, 4200],
  comment: [1300, 6300],
} as const;
type PageId = keyof typeof PG;
const ctr = (id: PageId) => ({ x: PG[id][0] + 540, y: PG[id][1] + 960, zoom: 1 });

export const MAP = { x: 1840, y: 3740, zoom: 0.235 };

const ORDER: PageId[] = ["hook", "years", "q", "patt", "protein", "keys", "market", "cheaper", "live", "comment"];
const k = (t: number, c: Partial<Cam>): Key => [f(t), c];
export const KEYS: Key[] = (() => {
  const keys: Key[] = [k(0, ctr("hook"))];
  for (let i = 1; i < ORDER.length; i++) {
    const a = ORDER[i - 1], b = ORDER[i], s = B[b].s;
    const sameRow = PG[a][1] === PG[b][1];
    keys.push(k(sameRow ? s - 0.15 : s - 0.02, ctr(a)), k(sameRow ? s + 0.2 : s - 0.01, ctr(b)));
  }
  keys.push(k(B.end.s, ctr("comment")), k(B.end.s + 0.9, MAP));
  return keys;
})();

export const camera = (t: number): Cam => camAt(t * 30, KEYS);
