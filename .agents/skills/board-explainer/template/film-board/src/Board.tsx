import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/Kalam";
import ITEMS from "./items.json";
import TL from "./timeline.json";

/*
 * Caleb-style iPad board. All drawing comes from items.json (live/board_spec.py), timed to words in timeline.json.
 * Five boards side by side in one world (board b at x = b*1920); the camera pans between them.
 * While Madhav's real face is on (F segments), the board shrinks toward the top-left and his matted cut-out sits
 * bottom-right; the opening hook (f01) shows him large on the left instead.
 */
export const HAND = loadFont("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;
const FPS = 30;
export type Item = { kind: string; board: number; t0: number; dur: number; t1?: number; color?: string; w?: number; pts?: number[][]; dash?: boolean; x?: number; y?: number; text?: string; size?: number; rot?: number; op?: number; ang?: number; len?: number; cx?: number; cy?: number };
const D = ITEMS as unknown as { total: number; boards: { b: number; t0: number }[]; items: Item[] };
const SEGS = (TL as unknown as { segments: { id: string; who: string; t0: number; t1: number; full?: boolean }[] }).segments;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.25, 0.8, 0.25, 1);
const inOut = Easing.bezier(0.45, 0, 0.55, 1);

// ---- geometry: partial polyline up to fraction p, and its head point ----
const plen = (pts: number[][]) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
export const partial = (pts: number[][], p: number): { pts: number[][]; head: number[] } => {
  if (p >= 1) return { pts, head: pts[pts.length - 1] };
  const target = plen(pts) * p; let acc = 0; const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + d >= target) { const k = d ? (target - acc) / d : 0; const h = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; out.push(h); return { pts: out, head: h }; }
    acc += d; out.push(pts[i]);
  }
  return { pts: out, head: pts[pts.length - 1] };
};
// smooth path through points (Catmull-Rom -> cubic Bezier)
const smooth = (p: number[][]) => {
  if (p.length < 3) return p.map((q, i) => `${i ? "L" : "M"}${q[0]} ${q[1]}`).join(" ");
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  }
  return d;
};

export const progress = (it: Item, t: number) => interpolate(t, [it.t0, it.t0 + it.dur], [0, 1], { ...clamp, easing: Easing.bezier(0.35, 0.1, 0.4, 1) });
const fadeOut = (it: Item, t: number) => (it.t1 ? interpolate(t, [it.t1, it.t1 + 0.4], [1, 0], clamp) : 1);

