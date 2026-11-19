import React from "react";
import { clamp, ease, easeIn, easeInOut, f, pop, prog, type SceneProps } from "../lib";
import { interpolate } from "remotion";
import { MAZE, MazeBoard, MZ, cellXY } from "./kit/maze";
import { C } from "../kit/palette";
import { Sparkles } from "../kit/room";
import { camAt, shake, type Key } from "../kit/camera";
import { DeskLamp, LampPool, WhipDefs, lampOn, lampPress } from "../kit/life";
import { Stage } from "./stage";
import { BOARD, bw, DeskTop, MAX_OFF, Overhang } from "./desk";
import { DEAD, DeskExtras, ExitLabel, LAMP, PARENT, TopCoin } from "./myth";
import { INTF } from "./interference-events";

// Interference (same desk top, continuous from myth): the X peels off and the coin slides back
// through the corridors to the entrance; the lamp clicks off. In the dark every answer is a teal
// wave flooding the maze; in the wrong branches crests meet troughs and the corridors go dark;
// along the right path they stack tall and gold and the exit blazes. The lamp clicks on again on
// "look": the coin lifts, flips across and lands on the exit. Whip-tilt up into scale.
export const WHIP_UP = 520; // world px the camera rises in the whip (scale continues it)

export const waveAmp = (fr: number, i: number) => {
  const cancel = prog(fr, f(INTF.cancel), 40);
  const stack = prog(fr, f(INTF.stack) - 6, 30);
  if (MAZE.onPath.has(i)) return 1 + stack * 1.6 * (MAZE.dist[i] / MAZE.dist[MAZE.exit]);
  const off = MAZE.off[i] / MAX_OFF;
  return Math.max(0, 1 - cancel * (0.55 + 0.9 * off));
};

// The wave travels along every corridor (the maze's tree of paths from the entrance): one sine
// segment per corridor step, its height the local amplitude, so wrong branches visibly flatten.
// `mirror` also draws the opposing wave (crest against trough) while a wrong branch cancels.
// part: "all" (default) | "floor" (only the dark cell fill) | "wave" (only the strokes).
export const WaveFloor: React.FC<{ fr: number; i: number; front: number; speed?: number; mirror?: boolean; part?: "all" | "floor" | "wave" }> = ({ fr, i, front, speed = 0.05, mirror = false, part = "all" }) => {
  const p = PARENT[i];
  const d = MAZE.dist[i];
  if (d - 1 > front) return null;
  const [x1, y1] = cellXY(i);
  const [x0, y0] = p >= 0 ? cellXY(p) : [x1, y1 + MZ.cell / 2];
  const A0 = p >= 0 ? waveAmp(fr, p) : 1, A1 = waveAmp(fr, i);
  const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  const tmax = Math.min(1, front - (d - 1));
  const gold = MAZE.onPath.has(i) ? prog(fr, f(INTF.stack) - 6, 30) * (MAZE.dist[i] / MAZE.dist[MAZE.exit]) : 0;
  const N = 14, amp = 15;
  const build = (sign: number) => {
    let path = "";
    for (let k = 0; k <= N; k++) {
      const t = (k / N) * tmax;
      const a = (A0 + (A1 - A0) * t) * amp;
      const ph = 2 * Math.PI * ((d - 1 + t) * 1.5 - fr * speed);
      const off = sign * a * Math.sin(ph);
      path += `${k ? "L" : "M"}${(x0 + ux * L * t - uy * off).toFixed(1)},${(y0 + uy * L * t + ux * off).toFixed(1)} `;
    }
    return path;
  };
  const path = build(1);
  const col = gold > 0.3 ? C.goldHi : C.tealHi;
  const Am = Math.max(A0, A1);
  const dark = tmax >= 1 ? Math.max(0, 1 - A1) : 0;
  const c = prog(fr, f(INTF.cancel), 40);
  const opp = mirror && !MAZE.onPath.has(i) ? Math.sin(Math.PI * Math.min(1, c * 1.4)) * Math.min(1, Am * 2) : 0;
  return (
    <g>
      {part !== "wave" && dark > 0.05 && <rect x={x1 - MZ.cell / 2} y={y1 - MZ.cell / 2} width={MZ.cell} height={MZ.cell} fill="#08031C" opacity={dark * 0.6} />}
      {part !== "floor" && (
        <>
          <path d={path} fill="none" stroke={gold > 0.3 ? C.gold : C.teal} strokeWidth={22} strokeLinecap="round" opacity={0.18 + 0.1 * Math.min(Am, 2)} />
          <path d={path} fill="none" stroke={col} strokeWidth={5 + 2 * Math.min(Am, 2)} strokeLinecap="round" opacity={0.35 + 0.65 * Math.min(1, Am)} />
          {opp > 0.02 && <path d={build(-1)} fill="none" stroke={C.lilac} strokeWidth={4} strokeLinecap="round" strokeDasharray="10 8" opacity={0.75 * opp} />}
        </>
      )}
    </g>
  );
};

