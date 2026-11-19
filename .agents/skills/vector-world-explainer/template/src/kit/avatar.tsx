import React from "react";
import { OffthreadVideo, Sequence, staticFile } from "remotion";
import { FPS } from "../beats";
import { CLIP, IN_FR, MOVE_S, OUT_FR, WINS, type Place, type Win } from "../avatar-config";

/*
 * v6: Madhav's real on-camera takes, cut out (RVM) and floating over the live animation in four
 * windows. Each window's clip (public/face/w<k>.webm, VP9 alpha) is already time-mapped to the film:
 * clip frame j = film frame fw.startFrame + j, so the Sequence starts there with startFrom 0 and the
 * picture stays in sync with his voice in public/vo.wav (same take, same source times).
 *
 * Entry: a fast pop-in from the right edge (IN_FR frames, overshoot; window 1 is already on the cover
 * at frame 0); exit in OUT_FR frames. Reframes between sentences: eased MOVE_S moves, or a hard zoom
 * cut (place.cut) on the frame where the clip jumps to another take / skips a pause.
 * Staging: the source frame's right edge off-screen; its left edge feathered (CLIP.edge); the body
 * fades out above the keyboard rows (CLIP.cutY - CLIP.fade .. CLIP.cutY); a soft contact shadow, a
 * scene-coloured rim and back light; a slow bob.
 *
 *   winAt(fr)      the window on screen at frame fr (or null) and its pop k (0..1, overshoots)
 *   placeAt(fr,w)  the current placement
 *   faceBox(fr)    his face on screen (px) at frame fr (per-frame face track), so captions and key
 *                  visuals keep clear; faceSpan(a, b) = the union over a frame range
 */
const backOut = (t: number) => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const easeInQ = (t: number) => t * t * t;
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const winFrames = (w: Win) => [w.fw.startFrame, w.fw.startFrame + w.fw.frames] as const;
const cutFrame = (t: number) => Math.ceil(t * FPS - 1e-6);

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
  let cur = w.places[0];
  for (let j = 1; j < w.places.length; j++) {
    const p = w.places[j];
    if (p.cut) {
      if (fr < cutFrame(p.t)) break;
      cur = { ...p };
      continue;
    }
    const t = fr / FPS;
    if (t < p.t) break;
    const e = inOut(Math.min(1, (t - p.t) / MOVE_S));
    const prev = cur;
    cur = { t: p.t, s: prev.s + (p.s - prev.s) * e, fx: prev.fx + (p.fx - prev.fx) * e, bottom: prev.bottom + (p.bottom - prev.bottom) * e };
  }
  return cur;
};

const box = (p: Place, cx: number) => {
  const W = CLIP.w * p.s, H = CLIP.h * p.s;
  return { left: p.fx - cx * p.s, top: p.bottom - H, W, H };
};
// face in source px at frame fr (per-frame track), falling back to the window's envelope
const srcFace = (w: Win, fr: number) => {
  const j = Math.max(0, Math.min(w.fw.frames - 1, fr - w.fw.startFrame));
  return (w.fw.faces[j] ?? w.fw.face) as number[];
};
export const faceOf = (p: Place, w: Win, fr: number) => {
  const b = box(p, w.fw.cx);
  const [x, y, fw, fh] = srcFace(w, fr);
  return { x: b.left + x * p.s, y: b.top + y * p.s, w: fw * p.s, h: fh * p.s, top: b.top + w.fw.hairTop * p.s, cut: b.top + CLIP.cutY * p.s };
};
export const faceBox = (fr: number) => { const r = winAt(fr); return r ? faceOf(placeAt(fr, r.w), r.w, fr) : null; };
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

export const Avatar: React.FC<{ fr: number }> = ({ fr }) => {
  const r = winAt(fr);
  if (!r) return null;
  const { w, k, i } = r;
  const p = placeAt(fr, w);
  const b = box(p, w.fw.cx);
  const fb = faceOf(p, w, fr);
  const [a, z] = winFrames(w);
  const away = 1 - k;
  const dx = away * (1080 - fb.x + 60);
  const dy = away * 40;
  const sc = 0.94 + 0.06 * Math.min(1.04, k);
  const bob = Math.sin(fr * 0.07 + i) * 3;
  const cutPct = (CLIP.cutY / CLIP.h) * 100, fadePct = ((CLIP.cutY - CLIP.fade) / CLIP.h) * 100;
  const edgePct = (CLIP.edge / CLIP.w) * 100;
  const vMask = `linear-gradient(to bottom, black ${fadePct}%, transparent ${cutPct}%)`;
  const hMask = b.left > -2 ? `linear-gradient(to right, transparent 0%, black ${edgePct}%)` : "linear-gradient(black, black)";
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* scene light behind him, and his soft shadow on the world */}
      <div style={{ position: "absolute", left: fb.x - 380 + dx, top: fb.top - 160 + dy, width: 900, height: 1920 - fb.top + 300, background: `radial-gradient(ellipse 48% 42% at 50% 40%, rgba(${w.rim},0.2), rgba(${w.rim},0) 70%)` }} />
      <div style={{ position: "absolute", left: fb.x - 340 + dx, top: fb.top + 80 + dy, width: 780, height: 1920 - fb.top, background: "radial-gradient(ellipse 46% 55% at 50% 60%, rgba(10,4,32,0.6), rgba(10,4,32,0) 72%)" }} />
      <div style={{ position: "absolute", inset: 0, transform: `translate(${dx}px, ${dy + bob}px) scale(${sc})`, transformOrigin: `${p.fx}px 1920px`, filter: `drop-shadow(0 0 1px rgba(${w.rim},0.3)) drop-shadow(-4px -3px 8px rgba(${w.rim},0.12)) drop-shadow(-18px 20px 26px rgba(8,3,28,0.5))` }}>
        <div style={{ position: "absolute", left: b.left, top: b.top, width: b.W, height: b.H, WebkitMaskImage: `${vMask}, ${hMask}`, maskImage: `${vMask}, ${hMask}`, WebkitMaskComposite: "source-in", maskComposite: "intersect" }}>
          <Sequence from={a} durationInFrames={z - a} layout="none">
            <OffthreadVideo src={staticFile(w.fw.src)} transparent muted style={{ width: "100%", height: "100%", display: "block", filter: "saturate(0.96) contrast(1.02)" }} />
          </Sequence>
        </div>
      </div>
    </div>
  );
};
export { WINS, CLIP };
