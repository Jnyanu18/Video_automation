// The bubble film's camera rig and world state: pure functions of t (no React, no three scene). v5 spine.
import { progS, smooth, easeInOut } from "../lib";
import { type Key, type Pose, type V3, add, keyed, orbit, unproject } from "./cam";
import { CORE_XY, HOOK_BUBBLE, LAPTOP_XY, MONEY_BUBBLE, PIPE_BUBBLE, T, TOUCH_BUBBLE, tw } from "./timing";
import { B } from "../beats";

const O: V3 = [0, 0, 0];
const lin = (x: number) => x;
const orb = (d: number, az: number, el: number, c: [number, number], tgt: V3 = O): Pose => ({ p: orbit(tgt, d, az, el), t: tgt, fov: 40, c });

// ---- bubble state -----------------------------------------------------------------------------
export const DESK_R = 5.6;
export const win = (t: number, a: number, b: number, fin = 0.3, fout = 0.3) => progS(t, a, fin) * (1 - progS(t, b - fout, fout));
const gauss = (t: number, t0: number, w: number) => Math.exp(-Math.pow((t - t0) / w, 2));

// v5: the desk shows from "I'm working at Microsoft" until the old-pipeline beat; the city otherwise. Swaps on cuts.
export const deskK = (t: number) => (t >= B.msft.s && t < B.old.s ? 1 : 0);
export const cityK = (t: number) => 1 - deskK(t);

export const bubbleAt = (t0: number) => {
  const t = tw(t0);
  // one primary motion per beat: money pours in and the bubble inflates (then holds)
  const money = smooth(progS(t, T.pouring - 0.2, 2.2, lin));
  let R = 3.0 + 1.2 * money;
  if (deskK(t) > 0) R = DESK_R;
  // "I think it's gonna stay": the bubble hardens into a glass planet
  const hard = smooth(progS(t, T.stayW - 0.1, 1.2, lin));
  R *= 1 + 0.035 * hard;
  // tension (honest, never pops): stretch + short wobble on "a bubble about to pop?", crack on "pop"
  const tension = win(t, T.bubble1 - 0.1, B.money.s + 0.2, 0.3, 0.4);
  const stretch = tension * 0.07;
  const wob = 1.4 * tension;
  const ripple = 0.7 * gauss(t, T.pop + 0.1, 0.25);
  const crack = progS(t, T.pop - 0.05, 0.4);
  return {
    R, sx: 1 - stretch * 0.45, sy: 1 + stretch, wob: wob * (1 - hard), ripple, crack, gold: hard, hard,
    money, grid: 0, tension,
  };
};

// ---- camera poses (subject in the top band y 220-640 and the right column x 560-1040, y 640-1180) ----
const deskTgt: V3 = [0, 0.07, 0];
// v6: the bubble sits in the right column (hook, questions, pipeline) or fills the top band (money, touch, stay);
// the desk monitor fills the top band.
export const P_HOOK: Pose = orb(74, 6, 6, HOOK_BUBBLE);
export const P_MONEY: Pose = orb(74, 6, 6, MONEY_BUBBLE);
export const P_TOUCH: Pose = orb(85, 12, 5, TOUCH_BUBBLE);
export const P_DESK: Pose = orb(4.4, -8, 7, [470, 540], deskTgt);
export const P_STEPS: Pose = P_DESK;
export const P_PIPE: Pose = orb(74, -8, 5, PIPE_BUBBLE);
export const P_TEN: Pose = orb(67, 14, 6, CORE_XY);
export const P_END: Pose = orb(92, 20, 8, [830, 800]);
export const P_EM = P_TEN;

// ---- "AI now touches everything": robotics, medical, transportation, drug discovery, everything ------------
export type ObjId = "robot" | "hospital" | "car" | "pill" | "laptop";
export const OBJ_XY: Record<ObjId, [number, number]> = {
  robot: [120, 410], hospital: [310, 630], car: [830, 870], pill: [830, 1130], laptop: LAPTOP_XY,
};
export const OBJ_ORDER: ObjId[] = ["robot", "hospital", "car", "pill", "laptop"];
export const OBJ_LABEL: Record<ObjId, string> = { robot: "Robotics", hospital: "Medical", car: "Transportation", pill: "Drug discovery", laptop: "Everything" };
export const OBJ_POS = Object.fromEntries(OBJ_ORDER.map((id) => [id, unproject(P_TOUCH, OBJ_XY[id][0], OBJ_XY[id][1], 60)])) as Record<ObjId, V3>;
// each icon pops on its own word
const OBJ_WORD = () => [T.robotics, T.medical, T.transport, T.drug, T.everything2];
export const OBJ_T0 = (i: number) => OBJ_WORD()[i] - 0.3; // thread i starts
export const OBJ_ARRIVE = (i: number) => OBJ_T0(i) + 0.3;
export const OBJ_SCALE = 4.2;

// ---- the desk (inside the bubble) --------------------------------------------------------------
export const DESK0: V3 = [0, 0.15, 0]; // centre of the monitor screen
export const deskW = (p: V3): V3 => add(DESK0, p);
// workflow nodes: a vertical flow in the right column (desk-local, placed from the steps camera)
const stepAt = (x: number, y: number): V3 => { const w = unproject(P_STEPS, x, y, 4.8); return [w[0] - DESK0[0], w[1] - DESK0[1], w[2] - DESK0[2]]; };
export const STEPS = [
  { id: "guide", label: "Guide", t: T.guide, p: stepAt(722, 910) },
  { id: "design", label: "Design", t: T.design, p: stepAt(722, 1000) },
  { id: "verify", label: "Verify", t: T.verify, p: stepAt(722, 1090) },
  { id: "babysit", label: "Babysit the AI", t: T.babysit, p: stepAt(722, 1190) },
];

// ---- camera -----------------------------------------------------------------------------------
// One fixed pose per beat; changes are cuts or a single 0.6 s move on a beat change. No drift.
const cut = (t: number, a: Pose, b: Pose): Key[] => [[t - 0.001, a], [t, b, lin]];
const KEYS: Key[] = [
  [0, P_HOOK],
  [B.money.s, P_HOOK],
  [B.money.s + 0.6, P_MONEY],
  [B.touch.s, P_MONEY],
  [B.touch.s + 0.6, P_TOUCH],
  ...cut(B.q2.s, P_TOUCH, P_HOOK),
  ...cut(B.msft.s, P_HOOK, P_DESK),
  [B.orch.s, P_DESK],
  [B.orch.s + 0.6, P_STEPS],
  [B.plain.s, P_STEPS],
  [B.plain.s + 0.6, P_DESK],
  ...cut(B.old.s, P_DESK, P_PIPE),
  [B.stay.s, P_PIPE],
  [B.stay.s + 0.6, P_TEN],
  [B.end.s, P_TEN],
  [B.end.s + 0.6, P_END],
];
export const poseAt = (t0: number): Pose => keyed(tw(t0), KEYS);
export const fogAt = (_t: number) => 0;
export { easeInOut };
