import React from "react";
import { random } from "remotion";
import { ease, easeIn, easeInOut, f, lerp, pop, prog } from "../../lib";
import { C, COND, NUNITO } from "../../kit/palette";
import { Molecule, Padlock } from "../../kit/objects";
import { NightSky } from "../../kit/room";
import { type Key } from "../../kit/camera";
import { Galaxy, USES_WIN_ZOOM } from "../scale";
import { WIN } from "../../kit/room";
import { USES } from "../uses-events";
import { P, solveAt, threadAt, type SlotName } from "../problems-events";

/*
 * Kit for uses -> problems -> ending (one animator). Everything that crosses a cut is a function of
 * the absolute frame shared by both scenes, so the cut frames match exactly:
 *   CAM_KEYS     one camera path for uses + problems (ends locked at {540, 860, 1.0})
 *   molAt/lockAt the molecule and padlock from their birth in uses to their gallery places
 *   galleryOut   the solved gallery sliding away (starts in problems' last frames, ends in ending)
 * Drawings: CityMap (a folded street map, depot, stops, Manhattan routes), BatteryLattice (a
 * cylindrical cell + a rock-salt crystal lattice), ProteinPocket, CodeLock (padlock with 4 wheels),
 * Tag, Thread (teal link from the chip).
 */

// ---- the sky in the porthole for these acts (matches scale's dive: a far galaxy)
export const StudySky: React.FC<{ fr: number }> = ({ fr }) => (
  <g>
    <NightSky fr={fr} />
    <Galaxy fr={fr} x={680} y={480} s={0.18} rot={-20 + fr * 0.15} bright={0.8} n={160} />
  </g>
);

// ---- gallery places (world coords; the final camera is {540, 860, 1}: screen y = world y + 100)
export const CH_S = 0.8, CH_TOP = 160; // the chandelier in the study (problems' end = ending's start)
export const SLOT = {
  mol: { x: 192, y: 430, s: 0.5 },
  map: { x: 868, y: 900, s: 1.1 }, // lower right: the push frames it with the lock above, clear of the UI band
  bat: { x: 196, y: 1180, s: 1.15 }, // battery base on the table; lattice floats above it
  lock: { x: 880, y: 480, s: 0.55 },
};
export const CHIP_W: [number, number] = [540, CH_TOP + 1160 * CH_S];
// anchor points where the chip's teal threads land on each problem
export const ANCHOR: Record<SlotName, [number, number]> = {
  map: [706, 860],
  bat: [312, 810],
  mol: [318, 590],
  lock: [800, 560],
};

// ---- one camera path across uses and problems
export const CAM_KEYS: Key[] = [
  [f(USES.start), { x: WIN.x, y: WIN.y, zoom: USES_WIN_ZOOM }],
  [f(USES.pulled), { x: 540, y: 1040, zoom: 1.55 }, (t) => 1 - Math.pow(1 - t, 3)],
  [f(USES.shrug), { x: 540, y: 1053, zoom: 1.85 }],
  [f(USES.droop) + 10, { x: 540, y: 1050, zoom: 1.92 }],
  [f(USES.molecule) + 6, { x: 520, y: 950, zoom: 1.06 }],
  [f(USES.gather), { x: 600, y: 960, zoom: 1.14 }],
  [f(P.slots) + 4, { x: 540, y: 880, zoom: 1.0 }],
  [f(P.push), { x: 590, y: 860, zoom: 1.04 }],
  [f(P.tangle0) + 8, { x: 868, y: 900, zoom: 1.7 }, (t) => 1 - Math.pow(1 - t, 2.4)],
  [f(P.pull), { x: 872, y: 896, zoom: 1.78 }],
  [f(P.land) + 2, { x: 540, y: 720, zoom: 0.9 }],
  [f(P.end) - 14, { x: 540, y: 860, zoom: 1.0 }],
];
// handheld amount: alive through both acts, dies out into the locked end frame (1e-4 keeps the
// Camera's 3% safety zoom on, so the pad matches the ending's shaken camera)
export const camHH = (fr: number) => Math.max(1e-4, 0.5 * (1 - prog(fr, f(P.end) - 24, 22)));

