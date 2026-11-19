import React from "react";
import { random } from "remotion";
import { C } from "../../kit/palette";

// A wooden labyrinth puzzle board seen top-down. One maze, generated once from a fixed seed, so
// every shot (myth, interference, ending) shows the same corridors.
export const MZ = { cols: 7, rows: 9, cell: 116 };
export type Cell = [number, number];
const key = (c: number, r: number) => r * MZ.cols + c;

const build = () => {
  const { cols, rows } = MZ;
  // open[i] = set of neighbour indices with no wall between
  const open: Set<number>[] = Array.from({ length: cols * rows }, () => new Set());
  const seen = new Set<number>();
  const stack: Cell[] = [[0, rows - 1]];
  seen.add(key(0, rows - 1));
  let n = 0;
  while (stack.length) {
    const [c, r] = stack[stack.length - 1];
    const nb = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as Cell[])
      .map(([dc, dr]) => [c + dc, r + dr] as Cell)
      .filter(([a, b]) => a >= 0 && b >= 0 && a < cols && b < rows && !seen.has(key(a, b)));
    if (!nb.length) { stack.pop(); continue; }
    const [a, b] = nb[Math.floor(random(`maze7_${n++}`) * nb.length)];
    open[key(c, r)].add(key(a, b));
    open[key(a, b)].add(key(c, r));
    seen.add(key(a, b));
    stack.push([a, b]);
  }
  const start = key(0, rows - 1), exit = key(cols - 1, 0);
  const dist = new Array(cols * rows).fill(-1), prev = new Array(cols * rows).fill(-1);
  const q = [start]; dist[start] = 0;
  while (q.length) {
    const u = q.shift()!;
    open[u].forEach((v) => { if (dist[v] < 0) { dist[v] = dist[u] + 1; prev[v] = u; q.push(v); } });
  }
  const path: number[] = [];
  for (let u = exit; u >= 0; u = prev[u]) path.unshift(u);
  const onPath = new Set(path);
  const deadEnds = open.map((s, i) => i).filter((i) => open[i].size === 1 && i !== start && i !== exit);
  // distance from each cell to the solution path (how deep into a wrong branch it is)
  const off = new Array(cols * rows).fill(0);
  const pq = [...path]; const od = new Array(cols * rows).fill(-1); path.forEach((p) => (od[p] = 0));
  while (pq.length) { const u = pq.shift()!; open[u].forEach((v) => { if (od[v] < 0) { od[v] = od[u] + 1; pq.push(v); } }); }
  for (let i = 0; i < off.length; i++) off[i] = od[i];
  return { open, start, exit, dist, path, onPath, deadEnds, off, maxDist: Math.max(...dist) };
};
export const MAZE = build();
export const cellXY = (i: number): [number, number] => [(i % MZ.cols) * MZ.cell + MZ.cell / 2, Math.floor(i / MZ.cols) * MZ.cell + MZ.cell / 2];
export const MAZE_W = MZ.cols * MZ.cell, MAZE_H = MZ.rows * MZ.cell;

// Wall segments: for each cell, its right and bottom wall if closed, plus the outer border with
// gaps at the entrance (bottom-left, opening downward) and exit (top-right, opening upward).
const walls = () => {
  const { cols, rows, cell } = MZ, segs: [number, number, number, number][] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = key(c, r);
      if (c < cols - 1 && !MAZE.open[i].has(key(c + 1, r))) segs.push([(c + 1) * cell, r * cell, (c + 1) * cell, (r + 1) * cell]);
      if (r < rows - 1 && !MAZE.open[i].has(key(c, r + 1))) segs.push([c * cell, (r + 1) * cell, (c + 1) * cell, (r + 1) * cell]);
    }
  segs.push([0, 0, (cols - 1) * cell, 0]);
  segs.push([cell, rows * cell, cols * cell, rows * cell]);
  segs.push([0, 0, 0, rows * cell]);
  segs.push([cols * cell, 0, cols * cell, rows * cell]);
  return segs;
};
const WALLS = walls();

