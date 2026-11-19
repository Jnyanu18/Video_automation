// path: a pencil dotted path runs from him to the gold cube; a paper robot hand ("AI") folds scraps
// from a pile into the cube, cycle by cycle, on "build ... parameters"; the cube glows on "reality itself".
import React from "react";
import { smooth } from "../lib";
import { PATH_CUBE } from "./cosmos";
import { GoldCube, Sparkle } from "./cube";
import { Dressing } from "./dressing";
import { BgImage, Defs, Dotted, HAND, IMG, INK, PAPERS, RED, TYPE, back, boil, circlePath, lerp, pS, rnd, torn, twos } from "./kit";
import { B, T } from "./T";

const PATH_D = "M 400 1110 C 520 1080, 330 930, 500 880 S 690 800, 700 650";
const SHOULDER = { x: 1190, y: 1010 }, L1 = 300, L2 = 250;
const REST = { x: 900, y: 700 };
const PILE = { x: 760, y: 1020 };
const CYCLE = 1.15;
const C0 = T.build2 - 0.25, NCYC = 4;
const SCRAPS = ["page", "fact", "rule", "<p>", "law", "data", "word", "map"];

const ik = (hx: number, hy: number) => {
  const dx = hx - SHOULDER.x, dy = hy - SHOULDER.y, d = Math.min(L1 + L2 - 1, Math.hypot(dx, dy));
  const a = Math.atan2(dy, dx), b = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d));
  const ex = SHOULDER.x + Math.cos(a + b) * L1, ey = SHOULDER.y + Math.sin(a + b) * L1;
  return { ex, ey };
};

// hand target + grip for time t
const handAt = (t: number) => {
  const arrive = back((t - (T.ai - 0.2)) / 0.5, 1.4);
  const off = { x: 1400, y: 760 };
  let p = { x: lerp(off.x, REST.x, Math.min(1, arrive)), y: lerp(off.y, REST.y, Math.min(1, arrive)) }, grip = 0, carrying = -1;
  const c = (t - C0) / CYCLE, ci = Math.floor(c), u = c - ci;
  if (c >= 0 && ci < NCYC) {
    const pick = { x: PILE.x + (ci % 2 ? 60 : -40), y: PILE.y - 10 }, drop = { x: PATH_CUBE.x + 70, y: PATH_CUBE.y + 10 };
    const e = (x: number) => smooth(x);
    if (u < 0.3) p = { x: lerp(REST.x, pick.x, e(u / 0.3)), y: lerp(REST.y, pick.y, e(u / 0.3)) };
    else if (u < 0.4) { p = pick; grip = (u - 0.3) / 0.1; }
    else if (u < 0.75) { const k = e((u - 0.4) / 0.35); p = { x: lerp(pick.x, drop.x, k), y: lerp(pick.y, drop.y, k) - Math.sin(k * Math.PI) * 120 }; grip = 1; carrying = ci; }
    else if (u < 0.88) { p = drop; grip = 1 - (u - 0.75) / 0.13; carrying = ci; }
    else p = { x: lerp(drop.x, REST.x, e((u - 0.88) / 0.12)), y: lerp(drop.y, REST.y, e((u - 0.88) / 0.12)) };
  }
  return { ...p, grip, carrying, u, ci };
};

const RobotArm: React.FC<{ t: number }> = ({ t }) => {
  const tt = twos(t);
  const h = handAt(tt);
  const { ex, ey } = ik(h.x, h.y);
  const seg = (x1: number, y1: number, x2: number, y2: number, w: number, fill: string) => {
    const a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI, L = Math.hypot(x2 - x1, y2 - y1);
    return <g transform={`translate(${x1} ${y1}) rotate(${a})`} filter="url(#psh)">
      <rect x={-w / 2} y={-w / 2} width={L + w} height={w} rx={w / 2.4} fill={fill} stroke="#5b6a80" strokeWidth={2} />
      {[0.15, 0.5, 0.85].map((q) => <circle key={q} cx={L * q} cy={-w / 2 + 9} r={4} fill="#8b97a8" />)}
      {[0.15, 0.5, 0.85].map((q) => <circle key={`b${q}`} cx={L * q} cy={w / 2 - 9} r={4} fill="#8b97a8" />)}
    </g>;
  };
  const wa = Math.atan2(h.y - ey, h.x - ex);
  const open = 1 - h.grip;
  const finger = (k: number) => {
    const base = -0.55 + k * 0.55, spread = base * (0.5 + open * 0.8);
    return <g key={k} transform={`rotate(${(spread * 180) / Math.PI})`}>
      <rect x={34} y={-9} width={46} height={18} rx={8} fill="#c9d3e0" stroke="#5b6a80" strokeWidth={2} />
      <g transform={`translate(78 0) rotate(${(20 + h.grip * 40) * (k === 0 ? -1 : 1) * (k === 1 ? 0.6 : 1)})`}><rect x={0} y={-8} width={36} height={16} rx={7} fill="#c9d3e0" stroke="#5b6a80" strokeWidth={2} /></g>
    </g>;
  };
  return (
    <g>
      {seg(SHOULDER.x, SHOULDER.y, ex, ey, 84, "#a9b6c8")}
      {seg(ex, ey, h.x, h.y, 68, "#b8c4d4")}
      <circle cx={ex} cy={ey} r={40} fill="#8b97a8" stroke="#5b6a80" strokeWidth={3} />
      <circle cx={ex} cy={ey} r={9} fill="#5b6a80" />
      {/* the "AI" tag tied to the forearm */}
      <g transform={`translate(${(ex + h.x) / 2} ${(ey + h.y) / 2 + 40}) rotate(${-8 + Math.sin(tt * 3) * 6})`}>
        <line x1={0} y1={-40} x2={0} y2={-8} stroke="#8a6a3a" strokeWidth={2} />
        <g filter="url(#psh)"><path d={torn(90, 60, "aitag", "lr", 3)} fill="#fff4cf" /><text textAnchor="middle" y={18} fontFamily={TYPE} fontSize={44} fill={INK}>AI</text></g>
      </g>
      <g transform={`translate(${h.x} ${h.y}) rotate(${(wa * 180) / Math.PI}) scale(1.45)`} filter="url(#psh)">
        <rect x={-10} y={-38} width={56} height={76} rx={14} fill="#c9d3e0" stroke="#5b6a80" strokeWidth={2.5} />
        {[0, 1, 2].map(finger)}
        <g transform={`rotate(${70 - h.grip * 30})`}><rect x={20} y={-8} width={44} height={16} rx={7} fill="#c9d3e0" stroke="#5b6a80" strokeWidth={2} /></g>
      </g>
    </g>
  );
};

