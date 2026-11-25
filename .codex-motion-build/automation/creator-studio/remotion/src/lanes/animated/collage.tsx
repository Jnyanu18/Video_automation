import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadArchivo } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
import { FPS, Word } from "../../kit/theme";
import type { View } from "./faceless";

/** The paper collage look (Vishnu's pick, 2026-11-06: research/looks/2026-11-06-signature-looks.png, frame 3) with the
 *  direction he asked for after De7V3pbTWX6 and DfWlPu3FTcE: a new picture on every spoken phrase (about one a second),
 *  every picture a diagram of the sentence, entrances that anticipate, overshoot and settle, paper that moves in
 *  stop-motion steps of 12 a second (on twos), a camera that shifts on each beat, captions on a paper strip and a
 *  segmented progress bar. This file holds the shared kit (paper, tape, labels, motion) and the claude-killed-instagram
 *  beats; a later collage video adds its own beats and reuses the kit. */

const ARCH = loadArchivo("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const HAND = loadCaveat("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily;
const MONO = loadMono("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;

const K = { board: "#d8b98d", paper: "#fffdf6", ink: "#1e1e1e", red: "#c8372d", orange: "#d97757", blue: "#bfe0ec", green: "#c8e6c0", peach: "#ffd7a8", pink: "#f3c4d6", yellow: "#ffd84a", grey: "#e8e2d6" };
const SHADOW = "0 10px 18px rgba(0,0,0,0.28)";
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const c01 = (x: number) => Math.max(0, Math.min(1, x));
const rng = (seed: number) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

// ---------------------------------------------------------------- motion
/** on twos: paper moves in steps of 12 a second */
const twos = (t: number) => Math.floor(t * 12) / 12;
/** an entrance: anticipation (a dip below zero is invisible, so it shows as a held beat), overshoot, settle */
const pop = (t: number) => (t <= 0 ? 0 : interpolate(twos(t), [0, 0.09, 0.17, 0.26, 0.34], [0, 1.16, 0.93, 1.03, 1], clamp));
/** a move from 0 to 1 that pulls back first (anticipation), then shoots past and settles */
const swing = (t: number, dur = 0.4) => (t <= 0 ? 0 : interpolate(twos(t) / dur, [0, 0.18, 0.62, 0.82, 1], [0, -0.08, 1.1, 0.97, 1], clamp));
const ease = (t: number, dur = 0.3) => Easing.out(Easing.cubic)(c01(twos(t) / dur));
/** a tiny stop-motion wobble so nothing sits dead still */
const jit = (t: number, seed: number, amt = 1) => { const r = rng(Math.floor(t * 12) * 31 + seed); return (r() - 0.5) * 2 * amt; };

// ---------------------------------------------------------------- paper kit
const Paper: React.FC<{ x: number; y: number; w: number; h: number; fill?: string; rot?: number; s?: number; r?: number; style?: React.CSSProperties; children?: React.ReactNode; origin?: string }> = ({ x, y, w, h, fill = K.paper, rot = 0, s = 1, r = 6, style, children, origin = "50% 50%" }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: fill, borderRadius: r, boxShadow: SHADOW, transform: `rotate(${rot}deg) scale(${s})`, transformOrigin: origin, ...style }}>{children}</div>
);
const Tape: React.FC<{ x: number; y: number; w?: number; rot?: number; o?: number }> = ({ x, y, w = 150, rot = -4, o = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: 42, background: "rgba(255,240,180,0.78)", transform: `rotate(${rot}deg)`, opacity: o, boxShadow: "0 2px 4px rgba(0,0,0,0.12)" }} />
);
const Label: React.FC<{ x: number; y: number; text: string; rot?: number; s?: number; dark?: boolean; size?: number }> = ({ x, y, text, rot = 0, s = 1, dark, size = 26 }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg) scale(${s})`, transformOrigin: "0 50%", background: dark ? K.ink : K.paper, color: dark ? K.paper : K.ink, fontFamily: MONO, fontSize: size, padding: "8px 16px", boxShadow: SHADOW, whiteSpace: "nowrap", letterSpacing: 1 }}>{text}</div>
);
const Hand: React.FC<{ x: number; y: number; text: string; size?: number; rot?: number; k?: number; color?: string }> = ({ x, y, text, size = 90, rot = -6, k = 1, color = K.red }) => (
  <div style={{ position: "absolute", left: x, top: y, fontFamily: HAND, fontSize: size, color, transform: `rotate(${rot}deg)`, whiteSpace: "nowrap", clipPath: `inset(-20% ${(1 - c01(k)) * 100}% -20% -5%)`, lineHeight: 1 }}>{text}</div>
);
/** a red marker stroke drawn along a path as k goes 0 to 1 */
const Marker: React.FC<{ d: string; k: number; w?: number; len?: number }> = ({ d, k, w = 12, len = 1400 }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
    <path d={d} fill="none" stroke={K.red} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - c01(k))} opacity={0.92} />
  </svg>
);
const Stamp: React.FC<{ x: number; y: number; text: string; t: number; rot?: number; size?: number }> = ({ x, y, text, t, rot = -12, size = 56 }) => {
  if (t <= 0) return null;
  const s = interpolate(twos(t), [0, 0.08, 0.16], [1.8, 0.94, 1], clamp);
  return <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${s})`, border: `7px solid ${K.red}`, color: K.red, fontFamily: ARCH, fontSize: size, padding: "6px 24px", borderRadius: 14, opacity: 0.9, whiteSpace: "nowrap", mixBlendMode: "multiply" }}>{text}</div>;
};
const starPts = (cx: number, cy: number, n: number, r1: number, r2: number) =>
  Array.from({ length: n * 2 }, (_, i) => { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r2 : r1; return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`; }).join(" ");

// ---------------------------------------------------------------- captions on paper strips
const chunked = (words: Word[]) => {
  const out: Word[][] = []; let c: Word[] = [];
  words.forEach((w) => { c.push(w); if (c.length >= 3 || /[.,!?;:]$/.test(w.w)) { out.push(c); c = []; } });
  if (c.length) out.push(c);
  return out;
};
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const Captions: React.FC<{ words: Word[]; now: number; mark: Set<string> }> = ({ words, now, mark }) => {
  const chunks = chunked(words);
  const k = [...chunks.keys()].reverse().find((i) => chunks[i][0].start <= now + 0.04);
  if (k === undefined) return null;
  const cur = chunks[k];
  const t = now - cur[0].start;
  const rot = k % 2 ? 1.6 : -1.4;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1545, display: "flex", justifyContent: "center" }}>
      <div style={{ background: K.paper, padding: "14px 34px", boxShadow: SHADOW, transform: `rotate(${rot}deg) scale(${interpolate(twos(t), [0, 0.09, 0.17], [0.9, 1.04, 1], clamp)})`, fontFamily: ARCH, fontSize: 74, color: K.ink, whiteSpace: "nowrap", maxWidth: 1000 }}>
        {cur.map((w, i) => {
          const on = mark.has(norm(w.w));
          return <span key={i} style={{ margin: "0 0.14em", padding: on ? "0 12px" : 0, background: on ? K.red : "transparent", color: on ? K.paper : K.ink, opacity: w.start <= now + 0.04 ? 1 : 0.18 }}>{w.w.replace(/[.,]$/, "")}</span>;
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- small drawings
const IgIcon: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.26, background: "linear-gradient(45deg,#feda75,#fa7e1e 30%,#d62976 60%,#962fbf 80%,#4f5bd5)", boxShadow: SHADOW, position: "relative" }}>
    <div style={{ position: "absolute", left: "20%", top: "20%", width: "60%", height: "60%", border: `${size * 0.07}px solid #fff`, borderRadius: size * 0.17, boxSizing: "border-box" }} />
    <div style={{ position: "absolute", left: "35%", top: "35%", width: "30%", height: "30%", border: `${size * 0.07}px solid #fff`, borderRadius: "50%", boxSizing: "border-box" }} />
    <div style={{ position: "absolute", left: "66%", top: "26%", width: size * 0.07, height: size * 0.07, background: "#fff", borderRadius: "50%" }} />
  </div>
);
/** A mock reel cover (illustrative, 2026-11-06: Vishnu wanted the empty placeholders filled): a small drawn picture, a title
 *  in cover type and a view count, so a phone grid or a list of reels reads like a real feed. */
const ART = [
  // sun over hills
  (w: number, h: number) => <><circle cx={w * 0.68} cy={h * 0.34} r={w * 0.15} fill="#ffb44d" /><path d={`M0 ${h * 0.7} Q${w * 0.3} ${h * 0.5} ${w * 0.6} ${h * 0.68} T${w} ${h * 0.62} L${w} ${h} L0 ${h} Z`} fill="#6fb487" /></>,
  // a coffee cup
  (w: number, h: number) => <><rect x={w * 0.3} y={h * 0.42} width={w * 0.36} height={h * 0.3} rx={w * 0.05} fill={K.paper} /><path d={`M${w * 0.66} ${h * 0.48} a ${w * 0.08} ${w * 0.08} 0 1 1 0 ${w * 0.16}`} fill="none" stroke={K.paper} strokeWidth={w * 0.04} /><path d={`M${w * 0.4} ${h * 0.36} q ${w * 0.04} -${h * 0.05} 0 -${h * 0.1} M${w * 0.52} ${h * 0.36} q ${w * 0.04} -${h * 0.05} 0 -${h * 0.1}`} stroke={K.paper} strokeWidth={w * 0.025} fill="none" /></>,
  // a laptop
  (w: number, h: number) => <><rect x={w * 0.2} y={h * 0.36} width={w * 0.6} height={h * 0.3} rx={w * 0.03} fill={K.ink} /><rect x={w * 0.25} y={h * 0.4} width={w * 0.5} height={h * 0.22} fill="#5fb3d9" /><rect x={w * 0.12} y={h * 0.66} width={w * 0.76} height={h * 0.05} rx={w * 0.02} fill={K.ink} /></>,
  // a face
  (w: number, h: number) => <><circle cx={w * 0.5} cy={h * 0.42} r={w * 0.16} fill="#f0c39a" /><path d={`M${w * 0.2} ${h} Q${w * 0.5} ${h * 0.58} ${w * 0.8} ${h} Z`} fill="#3b5ba5" /></>,
  // a chart going up
  (w: number, h: number) => <><path d={`M${w * 0.15} ${h * 0.75} L${w * 0.38} ${h * 0.58} L${w * 0.55} ${h * 0.64} L${w * 0.85} ${h * 0.3}`} fill="none" stroke={K.paper} strokeWidth={w * 0.05} strokeLinecap="round" strokeLinejoin="round" /><polygon points={`${w * 0.85},${h * 0.26} ${w * 0.72},${h * 0.3} ${w * 0.83},${h * 0.4}`} fill={K.paper} /></>,
  // a phone with a play button
  (w: number, h: number) => <><rect x={w * 0.33} y={h * 0.3} width={w * 0.34} height={h * 0.46} rx={w * 0.05} fill={K.ink} /><polygon points={`${w * 0.45},${h * 0.45} ${w * 0.45},${h * 0.61} ${w * 0.58},${h * 0.53}`} fill={K.paper} /></>,
];
const Thumb: React.FC<{ w: number; h: number; bg: string; art: number; title: string; views: string; handle?: string }> = ({ w, h, bg, art, title, views, handle }) => (
  <div style={{ position: "absolute", inset: 0, background: bg, overflow: "hidden" }}>
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>{ART[art % ART.length](w, h)}</svg>
    <div style={{ position: "absolute", left: w * 0.07, right: w * 0.07, top: h * 0.06, fontFamily: ARCH, fontSize: Math.max(11, w * 0.11), lineHeight: 1.05, color: K.ink, background: "rgba(255,253,246,0.9)", padding: `${w * 0.02}px ${w * 0.04}px` }}>{title}</div>
    {handle ? <div style={{ position: "absolute", left: w * 0.07, bottom: h * 0.17, fontFamily: MONO, fontSize: Math.max(10, w * 0.075), color: K.ink, background: "rgba(255,253,246,0.85)", padding: "1px 6px" }}>{handle}</div> : null}
    <div style={{ position: "absolute", left: w * 0.07, bottom: h * 0.04, fontFamily: ARCH, fontSize: Math.max(11, w * 0.12), color: K.paper, background: "rgba(30,30,30,0.82)", padding: `${w * 0.01}px ${w * 0.04}px`, borderRadius: w * 0.03 }}>▶ {views}</div>
  </div>
);
const GRID = [
  { title: "my morning routine", views: "12.4K", art: 1 }, { title: "3 AI tools I use", views: "48.1K", art: 2 }, { title: "POV: day 1", views: "9.8K", art: 3 },
  { title: "sunset run", views: "21.7K", art: 0 }, { title: "how I grew 10K", views: "130K", art: 4 }, { title: "new cafe menu", views: "7.2K", art: 1 },
  { title: "reel ideas", views: "33.5K", art: 5 }, { title: "behind the scenes", views: "15.9K", art: 3 }, { title: "weekly recap", views: "18.3K", art: 4 },
];
const REELS = [
  { title: "I tried 13 AI skills", views: "41K", handle: "@cafe.sam", art: 2, bg: K.pink },
  { title: "POV: Claude runs my IG", views: "1.2M", handle: "@ai.with.leo", art: 5, bg: K.yellow },
  { title: "3 hooks that work", views: "96K", handle: "@hooklab", art: 4, bg: K.green },
];

const SKILLS = ["/ig-reel", "/ig-viral", "/ig-caption", "/ig-carousel", "/ig-story", "/ig-profile", "/ig-plan", "/ig-human", "/ig-comment", "/ig-reply", "/ig-dm", "/ig-repurpose", "/ig-audit"];
const CARD_COLORS = [K.blue, K.green, K.peach, K.pink, K.yellow, K.grey];

// ---------------------------------------------------------------- the beats of claude-killed-instagram
type B = (now: number, T: (k: string) => number) => React.ReactNode;

// 1. Claude just killed Instagram, as a samurai showdown: the two face off, the Claude spark crouches, dashes through the
//    icon in one flash, a beat of total stillness with the cut glowing, then the icon slides apart along the cut.
const b1: B = (now, T) => {
  const t0 = T("b1"), tk = T("killed"), ti = T("ig");
  const dash = tk - 0.02;                         // the strike, on "killed"
  const still = dash + 0.1;                       // the frozen beat after it
  const split = dash + 0.42;                      // the halves let go
  const S = 440, IX = 250, IY = 660;               // the icon (left of centre), the spark faces it from the top right
  const AX = 860, AY = 630, BX = 120, BY = 1104;   // the dash runs exactly along the cut line, top right to bottom left, clear past the icon
  // the spark: faces off on the right, crouches (pulls back, trembles), then a 0.08 s dash through to the far side
  const crouch = c01((now - (dash - 0.35)) / 0.3);
  const d = c01((now - dash) / 0.08);
  const sx = now < dash ? AX + crouch * 40 + (crouch > 0.6 ? jit(now * 2, 4, 5) : 0) : AX + (BX - AX) * d;
  const sy = now < dash ? AY - crouch * 24 : AY + (BY - AY) * d;
  const sparkRot = now < dash ? -crouch * 20 : -20 - d * 25;
  // the cut runs corner to corner across the icon; after the stillness the halves slide along it and drop
  const g = c01((twos(now) - split) / 0.5);
  const slide = g * g;
  const half = (top: boolean) => (
    <div style={{ position: "absolute", left: IX, top: IY, width: S, height: S, clipPath: top ? "polygon(0 0, 100% 0, 100% 18%, 0 82%)" : "polygon(0 82%, 100% 18%, 100% 100%, 0 100%)", transform: now < split ? "none" : top ? `translate(${slide * 160}px, ${-slide * 60 + slide * slide * 120}px) rotate(${slide * 14}deg)` : `translate(${-slide * 140}px, ${slide * 260}px) rotate(${-slide * 18}deg)` }}>
      <IgIcon size={S} />
    </div>
  );
  const shake = now >= dash && now < still ? jit(now * 4, 9, 9) : 0;
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translate(${shake}px, ${-shake * 0.6}px)` }}>
      <div style={{ transform: `scale(${pop(now - t0)})`, transformOrigin: `${IX + S / 2}px ${IY + S / 2}px`, position: "absolute", inset: 0 }}>
        {half(true)}{half(false)}
        {now < dash ? <Tape x={IX + 110} y={IY - 22} w={160} rot={-6} /> : null}
      </div>
      {/* the cut: a white flash across the icon at the strike, then a thin glowing seam through the stillness */}
      {now >= dash && now < split + 0.1 ? (
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <line x1={IX - 200} y1={IY + S * 0.82 + 0.64 * 200} x2={IX + S + 220} y2={IY + S * 0.18 - 0.64 * 220} stroke="#fff" strokeWidth={now < still ? 26 : 6} strokeLinecap="round" opacity={now < still ? 1 : 0.9} style={{ filter: `drop-shadow(0 0 ${now < still ? 24 : 10}px #fff)` }} />
        </svg>
      ) : null}
      {/* a white flash over the whole frame on the strike */}
      {now >= dash && now < dash + 0.06 ? <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.55)" }} /> : null}
      {now >= t0 + 0.15 ? (
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {/* the smear: a stretched trail behind the spark during the dash */}
          {now >= dash && now < dash + 0.14 ? <polygon points={`${sx - 30},${sy - 30} ${AX - 40},${AY - 50} ${AX + 40},${AY + 50} ${sx + 30},${sy + 30}`} fill={K.orange} opacity={0.45} /> : null}
          <g transform={`translate(${sx} ${sy}) rotate(${sparkRot}) scale(${pop(now - t0 - 0.15) * (now >= dash && now < dash + 0.1 ? 1.25 : 1)}, ${pop(now - t0 - 0.15) * (now >= dash && now < dash + 0.1 ? 0.8 : 1)})`}>
            <polygon points={starPts(0, 0, 12, 120, 52)} fill={K.orange} style={{ filter: "drop-shadow(0 12px 14px rgba(0,0,0,0.3))" }} />
          </g>
        </svg>
      ) : null}
      {now >= t0 + 0.2 ? <Label x={now < dash ? AX - 70 : sx - 50} y={now < dash ? AY - 180 : sy + 130} text="CLAUDE" rot={6} s={pop(now - t0 - 0.2)} dark /> : null}
      {now >= ti + 0.1 ? <Hand x={560} y={330} text="sliced." size={170} rot={-8} k={ease(now - ti - 0.1, 0.35)} /> : null}
    </div>
  );
};

