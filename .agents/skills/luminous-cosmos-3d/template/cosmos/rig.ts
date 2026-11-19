// The Back canvas camera: one keyed camera per 3D set (in that set's own coordinates), sets placed
// in the world so consecutive sets connect by a forward fly-through (the camera pushes on through
// set A's content and arrives at set B's first framing). Hand-offs use fixed rays so the footage
// tile lands on the exact screen point.
import * as THREE from "three";
import { easeInOut, lerp, smooth } from "../lib";
import { HAND, SET_T, T } from "./timing";
import { type Key, type Pose, type V3, add, keyed, mixPose, mul, norm, orbit, sub } from "./cam";

const O: V3 = [0, 0, 0];
const ss = (a: number, b: number, t: number) => smooth((t - a) / (b - a));

// ---- layout constants (set-local coordinates) ----
export const L = {
  galaxyHub: [12.4, 0.6, -8.5] as V3,
  galaxyReveal: orbit(O, 122, 8, 62),
  netLayersX: [-9, -4.5, 0, 4.5, 9],
  ribbonC: [15.5, 0.3, 0] as V3,
  cubeSmall: O,
  cubeBig: [-3.5, 3.7, -1.4] as V3,
  cubeEdgeBig: 4.2,
  cubeEdgeSmall: 1.0,
  bookC: [0, 0.5, 0] as V3,
  braidBase: [0, 4.4, 0] as V3,
};

type SetSpec = { id: SetId; t0: number; t1: number; cam: (t: number) => Pose; chain?: { from: SetId; D: number }; fog: number };
export type SetId = keyof typeof SET_T;
const S = (id: SetId) => ({ t0: SET_T[id][0], t1: SET_T[id][1] });

const galaxyCam = (t: number): Pose => {
  const hub = L.galaxyHub, back = norm(sub(L.galaxyReveal, hub));
  const tH = 6.9;
  const handPose = (d: number): Pose => ({ p: add(hub, mul(back, d)), t: hub, fov: 44, c: [540, 760] });
  if (t < tH) return handPose(lerp(2.4, 12, easeInOut(ss(S("galaxy").t0, tH, t) * 0.85 + ss(S("galaxy").t0 - 0.6, tH, t) * 0.15)));
  return keyed(t, [
    [tH, handPose(12)],
    [10.9, { p: L.galaxyReveal, t: [0, -4, 0], fov: 46, c: [540, 760] }],
    [12.9, { p: orbit(O, 92, 18, 24), t: [0, 1.5, 0], fov: 42, c: [560, 640] }],
    [S("galaxy").t1, { p: orbit(O, 74, 26, 14), t: [0, 4.5, 0], fov: 40, c: [560, 600] }, (x) => x],
  ]);
};

const networkCam = (t: number): Pose => keyed(t, [
  [S("network").t0, { p: [-17, 6, 19], t: [-1, 0, 0], fov: 42, c: [560, 650] }],
  [19.7, { p: [-7, 4.5, 21], t: [2, 0, 0], fov: 42, c: [560, 650] }],
  [22.3, { p: [11.5, 2.6, 23], t: [15.5, 0.6, 0], fov: 40, c: [540, 620] }],
  [S("network").t1, { p: [19.5, 1.8, 22], t: [15.5, 0.5, 0], fov: 40, c: [540, 620] }, (x) => x],
]);

const cubesCam = (t: number): Pose => {
  const { t0, t1 } = S("cubes"), tl = HAND.sizes.t0 - 0.4;
  const k = ss(t0, tl, t), k2 = ss(tl, t1, t);
  const az = lerp(-14, 0, k), el = lerp(9, 6, k), d = lerp(lerp(33, 29, k), 21.5, k2);
  return { p: orbit(L.cubeSmall, d, az, el), t: L.cubeSmall, fov: 36, c: [lerp(640, 740, k2), lerp(1030, 1060, k2)] };
};

const booksCam = (t: number): Pose => {
  const c = L.bookC;
  return keyed(t, [
    [S("books").t0, { p: orbit(c, 22, -16, 18), t: c, fov: 40, c: [560, 620] }],
    [T.takePage, { p: orbit(c, 15.5, -5, 15), t: [0, 0.3, 0], fov: 40, c: [560, 660] }],
    [T.mug + 0.4, { p: orbit(c, 15.5, 7, 15), t: [1.6, 0.5, 0], fov: 40, c: [560, 660] }],
    [T.patterns, { p: orbit(c, 18.5, 10, 22), t: [0, 2.6, 0], fov: 40, c: [560, 640] }],
    [S("books").t1, { p: orbit([0, 4, 0], 19, 12, 12), t: [0, 5.4, 0], fov: 40, c: [560, 600] }],
  ]);
};