export const PathScene: React.FC<{ t: number; fr: number }> = ({ t }) => {
  const tt = twos(t);
  const path = pS(t, T.path - 0.15, 1.3), ring = pS(t, T.thinkAbout, 0.4);
  const h = handAt(tt);
  const done = Math.max(0, Math.min(NCYC, Math.floor((tt - C0) / CYCLE + 0.12)));
  const e = PATH_CUBE.e + done * 6;
  const absorb = h.carrying >= 0 && h.u > 0.75 ? (h.u - 0.75) / 0.13 : 0;
  const glow = pS(t, T.reality2 - 0.1, 0.5);
  const camX = Math.sin(t * 0.16) * 7 * smooth((t - B.path.s - 0.5) / 2), camS = 1 + 0.02 * smooth((t - B.path.s - 0.5) / 11);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <Defs />
      <BgImage src={IMG.board} t={t} dx={-30} />
      <Dressing spots={[{ x: 120, y: 420, rot: -8, kind: 3 }, { x: 40, y: 760, rot: 84, kind: 4 }, { x: 640, y: 1660, rot: -12, kind: 0 }, { x: 1000, y: 330, rot: 0, kind: 2 }]} sticky="build!" />
      <g transform={`translate(${540 + camX} 900) scale(${camS}) translate(-540 -900)`}>
        {/* the pencil path from him to the cube */}
        <Dotted id="ppath" d={PATH_D} p={path} stroke="#3d3a48" w={9} gap={20} />
        {path > 0.98 && <path d="M 672 676 L 700 650 L 712 690" fill="none" stroke={RED} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />}
        <text x={560} y={960} fontFamily={HAND} fontSize={56} fill={INK} opacity={path > 0.5 ? 1 : 0} transform="rotate(-12 600 990)">a path</text>
        {/* the pile of scraps the hand draws from */}
        {SCRAPS.map((s, i) => {
          const taken = i < done || (i === done && h.carrying === i);
          if (taken) return null;
          return <g key={i} transform={`translate(${PILE.x + (rnd(`px${i}`) - 0.5) * 300} ${PILE.y + (rnd(`py${i}`) - 0.5) * 110 - i * 4}) rotate(${(rnd(`pr${i}`) - 0.5) * 50})`} filter="url(#psh)">
            <path d={torn(s.length * 21 + 50, 60, `pl${i}`)} fill={PAPERS[i % 4]} />
            <text textAnchor="middle" y={11} fontFamily={TYPE} fontSize={33} fill={INK}>{s}</text>
          </g>;
        })}
        <GoldCube x={PATH_CUBE.x} y={PATH_CUBE.y} e={e} yaw={(t - B.cosmos.s) * 22} squash={1 - 0.12 * Math.sin(absorb * Math.PI)} glow={0.6 + glow * 0.7} />
        {ring > 0 && <path d={circlePath(PATH_CUBE.x, PATH_CUBE.y, e * 1.25, e * 1.2, "pcr")} fill="none" stroke={RED} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ring} />}
        {/* the scrap being carried, folding into the cube */}
        {h.carrying >= 0 && (() => {
          const s = SCRAPS[h.carrying];
          const fold = h.u > 0.75 ? Math.max(0, 1 - absorb) : 1;
          return <g transform={`translate(${h.x - 30} ${h.y + 4}) rotate(${-10 + boil("cs", tt, 3)}) scale(${fold} ${0.4 + 0.6 * fold})`} filter="url(#psh)">
            <path d={torn(s.length * 21 + 50, 60, `pl${h.carrying}`)} fill={absorb > 0.3 ? "#f2c94c" : PAPERS[h.carrying % 4]} />
            <text textAnchor="middle" y={11} fontFamily={TYPE} fontSize={33} fill={INK}>{s}</text>
          </g>;
        })()}
        <RobotArm t={t} />
        {absorb > 0 && <Sparkle x={PATH_CUBE.x - 60} y={PATH_CUBE.y - 70} s={Math.sin(absorb * Math.PI)} r={28} />}
        {glow > 0 && Array.from({ length: 7 }, (_, i) => {
          const a = (i / 7) * Math.PI * 2, k = back((tt - T.reality2 - i * 0.05) / 0.3, 2);
          return <path key={i} transform={`translate(${PATH_CUBE.x + Math.cos(a) * 170} ${PATH_CUBE.y + Math.sin(a) * 150}) scale(${Math.max(0, k)}) rotate(${i * 30})`} d="M0,-16L5,-5L16,-5L7,3L10,14L0,7L-10,14L-7,3L-16,-5L-5,-5Z" fill="#ffd75e" stroke="#c9961a" strokeWidth={1.5} filter="url(#psh)" />;
        })}
      </g>
    </svg>
  );
};
