import React from "react";
import { useCurrentFrame, Img, staticFile, interpolate } from "remotion";
import { F, FPS } from "../../kit/theme";
import type { View } from "./faceless";
import { SERIF, c01, sp, ease, In, Card, Check, typed, Captions } from "./keynote";

/** Claude and the mouse surgery (claude-mouse-surgery, 2026-11-07). Our dark look with a lab HUD of our own: thin lines,
 *  mono labels, a line-art brain whose network calms from orange to blue, the Claude mark as the agent. The hook shows
 *  only the brain; "the patient?" pulls back to reveal the mouse. Readouts and the therapy list are ILLUSTRATIVE.
 *  Structure from DfTSAXchdv8 (talking head, lab footage), never its look. No 3D. */

const D = { hot: "#ff7a45", calm: "#5ab4ff", ok: "#2fbf71", red: "#ff4d4f" };
type World = { bg: string; ink: string; dim: string; line: string; card: string; accent: string; grid: boolean };
const W: Record<string, World> = {
  dark: { bg: "#0a0c11", ink: "#eef2f7", dim: "#7b8594", line: "#232833", card: "#12161f", accent: "#ff7a45", grid: true },
  white: { bg: "#f4f2ee", ink: "#16161a", dim: "#8a8780", line: "#e4e1da", card: "#ffffff", accent: "#e0561f", grid: false },
  blue: { bg: "#0d2547", ink: "#ffffff", dim: "#9fb6d9", line: "#21406e", card: "#15325c", accent: "#9fd0ff", grid: true },
  red: { bg: "#8f1d1d", ink: "#ffffff", dim: "#f0b3b3", line: "#a83636", card: "#a52a2a", accent: "#ffd2d2", grid: false },
};
/** the world being drawn this frame; set by the View before any beat draws */
let TH: World = W.dark;
const claude = staticFile("claude-mouse-surgery/raw/claude_symbol.svg");
const Mono: React.FC<{ s: number; c?: string; children: React.ReactNode; w?: number }> = ({ s, c = TH.dim, children, w = 600 }) => <span style={{ fontFamily: F.mono, fontSize: s, letterSpacing: 2, color: c, fontWeight: w }}>{children}</span>;
const mix = (a: string, b: string, k: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(",")})`;
};

// the brain's network: fixed points inside an ellipse, linked to their near neighbours
const rnd = (i: number) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const NODES = Array.from({ length: 46 }).map((_, i) => {
  const a = rnd(i) * Math.PI * 2, r = Math.sqrt(rnd(i + 99)) * 0.86;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.92 };
});
const EDGES: [number, number][] = [];
NODES.forEach((n, i) => NODES.forEach((m, j) => { if (j > i && Math.hypot(n.x - m.x, n.y - m.y) < 0.36) EDGES.push([i, j]); }));

/** the anatomical brain for the big shots (Vishnu, 2026-11-07: the network blob read badly): a side view with folds, the two
 *  main grooves, the cerebellum and the brain stem; sparks race along the folds in a seizure and slow down once calm */
export const Brain: React.FC<{ cx: number; cy: number; rx: number; ry: number; calm: number; now: number; target?: number }> = ({ cx, cy, rx, ry, calm, now, target = 0 }) => {
  const col = mix(D.hot, D.calm, calm);
  const fill = mix("#2a1208", "#0b1a2a", calm);
  const id = `br${Math.round(cx)}x${Math.round(cy)}x${Math.round(rx)}`;
  const shape = `M ${cx - rx} ${cy + ry * 0.1} C ${cx - rx} ${cy - ry * 1.05}, ${cx + rx * 0.9} ${cy - ry * 1.15}, ${cx + rx} ${cy - ry * 0.05} C ${cx + rx * 1.02} ${cy + ry * 0.6}, ${cx + rx * 0.55} ${cy + ry * 0.75}, ${cx + rx * 0.2} ${cy + ry * 0.72} C ${cx - rx * 0.3} ${cy + ry * 0.95}, ${cx - rx * 0.85} ${cy + ry * 0.8}, ${cx - rx} ${cy + ry * 0.1} Z`;
  const rows = 11;
  const rowY = (r: number) => cy - ry * 1.02 + (r + 0.5) * ((ry * 1.9) / rows);
  const wave = (r: number, x: number) => rowY(r) + ry * 0.07 * Math.sin(x / (rx * 0.09) + r * 1.7) + ry * 0.04 * Math.sin(x / (rx * 0.035) + r * 2.9);
  const gyrus = (r: number) => { let d = ""; for (let x = cx - rx * 1.05; x <= cx + rx * 1.05; x += rx * 0.02) d += `${d ? "L" : "M"} ${x.toFixed(1)} ${wave(r, x).toFixed(1)} `; return d; };
  const speed = 0.9 - 0.65 * calm;
  const sparks = Array.from({ length: 12 }).map((_, k) => { const r = (k * 5) % rows; const f = (now * speed + k * 0.29) % 1; const x = cx - rx + f * 2 * rx; return { x, y: wave(r, x), k }; });
  return (
    <g>
      <defs><clipPath id={id}><path d={shape} /></clipPath></defs>
      <path d={`M ${cx + rx * 0.22} ${cy + ry * 0.62} L ${cx + rx * 0.36} ${cy + ry * 0.62} L ${cx + rx * 0.4} ${cy + ry * 1.38} L ${cx + rx * 0.29} ${cy + ry * 1.38} Z`} fill={fill} stroke={col} strokeWidth={3} />
      <ellipse cx={cx + rx * 0.62} cy={cy + ry * 0.8} rx={rx * 0.3} ry={ry * 0.27} fill={fill} stroke={col} strokeWidth={3} />
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M ${cx + rx * 0.36} ${cy + ry * (0.66 + i * 0.09)} Q ${cx + rx * 0.62} ${cy + ry * (0.6 + i * 0.09)} ${cx + rx * 0.9} ${cy + ry * (0.68 + i * 0.09)}`} stroke={col} strokeWidth={2} fill="none" opacity={0.6} />)}
      <path d={shape} fill={fill} />
      <g clipPath={`url(#${id})`}>
        {Array.from({ length: rows }).map((_, r) => <path key={r} d={gyrus(r)} stroke={col} strokeWidth={2.6} fill="none" opacity={0.5} />)}
        {sparks.map((p) => <circle key={p.k} cx={p.x} cy={p.y} r={6} fill="#ffffff" opacity={0.35 + 0.65 * (1 - calm)} style={{ filter: `drop-shadow(0 0 8px ${col})` }} />)}
      </g>
      <path d={`M ${cx - rx * 0.6} ${cy + ry * 0.3} C ${cx - rx * 0.25} ${cy + ry * 0.05}, ${cx + rx * 0.15} ${cy + ry * 0.12}, ${cx + rx * 0.45} ${cy - ry * 0.08}`} stroke={col} strokeWidth={5} fill="none" />
      <path d={`M ${cx + rx * 0.02} ${cy - ry * 0.97} C ${cx + rx * 0.12} ${cy - ry * 0.55}, ${cx - rx * 0.08} ${cy - ry * 0.3}, ${cx + rx * 0.06} ${cy + ry * 0.05}`} stroke={col} strokeWidth={5} fill="none" />
      <path d={shape} fill="none" stroke={col} strokeWidth={5} style={{ filter: `drop-shadow(0 0 14px ${col})` }} />
      {target > 0 ? (
        <g opacity={target}>
          <circle cx={cx + rx * 0.42} cy={cy + ry * 0.18} r={34 * (2 - target)} fill="none" stroke={TH.ink} strokeWidth={3} />
          <line x1={cx + rx * 0.42 - 54} y1={cy + ry * 0.18} x2={cx + rx * 0.42 + 54} y2={cy + ry * 0.18} stroke={TH.ink} strokeWidth={2} />
          <line x1={cx + rx * 0.42} y1={cy + ry * 0.18 - 54} x2={cx + rx * 0.42} y2={cy + ry * 0.18 + 54} stroke={TH.ink} strokeWidth={2} />
        </g>
      ) : null}
    </g>
  );
};
/** the small brain inside the mouse (Vishnu liked it, 2026-11-07): the network version */
const MiniBrain: React.FC<{ cx: number; cy: number; rx: number; ry: number; calm: number; now: number; target?: number }> = ({ cx, cy, rx, ry, calm, now, target = 0 }) => {
  const col = mix(D.hot, D.calm, calm);
  const P = (n: { x: number; y: number }) => [cx + n.x * rx, cy + n.y * ry];
  return (
    <g>
      <path d={`M ${cx - rx} ${cy + ry * 0.1} C ${cx - rx} ${cy - ry * 1.05}, ${cx + rx * 0.9} ${cy - ry * 1.15}, ${cx + rx} ${cy - ry * 0.05} C ${cx + rx * 1.02} ${cy + ry * 0.75}, ${cx + rx * 0.2} ${cy + ry * 1.05}, ${cx - rx * 0.35} ${cy + ry * 0.9} C ${cx - rx * 0.8} ${cy + ry * 0.85}, ${cx - rx} ${cy + ry * 0.6}, ${cx - rx} ${cy + ry * 0.1} Z`}
        fill={mix("#2a1208", "#0b1a2a", calm)} stroke={col} strokeWidth={3} opacity={0.95} />
      {/* folds and the cerebellum, so it reads as a brain */}
      <path d={`M ${cx - rx * 0.05} ${cy - ry * 0.98} C ${cx + rx * 0.08} ${cy - ry * 0.45}, ${cx - rx * 0.12} ${cy + ry * 0.05}, ${cx + rx * 0.06} ${cy + ry * 0.55}`} stroke={col} strokeWidth={3} fill="none" opacity={0.7} />
      <path d={`M ${cx - rx * 0.8} ${cy + ry * 0.38} C ${cx - rx * 0.45} ${cy + ry * 0.12}, ${cx - rx * 0.05} ${cy + ry * 0.42}, ${cx + rx * 0.5} ${cy + ry * 0.62}`} stroke={col} strokeWidth={3} fill="none" opacity={0.7} />
      <path d={`M ${cx - rx * 0.55} ${cy - ry * 0.75} C ${cx - rx * 0.5} ${cy - ry * 0.3}, ${cx - rx * 0.7} ${cy - ry * 0.05}, ${cx - rx * 0.55} ${cy + ry * 0.2}`} stroke={col} strokeWidth={2.5} fill="none" opacity={0.5} />
      <path d={`M ${cx + rx * 0.5} ${cy - ry * 0.85} C ${cx + rx * 0.4} ${cy - ry * 0.4}, ${cx + rx * 0.62} ${cy - ry * 0.15}, ${cx + rx * 0.55} ${cy + ry * 0.25}`} stroke={col} strokeWidth={2.5} fill="none" opacity={0.5} />
      <ellipse cx={cx + rx * 0.72} cy={cy + ry * 0.78} rx={rx * 0.26} ry={ry * 0.24} fill={mix("#2a1208", "#0b1a2a", calm)} stroke={col} strokeWidth={3} />
      {EDGES.map(([i, j], k) => { const [x1, y1] = P(NODES[i]); const [x2, y2] = P(NODES[j]); return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={1.4} opacity={0.35 + 0.25 * (1 - calm) * (0.5 + 0.5 * Math.sin(now * 14 + k))} />; })}
      {NODES.map((n, k) => { const [x, y] = P(n); const flick = (1 - calm) * (0.5 + 0.5 * Math.sin(now * 18 + k * 2.1)); return <circle key={k} cx={x} cy={y} r={3.5 + 3 * flick} fill={col} opacity={0.55 + 0.45 * flick} />; })}
      {target > 0 ? (
        <g opacity={target}>
          <circle cx={cx + rx * 0.42} cy={cy + ry * 0.18} r={34 * (2 - target)} fill="none" stroke={TH.ink} strokeWidth={3} />
          <line x1={cx + rx * 0.42 - 54} y1={cy + ry * 0.18} x2={cx + rx * 0.42 + 54} y2={cy + ry * 0.18} stroke={TH.ink} strokeWidth={2} />
          <line x1={cx + rx * 0.42} y1={cy + ry * 0.18 - 54} x2={cx + rx * 0.42} y2={cy + ry * 0.18 + 54} stroke={TH.ink} strokeWidth={2} />
        </g>
      ) : null}
    </g>
  );
};
/** the needle: a thin line down from the top to depth k (0..1) at (x, y) */
const Needle: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => (
  <g opacity={c01(k * 4)}>
    <line x1={x} y1={-20} x2={x} y2={-20 + (y + 20) * k} stroke={TH.ink} strokeWidth={4} />
    <rect x={x - 16} y={-20 + (y + 20) * k - 160} width={32} height={120} rx={6} fill="none" stroke={TH.ink} strokeWidth={3} />
    <circle cx={x} cy={-20 + (y + 20) * k} r={6} fill={D.hot} />
  </g>
);
/** a line-art mouse around a head at the brain's spot (brain centre 440, 810) */
const Mouse: React.FC<{ k: number }> = ({ k }) => (
  <g opacity={k} stroke={TH.ink} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 200 905 C 215 760, 350 680, 470 690 C 570 630, 770 640, 870 760 C 945 845, 915 970, 810 1000 L 380 1000 C 290 1000, 215 975, 200 905 Z" strokeDasharray={2600} strokeDashoffset={2600 * (1 - k)} />
    <circle cx={500} cy={672} r={58} strokeDasharray={380} strokeDashoffset={380 * (1 - k)} />
    <circle cx={292} cy={860} r={7} fill={TH.ink} />
    <path d="M 870 975 C 980 1010, 1010 1120, 905 1175" strokeDasharray={420} strokeDashoffset={420 * (1 - k)} />
    {[[-70, -18], [-76, 6], [-68, 28]].map(([dx, dy], i) => <line key={i} x1={210} y1={905} x2={210 + dx} y2={905 + dy} strokeWidth={2.5} opacity={0.7} />)}
    <path d="M 420 1000 L 410 1050 M 720 1000 L 735 1050" />
  </g>
);

