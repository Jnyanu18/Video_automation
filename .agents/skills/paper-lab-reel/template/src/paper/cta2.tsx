// cta2: a board of science imagery; the follow sticker slaps on "following me"; more clippings on
// "beauty of science"; a paper-doll chain unfolds on "more and more people"; four STEM icons pin up on "STEM".
import React from "react";
import { smooth } from "../lib";
import { Dressing } from "./dressing";
import { BgImage, Defs, HAND, IMG, INK, PAPERS, Pin, RED, SERIF, Tape, back, boil, rnd, torn, twos } from "./kit";
import { B, T } from "./T";

const Atom: React.FC = () => (
  <g>
    <rect x={-130} y={-120} width={260} height={240} fill="#fffdf6" />
    {[0, 60, 120].map((r) => <ellipse key={r} rx={100} ry={36} transform={`rotate(${r})`} fill="none" stroke={"#2f5fb3"} strokeWidth={4} />)}
    <circle r={18} fill={RED} /><circle cx={-6} cy={-6} r={5} fill="#fff" opacity={0.6} />
    {[0, 60, 120].map((r, i) => <circle key={i} cx={100 * Math.cos(r)} cy={36 * Math.sin(r)} r={7} fill={INK} transform={`rotate(${r})`} />)}
  </g>
);
const GalaxyPhoto: React.FC = () => (
  <g>
    <rect x={-150} y={-115} width={300} height={230} fill="#fbf8f1" />
    <rect x={-138} y={-103} width={276} height={180} fill="#0f1433" />
    {Array.from({ length: 40 }, (_, i) => { const a = i * 0.45, r = 6 + i * 2.2; return <circle key={i} cx={Math.cos(a) * r} cy={-13 + Math.sin(a) * r * 0.55} r={2.2 + (40 - i) * 0.05} fill={i % 3 ? "#cfd8ff" : "#ffd9a0"} opacity={0.9 - i * 0.012} />; })}
    {Array.from({ length: 30 }, (_, i) => <circle key={`s${i}`} cx={-130 + rnd(`gs${i}`) * 260} cy={-95 + rnd(`gy${i}`) * 165} r={1.2} fill="#fff" opacity={0.7} />)}
    <text x={0} y={102} textAnchor="middle" fontFamily={HAND} fontSize={30} fill={INK}>spiral galaxy</text>
  </g>
);
const Leaf: React.FC = () => (
  <g>
    <path d={torn(250, 220, "leafp", "tlrb", 4)} fill="#f3e7c9" />
    <path d="M-80,70 C-60,-40 40,-90 90,-70 C80,-10 20,70 -80,70 Z" fill="#6aa35a" stroke="#3c6b33" strokeWidth={3} />
    <path d="M-80,70 C-20,10 30,-30 90,-70" fill="none" stroke="#3c6b33" strokeWidth={3} />
    {[0.25, 0.45, 0.65].map((q) => <path key={q} d={`M${-80 + 170 * q},${70 - 140 * q} l${-10},${-34}`} stroke="#3c6b33" strokeWidth={2} />)}
  </g>
);
const Telescope: React.FC = () => (
  <g>
    <path d={torn(240, 200, "telp", "tlrb", 4)} fill="#dfeefb" />
    <g transform="rotate(-25)">
      <rect x={-90} y={-20} width={150} height={40} rx={6} fill="none" stroke={INK} strokeWidth={4} />
      <rect x={60} y={-26} width={30} height={52} rx={4} fill="none" stroke={INK} strokeWidth={4} />
      <rect x={-112} y={-12} width={24} height={24} fill="none" stroke={INK} strokeWidth={4} />
    </g>
    <path d="M-10,10 L-50,80 M-10,10 L30,80 M-10,10 L-10,85" stroke={INK} strokeWidth={4} />
  </g>
);

// STEM icons: flask, chip, gear, pi (cut-paper discs)
const Icon: React.FC<{ k: number }> = ({ k }) => {
  const fill = ["#fde2e4", "#dfeefb", "#f7d774", "#e3f1dc"][k];
  return (
    <g>
      <circle r={78} fill={fill} stroke="#fff" strokeWidth={8} />
      {k === 0 && <g><path d="M-18,-48 L-18,-12 L-46,40 Q-50,52 -36,52 L36,52 Q50,52 46,40 L18,-12 L18,-48 Z" fill="#fffaf0" stroke={INK} strokeWidth={5} strokeLinejoin="round" /><path d="M-36,30 L36,30 L46,44 Q48,52 36,52 L-36,52 Q-48,52 -46,44 Z" fill="#3fb37f" /><line x1={-26} y1={-48} x2={26} y2={-48} stroke={INK} strokeWidth={6} strokeLinecap="round" /><circle cx={-8} cy={14} r={5} fill="#3fb37f" /></g>}
      {k === 1 && <g><rect x={-34} y={-34} width={68} height={68} rx={6} fill={INK} /><rect x={-18} y={-18} width={36} height={36} fill="#5b6a80" />{[-22, -8, 6, 20].map((p) => <g key={p}><line x1={p} y1={-34} x2={p} y2={-50} stroke={INK} strokeWidth={5} /><line x1={p} y1={34} x2={p} y2={50} stroke={INK} strokeWidth={5} /><line x1={-34} y1={p} x2={-50} y2={p} stroke={INK} strokeWidth={5} /><line x1={34} y1={p} x2={50} y2={p} stroke={INK} strokeWidth={5} /></g>)}</g>}
      {k === 2 && <g>{Array.from({ length: 8 }, (_, i) => <rect key={i} x={-9} y={-52} width={18} height={22} fill={INK} transform={`rotate(${i * 45})`} />)}<circle r={38} fill={INK} /><circle r={14} fill={fill} /></g>}
      {k === 3 && <text y={36} textAnchor="middle" fontFamily={SERIF} fontSize={110} fill={INK}>π</text>}
    </g>
  );
};