// The board: wood base, corridor floor, raised walls with a light edge and a cast shadow.
// `floor(i)` may return a fill overlay per cell (waves, darkness) drawn on the corridor floor.
export const MazeBoard: React.FC<{ x: number; y: number; s?: number; floor?: (i: number) => React.ReactNode; children?: React.ReactNode; lightDir?: [number, number] }> = ({ x, y, s = 1, floor, children, lightDir = [-1, -1] }) => {
  const pad = 46;
  const sh: [number, number] = [-lightDir[0] * 9, -lightDir[1] * 9];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-pad + 18} y={-pad + 26} width={MAZE_W + 2 * pad} height={MAZE_H + 2 * pad} rx={34} fill="#0E0628" opacity={0.6} filter="url(#soft14)" />
      <rect x={-pad} y={-pad} width={MAZE_W + 2 * pad} height={MAZE_H + 2 * pad} rx={34} fill="#5A3A9E" />
      <rect x={-pad + 8} y={-pad + 8} width={MAZE_W + 2 * pad - 16} height={MAZE_H + 2 * pad - 16} rx={28} fill="#4A2F88" />
      {/* wood grain on the frame */}
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M${-pad + 14},${-pad + 30 + i * 105} q${MAZE_W / 2},${(random(`g${i}`) - 0.5) * 30} ${MAZE_W + 2 * pad - 28},0`} fill="none" stroke="#3E2676" strokeWidth={3} opacity={0.5} />
      ))}
      <rect x={-6} y={-6} width={MAZE_W + 12} height={MAZE_H + 12} rx={10} fill="#2A1A5C" />
      <rect x={0} y={0} width={MAZE_W} height={MAZE_H} fill="#33206C" />
      {floor && Array.from({ length: MZ.cols * MZ.rows }, (_, i) => <g key={i}>{floor(i)}</g>)}
      {children}
      {/* wall shadows, walls, top highlights */}
      <g stroke="#120830" strokeWidth={22} strokeLinecap="round" opacity={0.45} transform={`translate(${sh[0]} ${sh[1]})`} filter="url(#soft4)">
        {WALLS.map(([a, b, c, d], i) => <line key={i} x1={a} y1={b} x2={c} y2={d} />)}
      </g>
      <g stroke="#8A6AD6" strokeWidth={20} strokeLinecap="round">
        {WALLS.map(([a, b, c, d], i) => <line key={i} x1={a} y1={b} x2={c} y2={d} />)}
      </g>
      <g stroke="#B9A2F2" strokeWidth={6} strokeLinecap="round" opacity={0.85} transform="translate(-3 -3)">
        {WALLS.map(([a, b, c, d], i) => <line key={i} x1={a} y1={b} x2={c} y2={d} />)}
      </g>
    </g>
  );
};

// A small original mouse, top-down, nose pointing along angle a (degrees, 0 = up).
// Optional rig: run 0..1 blends in the scurry cycle (pattering feet, body bob, quick tail) at
// cycle phase `phase` (radians, advance ~0.9/frame while running); look = head yaw in degrees
// (sniffing); glow 0..1 adds a soft luminous halo (ghost clones in the dark).
export const Mouse: React.FC<{ x: number; y: number; a?: number; s?: number; ghost?: number; fr?: number; run?: number; phase?: number; look?: number; glow?: number }> = ({ x, y, a = 0, s = 1, ghost = 0, fr = 0, run = 0, phase, look = 0, glow = 0 }) => {
  const ph = phase ?? fr * 0.9 + x * 0.1;
  const wag = Math.sin(fr * 0.4 + x) * 8 * (1 - run) + Math.sin(ph * 1.0) * 16 * run;
  const bob = 1 + 0.08 * Math.min(1, run * 1.4) * Math.sin(ph * 2);
  const lean = 3 * run * Math.sin(ph);
  const body = ghost ? "#CFC4F5" : "#E7DDF7";
  const foot = (fx: number, fy: number, k: number) => {
    const st = run * 7 * Math.sin(ph + k * Math.PI);
    return <ellipse key={`${fx}${fy}`} cx={fx} cy={fy + st} rx={5} ry={7} fill={ghost ? "#B9ACEE" : "#F2A6C0"} />;
  };
  return (
    <g transform={`translate(${x} ${y}) rotate(${a + lean}) scale(${s})`} opacity={ghost ? 0.55 * ghost + 0.1 : 1}>
      {glow > 0 && <circle r={58} fill="url(#glowTeal)" opacity={glow * 0.5} />}
      {!ghost && <ellipse cx={4} cy={8} rx={22} ry={30} fill="#120830" opacity={0.4} filter="url(#soft4)" />}
      {(run > 0 || !ghost) && [foot(-16, -12, 0), foot(16, -12, 1), foot(-17, 16, 1), foot(17, 16, 0)]}
      <path d={`M0,26 C4,40 ${-8 + wag},52 ${2 + wag * 1.3},70`} fill="none" stroke={ghost ? body : "#F2A6C0"} strokeWidth={3.5} strokeLinecap="round" />
      <g transform={`scale(${2 - bob} ${bob})`}>
        <path d="M0,-6 C16,-2 20,6 18,14 C16,28 -16,28 -18,14 C-20,6 -16,-2 0,-6Z" fill={body} stroke={ghost ? C.lilac : "none"} />
      </g>
      <g transform={`rotate(${look} 0 -4)`}>
        <path d="M0,-34 C14,-26 18,-10 16,-2 C8,4 -8,4 -16,-2 C-18,-10 -14,-26 0,-34Z" fill={body} stroke={ghost ? C.lilac : "none"} />
        <circle cx={-13} cy={-14} r={10} fill={body} />
        <circle cx={13} cy={-14} r={10} fill={body} />
        <circle cx={-13} cy={-14} r={6} fill={C.rose} opacity={0.75} />
        <circle cx={13} cy={-14} r={6} fill={C.rose} opacity={0.75} />
        <circle cx={-5} cy={-24} r={2.4} fill="#2A1A5C" />
        <circle cx={5} cy={-24} r={2.4} fill="#2A1A5C" />
        <circle cx={0} cy={-34 - (1 - run) * Math.max(0, Math.sin(fr * 0.9 + x)) * 1.5} r={3} fill={C.rose} />
        <g stroke={ghost ? C.lilac : "#F6EEFF"} strokeWidth={1.2} opacity={0.7}>
          <line x1={-3} y1={-31} x2={-18} y2={-36} /><line x1={-3} y1={-30} x2={-18} y2={-28} />
          <line x1={3} y1={-31} x2={18} y2={-36} /><line x1={3} y1={-30} x2={18} y2={-28} />
        </g>
      </g>
    </g>
  );
};

// A path through cell centres as an SVG polyline string.
export const pathD = (cells: number[]) => cells.map((i, j) => { const [x, y] = cellXY(i); return `${j ? "L" : "M"}${x},${y}`; }).join(" ");

// Route from the entrance to any cell (via BFS parents rebuilt on demand).
export const routeTo = (target: number) => {
  const { open, start } = MAZE, prev = new Map<number, number>(), q = [start];
  prev.set(start, -1);
  while (q.length) { const u = q.shift()!; if (u === target) break; open[u].forEach((v) => { if (!prev.has(v)) { prev.set(v, u); q.push(v); } }); }
  const out: number[] = []; for (let u = target; u >= 0; u = prev.get(u)!) out.unshift(u);
  return out;
};