// the deepest wrong branch: where the camera watches waves cancel
const WRONG = MAZE.off.reduce((b, v, i) => (v > MAZE.off[b] && !MAZE.onPath.has(i) && MAZE.dist[i] < MAZE.maxDist ? i : b), 0);
export const Interference: React.FC<SceneProps> = ({ fr }) => {
  const s = f(INTF.start), tw = f(INTF.waves), tLook = f(INTF.look), tLand = f(INTF.land), tDrop = f(INTF.drop), tLift = f(INTF.lift), end = f(INTF.end), tWo = f(INTF.whipOut);
  const front = interpolate(fr, [tw, f(INTF.wavesEnd)], [0, MAZE.maxDist + 1], clamp);
  const stack = prog(fr, f(INTF.stack) - 6, 30);
  const [ex, ey] = bw(...cellXY(MAZE.exit));
  const [dx, dy] = bw(...cellXY(DEAD));
  const [wx, wy] = bw(...cellXY(WRONG));
  const [sx, sy] = bw(...cellXY(MAZE.start));
  // the lamp: on (from myth) -> clicks off on "interference" -> clicks on again on "look"
  const off = lampOn(fr, f(INTF.lampOff));
  const on = fr >= tLook ? lampOn(fr, tLook) : 1 - off;
  const press = lampPress(fr, f(INTF.lampOff)) + lampPress(fr, tLook);
  // coin: hops up out of the dead end and arcs over the walls (in the air: it never crosses a wall
  // on the board) to the entrance, waits there as the wave source, then lifts, flips across and
  // lands on the exit
  const back = prog(fr, f(INTF.back), f(INTF.backEnd) - f(INTF.back), easeInOut);
  const backH = fr >= f(INTF.back) && fr < f(INTF.backEnd) ? Math.sin(back * Math.PI) : 0; // height in the hop
  const bx = dx + (sx - dx) * back, by = dy + (sy - dy) * back - 150 * backH;
  const landB = fr >= f(INTF.backEnd) ? 1 + 0.12 * Math.exp(-(fr - f(INTF.backEnd)) / 3) * Math.cos((fr - f(INTF.backEnd)) * 1.1) : 1;
  const fly = prog(fr, tLift, tDrop - tLift, ease);
  const fall = prog(fr, tDrop, tLand - tDrop, easeIn);
  const hgt = fr < tLift ? backH * 0.8 : fr < tDrop ? Math.sin(Math.min(1, fly * 1.6) * Math.PI / 2) : 1 - fall;
  const cx = fr < tLift ? bx : sx + (ex - sx) * fly, cy = fr < tLift ? by : sy + (ey - sy) * fly - 120 * Math.sin(Math.PI * fly) * 0.4;
  const spin = Math.max(0, fr - tLift) * 0.42;
  const flipK = fr < tLift ? (backH > 0 ? 0.25 + 0.65 * Math.abs(Math.cos(back * Math.PI * 3)) : 0.9) : fr < tDrop ? Math.abs(Math.cos(spin)) * 0.9 : 0.9 - 0.75 * (1 - fall) * Math.abs(Math.sin(spin));
  const face: 0 | 1 = fr < tLift ? 0 : fr < tDrop ? (Math.cos(spin) >= 0 ? 1 : 0) : 1;
  const settle = fr >= tLand ? 1 + 0.14 * Math.exp(-(fr - tLand) / 3) * Math.cos((fr - tLand) * 1.1) : fr < tLift ? landB : 1;
  const source = (0.75 * prog(fr, f(INTF.glow), 6) + 0.25 * prog(fr, f(INTF.source), 14)) * (1 - prog(fr, tLift, 8));
  const xGone = prog(fr, f(INTF.xOff), 7, easeIn);
  const whip = 0; // v5: no whip; the camera pushes into the exit's gold landing glow (pool opens on ripples)
  const dive = prog(fr, tWo, end - tWo, easeIn);
  const keys: Key[] = [
    [s, { x: dx + 4, y: dy + 4, zoom: 1.98 }],
    [f(INTF.back) + 8, { x: 470, y: 960, zoom: 1.2 }],
    [f(INTF.backEnd), { x: 420, y: 1010, zoom: 1.22 }],
    [f(INTF.source) + 6, { x: 330, y: 1040, zoom: 1.5 }],
    [tw + 12, { x: 450, y: 980, zoom: 1.2 }],
    [f(INTF.wavesEnd) + 4, { x: 545, y: 900, zoom: 1.03 }],
    [f(INTF.cancel) + 6, { x: wx, y: wy, zoom: 1.6 }],
    [f(INTF.right) - 2, { x: wx + 10, y: wy + 6, zoom: 1.7 }],
    [f(INTF.right) + 14, { x: 520, y: 860, zoom: 1.1 }],
    [f(INTF.stack) + 22, { x: 720, y: 560, zoom: 1.38 }],
    [f(INTF.press2) - 6, { x: 700, y: 620, zoom: 1.32 }],
    [tLook, { x: 610, y: 820, zoom: 1.0 }],
    [tDrop, { x: 760, y: 500, zoom: 1.32 }],
    [tWo, { x: ex, y: ey, zoom: 1.55 }],
    [end, { x: ex, y: ey, zoom: 5.2 }, easeIn],
  ];
  const c0 = camAt(fr, keys);
  const sh = shake(fr, tLand, 10, 14);
  const cam = { x: c0.x + sh.x / c0.zoom, y: c0.y + sh.y / c0.zoom, zoom: c0.zoom, rot: c0.rot + sh.rot };
  return (
    <>
    <Stage fr={fr} cam={cam} handheld={0.35}>
      <WhipDefs k={whip} id="whipI" />
      <g filter={whip > 0.02 ? "url(#whipI)" : undefined}>
        <DeskTop fr={fr} glow={[ex, ey, "Gold", 0.15 + 0.6 * stack]} />
        {/* the bit-coin row sinks into the dark once the waves take over (it sat behind the 47 s caption) */}
        <DeskExtras fr={fr} motes={on} row={0} />
        <MazeBoard x={BOARD.x} y={BOARD.y} s={BOARD.s} lightDir={on > 0.5 ? [0.6, 0.7] : [-1, -1]} floor={(i) => <WaveFloor fr={fr} i={i} front={front} part="floor" />} />
        <LampPool id="i" c={LAMP.pool} r={LAMP.r} on={on} dark={0.62} />
        {/* the waves glow in the dark (drawn over the darkness: they are their own light) */}
        <g transform={`translate(${BOARD.x} ${BOARD.y}) scale(${BOARD.s})`}>
          {Array.from({ length: MZ.cols * MZ.rows }, (_, i) => <WaveFloor key={i} fr={fr} i={i} front={front} part="wave" mirror />)}
          {(() => { const [lx, ly] = cellXY(MAZE.exit); return <circle cx={lx} cy={ly - 30} r={170 + 40 * Math.sin(fr * 0.2)} fill="url(#glowGold)" opacity={stack} />; })()}
        </g>
        {/* the red X from the myth peels off */}
        {xGone < 1 && (
          <g transform={`translate(${dx} ${dy}) scale(${0.9 * (1 - xGone)}) rotate(${-6 + 40 * xGone})`} stroke={C.coral} strokeWidth={15} strokeLinecap="round" opacity={0.95 * (1 - xGone)}>
            <path d="M-58,-58 L58,58" />
            <path d="M58,-58 L-58,58" />
          </g>
        )}
        {/* the coin as the source of the waves: a teal glow and rings at the entrance */}
        {source > 0 && (
          <g>
            <circle cx={sx} cy={sy} r={560} fill="url(#glowTeal)" opacity={0.55 * source} />
            <radialGradient id="srcTeal"><stop offset="0" stopColor="#8FF3E3" stopOpacity={0.95} /><stop offset="0.35" stopColor="#2FC4B2" stopOpacity={0.5} /><stop offset="1" stopColor="#2FC4B2" stopOpacity={0} /></radialGradient>
            <circle cx={sx} cy={sy} r={230 + 14 * Math.sin(fr * 0.25)} fill="url(#srcTeal)" opacity={source} />
            {fr >= f(INTF.glow) + 12 && [0, 1, 2].map((j) => { const k = ((fr - f(INTF.glow) - 12) / 24 + j / 3) % 1; return <circle key={j} cx={sx} cy={sy} r={40 + 90 * k} fill="none" stroke={C.tealHi} strokeWidth={4} opacity={source * (1 - k) * 0.8} />; })}
            {[0, 10].map((d) => { const k = prog(fr, f(INTF.glow) + d, 30, ease); return k > 0 && k < 1 ? <circle key={d} cx={sx} cy={sy} r={40 + 520 * k} fill="none" stroke={C.tealHi} strokeWidth={14 * (1 - k) + 3} opacity={0.95 * (1 - k)} /> : null; })}
          </g>
        )}
        <ellipse cx={cx + 30 * hgt} cy={(fr < tLift ? cy + 150 * backH : cy) + 46 * hgt + 6} rx={43 * (0.8 - 0.25 * hgt)} ry={43 * (0.7 - 0.25 * hgt)} fill="#0C0526" opacity={0.3 + 0.3 * (1 - hgt)} filter="url(#soft8)" />
        <g transform={`translate(${cx} ${cy}) scale(${settle}) translate(${-cx} ${-cy})`}>
          <TopCoin x={cx} y={cy} r={43 * (1 + 1.0 * hgt)} flipK={flipK} face={face} rot={-12} glow={0.6 + 0.4 * hgt} />
          {source > 0.02 && fr < tLift && <circle cx={cx} cy={cy} r={47} fill="#8FF3E3" opacity={0.32 * source} style={{ mixBlendMode: "screen" }} />}
        </g>
        {fr >= tLand && <circle cx={ex} cy={ey} r={240} fill="url(#glowGold)" opacity={pop(fr, tLand, 10)} />}
        {fr >= tLand && [0, 1].map((j) => { const k = prog(fr, tLand + j * 4, 18); return k > 0 && k < 1 ? <circle key={j} cx={ex} cy={ey} r={50 + 200 * k} fill="none" stroke={C.goldHi} strokeWidth={10 * (1 - k) + 2} opacity={1 - k} /> : null; })}
        {stack > 0 && <Sparkles fr={fr} x={ex} y={ey} r={200} n={10} seed="ex" />}
        <ExitLabel fr={fr} at={-99} o={1 - prog(fr, f(INTF.cancel) - 4, 8)} /> {/* v6: leaves before the push lifts it into the top UI band */}
        <DeskLamp base={LAMP.base} elbow={LAMP.elbow} head={LAMP.head} aim={LAMP.aim} on={on} press={press} fr={fr} s={LAMP.s} />
        <Overhang fr={fr} />
      </g>
    </Stage>
    {/* the landing glow swells as we push into it: its gold light becomes the pool's ripples */}
    {dive > 0 && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle ${300 + 500 * dive}px at 540px 960px, rgba(255,227,138,${0.7 * dive}), rgba(255,203,87,${0.35 * dive}) 45%, rgba(0,0,0,0) 100%)`, mixBlendMode: "screen" }} />}
    </>
  );
};
