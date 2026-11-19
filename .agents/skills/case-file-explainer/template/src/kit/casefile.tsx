import React from "react";
import { AbsoluteFill, random } from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/SourceSerif4";
import { loadFont as loadMono } from "@remotion/google-fonts/CourierPrime";
import { loadFont as loadPlex } from "@remotion/google-fonts/IBMPlexMono";
import { prog, pop, lerp } from "../lib";

/*
 * Case-file kit: the recurring visual language (inspired by documentary "evidence room" explainers).
 * One accent only: signal red, always glowing, always meaning "this is the evidence".
 * Everything else is monochrome: charcoal ground, white/grey content, white-glow cards.
 */
export const SERIF = loadSerif("normal", { weights: ["600", "700"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;
export const PLEX = loadPlex("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;

export const C = {
  bg: "#0d0d0e",
  ink: "#f2f0ea",
  dim: "#8d8b86",
  faint: "#3a3a3c",
  red: "#ff2d2a",
  redGlow: "0 0 10px rgba(255,45,42,0.95), 0 0 28px rgba(255,45,42,0.7), 0 0 60px rgba(255,30,30,0.45)",
  whiteGlow: "0 0 14px rgba(255,255,255,0.75), 0 0 40px rgba(255,255,255,0.35)",
};

// World camera for HTML scenes: (x, y) world point at frame centre, zoom about it.
export const World: React.FC<{ x?: number; y?: number; zoom?: number; rot?: number; blur?: number; children: React.ReactNode }> = ({ x = 540, y = 960, zoom = 1, rot = 0, blur = 0, children }) => (
  <AbsoluteFill style={{ transform: `translate(540px,960px) rotate(${rot}deg) scale(${zoom}) translate(${-x}px,${-y}px)`, transformOrigin: "0 0", filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}>
    {children}
  </AbsoluteFill>
);

// Black name tag with a torn white edge (the label under every photo card / map pin).
export const Tag: React.FC<{ text: string; size?: number; red?: boolean; style?: React.CSSProperties }> = ({ text, size = 30, red, style }) => (
  <div style={{ display: "inline-block", padding: "6px 9px", background: "#f4f2ec", clipPath: "polygon(0 8%,4% 0,30% 6%,55% 0,80% 5%,100% 0,98% 50%,100% 100%,70% 94%,45% 100%,20% 95%,0 100%,2% 50%)", boxShadow: red ? C.redGlow : undefined, ...style }}>
    <div style={{ background: "#0b0b0b", color: red ? C.red : C.ink, fontFamily: MONO, fontWeight: 700, fontSize: size, padding: `${size * 0.12}px ${size * 0.45}px`, letterSpacing: 0.5, whiteSpace: "nowrap", textShadow: red ? C.redGlow : undefined }}>{text}</div>
  </div>
);

// Map pin: tag with a pointer, anchored so the pointer tip sits at (x, y).
export const Pin: React.FC<{ x: number; y: number; text: string; t: number; red?: boolean; size?: number }> = ({ x, y, text, t, red, size = 30 }) => {
  const s = Math.min(1, t);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) translateY(${(1 - s) * 18}px) scale(${0.85 + 0.15 * s})`, transformOrigin: "50% 100%", opacity: s, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Tag text={text} size={size} red={red} />
      <div style={{ width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: `16px solid #f4f2ec`, marginTop: -1 }} />
    </div>
  );
};

// Red glowing date stamp with a clock face.
export const DateStamp: React.FC<{ fr: number; at: number; line1: string; line2: string; x?: number; y?: number }> = ({ fr, at, line1, line2, x = 80, y = 560 }) => {
  const t = prog(fr, at, 14);
  const n1 = Math.round(line1.length * prog(fr, at + 2, 16)), n2 = Math.round(line2.length * prog(fr, at + 12, 16));
  const flick = 0.85 + 0.15 * random(`ds${Math.floor(fr / 2)}`);
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 26, opacity: t }}>
      <svg width="96" height="96" viewBox="-50 -50 100 100" style={{ filter: "drop-shadow(0 0 8px rgba(255,45,42,.9)) drop-shadow(0 0 24px rgba(255,45,42,.6))", opacity: flick }}>
        <circle r="44" fill="rgba(255,45,42,0.12)" stroke={C.red} strokeWidth="5" />
        {Array.from({ length: 12 }, (_, i) => <line key={i} x1="0" y1="-36" x2="0" y2={i % 3 ? -32 : -28} stroke={C.red} strokeWidth="3" transform={`rotate(${i * 30})`} />)}
        <line x1="0" y1="0" x2="0" y2="-24" stroke={C.red} strokeWidth="5" strokeLinecap="round" transform={`rotate(${(fr - at) * 0.6 + 300})`} />
        <line x1="0" y1="0" x2="0" y2="-32" stroke={C.red} strokeWidth="3" strokeLinecap="round" transform={`rotate(${(fr - at) * 7.2})`} />
      </svg>
      <div style={{ fontFamily: PLEX, color: C.red, textShadow: C.redGlow, lineHeight: 1.25 }}>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 2 }}>{line1.slice(0, n1)}</div>
        <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: 3, opacity: 0.85 }}>{line2.slice(0, n2)}</div>
      </div>
    </div>
  );
};