// 2. Now you can run your whole Instagram with Claude, and it's completely free: a paper phone fills its grid, a stamp, a $0 tag
const b2: B = (now, T) => {
  const t0 = T("b2"), tw = T("whole"), tc = T("withc"), tf0 = T("free0"), tf = T("free");
  const slide = ease(now - tf0, 0.35);
  const px = 330 - slide * 190, s = pop(now - t0);
  const tagT = now - tf0;
  const tagRot = tagT <= 0 ? 0 : 28 * Math.exp(-tagT * 3.2) * Math.cos(twos(tagT) * 9);
  return (
    <>
      <Paper x={px} y={400} w={420} h={800} r={46} s={s} rot={-2 + jit(now, 3, 0.6)}>
        <div style={{ position: "absolute", left: 30, top: 34, width: 58, height: 58, borderRadius: 29, background: "linear-gradient(45deg,#feda75,#d62976,#4f5bd5)", padding: 4, boxSizing: "border-box" }}><div style={{ width: "100%", height: "100%", borderRadius: 25, background: "#f0c39a", border: `3px solid ${K.paper}`, boxSizing: "border-box" }} /></div>
        <div style={{ position: "absolute", left: 104, top: 36, fontFamily: MONO, fontSize: 24, color: K.ink }}>your_account</div>
        <div style={{ position: "absolute", left: 104, top: 68, fontFamily: MONO, fontSize: 18, color: "#6d675d" }}>128 posts · 4,180 followers</div>
        {GRID.map((g, i) => {
          const on = now >= tw + i * 0.06;
          return (
            <div key={i} style={{ position: "absolute", left: 30 + (i % 3) * 122, top: 116 + Math.floor(i / 3) * 160, width: 116, height: 154, background: K.grey, overflow: "hidden", transform: `scale(${on ? pop(now - tw - i * 0.06) : 1})`, boxShadow: on ? "0 4px 6px rgba(0,0,0,0.2)" : "none" }}>
              {on ? <Thumb w={116} h={154} bg={CARD_COLORS[i % 6]} art={g.art} title={g.title} views={g.views} /> : null}
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 30, top: 610, right: 30, fontFamily: MONO, fontSize: 19, color: K.ink, lineHeight: 1.4 }}>coffee, code and reels<br /><span style={{ color: "#6d675d" }}>next post: Thursday, 6 pm</span></div>
        <div style={{ position: "absolute", left: 30, top: 700, fontFamily: MONO, fontSize: 16, color: "#8a8478", letterSpacing: 1 }}>ILLUSTRATIVE</div>
      </Paper>
      {now >= tc ? <div style={{ position: "absolute", left: px - 40, top: 820, transform: `rotate(-9deg) scale(${interpolate(twos(now - tc), [0, 0.08, 0.16], [1.6, 0.95, 1], clamp)})`, background: K.ink, color: K.paper, fontFamily: MONO, fontSize: 30, padding: "12px 22px", boxShadow: SHADOW, whiteSpace: "nowrap" }}>DRAFTED BY CLAUDE · YOU POST</div> : null}
      {now >= tf0 ? (
        <div style={{ position: "absolute", left: 640, top: 330, width: 0, height: 0, transform: `rotate(${tagRot}deg)`, transformOrigin: "0 0" }}>
          <svg width={10} height={200} style={{ position: "absolute", left: -3, top: -200 * (1 - ease(tagT, 0.2)) }}><line x1={5} y1={0} x2={5} y2={200} stroke={K.ink} strokeWidth={3} /></svg>
          <div style={{ position: "absolute", left: -170, top: 190 - 600 * (1 - ease(tagT, 0.25)), width: 340, height: 420, background: K.paper, clipPath: "polygon(30% 0, 70% 0, 100% 18%, 100% 100%, 0 100%, 0 18%)", filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.3))" }}>
            <div style={{ position: "absolute", left: 150, top: 34, width: 40, height: 40, borderRadius: 20, background: K.board }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: 120, textAlign: "center", fontFamily: ARCH, fontSize: 150, color: K.ink }}>$0</div>
          </div>
        </div>
      ) : null}
      <Stamp x={700} y={1080} text="FREE · MIT" t={now - tf} rot={-10} size={64} />
    </>
  );
};

// 3. It's 13 skills: a stack of 13 cards deals out into a grid, the count rolls up
const b3: B = (now, T) => {
  const t0 = T("b3");
  const r = rng(5);
  const n = Math.min(13, Math.max(0, Math.floor((now - t0 - 0.1) / 0.035)));
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 250, textAlign: "center", fontFamily: ARCH, fontSize: 200, color: K.ink, transform: `scale(${pop(now - t0)})` }}>{n}<span style={{ fontSize: 70, marginLeft: 20 }}>SKILLS</span></div>
      {SKILLS.map((sk, i) => {
        const a = now - t0 - 0.1 - i * 0.035;
        const col = i % 3, row = Math.floor(i / 3);
        const tx = 100 + col * 300 + (i === 12 ? 300 : 0), ty = 560 + row * 175;
        const k = swing(a, 0.32);
        const rot = (r() - 0.5) * 10;
        return a > 0 ? <Paper key={i} x={440 + (tx - 440) * k} y={1100 + (ty - 1100) * k} w={270} h={140} fill={CARD_COLORS[i % 6]} rot={rot * (1 - k) + (r() - 0.5) * 4}>
          <div style={{ position: "absolute", left: 20, top: 48, fontFamily: MONO, fontSize: 30, color: K.ink }}>{sk}</div>
        </Paper> : null;
      })}
    </>
  );
};