const boardCam = (t: number): Pose => keyed(t, [
  [S("board").t0, { p: [0, 1.0, 25], t: O, fov: 32, c: [540, 700] }],
  [T.findY + 0.6, { p: [-1.6, 0.7, 23], t: O, fov: 32, c: [540, 700] }],
  [T.doIt + 1.0, { p: [2.5, 2.0, 31], t: [0, -0.4, 0], fov: 32, c: [600, 400] }],
  [T.equation - 0.2, { p: [4.5, 2.4, 33], t: [0, -0.6, 0], fov: 32, c: [620, 400] }],
  [T.moveY - 0.1, { p: [1.0, 0.6, 26.5], t: O, fov: 32, c: [560, 600] }],
  [T.works + 0.6, { p: [-1.2, 0.5, 25.5], t: O, fov: 32, c: [560, 600] }],
  [T.recog, { p: [-9, 4.5, 19], t: [0, 0, -2], fov: 36, c: [540, 760] }],
  [S("board").t1, { p: [-13, 2.5, 13], t: [0, 0, -2.5], fov: 38, c: [540, 760] }, (x) => x],
]);

const recallCam = (t: number): Pose => {
  const { t0, t1 } = S("recall"), k = (t - t0) / (t1 - t0);
  return { p: orbit(O, lerp(16, 14.5, k), lerp(-18, 16, easeInOut(k)), lerp(8, 5, k)), t: O, fov: 38, c: [740, 600] };
};

export const COSMOS_DIR = norm([0.12, 0.2, 1]);
const cosmosCam = (t: number): Pose => {
  const h = HAND.cosmos, tH = h.t1 + 0.15;
  if (t < tH) {
    const d = lerp(1.5, 9.5, easeInOut(ss(S("cosmos").t0, tH, t)));
    return { p: mul(COSMOS_DIR, d), t: O, fov: 42, c: [540, 820] };
  }
  return keyed(t, [
    [tH, { p: mul(COSMOS_DIR, 9.5), t: O, fov: 42, c: [540, 820] }],
    [T.every1 - 0.6, { p: orbit(O, 25, 12, 13), t: [0, 0.6, 0], fov: 46, c: [540, 800] }],
    [T.maybeFind, { p: orbit(O, 19, 3, 9), t: [0, 0.3, 0], fov: 44, c: [540, 800] }],
    [T.find + 0.8, { p: orbit(O, 9.5, -4, 6), t: O, fov: 42, c: [540, 820] }],
    [T.path + 0.4, { p: orbit(O, 13.5, 14, 8), t: O, fov: 40, c: [720, 560] }],
    [S("cosmos").t1, { p: orbit(O, 12, 34, 13), t: O, fov: 40, c: [720, 560] }, (x) => x],
  ]);
};

const stemCam = (t: number): Pose => {
  const { t0, t1 } = S("stem"), k = (t - t0) / (t1 - t0);
  return { p: orbit(O, lerp(17.5, 15.5, k), lerp(-16, 16, k), lerp(14, 9, k)), t: [0, 0.2, 0], fov: 40, c: [620, 540] };
};

const endCam = (t: number): Pose => {
  const k = ss(S("end").t0, HAND.end.t1, t);
  return { p: orbit(O, lerp(15, 11.5, 1 - (1 - k) * (1 - k)), lerp(4, 0, k), lerp(9, 6, k)), t: O, fov: 40, c: [540, 900] };
};

const SPECS: SetSpec[] = [
  { id: "galaxy", ...S("galaxy"), cam: galaxyCam, fog: 0.0042 },
  { id: "network", ...S("network"), cam: networkCam, chain: { from: "galaxy", D: 56 }, fog: 0.022 },
  { id: "cubes", ...S("cubes"), cam: cubesCam, chain: { from: "network", D: 40 }, fog: 0.02 },
  { id: "books", ...S("books"), cam: booksCam, fog: 0.022 },
  { id: "board", ...S("board"), cam: boardCam, chain: { from: "books", D: 40 }, fog: 0.016 },
  { id: "recall", ...S("recall"), cam: recallCam, chain: { from: "board", D: 40 }, fog: 0.02 },
  { id: "cosmos", ...S("cosmos"), cam: cosmosCam, fog: 0.0035 },
  { id: "stem", ...S("stem"), cam: stemCam, fog: 0.012 },
  { id: "end", ...S("end"), cam: endCam, fog: 0.008 },
];
const byId = Object.fromEntries(SPECS.map((s) => [s.id, s])) as Record<SetId, SetSpec>;