// Halftone silhouette portrait (stand-in for archival photos). `unknown` renders the
// "no known photographs" treatment for a person who has never been identified.
export const Portrait: React.FC<{ w: number; h: number; seed: string; unknown?: boolean; fr: number }> = ({ w, h, seed, unknown, fr }) => {
  const dots: React.ReactNode[] = [];
  const step = 9;
  for (let yy = 0; yy < h; yy += step) {
    for (let xx = 0; xx < w; xx += step) {
      const nx = (xx - w / 2) / w, ny = (yy - h * 0.42) / h;
      const head = Math.hypot(nx / 0.25, ny / 0.32) < 1;
      const sh = yy > h * 0.7 && Math.abs(nx) < 0.48 - (h - yy) / h * 0.4;
      const neck = Math.abs(nx) < 0.1 && yy > h * 0.6 && yy < h * 0.78;
      const inside = head || sh || neck;
      const light = inside ? 0.25 + 0.5 * Math.max(0, -nx + 0.2) : 0.62 - ny * 0.25;
      const v = Math.max(0, Math.min(1, light + (random(`${seed}${xx},${yy}`) - 0.5) * 0.18));
      const r = (1 - v) * step * 0.62;
      if (r > 0.4) dots.push(<circle key={`${xx},${yy}`} cx={xx + step / 2} cy={yy + step / 2} r={r} fill="#111" />);
    }
  }
  return (
    <div style={{ position: "relative", width: w, height: h, background: "#d9d6cf", overflow: "hidden" }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, filter: unknown ? "blur(7px)" : undefined, opacity: unknown ? 0.75 : 1 }}>{dots}</svg>
      {unknown && (
        <AbsoluteFill style={{ background: "rgba(10,10,10,0.55)", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: MONO, fontWeight: 700, color: C.ink, fontSize: w * 0.105, lineHeight: 1.3, letterSpacing: 1 }}>
          <div style={{ opacity: 0.8 + 0.2 * Math.sin(fr * 0.3) }}>NO KNOWN<br />PHOTOGRAPHS</div>
        </AbsoluteFill>
      )}
    </div>
  );
};

