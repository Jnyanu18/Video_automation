import React, { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, Easing, OffthreadVideo, continueRender, delayRender, interpolate, random, spring, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/DMSans";
import { F, FPS } from "../../kit/theme";

// Talking-head effects, each one a beat in edit.md. Adapted from the "Effect of the Day" prompts (EP. 02 liquid
// glass graph, EP. 03 screen push, EP. 04 over-the-shoulder zoom), with the studio's fonts. The glass refraction profile follows liquid-glass-js
// by Armagan Amcalar (MIT licence).

const { fontFamily: BOLD, waitUntilDone } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const rgb = (hex: string) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

// ------------------------------------------------------------------ glass: a liquid glass card with a velocity graph

export type GlassBeat = {
  kind: "glass"; at: number; dur: number; sound?: string | null;
  title: string; top: number; startValue: number; endValue: number; prefix: string; suffix: string; decimals: number; colour: string;
};

const GW = 900, GH = 610, GR = 34, GRAPH_H = 420, GPAD = 40, MAP_SCALE = 400;
const SHAPE = [0.18, 0.22, 0.26, 0.34, 0.4, 0.52, 0.64, 0.78, 0.92];
const FROST = 7, BEND = 1.0, DRAW = 1.16;
const T_RISE = 0.22, T_DRAW_START = 0.18, T_PUNCH = 0.28, T_EXIT = 0.3;
const TEXT = "#F4EFE6";

// The refraction map, built once. Red = sideways offset, green = vertical offset, 128 = none.
const useRefractionMap = () =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = GW; c.height = GH;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(GW, GH);
    const cx = GW / 2, cy = GH / 2;
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const qx = Math.abs(x + 0.5 - cx) - (cx - GR), qy = Math.abs(y + 0.5 - cy) - (cy - GR);
        const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - GR;
        const d = Math.max(-outside, 0);
        const nx = (x + 0.5 - cx) / cx, ny = (y + 0.5 - cy) / cy;
        const len = Math.hypot(nx, ny) || 1;
        const px = BEND * 1920 * (0.045 * Math.exp(-0.05 * d) + 0.06 * Math.exp(-0.35 * d) + 0.012 * (1 - Math.exp(-0.1 * d)));
        const i = (y * GW + x) * 4;
        img.data[i] = Math.round(255 * Math.min(1, Math.max(0, 0.5 + (px * nx) / len / MAP_SCALE)));
        img.data[i + 1] = Math.round(255 * Math.min(1, Math.max(0, 0.5 + (px * ny) / len / MAP_SCALE)));
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL("image/png");
  }, []);