// ---- the molecule: formed in uses at (540, 900), glides to its gallery place
export const molAt = (fr: number) => {
  const form = prog(fr, f(USES.molecule) - 3, 10);
  const g = prog(fr, f(USES.aside), f(P.slots) - f(USES.aside), easeInOut);
  const scl = Math.exp(lerp(Math.log(1.2), Math.log(SLOT.mol.s), g));
  const born = 0.6 + 0.4 * Math.min(1.08, pop(fr, f(USES.molecule) - 3, 10));
  // spins freely; jitters through orientations while "very hard"; turns to its docking pose
  const dock = prog(fr, f(solveAt("mol")), 14);
  const hard = prog(fr, f(P.tangle0), 6) * (1 - prog(fr, f(P.lower0), 10));
  const free = fr * 0.25 + hard * 40 * Math.sin(fr * 0.9);
  const target = Math.round((f(solveAt("mol")) * 0.25) / 360) * 360 - 20;
  const rot = lerp(free, target, ease(dock));
  return { x: lerp(540, SLOT.mol.x, g), y: lerp(900, SLOT.mol.y, g) - Math.sin(Math.PI * g) * 70 + 60 * ease(dock), s: scl * born, rot, o: Math.min(1, form * 2), form, dock };
};

// ---- the padlock: pops in uses at (640, 1010), glides to its gallery place
export const lockAt = (fr: number) => {
  const k = pop(fr, f(USES.padlock), 12);
  const g = prog(fr, f(USES.gather), f(P.slots) - f(USES.gather), easeInOut);
  const s0 = 0.95;
  const s = Math.exp(lerp(Math.log(s0), Math.log(SLOT.lock.s), g)) * Math.min(1.06, k);
  const strain = prog(fr, f(USES.crack), 10) * 0.32;
  const open = prog(fr, f(solveAt("lock")), 10);
  const crack = strain + (1 - strain) * open;
  // trembles while it's being cracked and while "very hard"
  const hard = prog(fr, f(P.tangle0), 6) * (1 - prog(fr, f(P.lower0), 10));
  const tremble = (prog(fr, f(USES.crack), 4) * (1 - g) + hard) * Math.sin(fr * 2.1) * 2.2;
  return { x: lerp(640, SLOT.lock.x, g), y: lerp(1010, SLOT.lock.y, g) + (1 - Math.min(1, k)) * 70, s, rot: -3 + 3 * g + tremble, crack, open, vis: fr >= f(USES.padlock) };
};

// ---- the solved gallery leaving: 0..1 from P.exit (shared by problems' tail and ending's head)
export const galleryOut = (fr: number) => prog(fr, f(P.exit), 16, (t) => t * t);
// where each vignette goes as it leaves (world offset at galleryOut = 1)
export const OUT_DIR: Record<SlotName, [number, number]> = { mol: [-600, -260], map: [700, 320], bat: [-600, 300], lock: [640, -260] };
export const outXY = (n: SlotName, fr: number) => {
  const k = galleryOut(fr);
  // a small anticipation pull toward the chip first
  const a = Math.sin(Math.PI * Math.min(1, k * 3)) * 0.04 * (1 - k);
  return { dx: OUT_DIR[n][0] * (k - a), dy: OUT_DIR[n][1] * (k - a), k };
};

// ---- the chandelier lowering into the study (top of the top plate, world y), its sway and chip
export const chandAt = (fr: number) => {
  const d = pop(fr, f(P.lower0), 11);
  const top = CH_TOP - 1500 * (1 - d);
  const t = fr - f(P.land);
  const sway = t > 0 ? 2.2 * Math.exp(-t / 14) * Math.sin(t * 0.32) * (1 - prog(fr, f(P.end) - 12, 12)) : 0;
  const on = fr < f(P.chipOn) ? 0 : fr - f(P.chipOn) < 3 ? [0.9, 0.3, 1.1][fr - f(P.chipOn)] : 1;
  return { top, sway, chipGlow: 0.15 + 1.15 * on };
};

// ---- small label under / over each problem
export const Tag: React.FC<{ x: number; y: number; text: string; k: number; c?: string }> = ({ x, y, text, k, c = C.lilac }) =>
  k <= 0 ? null : (
    <g transform={`translate(${x} ${y}) scale(${Math.min(1.08, k)})`} opacity={Math.min(1, k * 1.5)}>
      <text textAnchor="middle" fontFamily={NUNITO} fontWeight={900} fontSize={38} fill={c} letterSpacing={1.5} stroke="#120A33" strokeWidth={10} strokeLinejoin="round" style={{ paintOrder: "stroke" }}>{text}</text>
    </g>
  );

