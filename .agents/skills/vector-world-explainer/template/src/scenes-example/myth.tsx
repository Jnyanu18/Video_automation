import React from "react";
import { interpolate, random } from "remotion";
import { clamp, ease, easeIn, easeInOut, f, pop, prog, type SceneProps } from "../lib";
import { MAZE, MazeBoard, Mouse, MZ, cellXY } from "./kit/maze";
import { FlatCoin } from "../kit/coin";
import { C, COND } from "../kit/palette";
import { camAt, shake, type Key } from "../kit/camera";
import { DeskLamp, LampPool, Motes, SteamTop, WhipDefs, lampOn, lampPress } from "../kit/life";
import { Stage } from "./stage";
import { BOARD, bw, DeskTop, Overhang } from "./desk";
import { MYTH, fz } from "./myth-events";
import { WHIP_DOWN } from "./qubit";

// Myth (top-down desk): the coin hangs over the maze, flipping. On "checks every answer" mouse
// clones scurry out of the entrance and run corridor to corridor until every cell holds one; on
// "No." they freeze mid-stride. On "look" a desk lamp reaching in from the corner clicks on: the
// ghosts blink out in its warm light, the coin stops flipping and falls into one random dead end.
// Close on that dead end: red X.
// the dead end the coin lands in: lower middle, far from the exit (top-right), so the miss reads.
export const DEAD = 7 * 7 + 4;

// The desk lamp (shared with interference): world coords, top-down.
export const LAMP = { base: [1135, 420] as [number, number], elbow: [1165, 690] as [number, number], head: [985, 770] as [number, number], aim: [600, 700] as [number, number], pool: [585, 760] as [number, number], r: 720, s: 0.85 };

// Each corridor cell's parent toward the entrance (the corridor a clone runs in from).
export const PARENT = MAZE.dist.map((d, i) => { let p = -1; MAZE.open[i].forEach((v) => { if (MAZE.dist[v] === d - 1) p = v; }); return p; });

// The coin from above, tossed and flipping: k = how open its face is. (x, y) world, r world px.
export const TopCoin: React.FC<{ x: number; y: number; r: number; flipK: number; face: 0 | 1; glow?: number; rot?: number }> = ({ x, y, r, flipK, face, glow = 1, rot = 0 }) => (
  <g>
    <circle cx={x} cy={y} r={r * 2.4} fill="url(#glowGold)" opacity={glow} />
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <FlatCoin x={0} y={0} r={r} k={Math.max(0.08, flipK)} t={r * 0.13} face={face} shadow={false} />
    </g>
  </g>
);

// The rest of the desk top, around the board: a row of bit coins, steam off the mug, motes.
export const DeskExtras: React.FC<{ fr: number; motes?: number; row?: number }> = ({ fr, motes = 0, row = 1 }) => (
  <g>
    {row > 0 && [1, 0, 1, 1, 0].map((b, i) => (
      <g key={i} opacity={row}><FlatCoin x={300 + i * 92} y={1236 + (i % 2) * 6} r={32} k={0.9} t={5} face={b as 0 | 1} rimGlow={0.3} dim={0.25} /></g>
    ))}
    <SteamTop fr={fr} x={1010} y={120} />
    {motes > 0 && <Motes fr={fr} x={200} y={260} w={760} h={1000} n={34} seed="dm" o={motes} />}
  </g>
);