const Doll: React.FC<{ fill: string }> = ({ fill }) => (
  <path d="M0,-80 a20,20 0 1 1 0.1,0 Z M-14,-42 L14,-42 L44,-22 L40,-12 L16,-24 L16,10 L28,60 L14,62 L0,22 L-14,62 L-28,60 L-16,10 L-16,-24 L-40,-12 L-44,-22 Z" fill={fill} stroke="#c9b48c" strokeWidth={1.5} />
);

export const Cta2Scene: React.FC<{ t: number; fr: number }> = ({ t }) => {
  const tt = twos(t);
  const sticker = back((tt - (T.follow - 0.1)) / 0.32, 2.2);
  const clip = (at: number) => back((tt - at) / 0.4, 1.6);
  const beauty = T.beauty - 0.2;
  const dolls = smooth((tt - (T.people - 0.1)) / 0.9);
  const camS = 1 + 0.04 * smooth((t - beauty) / 3), camX = Math.sin(t * 0.2) * 6;
  const pieces = [
    { C: Atom, x: 250, y: 580, rot: -5, at: B.cta2.s - 0.3 },
    { C: GalaxyPhoto, x: 810, y: 560, rot: 4, at: B.cta2.s - 0.3 },
    { C: Leaf, x: 560, y: 820, rot: 8, at: beauty },
    { C: Telescope, x: 860, y: 880, rot: -6, at: beauty + 0.3 },
  ];
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <Defs />
      <BgImage src={IMG.board} t={t} dx={10} />
      <Dressing spots={[{ x: 640, y: 1650, rot: -14, kind: 0 }, { x: 60, y: 900, rot: 86, kind: 4 }, { x: 1000, y: 1250, rot: 0, kind: 2 }]} />
      <g transform={`translate(${540 + camX} 800) scale(${camS}) translate(-540 -800)`}>
        {pieces.map((p, i) => {
          const k = clip(p.at);
          if (k <= 0.01) return null;
          return <g key={i} transform={`translate(${p.x + (1 - Math.min(1, k)) * (p.x < 540 ? -700 : 700)} ${p.y}) rotate(${p.rot + boil(`cp${i}`, tt, 0.4)})`} filter="url(#psh)"><p.C /><Tape x={0} y={-118} rot={-4 + i * 3} seed={`ct${i}`} /></g>;
        })}
        {/* paper-doll chain unfolding (more and more people) */}
        {dolls > 0 && Array.from({ length: 6 }, (_, i) => {
          const k = Math.max(0, Math.min(1, dolls * 6 - i));
          if (k <= 0) return null;
          return <g key={i} transform={`translate(${470 + i * 96} 1090) scale(${(i % 2 ? -1 : 1) * Math.max(0.05, k)} 1)`} filter="url(#psh)"><Doll fill={PAPERS[i % 4]} /></g>;
        })}
        {/* STEM icons pin up */}
        {[0, 1, 2, 3].map((k) => {
          const s = back((tt - (T.stem - 0.15) - k * 0.08) / 0.3, 2);
          if (s <= 0.01) return null;
          const x = 190 + k * 230, y = 720;
          return <g key={k}><g transform={`translate(${x} ${y - (1 - Math.min(1, s)) * 120}) scale(${Math.max(0.01, 0.7 + 0.3 * s)}) rotate(${(k - 1.5) * 4})`} filter="url(#psh2)"><Icon k={k} /></g><Pin x={x} y={y - 70} color={k % 2 ? RED : "#2f5fb3"} /></g>;
        })}
        {/* follow sticker */}
        {sticker > 0.01 && <g transform={`translate(540 360) rotate(${-4 + (1 - Math.min(1, sticker)) * -12}) scale(${Math.max(0.01, sticker)})`} filter="url(#psh2)">
          <rect x={-400} y={-62} width={800} height={124} rx={62} fill="#fff" />
          <rect x={-388} y={-50} width={776} height={100} rx={50} fill={RED} />
          <text y={17} textAnchor="middle" fontFamily={SERIF} fontSize={48} fill="#fffaf0">Follow @madhav_somani</text>
        </g>}
      </g>
    </svg>
  );
};