// 4. One writes your reels from 26 hook formulas and scores the hook before you film
const b4: B = (now, T) => {
  const t0 = T("b4"), t26 = T("f26"), ts = T("scores"), tf = T("film");
  const up = ease(now - t26, 0.3);
  const scoreK = swing(now - ts - 0.05, 0.55);
  const score = 85.6 * c01(scoreK);
  const ang = -180 + 180 * (Math.max(-0.05, scoreK) * 0.856);
  return (
    <>
      <Paper x={170} y={330 - up * 120} w={740} h={330} s={pop(now - t0)} rot={-1.5 + jit(now, 7, 0.5)} fill={K.blue}>
        <div style={{ position: "absolute", left: 34, top: 26, fontFamily: MONO, fontSize: 34, color: K.ink }}>/ig-reel · REEL DRAFT</div>
        {[["HOOK", "\"Claude just killed Instagram.\""], ["SCRIPT", "Now you can run your whole Instagram..."], ["ON-SCREEN", "13 SKILLS · FREE · MIT"], ["BEATS", "0:00 hook · 0:05 proof · 0:25 CTA"]].map(([l, v], i) => {
          const typed = v.slice(0, Math.max(0, Math.floor((now - t0 - 0.25 - i * 0.18) / 0.025)));
          return <div key={i} style={{ position: "absolute", left: 34, top: 96 + i * 54, fontFamily: MONO, fontSize: 24, color: K.ink, whiteSpace: "nowrap" }}><span style={{ display: "inline-block", width: 150, color: "#5d5850" }}>{l}</span>{typed}</div>;
        })}
      </Paper>
      {now >= t26 && now < ts ? Array.from({ length: 26 }, (_, i) => {
        const a = now - t26 - i * 0.022;
        return a > 0 ? <Paper key={i} x={110 + (i % 7) * 126} y={620 + Math.floor(i / 7) * 118} w={108} h={96} s={pop(a)} rot={(rng(i + 40)() - 0.5) * 8} fill={i % 4 === 0 ? K.yellow : K.paper}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 22, textAlign: "center", fontFamily: ARCH, fontSize: 40, color: K.ink }}>{i + 1}</div>
        </Paper> : null;
      }) : null}
      {now >= t26 && now < ts ? <Hand x={600} y={1110} text="26 hook formulas" size={74} rot={-4} k={ease(now - t26 - 0.3, 0.4)} /> : null}
      {now >= ts ? (
        <>
          <Paper x={120} y={620} w={560} h={470} s={pop(now - ts)} rot={1.5}>
            <div style={{ position: "absolute", left: 26, top: 22, right: 26, fontFamily: MONO, fontSize: 22, color: K.ink, lineHeight: 1.35 }}>"Nobody tells you that your first 30 reels are supposed to f..."</div>
            <svg width={560} height={470} style={{ position: "absolute", left: 0, top: 0 }}>
              <path d="M 110 380 A 170 170 0 0 1 450 380" fill="none" stroke={K.grey} strokeWidth={34} />
              <path d="M 110 380 A 170 170 0 0 1 450 380" fill="none" stroke={K.orange} strokeWidth={34} strokeDasharray={534} strokeDashoffset={534 * (1 - c01(scoreK) * 0.856)} />
              <line x1={280} y1={380} x2={280 + Math.cos((ang * Math.PI) / 180) * 140} y2={380 + Math.sin((ang * Math.PI) / 180) * 140} stroke={K.ink} strokeWidth={8} strokeLinecap="round" />
              <text x={280} y={350} textAnchor="middle" fontFamily={ARCH} fontSize={64} fill={K.ink}>{score.toFixed(1)}</text>
            </svg>
            <div style={{ position: "absolute", left: 210, top: 400, background: K.ink, color: K.paper, fontFamily: MONO, fontSize: 24, padding: "4px 14px" }}>STRONG</div>
          </Paper>
          <Label x={130} y={1110} text="EXAMPLE FROM THE README" size={22} rot={-2} s={pop(now - ts - 0.4)} />
        </>
      ) : null}
      {now >= tf ? (() => {
        const snap = c01((twos(now - tf) - 0.12) / 0.1);
        return (
          <div style={{ position: "absolute", left: 720, top: 760, transform: `scale(${pop(now - tf)}) rotate(6deg)` }}>
            <div style={{ position: "absolute", left: 0, top: 70, width: 260, height: 190, background: K.ink, boxShadow: SHADOW }} />
            <div style={{ position: "absolute", left: 0, top: 30, width: 260, height: 44, background: "repeating-linear-gradient(45deg,#1e1e1e 0 26px,#fffdf6 26px 52px)", transform: `rotate(${-28 * (1 - snap)}deg)`, transformOrigin: "0 100%", boxShadow: SHADOW }} />
            <div style={{ position: "absolute", left: 20, top: 120, fontFamily: MONO, fontSize: 26, color: K.paper }}>BEFORE YOU FILM</div>
          </div>
        );
      })() : null}
    </>
  );
};