// White-bordered, glowing photo card with role line and name tag.
export const PhotoCard: React.FC<{ fr: number; at: number; w: number; name: string; role: string; seed: string; unknown?: boolean; red?: boolean }> = ({ fr, at, w, name, role, seed, unknown, red }) => {
  const s = pop(fr, at, 15);
  const h = w * 1.28;
  return (
    <div style={{ position: "relative", width: w + 20, transform: `scale(${lerp(0.82, 1, s)}) translateY(${(1 - s) * 30}px)`, opacity: Math.min(1, s * 1.4), transformOrigin: "50% 60%" }}>
      <div style={{ padding: 10, background: "#f6f4ee", boxShadow: red ? C.redGlow : C.whiteGlow, clipPath: "polygon(0 1%,20% 0,50% 0.6%,80% 0,100% 0.8%,99.4% 30%,100% 70%,99.5% 100%,60% 99.4%,30% 100%,0 99.3%,0.5% 60%)" }}>
        <Portrait w={w} h={h} seed={seed} unknown={unknown} fr={fr} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: -26, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: w * 0.075, color: C.ink, letterSpacing: 1.5, textShadow: "0 2px 8px #000", textAlign: "center" }}>{role}</div>
        <Tag text={name} size={w * 0.105} red={red} />
      </div>
    </div>
  );
};

// Citation marker, top-right, like a documentary footnote.
export const Footnote: React.FC<{ n: number; o?: number }> = ({ n, o = 1 }) => (
  <div style={{ position: "absolute", right: 120, top: 250, fontFamily: MONO, fontSize: 26, color: C.dim, opacity: o * 0.8 }}>[{n}]</div>
);

// Faint procedural street-map of "the system": thin grey roads, a few arterials. Deterministic.
export const SystemMap: React.FC<{ seed?: string; opacity?: number; w?: number; h?: number }> = ({ seed = "map", opacity = 1, w = 1600, h = 2600 }) => {
  const els: React.ReactNode[] = [];
  let x = -200;
  let i = 0;
  while (x < w) {
    x += 28 + random(`${seed}x${i}`) * 70;
    const art = random(`${seed}ax${i}`) > 0.86;
    const y0 = -300 + random(`${seed}xs${i}`) * 900, y1 = h - random(`${seed}xe${i}`) * 900;
    const jog = (random(`${seed}xj${i}`) - 0.5) * 60;
    els.push(<path key={`v${i}`} d={`M${x} ${y0} L${x} ${(y0 + y1) / 2} L${x + jog} ${(y0 + y1) / 2 + 40} L${x + jog} ${y1}`} stroke={art ? "#bdbab3" : "#5b5a57"} strokeWidth={art ? 5 : 1.6} fill="none" opacity={art ? 0.55 : 0.7} />);
    i++;
  }
  let y = -300;
  i = 0;
  while (y < h) {
    y += 28 + random(`${seed}y${i}`) * 75;
    const art = random(`${seed}ay${i}`) > 0.86;
    const x0 = -300 + random(`${seed}ys${i}`) * 700, x1 = w - random(`${seed}ye${i}`) * 700;
    els.push(<path key={`h${i}`} d={`M${x0} ${y} L${x1} ${y + (random(`${seed}yt${i}`) - 0.5) * 50}`} stroke={art ? "#bdbab3" : "#5b5a57"} strokeWidth={art ? 5 : 1.6} fill="none" opacity={art ? 0.55 : 0.7} />);
    i++;
  }
  // a few curving "highways"
  for (let k = 0; k < 4; k++) {
    const a = random(`${seed}c${k}`), b = random(`${seed}d${k}`);
    els.push(<path key={`c${k}`} d={`M${-200 + a * 400} -300 C ${200 + b * 800} ${500 + a * 400}, ${-100 + a * 600} ${1300 + b * 300}, ${400 + b * 900} ${h + 200}`} stroke="#d8d5ce" strokeWidth={6} fill="none" opacity={0.35} />);
  }
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: -260, top: -340, opacity }}>
      {els}
    </svg>
  );
};

// Spaced serif watermark over the map ("I R V I N G" style district names).
export const Watermark: React.FC<{ text: string; x: number; y: number; size?: number; o?: number }> = ({ text, x, y, size = 120, o = 0.32 }) => (
  <div style={{ position: "absolute", left: x, top: y, fontFamily: SERIF, fontWeight: 700, fontSize: size, letterSpacing: size * 0.55, color: "#c9c6bf", opacity: o, whiteSpace: "nowrap" }}>{text}</div>
);
