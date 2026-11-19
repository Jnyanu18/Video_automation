// The real presenter. Never regenerated or retouched: full-frame footage (FULL/FWD), or the same
// pixels cut out with a local matte (SIDE). Mode changes move one layer; the garden background
// fades only while the person stays solid.
//
// Timing: footage is the H.264 proxy of the raw take, placed by the EDL. Each SIDE stretch has a
// clip (cN.mp4, person + garden) and its matte (mN.webm) cut from the same frames, so the two are
// always aligned with each other; they replace the proxy only inside their window.
import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import { BEATS, beatIdx, type Beat, type Mode } from "./beats";
import { EDL, FPS, H, W, easeInOut, lerp, outOf, segIdx, smooth, srcAt } from "./lib";
import mattes from "./mattes.json";

type Matte = { file: string; srcStart: number; frames: number };
// Footage: the clip's 1440x2560 proxy cut from the raw. One matte covers the whole clip (m0-1440.webm =
// colour from the 1440 proxy + u2net alpha matted at 720 and upscaled), so SIDE can be used anywhere.
const PROXY = "proxy-1440.mp4";
const clipFile = (_i: number) => PROXY; // the whole-clip matte is cut from the proxy itself (srcStart 0)
const matteFile = (m: Matte & { i: number }) => `matte/m${m.i}-1440.webm`;
const MATTES = (mattes as Matte[]).map((m, i) => {
  const o0 = outOf(m.srcStart), o1 = outOf(m.srcStart + m.frames / (30000 / 1001));
  return { ...m, i, o0, o1 };
});

export type PState = { s: number; x: number; y: number; garden: number; tile: number; vis: boolean };

// v6 (Madhav 2026-10-24: "my face could be bigger, it can cross the 50% mark"): 0.88 scale, shifted left (copied from c2-bubble v6).
const SIDE_S = 0.88, SIDE_X = -80, SIDE_Y = 234;
const FWD_A = [430, 720] as const; // push-in anchor (his face region in the source)
const side = (): PState => ({ s: SIDE_S, x: SIDE_X, y: SIDE_Y, garden: 0, tile: 0, vis: true });
const offLeft = (): PState => ({ s: SIDE_S, x: -820, y: H * (1 - SIDE_S) + 260, garden: 0, tile: 0, vis: true });
// Zoom cut: every EDL cut flips a subtle punch-in, so pause trims in full frame read as deliberate cuts.
const punch = (t: number) => (segIdx(t) % 2 ? 1.07 : 1);
const full = (t: number): PState => { const s = punch(t); return { s, x: FWD_A[0] * (1 - s), y: FWD_A[1] * (1 - s), garden: 1, tile: 0, vis: true }; };
const fwd = (b: Beat, t: number): PState => {
  const k = smooth((t - b.s) / Math.max(1, b.e - b.s));
  const s = lerp(1.1, 1.2, k) * punch(t);
  return { s, x: FWD_A[0] * (1 - s), y: FWD_A[1] * (1 - s), garden: 1, tile: 0, vis: true };
};
// the whole frame as a small rounded tile centred at p
const tileAt = (p: readonly [number, number], s: number): PState => ({ s, x: p[0] - (W * s) / 2, y: p[1] - (H * s) / 2, garden: 1, tile: 1, vis: true });

const modeState = (m: Mode, b: Beat, t: number): PState =>
  m === "FULL" ? full(t) : m === "FWD" ? fwd(b, t) : m === "SIDE" ? side() : offLeft();

// The garden clears in the first ~45% of a move away from the frame and returns in the last ~45%
// of a move back, so the box of background never lingers half-transparent while the person travels.
const mix = (a: PState, b: PState, k: number): PState => ({
  s: lerp(a.s, b.s, k), x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k),
  garden: a.garden > b.garden ? 1 - smooth(k / 0.45) : a.garden < b.garden ? smooth((k - 0.55) / 0.45) : a.garden,
  tile: lerp(a.tile, b.tile, k), vis: true,
});

const T0 = 0.25, T1 = 0.4; // a transition runs from boundary-T0 to boundary+T1
const onFrame = (m: Mode) => m === "FULL" || m === "FWD";

// v2 (Madhav 2026-10-21: "too much motion... zoom in and zoom out on my face, it goes in the middle, I hate that"):
// his footage never scales, slides or flies. FULL and FWD are the same still full frame (no punch-ins, no push-ins),
// SIDE is a still cut-out bottom-left, OUT/END hide him. A mode change is a quick dip: the old state fades out
// over 0.15 s and the new one fades in over 0.15 s. `tile` points are ignored (worlds may still use them).
const FADE = 0.15;
const calm = (m: Mode): PState => (m === "SIDE" ? side() : m === "OUT" || m === "END" ? { ...offLeft(), vis: false } : still());
const still = (): PState => ({ s: 1, x: 0, y: 0, garden: 1, tile: 0, vis: true });
export const presenterV2 = (t: number): PState & { alpha: number } => {
  const i = beatIdx(t), cur = BEATS[i], prev = BEATS[i - 1], next = BEATS[i + 1];
  const sc = calm(cur.mode);
  if (next && next.mode !== cur.mode && t >= next.s - FADE) return { ...sc, alpha: (next.s - t) / FADE };
  if (prev && prev.mode !== cur.mode && t < cur.s + FADE) return { ...sc, alpha: (t - cur.s) / FADE };
  return { ...sc, alpha: 1 };
};
export const presenter = (_t: number): PState & { alpha: number } => ({ ...side(), alpha: 1 });
void presenterV2; void tileAt; void mix; void modeState; void T0; void T1; void onFrame; void easeInOut;