/** a head bandage with a plaster across the mouse's head, for "recovered" (Vishnu, 2026-11-07) */
const Bandage: React.FC<{ t: number }> = ({ t }) => {
  const k = sp(t, 180);
  return (
    <g opacity={c01(t / 0.12)} transform={`translate(445 735) scale(${0.6 + 0.4 * k}) translate(-445 -735)`}>
      <path d="M 300 790 C 360 700, 520 680, 600 740" stroke={TH.ink} strokeWidth={50} fill="none" strokeLinecap="round" />
      <path d="M 300 790 C 360 700, 520 680, 600 740" stroke="#ffffff" strokeWidth={42} fill="none" strokeLinecap="round" />
      <path d="M 304 790 C 362 705, 520 686, 598 742" stroke="#d9d4c8" strokeWidth={2} strokeDasharray="8 10" fill="none" />
      <g transform="rotate(-18 450 715)">
        <rect x={405} y={690} width={90} height={46} rx={14} fill="#f1d3b3" stroke={TH.ink} strokeWidth={3} />
        <rect x={432} y={696} width={36} height={34} rx={6} fill="#e8c09a" />
      </g>
    </g>
  );
};
/** a side-facing human head (facing right) for the last question */
const HumanHead: React.FC<{ k: number }> = ({ k }) => (
  <g stroke={TH.ink} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 330 1130 C 250 980, 225 720, 330 580 C 420 460, 640 450, 725 560 C 775 630, 780 700, 775 740 L 808 815 L 780 830 C 790 870, 775 900, 765 915 C 775 955, 745 995, 695 1000 C 662 1012, 645 1060, 645 1130"
      strokeDasharray={2600} strokeDashoffset={2600 * (1 - k)} />
    <path d="M 455 800 C 430 770, 430 830, 455 845" strokeDasharray={120} strokeDashoffset={120 * (1 - k)} />
  </g>
);

