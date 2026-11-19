// The real presenter, v6 staging (the default for this format). Never regenerated, retouched or zoomed: the same
// pixels as his take, cut out with a local u2net matte (public/matte/m0-1440.webm, VP9 alpha, -g 15).
//
// v6 (Madhav 2026-10-24: "my face could be bigger, it can cross the 50% mark"): scale 0.88, shifted left so the far
// shoulder runs off the left edge; head top ~y 770-950, body to the bottom edge, figure ~x 0-760 on the 1080x1920
// canvas. Mirrored (2026-10-23: "flip it so my hands focus on the middle of the screen"; it also puts the camera
// frame's cut edge at the screen's left edge) and feathered on the right (82% -> 100% of the frame width), so there
// is never a hard frame edge. He never moves, scales or leaves (2026-10-21: "zoom in and zoom out on my face... I
// hate that"); the end card plays over him too.
import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import { EDL, FPS, H, IS_SAMPLE, W, type Seg } from "./lib";

export const STAGE = { scale: 0.88, x: -80, y: 234, featherFrom: 82, mirror: true };

// Screen-space box of his head + hair (union over the clip) in v6 staging. Keep every graphic and caption clear of
// it. RE-MEASURE per take from stills (t = 10 s or so): framing differs between recordings.
export const SIDE_FACE = { x: 0, y: 770, w: 680, h: 620 };

// One Sequence per EDL segment. "twin" segments play an optional HeyGen twin matte; "idle" segments play silent
// listening footage (kept for completeness; see reference/pitfalls.md: idle footage under a cloned voice looks fake).
const segFile = (s: Seg) => (s.twin ? "matte/twin-m1440.webm" : s.idle ? "matte/idle-m1440.webm" : "matte/m0-1440.webm");
const CutOut: React.FC = () => (
  <>
    {EDL.map((seg, j) => (
      <Sequence key={j} from={Math.round(seg.out * FPS)} durationInFrames={Math.max(1, Math.round(seg.len * FPS))} layout="none">
        <OffthreadVideo src={staticFile(segFile(seg))} transparent muted trimBefore={Math.round(seg.src * FPS)} style={{ width: W, height: H, position: "absolute" }} />
      </Sequence>
    ))}
  </>
);

// Sample spine only (no footage): a flat silhouette in the same box, so stills of the template render.
const Placeholder: React.FC = () => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
    <ellipse cx={330} cy={1020} rx={175} ry={215} fill="#3b3b48" />
    <path d="M -40 1920 L -40 1500 Q 40 1300 330 1290 Q 640 1300 720 1500 L 760 1920 Z" fill="#33333f" />
    <text x={330} y={1040} textAnchor="middle" fontFamily="Arial" fontSize={34} fill="#9a9ab0">presenter cut-out</text>
  </svg>
);

// Compatibility with worlds written for the older shell: the presenter state is constant in this format.
export type PState = { s: number; x: number; y: number; garden: number; tile: number; vis: boolean };
export const presenter = (_t: number): PState & { alpha: number } => ({ s: STAGE.scale, x: STAGE.x, y: STAGE.y, garden: 0, tile: 0, vis: true, alpha: 1 });

export const Presenter: React.FC<{ t?: number; cutoutFilter?: string }> = ({ cutoutFilter }) => {
  if (IS_SAMPLE) return <Placeholder />;
  const mask = `linear-gradient(to right, #000 ${STAGE.featherFrom}%, transparent 100%)`;
  return (
    <AbsoluteFill style={{ transform: `translate(${STAGE.x}px, ${STAGE.y}px) scale(${STAGE.scale})`, transformOrigin: "0 0", WebkitMaskImage: mask, maskImage: mask }}>
      <AbsoluteFill style={{ filter: cutoutFilter, transform: STAGE.mirror ? "scaleX(-1)" : undefined, transformOrigin: "50% 50%" }}>
        <CutOut />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