// 5. One finds the reels blowing up in your niche and ranks them against their own account's average
const b5: B = (now, T) => {
  const t0 = T("b5"), tb = T("blow"), tr = T("ranks"), ta = T("avg");
  const ranked = now >= tr;
  const mag = ease(now - t0 - 0.1, 0.7);
  const thumbs = [K.pink, K.yellow, K.green];
  const mult = [1.4, 4.2, 2.6];
  const order = [1, 2, 0];
  return (
    <>
      {!ranked ? REELS.map((r, i) => {
        const big = i === 1 && now >= tb;
        return <Paper key={i} x={90 + i * 320} y={520} w={260} h={420} fill={r.bg} s={pop(now - t0 - i * 0.06) * (big ? 1 + 0.18 * swing(now - tb, 0.35) : 1)} rot={[-3, 1, 3][i] + jit(now, 10 + i, 0.6)} style={{ overflow: "hidden" }}>
          <Thumb w={260} h={420} bg={r.bg} art={r.art} title={r.title} views={r.views} handle={r.handle} />
        </Paper>;
      }) : null}
      {!ranked ? <Label x={100} y={980} text="ILLUSTRATIVE" size={20} rot={-2} s={pop(now - t0 - 0.3)} /> : null}
      {!ranked && now >= tb ? <Marker d="M 520 470 L 500 400 M 610 470 L 650 395 M 700 520 L 770 470 M 400 520 L 340 470" k={ease(now - tb - 0.1, 0.3)} w={10} len={600} /> : null}
      {!ranked ? <div style={{ position: "absolute", left: 60 + mag * 640, top: 880, transform: `rotate(${-20 + mag * 30}deg)` }}><div style={{ width: 200, height: 200, borderRadius: 100, border: `22px solid ${K.ink}`, background: "rgba(255,255,255,0.25)", boxShadow: SHADOW }} /><div style={{ position: "absolute", left: 160, top: 180, width: 34, height: 150, background: K.ink, transform: "rotate(-40deg)", transformOrigin: "50% 0" }} /></div> : null}
      {ranked ? order.map((i, rank) => {
        const len = 140 * mult[i] * ease(now - tr - rank * 0.08, 0.4);
        return (
          <React.Fragment key={i}>
            <Paper x={90} y={460 + rank * 230} w={150} h={200} fill={thumbs[i]} rot={-2 + rank} s={pop(now - tr - rank * 0.05)} style={{ overflow: "hidden" }}>
              <Thumb w={150} h={200} bg={REELS[i].bg} art={REELS[i].art} title={REELS[i].title} views={REELS[i].views} />
            </Paper>
            <div style={{ position: "absolute", left: 270, top: 486 + rank * 230, fontFamily: MONO, fontSize: 22, color: K.ink, opacity: ease(now - tr - rank * 0.08, 0.3) }}>{REELS[i].handle}</div>
            <div style={{ position: "absolute", left: 270, top: 520 + rank * 230, width: len, height: 90, background: rank === 0 ? K.red : K.ink, boxShadow: SHADOW, transform: `rotate(${jit(now, 20 + rank, 0.4)}deg)` }} />
            <div style={{ position: "absolute", left: 290 + len, top: 536 + rank * 230, fontFamily: ARCH, fontSize: 52, color: K.ink, opacity: len > 20 ? 1 : 0 }}>{mult[i]}×</div>
          </React.Fragment>
        );
      }) : null}
      {now >= ta ? (
        <>
          <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}><line x1={430} y1={440} x2={430} y2={440 + 740 * ease(now - ta, 0.4)} stroke={K.ink} strokeWidth={6} strokeDasharray="18 14" /></svg>
          <Label x={300} y={1190} text="1× = THEIR OWN AVERAGE" size={24} rot={-2} s={pop(now - ta - 0.2)} dark />
          <Label x={640} y={1250} text="ILLUSTRATIVE" size={20} rot={2} s={pop(now - ta - 0.3)} />
        </>
      ) : null}
    </>
  );
};

