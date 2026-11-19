// Paper Lab kit: palette, fonts, filters and the hand-made paper primitives every scene uses.
// All drawing is SVG in screen/world units; everything is deterministic from t and seeded random().
import React from "react";
import { random, staticFile } from "remotion";
import { loadFont as elite } from "@remotion/google-fonts/SpecialElite";
import { loadFont as caveat } from "@remotion/google-fonts/Caveat";
import { loadFont as fraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as anton } from "@remotion/google-fonts/Anton";
import { clamp, ease } from "../lib";
import { interpolate } from "remotion";

export const TYPE = elite().fontFamily;
export const HAND = caveat("normal", { weights: ["700"] }).fontFamily;
export const SERIF = fraunces("normal", { weights: ["800"] }).fontFamily;
export const COND = anton().fontFamily;
// Maths glyphs (nabla, partial, greek) fall back per glyph to the system maths font.
export const MATH = `${HAND}, "Cambria Math", "Segoe UI Symbol", serif`;

export const INK = "#1d1a2e", RED = "#e2372b", BLUE = "#2f5fb3", TAPE = "#f7d774", GOLD = "#d9a520";
export const CREAM = "#efe4cf", NAVY = "#1b2550";
export const PAPERS = ["#fffaf0", "#f3e7c9", "#dfeefb", "#fde2e4"];
export const SHADOW = "rgba(74,52,32,.35)";
export const IMG = { board: staticFile("paper/board.jpg"), cork: staticFile("paper/cork.jpg"), navy: staticFile("paper/navy.jpg"), still: staticFile("madhav-still.png") };

// stop-motion: paper poses hold on twos
export const twos = (t: number) => Math.floor(t * 15) / 15;
export const rnd = (s: string | number) => random(`pp${s}`);
export const rr = (s: string | number, a: number, b: number) => a + rnd(s) * (b - a);
// seeded jitter that changes every 2 frames (line boil)
export const boil = (seed: string | number, t: number, amp = 1) => (random(`b${seed}-${Math.floor(t * 15)}`) - 0.5) * 2 * amp;
export const pS = (t: number, at: number, dur = 0.4, e = ease) => interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing: e });
// overshoot-and-settle (back easing) 0..1 with a small bump above 1
export const back = (x: number, s = 1.9) => { const k = Math.max(0, Math.min(1, x)) - 1; return 1 + k * k * ((s + 1) * k + s); };
export const pB = (t: number, at: number, dur = 0.35, s = 1.9) => back((t - at) / dur, s);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// Shared filter definitions. Every <svg> that uses them includes <Defs/> (identical ids are harmless).
export const Defs: React.FC = () => (
  <defs>
    <filter id="psh" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="6" dy="9" stdDeviation="5" floodColor="#4a3420" floodOpacity="0.35" /></filter>
    <filter id="psh2" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="14" dy="22" stdDeviation="12" floodColor="#4a3420" floodOpacity="0.32" /></filter>
    <filter id="pshN" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="6" dy="9" stdDeviation="6" floodColor="#05081c" floodOpacity="0.55" /></filter>
    <filter id="prough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" /><feDisplacementMap in="SourceGraphic" scale="4" /></filter>
    <filter id="psmudge" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="3.2" /></filter>
    <filter id="pglow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="22" /></filter>
    <radialGradient id="pgoldlight"><stop offset="0" stopColor="#ffd75e" stopOpacity="0.75" /><stop offset="0.5" stopColor="#ffc93a" stopOpacity="0.22" /><stop offset="1" stopColor="#ffc93a" stopOpacity="0" /></radialGradient>
    <pattern id="pgraph" width="26" height="26" patternUnits="userSpaceOnUse"><rect width="26" height="26" fill="#fbfdff" /><path d="M26 0V26H0" fill="none" stroke="#a9c8e8" strokeWidth="1" /></pattern>
    <pattern id="plined" width="40" height="44" patternUnits="userSpaceOnUse"><rect width="40" height="44" fill="#fffdf6" /><path d="M0 43.5H40" stroke="#9db8dc" strokeWidth="1.4" /></pattern>
    <linearGradient id="pgutter" x1="0" x2="1"><stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="0.5" stopColor="#5a4a30" stopOpacity="0.8" /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient>
    <linearGradient id="pcurl" x1="0" x2="1"><stop offset="0" stopColor="#fffdf6" /><stop offset="0.6" stopColor="#e9dfc8" /><stop offset="1" stopColor="#bfb39a" /></linearGradient>
    <pattern id="phalftone" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.1" fill="#2a2730" /></pattern>
  </defs>
);