// ---- teal thread from the chip to a problem; k draws it on, back retracts it from the far end
export const Thread: React.FC<{ fr: number; a: [number, number]; b: [number, number]; k: number; seed: number }> = ({ fr, a, b, k, seed }) => {
  if (k <= 0) return null;
  const mx = (a[0] + b[0]) / 2 + Math.sin(fr * 0.08 + seed) * 18, my = Math.max(a[1], b[1]) + 60 + Math.sin(fr * 0.11 + seed) * 12;
  const d = `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`;
  const L = 1600;
  const t = ((fr * 0.022 + seed * 0.37) % 1);
  return (
    <g>
      <path d={d} fill="none" stroke={C.teal} strokeWidth={18} opacity={0.22 * Math.min(1, k)} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - Math.min(1, k))} />
      <path d={d} fill="none" stroke={C.tealHi} strokeWidth={5} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - Math.min(1, k))} />
      {k >= 1 && <path d={d} fill="none" stroke="#E6FFFB" strokeWidth={9} strokeLinecap="round" strokeDasharray={`40 ${L}`} strokeDashoffset={40 - L * 0.62 * t} opacity={0.8} />}
    </g>
  );
};

// ======================================================================================
// City delivery map: a folded paper street map pinned to the wall. Local coords, 300 x 340.
const GX = [-120, -60, 0, 60, 120], GY = [-135, -80, -25, 30, 85, 140];
const DEPOT: [number, number] = [-120, 140];
const STOPS: [number, number][] = [[-60, -135], [60, -80], [120, 30], [0, 30], [-120, -25], [60, 140], [120, -135], [-60, 85]];
// a short tour (depot -> stops -> depot), legs along the streets
const BEST = [DEPOT, [-60, 85], [-120, -25], [-60, -135], [120, -135], [60, -80], [0, 30], [120, 30], [60, 140], DEPOT] as [number, number][];
// a tour as straight legs between stops (the routing graph); each leg bowed a little so
// overlapping tours read apart
const tour = (pts: [number, number][], seed: string, bow: number) => {
  let d = `M${pts[0][0]},${pts[0][1]}`, L = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const l = Math.hypot(x1 - x0, y1 - y0) || 1, b = (random(`${seed}b${i}`) - 0.5) * 2 * bow;
    d += ` Q${(x0 + x1) / 2 - ((y1 - y0) / l) * b},${(y0 + y1) / 2 + ((x1 - x0) / l) * b} ${x1},${y1}`;
    L += l * 1.04;
  }
  return { d, L };
};
const BEST_P = tour(BEST, "best", 0);
const ROUTES = Array.from({ length: 56 }, (_, r) => {
  const order = STOPS.map((s, i) => ({ s, k: random(`rt${r}_${i}`) })).sort((a, b) => a.k - b.k).map((o) => o.s);
  return { ...tour([DEPOT, ...order, DEPOT], `r${r}`, 26), c: [C.coral, "#FF9C8A", C.rose, "#B9A6FF", C.coralDeep][r % 5] };
});
// point at fraction u along BEST (for the van)
const alongBest = (u: number): [number, number, number] => {
  let rest = (u * BEST_P.L) / 1.04;
  for (let i = 1; i < BEST.length; i++) {
    const [a, b] = BEST[i - 1], [c, d] = BEST[i];
    const l = Math.hypot(c - a, d - b);
    if (rest <= l && l > 0) { const t = rest / l; return [a + (c - a) * t, b + (d - b) * t, Math.atan2(d - b, c - a)]; }
    rest -= l;
  }
  return [DEPOT[0], DEPOT[1], 0];
};