/** a stereotaxic surgery rig in line art (Vishnu, 2026-11-07: "the surgery machine could be better"): base, two posts, an X
 *  crossbar the motor carriage slides along, a Z axis holding a syringe whose plunger moves, the needle, and an empty holder
 *  stage (the mouse is kept for the reveal) */
const Rig: React.FC<{ now: number; t: number }> = ({ now, t }) => {
  const x = 195 + 55 * Math.sin(now * 1.3);
  const z = 18 * Math.sin(now * 1.9);
  const plunger = 0.5 + 0.5 * Math.sin(now * 0.9);
  const k = ease(t - 0.1, 0.6);
  const st = { stroke: TH.ink, strokeWidth: 4, fill: TH.card, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <svg width={390} height={600} style={{ position: "absolute", left: 0, top: 40, opacity: k }}>
      <rect x={30} y={530} width={330} height={28} rx={8} {...st} />
      <rect x={52} y={150} width={22} height={380} rx={5} {...st} />
      <rect x={316} y={150} width={22} height={380} rx={5} {...st} />
      <rect x={52} y={136} width={286} height={26} rx={6} {...st} />
      {Array.from({ length: 12 }).map((_, i) => <line key={i} x1={80 + i * 20} y1={162} x2={80 + i * 20} y2={170} stroke={TH.dim} strokeWidth={2} />)}
      <path d={`M ${x + 30} 120 C ${x + 90} 80, 330 70, 330 136`} stroke={TH.dim} strokeWidth={3} fill="none" />
      <rect x={x - 38} y={112} width={76} height={70} rx={10} {...st} />
      <circle cx={x - 14} cy={147} r={11} {...st} /><circle cx={x + 16} cy={147} r={11} {...st} />
      <line x1={x - 14} y1={147} x2={x - 14 + 9 * Math.cos(now * 6)} y2={147 + 9 * Math.sin(now * 6)} stroke={D.hot} strokeWidth={3} />
      <rect x={x - 9} y={182} width={18} height={110 + z} rx={4} {...st} />
      <rect x={x - 4} y={268 + z - 30 * plunger} width={8} height={50} rx={3} fill={TH.ink} />
      <rect x={x - 22} y={262 + z - 30 * plunger} width={44} height={10} rx={3} fill={TH.ink} />
      <rect x={x - 17} y={300 + z} width={34} height={110} rx={7} {...st} />
      <rect x={x - 13} y={300 + z + 106 * (0.25 + 0.5 * plunger)} width={26} height={106 * (0.75 - 0.5 * plunger)} rx={4} fill={D.hot} opacity={0.85} />
      {[0, 1, 2, 3].map((i) => <line key={i} x1={x + 6} y1={322 + z + i * 20} x2={x + 17} y2={322 + z + i * 20} stroke={TH.dim} strokeWidth={2} />)}
      <line x1={x} y1={410 + z} x2={x} y2={458 + z} stroke={D.hot} strokeWidth={3} />
      <rect x={120} y={488} width={150} height={20} rx={5} {...st} />
      <path d="M 130 488 L 112 440 M 260 488 L 278 440" stroke={TH.ink} strokeWidth={4} />
      <rect x={100} y={430} width={24} height={14} rx={4} {...st} /><rect x={266} y={430} width={24} height={14} rx={4} {...st} />
      <g fill={D.hot} stroke="none" fontFamily={F.mono} fontSize={18}>
        <text x={345} y={128}>X</text><path d="M 300 108 L 330 108 L 324 102 M 330 108 L 324 114" stroke={D.hot} strokeWidth={2.5} fill="none" />
        <text x={x + 24} y={244}>Z</text>
      </g>
    </svg>
  );
};