export const DrawItem: React.FC<{ it: Item; t: number; fr: number }> = ({ it, t, fr }) => {
  const p = progress(it, t), o = fadeOut(it, t);
  if (p <= 0 || o <= 0) return null;
  const gx = it.board * 1920;
  if (it.kind === "stroke") {
    const { pts } = partial(it.pts!, p);
    return <path d={smooth(pts.map(([x, y]) => [x + gx, y]))} fill="none" stroke={it.color} strokeWidth={it.w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={it.dash ? "14 11" : undefined} opacity={o} />;
  }
  if (it.kind === "text") {
    const SZ = it.size! * 1.1; const w = (it.text!.length * SZ * 0.64 + 60) * p;
    const id = `clip-${it.t0}-${it.x}-${it.y}`.replace(/\./g, "_");
    return (
      <g opacity={o} transform={`rotate(${it.rot ?? 0} ${gx + it.x!} ${it.y!})`}>
        <clipPath id={id}><rect x={gx + it.x! - 10} y={it.y! - SZ * 1.3} width={w} height={SZ * 1.8} /></clipPath>
        <text x={gx + it.x!} y={it.y!} fontFamily={HAND} fontWeight={700} fontSize={SZ} fill={it.color} clipPath={`url(#${id})`}>{it.text}</text>
      </g>
    );
  }
  if (it.kind === "fill") {
    return <polygon points={it.pts!.map(([x, y]) => `${x + gx},${y}`).join(" ")} fill={it.color} opacity={(it.op ?? 1) * p * o} />;
  }
  if (it.kind === "php") {
    const s = spring({ frame: fr - Math.round(it.t0 * FPS), fps: FPS, config: { damping: 14, stiffness: 160 } });
    const w = it.w!;
    return (
      <g transform={`translate(${gx + it.cx!} ${it.cy!}) scale(${0.7 + 0.3 * s})`} opacity={Math.min(1, s * 1.4) * o}>
        <ellipse rx={w / 2} ry={w * 0.27} fill="#7a86b8" stroke="#2b2f4a" strokeWidth={4} />
        <text textAnchor="middle" y={w * 0.1} fontFamily="Georgia, serif" fontStyle="italic" fontWeight={700} fontSize={w * 0.34} fill="#1f2340">php</text>
      </g>
    );
  }
  if (it.kind === "stamp") {
    const s = spring({ frame: fr - Math.round(it.t0 * FPS), fps: FPS, config: { damping: 11, stiffness: 190 } });
    const L = it.len!, h = 46;
    // flat red block arrow, tip at (x, y), pointing along ang (degrees: 0 = right, 90 = down)
    return (
      <g transform={`translate(${gx + it.x!} ${it.y!}) rotate(${it.ang!}) scale(${0.6 + 0.4 * Math.min(1, s)})`} opacity={Math.min(1, s * 1.5) * o}>
        <polygon points={`0,0 ${-h * 1.4},${-h * 1.3} ${-h * 1.4},${-h * 0.5} ${-L},${-h * 0.5} ${-L},${h * 0.5} ${-h * 1.4},${h * 0.5} ${-h * 1.4},${h * 1.3}`} fill="#ff2b2b" />
      </g>
    );
  }
  return null;
};

// the pencil: Apple-Pencil-like, tip at the current drawing head
export const Pencil: React.FC<{ x: number; y: number; o: number }> = ({ x, y, o }) => (
  <g transform={`translate(${x} ${y}) rotate(32)`} opacity={o} style={{ filter: "drop-shadow(6px 10px 8px rgba(0,0,0,0.6))" }}>
    <polygon points="0,0 -7,-26 7,-26" fill="#cfcfd4" />
    <polygon points="0,0 -2.5,-9 2.5,-9" fill="#3a3a40" />
    <rect x={-9} y={-250} width={18} height={226} rx={7} fill="#f4f4f6" />
    <rect x={-9} y={-120} width={18} height={4} fill="#d9d9de" />
  </g>
);

const boardAt = (t: number) => { let b = D.boards[0]; for (const x of D.boards) if (t >= x.t0) b = x; return b; };
const camX = (t: number) => {
  // pan between boards over 0.8 s starting at each board's t0
  let x = 0;
  for (let i = 1; i < D.boards.length; i++) {
    const a = D.boards[i - 1], b = D.boards[i];
    x = interpolate(t, [b.t0, b.t0 + 0.8], [a.b * 1920, b.b * 1920], { ...clamp, easing: inOut });
    if (t < b.t0 + 0.8) return i === 1 || t >= b.t0 ? x : a.b * 1920;
  }
  return x;
};
const faceSeg = (t: number) => SEGS.find((s) => s.who === "F" && t >= s.t0 - 0.25 && t < s.t1 + 0.25);

export const Board: React.FC<{ faces?: boolean }> = ({ faces = false }) => {
  const fr = useCurrentFrame(), t = fr / FPS;
  const cx = camX(t);
  const panning = D.boards.some((b, i) => i > 0 && t >= b.t0 && t < b.t0 + 0.8);
  // board shrink while a (non-hook) face segment is on
  let faceOn = 0;
  for (const s of SEGS) if (s.who === "F" && !s.full) faceOn = Math.max(faceOn, interpolate(t, [s.t0 - 0.35, s.t0, s.t1, s.t1 + 0.35], [0, 1, 1, 0], { ...clamp, easing: ease }));
  const sc = 1 - 0.16 * faceOn;
  const zoom = 1 + 0.015 * Math.sin(t * 0.21);
  // active pencil head: the latest item currently being drawn
  let head: number[] | null = null;
  for (const it of D.items) {
    const p = progress(it, t);
    if (p > 0 && p < 1 && (it.kind === "stroke" || it.kind === "text")) {
      if (it.kind === "stroke") { const h = partial(it.pts!, p).head; head = [h[0] + it.board * 1920, h[1]]; }
      else head = [it.board * 1920 + it.x! + it.text!.length * it.size! * 1.1 * 0.5 * p, it.y! - it.size! * 0.3];
    }
  }
  const visible = D.items.filter((it) => Math.abs(it.board * 1920 - cx) < 2000 && it.t0 <= t);
  return (
    <AbsoluteFill style={{ background: "#050505" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, filter: panning ? "blur(1.5px)" : undefined }}>
        <defs>
          <filter id="pencil" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={4} result="wob" />
            <feDisplacementMap in="SourceGraphic" in2="wob" scale={2.2} xChannelSelector="R" yChannelSelector="G" result="d" />
            <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves={1} seed={9} result="grain" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.25" result="ga" />
            <feComposite in="d" in2="ga" operator="in" />
          </filter>
        </defs>
        <g transform={`scale(${sc * zoom}) translate(${-cx} 0)`}>
          <g filter="url(#pencil)">{visible.map((it, i) => <DrawItem key={i} it={it} t={t} fr={fr} />)}</g>
          {head && <Pencil x={head[0]} y={head[1]} o={1} />}
        </g>
      </svg>
      {/* Madhav's real face: matted cut-out from take 0162, frame-accurate to the voice */}
      {faces && SEGS.filter((s) => s.who === "F").map((s) => {
        const from = Math.round(s.t0 * FPS), dur = Math.round((s.t1 - s.t0) * FPS) + 1;
        const local = fr - from;
        const inO = interpolate(local, [0, 6, dur - 5, dur], [0, 1, 1, 0], clamp);
        const big = !!s.full;
        const H = big ? 1080 : 700, Wd = H * 1500 / 1134;
        const left = big ? -230 : 1920 - Wd + 150;
        return (
          <Sequence key={s.id} from={from} durationInFrames={dur} layout="none">
            <div style={{ position: "absolute", left, top: 1080 - H, width: Wd, height: H, opacity: inO, transform: `translateY(${(1 - inO) * 40}px)` }}>
              <OffthreadVideo src={`http://127.0.0.1:8765/${s.id}.mov`} startFrom={0} transparent muted style={{ width: "100%", height: "100%" }} />
            </div>
          </Sequence>
        );
      })}
      <Audio src={staticFile("mix.wav")} />
    </AbsoluteFill>
  );
};
