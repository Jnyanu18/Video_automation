# 10 animation styles: the Claude skills

These are the skills behind the rocket video: one skill that builds the whole reel (one subject, one continuous take, redrawn in ten styles), and ten style skills, one for each look. The video was made the same way, as code (React and SVG with Remotion), with no image generator.

## How to install

The fastest way: open Claude Code in your project, paste this whole document and say "Install all of these skills". Claude creates every file below in `.claude/skills/`.

To do it by hand, save each block below as a file at the path in its heading, inside your project's `.claude/skills/` folder (or `~/.claude/skills/` to have them in every project). There are 14 files.

## How to use them

Ask Claude Code for the reel and name your subject, for example: "Use the animation-styles skill to make a reel of a cat jumping onto a table, in all ten styles, 14 seconds."

Or use one style on its own: "Animate a coffee being poured in the risograph style, vertical 1080 by 1920."

You need Node.js installed. The skill sets up Remotion for you and renders the video to an mp4.

## The reel skill: animation-styles

### .claude/skills/animation-styles/SKILL.md

```
---
name: animation-styles
description: Make a vertical reel that shows one subject in one continuous take, redrawn in many animation styles (pixel art, chalkboard, blueprint, comic book, paper cut-out, neon glow, ink brush, flat vector, retro terminal, risograph). Use when the user asks for a "styles" video, the same scene in different styles, or any of these looks as an animation. Built with Remotion and SVG, no image generator.
---

# Animation styles reel

One subject, one continuous take, many styles. The subject never restarts: each new style sweeps up the screen while
the motion carries on, and at the end the frame splits into one band per style so every style is seen at once. That
continuity is what makes it watchable; ten separate clips with hard cuts are much weaker.

The working example is in `template/`: a rocket launches with a person watching below, in ten styles, 14 seconds,
1080 by 1920. Start from it.

## Set up

1. Make a Remotion project if there is none: `npx create-video@latest --blank`, then
   `npm i @remotion/google-fonts`.
2. Copy `StyleReel.tsx`, `Root.tsx` and `index.ts` from this skill's `template/` folder into the project's `src/`
   (they replace its own `Root.tsx` and `index.ts`).
3. Preview with `npx remotion studio src/index.ts`. Render with
   `npx remotion render src/index.ts StyleReel out/reel.mp4`.

## How the template is built

- `mk(t)` is the one source of motion: where the subject is at time `t` (the rocket's height, the flame's length,
  the smoke puffs, the person's arms, the scroll speed of the background). Every style calls it, so all styles show
  the same moment. Change the subject here.
- The shape helpers (`body`, `nose`, `finL`, `finR`, `flame`, `person`) return SVG paths from that state. Every style
  draws the same shapes, so the subject stays recognisable across styles.
- Each style is a `Draw` function: `(t, localTime, timing, idPrefix) => SVG`. It draws a background, the shapes in its
  own way and a few details of its own. Keep every SVG `id` prefixed with `idPrefix`, because two styles are on screen
  together during a sweep and all ten in the ending.
- `STYLES` lists the styles in order. `StyleReel` takes `starts` (the second each style begins) and `bands` (when the
  ten bands open). To sync with a voiceover, set `starts` to the moments each style is named.
- The sweep: the new style is clipped to a rectangle that grows up from the bottom over 0.28 s, with a thin white
  line on its edge.

## Making a new one

1. Ask what the subject is (a car, a cat jumping, a coffee pouring, a logo) and how long the reel should be.
2. Rewrite `mk()` and the shape helpers for that subject. Keep the motion continuous and readable at phone size: one
   big subject, one small second character or detail that reacts to it.
3. Keep or swap styles. The look rules for each are in its own style skill (pixel-art, chalkboard, blueprint,
   comic-book, paper-cut-out, neon-glow, ink-brush, flat-vector, retro-terminal, risograph). A style earns its place
   if it is recognisable in under a second.
4. Check before rendering the whole thing: render one still per style with
   `npx remotion still src/index.ts StyleReel out/s4.png --frame=150`, look at each one, and fix anything that is cut
   off, overlapping or unreadable. Then render the video.

## Rules

- The subject never restarts between styles.
- The same geometry in every style; only the drawing changes.
- Big shapes, few details: it is watched on a phone.
- Text inside the art is short (a sound word, a label, a sign).
- No 3D in this template: every style here is flat SVG with filters, which renders fast and looks deliberate.
- Fonts come from `@remotion/google-fonts` (Press Start 2P, VT323, Bangers, Caveat, IBM Plex Mono, Fraunces).
```

### .claude/skills/animation-styles/template/index.ts

```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

### .claude/skills/animation-styles/template/Root.tsx

```tsx
import React from "react";
import { Composition } from "remotion";
import { StyleReel, defaultStyleReelProps } from "./StyleReel";

// A vertical reel, 1080 by 1920 at 30 fps, 14 seconds.
export const RemotionRoot: React.FC = () => (
  <Composition id="StyleReel" component={StyleReel} durationInFrames={14 * 30} fps={30} width={1080} height={1920} defaultProps={defaultStyleReelProps} />
);
```

### .claude/skills/animation-styles/template/StyleReel.tsx

The whole reel: the launch, the ten styles, the sweep between them and the ten-band ending.

```tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadPixel } from "@remotion/google-fonts/PressStart2P";
import { loadFont as loadVT } from "@remotion/google-fonts/VT323";
import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadSerif } from "@remotion/google-fonts/Fraunces";

/** StyleReel: one subject (a rocket launch with a person watching) in one continuous take, redrawn in ten styles.
 *  The rocket never stops climbing. Each new style sweeps up the window at its start time, and at the end the window
 *  splits into ten bands so the subject is seen in every style at once. Everything is SVG drawn in code.
 *  To make your own: change the subject in mk() and the shape helpers, then restyle or replace the draw functions. */