type B = (now: number, T: (k: string) => number) => React.ReactNode;
const Head: React.FC<{ t: number; a: string; i?: string; b?: string; top?: number; size?: number }> = ({ t, a, i, b, top = 200, size = 92 }) => (
  <In t={t} dy={26} style={{ left: 50, right: 50, top, textAlign: "center", fontFamily: SERIF, fontSize: size, color: TH.ink, lineHeight: 1.05 }}>
    {a}{i ? <span style={{ fontStyle: "italic", color: D.hot }}> {i}</span> : null}{b ? ` ${b}` : null}
  </In>
);
const Hud: React.FC<{ x: number; y: number; w: number; h: number; t: number; label: string; children?: React.ReactNode; border?: string }> = ({ x, y, w, h, t, label, children, border = TH.line }) => (
  <Card x={x} y={y} w={w} h={h} t={t} fill={TH.card} r={18} shadow="0 20px 50px rgba(0,0,0,0.5)" style={{ border: `2px solid ${border}` }}>
    <div style={{ position: "absolute", left: 22, top: 16 }}><Mono s={18}>{label}</Mono></div>
    {children}
  </Card>
);
const ClaudeChip: React.FC<{ t: number; x: number; y: number; s?: number }> = ({ t, x, y, s = 1 }) => (
  <In t={t} dy={20} style={{ left: x, top: y, transform: `scale(${s})`, transformOrigin: "0 0" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16, background: TH.card, border: `2px solid ${TH.line}`, borderRadius: 999, padding: "14px 28px 14px 16px" }}>
      <Img src={claude} style={{ width: 56, height: 56 }} />
      <span style={{ fontFamily: SERIF, fontSize: 44, color: TH.ink }}>Claude</span>
      <Mono s={18}>AGENT</Mono>
    </div>
  </In>
);

