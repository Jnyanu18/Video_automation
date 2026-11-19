// Avatar v5 (HeyGen Avatar V): ONE transparent clip audio/v5/avatar/windows.webm (VP9 alpha,
// 1080x1920, 25 fps), lip-synced to audio/v5/avatar/windows.mp3 = four windows of Madhav's real VO
// (audio/v5/vo-real.wav) concatenated. Copied to public/avatar5/windows.webm and drawn with Remotion
// OffthreadVideo (transparent, muted) inside one Sequence per window.
//
// Time mapping (by TIME, not frame number): film time t inside window k shows the clip at
//   src = off_k + (t - film_k)
//
// Madhav's brief (2026-10-20): floating avatar for longer, ~5 s prominent at the start, back every
// time it's important; >= 1 minute of HeyGen. Staging: a floating cut-out over LIVE animation (never a
// static full-frame talking head), sharing the frame. Between sentences he reframes (scale / x /
// height) with a short eased move; while he is on, captions sit in a left column clear of his face.
//
// Geometry is in SOURCE pixels of the 1080x1920 clip (measured from its alpha channel; see
// film-v5/avatar_measure.py). Until the clip exists `ready` is false and a same-size placeholder draws.
//   face      face box (forehead..chin incl. glasses/beard) and its centre x
//   hairTop   top of his hair
//   cutY      source row where the body is cut (the desk/keyboard below it never shows); the last
//             `fade` rows above it fade out, so he floats with a soft edge, not a hard crop
export const CLIP = {
  ready: true,
  src: "avatar5/windows.webm",
  fps: 25,
  dur: 65.2,
  w: 1080,
  h: 1920,
  // measured 2026-10-20 from windows.webm (130 alpha frames at 2 fps, avatar_measure.py): person x 107..1080,
  // hair top y 504..568, body to the frame bottom (hands rise to ~y 1330); face incl. glasses/beard x 510-900, y 650-1190
  face: { x: 510, y: 650, w: 390, h: 540, cx: 705 },
  hairTop: 504,
  cutY: 1800,
  fade: 200,
};

// A placement: s = scale of the source frame, fx = screen x of the face centre, bottom = screen y of
// the source frame's bottom edge. Keys take effect at `t` (film seconds) with a MOVE_S eased move.
export type Place = { t: number; s: number; fx: number; bottom: number };
export type Win = { film: [number, number]; off: number; from: "right" | "bottom" | "none"; rim: string; places: Place[]; line: string };
export const MOVE_S = 0.5;

// Window film times are the VO times of audio/v5/avatar/windows.md. Keys are placed on sentence
// starts (motivated reframes), from src/words.json:
export const WINS: Win[] = [
  {
    // hook: prominent on the cover for ~5 s, then he drops to the lower-right corner as the
    // supercomputer hall powers on and the race takes the frame
    film: [0.0, 13.12], off: 0.0, from: "none", rim: "255,203,87",
    places: [
      { t: 0, s: 0.8, fx: 742, bottom: 2010 },
      { t: 4.62, s: 0.52, fx: 858, bottom: 1882 },
    ],
    line: "Google built a chip ... in 60 seconds, you will actually understand it.",
  },
  {
    // myth: "Does it try every answer at once? Well, no. The moment you look..."
    film: [32.2, 39.1], off: 13.92, from: "right", rim: "255,170,140",
    places: [{ t: 32.2, s: 0.6, fx: 850, bottom: 1935 }],
    line: "Does it try every answer at once? Well, no. The moment you look, it lands on just one random answer.",
  },
  {
    // pool: his own analogy. Lower right while the pool plays above/beside; smaller for the wave
    // cross-section, bigger on "That's what the right answers are", back for the probability bar.
    film: [51.74, 72.4], off: 21.62, from: "right", rim: "143,243,227",
    places: [
      { t: 51.74, s: 0.6, fx: 850, bottom: 1935 },
      { t: 58.62, s: 0.53, fx: 868, bottom: 1890 },
      { t: 65.62, s: 0.66, fx: 828, bottom: 1975 },
      { t: 69.12, s: 0.57, fx: 860, bottom: 1915 },
    ],
    line: "Imagine you and your friend in a pool ... So the probability of the right answers goes up.",
  },
  {
    // ending + AI wave + CTA
    film: [92.64, 113.95], off: 43.08, from: "right", rim: "143,243,227",
    places: [
      { t: 92.64, s: 0.6, fx: 850, bottom: 1935 },
      { t: 96.72, s: 0.72, fx: 800, bottom: 1995 }, // "And here's why I want you to know." (direct, bigger)
      { t: 98.5, s: 0.54, fx: 866, bottom: 1895 }, // "Quantum computing could be the next AI wave."
      { t: 105.06, s: 0.62, fx: 846, bottom: 1950 }, // "So quantum computer would be the next thing you have to learn."
      { t: 108.96, s: 0.76, fx: 800, bottom: 2005 }, // CTA beside the FOLLOW coin
    ],
    line: "So a quantum computer isn't a faster laptop ... hit follow.",
  },
];
export const IN_FR = 9; // frames for the pop-in
export const OUT_FR = 10; // frames for the exit
