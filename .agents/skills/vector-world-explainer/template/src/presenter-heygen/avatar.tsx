import React from "react";
import { OffthreadVideo, Sequence, staticFile } from "remotion";
import { FPS } from "../beats";
import { CLIP, IN_FR, MOVE_S, OUT_FR, WINS, type Place, type Win } from "./avatar-config";

/*
 * FALLBACK PRESENTER (HeyGen), from the quantum film v5. Use only when Madhav has no on-camera takes
 * and approves the HeyGen spend. To switch: import Avatar / faceBox / faceSpan / WINS from
 * "./presenter-heygen/avatar" instead of "./kit/avatar" in Film.tsx, CaptionView.tsx and events.ts.
 * Default bursts are 3-4 s (one sentence); long floating windows only when he asks (v5 did).
 * The HeyGen clip is 25 fps inside a 30 fps film: the clip is mapped by TIME (startFrom below).
 *
 * Madhav's presenter (avatar v5) in four long windows, floating over the live animation.
 * Each window: a fast pop-in from the right edge (IN_FR frames, overshoot; window 1 is already on the
 * cover at frame 0), his own sentences with motivated reframes between them (MOVE_S eased moves of
 * scale / x / height), an exit in OUT_FR frames. The clip plays through Remotion OffthreadVideo
 * (transparent, muted), time-mapped per window (see avatar-config.ts).
 *
 * Staging: half-body on the right, the source frame's right edge (his cut shoulder) off the frame
 * edge or feathered; the body below CLIP.cutY fades out (no desk/keyboard, no hard crop line); a
 * soft contact shadow and a rim light in the scene's palette sit him in the world; a slow bob.
 *
 *   winAt(fr)      the window on screen at frame fr (or null) and its pop k (0..1, overshoots)
 *   placeAt(fr,w)  the current placement (interpolated between keys)
 *   faceBox(fr)    his face on screen (px) at frame fr, so captions and key visuals keep clear
 */
const backOut = (t: number) => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const easeInQ = (t: number) => t * t * t;
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const winFrames = (w: Win) => [Math.round(w.film[0] * FPS), Math.round(w.film[1] * FPS)] as const;

export const winAt = (fr: number): { w: Win; k: number; i: number } | null => {
  for (let i = 0; i < WINS.length; i++) {
    const w = WINS[i];
    const [a, z] = winFrames(w);
    if (fr < a || fr >= z) continue;
    const kin = w.from === "none" ? 1 : Math.min(1, (fr - a) / IN_FR); // first frame fully off, slides in
    const kout = Math.min(1, (z - 1 - fr) / (OUT_FR - 1)); // last frame fully off
    return { w, i, k: Math.min(backOut(kin), 1 - easeInQ(1 - kout)) };
  }
  return null;
};
export const avatarOn = (fr: number) => { const r = winAt(fr); return r ? Math.min(1, r.k) : 0; };

export const placeAt = (fr: number, w: Win): Place => {
  const t = fr / FPS;
  let cur = w.places[0];
  for (let j = 1; j < w.places.length; j++) {
    const p = w.places[j];
    if (t < p.t) break;
    const u = Math.min(1, (t - p.t) / MOVE_S);
    const e = inOut(u);
    const prev = cur;
    cur = { t: p.t, s: prev.s + (p.s - prev.s) * e, fx: prev.fx + (p.fx - prev.fx) * e, bottom: prev.bottom + (p.bottom - prev.bottom) * e };
  }
  return cur;
};

// screen placement of the full source frame
const box = (p: Place) => {
  const W = CLIP.w * p.s, H = CLIP.h * p.s;
  return { left: p.fx - CLIP.face.cx * p.s, top: p.bottom - H, W, H };
};
export const faceOf = (p: Place) => {
  const b = box(p);
  return { x: b.left + CLIP.face.x * p.s, y: b.top + CLIP.face.y * p.s, w: CLIP.face.w * p.s, h: CLIP.face.h * p.s, top: b.top + CLIP.hairTop * p.s, cut: b.top + CLIP.cutY * p.s };
};
export const faceBox = (fr: number) => { const r = winAt(fr); return r ? faceOf(placeAt(fr, r.w)) : null; };
// Same API as the real-face presenter (src/kit/avatar.tsx), so CaptionView works with either.
export const faceSpan = (a: number, b: number) => {
  let u: { x: number; y: number; w: number; h: number; top: number; cut: number } | null = null;
  for (let fr = a; fr <= b; fr += 2) {
    const f = faceBox(fr);
    if (!f) continue;
    if (!u) { u = { ...f }; continue; }
    const x0 = Math.min(u.x, f.x), y0 = Math.min(u.y, f.y), x1 = Math.max(u.x + u.w, f.x + f.w), y1 = Math.max(u.y + u.h, f.y + f.h);
    u = { x: x0, y: y0, w: x1 - x0, h: y1 - y0, top: Math.min(u.top, f.top), cut: Math.max(u.cut, f.cut) };
  }
  return u;
};

