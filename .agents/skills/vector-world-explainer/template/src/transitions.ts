// Light carried across cuts (drawn by Film.tsx over the scenes). Each entry: the cut time `t`
// (seconds, normally an ACTS boundary), the matched point before (`from`) and after (`to`) the cut
// in screen px, its colour and radius. Owners of the two acts agree the point; keep it on the
// object the camera pushes through. pre/post: seconds of build and decay (default 0.25 / 0.35).
import { ACTS } from "./beats";
export type CutGlow = { t: number; from: [number, number]; to: [number, number]; color: string; r: number; k?: number; pre?: number; post?: number };
export const CUT_GLOWS: CutGlow[] = [
  // hook -> bits: push into the Google chip's die; its light becomes the laptop screen's
  { t: ACTS.bits[0], from: [540, 960], to: [540, 700], color: "#FFD574", r: 700, k: 0.8, pre: 0.3, post: 0.4 },
  // interference -> pool: push into the coin's gold landing glow at the exit; it becomes the lit ripples on the pool
  { t: ACTS.pool[0], from: [540, 990], to: [540, 1000], color: "#FFD574", r: 650, k: 0.75, pre: 0.25, post: 0.4 },
  // ending -> aiwave: dive into the cryostat chip's glowing die; the AI-wave act pulls back out of a glowing die
  { t: ACTS.aiwave[0], from: [540, 960], to: [540, 960], color: "#FFD574", r: 700, k: 0.8, pre: 0.3, post: 0.4 },
  // aiwave -> cta: the tossed gold coin is matched in place
  { t: ACTS.cta[0], from: [400, 330], to: [400, 330], color: "#FFD574", r: 320, k: 0.5 },
];
