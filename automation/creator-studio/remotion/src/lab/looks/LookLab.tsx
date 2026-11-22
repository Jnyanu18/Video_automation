import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { loadFont as loadArchivo } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as loadDM } from "@remotion/google-fonts/DMSans";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadVT } from "@remotion/google-fonts/VT323";
import { loadFont as loadPixel } from "@remotion/google-fonts/PressStart2P";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";

// Look lab (2026-11-06): one reel frame drawn in seven candidate signature looks, so Vishnu can pick ours by eye.
// Frame n of the LookLab composition is look n. Same layout in every look: the hook caption, a product card with a
// small node map, a sticker, the comment chip and the progress bar.

const ARCH = loadArchivo("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const DM = loadDM("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily;
const SERIF = loadFraunces("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily;
const HAND = loadCaveat("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily;
const VT = loadVT("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const PIX = loadPixel("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const MONO = loadMono("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;
const GROT = loadGrotesk("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily;

const NODES = [{ x: 120, y: 150, t: "Online shop" }, { x: 120, y: 420, t: "Staff app" }, { x: 470, y: 285, t: "Main server" }, { x: 470, y: 560, t: "Payments" }];
const LINKS = [[0, 2], [1, 2], [2, 3]];
const CARD = { x: 90, y: 560, w: 900, h: 860 };
const nodeW = 300, nodeH = 120;
const mid = (i: number) => ({ x: NODES[i].x + nodeW / 2, y: NODES[i].y + nodeH / 2 });

type Look = {
  name: string;
  bg: React.ReactNode;
  caption: (hl: (w: string) => React.ReactNode) => React.ReactNode;
  card: React.ReactNode;           // drawn behind the map
  node: (i: number, on: boolean) => React.ReactNode;
  link: (a: { x: number; y: number }, b: { x: number; y: number }, i: number) => React.ReactNode;
  sticker: React.ReactNode;
  chip: React.ReactNode;
  bar: (on: boolean, i: number) => React.CSSProperties;
  over?: React.ReactNode;
};

const grain = (id: string, op: number, freq = 0.9) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: op, mixBlendMode: "multiply" }}>
    <filter id={id}><feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={3} /><feColorMatrix type="saturate" values="0" /></filter>
    <rect width={1080} height={1920} filter={`url(#${id})`} />
  </svg>
);
const Cap: React.FC<{ style: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{ position: "absolute", left: 70, right: 70, top: 150, textAlign: "center", lineHeight: 1.08, ...style }}>{children}</div>
);
const twoLines = (hl: (w: string) => React.ReactNode) => <>Someone just made<br />a {hl("FREE")} tool</>;
const Chip: React.FC<{ style: React.CSSProperties; kw: React.CSSProperties; font: string }> = ({ style, kw, font }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 1500, display: "flex", justifyContent: "center" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "18px 38px", fontFamily: font, fontSize: 46, ...style }}>Comment <span style={kw}>MAP</span></div>
  </div>
);
const starPts = (cx: number, cy: number, n: number, r1: number, r2: number) =>
  Array.from({ length: n * 2 }, (_, i) => { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r2 : r1; return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`; }).join(" ");

const LOOKS: Look[] = [
  // 1. Current: dark glass
  {
    name: "1 Dark glass (now)",
    bg: <AbsoluteFill style={{ background: "#14151a" }} />,
    caption: (hl) => <Cap style={{ fontFamily: DM, fontSize: 92, color: "#fff" }}>{twoLines((w) => <span style={{ color: "#ffc400" }}>{w}</span>)}</Cap>,
    card: <rect x={0} y={0} width={CARD.w} height={CARD.h} rx={36} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth={2} />,
    node: (i, on) => <g><rect x={NODES[i].x} y={NODES[i].y} width={nodeW} height={nodeH} rx={18} fill={on ? "#232634" : "#1b1d24"} stroke={on ? "#4aa3ff" : "rgba(255,255,255,0.12)"} strokeWidth={on ? 3 : 2} /><text x={NODES[i].x + 26} y={NODES[i].y + 70} fontFamily={DM} fontSize={34} fill="#e6e8ec">{NODES[i].t}</text></g>,
    link: (a, b) => <path d={`M${a.x} ${a.y} C${(a.x + b.x) / 2} ${a.y} ${(a.x + b.x) / 2} ${b.y} ${b.x} ${b.y}`} stroke="#4aa3ff" strokeWidth={3} fill="none" opacity={0.8} />,
    sticker: <g transform="translate(800 40) rotate(8)"><rect x={-90} y={-40} width={180} height={80} rx={40} fill="#ffc400" /><text textAnchor="middle" y={16} fontFamily={DM} fontSize={44} fill="#14151a">FREE</text></g>,
    chip: <Chip font={DM} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 999, color: "#8b93a3" }} kw={{ color: "#ffc400" }} />,
    bar: (on) => ({ background: on ? "#ffc400" : "rgba(255,255,255,0.12)", borderRadius: 4 }),
  },
  // 2. Riso print: off-white paper, pink and blue inks out of register, halftone, chunky type
  {
    name: "2 Riso print",
    bg: <AbsoluteFill style={{ background: "#f6efe1" }}><svg width={1080} height={1920}><defs><pattern id="rh" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(20)"><circle cx="8" cy="8" r="3.6" fill="#0078bf" /></pattern></defs><rect width={1080} height={420} fill="url(#rh)" opacity={0.22} /><circle cx={930} cy={1740} r={260} fill="#ff48b0" opacity={0.85} style={{ mixBlendMode: "multiply" }} /></svg></AbsoluteFill>,
    caption: (hl) => (
      <>
        <Cap style={{ fontFamily: ARCH, fontSize: 96, color: "#ff48b0", transform: "translate(7px,6px)", mixBlendMode: "multiply" }}>{twoLines((w) => <span>{w}</span>)}</Cap>
        <Cap style={{ fontFamily: ARCH, fontSize: 96, color: "#0078bf", mixBlendMode: "multiply" }}>{twoLines((w) => <span style={{ color: "#f6efe1", WebkitTextStroke: "3px #0078bf" }}>{w}</span>)}</Cap>
      </>
    ),
    card: <g><rect x={14} y={14} width={CARD.w} height={CARD.h} fill="#ff48b0" opacity={0.85} style={{ mixBlendMode: "multiply" }} /><rect x={0} y={0} width={CARD.w} height={CARD.h} fill="#f6efe1" stroke="#0078bf" strokeWidth={7} /></g>,
    node: (i, on) => <g style={{ mixBlendMode: "multiply" }}><rect x={NODES[i].x + 6} y={NODES[i].y + 5} width={nodeW} height={nodeH} fill={on ? "#ff48b0" : "none"} /><rect x={NODES[i].x} y={NODES[i].y} width={nodeW} height={nodeH} fill="none" stroke="#0078bf" strokeWidth={5} /><text x={NODES[i].x + 22} y={NODES[i].y + 74} fontFamily={ARCH} fontSize={32} fill="#0078bf">{NODES[i].t}</text></g>,
    link: (a, b) => <path d={`M${a.x} ${a.y} L${(a.x + b.x) / 2} ${a.y} L${(a.x + b.x) / 2} ${b.y} L${b.x} ${b.y}`} stroke="#ff48b0" strokeWidth={8} fill="none" style={{ mixBlendMode: "multiply" }} />,
    sticker: <g transform="translate(790 40) rotate(-10)" style={{ mixBlendMode: "multiply" }}><circle r={95} fill="#ff48b0" /><circle r={95} cx={6} cy={-5} fill="none" stroke="#0078bf" strokeWidth={5} /><text textAnchor="middle" y={18} fontFamily={ARCH} fontSize={50} fill="#f6efe1">FREE</text></g>,
    chip: <Chip font={ARCH} style={{ background: "#0078bf", color: "#f6efe1", boxShadow: "8px 7px 0 #ff48b0" }} kw={{ color: "#ffd84a" }} />,
    bar: (on) => ({ background: on ? "#0078bf" : "rgba(0,120,191,0.2)" }),
    over: grain("rg", 0.22, 1.1),
  },
  // 3. Paper collage: kraft board, paper cut-outs with real shadows, tape, a handwritten note
  {
    name: "3 Paper collage",
    bg: <AbsoluteFill style={{ background: "#d8b98d" }} />,
    caption: () => (
      <div style={{ position: "absolute", left: 0, right: 0, top: 130, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ background: "#fffdf6", padding: "10px 28px", fontFamily: ARCH, fontSize: 80, color: "#1e1e1e", transform: "rotate(-2deg)", boxShadow: "0 8px 14px rgba(0,0,0,0.25)" }}>Someone just made</div>
        <div style={{ background: "#fffdf6", padding: "10px 28px", fontFamily: ARCH, fontSize: 80, color: "#1e1e1e", transform: "rotate(1.5deg)", boxShadow: "0 8px 14px rgba(0,0,0,0.25)" }}>a <span style={{ background: "#ef6f5a", color: "#fffdf6", padding: "0 14px" }}>FREE</span> tool</div>
      </div>
    ),
    card: <g transform="rotate(-1.2 450 430)"><rect x={0} y={0} width={CARD.w} height={CARD.h} fill="#fffdf6" style={{ filter: "drop-shadow(0 14px 18px rgba(0,0,0,0.3))" }} /><rect x={330} y={-26} width={240} height={52} fill="rgba(255,240,180,0.75)" transform="rotate(-3 450 0)" /></g>,
    node: (i, on) => { const c = ["#bfe0ec", "#c8e6c0", "#ffd7a8", "#f3c4d6"][i]; return <g transform={`rotate(${[-2, 1.5, -1, 2][i]} ${mid(i).x} ${mid(i).y})`}><rect x={NODES[i].x} y={NODES[i].y} width={nodeW} height={nodeH} fill={on ? "#ef6f5a" : c} style={{ filter: "drop-shadow(0 6px 6px rgba(0,0,0,0.25))" }} /><text x={NODES[i].x + 22} y={NODES[i].y + 74} fontFamily={ARCH} fontSize={32} fill={on ? "#fffdf6" : "#1e1e1e"}>{NODES[i].t}</text></g>; },
    link: (a, b) => <path d={`M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 40} ${b.x} ${b.y}`} stroke="#1e1e1e" strokeWidth={4} strokeDasharray="2 12" strokeLinecap="round" fill="none" />,
    sticker: <g transform="translate(790 60) rotate(12)"><polygon points={starPts(0, 0, 10, 110, 80)} fill="#ffd84a" style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.3))" }} /><text textAnchor="middle" y={16} fontFamily={ARCH} fontSize={46} fill="#1e1e1e">FREE</text></g>,
    chip: <><Chip font={ARCH} style={{ background: "#1e1e1e", color: "#fffdf6", transform: "rotate(-1.5deg)", boxShadow: "0 10px 16px rgba(0,0,0,0.3)" }} kw={{ color: "#ffd84a" }} /><div style={{ position: "absolute", left: 120, top: 1430, fontFamily: HAND, fontSize: 64, color: "#c23b2a", transform: "rotate(-6deg)" }}>this one!</div></>,
    bar: (on) => ({ background: on ? "#1e1e1e" : "rgba(30,30,30,0.18)" }),
    over: grain("cg", 0.18, 0.7),
  },
  // 4. Neon blueprint: blueprint grid, white technical lines, one neon pink accent
  {
    name: "4 Neon blueprint",
    bg: <AbsoluteFill style={{ background: "#0e2756" }}><svg width={1080} height={1920}><defs><pattern id="g1" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0 L0 0 0 30" fill="none" stroke="rgba(255,255,255,0.08)" /></pattern><pattern id="g2" width="150" height="150" patternUnits="userSpaceOnUse"><path d="M150 0 L0 0 0 150" fill="none" stroke="rgba(255,255,255,0.18)" /></pattern></defs><rect width={1080} height={1920} fill="url(#g1)" /><rect width={1080} height={1920} fill="url(#g2)" /></svg></AbsoluteFill>,
    caption: () => <Cap style={{ fontFamily: GROT, fontSize: 88, color: "#eaf2ff" }}>{twoLines((w) => <span style={{ color: "#ff3fd8", textShadow: "0 0 18px #ff3fd8, 0 0 40px #ff3fd8" }}>{w}</span>)}</Cap>,
    card: <g><rect x={0} y={0} width={CARD.w} height={CARD.h} fill="none" stroke="#eaf2ff" strokeWidth={3} /><path d={`M-30 0 L-30 ${CARD.h} M-42 0 L-18 0 M-42 ${CARD.h} L-18 ${CARD.h}`} stroke="#eaf2ff" strokeWidth={2} /><text x={-50} y={CARD.h / 2} fontFamily={MONO} fontSize={22} fill="#eaf2ff" transform={`rotate(-90 -50 ${CARD.h / 2})`} textAnchor="middle">APP · 4 PARTS</text><text x={CARD.w - 20} y={CARD.h - 22} textAnchor="end" fontFamily={MONO} fontSize={22} fill="#eaf2ff">SHEET 01 · FLOORPLAN</text></g>,
    node: (i, on) => <g style={on ? { filter: "drop-shadow(0 0 12px #ff3fd8)" } : {}}><rect x={NODES[i].x} y={NODES[i].y} width={nodeW} height={nodeH} fill="none" stroke={on ? "#ff3fd8" : "#eaf2ff"} strokeWidth={on ? 4 : 2.5} /><text x={NODES[i].x + 22} y={NODES[i].y + 72} fontFamily={MONO} fontSize={30} fill={on ? "#ff3fd8" : "#eaf2ff"}>{NODES[i].t.toUpperCase()}</text></g>,
    link: (a, b) => <path d={`M${a.x} ${a.y} L${(a.x + b.x) / 2} ${a.y} L${(a.x + b.x) / 2} ${b.y} L${b.x} ${b.y}`} stroke="#5ee7ff" strokeWidth={3} strokeDasharray="12 8" fill="none" style={{ filter: "drop-shadow(0 0 6px #5ee7ff)" }} />,
    sticker: <g transform="translate(790 40)"><rect x={-100} y={-40} width={200} height={80} fill="none" stroke="#ff3fd8" strokeWidth={4} style={{ filter: "drop-shadow(0 0 10px #ff3fd8)" }} /><text textAnchor="middle" y={14} fontFamily={MONO} fontSize={40} fill="#ff3fd8">FREE</text></g>,
    chip: <Chip font={GROT} style={{ border: "3px solid #eaf2ff", color: "#eaf2ff" }} kw={{ color: "#ff3fd8", textShadow: "0 0 14px #ff3fd8" }} />,
    bar: (on) => ({ background: on ? "#ff3fd8" : "rgba(234,242,255,0.2)", boxShadow: on ? "0 0 10px #ff3fd8" : "none" }),
  },
  // 5. Bold flat: one saturated colour flood, thick black outlines, hard offset shadows (neo-brutalist)
  {
    name: "5 Bold flat",
    bg: <AbsoluteFill style={{ background: "#ff5a1f" }} />,
    caption: () => <Cap style={{ fontFamily: ARCH, fontSize: 100, color: "#111" }}>{twoLines((w) => <span style={{ background: "#111", color: "#fff", padding: "0 16px" }}>{w}</span>)}</Cap>,
    card: <g><rect x={16} y={16} width={CARD.w} height={CARD.h} rx={28} fill="#111" /><rect x={0} y={0} width={CARD.w} height={CARD.h} rx={28} fill="#fff7ea" stroke="#111" strokeWidth={8} /></g>,
    node: (i, on) => { const c = ["#ffd23f", "#8bd450", "#3a86ff", "#ff7eb6"][i]; return <g><rect x={NODES[i].x + 8} y={NODES[i].y + 8} width={nodeW} height={nodeH} rx={16} fill="#111" /><rect x={NODES[i].x} y={NODES[i].y} width={nodeW} height={nodeH} rx={16} fill={on ? "#111" : c} stroke="#111" strokeWidth={6} /><text x={NODES[i].x + 22} y={NODES[i].y + 74} fontFamily={ARCH} fontSize={32} fill={on ? "#fff" : "#111"}>{NODES[i].t}</text></g>; },
    link: (a, b) => <path d={`M${a.x} ${a.y} L${(a.x + b.x) / 2} ${a.y} L${(a.x + b.x) / 2} ${b.y} L${b.x} ${b.y}`} stroke="#111" strokeWidth={7} fill="none" strokeLinejoin="round" />,
    sticker: <g transform="translate(790 50) rotate(10)"><polygon points={starPts(8, 8, 12, 115, 88)} fill="#111" /><polygon points={starPts(0, 0, 12, 115, 88)} fill="#ffd23f" stroke="#111" strokeWidth={6} /><text textAnchor="middle" y={16} fontFamily={ARCH} fontSize={48} fill="#111">FREE</text></g>,
    chip: <Chip font={ARCH} style={{ background: "#fff7ea", color: "#111", border: "6px solid #111", borderRadius: 999, boxShadow: "10px 10px 0 #111" }} kw={{ color: "#ff5a1f" }} />,
    bar: (on) => ({ background: on ? "#111" : "rgba(17,17,17,0.25)", borderRadius: 4 }),
  },
  // 6. Ink editorial: cream paper, black brush ink, one red accent, a serif headline
  {
    name: "6 Ink editorial",
    bg: <AbsoluteFill style={{ background: "#efe6d2" }}><svg width={1080} height={1920}><circle cx={880} cy={1700} r={190} fill="#c43a2f" opacity={0.9} /></svg></AbsoluteFill>,
    caption: () => <Cap style={{ fontFamily: SERIF, fontSize: 100, color: "#1b1b1b", letterSpacing: -1 }}>{twoLines((w) => <span style={{ color: "#c43a2f", fontStyle: "italic" }}>{w}</span>)}</Cap>,
    card: <g><filter id="ink"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={3} seed={6} result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale={10} xChannelSelector="R" yChannelSelector="G" /></filter><rect x={0} y={0} width={CARD.w} height={CARD.h} fill="none" stroke="#1b1b1b" strokeWidth={10} filter="url(#ink)" /></g>,
    node: (i, on) => <g filter="url(#ink)"><rect x={NODES[i].x} y={NODES[i].y} width={nodeW} height={nodeH} fill={on ? "#1b1b1b" : "none"} stroke="#1b1b1b" strokeWidth={6} /><text x={NODES[i].x + 22} y={NODES[i].y + 76} fontFamily={SERIF} fontSize={36} fill={on ? "#efe6d2" : "#1b1b1b"}>{NODES[i].t}</text></g>,
    link: (a, b) => <path d={`M${a.x} ${a.y} C${(a.x + b.x) / 2} ${a.y} ${(a.x + b.x) / 2} ${b.y} ${b.x} ${b.y}`} stroke="#1b1b1b" strokeWidth={7} fill="none" filter="url(#ink)" />,
    sticker: <g transform="translate(800 40) rotate(5)"><rect x={-90} y={-70} width={180} height={140} rx={8} fill="#c43a2f" /><text textAnchor="middle" y={18} fontFamily={SERIF} fontSize={52} fill="#efe6d2">FREE</text></g>,
    chip: <Chip font={SERIF} style={{ borderTop: "4px solid #1b1b1b", borderBottom: "4px solid #1b1b1b", color: "#1b1b1b" }} kw={{ color: "#c43a2f", fontStyle: "italic" }} />,
    bar: (on) => ({ background: on ? "#1b1b1b" : "rgba(27,27,27,0.18)" }),
    over: grain("ig", 0.12, 0.6),
  },
  // 7. Terminal pop: green phosphor terminal, pixel labels, one hot pink pop, scanlines
  {
    name: "7 Terminal pop",
    bg: <AbsoluteFill style={{ background: "#040b05" }} />,
    caption: () => <Cap style={{ fontFamily: VT, fontSize: 120, color: "#39ff6a", textShadow: "0 0 14px rgba(57,255,106,0.6)" }}>{twoLines((w) => <span style={{ color: "#ff3fa4", textShadow: "0 0 16px #ff3fa4" }}>{w}</span>)}<span style={{ opacity: 0.9 }}>_</span></Cap>,
    card: <g><rect x={0} y={0} width={CARD.w} height={CARD.h} fill="none" stroke="#39ff6a" strokeWidth={4} /><rect x={0} y={0} width={CARD.w} height={56} fill="#39ff6a" /><text x={24} y={40} fontFamily={PIX} fontSize={22} fill="#040b05">FLOORPLAN.EXE</text></g>,
    node: (i, on) => <g><rect x={NODES[i].x} y={NODES[i].y} width={nodeW} height={nodeH} fill={on ? "#ff3fa4" : "none"} stroke={on ? "#ff3fa4" : "#39ff6a"} strokeWidth={4} strokeDasharray={on ? "none" : "10 6"} /><text x={NODES[i].x + 22} y={NODES[i].y + 76} fontFamily={VT} fontSize={46} fill={on ? "#040b05" : "#39ff6a"}>{`> ${NODES[i].t}`}</text></g>,
    link: (a, b) => <path d={`M${a.x} ${a.y} L${(a.x + b.x) / 2} ${a.y} L${(a.x + b.x) / 2} ${b.y} L${b.x} ${b.y}`} stroke="#39ff6a" strokeWidth={4} fill="none" />,
    sticker: <g transform="translate(790 40) rotate(-6)"><rect x={-110} y={-44} width={220} height={88} fill="#ff3fa4" /><text textAnchor="middle" y={14} fontFamily={PIX} fontSize={34} fill="#040b05">FREE</text></g>,
    chip: <Chip font={VT} style={{ border: "4px solid #39ff6a", color: "#39ff6a", fontSize: 64 }} kw={{ color: "#ff3fa4" }} />,
    bar: (on) => ({ background: on ? "#39ff6a" : "rgba(57,255,106,0.18)" }),
    over: <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}><defs><pattern id="sl" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="rgba(0,0,0,0.35)" /></pattern></defs><rect width={1080} height={1920} fill="url(#sl)" /></svg>,
  },
];

export const LOOK_COUNT = LOOKS.length;

export const LookLab: React.FC = () => {
  const L = LOOKS[Math.min(useCurrentFrame(), LOOKS.length - 1)];
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {L.bg}
      {L.caption((w) => w)}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <g transform={`translate(${CARD.x} ${CARD.y})`}>
          {L.card}
          <g transform="translate(0 40)">
            {LINKS.map(([a, b], i) => <React.Fragment key={i}>{L.link({ x: mid(a).x + nodeW / 2 - 10, y: mid(a).y }, { x: mid(b).x - nodeW / 2 + 10, y: mid(b).y }, i)}</React.Fragment>)}
            {NODES.map((_, i) => <React.Fragment key={i}>{L.node(i, i === 2)}</React.Fragment>)}
          </g>
          {L.sticker}
        </g>
      </svg>
      {L.chip}
      <div style={{ position: "absolute", left: 90, right: 90, top: 1760, display: "flex", gap: 12 }}>
        {Array.from({ length: 6 }, (_, i) => <div key={i} style={{ flex: 1, height: 10, ...L.bar(i < 2, i) }} />)}
      </div>
      {L.over}
    </AbsoluteFill>
  );
};
