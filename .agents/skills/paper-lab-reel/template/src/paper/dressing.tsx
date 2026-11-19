// Desk dressing: real objects lying around the board edges (pencil, paper clip, eraser, sticky note,
// coffee ring, loose scraps) so no shot is mostly flat paper. Static per scene seed, drawn under the action.
import React from "react";
import { HAND, INK, PAPERS, RED, TYPE, rnd, torn } from "./kit";

type Spot = { x: number; y: number; rot: number; kind: number };
export const Pencil: React.FC<{ x: number; y: number; rot: number; len?: number }> = ({ x, y, rot, len = 300 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`} filter="url(#psh)">
    <rect x={0} y={-9} width={len} height={18} fill="#f2b632" />
    <rect x={0} y={-9} width={len} height={6} fill="#f8cf5e" />
    <rect x={len} y={-9} width={26} height={18} fill="#c8c8c8" />
    <rect x={len + 26} y={-9} width={22} height={18} rx={4} fill="#e88b8b" />
    <path d="M0,-9 L-34,0 L0,9 Z" fill="#e8c9a0" />
    <path d="M-24,-3 L-34,0 L-24,3 Z" fill="#333" />
  </g>
);
const Clip: React.FC<{ x: number; y: number; rot: number }> = ({ x, y, rot }) => (
  <path transform={`translate(${x} ${y}) rotate(${rot})`} d="M0,0 L0,70 A12,12 0 0 0 24,70 L24,10 A8,8 0 0 0 8,10 L8,60" fill="none" stroke="#8d939c" strokeWidth={4} strokeLinecap="round" />
);
const Ring: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g opacity={0.35}><circle cx={x} cy={y} r={72} fill="none" stroke="#9a6b3a" strokeWidth={7} /><circle cx={x + 4} cy={y + 3} r={66} fill="none" stroke="#b08050" strokeWidth={2} /></g>
);
const Sticky: React.FC<{ x: number; y: number; rot: number; text: string }> = ({ x, y, rot, text }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`} filter="url(#psh)">
    <rect x={-80} y={-80} width={160} height={160} fill="#fff1a8" />
    <rect x={-80} y={-80} width={160} height={26} fill="#f8e58a" />
    <text textAnchor="middle" y={14} fontFamily={HAND} fontSize={38} fill={INK}>{text}</text>
  </g>
);
const LooseScrap: React.FC<{ x: number; y: number; rot: number; i: number }> = ({ x, y, rot, i }) => {
  const s = ["notes", "ideas", "p. iv", "read later", "todo", "draft"][i % 6];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} filter="url(#psh)">
      <path d={torn(220, 120, `ds${i}`, "tlrb", 5)} fill={PAPERS[i % 4]} />
      {[0, 1, 2].map((j) => <rect key={j} x={-90} y={-30 + j * 22} width={150 - j * 30} height={5} fill="#a39c8c" opacity={0.6} />)}
      <text x={-90} y={-38} fontFamily={TYPE} fontSize={20} fill={INK}>{s}</text>
    </g>
  );
};

// spots: edge positions (partly off-frame) chosen per scene; `kinds`: 0 pencil 1 clip 2 ring 3 sticky 4 scrap
export const Dressing: React.FC<{ spots: Spot[]; sticky?: string }> = ({ spots, sticky = "think!" }) => (
  <g>
    {spots.map((s, i) =>
      s.kind === 0 ? <Pencil key={i} x={s.x} y={s.y} rot={s.rot} />
      : s.kind === 1 ? <Clip key={i} x={s.x} y={s.y} rot={s.rot} />
      : s.kind === 2 ? <Ring key={i} x={s.x} y={s.y} />
      : s.kind === 3 ? <Sticky key={i} x={s.x} y={s.y} rot={s.rot} text={sticky} />
      : <LooseScrap key={i} x={s.x} y={s.y} rot={s.rot} i={i + Math.floor(rnd(`dr${s.x}`) * 6)} />
    )}
  </g>
);
export { RED };