export const CityMap: React.FC<{ fr: number; x: number; y: number; s?: number; open: number; pins: number; routes: number; flick: number; best: number; van: number; rot?: number }> = ({ fr, x, y, s = 1, open, pins, routes, flick, best, van, rot = 0 }) => {
  if (open <= 0) return null;
  const W = 150, H = 170;
  const born = (i: number) => Math.log2(i + 1) * 5.6; // routes double every ~5.6 frames
  const [vx, vy, va] = alongBest(van % 1);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      {/* unfolds from its middle fold */}
      <g transform={`scale(${Math.min(1.04, open)} ${Math.min(1.02, 0.2 + 0.8 * open)})`}>
        <rect x={-W + 14} y={-H + 18} width={2 * W} height={2 * H} rx={8} fill="#0C0526" opacity={0.45} filter="url(#soft8)" />
        <rect x={-W} y={-H} width={2 * W} height={2 * H} rx={6} fill="#E7DFF8" />
        <clipPath id="mapClip"><rect x={-W + 8} y={-H + 8} width={2 * W - 16} height={2 * H - 16} rx={3} /></clipPath>
        <g clipPath="url(#mapClip)">
          {/* city blocks between streets */}
          <rect x={-W} y={-H} width={2 * W} height={2 * H} fill="#C9BEEA" />
          {GX.map((gx) => <rect key={`v${gx}`} x={gx - 6} y={-H} width={12} height={2 * H} fill="#F7F3FF" />)}
          {GY.map((gy) => <rect key={`h${gy}`} x={-W} y={gy - 6} width={2 * W} height={12} fill="#F7F3FF" />)}
          {/* a park and a few building footprints */}
          <rect x={7} y={-73} width={46} height={41} rx={4} fill="#86CFA3" />
          <circle cx={22} cy={-58} r={8} fill="#5DB585" /><circle cx={40} cy={-46} r={7} fill="#5DB585" />
          {[[-113, -128], [67, 37], [-53, -18], [7, 92], [67, -128], [-113, 37]].map(([bx, by], i) => <rect key={i} x={bx} y={by} width={44} height={39} rx={3} fill="#B3A6E0" />)}
          {/* the river with its bridges, and an arterial road */}
          <path d={`M${-W},${-2} C-70,10 -40,-60 40,-6 S110,70 ${W},52`} fill="none" stroke="#86B6F0" strokeWidth={22} />
          <path d={`M${-W},${-2} C-70,10 -40,-60 40,-6 S110,70 ${W},52`} fill="none" stroke="#B5D3FA" strokeWidth={6} opacity={0.7} />
          <path d={`M${-W},${H - 40} L${W},${-H + 30}`} stroke="#FFE7A8" strokeWidth={9} opacity={0.75} />
          {/* fold creases */}
          <rect x={-52} y={-H} width={2} height={2 * H} fill="#8E80C4" opacity={0.35} />
          <rect x={48} y={-H} width={2} height={2 * H} fill="#FFFFFF" opacity={0.5} />
          <rect x={-W} y={-2} width={2 * W} height={2} fill="#8E80C4" opacity={0.3} />
          {/* every possible tour: multiplies into a tangle */}
          {routes > 0 && ROUTES.map((r, i) => {
            const t = (routes - born(i)) / 7;
            if (t <= 0) return null;
            const k = Math.min(1, t);
            return <path key={i} d={r.d} fill="none" stroke={r.c} strokeWidth={2.4} strokeLinejoin="round" opacity={0.7 * Math.max(0, 1 - best * 1.4)} strokeDasharray={r.L + 40} strokeDashoffset={(r.L + 40) * (1 - k)} />;
          })}
          {/* the gold best tour: flickering tries, then found */}
          {(flick > 0 || best > 0) && (
            <g>
              <path d={BEST_P.d} fill="none" stroke={C.gold} strokeWidth={20} strokeLinejoin="round" opacity={0.45} strokeDasharray={BEST_P.L + 20} strokeDashoffset={(BEST_P.L + 20) * (1 - Math.max(flick, best))} filter="url(#soft4)" />
              <path d={BEST_P.d} fill="none" stroke={C.goldHi} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={BEST_P.L + 20} strokeDashoffset={(BEST_P.L + 20) * (1 - Math.max(flick, best))} />
            </g>
          )}
          {/* the depot (warehouse) */}
          <g transform={`translate(${DEPOT[0]} ${DEPOT[1]}) scale(${Math.min(1.1, pins * 1.2)})`}>
            <circle r={26} fill={C.gold} opacity={0.35 + 0.4 * best} filter="url(#soft4)" />
            <path d="M-16,4 L-16,-8 L0,-18 L16,-8 L16,4Z" fill="#C46F1D" />
            <rect x={-16} y={-8} width={32} height={14} fill={C.gold} />
            <rect x={-6} y={-3} width={12} height={9} fill="#5B3A12" />
          </g>
          {/* the delivery van, driving the found tour */}
          {best >= 1 && (
            <g transform={`translate(${vx} ${vy}) rotate(${(va * 180) / Math.PI})`}>
              <rect x={-13} y={-8} width={26} height={16} rx={4} fill={C.cream} stroke="#5B3A12" strokeWidth={1.5} />
              <rect x={5} y={-6} width={6} height={12} rx={2} fill="#3A2779" />
            </g>
          )}
        </g>
        {/* stops: map pins */}
        {STOPS.map(([px, py], i) => {
          const k = Math.min(1.15, pop(Math.floor(pins * 30), 2 + i * 2, 9));
          const done = best > 0 ? Math.min(1, Math.max(0, best * 1.2 - i * 0.08)) : 0;
          return k > 0.02 ? (
            <g key={i} transform={`translate(${px} ${py}) scale(${k})`}>
              <ellipse cx={3} cy={2} rx={6} ry={2.5} fill="#120830" opacity={0.4} />
              <path d="M0,0 L-6,-14 A8 8 0 1 1 6,-14Z" fill={done > 0.5 ? C.gold : C.rose} />
              <circle cx={0} cy={-17} r={3.2} fill="#FFF8EC" />
            </g>
          ) : null;
        })}
        {/* the push pin holding it to the wall */}
        <circle cx={0} cy={-H + 12} r={11} fill="#120830" opacity={0.4} transform="translate(3 4)" />
        <circle cx={0} cy={-H + 12} r={10} fill={C.coral} />
        <circle cx={-3} cy={-H + 9} r={3.5} fill="#FFD2C8" />
      </g>
    </g>
  );
};