// 1. Its first surgery: a hot brain alone; the treatment vial; the needle descends into it
const b1: B = (now, T) => {
  const t0 = T("b1"), tc = T("chose"), tn = T("needle");
  return (
    <>
      <Head t={now - t0} a="Its first" i="surgery." top={190} size={110} />
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        <Brain cx={540} cy={860} rx={330} ry={220} calm={0} now={now} />
        {/* the needle is moving from the first frame: it creeps down to just above the brain, then goes in on "needle" */}
        <Needle x={540 + 330 * 0.42} y={860 + 220 * 0.18} k={Math.min(1, 0.62 * ease(now - t0 - 0.1, 1.6) + 0.38 * ease(now - tn, 0.7))} />
      </svg>
      {now >= tc - 0.1 ? (
        <In t={now - tc} style={{ left: 90, top: 1180 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", borderRadius: 999, border: `2px solid ${D.hot}` }}>
            <div style={{ width: 22, height: 40, borderRadius: 6, border: `3px solid ${D.hot}`, background: `linear-gradient(0deg, ${D.hot} 55%, transparent 55%)` }} />
            <Mono s={24} c={TH.ink}>TREATMENT CHOSEN</Mono>
          </div>
        </In>
      ) : null}
    </>
  );
};

// 2. Exin gives the agent a goal, nineteen therapies and a robot it controls
const b2: B = (now, T) => {
  const t0 = T("b2"), tg = T("goal"), tl = T("list"), tr = T("robot");
  return (
    <>
      <In t={now - t0} style={{ left: 0, right: 0, top: 210, textAlign: "center" }}>
        <div style={{ fontFamily: SERIF, fontSize: 100, color: TH.ink }}>Exin <span style={{ fontStyle: "italic" }}>Therapeutics</span></div>
        <div style={{ marginTop: 12 }}><Mono s={24}>SAN FRANCISCO · Y COMBINATOR · EPILEPSY</Mono></div>
      </In>
      <div style={{ position: "absolute", left: 538, top: 400, width: 4, height: 90 * ease(now - t0 - 0.35, 0.3), background: TH.dim }} />
      <ClaudeChip t={now - t0 - 0.5} x={255} y={500} s={1.45} />
      {now >= tg - 0.1 ? (
        <In t={now - tg} style={{ left: 0, right: 0, top: 690, display: "flex", justifyContent: "center", transform: "scale(1.15)" }}>
          <div style={{ padding: "18px 34px", borderRadius: 16, border: `3px solid ${D.hot}`, display: "flex", gap: 18, alignItems: "center" }}>
            <Mono s={24} c={D.hot}>GOAL</Mono><span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 44, color: TH.ink }}>Cut the seizures</span>
          </div>
        </In>
      ) : null}
      {now >= tl - 0.1 ? (
        <Hud x={70} y={840} w={520} h={640} t={now - tl} label="GENE THERAPIES · 19">
          {Array.from({ length: 19 }).map((_, i) => (
            <div key={i} style={{ position: "absolute", left: 22, right: 22, top: 56 + i * 30, height: 22, display: "flex", alignItems: "center", gap: 12, opacity: c01((now - tl - 0.1 - i * 0.04) / 0.1) }}>
              <Mono s={14}>{String(i + 1).padStart(2, "0")}</Mono>
              <div style={{ height: 8, borderRadius: 4, width: 80 + rnd(i + 7) * 260, background: i % 3 === 0 ? D.hot : D.calm, opacity: 0.7 }} />
            </div>
          ))}
        </Hud>
      ) : null}
      {now >= tr - 0.1 ? (
        <Hud x={620} y={840} w={390} h={640} t={now - tr} label="SURGERY ROBOT">
          <Rig now={now} t={now - tr} />
          <div style={{ position: "absolute", left: 22, bottom: 18 }}><Mono s={16} c={D.ok}>CONTROLLED BY THE AGENT</Mono></div>
        </Hud>
      ) : null}
    </>
  );
};