const PIX = loadPixel("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const VT = loadVT("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const BANG = loadBangers("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const HAND = loadCaveat("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily;
const MONO = loadMono("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;
const SERIF = loadSerif("normal", { weights: ["600"], subsets: ["latin"] }).fontFamily;
const GOLD = "#ffc400";

const W = 960, H = 1240, GY = 1090, PX = 250, RX = 620;
const WIN_TOP = 470;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const rng = (seed: number) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const wrap = (v: number, lo: number, hi: number) => lo + ((((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo));

type Tm = { tl: number; tc: number };
type Puff = { x: number; y: number; r: number; o: number };
type St = { t: number; cx: number; by: number; L: number; sc: number; lh: [number, number]; rh: [number, number]; cheer: number; puffs: Puff[]; alt: number };

/** The one launch every style draws: where the rocket is, how long the flame is, the person's arms, the smoke. */
const mk = (t: number, tm: Tm): St => {
  const u = clamp01((t - tm.tl) / (tm.tc - tm.tl));
  let by = 1060 - 500 * (1 - (1 - u) * (1 - u)) - 40 * clamp01((t - tm.tc) / 2.5);
  const tx = tm.tc + 2.7;
  if (t > tx) by -= 1700 * (t - tx) * (t - tx);
  const fl = 0.5 + 0.25 * Math.sin(t * 47) + 0.25 * Math.sin(t * 31 + 1);
  const lit = clamp01((t - (tm.tl - 0.35)) / 0.3);
  const L = lit * (90 + 80 * u + 34 * fl);
  const sc = t < tm.tl ? 0 : 170 * Math.pow(t - tm.tl, 1.35);
  const cheer = clamp01((t - tm.tc) / 0.3);
  const deg = Math.PI / 180;
  const ra = t < tm.tl + 1.2 ? 145 + 25 * Math.sin(t * 11) : cheer ? 150 + 14 * Math.sin(t * 9) : 158;
  const la = cheer ? -150 - 14 * Math.sin(t * 9) : -18;
  const sx = PX, sy = GY - 118;
  const puffs = Array.from({ length: 10 }, (_, i) => {
    const age = t - (tm.tl - 0.25 + i * 0.09);
    if (age < 0) return null;
    const side = i % 2 ? 1 : -1;
    return { x: RX + side * (24 + age * 55 * (0.6 + (i % 3) * 0.35)), y: GY - 28 - age * 16 - (i % 3) * 16, r: 30 + 58 * Math.pow(Math.min(age, 3), 0.6), o: clamp01(1 - age / 3.4) };
  }).filter((p): p is Puff => p !== null);
  return {
    t, cx: RX + 5 * Math.sin(t * 2.7), by, L, sc, cheer, puffs,
    rh: [sx + 62 * Math.sin(ra * deg), sy + 62 * Math.cos(ra * deg)],
    lh: [sx + 62 * Math.sin(la * deg), sy + 62 * Math.cos(la * deg)],
    alt: t < tm.tl ? 0 : 0.9 * Math.pow(t - tm.tl, 2.1),
  };
};

// the shapes, shared by every style
const body = (cx: number, by: number) => `M${cx - 50} ${by} L${cx - 50} ${by - 200} C${cx - 50} ${by - 275} ${cx - 22} ${by - 318} ${cx} ${by - 340} C${cx + 22} ${by - 318} ${cx + 50} ${by - 275} ${cx + 50} ${by - 200} L${cx + 50} ${by} Z`;
const nose = (cx: number, by: number) => `M${cx - 44} ${by - 255} C${cx - 32} ${by - 300} ${cx - 16} ${by - 324} ${cx} ${by - 340} C${cx + 16} ${by - 324} ${cx + 32} ${by - 300} ${cx + 44} ${by - 255} Z`;
const finL = (cx: number, by: number) => `M${cx - 50} ${by - 95} L${cx - 98} ${by + 8} L${cx - 50} ${by - 8} Z`;
const finR = (cx: number, by: number) => `M${cx + 50} ${by - 95} L${cx + 98} ${by + 8} L${cx + 50} ${by - 8} Z`;
const flame = (cx: number, y0: number, L: number, w: number) => `M${cx - w} ${y0} Q${cx - w * 0.7} ${y0 + L * 0.6} ${cx} ${y0 + L} Q${cx + w * 0.7} ${y0 + L * 0.6} ${cx + w} ${y0} Z`;
const person = (s: St) => `M${PX} ${GY - 132} L${PX} ${GY - 62} M${PX - 24} ${GY} L${PX} ${GY - 62} L${PX + 24} ${GY} M${s.lh[0].toFixed(1)} ${s.lh[1].toFixed(1)} L${PX} ${GY - 118} L${s.rh[0].toFixed(1)} ${s.rh[1].toFixed(1)}`;
const HEAD: [number, number] = [PX, GY - 158];

/** A rocket drawn with fills: fins, body, nose, window, nozzle, flame. */
const Rocket: React.FC<{ s: St; body: string; nose: string; fin: string; win: string; ring: string; nozzle: string; outer: string; inner: string; stroke?: string; sw?: number }> = ({ s, stroke, sw = 0, ...c }) => {
  const st = stroke ? { stroke, strokeWidth: sw, strokeLinejoin: "round" as const } : {};
  return (
    <g>
      {s.L > 1 ? <path d={flame(s.cx, s.by + 16, s.L, 30)} fill={c.outer} {...st} /> : null}
      {s.L > 1 ? <path d={flame(s.cx, s.by + 16, s.L * 0.6, 16)} fill={c.inner} /> : null}
      <rect x={s.cx - 30} y={s.by - 2} width={60} height={20} fill={c.nozzle} {...st} />
      <path d={finL(s.cx, s.by)} fill={c.fin} {...st} />
      <path d={finR(s.cx, s.by)} fill={c.fin} {...st} />
      <path d={body(s.cx, s.by)} fill={c.body} {...st} />
      <path d={nose(s.cx, s.by)} fill={c.nose} {...st} />
      <circle cx={s.cx} cy={s.by - 190} r={24} fill={c.win} stroke={c.ring} strokeWidth={8} />
    </g>
  );
};

type Draw = (t: number, lt: number, tm: Tm, id: string) => React.ReactNode;

const stars = (seed: number, n: number, sc: number, f: number, render: (x: number, y: number, k: number) => React.ReactNode) => {
  const r = rng(seed);
  return Array.from({ length: n }, (_, k) => { const x = r() * W, y0 = r() * 900; return <React.Fragment key={k}>{render(x, wrap(y0 + sc * f, -40, 900), k)}</React.Fragment>; });
};
const clouds = (seed: number, n: number, sc: number, f: number, render: (x: number, y: number, k: number) => React.ReactNode) => {
  const r = rng(seed);
  return Array.from({ length: n }, (_, k) => { const x = 80 + r() * (W - 160), y0 = r() * 1000; return <React.Fragment key={k}>{render(x, wrap(y0 + sc * f, -160, 860), k)}</React.Fragment>; });
};

// 1 Pixel art: a sunset city, everything sampled down to 12 px blocks
const pixel: Draw = (t, _lt, tm, id) => {
  const s = mk(t, tm);
  const r = rng(11);
  const city = Array.from({ length: 13 }, (_, i) => ({ x: i * 76 - 10, h: 120 + Math.floor(r() * 220), w: 70 }));
  return (
    <g>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a0b3d" /><stop offset="0.55" stopColor="#7a2a8c" /><stop offset="0.85" stopColor="#ff7a59" /></linearGradient>
        <filter id={`${id}px`} x="0" y="0" width={W} height={H} filterUnits="userSpaceOnUse">
          <feFlood x="5" y="5" width="2" height="2" />
          <feComposite width="12" height="12" />
          <feTile result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
          <feMorphology operator="dilate" radius="6" />
        </filter>
      </defs>
      <g filter={`url(#${id}px)`}>
        <rect width={W} height={H} fill={`url(#${id}sky)`} />
        {stars(3, 34, s.sc, 0.5, (x, y) => <rect x={x} y={y} width={12} height={12} fill="#fff3c4" />)}
        <circle cx={470} cy={860} r={170} fill="#ffb347" />
        {city.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={GY - b.h} width={b.w} height={b.h} fill="#241446" />
            {Array.from({ length: Math.floor(b.h / 40) }, (_, j) => (r() > 0.45 ? <rect key={j} x={b.x + 14 + (j % 2) * 28} y={GY - b.h + 16 + j * 36} width={14} height={14} fill="#ffd166" /> : null))}
          </g>
        ))}
        <rect y={GY} width={W} height={H - GY} fill="#1d1233" />
        <rect y={GY} width={W} height={8} fill="#ff4fd8" />
        <rect x={RX - 80} y={GY - 30} width={160} height={30} fill="#5b5b7a" />
        {s.puffs.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#f4eefa" opacity={p.o} />)}
        <Rocket s={s} body="#f3f3f7" nose="#e8384f" fin="#e8384f" win="#39c6ff" ring="#1e2a4a" nozzle="#3d3d55" outer="#ff4d2e" inner="#ffd34d" />
        <path d={person(s)} stroke="#39c6ff" strokeWidth={14} fill="none" strokeLinecap="square" />
        <circle cx={HEAD[0]} cy={HEAD[1]} r={26} fill="#f2b98a" />
      </g>
      <text x={34} y={104} fontFamily={PIX} fontSize={26} fill="#fff3c4">1UP</text>
      <text x={W - 34} y={70} textAnchor="end" fontFamily={PIX} fontSize={26} fill="#ff4fd8">♥♥♥</text>
    </g>
  );
};

// 2 Chalkboard: a green board, chalk lines with a broken edge, a scribbled note
const chalk: Draw = (t, _lt, tm, id) => {
  const s = mk(t, tm);
  const ink = { stroke: "#eeeee4", strokeWidth: 5, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g>
      <defs>
        <filter id={`${id}ch`} x="0" y="0" width={W} height={H} filterUnits="userSpaceOnUse">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="1" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="9" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3 0 0 0 -0.75" result="m" />
          <feComposite in="d" in2="m" operator="in" />
        </filter>
      </defs>
      <rect width={W} height={H} fill="#253a30" />
      <ellipse cx={300} cy={400} rx={260} ry={120} fill="#fff" opacity={0.04} />
      <ellipse cx={700} cy={820} rx={300} ry={140} fill="#fff" opacity={0.035} />
      <g filter={`url(#${id}ch)`}>
        {clouds(5, 4, s.sc, 0.6, (x, y) => <path d={`M${x - 70} ${y} a34 34 0 0 1 50 -30 a44 44 0 0 1 80 4 a32 32 0 0 1 30 26 Z`} {...ink} />)}
        <path d={`M40 ${GY} Q240 ${GY - 6} 480 ${GY + 2} T920 ${GY - 3}`} {...ink} />
        <rect x={RX - 80} y={GY - 30} width={160} height={30} {...ink} />
        {s.puffs.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} {...ink} opacity={p.o} />)}
        {s.L > 1 ? <path d={flame(s.cx, s.by + 16, s.L, 30)} {...ink} stroke="#f3e27a" /> : null}
        {s.L > 1 ? <path d={flame(s.cx, s.by + 16, s.L * 0.55, 14)} {...ink} stroke="#f3e27a" /> : null}
        <rect x={s.cx - 30} y={s.by - 2} width={60} height={20} {...ink} />
        <path d={finL(s.cx, s.by)} {...ink} />
        <path d={finR(s.cx, s.by)} {...ink} />
        <path d={body(s.cx, s.by)} {...ink} />
        <path d={`M${s.cx - 44} ${s.by - 255} L${s.cx + 44} ${s.by - 255}`} {...ink} />
        <circle cx={s.cx} cy={s.by - 190} r={24} {...ink} />
        <path d={person(s)} {...ink} strokeWidth={6} />
        <circle cx={HEAD[0]} cy={HEAD[1]} r={24} {...ink} strokeWidth={6} />
        <text x={90} y={250} fontFamily={HAND} fontSize={70} fill="#eeeee4">F = m · a</text>
        <path d={`M210 280 Q${(210 + s.cx) / 2} ${Math.min(320, s.by - 260)} ${s.cx - 80} ${s.by - 230}`} {...ink} stroke="#f3e27a" />
        <text x={110} y={900} fontFamily={HAND} fontSize={52} fill="#f3e27a">go go go!</text>
      </g>
      <rect x={10} y={10} width={W - 20} height={H - 20} fill="none" stroke="#7a4f2a" strokeWidth={22} rx={8} />
    </g>
  );
};

// 3 Blueprint: a moving grid, outlines, dimension lines and a title block
const blueprint: Draw = (t, _lt, tm, id) => {
  const s = mk(t, tm);
  const ln = { stroke: "#eaf2ff", strokeWidth: 3, fill: "none" };
  const dx = s.cx + 130;
  return (
    <g>
      <defs>
        <pattern id={`${id}g1`} width="24" height="24" patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${(s.sc % 120).toFixed(1)})`}><path d="M24 0 L0 0 0 24" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" /></pattern>
        <pattern id={`${id}g2`} width="120" height="120" patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${(s.sc % 120).toFixed(1)})`}><path d="M120 0 L0 0 0 120" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" /></pattern>
      </defs>
      <rect width={W} height={H} fill="#1c4d8e" />
      <rect width={W} height={H} fill={`url(#${id}g1)`} />
      <rect width={W} height={H} fill={`url(#${id}g2)`} />
      <path d={`M0 ${GY} L${W} ${GY}`} {...ln} />
      {Array.from({ length: 40 }, (_, i) => <path key={i} d={`M${i * 26} ${GY + 18} L${i * 26 + 18} ${GY}`} {...ln} strokeWidth={1.5} />)}
      <rect x={RX - 80} y={GY - 30} width={160} height={30} {...ln} />
      {s.puffs.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} {...ln} strokeWidth={2} strokeDasharray="8 8" opacity={p.o} />)}
      {s.L > 1 ? <path d={flame(s.cx, s.by + 16, s.L, 30)} {...ln} strokeDasharray="10 8" /> : null}
      <rect x={s.cx - 30} y={s.by - 2} width={60} height={20} {...ln} />
      <path d={finL(s.cx, s.by)} {...ln} />
      <path d={finR(s.cx, s.by)} {...ln} />
      <path d={body(s.cx, s.by)} {...ln} />
      <path d={`M${s.cx - 44} ${s.by - 255} L${s.cx + 44} ${s.by - 255}`} {...ln} />
      <circle cx={s.cx} cy={s.by - 190} r={24} {...ln} />
      <path d={`M${s.cx} ${s.by + 30} L${s.cx} ${s.by - 380}`} {...ln} strokeWidth={1.5} strokeDasharray="18 8 4 8" />
      <path d={`M${dx} ${s.by} L${dx} ${s.by - 340} M${dx - 14} ${s.by} L${dx + 14} ${s.by} M${dx - 14} ${s.by - 340} L${dx + 14} ${s.by - 340} M${s.cx + 56} ${s.by - 340} L${dx + 18} ${s.by - 340}`} {...ln} strokeWidth={2} />
      <text x={dx + 34} y={s.by - 170} fontFamily={MONO} fontSize={26} fill="#eaf2ff" transform={`rotate(-90 ${dx + 34} ${s.by - 170})`} textAnchor="middle">H 42.0 m</text>
      <path d={`M${s.cx - 24} ${s.by - 200} L${s.cx - 190} ${s.by - 280} L${s.cx - 330} ${s.by - 280}`} {...ln} strokeWidth={2} />
      <text x={s.cx - 330} y={s.by - 292} fontFamily={MONO} fontSize={24} fill="#eaf2ff">PORT Ø 0.9 m</text>
      <path d={person(s)} {...ln} strokeWidth={4} />
      <circle cx={HEAD[0]} cy={HEAD[1]} r={24} {...ln} strokeWidth={4} />
      <path d={`M${PX - 80} ${GY} L${PX - 80} ${GY - 182} M${PX - 92} ${GY} L${PX - 68} ${GY} M${PX - 92} ${GY - 182} L${PX - 68} ${GY - 182}`} {...ln} strokeWidth={2} />
      <text x={PX - 96} y={GY - 91} fontFamily={MONO} fontSize={22} fill="#eaf2ff" textAnchor="end">1.8 m</text>
      <rect x={W - 380} y={GY + 26} width={350} height={100} {...ln} />
      <path d={`M${W - 380} ${GY + 72} L${W - 30} ${GY + 72}`} {...ln} strokeWidth={2} />
      <text x={W - 364} y={GY + 60} fontFamily={MONO} fontSize={24} fill="#eaf2ff">ROCKET LV-10</text>
      <text x={W - 364} y={GY + 108} fontFamily={MONO} fontSize={19} fill="#eaf2ff">SHEET 03/10  SCALE 1:200</text>
    </g>
  );
};