// ======================================================================================
// Battery (cylindrical cell, side view) + its cathode's crystal lattice floating above.
// (x, y) = the battery's base centre on the table. lattice centre at (x, y - 330).
const LAT = (() => {
  const out: { x: number; y: number; big: boolean; back: boolean }[] = [];
  for (const back of [true, false])
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) out.push({ x: (c - 1) * 62 + (back ? 26 : 0), y: (r - 1) * 56 - (back ? 22 : 0), big: (r + c + (back ? 1 : 0)) % 2 === 0, back });
  return out;
})();
export const BatteryLattice: React.FC<{ fr: number; x: number; y: number; s?: number; bat: number; lat: number; jumble: number; order: number; charge: number }> = ({ fr, x, y, s = 1, bat, lat, jumble, order, charge }) => {
  const ly = -330;
  const pos = LAT.map((a, i) => {
    const hop = Math.floor(fr / 4);
    const jx = (random(`lj${i}_${hop}`) - 0.5) * 70 * jumble, jy = (random(`lk${i}_${hop}`) - 0.5) * 60 * jumble;
    const bob = Math.sin(fr * 0.09 + i) * 2.5 * (1 - order);
    const assemble = Math.min(1, Math.max(0, lat * 1.4 - i * 0.02));
    return { ...a, px: a.x * assemble + jx + (1 - assemble) * (random(`la${i}`) - 0.5) * 160, py: ly + a.y * assemble + jy + bob - (1 - assemble) * 60, k: assemble };
  });
  const bondsOf = (back: boolean) => pos.flatMap((p, i) => pos.slice(i + 1).map((q) => ({ p, q })).filter(({ q }) => q.back === back && p.back === back && ((Math.abs(p.y - q.y) < 1 && Math.abs(Math.abs(p.x - q.x) - 62) < 1) || (Math.abs(p.x - q.x) < 1 && Math.abs(Math.abs(p.y - q.y) - 56) < 1))));
  const bondC = order > 0.5 ? C.goldHi : "#CFC4F5";
  const bk = Math.min(1.08, bat);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* the lattice */}
      {lat > 0 && (
        <g opacity={Math.min(1, lat * 2)}>
          <circle cx={0} cy={ly} r={170} fill="url(#glowGold)" opacity={0.7 * order} />
          {/* back-to-front links */}
          {pos.filter((p) => !p.back).map((p, i) => { const q = pos[i]; return <line key={`z${i}`} x1={q.px} y1={q.py} x2={p.px} y2={p.py} stroke={bondC} strokeWidth={3} opacity={0.35 * (1 - jumble * 0.7)} />; })}
          {[true, false].map((back) => (
            <g key={String(back)}>
              {bondsOf(back).map(({ p, q }, i) => <line key={i} x1={p.px} y1={p.py} x2={q.px} y2={q.py} stroke={bondC} strokeWidth={back ? 3 : 4.5} opacity={(back ? 0.4 : 0.75) * (1 - jumble * 0.75) * p.k} />)}
              {pos.filter((p) => p.back === back).map((p, i) => {
                const r = (p.big ? 17 : 10) * (back ? 0.82 : 1);
                return (
                  <g key={i} opacity={back ? 0.75 : 1}>
                    <circle cx={p.px + 3} cy={p.py + 4} r={r} fill="#120830" opacity={0.3} />
                    <circle cx={p.px} cy={p.py} r={r} fill={p.big ? "url(#atomWhite)" : order > 0.5 ? "url(#atomGold)" : "url(#atomTeal)"} />
                    <ellipse cx={p.px - r * 0.3} cy={p.py - r * 0.35} rx={r * 0.3} ry={r * 0.18} fill="#FFFFFF" opacity={0.7} />
                  </g>
                );
              })}
            </g>
          ))}
        </g>
      )}
      {/* the battery */}
      {bat > 0 && (
        <g transform={`scale(${2 - Math.min(1.12, Math.max(0.6, bk)) * 1} ${Math.min(1.12, bk)})`}>
          <ellipse cx={14} cy={4} rx={86} ry={16} fill="#120830" opacity={0.5} filter="url(#soft8)" />
          <rect x={-58} y={-210} width={116} height={210} rx={20} fill="#1D7F78" />
          <rect x={-58} y={-210} width={116} height={210} rx={20} fill="url(#batShade)" />
          <rect x={-58} y={-150} width={116} height={96} fill="#2B2468" />
          <rect x={-58} y={-150} width={116} height={6} fill="#8FF3E3" opacity={0.6} />
          {/* charge window */}
          <rect x={-38} y={-138} width={76} height={72} rx={8} fill="#140C38" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={-30} y={-80 - i * 15} width={60} height={11} rx={3} fill={charge * 4 > i + 0.5 ? C.gold : "#3A2F7A"} opacity={charge * 4 > i + 0.5 ? 1 : 0.8} />
          ))}
          <path d="M6,-200 L-10,-176 L2,-176 L-6,-158 L12,-184 L0,-184Z" fill={C.goldHi} opacity={0.85} />
          {/* + cap and bottom rim */}
          <rect x={-22} y={-224} width={44} height={16} rx={5} fill="url(#steel)" />
          <ellipse cx={0} cy={-210} rx={58} ry={9} fill="#35C3B4" />
          <rect x={-58} y={-12} width={116} height={12} rx={6} fill="url(#steel)" opacity={0.9} />
          <rect x={-46} y={-200} width={12} height={186} rx={6} fill="#FFFFFF" opacity={0.22} />
          <circle cx={0} cy={-100} r={140} fill="url(#glowGold)" opacity={0.6 * charge * order} />
        </g>
      )}
    </g>
  );
};
export const BatDefs: React.FC = () => (
  <defs>
    <linearGradient id="batShade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#0E0628" stopOpacity={0.35} />
      <stop offset="0.3" stopColor="#8FF3E3" stopOpacity={0.25} />
      <stop offset="0.65" stopColor="#0E0628" stopOpacity={0} />
      <stop offset="1" stopColor="#0E0628" stopOpacity={0.45} />
    </linearGradient>
  </defs>
);