// Torn-edge rectangle path centred on 0,0. `edges` = which sides are torn (t r b l).
export const torn = (w: number, h: number, seed: string | number, edges = "lr", amp = 3.5) => {
  const pts: [number, number][] = [];
  const side = (x0: number, y0: number, x1: number, y1: number, tornSide: boolean, k: string) => {
    const L = Math.hypot(x1 - x0, y1 - y0), n = tornSide ? Math.max(2, Math.round(L / 9)) : 1;
    const nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    for (let i = 0; i < n; i++) {
      const u = i / n, j = tornSide && i > 0 ? (rnd(`${seed}${k}${i}`) - 0.5) * 2 * amp : 0;
      pts.push([x0 + (x1 - x0) * u + nx * j, y0 + (y1 - y0) * u + ny * j]);
    }
  };
  const a = w / 2, b = h / 2;
  side(-a, -b, a, -b, edges.includes("t"), "t");
  side(a, -b, a, b, edges.includes("r"), "r");
  side(a, b, -a, b, edges.includes("b"), "b");
  side(-a, b, -a, -b, edges.includes("l"), "l");
  return "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L") + "Z";
};

export const textW = (s: string, size: number, k = 0.6) => s.length * size * k;

// A torn paper scrap with typewriter text, centred at x,y.
export const Scrap: React.FC<{ x: number; y: number; rot?: number; text: string; fill?: string; size?: number; seed: string | number; s?: number; font?: string; color?: string; shadow?: string; w?: number; opacity?: number }> = ({ x, y, rot = 0, text, fill = PAPERS[0], size = 24, seed, s = 1, font = TYPE, color = INK, shadow = "url(#psh)", w, opacity }) => {
  const ww = w ?? textW(text, size) + size * 1.1, hh = size * 1.9;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} filter={shadow} opacity={opacity}>
      <path d={torn(ww, hh, seed, "lr", size * 0.16)} fill={fill} />
      <text textAnchor="middle" y={size * 0.36} fontFamily={font} fontSize={size} fill={color}>{text}</text>
    </g>
  );
};

