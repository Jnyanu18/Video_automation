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
// Footage sources. HI = the 1440x2560 copies from the raw (scripts/hires_1440.sh) for Instagram-max renders
// (--scale=1.3333); v1/v2 used the 1080 proxy and 720 mattes.
const HI = true;
const PROXY = HI ? "proxy-1440.mp4" : "proxy-1080.mp4";
const clipFile = (i: number) => (HI ? `matte/c${i}-1440.mp4` : `matte/c${i}.mp4`);
const matteFile = (m: Matte & { i: number }) => (HI ? `matte/m${m.i}-1440.webm` : m.file);
const MATTES = (mattes as Matte[]).map((m, i) => {
  const o0 = outOf(m.srcStart), o1 = outOf(m.srcStart + m.frames / (30000 / 1001));
  return { ...m, i, o0, o1 };
});

export type PState = { s: number; x: number; y: number; garden: number; tile: number; vis: boolean };

const SIDE_S = 0.66;
const FWD_A = [430, 720] as const; // push-in anchor (his face region in the source)
const side = (): PState => ({ s: SIDE_S, x: 0, y: H * (1 - SIDE_S), garden: 0, tile: 0, vis: true });
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

export const presenter = (t: number): PState => {
  const i = beatIdx(t), cur = BEATS[i], prev = BEATS[i - 1], next = BEATS[i + 1];
  // which boundary are we nearest to (inside its transition window)?
  let a: Beat | undefined, b: Beat | undefined;
  if (next && t >= next.s - T0) { a = cur; b = next; }
  else if (prev && t < cur.s + T1) { a = prev; b = cur; }
  if (!a || !b || a.mode === b.mode) {
    // steady state; OUT/END after a tile exit: the tile flies on into the world, then is gone
    if (cur.mode === "OUT" || cur.mode === "END") {
      const p = cur.tile ?? next?.tile;
      if (prev && onFrame(prev.mode) && p) {
        const k = (t - (cur.s + T1)) / 1.1;
        if (k < 1) return { ...tileAt(p, lerp(0.22, 0.02, easeInOut(Math.max(0, k)))), vis: true };
      }
      if (next && onFrame(next.mode) && (next.tile)) {
        const k = (t - (next.s - T0 - 1.0)) / 1.0; // emerge from the point before growing
        if (k > 0) return tileAt(next.tile, lerp(0.02, 0.22, easeInOut(Math.min(1, k))));
      }
      return { ...offLeft(), vis: false };
    }
    return modeState(cur.mode, cur, t);
  }
  const k = easeInOut(smooth((t - (b.s - T0)) / (T0 + T1)));
  const tileP = b.tile ?? a.tile;
  const sa = modeState(a.mode, a, t), sb = modeState(b.mode, b, t);
  if (onFrame(a.mode) && (b.mode === "OUT" || b.mode === "END") && tileP) return mix(sa, tileAt(tileP, 0.22), k);
  if ((a.mode === "OUT") && onFrame(b.mode) && tileP) return mix(tileAt(tileP, 0.22), sb, k);
  if (a.mode === "OUT" && b.mode === "SIDE") return mix(offLeft(), sb, k);
  if (a.mode === "SIDE" && b.mode === "OUT") return { ...mix(sa, offLeft(), k), vis: k < 0.999 };
  return mix(sa, sb, k);
};

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

// `look` lets each film dress the cut-out (rim light, paper sticker edge) and the tile frame.
export const Presenter: React.FC<{ t: number; cutoutFilter?: string; tileStyle?: React.CSSProperties }> = ({ t, cutoutFilter, tileStyle }) => {
  const st = presenter(t);
  if (!st.vis) return null;
  const m = matteAt(t);
  const useMatte = needsMatte(st) && !!m;
  const tr = `translate(${st.x}px, ${st.y}px) scale(${st.s})`;
  return (
    <AbsoluteFill style={{ transform: tr, transformOrigin: "0 0", ...(st.tile > 0 ? { borderRadius: 70 * st.tile / Math.max(st.s, 0.05) * 0.2, overflow: "hidden", ...tileStyle } : {}) }}>
      {useMatte ? (
        <AbsoluteFill style={{ filter: st.garden < 0.5 ? cutoutFilter : undefined }}>
          <MatteLayer m={m!} garden={st.garden} />
        </AbsoluteFill>
      ) : (
        <Footage />
      )}
    </AbsoluteFill>
  );
};

// Screen-space box of his face when cut out at the side (for keeping captions and graphics clear).
export const SIDE_FACE = { x: 90, y: 940, w: 280, h: 300 };