const GlassRim: React.FC = () => (
  <>
    <div style={{ position: "absolute", inset: 0, borderRadius: GR, padding: 2,
      background: "linear-gradient(140deg, rgba(255,255,255,0.75), rgba(255,255,255,0.10) 32%, rgba(255,255,255,0.04) 62%, rgba(255,255,255,0.38))",
      WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
    <div style={{ position: "absolute", inset: 0, borderRadius: GR,
      background: "radial-gradient(120% 70% at 12% -10%, rgba(255,255,255,0.20), rgba(255,255,255,0) 50%)",
      boxShadow: "inset 0 1.5px 1px rgba(255,255,255,0.45), inset 0 -18px 40px rgba(255,255,255,0.05)" }} />
  </>
);

/** Sits inside a Sequence that starts at the beat; `src` is the cut, which it plays again behind the glass. */
export const Glass: React.FC<{ beat: GlassBeat; src: string }> = ({ beat: S, src }) => {
  const t = useCurrentFrame() / FPS;
  const map = useRefractionMap();
  const drawEnd = T_DRAW_START + DRAW;
  const exitStart = Math.max(drawEnd + 0.4, S.dur - T_EXIT);

  const rise = interpolate(t, [0, T_RISE], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const draw = interpolate(t, [T_DRAW_START, drawEnd], [0, 1], { ...clamp, easing: Easing.bezier(0.7, 0, 0.25, 1) });
  const punch = interpolate(t, [drawEnd - 0.04, drawEnd + 0.08, drawEnd + T_PUNCH], [0, 1, 0], { ...clamp, easing: Easing.bezier(0.33, 0, 0.2, 1) });
  const exit = interpolate(t, [exitStart, exitStart + T_EXIT], [0, 1], { ...clamp, easing: Easing.bezier(0.5, 0, 0.9, 0.4) });
  if (exit >= 1) return null;

  const s = (0.96 + 0.04 * rise) * (1 + 0.035 * punch);
  const dy = (1 - rise) * 60 + exit * 40;
  const op = rise * (1 - exit);
  const cx = 540, cy = S.top + GH / 2 + dy;
  const rx = cx - (GW * s) / 2, ry = cy - (GH * s) / 2, rw = GW * s, rh = GH * s;

  // The dot always leads: cut the line and fill exactly at the head, measured along the line.
  const pts = SHAPE.map((y, i) => [GPAD + (i / (SHAPE.length - 1)) * (GW - 2 * GPAD), (1 - y) * GRAPH_H]);
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let left = draw * total, k = 0;
  while (k < seg.length - 1 && left > seg[k]) { left -= seg[k]; k++; }
  const u = seg[k] ? Math.min(1, left / seg[k]) : 0;
  const head = [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * u, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * u];
  const d = [...pts.slice(0, k + 1), head].map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const value = S.startValue + (S.endValue - S.startValue) * draw;
  const shown = `${S.prefix}${value.toLocaleString("en-US", { minimumFractionDigits: S.decimals, maximumFractionDigits: S.decimals })}`;
  const text = rgb(TEXT), line = rgb(S.colour);
  const clip = <OffthreadVideo src={staticFile(src)} trimBefore={Math.round(S.at * FPS)} muted style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, objectFit: "cover" }} />;

  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id="liquid-glass" filterUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920} colorInterpolationFilters="sRGB">
          <feImage href={map} x={rx} y={ry} width={rw} height={rh} preserveAspectRatio="none" result="map" />
          <feGaussianBlur in="SourceGraphic" stdDeviation={FROST} result="frost" />
          <feDisplacementMap in="frost" in2="map" scale={MAP_SCALE * s} xChannelSelector="R" yChannelSelector="G" result="dR" />
          <feDisplacementMap in="frost" in2="map" scale={MAP_SCALE * s * 0.96} xChannelSelector="R" yChannelSelector="G" result="dG" />
          <feDisplacementMap in="frost" in2="map" scale={MAP_SCALE * s * 0.92} xChannelSelector="R" yChannelSelector="G" result="dB" />
          <feColorMatrix in="dR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feColorMatrix in="dG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="dB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feComposite in="r" in2="g" operator="arithmetic" k2={1} k3={1} result="rg" />
          <feComposite in="rg" in2="b" operator="arithmetic" k2={1} k3={1} />
        </filter>
      </svg>

      <div style={{ position: "absolute", inset: 0, opacity: op, clipPath: `inset(${ry}px ${1080 - rx - rw}px ${1920 - ry - rh}px ${rx}px round ${GR * s}px)` }}>
        <div style={{ position: "absolute", inset: 0, filter: "url(#liquid-glass)" }}>{clip}</div>
      </div>

      <div style={{ position: "absolute", left: (1080 - GW) / 2, top: S.top, width: GW, height: GH, borderRadius: GR,
        // A dark tint under the glass: on light footage (a white wall) the label and number vanished (2026-10-22).
        background: "linear-gradient(180deg, rgba(14,15,20,0.34), rgba(14,15,20,0.46))",
        boxShadow: "0 30px 70px rgba(0,0,0,0.45)", opacity: op, transform: `translateY(${dy}px) scale(${s})`, transformOrigin: "50% 50%" }}>
        <GlassRim />
        <div style={{ position: "relative", padding: "34px 0 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 40px 18px" }}>
            <span style={{ fontFamily: F.mono, fontSize: 36, letterSpacing: 4, color: `rgba(${text},0.95)`, textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}>{S.title}</span>
            <span style={{ fontFamily: BOLD, fontWeight: 700, fontSize: 84, color: TEXT, letterSpacing: -2, textShadow: "0 2px 18px rgba(0,0,0,0.75)" }}>
              {shown}<span style={{ fontSize: 46 }}>{S.suffix}</span>
            </span>
          </div>
          <svg width={GW} height={GRAPH_H} style={{ display: "block", overflow: "visible" }}>
            <defs>
              <linearGradient id={`lg-fill-${S.at}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={S.colour} stopOpacity={0.45} />
                <stop offset="1" stopColor={S.colour} stopOpacity={0} />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((g) => (
              <line key={g} x1={GPAD} x2={GW - GPAD} y1={g * GRAPH_H} y2={g * GRAPH_H} stroke={`rgba(${text},0.1)`} strokeWidth={2} />
            ))}
            <path d={`${d} L${head[0]},${GRAPH_H} L${GPAD},${GRAPH_H} Z`} fill={`url(#lg-fill-${S.at})`} opacity={Math.min(1, draw * 4)} />
            <path d={d} fill="none" stroke={S.colour} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 10px rgba(${line},0.8))` }} />
            <circle cx={head[0]} cy={head[1]} r={13} fill="#FFFFFF" stroke={S.colour} strokeWidth={6} opacity={draw > 0.01 ? 1 : 0} />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ screen: a macro shot of a monitor, one word per cut

export type ScreenBeat = {
  kind: "screen"; at: number; dur: number; sound?: string | null;
  words: { text: string; start: number }[]; colour: string;
};

const SIZE = 150, TRACK = -0.01 * SIZE, PAD = 1400;
const ZOOM = 3.1, PIXEL = 10, SCREEN = "#363636", FRINGE = 3, GLOW = 0.85, FOCUS = 5;
type Placed = { text: string; start: number; x: number; w: number };

const k = PIXEL / 10;
const SUBPIXELS = (
  [["#ff8a7a", 2], ["#9affb0", 6], ["#8aa8ff", 10]] as [string, number][]
).map(([c, x]) => `radial-gradient(ellipse ${1.7 * k}px ${4.3 * k}px at ${x * k}px ${5.5 * k}px, ${c} 70%, transparent 100%)`).join(", ");

const Words: React.FC<{ words: Placed[]; color: string; dx?: number }> = ({ words, color, dx = 0 }) => (
  <>
    {words.map((p, i) => (
      <div key={i} style={{ position: "absolute", left: p.x + dx, top: PAD - SIZE * 0.82, fontFamily: BOLD, fontWeight: 700,
        fontSize: SIZE, lineHeight: 1, color, whiteSpace: "pre", letterSpacing: TRACK }}>{p.text}</div>
    ))}
  </>
);

const Plane: React.FC<{ words: Placed[]; left: number; width: number; colour: string }> = ({ words, left, width, colour }) => (
  <div style={{ position: "absolute", left, top: 0, width, height: 2 * PAD, background: SCREEN, isolation: "isolate", overflow: "hidden" }}>
    <div style={{ position: "absolute", left: -left, top: 0 }}>
      <div style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}><Words words={words} color="#ff3020" dx={-FRINGE} /></div>
      <div style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}><Words words={words} color="#20d8ff" dx={FRINGE} /></div>
      <Words words={words} color={colour} />
    </div>
    <div style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", backgroundColor: "#000", backgroundImage: SUBPIXELS, backgroundSize: `${PIXEL}px ${PIXEL}px` }} />
  </div>
);

/** Covers the whole frame from the first word to the beat's end; word times are on the cut's timeline. */
export const Screen: React.FC<{ beat: ScreenBeat }> = ({ beat }) => {
  const t = useCurrentFrame() / FPS + beat.at;
  const [handle] = useState(() => delayRender("Loading the screen font"));
  const [ready, setReady] = useState(false);
  useEffect(() => { waitUntilDone().then(() => { setReady(true); continueRender(handle); }); }, [handle]);
  const placed = useMemo<Placed[]>(() => {
    if (!ready) return [];
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = `700 ${SIZE}px ${BOLD}`;
    const width = (s: string) => ctx.measureText(s).width + TRACK * s.length;
    const space = width(" ");
    let x = 0;
    return beat.words.map((w) => {
      const p = { text: w.text, start: w.start, x, w: width(w.text) };
      x += p.w + space;
      return p;
    });
  }, [ready, beat.words]);
  if (!placed.length || t < placed[0].start) return null;

  const width = 1080, height = 1920;
  let i = 0;
  while (i < placed.length - 1 && t >= placed[i + 1].start) i++;
  const cur = placed[i];
  const jx = ((i * 37) % 11) - 5, jy = ((i * 23) % 9) - 4;
  const cx = cur.x + cur.w / 2 + jx, cy = PAD - SIZE * 0.36 + jy;
  const zoom = Math.min(ZOOM, (0.84 * width) / cur.w);
  const half = width / 2 / zoom + 4 * PIXEL;
  const left = Math.floor((cx - half) / PIXEL) * PIXEL, span = Math.ceil((2 * half) / PIXEL + 2) * PIXEL;
  const near = placed.filter((p) => p.x + p.w + 2 * FRINGE > left && p.x - 2 * FRINGE < left + span);

  return (
    <AbsoluteFill style={{ backgroundColor: SCREEN, overflow: "hidden" }}>
      <AbsoluteFill style={{ backgroundColor: SCREEN, filter: "blur(0.4px)" }}>
        <div style={{ position: "absolute", left: width / 2, top: height / 2, transformOrigin: "0 0", transform: `scale(${zoom}) translate(${-cx}px, ${-cy}px)` }}>
          <Plane words={near} left={left} width={span} colour={beat.colour} />
          <div style={{ position: "absolute", left: 0, top: 0, mixBlendMode: "screen", filter: "blur(4px) brightness(1.6)", opacity: GLOW }}>
            <Plane words={near} left={left} width={span} colour={beat.colour} />
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ backdropFilter: `blur(${FOCUS}px)`, WebkitMaskImage: "linear-gradient(180deg, #000 0%, transparent 34%, transparent 66%, #000 100%)" }} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ shoulder: push in, a card over each shoulder, whip between them
// Adapted from "Effect of the Day" EP. 04 (over-the-shoulder zoom). The camera moves the cut itself (shoulderCamera, used by
// TalkingHead); the cards and the light streaks sit on top (Shoulder). All times are seconds from the beat's start.

type CardText = { label: string; big: string; small: string };
export type ShoulderBeat = {
  kind: "shoulder"; at: number; dur: number; sound?: string | null;
  style: "normal" | "transition"; start: CardText; end: CardText; accent: string;
  face: { x: number; width: number; eye: number };
};

const SW = 1080, SH = 1920, RES = 2, INK = "#1F1E1B", GREY = "#8A8A8E";
const kk = (t: number, a: number, b: number, from: number, to: number, ease = Easing.bezier(0.16, 1, 0.3, 1)) =>
  interpolate(t, [a, b], [from, to], { ...clamp, easing: ease });

type Move = { t: number; kind: "in" | "pan" | "whip" | "drift" | "return"; to: number; x?: number; dur?: number };
const CURVES = { in: [0, 0.21, 0.43, 0.61, 0.73, 0.83, 0.9, 0.96, 1], out: [0, 0.14, 0.37, 0.57, 0.71, 0.8, 0.87, 0.94, 1] };
const CURVE_OF: Record<Move["kind"], "in" | "out"> = { in: "in", pan: "in", whip: "in", drift: "out", return: "out" };
const DUR_OF: Record<Move["kind"], number> = { in: 0.36, pan: 0.42, whip: 0.5, drift: 0.42, return: 0.9 };
const progress = (kind: Move["kind"], u: number) => {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const p = CURVES[CURVE_OF[kind]], x = u * (p.length - 1), i = Math.floor(x), f = x - i;
  const m = (j: number) => (p[Math.min(j + 1, p.length - 1)] - p[Math.max(j - 1, 0)]) / (Math.min(j + 1, p.length - 1) - Math.max(j - 1, 0));
  return (2 * f ** 3 - 3 * f ** 2 + 1) * p[i] + (f ** 3 - 2 * f ** 2 + f) * m(i) + (-2 * f ** 3 + 3 * f ** 2) * p[i + 1] + (f ** 3 - f ** 2) * m(i + 1);
};
const MOVES: Move[] = [
  { t: 0.05, kind: "in", to: 1.25, dur: 0.5 },   // push in
  { t: 0.9, kind: "pan", to: 1.25, x: 110 },     // look at the start card
  { t: 2.4, kind: "whip", to: 1.27, x: -110 },   // whip to the end card, a 2 % scale bump
  { t: 2.9, kind: "drift", to: 1.25, dur: 0.2 }, // the bump settles
  { t: 3.7, kind: "return", to: 1.0, x: 0 },     // pull back out
];
const cameraAt = (t: number) => {
  let z = 1, x = 0;
  for (const m of MOVES) {
    if (t < m.t) break;
    const d = m.dur ?? DUR_OF[m.kind], u = (t - m.t) / d, p = progress(m.kind, u);
    const from = z, fx = x;
    z = Math.exp(Math.log(from) + (Math.log(m.to) - Math.log(from)) * p);
    if (m.x !== undefined) x = fx + (m.x - fx) * p;
    if (u >= 1) {
      z = m.to;
      if (m.x !== undefined) x = m.x;
    }
  }
  return { z, x };
};

/** The cut's transform while the beat runs: framed so the head is about a third of the frame wide, then the camera moves. */
export const shoulderCamera = (b: ShoulderBeat, t: number) => {
  const s = Math.max(1, 0.32 / b.face.width);
  const tx = Math.min(0, Math.max(SW - s * SW, SW / 2 - s * b.face.x * SW));
  const ty = Math.min(0, Math.max(SH - s * SH, 0.255 * SH - s * b.face.eye * SH));
  const { z, x: cx } = cameraAt(t);
  const blend = Math.min(1, (z - 1) / 0.25); // the reframe rides the push in, so nothing jumps
  const room = (SW / 2) * (z - 1);           // never slide past the picture's edge
  return {
    outer: `translate(${Math.max(-room, Math.min(room, cx))}px, 0px) scale(${z})`,
    origin: `${tx + s * b.face.x * SW}px ${ty + s * b.face.eye * SH}px`,
    inner: `translate(${tx * blend}px, ${ty * blend}px) scale(${1 + (s - 1) * blend})`,
  };
};

const CARD = { top: 520, edge: 70, w: 330, padX: 30, padY: 26, radius: 26 };
const EYE_H = 28, BIG_H = 80, BIG_BASE = 63, SUB_H = 34, INNER = CARD.w - 2 * CARD.padX - 6;
const CARD_H = 6 + 2 * CARD.padY + EYE_H + BIG_H + SUB_H;
const bigFont = (size: number) => `700 ${size}px ${BOLD}`;
// The big text: 64 px, shrunk only if it would not fit. The same drawing feeds the card and the light streaks.
const drawBig = (ctx: CanvasRenderingContext2D, text: string, color: string) => {
  ctx.setTransform(RES, 0, 0, RES, 0, 0);
  ctx.clearRect(0, 0, INNER, BIG_H);
  let size = 64;
  ctx.font = bigFont(size);
  while (size > 26 && ctx.measureText(text).width > INNER) {
    size -= 2;
    ctx.font = bigFont(size);
  }
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, 0, BIG_BASE);
};
const Big: React.FC<{ text: string; color: string; visible: boolean }> = ({ text, color, visible }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (c) drawBig(c.getContext("2d")!, text, color);
  }, [text, color]);
  return <canvas ref={ref} width={INNER * RES} height={BIG_H * RES} style={{ display: "block", width: INNER, height: BIG_H, opacity: visible ? 1 : 0 }} />;
};
const Card: React.FC<{ side: "l" | "r"; card: CardText; accent: string; at: number; out: number; bigVisible: boolean; flash: number }> = ({ side, card, accent, at, out, bigVisible, flash }) => {
  const f = useCurrentFrame(), t = f / FPS;
  if (t < at || t > out + 0.25) return null;
  const p = spring({ frame: f - Math.round(at * FPS), fps: FPS, config: { damping: 12, stiffness: 170, mass: 0.7 } }) * (1 - kk(t, out, out + 0.2, 0, 1));
  return (
    <div style={{ position: "absolute", top: CARD.top, [side === "l" ? "left" : "right"]: CARD.edge, width: CARD.w, padding: `${CARD.padY}px ${CARD.padX}px`, boxSizing: "border-box",
      borderRadius: CARD.radius, backgroundColor: "#FFFFFF", border: `3px solid ${accent}`,
      boxShadow: `0 22px 50px rgba(0,0,0,0.3), 0 0 ${34 + 50 * flash}px rgba(255,236,220,${0.55 + 0.4 * flash})`, filter: flash > 0 ? `brightness(${1 + 0.35 * flash})` : undefined,
      transform: `scale(${0.6 + 0.4 * p}) rotate(${side === "l" ? -4 : 4}deg)`, opacity: Math.min(1, p * 2) } as React.CSSProperties}>
      <div style={{ height: EYE_H, fontFamily: F.mono, fontSize: 22, letterSpacing: 3, color: accent, whiteSpace: "nowrap", overflow: "hidden" }}>{card.label}</div>
      <Big text={card.big} color={side === "l" ? INK : accent} visible={bigVisible} />
      <div style={{ height: SUB_H, fontFamily: F.body, fontWeight: 600, fontSize: 26, color: GREY, whiteSpace: "nowrap", overflow: "hidden" }}>{card.small}</div>
    </div>
  );
};

// The light-speed transition: every lit pixel of the start text flies to a lit pixel of the end text.
type Pt = { sx: number; sy: number; gx: number; gy: number; dep: number; fl: number; r: number };
const DEPART = 2.38, CHARGE = DEPART - 0.25;
const samplePts = (text: string, side: "l" | "r") => {
  const c = document.createElement("canvas");
  c.width = INNER * RES;
  c.height = BIG_H * RES;
  const ctx = c.getContext("2d")!;
  drawBig(ctx, text, "#000");
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const left = side === "l" ? CARD.edge : SW - CARD.edge - CARD.w;
  const cx = left + CARD.w / 2, cy = CARD.top + CARD_H / 2, a = ((side === "l" ? -4 : 4) * Math.PI) / 180;
  const pts: { x: number; y: number; xn: number }[] = [];
  for (let y = 0; y < c.height; y += 4) {
    for (let x = 0; x < c.width; x += 4) {
      if (d[(y * c.width + x) * 4 + 3] > 110) {
        const lx = left + 3 + CARD.padX + x / RES - cx, ly = CARD.top + 3 + CARD.padY + EYE_H + y / RES - cy;
        pts.push({ x: cx + lx * Math.cos(a) - ly * Math.sin(a), y: cy + lx * Math.sin(a) + ly * Math.cos(a), xn: x / c.width });
      }
    }
  }
  return pts.sort((p, q) => p.x - q.x);
};
// Light speed: almost still, then everything at once, then a hard brake.
const warp = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 0.5 * Math.pow(2, 20 * u - 10) : 1 - 0.5 * Math.pow(2, -20 * u + 10));
const posAt = (p: Pt, t: number) => {
  const u = Math.max(0, Math.min(1, (t - p.dep) / p.fl)), e = warp(u), bulge = Math.sin(Math.PI * e);
  let x = p.sx + (p.gx - p.sx) * e, y = p.sy + (p.gy - p.sy) * e + (p.r - 0.5) * 110 * bulge;
  const sh = u <= 0 ? kk(t, CHARGE, p.dep, 0, 1, Easing.in(Easing.quad)) : 0; // the charge before take-off
  x += (random(`x${p.r}${Math.floor(t * 60)}`) - 0.5) * 2.4 * sh;
  y += (random(`y${p.r}${Math.floor(t * 60)}`) - 0.5) * 2.4 * sh;
  return { x, y, u, e };
};
const Streaks: React.FC<{ ps: Pt[]; until: number; accent: string }> = ({ ps, until, accent }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const t = useCurrentFrame() / FPS;
  useEffect(() => {
    const ctx = ref.current!.getContext("2d")!;
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.clearRect(0, 0, SW, SH);
    if (t < CHARGE || t >= until) return;
    const still = new Path2D(), landed = new Path2D(), glow = new Path2D();
    for (const p of ps) {
      const a = posAt(p, t), b = posAt(p, t - 0.045);
      if (a.u <= 0 || a.e < 0.015) still.rect(a.x - 1.2, a.y - 1.2, 2.4, 2.4);
      else if (a.u >= 1 || a.e > 0.985) landed.rect(a.x - 1.2, a.y - 1.2, 2.4, 2.4);
      else {
        glow.moveTo(b.x, b.y);
        glow.lineTo(a.x + 0.01, a.y);
      }
    }
    const charge = kk(t, CHARGE, DEPART, 0, 1, Easing.in(Easing.quad));
    ctx.fillStyle = INK;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 36 * charge;
    ctx.fill(still);
    ctx.shadowBlur = 0;
    ctx.fillStyle = accent;
    ctx.fill(landed);
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = accent + "29"; // the coloured glow
    ctx.lineWidth = 5;
    ctx.stroke(glow);
    ctx.strokeStyle = "rgba(255,246,236,0.55)"; // the white-hot core
    ctx.lineWidth = 1.3;
    ctx.stroke(glow);
    ctx.globalCompositeOperation = "source-over";
  }, [t, ps, until, accent]);
  return <canvas ref={ref} width={SW * RES} height={SH * RES} style={{ position: "absolute", left: 0, top: 0, width: SW, height: SH }} />;
};

/** The cards (and, with style transition, the light) over the moving cut. Sits inside a Sequence that starts at the beat. */
export const Shoulder: React.FC<{ beat: ShoulderBeat }> = ({ beat: S }) => {
  const t = useCurrentFrame() / FPS;
  const transition = S.style === "transition";
  const [ps, setPs] = useState<Pt[]>([]);
  const [handle] = useState(() => delayRender("fonts and streaks"));
  useEffect(() => {
    waitUntilDone()
      .then(() => document.fonts.load(bigFont(64)))
      .then(() => {
        if (transition) {
          const A = samplePts(S.start.big, "l"), G = samplePts(S.end.big, "r"), n = Math.max(A.length, G.length), out: Pt[] = [];
          for (let i = 0; i < n && A.length && G.length; i++) {
            const s = A[Math.floor((i * A.length) / n)], g = G[Math.floor((i * G.length) / n)], r = random(`p${i}`);
            out.push({ sx: s.x, sy: s.y, gx: g.x, gy: g.y, r, fl: 0.34 * (0.85 + 0.3 * random(`q${i}`)), dep: DEPART + 0.1 * (1 - s.xn) + 0.05 * r });
          }
          setPs(out);
        }
        continueRender(handle);
      });
  }, [handle, transition, S.start.big, S.end.big]);
  const arrive = useMemo(() => (ps.length ? ps.reduce((m, p) => Math.max(m, p.dep + p.fl), 0) : 2.9), [ps]);
  const flash = transition && t >= arrive ? Math.max(0, 1 - (t - arrive) / 0.2) : 0;
  return (
    <AbsoluteFill>
      <Card side="l" card={S.start} accent={S.accent} at={1.0} out={2.35} bigVisible={!transition || t < CHARGE} flash={0} />
      <Card side="r" card={S.end} accent={S.accent} at={transition ? 2.7 : 2.55} out={3.7} bigVisible={!transition || t >= arrive} flash={flash} />
      {transition && ps.length > 0 ? <Streaks ps={ps} until={arrive} accent={S.accent} /> : null}
    </AbsoluteFill>
  );
};


// ------------------------------------------------------------------ chips: short labels that pop in as each is said

export type ChipsBeat = {
  kind: "chips"; at: number; dur: number; sound?: string | null; itemSound?: string | null;
  items: { text: string; at: number }[];
};

// Pastel neo-brutalism (Vishnu, 2026-10-22): a thick black outline, a hard black shadow with no blur, a flat
// pastel fill per label, bold type, a slight tilt. The earlier white pills with a gold dot read as AI-made.
const PASTELS = ["#FFE89A", "#B8F2D0", "#D9C8FF", "#FFC9B0", "#BDE3FF"];
const INK_BRUTAL = "#111111";

/** Labels in a row, each stamping in on its own word. Sits inside a Sequence that starts at the beat. */
export const Chips: React.FC<{ beat: ChipsBeat }> = ({ beat }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const out = interpolate(t, [beat.dur - 0.25, beat.dur], [1, 0], clamp);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 26, opacity: out, padding: "0 20px" }}>
      {beat.items.map((it, i) => {
        const a = it.at - beat.at;
        if (t < a) return null;
        const p = spring({ frame: f - Math.round(a * FPS), fps: FPS, config: { damping: 11, stiffness: 220, mass: 0.6 } });
        const press = interpolate(t - a, [0, 0.12, 0.22], [10, 10, 7], clamp); // the shadow lands, then settles
        return (
          <div key={i} style={{ background: PASTELS[i % PASTELS.length], border: `5px solid ${INK_BRUTAL}`, borderRadius: 16,
            boxShadow: `${press}px ${press}px 0 ${INK_BRUTAL}`, padding: "18px 34px",
            transform: `rotate(${i % 2 ? 2 : -2}deg) scale(${0.4 + 0.6 * p})`, opacity: Math.min(1, p * 2) }}>
            <span style={{ fontFamily: BOLD, fontWeight: 700, fontSize: 54, color: INK_BRUTAL, letterSpacing: -0.5 }}>{it.text}</span>
          </div>
        );
      })}
    </div>
  );
};
