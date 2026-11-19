import React from "react";
import { random } from "remotion";
import { C } from "../kit/palette";
import { Leaf } from "../kit/palette";
import { MAZE, MAZE_H, MAZE_W, MZ, cellXY } from "./kit/maze";

// The desk seen from straight above, for the maze shots: planks, a pencil, a mug and the plant's
// leaves overhanging (foreground). The maze board sits at BOARD (top-left of its corridors).
export const BOARD = { s: 0.86, x: (1080 - MAZE_W * 0.86) / 2, y: 236 };
export const bw = (x: number, y: number): [number, number] => [BOARD.x + x * BOARD.s, BOARD.y + y * BOARD.s];

export const DeskTop: React.FC<{ fr: number; glow?: [number, number, string, number] }> = ({ fr, glow }) => (
  <g>
    <rect x={-300} y={-300} width={1680} height={2520} fill="#4B2F86" />
    {Array.from({ length: 16 }, (_, i) => (
      <g key={i}>
        <rect x={-300} y={-300 + i * 160} width={1680} height={156} fill={i % 2 ? "#4E3190" : "#47297F"} />
        <path d={`M-300,${-300 + i * 160 + 70} q500,${(random(`pk${i}`) - 0.5) * 40} 1680,0`} stroke="#3B2373" strokeWidth={3} fill="none" opacity={0.5} />
      </g>
    ))}
    {glow && <circle cx={glow[0]} cy={glow[1]} r={700} fill={`url(#glow${glow[2]})`} opacity={glow[3]} />}
    {/* note paper with bit doodles, bottom-left, under the board's corner */}
    <g transform="translate(-40 1290) rotate(-8)">
      <rect width={320} height={230} fill="#E9E3F7" />
      <path d="M30,60 h200 M30,110 h240 M30,160 h150" stroke="#9E92D6" strokeWidth={8} strokeLinecap="round" />
    </g>
    {/* pencil */}
    <g transform="translate(760 1360) rotate(-24)">
      <rect x={0} y={0} width={230} height={22} rx={4} fill={C.rose} />
      <rect x={0} y={0} width={230} height={8} rx={3} fill="#FF9AB5" />
      <path d="M230,0 L268,11 L230,22Z" fill="#F6D7B0" />
      <rect x={-20} y={0} width={22} height={22} rx={4} fill="#E3E0F5" />
    </g>
    {/* mug from above, top-right corner */}
    <g transform="translate(1010 120)">
      <circle r={130} fill="#120830" opacity={0.4} transform="translate(14 18)" filter="url(#soft8)" />
      <circle r={128} fill="#23766F" />
      <circle r={104} fill="#123F3B" />
      <circle r={96} fill="#5A3420" />
      <ellipse cx={-30} cy={-30} rx={40} ry={18} fill="#8A5A3A" opacity={0.5} />
      <rect x={-170} y={-20} width={50} height={40} rx={18} fill="#23766F" />
    </g>
  </g>
);

export const Overhang: React.FC<{ fr: number }> = ({ fr }) => (
  <g filter="url(#soft14)" opacity={0.92}>
    <Leaf x={-60} y={-40} a={140 + Math.sin(fr * 0.03) * 3} s={2.8} c="#155E5A" />
    <Leaf x={-80} y={120} a={110 + Math.sin(fr * 0.03 + 1) * 3} s={2.2} c="#1D7F78" />
  </g>
);

// Each corridor cell's flow direction (from its BFS parent toward it), for wave crests.
export const FLOW = MAZE.dist.map((d, i) => {
  let p = -1;
  MAZE.open[i].forEach((v) => { if (MAZE.dist[v] === d - 1) p = v; });
  if (p < 0) return [0, -1] as [number, number];
  const [x0, y0] = cellXY(p), [x1, y1] = cellXY(i);
  return [(x1 - x0) / MZ.cell, (y1 - y0) / MZ.cell] as [number, number];
});
export const MAX_OFF = Math.max(...MAZE.off);
export { MAZE_H };