// Index card (top-left at 0,0 in its own transform), red header rule + blue lines.
export const Card: React.FC<{ x: number; y: number; w: number; h: number; rot?: number; s?: number; lines?: boolean; fill?: string; shadow?: string; children?: React.ReactNode; anchor?: "c" | "tl"; opacity?: number }> = ({ x, y, w, h, rot = 0, s = 1, lines = true, fill = "#fffdf6", shadow = "url(#psh)", children, anchor = "c", opacity }) => {
  const ox = anchor === "c" ? -w / 2 : 0, oy = anchor === "c" ? -h / 2 : 0;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s}) translate(${ox} ${oy})`} opacity={opacity}>
      <rect width={w} height={h} fill={fill} filter={shadow} />
      {lines && <>
        <line x1={0} x2={w} y1={Math.min(54, h * 0.28)} y2={Math.min(54, h * 0.28)} stroke={RED} strokeOpacity={0.55} strokeWidth={2} />
        {Array.from({ length: Math.max(0, Math.floor((h - 60) / 34)) }, (_, i) => <line key={i} x1={0} x2={w} y1={Math.min(54, h * 0.28) + 34 * (i + 1)} y2={Math.min(54, h * 0.28) + 34 * (i + 1)} stroke="#9db8dc" strokeOpacity={0.6} strokeWidth={1.2} />)}
      </>}
      {children}
    </g>
  );
};

// Masking tape strip centred at x,y.
export const Tape: React.FC<{ x: number; y: number; w?: number; h?: number; rot?: number; seed?: string | number; color?: string }> = ({ x, y, w = 110, h = 34, rot = 0, seed = 0, color = TAPE }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <path d={torn(w, h, `tp${seed}`, "lr", 3)} fill={color} opacity={0.82} />
    <path d={torn(w, h, `tp${seed}`, "lr", 3)} fill="none" stroke="#c9a94a" strokeOpacity={0.35} strokeWidth={1} />
  </g>
);

export const Pin: React.FC<{ x: number; y: number; color?: string; s?: number }> = ({ x, y, color = RED, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={7} cy={10} rx={9} ry={5} fill="rgba(60,35,15,.35)" />
    <circle r={10} fill={color} />
    <circle r={4} cx={-3} cy={-3} fill="#fff" opacity={0.55} />
  </g>
);

// A marker/pencil stroke revealed along its length (p 0..1).
export const Draw: React.FC<{ d: string; p: number; stroke?: string; w?: number; opacity?: number; cap?: "round" | "butt"; filter?: string }> = ({ d, p, stroke = RED, w = 7, opacity = 1, cap = "round", filter }) => {
  if (p <= 0) return null;
  return <path d={d} pathLength={1} fill="none" stroke={stroke} strokeWidth={w} strokeLinecap={cap} strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - Math.min(1, p)} opacity={opacity} filter={filter} />;
};

// A dotted pencil line revealed along its length (uses a mask so the dots stay put).
export const Dotted: React.FC<{ id: string; d: string; p: number; stroke?: string; w?: number; gap?: number }> = ({ id, d, p, stroke = "#4a4a55", w = 6, gap = 18 }) => {
  if (p <= 0) return null;
  return (
    <g>
      <mask id={id} maskUnits="userSpaceOnUse" x={-2000} y={-2000} width={6000} height={6000}>
        <path d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth={w * 3} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - Math.min(1, p)} />
      </mask>
      <path d={d} fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeDasharray={`0.1 ${gap}`} mask={`url(#${id})`} />
    </g>
  );
};

// Hand-drawn ellipse (marker circle) around cx,cy; slightly overshooting start/end.
export const circlePath = (cx: number, cy: number, rx: number, ry: number, seed: string | number) => {
  const n = 28, pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const a = -2.2 + (i / n) * Math.PI * 2.15;
    const j = 1 + (rnd(`${seed}c${i}`) - 0.5) * 0.06;
    pts.push(`${(cx + Math.cos(a) * rx * j).toFixed(1)},${(cy + Math.sin(a) * ry * j).toFixed(1)}`);
  }
  return "M" + pts.join("L");
};

// Rubber stamp that slams in at `at`: red double border, distressed ink.
export const Stamp: React.FC<{ x: number; y: number; t: number; at: number; lines: string[]; rot?: number; size?: number; color?: string; w?: number; paper?: boolean }> = ({ x, y, t, at, lines, rot = -8, size = 44, color = RED, w, paper }) => {
  if (t < at - 0.12) return null;
  const k = (t - at) / 0.14; // 0..1 slam
  const sc = k < 0 ? 1.9 + -k * 2 : k < 1 ? lerp(1.9, 0.94, k * k) : 1 - 0.06 * Math.exp(-(t - at - 0.14) * 18) * Math.cos((t - at) * 40);
  const op = k < 0 ? 0.25 : 0.92;
  const ww = w ?? Math.max(...lines.map((l) => textW(l, size, 0.62))) + size * 1.4;
  const hh = lines.length * size * 1.15 + size * 0.9;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${sc})`} opacity={op}>
      {paper && <path d={torn(ww + 50, hh + 40, `sp${lines[0]}`, "tlrb", 4)} fill="#fbf6e9" filter="url(#psh)" />}
      <rect x={-ww / 2} y={-hh / 2} width={ww} height={hh} rx={10} fill="none" stroke={color} strokeWidth={6} />
      <rect x={-ww / 2 + 9} y={-hh / 2 + 9} width={ww - 18} height={hh - 18} rx={6} fill="none" stroke={color} strokeWidth={2.5} />
      {lines.map((l, i) => (
        <text key={i} textAnchor="middle" y={-hh / 2 + size * 0.45 + size * 1.15 * (i + 0.85)} fontFamily={TYPE} fontSize={size} fill={color} letterSpacing={1}>{l}</text>
      ))}
      {/* worn ink: paper-coloured specks */}
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={(rnd(`st${lines[0]}${i}`) - 0.5) * ww} cy={(rnd(`sty${lines[0]}${i}`) - 0.5) * hh} r={1 + rnd(`str${i}`) * 2} fill={paper ? "#fbf6e9" : "#f6efe0"} opacity={0.6} />
      ))}
    </g>
  );
};

// Polaroid frame (centred), photo area w x w*0.92, thicker chin.
export const Polaroid: React.FC<{ x: number; y: number; w: number; rot?: number; s?: number; children?: React.ReactNode; caption?: string; shadow?: string; clipId: string }> = ({ x, y, w, rot = 0, s = 1, children, caption, shadow = "url(#psh)", clipId }) => {
  const b = w * 0.06, ph = w * 0.92, H = ph + b + w * 0.22;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s}) translate(${-w / 2 - b} ${-H / 2})`}>
      <rect width={w + 2 * b} height={H} fill="#fbf8f1" filter={shadow} />
      <clipPath id={clipId}><rect x={b} y={b} width={w} height={ph} /></clipPath>
      <g clipPath={`url(#${clipId})`}><g transform={`translate(${b} ${b})`}>{children}</g></g>
      {caption && <text x={b + w / 2} y={b + ph + w * 0.15} textAnchor="middle" fontFamily={HAND} fontSize={w * 0.12} fill={INK}>{caption}</text>}
    </g>
  );
};

