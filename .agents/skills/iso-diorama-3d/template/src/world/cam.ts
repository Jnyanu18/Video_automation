// Orthographic isometric camera: keyed target / zoom (px per world unit) / screen anchor (where the target
// lands on screen). Pure maths (no three import) so beats.ts can place footage hand-off tiles on world objects.
import { W, H, easeInOut } from "../lib";
import { T } from "./timing";

export type V3 = [number, number, number];
const E = 1.12; // camera elevation factor (1 = true isometric)
const n = Math.hypot(1, E, 1);
export const DIR: V3 = [1 / n, E / n, 1 / n]; // from target towards camera
export const RIGHT: V3 = [Math.SQRT1_2, 0, -Math.SQRT1_2];
const uRaw: V3 = [-E, 2, -E];
const un = Math.hypot(...uRaw);
export const UP: V3 = [uRaw[0] / un, uRaw[1] / un, uRaw[2] / un];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const SP = 4.2; // tile spacing
export const P = (gx: number, gz: number, y = 0): V3 => [gx * SP, y, gz * SP];
export const TILE = {
  food: P(1, 1), car: P(0, 1), ware: P(-1, 1), coal: P(-1, 0), house: P(-1, -1),
  jewel: P(0, -1), gallery: P(1, -1), factory: P(1, 0), plaza: P(0, 0),
} as const;

export type CamState = { x: number; y: number; z: number; zoom: number; sx: number; sy: number };
type Key = { t: number; d: number } & CamState;
const k = (t: number, d: number, p: V3, zoom: number, sx = 540, sy = 900): Key => ({ t, d, x: p[0], y: p[1], z: p[2], zoom, sx, sy });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// `t` = arrival time; the move runs over the `d` seconds before it.
const DIAMOND_L = [0.05, 1.05, 0.05] as const; // tiles.DIAMOND (kept here: cam.ts stays three-free)
// v3: he is always bottom-left, so world subjects sit in the right column / top band. Moves only at item or
// sentence changes (<= 0.5 s), then hold.
// v6: he is big bottom-left (head ~x 60-640, y 820+); world subjects sit in the top band / upper right.
const R = [640, 650] as const;
const KEYS: Key[] = [
  k(0, 0, [0, 0, 0.3], 42, 600, 640),
  // v5 answer 1: the humanoid squad on the plaza, then out to the supply-chain half of the island on "everywhere"
  k(T.supply + 0.1, 0.45, add(TILE.plaza, [0, 0.7, 0]), 165, R[0], 640),
  k(T.everywhere + 0.25, 0.5, [0, 0, 1.7], 50, 600, 640),
  // Q2 "how does a company decide?": the human-vs-robot scale on the plaza
  k(T.askDecide + 1.0, 0.5, add(TILE.plaza, [0, 1.4, 0]), 160, 620, 600),
  // "pattern-based": the factory conveyor
  k(T.pattern, 0.45, add(TILE.factory, [0, 0.6, 0]), 125, R[0], R[1]),
  // art-based value: gallery, then one move to the painting on "value of a painting"
  k(T.artBased, 0.4, add(TILE.gallery, [-0.05, 1.0, -0.9]), 135, R[0], R[1]),
  k(T.valueOf + 0.1, 0.5, add(TILE.gallery, [-0.05, 1.23, -1.47]), 205, 640, 620),
  // "human feeling": back out so the art guy and the painting share the frame (hearts travel between them)
  k(T.feeling0 + 0.05, 0.45, add(TILE.gallery, [-0.05, 1.0, -0.9]), 135, R[0], R[1]),
  // chai corner (the old house tile): sit, sip, gossip
  k(T.chai + 0.05, 0.45, add(TILE.house, [0.3, 0.7, 0.3]), 130, R[0], R[1]),
  // jeweller, the diamond close-up, then back for "a robot can't take that"
  k(T.jeweller, 0.4, add(TILE.jewel, [0, 0.9, 0]), 125, R[0], R[1]),
  k(T.whichDiamond, 0.4, add(TILE.jewel, [DIAMOND_L[0], DIAMOND_L[1], DIAMOND_L[2]]), 220, 640, 630),
  k(T.robotCant, 0.4, add(TILE.jewel, [0.3, 0.9, 0.3]), 120, R[0], R[1]),
  // pull out to the island (human tiles glow), held through the comment prompt and the end card
  k(T.artistic + 0.1, 0.5, [0, 0, 0.3], 42, 600, 680),
];

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const camAt = (t: number): CamState => {
  let cur: CamState = KEYS[0];
  for (let i = 1; i < KEYS.length; i++) {
    const key = KEYS[i];
    if (t >= key.t) { cur = key; continue; }
    if (t > key.t - key.d) {
      const q = easeInOut(Math.max(0, Math.min(1, (t - (key.t - key.d)) / key.d)));
      return {
        x: lerp(cur.x, key.x, q), y: lerp(cur.y, key.y, q), z: lerp(cur.z, key.z, q),
        zoom: Math.exp(lerp(Math.log(cur.zoom), Math.log(key.zoom), q)),
        sx: lerp(cur.sx, key.sx, q), sy: lerp(cur.sy, key.sy, q),
      };
    }
    return cur;
  }
  return cur;
};

export const camLive = (t: number): CamState => camAt(t);

// camera centre point (what the three camera looks at) for a state
export const camCentre = (c: CamState): V3 => {
  const ax = (c.sx - W / 2) / c.zoom, ay = (c.sy - H / 2) / c.zoom;
  return [c.x - RIGHT[0] * ax + UP[0] * ay, c.y - RIGHT[1] * ax + UP[1] * ay, c.z - RIGHT[2] * ax + UP[2] * ay];
};

export const projectWith = (c: CamState, p: V3): [number, number] => {
  const cc = camCentre(c);
  const d: V3 = [p[0] - cc[0], p[1] - cc[1], p[2] - cc[2]];
  return [W / 2 + dot(d, RIGHT) * c.zoom, H / 2 - dot(d, UP) * c.zoom];
};
export const project = (t: number, p: V3) => projectWith(camLive(t), p);
export { add };