// 3. It picks a therapy (the network calms orange to blue), reads three papers and locks the target
const b3: B = (now, T) => {
  const t0 = T("b3"), tc = T("calming"), tr = T("research"), tx = T("exactly");
  const calm = ease(now - tc, 1.2);
  const lock = c01((now - tx) / 0.5);
  return (
    <>
      <Hud x={110} y={190} w={860} h={150} t={now - t0} label="PICKED · 1 OF 19" border={D.calm}>
        <div style={{ position: "absolute", left: 22, top: 60, display: "flex", alignItems: "center", gap: 18 }}>
          <Check t={now - t0 - 0.3} color={D.calm} size={44} />
          <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 40, color: TH.ink }}>Boosts GABA, the calming signal</span>
        </div>
      </Hud>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        <Brain cx={540} cy={720} rx={300} ry={200} calm={calm} now={now} target={lock} />
      </svg>
      {now >= tr - 0.1 && now < tx + 0.3 ? ["Paper 1", "Paper 2", "Paper 3"].map((p, i) => {
        const fly = c01((now - tx + 0.1) / 0.4);
        return (
          <div key={i} style={{ position: "absolute", left: 120 + i * 290 + fly * (660 - (120 + i * 290)), top: 1010 - fly * 270, opacity: c01((now - tr - i * 0.12) / 0.15) * (1 - fly), transform: `scale(${1 - fly * 0.7})` }}>
            <div style={{ width: 250, height: 300, borderRadius: 14, background: "#f3f1ea", padding: 22 }}>
              <div style={{ fontFamily: SERIF, fontSize: 28, color: "#1a1a1a" }}>{p}</div>
              {[0, 1, 2, 3, 4, 5].map((l) => <div key={l} style={{ height: 8, marginTop: 16, borderRadius: 4, width: `${60 + rnd(l + i * 9) * 40}%`, background: "#c9c4b6" }} />)}
            </div>
          </div>
        );
      }) : null}
      {now >= tx + 0.2 ? (
        <Hud x={170} y={1030} w={740} h={260} t={now - tx - 0.2} label="TARGET LOCKED · ILLUSTRATIVE" border={TH.ink}>
          <div style={{ position: "absolute", left: 22, right: 22, top: 70, display: "flex", justifyContent: "space-between" }}>
            {[["AP", "-3.90"], ["ML", "+4.00"], ["DV", "+2.00"]].map(([a, b]) => <div key={a}><Mono s={20}>{a} mm</Mono><div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 56, color: TH.ink }}>{b}</div></div>)}
          </div>
          <div style={{ position: "absolute", left: 22, bottom: 18 }}><Mono s={16}>AVERAGED FROM THE RESEARCH</Mono></div>
        </Hud>
      ) : null}
    </>
  );
};

// 4. The humans' part (surgeon, approval), then Claude drives the needle on the camera feed
const b4: B = (now, T) => {
  const t0 = T("b4"), ta = T("approved"), td = T("drove"), tw = T("camera");
  const depth = ease(now - td - 0.2, 2.4);
  return (
    <>
      {[["SURGEON", "Opened the skull", t0], ["HUMAN", "Signed off", ta]].map(([who, what, t], i) => (
        <In key={i} t={now - (t as number)} style={{ left: 110, top: 200 + i * 120 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Check t={now - (t as number) - 0.2} color={D.ok} size={48} />
            <Mono s={22}>{who as string}</Mono>
            <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 44, color: TH.ink }}>{what as string}</span>
          </div>
        </In>
      ))}
      {now >= t0 + 0.15 ? (
        <Hud x={70} y={470} w={940} h={860} t={now - t0 - 0.15} label="CAMERA · ILLUSTRATIVE" border={D.hot}>
          <div style={{ position: "absolute", right: 22, top: 14, display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 16, height: 16, borderRadius: 8, background: D.red, opacity: 0.5 + 0.5 * Math.sin(now * 6) }} /><Mono s={18} c={D.red}>REC</Mono></div>
          <svg width={940} height={700} style={{ position: "absolute", left: 0, top: 60 }}>
            <Brain cx={470} cy={380} rx={360} ry={240} calm={0.85} now={now} />
            <circle cx={470} cy={380} r={110} fill="none" stroke={TH.ink} strokeWidth={2} strokeDasharray="10 10" />
            <line x1={470} y1={0} x2={470} y2={60 + 320 * depth} stroke={TH.ink} strokeWidth={5} />
            <circle cx={470} cy={60 + 320 * depth} r={8} fill={D.hot} />
          </svg>
          <div style={{ position: "absolute", left: 22, right: 22, bottom: 24, display: "flex", alignItems: "center", gap: 18 }}>
            <Img src={claude} style={{ width: 40, height: 40 }} />
            <Mono s={20} c={TH.ink}>CLAUDE · DRIVING</Mono>
            <div style={{ flex: 1, height: 12, borderRadius: 6, background: TH.line }}><div style={{ width: `${depth * 100}%`, height: "100%", borderRadius: 6, background: D.hot }} /></div>
            <Mono s={20} c={TH.ink}>{(depth * 2).toFixed(2)} mm</Mono>
          </div>
          {now >= tw ? <div style={{ position: "absolute", left: 22, top: 50 }}><Mono s={18} c={D.ok}>{`FRAME CHECK ${Math.min(32, Math.floor((now - tw) * 9) + 1)}`}</Mono></div> : null}
        </Hud>
      ) : null}
    </>
  );
};

// 5. The patient? Pull back: the brain sits inside a mouse
const b5: B = (now, T) => {
  const t0 = T("b5"), tm = T("mouse");
  const k = ease(now - t0, 0.9);
  const cx = interpolate(k, [0, 1], [540, 440]), cy = interpolate(k, [0, 1], [860, 810]);
  return (
    <>
      <Head t={now - t0} a="The" i="patient?" top={200} size={110} />
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        <Mouse k={ease(now - t0 - 0.2, 0.9)} />
        <g opacity={1 - c01(k * 1.6)}><Brain cx={cx} cy={cy} rx={interpolate(k, [0, 1], [330, 120])} ry={interpolate(k, [0, 1], [220, 80])} calm={0.9} now={now} /></g>
        <g opacity={c01(k * 1.6 - 0.4)}><MiniBrain cx={cx} cy={cy} rx={interpolate(k, [0, 1], [330, 120])} ry={interpolate(k, [0, 1], [220, 80])} calm={0.9} now={now} /></g>
      </svg>
      {now >= tm - 0.1 ? (
        <Hud x={170} y={1180} w={740} h={150} t={now - tm} label="PATIENT">
          <div style={{ position: "absolute", left: 22, top: 58, fontFamily: F.body, fontWeight: 700, fontSize: 48, color: TH.ink }}>A mouse with epilepsy</div>
        </Hud>
      ) : null}
    </>
  );
};