const starPts = (cx: number, cy: number, n: number, r1: number, r2: number) =>
  Array.from({ length: n * 2 }, (_, i) => { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r2 : r1; return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`; }).join(" ");

// 4 Comic book: thick ink outlines, halftone sky, speed lines, a sound-word burst
const comic: Draw = (t, lt, tm, id) => {
  const s = mk(t, tm);
  const k = { stroke: "#111", strokeWidth: 7, strokeLinejoin: "round" as const };
  const pop = lt < 0.15 ? (lt / 0.15) * 1.15 : 1 + 0.15 * Math.exp(-(lt - 0.15) * 8);
  const r = rng(21);
  return (
    <g>
      <defs><pattern id={`${id}dot`} width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="4.5" fill="rgba(255,255,255,0.38)" /></pattern></defs>
      <rect width={W} height={H} fill="#2fa8e8" />
      <rect width={W} height={H} fill={`url(#${id}dot)`} />
      {Array.from({ length: 14 }, (_, i) => { const x = r() * W, y0 = r() * 1100; const y = wrap(y0 + s.sc * 1.6, -200, 1000); return <path key={i} d={`M${x} ${y} L${x} ${y + 170}`} stroke="#fff" strokeWidth={6} opacity={0.75} strokeLinecap="round" />; })}
      {clouds(8, 3, s.sc, 0.7, (x, y) => <g><circle cx={x - 40} cy={y} r={40} fill="#fff" {...k} /><circle cx={x + 10} cy={y - 22} r={52} fill="#fff" {...k} /><circle cx={x + 62} cy={y} r={38} fill="#fff" {...k} /></g>)}
      <path d={`M-20 ${GY - 10} Q240 ${GY - 70} 480 ${GY - 20} T980 ${GY - 30} L980 ${H + 20} L-20 ${H + 20} Z`} fill="#6ccf4f" {...k} />
      <rect x={RX - 80} y={GY - 40} width={160} height={30} fill="#9e9e9e" {...k} />
      {s.puffs.map((p, i) => <circle key={i} cx={p.x} cy={p.y - 10} r={p.r} fill="#fff" {...k} opacity={p.o} />)}
      {s.L > 1 ? <polygon points={starPts(s.cx, s.by + 16 + s.L * 0.45, 9, s.L * 0.55, s.L * 0.3)} fill="#ff6d00" {...k} /> : null}
      <Rocket s={s} body="#ffffff" nose="#e53935" fin="#e53935" win="#4fc3f7" ring="#111" nozzle="#555" outer="#ffd600" inner="#fff59d" stroke="#111" sw={7} />
      <path d={person(s)} stroke="#111" strokeWidth={12} fill="none" strokeLinecap="round" />
      <circle cx={HEAD[0]} cy={HEAD[1]} r={26} fill="#ffcc99" {...k} />
      <g transform={`translate(250 300) rotate(-8) scale(${pop.toFixed(3)})`}>
        <polygon points={starPts(0, 0, 14, 175, 118)} fill="#ffeb3b" {...k} />
        <text y={24} textAnchor="middle" fontFamily={BANG} fontSize={84} fill="#e53935" stroke="#111" strokeWidth={4} paintOrder="stroke">LIFTOFF!</text>
      </g>
    </g>
  );
};

// 5 Paper cut-out: paper layers with real shadows, moving in stop-motion steps of 12 a second
const paper: Draw = (t, _lt, tm, id) => {
  const step = Math.floor(t * 12);
  const s = mk(step / 12, tm);
  const j = rng(step + 7);
  const jr = () => (j() - 0.5) * 2;
  const sh = `url(#${id}sh)`;
  return (
    <g>
      <defs>
        <filter id={`${id}sh`} x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="5" floodOpacity="0.28" /></filter>
        <filter id={`${id}tx`} x="0" y="0" width={W} height={H} filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" /><feColorMatrix type="saturate" values="0" /></filter>
      </defs>
      <rect width={W} height={H} fill="#bfe0ec" />
      <circle cx={760} cy={300} r={110} fill="#ffb44d" filter={sh} />
      {clouds(14, 4, s.sc, 0.6, (x, y) => <ellipse cx={x} cy={y} rx={110} ry={44} fill="#ffffff" filter={sh} />)}
      <path d={`M-20 ${GY - 120} Q200 ${GY - 260} 420 ${GY - 140} T980 ${GY - 160} L980 ${H} L-20 ${H} Z`} fill="#9fd3a8" filter={sh} />
      <path d={`M-20 ${GY - 40} Q300 ${GY - 130} 600 ${GY - 50} T980 ${GY - 60} L980 ${H} L-20 ${H} Z`} fill="#6fb487" filter={sh} />
      <rect y={GY} width={W} height={H - GY} fill="#e3c08f" filter={sh} />
      <rect x={RX - 80} y={GY - 30} width={160} height={30} fill="#c9b8a4" filter={sh} />
      {s.puffs.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#fffdf7" opacity={p.o} filter={sh} />)}
      <g filter={sh} transform={`rotate(${(jr() * 1.2).toFixed(2)} ${s.cx} ${s.by - 150}) translate(${(jr() * 2).toFixed(1)} ${(jr() * 2).toFixed(1)})`}>
        <Rocket s={s} body="#fffaf0" nose="#ef6f5a" fin="#ef6f5a" win="#5fb3d9" ring="#fffaf0" nozzle="#8a7f73" outer="#ff8a3d" inner="#ffd166" />
      </g>
      <g filter={sh} transform={`rotate(${(jr() * 1.5).toFixed(2)} ${PX} ${GY - 80})`}>
        <path d={person(s)} stroke="#3b5ba5" strokeWidth={20} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={HEAD[0]} cy={HEAD[1]} r={28} fill="#f0c39a" />
      </g>
      <rect width={W} height={H} filter={`url(#${id}tx)`} opacity={0.07} style={{ mixBlendMode: "multiply" }} />
    </g>
  );
};

// 6 Neon glow: glowing tubes on black, a striped sun, a flickering sign
const neon: Draw = (t, _lt, tm, id) => {
  const s = mk(t, tm);
  const g = `url(#${id}gl)`;
  const hz = GY - 110;
  const tube = (c: string, w = 5) => ({ stroke: c, strokeWidth: w, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const });
  const flick = Math.sin(t * 53) > 0.8 ? 0.35 : 1;
  return (
    <g>
      <defs>
        <filter id={`${id}gl`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <linearGradient id={`${id}sun`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffcf3f" /><stop offset="1" stopColor="#ff3fa4" /></linearGradient>
      </defs>
      <rect width={W} height={H} fill="#08040f" />
      {stars(31, 40, s.sc, 0.4, (x, y, k) => <circle cx={x} cy={y} r={k % 3 ? 2 : 3} fill="#fff" opacity={0.6} />)}
      <g opacity={0.85}>
        <circle cx={480} cy={hz} r={200} fill={`url(#${id}sun)`} />
        {Array.from({ length: 6 }, (_, i) => <rect key={i} x={260} y={hz - 110 + i * 22} width={440} height={4 + i * 2.2} fill="#08040f" />)}
        <rect x={0} y={hz} width={W} height={H - hz} fill="#08040f" />
      </g>
      <g filter={g}>
        <path d={`M0 ${hz} L${W} ${hz}`} {...tube("#ff3fd8", 3)} />
        {Array.from({ length: 11 }, (_, i) => <path key={i} d={`M${480 + (i - 5) * 30} ${hz} L${480 + (i - 5) * 260} ${H}`} {...tube("#ff3fd8", 2)} opacity={0.7} />)}
        {Array.from({ length: 5 }, (_, i) => { const y = hz + Math.pow((i + 1 + ((t * 2) % 1)) / 6, 2) * (H - hz); return <path key={i} d={`M0 ${y} L${W} ${y}`} {...tube("#ff3fd8", 2)} opacity={0.6} />; })}
        <rect x={RX - 80} y={GY - 30} width={160} height={30} {...tube("#3ef0ff", 3)} />
        {s.puffs.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} {...tube("#9b5cff", 3)} opacity={p.o} />)}
        {s.L > 1 ? <path d={flame(s.cx, s.by + 16, s.L, 30)} {...tube("#ffb13b", 5)} /> : null}
        {s.L > 1 ? <path d={flame(s.cx, s.by + 16, s.L * 0.55, 13)} {...tube("#ffffff", 3)} /> : null}
        <rect x={s.cx - 30} y={s.by - 2} width={60} height={20} {...tube("#3ef0ff", 4)} />
        <path d={finL(s.cx, s.by)} {...tube("#ff3fd8")} />
        <path d={finR(s.cx, s.by)} {...tube("#ff3fd8")} />
        <path d={body(s.cx, s.by)} {...tube("#3ef0ff")} />
        <path d={nose(s.cx, s.by)} {...tube("#ff3fd8")} />
        <circle cx={s.cx} cy={s.by - 190} r={24} {...tube("#ffe94a")} />
        <path d={person(s)} {...tube("#b6ff3b", 7)} />
        <circle cx={HEAD[0]} cy={HEAD[1]} r={24} {...tube("#b6ff3b", 7)} />
        <text x={80} y={250} fontFamily={HAND} fontSize={110} fill="none" stroke="#ff3fd8" strokeWidth={3} opacity={flick} transform="rotate(-6 80 250)">liftoff</text>
      </g>
    </g>
  );
};

// 7 Ink brush: cream paper, rough black ink, a red sun and a seal
const ink: Draw = (t, _lt, tm, id) => {
  const s = mk(t, tm);
  return (
    <g>
      <defs>
        <filter id={`${id}ink`} x="0" y="0" width={W} height={H} filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="6" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="10" xChannelSelector="R" yChannelSelector="G" /></filter>
        <filter id={`${id}tx`} x="0" y="0" width={W} height={H} filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" seed="12" /><feColorMatrix type="saturate" values="0" /></filter>
      </defs>
      <rect width={W} height={H} fill="#efe5cf" />
      <g filter={`url(#${id}ink)`}>
        <circle cx={300} cy={380} r={130} fill="#c43a2f" opacity={0.92} />
        {stars(41, 8, s.sc, 1.3, (x, y) => <path d={`M${x} ${y} L${x + 4} ${y + 150}`} stroke="#1b1b1b" strokeWidth={4} opacity={0.3} strokeLinecap="round" />)}
        <path d={`M-20 ${GY - 30} L120 ${GY - 230} L260 ${GY - 120} L400 ${GY - 300} L560 ${GY - 90} L980 ${GY - 60} L980 ${GY} L-20 ${GY} Z`} fill="#8f8a80" opacity={0.35} />
        <path d={`M-20 ${GY - 10} L180 ${GY - 140} L330 ${GY - 40} L760 ${GY - 160} L980 ${GY - 30} L980 ${GY} L-20 ${GY} Z`} fill="#3f3b36" opacity={0.5} />
        <path d={`M20 ${GY + 6} Q300 ${GY - 6} 520 ${GY + 4} T940 ${GY}`} stroke="#1b1b1b" strokeWidth={16} fill="none" strokeLinecap="round" />
        {s.puffs.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#7a756c" opacity={0.3 * p.o} />)}
        <Rocket s={s} body="#1b1b1b" nose="#1b1b1b" fin="#1b1b1b" win="#efe5cf" ring="#1b1b1b" nozzle="#1b1b1b" outer="#c43a2f" inner="#e0725f" />
        <path d={`M${s.cx - 30} ${s.by - 40} L${s.cx - 30} ${s.by - 220}`} stroke="#efe5cf" strokeWidth={5} opacity={0.5} strokeLinecap="round" />
        <path d={person(s)} stroke="#1b1b1b" strokeWidth={13} fill="none" strokeLinecap="round" />
        <circle cx={HEAD[0]} cy={HEAD[1]} r={25} fill="#1b1b1b" />
      </g>
      <g transform={`rotate(4 ${W - 120} 170)`}>
        <rect x={W - 180} y={110} width={120} height={120} fill="#b8322a" rx={6} />
        <text x={W - 120} y={190} textAnchor="middle" fontFamily={SERIF} fontSize={58} fill="#efe5cf">UP</text>
      </g>
      <rect width={W} height={H} filter={`url(#${id}tx)`} opacity={0.08} style={{ mixBlendMode: "multiply" }} />
    </g>
  );
};

// 8 Flat vector: clean flat shapes, no outlines
const flat: Draw = (t, _lt, tm) => {
  const s = mk(t, tm);
  return (
    <g>
      <rect width={W} height={H} fill="#8ecae6" />
      <circle cx={790} cy={270} r={110} fill="#ffb703" />
      {clouds(17, 4, s.sc, 0.6, (x, y) => <g><rect x={x - 90} y={y - 22} width={180} height={44} rx={22} fill="#ffffff" /><circle cx={x - 10} cy={y - 26} r={36} fill="#ffffff" /></g>)}
      <path d={`M-20 ${GY} Q220 ${GY - 220} 470 ${GY} Z`} fill="#3fae9f" />
      <path d={`M380 ${GY} Q680 ${GY - 260} 980 ${GY} Z`} fill="#52b8a8" />
      <rect y={GY} width={W} height={H - GY} fill="#2a9d8f" />
      <rect x={RX - 80} y={GY - 30} width={160} height={30} rx={8} fill="#264653" />
      {s.puffs.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#ffffff" opacity={p.o} />)}
      <Rocket s={s} body="#f1faee" nose="#e63946" fin="#e63946" win="#457b9d" ring="#a8dadc" nozzle="#264653" outer="#fb8500" inner="#ffb703" />
      <path d={`M${PX - 24} ${GY} L${PX} ${GY - 62} L${PX + 24} ${GY}`} stroke="#1d3640" strokeWidth={15} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${s.lh[0].toFixed(1)} ${s.lh[1].toFixed(1)} L${PX} ${GY - 118} L${s.rh[0].toFixed(1)} ${s.rh[1].toFixed(1)}`} stroke="#264653" strokeWidth={13} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x={PX - 22} y={GY - 136} width={44} height={80} rx={20} fill="#264653" />
      <circle cx={HEAD[0]} cy={HEAD[1]} r={26} fill="#f4a261" />
    </g>
  );
};

// 9 Retro terminal: the rocket built from characters, green phosphor, scanlines, a launch log
const ROCKET_TXT = ["/\\", "/  \\", "/    \\", "|    |", "| () |", "|    |", "|    |", "/|    |\\", "/_|____|_\\", "/__\\"];
const terminal: Draw = (t, lt, tm, id) => {
  const s = mk(t, tm);
  const g = "#39ff6a";
  const lh = 36;
  const top = s.by - 340 + 24;
  const fr = Math.floor(t * 15) % 2;
  const flameTxt = s.L > 1 ? (fr ? ["(  )", " )( ", " '' "] : [")  (", " () ", " .. "]) : [];
  const log = ["> fuel .......... OK", "> ignition ...... OK", "> liftoff", `> alt ${s.alt.toFixed(1)} km`];
  const shown = Math.min(log.length, 1 + Math.floor(lt / 0.12));
  const wave = Math.floor(t * 6) % 2;
  const man = [s.cheer ? "\\o/" : wave ? " o/" : " o_", "|", "/ \\"];
  const mono = { fontFamily: VT, fill: g, xmlSpace: "preserve" as const };
  return (
    <g>
      <defs>
        <filter id={`${id}gl`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <pattern id={`${id}sl`} width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="rgba(0,0,0,0.35)" /></pattern>
      </defs>
      <rect width={W} height={H} fill="#031003" />
      <g filter={`url(#${id}gl)`}>
        {stars(51, 30, s.sc, 0.5, (x, y, k) => <text x={x} y={y} fontSize={34} {...mono} opacity={0.7}>{k % 4 ? "." : "*"}</text>)}
        {log.slice(0, shown).map((l, i) => <text key={i} x={40} y={80 + i * 44} fontSize={40} {...mono}>{l}{i === shown - 1 && Math.floor(t * 4) % 2 ? " _" : ""}</text>)}
        {ROCKET_TXT.map((l, i) => <text key={i} x={s.cx} y={top + i * lh} fontSize={52} textAnchor="middle" {...mono}>{l}</text>)}
        {flameTxt.map((l, i) => <text key={i} x={s.cx} y={top + (ROCKET_TXT.length + i) * lh} fontSize={52} textAnchor="middle" {...mono} fill="#d8ff6a">{l}</text>)}
        {s.puffs.map((p, i) => <text key={i} x={p.x} y={p.y} fontSize={p.r * 0.9} textAnchor="middle" {...mono} opacity={p.o}>~o~</text>)}
        <text x={RX} y={GY - 6} fontSize={44} textAnchor="middle" {...mono}>[========]</text>
        {man.map((l, i) => <text key={i} x={PX} y={GY - 110 + i * 50} fontSize={64} textAnchor="middle" {...mono}>{l}</text>)}
        <text x={0} y={GY + 30} fontSize={46} {...mono}>{"_".repeat(48)}</text>
      </g>
      <rect width={W} height={H} fill={`url(#${id}sl)`} />
    </g>
  );
};

// 10 Risograph: two inks, pink and blue, printed slightly out of register, with grain and halftone
const riso: Draw = (t, _lt, tm, id) => {
  const s = mk(t, tm);
  const PINK = "#ff48b0", BLUE = "#0078bf";
  const mul = { mixBlendMode: "multiply" as const };
  return (
    <g>
      <defs>
        <pattern id={`${id}hb`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(20)"><circle cx="7" cy="7" r="3.4" fill={BLUE} /></pattern>
        <pattern id={`${id}hp`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)"><circle cx="6" cy="6" r="3.6" fill={PINK} /></pattern>
        <filter id={`${id}gr`} x="0" y="0" width={W} height={H} filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="3" /><feColorMatrix type="matrix" values="0 0 0 0 0.96  0 0 0 0 0.94  0 0 0 0 0.9  0 0 0 -2 1.2" /></filter>
      </defs>
      <rect width={W} height={H} fill="#f6efe1" />
      <g style={mul}>
        <rect width={W} height={GY} fill={`url(#${id}hb)`} opacity={0.35} />
        {clouds(23, 3, s.sc, 0.6, (x, y) => <ellipse cx={x} cy={y} rx={120} ry={46} fill="#f6efe1" />)}
      </g>
      <g style={mul} transform="translate(7 -5)">
        <circle cx={720} cy={330} r={150} fill={PINK} />
        <rect y={GY + 40} width={W} height={36} fill={PINK} />
        {s.L > 1 ? <path d={flame(s.cx, s.by + 16, s.L, 30)} fill={PINK} /> : null}
        <path d={body(s.cx, s.by)} fill={PINK} opacity={0.85} />
        <path d={nose(s.cx, s.by)} fill={PINK} />
        <circle cx={HEAD[0]} cy={HEAD[1]} r={26} fill={PINK} />
      </g>
      <g style={mul}>
        <rect y={GY} width={W} height={H - GY} fill={`url(#${id}hb)`} />
        <rect x={RX - 80} y={GY - 30} width={160} height={30} fill={BLUE} />
        {s.puffs.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={`url(#${id}hb)`} opacity={p.o} />)}
        {s.L > 1 ? <path d={flame(s.cx, s.by + 16, s.L * 0.55, 15)} fill={`url(#${id}hp)`} /> : null}
        <path d={finL(s.cx, s.by)} fill={BLUE} />
        <path d={finR(s.cx, s.by)} fill={BLUE} />
        <path d={body(s.cx, s.by)} fill="none" stroke={BLUE} strokeWidth={6} />
        <circle cx={s.cx} cy={s.by - 190} r={24} fill={BLUE} />
        <rect x={s.cx - 30} y={s.by - 2} width={60} height={20} fill={BLUE} />
        <path d={person(s)} stroke={BLUE} strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <rect width={W} height={H} filter={`url(#${id}gr)`} opacity={0.5} />
    </g>
  );
};

const STYLES: { name: string; draw: Draw }[] = [
  { name: "PIXEL ART", draw: pixel }, { name: "CHALKBOARD", draw: chalk }, { name: "BLUEPRINT", draw: blueprint },
  { name: "COMIC BOOK", draw: comic }, { name: "PAPER CUT-OUT", draw: paper }, { name: "NEON GLOW", draw: neon },
  { name: "INK BRUSH", draw: ink }, { name: "FLAT VECTOR", draw: flat }, { name: "RETRO TERMINAL", draw: terminal },
  { name: "RISOGRAPH", draw: riso },
];


/** When each style starts (seconds) and when the ten bands open. Match these to your voiceover. */
export type StyleReelProps = { starts: number[]; bands: number };
export const defaultStyleReelProps: StyleReelProps = { starts: [0, 2.6, 3.3, 4.0, 4.7, 5.5, 6.3, 7.3, 8.1, 9.1], bands: 10.4 };

export const StyleReel: React.FC<StyleReelProps> = ({ starts, bands }) => {
  const { fps } = useVideoConfig();
  const now = useCurrentFrame() / fps;
  const sw = starts.map((s, i) => (i === 0 ? -1 : s));
  const tc = bands;
  const tm: Tm = { tl: 0.55, tc };
  let cur = 0;
  sw.forEach((t, i) => { if (now >= t) cur = i; });
  const SWEEP = 0.28;
  const k = cur > 0 ? clamp01((now - sw[cur]) / SWEEP) : 1;
  const kk = 1 - Math.pow(1 - k, 3);
  const strips = now >= tc;
  const bh = H / STYLES.length;
  const s = mk(now, tm);
  const counter = strips ? "ALL 10" : `${String(cur + 1).padStart(2, "0")} / 10`;
  const lt = (i: number) => now - Math.max(0, sw[i]);
  return (
    <AbsoluteFill style={{ background: "#14151a" }}>
      <div style={{ position: "absolute", left: 60, right: 60, top: 180, textAlign: "center", fontFamily: MONO, fontSize: 64, color: strips ? GOLD : "#e6e8ec" }}>{strips ? "ALL TEN" : STYLES[cur].name}</div>
      <div style={{ position: "absolute", left: 60, right: 60, top: WIN_TOP - 66, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 32, letterSpacing: 2 }}>
        <span style={{ color: GOLD }}>{counter}</span>
        <span style={{ color: "#8b93a3" }}>ALT <span style={{ color: "#e6e8ec" }}>{s.alt.toFixed(1)}</span> KM</span>
      </div>
      <div style={{ position: "absolute", left: 60, top: WIN_TOP, width: W, height: H, borderRadius: 36, overflow: "hidden", boxShadow: "0 0 0 2px rgba(255,255,255,0.10), 0 40px 90px rgba(0,0,0,0.5)" }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <clipPath id="rk-sweep"><rect x={0} y={H * (1 - kk)} width={W} height={H * kk} /></clipPath>
            {STYLES.map((_, j) => <clipPath key={j} id={`rk-band${j}`}><rect x={0} y={j * bh} width={W * (1 - Math.pow(1 - clamp01((now - tc - j * 0.05) / 0.25), 3))} height={bh} /></clipPath>)}
          </defs>
          {strips ? (
            <>
              {STYLES[9].draw(now, lt(9), tm, "rk9-")}
              {STYLES.slice(0, 9).map((st, j) => <g key={j} clipPath={`url(#rk-band${j})`}>{st.draw(now, lt(j), tm, `rk${j}-`)}</g>)}
              {STYLES.map((st, j) => (
                <g key={`b${j}`} opacity={clamp01((now - tc - j * 0.05 - 0.15) / 0.2)}>
                  {j ? <rect x={0} y={j * bh - 2} width={W} height={4} fill="#14151a" /> : null}
                  <rect x={16} y={j * bh + 14} width={st.name.length * 15 + 66} height={36} rx={18} fill="rgba(20,21,26,0.78)" />
                  <text x={34} y={j * bh + 39} fontFamily={MONO} fontSize={21} fill="#e6e8ec">{`${String(j + 1).padStart(2, "0")} ${st.name}`}</text>
                </g>
              ))}
            </>
          ) : (
            <>
              {k < 1 && cur > 0 ? STYLES[cur - 1].draw(now, lt(cur - 1), tm, `rk${cur - 1}-`) : null}
              <g clipPath={k < 1 ? "url(#rk-sweep)" : undefined}>{STYLES[cur].draw(now, lt(cur), tm, `rk${cur}-`)}</g>
              {k > 0 && k < 1 ? <rect x={0} y={H * (1 - kk) - 3} width={W} height={6} fill="#ffffff" opacity={0.9} /> : null}
            </>
          )}
        </svg>
      </div>
      <div style={{ position: "absolute", left: 60, width: W, top: WIN_TOP + H + 34, display: "flex", gap: 12 }}>
        {STYLES.map((_, j) => <div key={j} style={{ flex: 1, height: 8, borderRadius: 4, background: j <= cur || strips ? GOLD : "rgba(255,255,255,0.12)" }} />)}
      </div>
    </AbsoluteFill>
  );
};
```

## The ten style skills

Save each one as `.claude/skills/<name>/SKILL.md`, using the name on its first line.

### 1. Pixel art

```
---
name: pixel-art
description: Draw an animation in a retro pixel art style. Use when the user asks for pixel art, 8-bit or retro game visuals.
---
Draw the scene as normal vector shapes, then sample it down to square blocks of 12 px (an SVG filter: flood a 2 px dot in each 12 px tile, tile it, keep the source inside it, dilate by 6).
Palette: a sunset sky from deep purple to pink to orange, a flat dark city skyline with yellow lit windows, a neon pink ground line.
Small hard-edged stars as square blocks. A pixel font (Press Start 2P) for any HUD text like 1UP and hearts.
Motion: smooth underneath; the blocks give the retro feel. No soft shadows, no gradients that survive the sampling as smooth.
```

### 2. Chalkboard

```
---
name: chalkboard
description: Draw an animation as chalk on a green school board. Use for chalkboard, classroom or hand-drawn lesson visuals.
---
Background: a dark green board with a few faint smudges and a wooden frame around the edge.
Everything is outline only, off-white chalk (#eeeee4), 5 px round lines, with no fills.
Make the chalk break up: displace the lines with fractal noise and mask them with a second fine noise so the stroke looks dusty.
Accents in yellow chalk. Add a handwritten note (Caveat font) and an arrow pointing at the subject, as a teacher would.
```

### 3. Blueprint

```
---
name: blueprint
description: Draw an animation as a technical blueprint. Use for engineering, product or how-it-is-built visuals.
---
Background: blueprint blue (#1c4d8e) with a fine 24 px grid and a stronger 120 px grid. Scroll the grid to show movement.
Every shape is a thin white outline, 3 px, no fill. Add a dashed centre line through the main object.
Add dimension lines with end ticks and labels in a monospace font ("H 42.0 m"), a callout with a leader line, hatching under the ground line, and a title block in the corner (name, sheet number, scale).
```

### 4. Comic book

```
---
name: comic-book
description: Draw an animation as a comic book panel. Use for comic, cartoon or pop art visuals.
---
Thick black outlines on everything (7 px, round joins), flat bold fills: red, white, bright blue, green.
Sky: bright blue with a white halftone dot pattern. Fast white speed lines for movement.
Flames and impacts as jagged star bursts. A sound word (Bangers font) in a yellow burst that pops in with a quick overshoot.
```

### 5. Paper cut-out

```
---
name: paper-cut-out
description: Draw an animation as layered paper cut-outs in stop-motion. Use for craft, paper or stop-motion visuals.
---
Every shape is a flat piece of paper in soft colours (sky blue, sage and leaf greens, kraft brown, cream) with a real drop shadow under it (8 px down, soft, 28 percent).
Build depth with layers: back hills, front hills, ground.
Move in stop-motion: update positions 12 times a second only, and give each moving piece a tiny random tilt and shift on each step.
Lay a faint paper grain over everything.
```

### 6. Neon glow

```
---
name: neon-glow
description: Draw an animation as glowing neon tubes. Use for neon, synthwave or night visuals.
---
Background: near black (#08040f) with small stars.
Every shape is a tube outline with a glow (blur the shape and layer the blur twice under the sharp line).
Colours: cyan, hot pink, yellow, lime, orange. A striped sun on the horizon and a pink perspective grid on the floor, with lines moving toward the viewer.
A handwritten neon sign that flickers now and then.
```

### 7. Ink brush

```
---
name: ink-brush
description: Draw an animation in black ink brush on cream paper. Use for ink, brush or minimal painted visuals.
---
Background: cream paper (#efe5cf) with a faint grain.
Black ink shapes with rough, uneven edges (displace them with low-frequency noise). Grey ink washes for mountains at two strengths.
One red accent: a large red sun. A red seal stamp in a corner.
Keep it sparse, with plenty of empty paper.
```

### 8. Flat vector

```
---
name: flat-vector
description: Draw an animation in clean flat vector illustration. Use for modern, friendly or explainer visuals.
---
Flat fills only: no outlines, no gradients, no textures.
A small calm palette: sky blue, teal and green hills, warm yellow sun, red accent, dark navy for people.
Simple geometric shapes: rounded rectangles and circles for clouds, a rounded body and round head for people.
Smooth, eased motion.
```

### 9. Retro terminal

```
---
name: retro-terminal
description: Draw an animation as characters on an old green screen terminal. Use for hacker, code or retro computer visuals.
---
Background: near black with a green tint. All text is green phosphor (#39ff6a) in VT323, with a soft glow and horizontal scanlines over the top.
Build the objects from characters (ASCII art): slashes, bars and brackets. Animate by swapping characters, for example a flame that flickers between two shapes 15 times a second.
Add a log that types out line by line ("> ignition ... OK") with a blinking cursor.
```

### 10. Risograph

```
---
name: risograph
description: Draw an animation as a two-colour risograph print. Use for print, zine or poster visuals.
---
Paper: warm off-white. Only two inks: fluorescent pink (#ff48b0) and blue (#0078bf), both blended with multiply so they mix where they overlap.
Print one ink slightly out of register (shift the pink layer by a few pixels).
Use halftone dot patterns for tones and a coarse grain over the whole print.
```