// ======================================================================================
// A protein's surface with a binding pocket (the drug target), local coords, ~300 wide.
export const ProteinPocket: React.FC<{ fr: number; x: number; y: number; s: number; k: number; lit: number }> = ({ fr, x, y, s, k, lit }) =>
  k <= 0 ? null : (
    <g transform={`translate(${x} ${y + 40 * (1 - Math.min(1, k))}) scale(${s * Math.min(1.06, k)})`}>
      <ellipse cx={10} cy={90} rx={170} ry={26} fill="#120830" opacity={0.35} filter="url(#soft8)" />
      <path d="M-170,60 C-190,0 -150,-40 -110,-30 C-90,-60 -60,-40 -48,-18 C-40,24 40,24 48,-18 C60,-46 96,-64 116,-30 C160,-40 196,10 168,64 C120,110 -120,110 -170,60Z" fill="#8C6FD6" />
      <path d="M-150,54 C-160,14 -136,-14 -108,-8 M120,-8 C150,-14 172,18 160,50" fill="none" stroke="#C7B4FF" strokeWidth={10} strokeLinecap="round" opacity={0.6} />
      {/* bumpy surface (residues) */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = Math.PI * (1.05 + (i / 13) * 0.9);
        return <circle key={i} cx={Math.cos(a) * 150} cy={56 + Math.sin(a) * 70 + Math.sin(fr * 0.05 + i) * 1.5} r={20} fill="#9D82E6" opacity={0.7} />;
      })}
      {/* the pocket glows when the molecule docks */}
      <ellipse cx={0} cy={4} rx={56} ry={26} fill="#3A2779" />
      <ellipse cx={0} cy={4} rx={70} ry={40} fill="url(#glowGold)" opacity={lit} />
    </g>
  );