export const Myth: React.FC<SceneProps> = ({ fr }) => {
  const s = f(MYTH.start), t0 = f(MYTH.flood), tNo = f(MYTH.no), tLook = f(MYTH.look), tDrop = f(MYTH.drop), tLand = f(MYTH.land), tX = f(MYTH.x), end = f(MYTH.end);
  const clock = fz(fr);
  const floodT = f(MYTH.floodEnd) - t0;
  const front = interpolate(clock, [t0, f(MYTH.floodEnd)], [0, MAZE.maxDist + 1], { ...clamp, easing: (x) => Math.pow(x, 0.85) });
  const frozen = fr >= tNo;
  const on = lampOn(fr, tLook), press = lampPress(fr, tLook);
  const [dx, dy] = bw(...cellXY(DEAD));
  const xk = pop(fr, tX, 9);
  const freezeTint = frozen ? (1 - prog(fr, tLook, 6)) * prog(fr, tNo, 3) : 0;
  // whip landing: the camera arrives still travelling down (content moving up) and settles
  const whipIn = 1 - prog(fr, s, 9);
  const keys: Key[] = [
    [s, { x: 540, y: 945 - WHIP_DOWN * 0.35, zoom: 1.08 }],
    [f(MYTH.settle), { x: 540, y: 945, zoom: 1.05 }, (t) => 1 - Math.pow(1 - t, 3)],
    [t0 + 34, { x: 470, y: 990, zoom: 1.14 }],
    [tNo, { x: 500, y: 960, zoom: 1.1 }],
    [tLook - 8, { x: 600, y: 975, zoom: 1.0 }],
    [f(MYTH.push), { x: 610, y: 980, zoom: 1.04 }],
    [f(MYTH.push) + 22, { x: dx, y: dy + 10, zoom: 1.85 }],
    [end, { x: dx + 4, y: dy + 4, zoom: 1.98 }],
  ];
  const c0 = camAt(fr, keys);
  const sh = [shake(fr, tNo, 7, 10), shake(fr, tLand, 10, 14), shake(fr, tX, 12, 14)].reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y, rot: a.rot + b.rot }));
  const cam = { x: c0.x + sh.x / c0.zoom, y: c0.y + sh.y / c0.zoom, zoom: c0.zoom, rot: c0.rot + sh.rot };
  // the coin: hangs flipping above the board centre; after the look it stops flipping and falls
  const hover: [number, number] = [540, 640];
  const fallT = prog(fr, tDrop, tLand - tDrop, easeIn);
  const cxw = hover[0] + (dx - hover[0]) * fallT, cyw = hover[1] + (dy - hover[1]) * fallT - Math.sin(fallT * Math.PI) * 40;
  const hgt = 1 - fallT; // height above the board (scale)
  const coinR = 43 * (1 + 1.1 * hgt);
  const spin = fr < tDrop ? fr * 0.38 : tDrop * 0.38 + (fr - tDrop) * 0.38 * (1 - fallT * 0.6);
  const flipK = fr < tDrop ? Math.abs(Math.cos(spin)) * 0.9 : 0.9 - 0.75 * (1 - fallT) * Math.abs(Math.sin(spin));
  const face: 0 | 1 = fr < tDrop ? (Math.cos(spin) >= 0 ? 1 : 0) : 0;
  const settle = fr >= tLand ? 1 + 0.12 * Math.exp(-(fr - tLand) / 3) * Math.cos((fr - tLand) * 1.1) : 1;
  return (
    <>
    <Stage fr={fr} cam={cam} handheld={0.35}>
      <WhipDefs k={whipIn} id="whipM" />
      <g filter={whipIn > 0.02 ? "url(#whipM)" : undefined}>
        <DeskTop fr={fr} glow={[540, 700, "Gold", 0.25 + 0.35 * on]} />
        <DeskExtras fr={fr} motes={on} row={0} />
        <MazeBoard x={BOARD.x} y={BOARD.y} s={BOARD.s} lightDir={on > 0.5 ? [0.6, 0.7] : [-1, -1]}>
          {freezeTint > 0 && <rect x={0} y={0} width={812} height={1044} fill={C.coral} opacity={freezeTint * 0.22} />}
        </MazeBoard>
        <LampPool id="m" c={LAMP.pool} r={LAMP.r} on={on} dark={0.5} />
        {/* the clones: luminous ghost silhouettes, drawn over the darkness */}
        <g transform={`translate(${BOARD.x} ${BOARD.y}) scale(${BOARD.s})`}>
          {MAZE.dist.map((d, i) => {
            // clone i leaves its parent cell when the front reaches it, and runs into its own cell
            // at its own (seeded) speed; once there it keeps creeping up and down its corridor.
            const sv = 0.8 + 0.4 * random(`ms${i}`);
            const tA = t0 + floodT * Math.pow(Math.max(0, d - 1) / (MAZE.maxDist + 1), 1 / 0.85) - (d === 0 ? 6 : 0);
            const runF = 10 / sv;
            const a = Math.min(1, Math.max(0, (clock - tA) / runF));
            if (clock < tA) return null;
            const [x1, y1] = cellXY(i);
            const p = PARENT[i];
            const [x0, y0] = p >= 0 ? cellXY(p) : [x1, y1 + MZ.cell];
            const ux = (x1 - x0) / MZ.cell, uy = (y1 - y0) / MZ.cell;
            const e = easeInOut(a);
            const ph = clock * 0.95 * sv + random(`mp${i}`) * 6.28;
            const tArr = clock - tA - runF;
            // once in its cell, each clone keeps scurrying back and forth along its own corridor
            // (cell centre <-> parent cell), ~7 board px per frame, until everything freezes on "No."
            const L = MZ.cell * 0.78, u = tArr > 0 ? (tArr * 7 * sv + random(`mu${i}`) * 2 * L) % (2 * L) : 0;
            const back = tArr > 0 && u < L;
            const run2 = tArr > 0 ? (back ? u : 2 * L - u) : 0;
            const along = (e - 1) * MZ.cell - run2 * (tArr > 0 ? Math.min(1, tArr / 6) : 0);
            const edge = Math.min(u % L, L - (u % L)) / 10; // slows at each turn
            const running = a < 1 ? 1 : Math.min(1, 0.35 + edge);
            const lat = 3.5 * running * Math.sin(ph * 0.5);
            const x = x1 + ux * along - uy * lat, y = y1 + uy * along + ux * lat;
            const ang = (Math.atan2(uy, ux) * 180) / Math.PI + 90 + (back ? 180 : 0);
            // vanish in the lamp's light, nearest the pool first
            const [wx, wy] = bw(x1, y1);
            const tv = tLook + 1 + Math.hypot(wx - LAMP.pool[0], wy - LAMP.pool[1]) / 90;
            const v = prog(fr, tv, 5);
            if (v >= 1) return null;
            const look = a < 1 ? 0 : Math.sin(clock * 0.15 * sv + i * 1.3) * 8;
            return (
              <g key={i} opacity={1 - v}>
                <Mouse x={x} y={y} a={ang} s={1.0 * (1 + 0.35 * v) * Math.min(1, 0.5 + a)} ghost={1} fr={clock} run={running} phase={ph} look={look} glow={0.8 - 0.5 * freezeTint} />
              </g>
            );
          })}
          {/* the frozen clones blush coral on "No." */}
          {freezeTint > 0 && <rect x={0} y={0} width={812} height={1044} fill="url(#glowCoral)" opacity={freezeTint * 0.35} />}
        </g>
        {/* contact shadow of the coin on the board, nearer and sharper as it falls */}
        <ellipse cx={cxw + 30 * hgt} cy={cyw + 42 * hgt + 6} rx={coinR * (0.8 - 0.25 * hgt)} ry={coinR * (0.7 - 0.25 * hgt)} fill="#0C0526" opacity={0.25 + 0.35 * fallT} filter="url(#soft8)" />
        {fr >= tLand && <circle cx={dx} cy={dy} r={220} fill="url(#glowGold)" opacity={0.75 * (1 - 0.3 * prog(fr, tLand, 20))} />}
        <g transform={`translate(${cxw} ${cyw}) scale(${settle}) translate(${-cxw} ${-cyw})`}>
          <TopCoin x={cxw} y={cyw} r={coinR} flipK={flipK} face={face} rot={-12} glow={0.8 + 0.2 * hgt} />
        </g>
        {/* red X on "random answer" */}
        {fr >= tX && (
          <g transform={`translate(${dx} ${dy}) scale(${xk * 0.9}) rotate(-6)`} stroke={C.coral} strokeWidth={15} strokeLinecap="round" opacity={0.95}>
            <circle r={110} fill="url(#glowCoral)" stroke="none" opacity={0.7} />
            <path d="M-58,-58 L58,58" />
            <path d="M58,-58 L-58,58" />
          </g>
        )}
        <ExitLabel fr={fr} at={f(MYTH.settle) + 6} />
        <DeskLamp base={LAMP.base} elbow={LAMP.elbow} head={LAMP.head} aim={LAMP.aim} on={on} press={press} fr={fr} s={LAMP.s} />
        <Overhang fr={fr} />
      </g>
    </Stage>
    <NoStamp fr={fr} />
    </>
  );
};