// Small illustrated "photos" for polaroids and clippings (w x h at 0,0).
export const Photo: React.FC<{ kind: number; w: number; h: number }> = ({ kind, w, h }) => {
  const k = kind % 5;
  if (k === 0) return (<g><rect width={w} height={h} fill="#9cc7e6" /><circle cx={w * 0.72} cy={h * 0.3} r={w * 0.1} fill="#f6d36b" /><path d={`M0 ${h}L${w * 0.3} ${h * 0.45}L${w * 0.55} ${h * 0.8}L${w * 0.75} ${h * 0.55}L${w} ${h}Z`} fill="#4c6b54" /><path d={`M${w * 0.22} ${h * 0.56}L${w * 0.3} ${h * 0.45}L${w * 0.38} ${h * 0.56}Z`} fill="#fff" /></g>);
  if (k === 1) return (<g><rect width={w} height={h} fill="#e9d9bd" /><rect width={w} height={h} fill="url(#phalftone)" opacity={0.35} /><circle cx={w * 0.5} cy={h * 0.42} r={w * 0.2} fill="#5b4636" /><path d={`M${w * 0.18} ${h}Q${w * 0.5} ${h * 0.5} ${w * 0.82} ${h}Z`} fill="#3d3330" /></g>);
  if (k === 2) return (<g><rect width={w} height={h} fill="#2a2d3d" />{[0.2, 0.36, 0.52, 0.68].map((y, i) => <rect key={i} x={w * 0.1} y={h * y} width={w * (0.3 + 0.4 * rnd(`ph${i}${w}`))} height={h * 0.06} fill={i % 2 ? "#7dd3a8" : "#f2b36b"} />)}</g>);
  if (k === 3) return (<g><rect width={w} height={h} fill="#d8e6cf" /><path d={`M0 ${h * 0.6}C${w * 0.3} ${h * 0.4} ${w * 0.5} ${h * 0.8} ${w} ${h * 0.5}`} stroke="#5c8fc2" strokeWidth={w * 0.05} fill="none" /><path d={`M${w * 0.2} 0L${w * 0.35} ${h}`} stroke="#c9a978" strokeWidth={w * 0.03} /><circle cx={w * 0.62} cy={h * 0.35} r={w * 0.05} fill={RED} /></g>);
  return (<g><rect width={w} height={h} fill="#1d1a2e" /><rect x={w * 0.1} y={h * 0.15} width={w * 0.8} height={h * 0.55} fill="#c8352b" /><path d={`M${w * 0.42} ${h * 0.3}L${w * 0.6} ${h * 0.42}L${w * 0.42} ${h * 0.54}Z`} fill="#fff" /><rect x={w * 0.1} y={h * 0.78} width={w * 0.6} height={h * 0.05} fill="#888" /></g>);
};