// 6. One Claude model refused once it saw a living animal
const b6: B = (now, T) => {
  const t0 = T("b6"), tr = T("refused"), tl = T("living");
  const st = sp(now - tr - 0.05, 200);
  return (
    <>
      <In t={now - t0} style={{ left: 0, right: 0, top: 200, textAlign: "center" }}><Mono s={24}>THE COMPANY SAYS</Mono></In>
      <Hud x={110} y={420} w={860} h={760} t={now - t0 - 0.1} label="ANOTHER CLAUDE MODEL">
        <div style={{ position: "absolute", left: 300, top: 90, width: 260, height: 260, borderRadius: 130, background: "#f4f2ee", display: "flex", alignItems: "center", justifyContent: "center" }}><Img src={claude} style={{ width: 180, height: 180 }} /></div>
        <div style={{ position: "absolute", left: 40, right: 40, top: 420, fontFamily: F.body, fontWeight: 600, fontSize: 44, color: TH.ink, textAlign: "center" }}>{typed("Task: inject the therapy", now - t0 - 0.4, 24)}</div>
        {now >= tl - 0.1 ? <div style={{ position: "absolute", left: 0, right: 0, top: 520, textAlign: "center", opacity: c01((now - tl) / 0.15) }}><Mono s={28} c="#ffffff" w={800}>LIVE ANIMAL DETECTED</Mono></div> : null}
        {now >= tr ? <div style={{ position: "absolute", left: 190, top: 230, fontFamily: F.mono, fontWeight: 800, fontSize: 96, letterSpacing: 6, color: "#ffffff", border: "8px solid #ffffff", borderRadius: 18, padding: "4px 26px", transform: `rotate(-12deg) scale(${2.2 - 1.2 * st})`, opacity: c01((now - tr) / 0.08), background: "#6e1414" }}>REFUSED</div> : null}
      </Hud>
    </>
  );
};

// 7. Recovered; the result not measured yet
const b7: B = (now, T) => {
  const t0 = T("b7"), tw = T("didit");
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: -120 }}><Mouse k={1} /><MiniBrain cx={440} cy={810} rx={120} ry={80} calm={1} now={now} /><Bandage t={now - t0 - 0.3} /></svg>
      <Hud x={110} y={1000} w={860} h={140} t={now - t0} label="MOUSE" border={D.ok}>
        <div style={{ position: "absolute", left: 22, top: 54, display: "flex", alignItems: "center", gap: 16 }}><Check t={now - t0 - 0.2} color={D.ok} size={44} /><span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 44, color: TH.ink }}>Recovered</span></div>
      </Hud>
      {now >= tw - 0.1 ? (
        <Hud x={110} y={1170} w={860} h={140} t={now - tw} label="SEIZURES" border="#f3b01c">
          <div style={{ position: "absolute", left: 22, top: 54, display: "flex", alignItems: "center", gap: 16 }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: "#f3b01c", opacity: 0.3 + 0.7 * c01(Math.sin(now * 5 - i * 0.8)) }} />)}
            <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 44, color: TH.ink }}>Not measured yet</span>
          </div>
        </Hud>
      ) : null}
    </>
  );
};

// 8. Would you let an AI near your brain? A human head in profile with its brain, an AI arm (the Claude mark) hovering a
//    needle over it; then "I'm not sure I would", the comment bubble and follow
const b8: B = (now, T) => {
  const t0 = T("b8"), tn = T("notsure"), tc = T("comment"), tf = T("follow");
  const arm = ease(now - t0 - 0.5, 0.8);
  const bob = 10 * Math.sin(now * 2.2);
  const tipX = 625 + (1 - arm) * 300, tipY = 560 + bob - (1 - arm) * 60;
  const ex = tipX + 230, ey = tipY - 90;
  return (
    <>
      <Head t={now - t0} a="Would you let an AI" i="near" b="your brain?" top={170} size={88} />
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: -20 }}>
        <g transform="translate(80 130) scale(0.85)">
          <HumanHead k={ease(now - t0 - 0.1, 1.0)} />
          <g opacity={c01((now - t0 - 0.4) / 0.3)} transform="translate(1000 0) scale(-1 1)"><Brain cx={500} cy={690} rx={185} ry={125} calm={0.6} now={now} /></g>
        </g>
        <g opacity={c01((now - t0 - 0.5) / 0.2)} stroke={TH.ink} strokeWidth={6} fill="none" strokeLinecap="round">
          <path d={`M 1120 ${ey + 260} L ${ex} ${ey} L ${tipX + 20} ${tipY - 60}`} />
          <line x1={tipX + 20} y1={tipY - 60} x2={tipX - 30} y2={tipY + 40} stroke={D.hot} strokeWidth={4} />
          <circle cx={tipX - 30} cy={tipY + 40} r={7} fill={D.hot} stroke="none" style={{ filter: `drop-shadow(0 0 10px ${D.hot})` }} />
        </g>
      </svg>
      <div style={{ position: "absolute", left: ex - 46, top: ey - 46 - 20, width: 92, height: 92, borderRadius: 46, background: TH.card, boxShadow: "0 10px 30px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", justifyContent: "center", opacity: c01((now - t0 - 0.5) / 0.2) }}>
        <Img src={claude} style={{ width: 60, height: 60 }} />
      </div>
      {now >= tn - 0.1 ? <In t={now - tn} style={{ left: 0, right: 0, top: 1150, textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontSize: 58, color: TH.dim }}>I'm not sure I would.</In> : null}
      {now >= tc - 0.1 ? (
        <In t={now - tc} style={{ left: 0, right: 0, top: 1250, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, background: TH.card, border: `2px solid ${TH.line}`, borderRadius: 999, padding: "14px 36px 14px 14px", boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: TH.line }} />
            <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 40, color: TH.ink, minWidth: 360 }}>{typed("Yes, no, never?", now - tc - 0.2, 22)}</span>
          </div>
        </In>
      ) : null}
      {now >= tf - 0.1 ? (
        <In t={now - tf} style={{ left: 0, right: 0, top: 1380, display: "flex", justifyContent: "center" }}>
          <div style={{ padding: "16px 54px", borderRadius: 999, background: TH.accent, fontFamily: F.body, fontWeight: 800, fontSize: 40, color: "#ffffff", transform: `scale(${sp(now - tf, 220)})` }}>Follow for more like this</div>
        </In>
      ) : null}
    </>
  );
};