// 6. And one strips the AI out of your captions: the em dashes, the slop words, even hidden watermark characters
const b6: B = (now, T) => {
  const t0 = T("b6"), te = T("em"), tsl = T("slop"), th = T("hidden");
  const dashOff = swing(now - te - 0.35, 0.45);
  const sweep = ease(now - th - 0.9, 0.35);
  // the marks live on the words themselves, so they stay on them however the line wraps
  const strike = (k: number): React.CSSProperties => ({ backgroundImage: `linear-gradient(${K.red}, ${K.red})`, backgroundRepeat: "no-repeat", backgroundPosition: "0 58%", backgroundSize: `${c01(k) * 100}% 12px` });
  const ring = c01(ease(now - te, 0.25));
  const chip = (s: string, i: number) => {
    const a = now - th - 0.3 - i * 0.12;
    if (a <= 0) return null;
    return <span style={{ display: "inline-block", fontFamily: MONO, fontSize: 22, background: K.red, color: K.paper, padding: "2px 8px", margin: "0 6px", verticalAlign: "middle", transform: `translate(${sweep * 600}px, ${-sweep * 260}px) rotate(${sweep * 50}deg) scale(${pop(a)})`, opacity: 1 - sweep }}>{s}</span>;
  };
  return (
    <>
      <Paper x={110} y={430} w={860} h={560} s={pop(now - t0)} rot={-1 + jit(now, 30, 0.5)}>
        <div style={{ position: "absolute", left: 40, top: 30, fontFamily: MONO, fontSize: 24, color: "#8a8478" }}>CAPTION DRAFT</div>
        <div style={{ position: "absolute", left: 40, top: 90, right: 40, fontFamily: ARCH, fontSize: 52, lineHeight: 1.55, color: K.ink }}>
          Here's{chip("U+200B", 0)} the thing <span style={{ display: "inline-block", padding: "0 10px", borderRadius: 40, boxShadow: ring > 0 ? `0 0 0 ${7 * ring}px ${K.red}` : "none", transform: `translate(${dashOff * 520}px, ${-dashOff * 380}px) rotate(${dashOff * 160}deg)`, opacity: 1 - c01((dashOff - 0.8) * 5) }}>—</span> this <span style={strike(ease(now - tsl, 0.25))}>game-changing</span>{chip("U+200D", 1)} tip will <span style={strike(ease(now - tsl - 0.25, 0.25))}>revolutionize</span> your{chip("U+FEFF", 2)} feed.
        </div>
      </Paper>
      <Label x={150} y={390} text="WRITTEN BY AI" size={24} rot={-3} s={pop(now - t0 - 0.3)} dark />
      {now >= th ? <Paper x={170} y={1090} w={740} h={150} rot={1.5} s={pop(now - th - 1.05)} fill={K.green}><div style={{ position: "absolute", left: 30, top: 40, fontFamily: ARCH, fontSize: 46, color: K.ink }}>This tip will grow your feed.</div></Paper> : null}
      {now >= th + 1.05 ? <Hand x={770} y={1010} text="human" size={80} rot={-8} k={ease(now - th - 1.2, 0.35)} /> : null}
    </>
  );
};