// ======================================================================================
// Combination padlock: the kit Padlock plus four number wheels under its body.
export const CodeLock: React.FC<{ fr: number; x: number; y: number; s: number; rot: number; crack: number; spin: number; solved: number }> = ({ fr, x, y, s, rot, crack, spin, solved }) => {
  const code = [4, 0, 9, 6];
  return (
    <g>
      <Padlock x={x} y={y} s={s} crack={crack} rot={rot} />
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
        <rect x={-120} y={206} width={240} height={64} rx={14} fill="#3E356F" />
        {code.map((dgt, i) => {
          const spinning = spin > 0 && solved < 1;
          const v = spinning ? Math.floor(random(`wh${i}_${Math.floor(fr / 2)}`) * 10) : dgt;
          const scroll = spinning ? ((fr * (9 + i * 3)) % 40) - 20 : 0;
          return (
            <g key={i} transform={`translate(${-87 + i * 58} 238)`}>
              <rect x={-24} y={-26} width={48} height={52} rx={8} fill={solved > 0.5 ? "url(#lockBody)" : "url(#steel)"} />
              <clipPath id={`whc${i}`}><rect x={-24} y={-26} width={48} height={52} rx={8} /></clipPath>
              <g clipPath={`url(#whc${i})`}>
                <text x={0} y={14 + scroll * spin} textAnchor="middle" fontFamily={COND} fontWeight={800} fontSize={40} fill="#2B2468">{v}</text>
                <rect x={-24} y={-26} width={48} height={12} fill="#2B2468" opacity={0.25} />
                <rect x={-24} y={14} width={48} height={12} fill="#2B2468" opacity={0.25} />
              </g>
            </g>
          );
        })}
      </g>
      {solved > 0 && <circle cx={x} cy={y} r={200 * s * (1 + solved)} fill="url(#glowGold)" opacity={0.8 * (1 - 0.5 * solved)} />}
    </g>
  );
};