// Headline clipping: a newspaper-ish cut with headline + body lines + optional halftone photo.
export const Clipping: React.FC<{ x: number; y: number; w: number; h: number; rot?: number; head: string; seed: string | number; photo?: number; fill?: string; s?: number; shadow?: string }> = ({ x, y, w, h, rot = 0, head, seed, photo, fill = "#f4efe3", s = 1, shadow = "url(#psh)" }) => {
  const fs = Math.min(w / (head.length * 0.55), 30);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} filter={shadow}>
      <path d={torn(w, h, seed, "tlrb", 2.5)} fill={fill} />
      <g transform={`translate(${-w / 2 + 12} ${-h / 2 + 12})`}>
        <text y={fs * 0.95} fontFamily={SERIF} fontSize={fs} fill={INK}>{head}</text>
        {photo !== undefined && <g transform={`translate(0 ${fs * 1.4})`}><Photo kind={photo} w={w * 0.42} h={h * 0.45} /></g>}
        {Array.from({ length: Math.max(1, Math.floor((h - fs * 1.6 - 18) / 11)) }, (_, i) => {
          const x0 = photo !== undefined && i < (h * 0.45) / 11 ? w * 0.46 : 0;
          return <rect key={i} x={x0} y={fs * 1.45 + i * 11} width={(w - 24 - x0) * (0.75 + 0.25 * rnd(`${seed}l${i}`))} height={4} fill="#8a8578" opacity={0.6} />;
        })}
      </g>
    </g>
  );
};

// Tiny browser-window clipping (a printed web page).
export const WebPage: React.FC<{ x: number; y: number; w: number; h: number; rot?: number; title: string; seed: string | number; s?: number; accent?: string }> = ({ x, y, w, h, rot = 0, title, seed, s = 1, accent = BLUE }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s}) translate(${-w / 2} ${-h / 2})`}>
    <rect width={w} height={h} fill="#fff" filter="url(#psh)" />
    <rect width={w} height={h * 0.09} fill="#e4e1da" />
    {[0, 1, 2].map((i) => <circle key={i} cx={10 + i * 12} cy={h * 0.045} r={3.5} fill={["#e26a5b", "#e8b84a", "#6cba6a"][i]} />)}
    <text x={12} y={h * 0.09 + 30} fontFamily={SERIF} fontSize={Math.min(26, w / (title.length * 0.56))} fill={accent}>{title}</text>
    {Array.from({ length: Math.floor((h * 0.91 - 50) / 13) }, (_, i) => <rect key={i} x={12} y={h * 0.09 + 46 + i * 13} width={(w - 24) * (0.55 + 0.45 * rnd(`${seed}w${i}`))} height={5} fill="#b9b4a8" />)}
  </g>
);

// Code printout scrap.
export const CodeSheet: React.FC<{ x: number; y: number; w: number; rot?: number; lines: string[]; s?: number }> = ({ x, y, w, rot = 0, lines, s = 1 }) => {
  const h = lines.length * 26 + 30;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s}) translate(${-w / 2} ${-h / 2})`} filter="url(#psh)">
      <rect width={w} height={h} fill="#f4f7ee" />
      {lines.map((l, i) => <text key={i} x={14} y={36 + i * 26} fontFamily={TYPE} fontSize={19} fill={i % 3 === 0 ? BLUE : INK}>{l}</text>)}
    </g>
  );
};

// Full-frame background image with gentle drift (screen space), overscanned.
export const BgImage: React.FC<{ src: string; t: number; dx?: number; dy?: number; zoom?: number; opacity?: number }> = ({ src, t, dx = 0, dy = 0, zoom = 1, opacity = 1 }) => {
  const x = -80 + Math.sin(t * 0.11) * 18 + dx, y = -140 + Math.cos(t * 0.09) * 22 + dy;
  return <image href={src} x={x} y={y} width={1240} height={2200} preserveAspectRatio="none" opacity={opacity} transform={zoom !== 1 ? `translate(540 960) scale(${zoom}) translate(-540 -960)` : undefined} />;
};