// 7. Nothing gets posted until you say yes: the POST button is taped shut until the tape rips off on "yes"
const b7: B = (now, T) => {
  const t0 = T("b7"), ty = T("yes");
  const rip = swing(now - ty, 0.4);
  const press = now >= ty + 0.25 ? interpolate(twos(now - ty - 0.25), [0, 0.08, 0.2], [1, 0.9, 1], clamp) : 1;
  return (
    <>
      <div style={{ position: "absolute", left: 210, top: 640, width: 660, height: 230, background: K.ink, borderRadius: 30, boxShadow: "0 14px 0 #000, 0 26px 30px rgba(0,0,0,0.3)", transform: `scale(${pop(now - t0) * press})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCH, fontSize: 120, color: K.paper }}>POST</div>
      {now >= t0 + 0.2 ? <div style={{ position: "absolute", left: 150, top: 690, width: 780, height: 70, background: "rgba(255,240,180,0.85)", transform: `translate(${rip * 900}px, ${-rip * 300}px) rotate(${-14 + rip * 50}deg) scale(${pop(now - t0 - 0.2)})`, boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }} /> : null}
      {now >= t0 + 0.3 ? <div style={{ position: "absolute", left: 150, top: 760, width: 780, height: 70, background: "rgba(255,240,180,0.85)", transform: `translate(${rip * -900}px, ${-rip * 200}px) rotate(${14 - rip * 50}deg) scale(${pop(now - t0 - 0.3)})`, boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }} /> : null}
      <Label x={290} y={540} text="NOTHING POSTS ON ITS OWN" size={26} rot={-2} s={pop(now - t0 - 0.4)} />
      {now >= ty ? <Hand x={330} y={940} text="yes ✓" size={200} rot={-6} k={ease(now - ty - 0.1, 0.35)} /> : null}
    </>
  );
};

// 8. Comment INSTA and I'll send you the link: the keyword types onto a paper strip, a paper plane flies it off
const b8: B = (now, T) => {
  const t0 = T("b8"), ts = T("send");
  const typed = "INSTA".slice(0, Math.max(0, Math.min(5, Math.floor((now - t0 - 0.3) / 0.08) + 1)));
  const fly = ease(now - ts - 0.2, 1.2);
  return (
    <>
      <Paper x={140} y={620} w={800} h={200} s={pop(now - t0)} rot={-2}>
        <div style={{ position: "absolute", left: 44, top: 52, fontFamily: ARCH, fontSize: 84, color: K.ink }}>Comment <span style={{ background: K.red, color: K.paper, padding: "0 14px" }}>{typed || " "}</span></div>
      </Paper>
      {now >= ts ? (
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <path d={`M 220 1120 Q 540 ${1000 - fly * 300} ${220 + fly * 900} ${1100 - fly * 700}`} fill="none" stroke={K.ink} strokeWidth={5} strokeDasharray="14 14" opacity={0.6} />
          <g transform={`translate(${220 + fly * 900} ${1100 - fly * 700}) rotate(${-30 - fly * 10}) scale(${pop(now - ts)})`}>
            <polygon points="0,0 -170,-60 -120,0 -170,60" fill={K.paper} stroke={K.ink} strokeWidth={4} style={{ filter: "drop-shadow(0 10px 10px rgba(0,0,0,0.3))" }} />
            <polygon points="-120,0 -170,60 -100,30" fill={K.grey} stroke={K.ink} strokeWidth={4} />
          </g>
        </svg>
      ) : null}
      {now >= ts ? <Hand x={560} y={900} text="sent!" size={110} rot={-8} k={ease(now - ts - 0.6, 0.3)} /> : null}
    </>
  );
};

const BEATS: { key: string; draw: B; cam: { s: number; r: number; x: number; y: number } }[] = [
  { key: "b1", draw: b1, cam: { s: 1.0, r: 0, x: 0, y: 0 } },
  { key: "b2", draw: b2, cam: { s: 1.03, r: -1.2, x: 10, y: 0 } },
  { key: "b3", draw: b3, cam: { s: 1.0, r: 1.0, x: 0, y: 0 } },
  { key: "b4", draw: b4, cam: { s: 1.04, r: -0.8, x: -10, y: 10 } },
  { key: "b5", draw: b5, cam: { s: 1.0, r: 1.2, x: 0, y: 0 } },
  { key: "b6", draw: b6, cam: { s: 1.04, r: -1.0, x: 10, y: 0 } },
  { key: "b7", draw: b7, cam: { s: 1.02, r: 0.8, x: 0, y: 0 } },
  { key: "b8", draw: b8, cam: { s: 1.0, r: -0.6, x: 0, y: 0 } },
];

export const CollageInstagram: View = {
  View: ({ t0, at, p, words }) => {
    const now = t0 + useCurrentFrame() / FPS;
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => (k === "b1" ? t0 : parts[k] ? at(parts[k]) - 0.08 : 999);
    const starts = BEATS.map((b) => T(b.key));
    let cur = 0;
    starts.forEach((s, i) => { if (now >= s) cur = i; });
    // the camera: each beat has its own framing, reached with an overshoot
    const prev = BEATS[Math.max(0, cur - 1)].cam, nx = BEATS[cur].cam;
    const k = cur === 0 ? 1 : swing(now - starts[cur], 0.35);
    const cam = { s: prev.s + (nx.s - prev.s) * k, r: prev.r + (nx.r - prev.r) * k, x: prev.x + (nx.x - prev.x) * k, y: prev.y + (nx.y - prev.y) * k };
    const mark = new Set(((p.mark as string[]) || []).map(norm));
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, background: K.board, overflow: "hidden" }}>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.2, mixBlendMode: "multiply" }}>
          <filter id="kraft"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={2} seed={3} /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width={1080} height={1920} filter="url(#kraft)" />
        </svg>
        <div style={{ position: "absolute", left: 60, right: 60, top: 70, display: "flex", gap: 10 }}>
          {BEATS.map((_, i) => <div key={i} style={{ flex: 1, height: 14, background: i <= cur ? K.ink : "rgba(30,30,30,0.18)", transform: `rotate(${(i % 2 ? 1 : -1) * 0.8}deg)` }} />)}
        </div>
        <div style={{ position: "absolute", inset: 0, transform: `translate(${cam.x}px, ${cam.y}px) rotate(${cam.r}deg) scale(${cam.s})`, transformOrigin: "50% 45%" }}>
          {BEATS[cur].draw(now, T)}
        </div>
        {words ? <Captions words={words} now={now} mark={mark} /> : null}
      </div>
    );
  },
  hits: ({ at, p }) => {
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => at(parts[k]);
    // earshot, 2026-11-06: 1.90 salient hits a second against at most 1.66 in professional films, and a thin bottom.
    // The slash and the split stay loud (with a sub drop under the split); every other effect sits about 4 dB lower.
    const soft = 0.62;
    return [
      { t: T("killed") - 0.02, sound: "whip", gain: 0.5 },
      { t: T("killed") + 0.4, sound: "impact", gain: 0.4 },
      { t: T("killed") + 0.4, sound: "subdrop", gain: 0.45 },
      { t: T("withc") + 0.02, sound: "stamp", gain: 0.3 * soft },
      { t: T("free") + 0.02, sound: "stamp", gain: 0.35 * soft },
      { t: T("b3") + 0.1, sound: "paper", gain: 0.3 * soft },
      { t: T("f26"), sound: "paper", gain: 0.25 * soft },
      { t: T("scores") + 0.3, sound: "tick", gain: 0.3 * soft },
      { t: T("film") + 0.15, sound: "snap", gain: 0.35 * soft },
      { t: T("ranks"), sound: "swish", gain: 0.25 * soft },
      { t: T("em") + 0.35, sound: "whip", gain: 0.25 * soft },
      { t: T("hidden") + 0.9, sound: "swipe", gain: 0.25 * soft },
      { t: T("yes"), sound: "tape", gain: 0.4 * soft },
      { t: T("b8") + 0.4, sound: "typing", gain: 0.2 * soft },
      { t: T("send") + 0.2, sound: "whoosh", gain: 0.3 * soft },
    ];
  },
};