// ======================================================================================
// The whole gallery in one place: both problems and ending draw it with the same frame state.
export const Gallery: React.FC<{ fr: number; withLock?: boolean; withMol?: boolean }> = ({ fr, withLock = true, withMol = true }) => {
  const m = molAt(fr), lk = lockAt(fr);
  const hard = prog(fr, f(P.tangle0), 6) * (1 - prog(fr, f(P.lower0) + 6, 12));
  const routes = Math.max(0, fr - f(P.tangle0)) * (1 - 0) ;
  const fl1 = prog(fr, f(P.flick1), 9) * 0.42, fl2 = prog(fr, f(P.flick2), 11) * 0.7;
  const flickOn = (t0: number, len: number) => { const t = fr - f(t0); return t >= 0 && t < len && !(t > len - 6 && t % 2 === 1); };
  const flick = flickOn(P.flick1, 15) ? fl1 : flickOn(P.flick2, 16) ? fl2 : 0;
  const best = prog(fr, f(solveAt("map")), 18, easeInOut);
  const van = Math.max(0, fr - f(solveAt("map")) - 18) / 140;
  const om = outXY("map", fr), ob = outXY("bat", fr), oM = outXY("mol", fr), oL = outXY("lock", fr);
  const tagK = (i: number) => pop(fr, f(P.tags) + i * 3, 12);
  const batK = pop(fr, f(P.battery), 10);
  const order = prog(fr, f(solveAt("bat")), 10);
  const jumble = Math.max(hard * (1 - (fr >= f(P.flick2) && fr < f(P.flick2) + 6 ? 0.8 : 0)), 0) * (1 - order);
  const flash = (n: SlotName) => { const t = prog(fr, f(solveAt(n)), 16); return t > 0 && t < 1 ? t : 0; };
  const ring = (n: SlotName, cx: number, cy: number, r: number) => { const t = flash(n); return t > 0 ? <circle cx={cx} cy={cy} r={r * (0.4 + t)} fill="none" stroke={C.goldHi} strokeWidth={10 * (1 - t)} opacity={0.9 * (1 - t)} /> : null; };
  return (
    <g>
      {/* routes: the map on the wall */}
      <g transform={`translate(${om.dx} ${om.dy})`}>
        <circle cx={SLOT.map.x} cy={SLOT.map.y} r={280} fill="url(#glowGold)" opacity={0.5 * best} />
        <CityMap fr={fr} x={SLOT.map.x} y={SLOT.map.y} s={SLOT.map.s} open={pop(fr, f(P.map), 12)} pins={prog(fr, f(P.map) + 4, 20)} routes={routes} flick={flick} best={best} van={van} rot={2 + Math.sin(fr * 0.03) * 0.6} />
        {ring("map", SLOT.map.x, SLOT.map.y, 240)}
        <Tag x={SLOT.map.x} y={SLOT.map.y - 210} text="routes" k={tagK(1)} />
      </g>
      {/* batteries: cell + lattice */}
      <g transform={`translate(${ob.dx} ${ob.dy})`}>
        <BatteryLattice fr={fr} x={SLOT.bat.x} y={SLOT.bat.y} s={SLOT.bat.s} bat={batK} lat={prog(fr, f(P.battery) + 3, 14)} jumble={jumble} order={order} charge={prog(fr, f(solveAt("bat")) + 4, 20)} />
        {ring("bat", SLOT.bat.x, SLOT.bat.y - 330 * SLOT.bat.s, 190)}
        <Tag x={SLOT.bat.x + 190} y={SLOT.bat.y - 60} text="batteries" k={tagK(2)} />
      </g>
      {/* medicines: molecule over its protein pocket */}
      {withMol && (
        <g transform={`translate(${oM.dx} ${oM.dy})`}>
          <ProteinPocket fr={fr} x={SLOT.mol.x} y={SLOT.mol.y + 150} s={0.78} k={pop(fr, f(P.protein), 12)} lit={prog(fr, f(solveAt("mol")) + 8, 10)} />
          {m.form > 0 && <Molecule x={m.x} y={m.y} s={m.s} rot={m.rot} fr={fr} o={m.o} />}
          {ring("mol", SLOT.mol.x, SLOT.mol.y + 90, 190)}
          <Tag x={SLOT.mol.x} y={SLOT.mol.y + 278} text="medicines" k={tagK(0)} />
        </g>
      )}
      {/* codes: the combination padlock */}
      {withLock && lk.vis && (
        <g transform={`translate(${oL.dx} ${oL.dy})`}>
          <CodeLock fr={fr} x={lk.x} y={lk.y} s={lk.s} rot={lk.rot} crack={lk.crack} spin={hard} solved={lk.open} />
          {ring("lock", SLOT.lock.x, SLOT.lock.y + 40, 170)}
          <Tag x={SLOT.lock.x} y={SLOT.lock.y - 150} text="codes" k={tagK(3) * (1 - prog(fr, f(P.push) - 6, 6) + prog(fr, f(P.pull) + 10, 8))} /> {/* v6: off while the map push lifts it into the top UI band */}
        </g>
      )}
    </g>
  );
};

// the threads from the chip to every problem (grow on "come in", retract from P.exit)
export const Threads: React.FC<{ fr: number; chip: [number, number] }> = ({ fr, chip }) => {
  const back = prog(fr, f(P.exit) - 2, 10, easeIn);
  return (
    <g>
      {(["map", "bat", "mol", "lock"] as SlotName[]).map((n, i) => {
        const k = prog(fr, f(threadAt(n)), 8, ease) * (1 - back);
        return <Thread key={n} fr={fr} a={chip} b={ANCHOR[n]} k={k} seed={i * 1.7} />;
      })}
    </g>
  );
};