// "EXIT = ANSWER": a small tag on the board pointing at the exit (top right), so the silent viewer
// knows what the maze stands for. World coords; it pops on as the maze lands and stays on the board.
const EXIT_XY = bw(...cellXY(MAZE.exit));
export const ExitLabel: React.FC<{ fr: number; at: number; o?: number }> = ({ fr, at, o = 1 }) => {
  const k = pop(fr, at, 12);
  if (fr < at) return null;
  const x = EXIT_XY[0] - 70, y = EXIT_XY[1] + 40;
  return (
    <g transform={`translate(${x} ${y}) scale(${Math.min(1.05, k)})`} opacity={o * Math.min(1, k * 1.4)}>
      <rect x={-262} y={-30} width={248} height={56} rx={28} fill="#140A34" opacity={0.82} />
      <text x={-138} y={9} textAnchor="middle" fontFamily={COND} fontWeight={800} fontSize={34} letterSpacing={1.5} fill={C.gold}>EXIT = ANSWER</text>
      <path d="M-6,-2 C14,-6 26,-22 32,-44" fill="none" stroke={C.gold} strokeWidth={6} strokeLinecap="round" />
      <path d="M20,-40 L33,-50 L40,-34" fill="none" stroke={C.gold} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

// "NO." stamped big and centred on the word, held ~0.8 s, then lifted away (screen space).
const NoStamp: React.FC<{ fr: number }> = ({ fr }) => {
  const t0 = f(MYTH.no) - 1, t1 = f(MYTH.noOut);
  if (fr < t0 || fr > t1 + 8) return null;
  const hit = Math.min(1, (fr - t0 + 1) / 4);
  const sc = 1.7 - 0.7 * easeIn(hit) + (hit >= 1 ? 0.05 * Math.exp(-(fr - t0 - 4) / 3) * Math.cos((fr - t0 - 4) * 1.2) : 0);
  const out = prog(fr, t1, 8, easeIn);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <g transform={`translate(540 ${880 - out * 520}) scale(${sc * (1 - 0.25 * out)}) rotate(-6)`} opacity={(hit < 1 ? 0.8 + 0.2 * hit : 1) * (1 - out)}>
        <circle r={300} fill="url(#glowCoral)" opacity={0.55} />
        <text x={8} y={110} textAnchor="middle" fontFamily={COND} fontWeight={800} fontSize={330} fill="#3A0E1A" opacity={0.6}>NO.</text>
        <text x={0} y={100} textAnchor="middle" fontFamily={COND} fontWeight={800} fontSize={330} fill="#FF7A66" stroke="#FFE0D8" strokeWidth={6} paintOrder="stroke">NO.</text>
      </g>
    </svg>
  );
};
