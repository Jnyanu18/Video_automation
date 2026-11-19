// PER-FILM presenter plan (worked example: the quantum film v6). The presenter is Madhav himself: his
// on-camera DJI takes (RAW_DIR in pipeline_config.py, read only) cut out with RobustVideoMatting
// (presenter/matte.py) and time-mapped onto the film timeline per face window:
// clip frame j of window k = film frame startFrame + j, showing the take frame whose voice is in
// public/vo.wav at that moment (spine/splice-map.json). So picture and voice are the same clip.
// Files: public/face/w<k>.webm (VP9 + alpha, source size, 30 fps; ProRes 4444 masters in MATTE (HEAVY)).
// Geometry and per-frame face boxes: src/face-windows.json (presenter/measure.py + face_windows.py).
// Rewrite WINS (places, rim colours, lines) for every film; CLIP.cutY/fade/edge depend on the framing.
//
// Staging (as v5): a floating half-body cut-out on the right over the live animation, his right
// shoulder past the frame edge, the left source edge feathered, the body fading out above the
// keyboard rows (cutY); rim light + contact shadow in the scene palette.
// Reframes: hard "zoom cuts" (snap on the cut frame) wherever the clip jumps to another take or skips
// a pause (fw.cuts with jump=true), so a jump cut reads as a deliberate reframe; eased moves elsewhere.
import FW from "./face-windows.json";
import { B } from "./beats";

export type FaceWin = (typeof FW.wins)[number];
export const CLIP = {
  ready: true,
  fps: 30,
  w: FW.w,
  h: FW.h,
  cutY: 2290, // keyboard / desk rows start below ~2330 in every take; the matte keeps scraps of them
  fade: 330,
  edge: 150, // feather (source px) on the source frame's left edge (his arm/shoulder is cut there)
};

// s = scale of the 1512x2688 source frame on the 1080x1920 screen, fx = screen x of the face centre,
// bottom = screen y of the source frame's bottom edge. cut: snap on this time's frame (zoom cut).
export type Place = { t: number; s: number; fx: number; bottom: number; cut?: boolean };
export type Win = { fw: FaceWin; film: [number, number]; from: "right" | "none"; rim: string; places: Place[]; line: string };
export const MOVE_S = 0.5;

const W = (k: number) => FW.wins[k - 1];
const jump = (k: number, i: number) => {
  const c = W(k).cuts.filter((x) => x.jump)[i];
  return c.t;
};

export const WINS: Win[] = [
  {
    // hook (takes 131 + 135): prominent on the cover, drops to the corner as the hall powers on
    fw: W(1), film: [W(1).start, W(1).end], from: "none", rim: "255,203,87",
    places: [
      { t: 0, s: 0.66, fx: 735, bottom: 2290 },
      { t: B.supercomputer - 0.1, s: 0.46, fx: 858, bottom: 2160 },
      { t: jump(1, 0), s: 0.5, fx: 838, bottom: 2195, cut: true }, // take 135: "And in the next 2 minutes"
    ],
    line: "Google built a chip ... And in the next 2 minutes, you'll actually understand it.",
  },
  {
    // myth (take 134): "So, does it try every answer at once? Well, no. The moment you look..."
    fw: W(2), film: [W(2).start, W(2).end], from: "right", rim: "255,170,140",
    places: [
      { t: W(2).start, s: 0.5, fx: 850, bottom: 2185 },
      { t: B.look1 - 0.3, s: 0.54, fx: 834, bottom: 2215 },
    ],
    line: "So, does it try every answer at once? Well, no. The moment you look, it lands on just one random answer.",
  },
  {
    // pool (takes 137 / 133 / 135)
    fw: W(3), film: [W(3).start, W(3).end], from: "right", rim: "143,243,227",
    places: [
      { t: W(3).start, s: 0.5, fx: 850, bottom: 2185 },
      { t: jump(3, 0), s: 0.44, fx: 872, bottom: 2125, cut: true }, // 133: "When two waves ..." (wave cross-section above)
      { t: jump(3, 1), s: 0.56, fx: 822, bottom: 2250, cut: true }, // 135: "Now, that's what the right answers are"
      { t: B.probability - 0.3, s: 0.48, fx: 860, bottom: 2165 },
    ],
    line: "Now, imagine you and your friends are in a pool ... So, the probability of the right answers goes up.",
  },
  {
    // ending + AI wave + CTA (takes 137 / 134 / 135)
    fw: W(4), film: [W(4).start, W(4).end], from: "right", rim: "143,243,227",
    places: [
      { t: W(4).start, s: 0.5, fx: 850, bottom: 2185 },
      { t: jump(4, 0), s: 0.6, fx: 806, bottom: 2280, cut: true }, // "And here's why I want you to know this." (direct, bigger)
      { t: jump(4, 1), s: 0.45, fx: 868, bottom: 2135, cut: true }, // "Quantum computing could be the next AI wave."
      { t: jump(4, 2), s: 0.49, fx: 856, bottom: 2170, cut: true }, // 134: "We're trying to have a breakthrough here ..."
      { t: B.soQC - 0.25, s: 0.53, fx: 826, bottom: 2210 }, // "So, quantum computing could be the next thing you have to learn."
      { t: jump(4, 3), s: 0.6, fx: 808, bottom: 2285, cut: true }, // 135: CTA beside the FOLLOW coin
      { t: jump(4, 4), s: 0.66, fx: 796, bottom: 2335, cut: true }, // "hit follow." punch-in
    ],
    line: "So, a quantum computer isn't a faster laptop ... hit follow.",
  },
];
export const IN_FR = 9; // frames for the pop-in
export const OUT_FR = 10; // frames for the exit