// ---- placement: chained sets start where the previous one ended, pushed D along its view ----
const basis = (p: V3, t: V3, up: V3) => new THREE.Matrix4().lookAt(new THREE.Vector3(...p), new THREE.Vector3(...t), new THREE.Vector3(...up)).setPosition(...p);
export const MAT: Record<SetId, THREE.Matrix4> = {} as Record<SetId, THREE.Matrix4>;
const tf = (m: THREE.Matrix4, a: V3): V3 => { const v = new THREE.Vector3(...a).applyMatrix4(m); return [v.x, v.y, v.z]; };
const tfDir = (m: THREE.Matrix4, a: V3): V3 => { const v = new THREE.Vector3(...a).transformDirection(m); return [v.x, v.y, v.z]; };
const worldPose = (s: SetSpec, t: number): Pose => {
  const m = MAT[s.id], lp = s.cam(t);
  return { ...lp, p: tf(m, lp.p), t: tf(m, lp.t), up: tfDir(m, lp.up ?? [0, 1, 0]) };
};
for (const s of SPECS) {
  if (!s.chain) { MAT[s.id] = new THREE.Matrix4(); continue; }
  const a = byId[s.chain.from], ae = worldPose(a, a.t1);
  const dir = norm(sub(ae.t, ae.p)), pw = add(ae.p, mul(dir, s.chain.D));
  const mw = basis(pw, add(pw, dir), ae.up ?? [0, 1, 0]);
  const ls = s.cam(s.t0);
  const ml = basis(ls.p, ls.t, [0, 1, 0]);
  MAT[s.id] = mw.multiply(ml.invert());
}

// Handheld-like drift so the camera never holds still; zero at hand-offs and on the last frame.
const HANDS = [HAND.internet, HAND.sizes, HAND.cosmos, HAND.end];
const driftMask = (t: number) => HANDS.reduce((m, h) => m * (1 - ss(h.t0 - 0.6, h.t0 - 0.1, t) * (1 - ss(h.t1 + 0.1, h.t1 + 0.6, t))), 1);
const drift = (pose: Pose, t: number): Pose => {
  const a = 0.011 * Math.hypot(...sub(pose.p, pose.t)) * driftMask(t);
  if (a < 1e-6) return pose;
  const dp: V3 = [Math.sin(t * 0.37) + 0.5 * Math.sin(t * 0.91 + 1), 0.7 * Math.sin(t * 0.29 + 1) + 0.3 * Math.sin(t * 0.83), 0.8 * Math.sin(t * 0.23 + 2)];
  const dt: V3 = [Math.sin(t * 0.31 + 3), 0.6 * Math.sin(t * 0.41 + 4), 0.5 * Math.sin(t * 0.27)];
  return { ...pose, p: add(pose.p, mul(dp, a)), t: add(pose.t, mul(dt, a * 0.5)) };
};

type Active = { pose: Pose; sets: SetId[]; fog: number; trans?: { from: SetId; to: SetId; k: number } };
export const rigAt = (t: number): Active => {
  for (let i = 0; i + 1 < SPECS.length; i++) {
    const a = SPECS[i], b = SPECS[i + 1];
    if (b.chain?.from === a.id && t > a.t1 && t < b.t0) {
      const k = easeInOut((t - a.t1) / (b.t0 - a.t1));
      const pose = mixPose(worldPose(a, a.t1), worldPose(b, b.t0), k);
      return { pose: drift(pose, t), sets: [a.id, b.id], fog: lerp(a.fog, b.fog, k), trans: { from: a.id, to: b.id, k } };
    }
  }
  let s = SPECS.find((x) => t >= x.t0 && t <= x.t1);
  if (!s) s = SPECS.reduce((best, x) => (Math.min(Math.abs(t - x.t0), Math.abs(t - x.t1)) < Math.min(Math.abs(t - best.t0), Math.abs(t - best.t1)) ? x : best));
  return { pose: drift(worldPose(s, Math.min(s.t1, Math.max(s.t0, t))), t), sets: [s.id], fog: s.fog };
};
export const setMatrix = (id: SetId) => MAT[id];
// world point of a set-local point
export const toWorld = (id: SetId, p: V3): V3 => tf(MAT[id], p);
export const localPose = (id: SetId, t: number): Pose => byId[id].cam(Math.min(byId[id].t1, Math.max(byId[id].t0, t)));
// the rig pose expressed in a set's local coordinates (for placing things relative to the lens)
export const poseInSet = (id: SetId, pose: Pose): Pose => {
  const inv = MAT[id].clone().invert();
  return { ...pose, p: tf(inv, pose.p), t: tf(inv, pose.t), up: tfDir(inv, pose.up ?? [0, 1, 0]) };
};
export type { Key };