const Placeholder: React.FC<{ p: Place; label: string }> = ({ p, label }) => {
  const s = p.s, b = box(p);
  const X = (x: number) => b.left + x * s, Y = (y: number) => b.top + y * s;
  const cx = CLIP.face.cx;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
      <path d={`M${X(330)},${Y(CLIP.cutY)} C${X(330)},${Y(1250)} ${X(470)},${Y(1130)} ${X(620)},${Y(1110)} L${X(880)},${Y(1110)} C${X(1000)},${Y(1130)} ${X(1080)},${Y(1180)} ${X(1080)},${Y(1260)} L${X(1080)},${Y(CLIP.cutY)}Z`} fill="#6B6A63" />
      <rect x={X(cx - 70)} y={Y(1080)} width={140 * s} height={90 * s} fill="#B98A6E" />
      <ellipse cx={X(cx)} cy={Y(950)} rx={170 * s} ry={250 * s} fill="#C99A7C" />
      <path d={`M${X(cx - 200)},${Y(900)} C${X(cx - 220)},${Y(540)} ${X(cx + 220)},${Y(540)} ${X(cx + 200)},${Y(900)} C${X(cx + 150)},${Y(700)} ${X(cx - 150)},${Y(700)} ${X(cx - 200)},${Y(900)}Z`} fill="#1E1A2E" />
      <rect x={X(cx - 60)} y={Y(1050)} width={120 * s} height={30 * s} rx={14 * s} fill="#7A4A44" opacity={0.7} />
      <text x={X(cx)} y={Y(1500)} textAnchor="middle" fontSize={28} fill="#FFF4D6" fontFamily="sans-serif">{label}</text>
    </svg>
  );
};

export const Avatar: React.FC<{ fr: number }> = ({ fr }) => {
  const r = winAt(fr);
  if (!r) return null;
  const { w, k, i } = r;
  const p = placeAt(fr, w);
  const b = box(p);
  const fb = faceOf(p);
  const [a, z] = winFrames(w);
  // pop: slide in from the right edge with an overshoot (window 1 is on the cover already)
  const away = 1 - k;
  const dx = away * (1080 - fb.x + 60);
  const dy = away * 40;
  const sc = 0.94 + 0.06 * Math.min(1.04, k);
  const bob = Math.sin(fr * 0.07 + i) * 3;
  // the clip time of film frame a (the window start), as a frame number at the film's fps
  const startFrom = Math.max(0, Math.round((w.off + a / FPS - w.film[0]) * FPS));
  // feather the source frame's right edge (his cut shoulder) when it lands inside the frame; fade
  // the body out above the cut row (no desk / keyboard)
  const cutPct = (CLIP.cutY / CLIP.h) * 100, fadePct = ((CLIP.cutY - CLIP.fade) / CLIP.h) * 100;
  const vMask = `linear-gradient(to bottom, black ${fadePct}%, transparent ${cutPct}%)`;
  const hMask = b.left + b.W < 1080 ? "linear-gradient(to right, black calc(100% - 40px), transparent 100%)" : "linear-gradient(black, black)";
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* scene light behind him, and his soft shadow on the world */}
      <div style={{ position: "absolute", left: fb.x - 380 + dx, top: fb.top - 160 + dy, width: 900, height: 1920 - fb.top + 300, background: `radial-gradient(ellipse 48% 42% at 50% 40%, rgba(${w.rim},0.2), rgba(${w.rim},0) 70%)` }} />
      <div style={{ position: "absolute", left: fb.x - 340 + dx, top: fb.top + 80 + dy, width: 780, height: 1920 - fb.top, background: "radial-gradient(ellipse 46% 55% at 50% 60%, rgba(10,4,32,0.6), rgba(10,4,32,0) 72%)" }} />
      <div style={{ position: "absolute", inset: 0, transform: `translate(${dx}px, ${dy + bob}px) scale(${sc})`, transformOrigin: `${p.fx}px 1920px`, filter: `drop-shadow(0 0 1px rgba(${w.rim},0.32)) drop-shadow(-4px -3px 8px rgba(${w.rim},0.14)) drop-shadow(-18px 20px 26px rgba(8,3,28,0.5))` }}>
        {CLIP.ready ? (
          <div style={{ position: "absolute", left: b.left, top: b.top, width: b.W, height: b.H, WebkitMaskImage: `${vMask}, ${hMask}`, maskImage: `${vMask}, ${hMask}`, WebkitMaskComposite: "source-in", maskComposite: "intersect" }}>
            <Sequence from={a} durationInFrames={z - a} layout="none">
              <OffthreadVideo src={staticFile(CLIP.src)} startFrom={startFrom} transparent muted style={{ width: "100%", height: "100%", display: "block" }} />
            </Sequence>
          </div>
        ) : (
          <Placeholder p={p} label={`AVATAR v5 · win ${i + 1} · src ${(w.off + fr / FPS - w.film[0]).toFixed(2)}s`} />
        )}
      </div>
    </div>
  );
};
export { WINS, CLIP };