const matteAt = (t: number) => MATTES.find((m) => t >= m.o0 + 0.02 && t < m.o1 - 0.04);

// Uses the matte layers when the person needs to be separable (garden < 1) and a matte covers t.
export const needsMatte = (st: PState) => st.garden < 0.999 && st.tile < 0.01;

const Footage: React.FC = () => (
  <>
    {EDL.map((seg, j) => (
      <Sequence key={j} from={Math.round(seg.out * FPS)} durationInFrames={Math.round(seg.len * FPS)} layout="none">
        <OffthreadVideo src={staticFile(PROXY)} muted trimBefore={Math.round(seg.src * FPS)} style={{ width: W, height: H, position: "absolute" }} />
      </Sequence>
    ))}
  </>
);

// One Sequence per EDL segment the matte window spans, so pause trims and word cuts inside a SIDE
// stretch jump the clip + matte exactly like the proxy.
const MatteLayer: React.FC<{ m: (typeof MATTES)[number]; garden: number }> = ({ m, garden }) => {
  const f0 = Math.ceil(m.o0 * FPS), f1 = Math.floor(m.o1 * FPS);
  const parts = EDL.map((seg) => [Math.max(f0, Math.round(seg.out * FPS)), Math.min(f1, Math.round((seg.out + seg.len) * FPS))]).filter(([a, b]) => b > a);
  return (
    <>
      {parts.map(([from, to]) => {
        const trim = Math.round((srcAt(from / FPS) - m.srcStart) * FPS);
        return (
          <Sequence key={from} from={from} durationInFrames={to - from} layout="none">
            {garden > 0.001 && <OffthreadVideo src={staticFile(clipFile(m.i))} muted trimBefore={trim} style={{ width: W, height: H, position: "absolute", opacity: garden }} />}
            <OffthreadVideo src={staticFile(matteFile(m))} transparent muted trimBefore={trim} style={{ width: W, height: H, position: "absolute" }} />
          </Sequence>
        );
      })}
    </>
  );
};

// v3 (Madhav 2026-10-23: "keep my face for longer on the left side of the screen... always there till at last"):
// he is ALWAYS the still cut-out bottom-left (SIDE) for the whole video, including the end card. Each EDL segment
// plays either his real take (proxy matte m0) or, under ElevenLabs lines, his idle "listening" footage (idle matte,
// built from silent moments of the same take). Modes in beats.ts no longer move or hide him.
type Seg3 = { out: number; src: number; len: number; idle?: boolean; twin?: boolean };
// v4: "twin" segments play his HeyGen twin (look trained on this same take) speaking the ElevenLabs lines.
const segFile = (s: Seg3) => (s.twin ? "matte/twin-m1440.webm" : s.idle ? "matte/idle-m1440.webm" : "matte/m0-1440.webm");
const CutOut: React.FC = () => (
  <>
    {(EDL as Seg3[]).map((seg, j) => (
      <Sequence key={j} from={Math.round(seg.out * FPS)} durationInFrames={Math.max(1, Math.round(seg.len * FPS))} layout="none">
        <OffthreadVideo src={staticFile(segFile(seg))} transparent muted trimBefore={Math.round(seg.src * FPS)} style={{ width: W, height: H, position: "absolute" }} />
      </Sequence>
    ))}
  </>
);
export const presenterV3 = (): PState & { alpha: number } => ({ ...side(), alpha: 1 });
export const Presenter: React.FC<{ t: number; cutoutFilter?: string; tileStyle?: React.CSSProperties }> = ({ cutoutFilter }) => {
  const st = side();
  const tr = `translate(${st.x}px, ${st.y}px) scale(${st.s})`;
  return (
    <AbsoluteFill style={{ transform: tr, transformOrigin: "0 0", WebkitMaskImage: "linear-gradient(to right, #000 82%, transparent 100%)", maskImage: "linear-gradient(to right, #000 82%, transparent 100%)" }}>
      {/* Mirrored (Madhav 2026-10-23: "flip it so my hands focus on the middle of the screen"). This also puts the
          camera frame's edge, where his hoodie is cut, at the screen's left edge instead of mid-screen. */}
      <AbsoluteFill style={{ filter: cutoutFilter, transform: "scaleX(-1)", transformOrigin: "50% 50%" }}>
        <CutOut />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
void MatteLayer; void Footage; void matteAt; void needsMatte; void clipFile; void matteFile;

// Screen-space box of his face when cut out at the side (for keeping captions and graphics clear).
export const SIDE_FACE = { x: 10, y: 840, w: 610, h: 550 }; // v6 big cut-out (0.88, x -80, y 234): head + hair union at t 2/10/25/40/52 (v5 was x 120, y 1090, 440x500)