// each chapter floods in its own world from the centre (the 34-three-agents system)
const BEATS: { key: string; draw: B; world: string; tab: number }[] = [
  { key: "b1", draw: b1, world: "dark", tab: -1 }, { key: "b2", draw: b2, world: "white", tab: 0 }, { key: "b3", draw: b3, world: "blue", tab: 1 },
  { key: "b4", draw: b4, world: "dark", tab: 2 }, { key: "b5", draw: b5, world: "white", tab: 3 }, { key: "b6", draw: b6, world: "red", tab: 4 },
  { key: "b7", draw: b7, world: "white", tab: 5 }, { key: "b8", draw: b8, world: "white", tab: -1 },
];
const TABS = ["01 SETUP", "02 PLAN", "03 SURGERY", "04 PATIENT", "05 REFUSAL", "06 RESULT"];

export const SurgeryMouse: View = {
  View: ({ t0, at, p, words }) => {
    const now = t0 + useCurrentFrame() / FPS;
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => (k === "b1" ? t0 : parts[k] ? at(parts[k]) - 0.08 : 999);
    const starts = BEATS.map((b) => T(b.key));
    let cur = 0;
    starts.forEach((s, i) => { if (now >= s) cur = i; });
    const prev = W[BEATS[Math.max(0, cur - 1)].world];
    TH = W[BEATS[cur].world];
    const flood = cur === 0 ? 1 : ease(now - starts[cur], 0.45);
    const push = 1 + 0.03 * c01((now - starts[cur]) / 3);
    const tab = BEATS[cur].tab;
    const grid = (w: World) => (w.grid ? { backgroundImage: `linear-gradient(${w.line} 1px, transparent 1px), linear-gradient(90deg, ${w.line} 1px, transparent 1px)`, backgroundSize: "60px 60px" } : {});
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, background: prev.bg, ...grid(prev), overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: TH.bg, ...grid(TH), clipPath: `circle(${flood * 130}% at 50% 45%)` }} />
        {tab >= 0 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 90, display: "flex", justifyContent: "center", gap: 8 }}>
            {TABS.map((l, i) => <div key={i} style={{ fontFamily: F.mono, fontSize: 17, letterSpacing: 2, padding: "8px 12px", borderRadius: 999, background: i === tab ? TH.ink : "transparent", color: i === tab ? TH.bg : TH.dim, border: `2px solid ${i === tab ? TH.ink : TH.dim}` }}>{l}</div>)}
          </div>
        ) : null}
        <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "50% 45%" }}>{BEATS[cur].draw(now, T)}</div>
        {words ? <Captions words={words} now={now} ink={TH.ink} accent={TH.accent} /> : null}
      </div>
    );
  },
  hits: ({ at, p }) => {
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => at(parts[k]);
    const soft = 0.62;
    return [
      { t: T("needle") + 0.2, sound: "whoosh", gain: 0.25 }, { t: T("needle") + 0.9, sound: "subdrop", gain: 0.35 },
      { t: T("b2"), sound: "swish", gain: 0.2 * soft }, { t: T("robot"), sound: "click", gain: 0.2 * soft },
      { t: T("b3"), sound: "swish", gain: 0.2 * soft }, { t: T("exactly") + 0.4, sound: "ding", gain: 0.15 * soft },
      { t: T("b4"), sound: "swish", gain: 0.2 * soft }, { t: T("drove") + 0.2, sound: "pop", gain: 0.15 * soft },
      { t: T("b5"), sound: "whoosh", gain: 0.3 }, { t: T("b5") + 0.1, sound: "subdrop", gain: 0.35 },
      { t: T("refused"), sound: "subdrop", gain: 0.3 },
      { t: T("b7"), sound: "swish", gain: 0.2 * soft },
      { t: T("b8"), sound: "sweep", gain: 0.2 * soft }, { t: T("comment") + 0.2, sound: "typing", gain: 0.15 * soft },
    ];
  },
};
