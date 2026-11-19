import React from "react";
import { interpolate, random } from "remotion";
import { clamp, ease, easeIn, easeInOut, f, pop, prog, type SceneProps } from "../lib";
import { FlatCoin } from "../kit/coin";
import { C, Leaf, NUNITO } from "../kit/palette";
import { Sparkles } from "../kit/room";
import { camAt, Layer, type Key } from "../kit/camera";
import { WhipDefs } from "../kit/life";
import { Backdrop, Component, Drop, Earth, FLOOR, KID_A, KID_B, Kid, Pillar, PoolDefs, Ring, SectionBack, smooth, STYLE_A, STYLE_B, SURF, Surface, WaterBody, WaterLight, type Arm, type Pose } from "./kit/pool-kit";
import { Stage } from "./stage";
import { POOL } from "./pool-events";
import { WHIP_UP } from "./interference";

// Pool (Madhav's own analogy): close on the gold coin floating in a night pool, gold rings on the
// water; pull back to two friends waist-deep at either side (the friend bursts up on "friend").
// They splash each other, then sweep the water: crests roll toward the middle. The camera tilts
// down into the cutaway: the water in section, two matching wave trains facing each other;
// brackets show the same length and the same height. They combine crest on crest: the overlap
// turns into one big gold wave that lights the water and the kids; the coin rides it ("right
// answer"). A second lane: out of sync, crest meets trough, flat coral ("cancel"). Then water
// pillars rise out of the gold lane: the gold one climbs, the coral ones sink (the probability of
// the right answer goes up). Whip-tilt up into scale.

const K = (2 * Math.PI) / 120; // wavenumber (wavelength 120 world px)
const A = 36; // amplitude of one wave packet at its centre
const H = 215; // half-length of a packet (cos² bell)
const bell = (u: number) => (Math.abs(u) < 1 ? Math.cos((Math.PI / 2) * u) ** 2 : 0);
const W0 = 0.2; // phase speed, rad / frame
const wrap = (target: number, from: number) => target + 2 * Math.PI * Math.ceil((from - target) / (2 * Math.PI));

// phase of lane 1 (v6: slows to ~35%, was ~10%): runs, slows for the comparison, runs again, then eases onto
// the crest-on-crest moment and holds it (slow motion of the instant the trains add up)
const phase1 = (fr: number) => {
  const T0 = f(POOL.trains), th = f(POOL.hold), ts = f(POOL.surge), fc = f(POOL.combined) - 4;
  const sp = (i: number) => W0 * (1 - 0.65 * smooth((i - th + 8) / 14) * (1 - smooth((i - ts + 12) / 12)));
  let p = 0;
  const upto = Math.min(fr, fc);
  for (let i = T0; i < upto; i++) p += sp(i);
  if (fr <= fc) return p;
  const target = wrap(K * (540 - KID_A) - Math.PI / 2, p + 1.2);
  const t = prog(fr, fc, 22, ease);
  return p + (target - p) * t + 0.12 * Math.sin((fr - fc) * 0.09) * t;
};
const phase2 = (fr: number) => {
  const T0 = f(POOL.lane2Waves), fm = f(POOL.lane2Meet), ff = f(POOL.lane2Flat);
  const p = Math.max(0, Math.min(fr, fm) - T0) * W0 * 1.4;
  if (fr <= fm) return p;
  const target = wrap(K * (540 - 150) - Math.PI / 2, p + 0.9);
  return p + (target - p) * prog(fr, fm, ff - fm, easeInOut);
};

const frontKeys = (fr: number, keys: [number, number][]) => interpolate(fr, keys.map((k) => k[0]), keys.map((k) => k[1]), { ...clamp, easing: easeInOut });

// ballistic splash from a hand: drops fly toward `dir`, land on the surface and leave rings
type Splash = { t0: number; x: number; y: number; dir: 1 | -1; seed: string; n?: number; reach?: number };
const SplashFX: React.FC<{ fr: number; s: Splash; gold: number }> = ({ fr, s }) => {
  const t = fr - f(s.t0);
  if (t < 0 || t > 70) return null;
  const n = s.n ?? 26, reach = s.reach ?? 1;
  return (
    <g>
      {/* the sheet of water leaving the hand */}
      {t < 12 && (
        <path d={`M${s.x},${s.y} q${s.dir * 90 * reach},${-150} ${s.dir * 210 * reach},${-120}`} fill="none" stroke="#CFFBF4" strokeWidth={44 * (1 - t / 12)} strokeLinecap="round" opacity={0.55 * (1 - t / 12)} strokeDasharray={`${40 + t * 22} 600`} />
      )}
      {Array.from({ length: n }, (_, i) => {
        const vx = s.dir * (10 + random(`${s.seed}vx${i}`) * 8) * reach, vy = -(15 + random(`${s.seed}vy${i}`) * 9), g = 0.95;
        const land = s.y + 10 - random(`${s.seed}ly${i}`) * 70;
        // solve landing time
        const tl = (-vy + Math.sqrt(vy * vy + 2 * g * (land - s.y))) / g;
        const r = 6 + random(`${s.seed}r${i}`) * 8;
        if (t < tl) {
          const x = s.x + vx * t, y = s.y + vy * t + 0.5 * g * t * t;
          return <Drop key={i} x={x} y={y} vx={vx} vy={vy + g * t} r={r} />;
        }
        const k = (t - tl) / 20;
        const lx = s.x + vx * tl;
        return k < 1 ? <Ring key={i} x={lx} y={land} r={10 + 50 * k} k={k} w={4} /> : null;
      })}
    </g>
  );
};

// small text tag: Nunito 900 with a dark outline, popping in with overshoot
const Tag: React.FC<{ x: number; y: number; k: number; text: string; c: string; size?: number; anchor?: "middle" | "start" }> = ({ x, y, k, text, c, size = 44, anchor = "middle" }) =>
  k <= 0.01 ? null : (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <text x={0} y={0} textAnchor={anchor} fontFamily={NUNITO} fontWeight={900} fontSize={size} fill={c} stroke="#120A33" strokeWidth={10} strokeLinejoin="round" style={{ paintOrder: "stroke" }}>{text}</text>
    </g>
  );

const Bracket: React.FC<{ x0: number; x1: number; y: number; k: number; vertical?: boolean; c?: string }> = ({ x0, x1, y, k, vertical, c = C.cream }) => {
  if (k <= 0) return null;
  const d = vertical ? `M${y - 12},${x0} L${y},${x0} L${y},${x1} L${y - 12},${x1}` : `M${x0},${y + 14} L${x0},${y} L${x1},${y} L${x1},${y + 14}`;
  const len = Math.abs(x1 - x0) + 40;
  return (
    <g>
      <path d={d} fill="none" stroke="#120A33" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} strokeDasharray={len} strokeDashoffset={len * (1 - k)} />
      <path d={d} fill="none" stroke={c} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - k)} />
    </g>
  );
};

const lerpArm = (a: Arm, b: Arm, t: number): Arm => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const win = (fr: number, a: number, b: number, rin = 5, rout = 8) => smooth((fr - a) / rin) * (1 - smooth((fr - b) / rout));

// both kids' acting, from the beats
const kidPose = (fr: number, who: "A" | "B"): Pose => {
  const ph = who === "A" ? 0 : 1.7;
  const idle: Pose = { front: [26 + 8 * Math.sin(fr * 0.15 + ph), 22], back: [22 + 8 * Math.sin(fr * 0.15 + ph + 1), 22], mouth: "smile", look: 0.7 };
  let p: Pose = { ...idle };
  // blink every ~3 s
  const bt = (fr + (who === "A" ? 0 : 41)) % 97;
  p.blink = bt < 3 ? [0.6, 0.1, 0.6][bt] : 1;
  const mix = (q: Partial<Pose>, t: number) => {
    if (t <= 0) return;
    p = { ...p, ...q, front: q.front ? lerpArm(p.front, q.front, t) : p.front, back: q.back ? lerpArm(p.back, q.back, t) : p.back, mouth: t > 0.5 && q.mouth ? q.mouth : p.mouth, squint: q.squint !== undefined ? q.squint * t : p.squint };
  };
  // throw: wind up (arms back) -> fling forward-up -> recover
  const fling = (t0: number) => {
    const T = f(t0), wd = 7;
    if (fr < T - wd || fr > T + 22) return;
    let a: number;
    if (fr < T) a = 26 + (-50 - 26) * ease(prog(fr, T - wd, wd));
    else if (fr < T + 5) a = -50 + 170 * prog(fr, T, 5, easeIn);
    else a = 120 + (26 - 120) * prog(fr, T + 5, 17, ease);
    p.front = [a, 20 - (fr < T ? 20 : 0)];
    p.back = [a - 10, 26];
    p.mouth = "laugh";
    p.lean = fr < T ? -6 : 8 * (1 - prog(fr, T + 5, 17));
  };
  const hit = (t0: number) => {
    const T = f(t0);
    if (fr >= T && fr < T + 16) { p.squint = 1; p.mouth = "laugh"; p.lean = -8 * Math.sin(Math.PI * (fr - T) / 16); p.back = [110, 60]; }
  };
  const cheer = (t0: number, dur: number) => mix({ front: [160, 15 + 20 * Math.sin(fr * 0.6 + ph)], back: [155, 15 + 20 * Math.sin(fr * 0.6 + ph + 1)], mouth: "laugh" }, win(fr, f(t0), f(t0 + dur), 5, 8));
  if (who === "A") {
    mix({ front: [150, 25 + 28 * Math.sin(fr * 0.7)], mouth: "laugh", look: 0.2 }, win(fr, f(POOL.hello) - 4, f(POOL.hello + 0.9)));
    fling(POOL.splashA);
    hit(POOL.hitA);
    fling(POOL.splashBoth + 0.12);
  } else {
    // swimming under water, then bursting up on "friend"
    const up = pop(fr, f(POOL.friend) - 3, 11);
    if (fr < f(POOL.friend) + 30) {
      p.dy = 150 * (1 - up);
      p.lean = 80 * (1 - Math.min(1, up));
      mix({ front: [165, 10], back: [160, 10], mouth: "laugh", squint: 1 }, 1 - prog(fr, f(POOL.friend) + 6, 18));
    }
    hit(POOL.hitB);
    fling(POOL.splashB);
    fling(POOL.splashBoth);
  }
  // sweeping the water toward the middle
  const sweep = win(fr, f(POOL.waving) - 5, f(POOL.hold), 6, 14);
  if (sweep > 0) {
    const s = Math.sin((fr - f(POOL.waving)) * 0.32 + ph * 0.3);
    mix({ front: [72 + 30 * s, 10], back: [58 + 30 * s, 14], mouth: "smile", look: 1 }, sweep);
  }
  // watching the trains, surprise as they combine, cheers
  mix({ look: 1, mouth: "o" }, win(fr, f(POOL.surge), f(POOL.bigger1) - 4));
  cheer(POOL.bigger1 + (who === "A" ? 0.05 : 0.12), 1.0);
  mix({ front: [96, -10], mouth: "laugh", look: 1 }, win(fr, f(POOL.rightAnswers), f(POOL.rightAnswers + 1.0)));
  cheer(POOL.bigger2, 0.7);
  cheer(POOL.goesUp + (who === "A" ? 0 : 0.08), 1.2);
  return p;
};

export const Pool: React.FC<SceneProps> = ({ fr }) => {
  const s = f(POOL.start), end = f(POOL.end), tWo = f(POOL.whipOut);
  const goldK = prog(fr, f(POOL.combined) - 2, 18) * (1 - 0.3 * prog(fr, f(POOL.lane2), 14)) + 0.3 * prog(fr, f(POOL.bigger2) - 3, 10);
  const swell = 1 + 0.18 * Math.sin(Math.PI * prog(fr, f(POOL.bigger1) - 6, 22)) + 0.16 * Math.sin(Math.PI * prog(fr, f(POOL.bigger2) - 6, 22));
  const calm = 1 - 0.85 * prog(fr, f(POOL.pillarsUp), 20, easeInOut);

  // ---- lane 1: the water in section under the cut
  const P1 = phase1(fr);
  const T0 = f(POOL.trains);
  // packet centres: out of the kids' hands, held apart for the comparison, then onto the middle
  const cL = frontKeys(fr, [[T0, KID_A - 40], [f(POOL.hold), 352], [f(POOL.surge), 358], [f(POOL.combined) + 10, 540]]);
  const cR = 1080 - cL;
  const gTr = prog(fr, T0, 12) * swell * calm;
  const winX = (x: number) => smooth((x - KID_A - 12) / 50) * smooth((KID_B - 12 - x) / 50);
  const yL = (x: number) => fr < T0 ? 0 : A * gTr * winX(x) * bell((x - cL) / H) * Math.sin(K * (x - KID_A) - P1);
  const yR = (x: number) => fr < T0 ? 0 : A * gTr * winX(x) * bell((x - cR) / H) * Math.sin(K * (KID_B - x) - P1);
  const amb = (x: number) => 2.5 * Math.sin(x * 0.035 + fr * 0.11) + 1.5 * Math.sin(x * 0.081 - fr * 0.07);
  const d1 = (x: number) => yL(x) + yR(x) + amb(x);

  // ---- lane 2: out of sync (rises in below, then sinks away for the pillars)
  // lane 2 is an inset tank in the top stage (above the gold lane): it drops in from above right
  // after "right answer ✓", holds ~2.5 s, and leaves upward before the probability caption
  const l2in = pop(fr, f(POOL.lane2), 16);
  const l2out = prog(fr, f(POOL.lane2Out), 10, easeIn);
  const Y2 = 800 - (1 - l2in) * 900 - 900 * l2out;
  const P2 = phase2(fr);
  const T2 = f(POOL.lane2Waves);
  const cL2 = frontKeys(fr, [[T2, 120], [f(POOL.lane2Meet), 470], [f(POOL.lane2Flat), 540]]);
  const cR2 = 1080 - cL2;
  const win2 = (x: number) => smooth((x - 160) / 50) * smooth((920 - x) / 50);
  const g2 = prog(fr, T2, 8);
  const yL2 = (x: number) => fr < T2 ? 0 : A * g2 * win2(x) * bell((x - cL2) / H) * Math.sin(K * (x - 150) - P2);
  const yR2 = (x: number) => fr < T2 ? 0 : A * g2 * win2(x) * bell((x - cR2) / H) * Math.sin(K * (930 - x) - P2 + Math.PI);
  const flat2 = prog(fr, f(POOL.lane2Flat) - 4, 10);
  const d2 = (x: number) => yL2(x) + yR2(x) + 1.5 * Math.sin(x * 0.04 + fr * 0.1);

  // ---- pillars (probability): five water columns out of the gold lane
  const PX = [300, 420, 540, 660, 780];
  const split = prog(fr, f(POOL.split), f(POOL.goesUp) - f(POOL.split) + 2, easeInOut);
  const topPop = fr >= f(POOL.goesUp) ? Math.exp(-(fr - f(POOL.goesUp)) / 5) * Math.sin((fr - f(POOL.goesUp)) * 0.7) : 0;
  const pillarH = (i: number) => {
    const rise = pop(fr, f(POOL.probability) - 4 + Math.abs(i - 2) * 2, 12) * 170;
    return i === 2 ? rise + 170 * split + 26 * topPop : rise * (1 - 0.5 * split);
  };

  // ---- the coin
  const bob = Math.sin(fr * 0.13) * 4;
  const toFront = prog(fr, f(POOL.waving), f(POOL.tiltEnd) - f(POOL.waving), easeInOut);
  const hopT = prog(fr, f(POOL.rightAnswers) - 2, 18);
  const hop = Math.sin(Math.PI * hopT) * 130;
  const coinR = 30 + 12 * toFront;
  const surfAt540 = SURF - d1(540);
  const coinX = 540;
  const pTop = SURF - pillarH(2);
  const coinY0 = 830 + bob + (surfAt540 - 830 - 6) * toFront;
  const coinY = Math.min(coinY0, toFront >= 1 ? Math.min(surfAt540, pTop) - 6 : coinY0) - hop;
  const coinK = hopT > 0 && hopT < 1 ? 0.06 + 0.4 * Math.abs(Math.cos(hopT * Math.PI * 2)) : 0.44 - 0.06 * toFront;

  // ---- camera
  const keys: Key[] = [
    // first frame: the coin big at screen ~(540, 990), matching interference's push into the gold coin
    [s, { x: 540, y: 829, zoom: 5.5 }],
    [s + 16, { x: 520, y: 850, zoom: 2.6 }, ease],
    [f(POOL.hello) + 4, { x: 470, y: 915, zoom: 1.5 }],
    [f(POOL.friend) + 3, { x: 555, y: 960, zoom: 1.2 }],
    [f(POOL.pool) + 6, { x: 540, y: 1000, zoom: 1.0 }],
    [f(POOL.windA), { x: 520, y: 995, zoom: 1.05 }],
    [f(POOL.hitA) + 8, { x: 560, y: 990, zoom: 1.1 }],
    [f(POOL.tilt), { x: 540, y: 1000, zoom: 1.12 }],
    [f(POOL.tiltEnd), { x: 540, y: 1245, zoom: 1.22 }],
    [f(POOL.hold) + 6, { x: 540, y: 1240, zoom: 1.26 }],
    [f(POOL.surge), { x: 540, y: 1236, zoom: 1.28 }],
    [f(POOL.combined) + 12, { x: 540, y: 1230, zoom: 1.25 }],
    [f(POOL.bigger1) + 10, { x: 540, y: 1215, zoom: 1.3 }],
    [f(POOL.lane2) + 14, { x: 540, y: 1238, zoom: 1.1 }],
    [f(POOL.bigger2) + 6, { x: 540, y: 1232, zoom: 1.13 }],
    [f(POOL.probability) + 8, { x: 540, y: 1305, zoom: 1.0 }],
    [f(POOL.goesUp) + 6, { x: 540, y: 1278, zoom: 1.03 }],
    [tWo, { x: 540, y: 1270, zoom: 1.05 }],
    [end, { x: 540, y: 1270 - WHIP_UP, zoom: 1.05 }, easeIn],
  ];
  const cam = camAt(fr, keys);
  const whip = prog(fr, tWo, end - tWo, easeIn);

  // ---- surface crests from the sweeping hands (perspective rings toward the middle)
  const crestTimes = Array.from({ length: 16 }, (_, i) => POOL.waving + 0.05 + i * 0.36).filter((t) => t < POOL.combined + 0.6);
  const crests = (x0: number, seed: number) => crestTimes.map((t, i) => {
    const age = fr - f(t) - seed;
    if (age < 0) return null;
    const r = 40 + age * 7.5;
    const o = Math.min(1, age / 6) * (1 - smooth((r - 330) / 220));
    if (o <= 0.01) return null;
    const col = goldK > 0.3 ? C.goldHi : C.tealHi;
    return (
      <g key={i}>
        <ellipse cx={x0} cy={SURF + 6} rx={r} ry={r * 0.34} fill="none" stroke={C.teal} strokeWidth={16} opacity={0.25 * o} />
        <ellipse cx={x0} cy={SURF + 6} rx={r} ry={r * 0.34} fill="none" stroke={col} strokeWidth={5} opacity={0.85 * o} />
      </g>
    );
  });

  // coin rings at the open (it has just landed in the water) and its glow
  const coinGlow = 0.8 + 0.2 * Math.sin(fr * 0.15);
  const openRings = [0, 1, 2, 3].map((j) => {
    const age = fr - s + 10 - j * 9;
    const k = age / 44;
    return k > 0 && k < 1 ? <Ring key={j} x={540} y={834} r={30 + 230 * ease(k)} k={k} c={C.goldHi} w={8} /> : null;
  });

  const splashes: Splash[] = [
    { t0: POOL.splashA, x: KID_A + 80, y: SURF - 30, dir: 1, seed: "sa", reach: 1.15 },
    { t0: POOL.splashB, x: KID_B - 80, y: SURF - 30, dir: -1, seed: "sb", reach: 1.15 },
    { t0: POOL.splashBoth + 0.12, x: KID_A + 80, y: SURF - 30, dir: 1, seed: "sc", n: 12, reach: 0.8 },
    { t0: POOL.splashBoth, x: KID_B - 80, y: SURF - 30, dir: -1, seed: "sd", n: 12, reach: 0.8 },
  ];
  // spray off the gold crest
  const spray = (t0: number, seed: string) => {
    const t = fr - f(t0);
    if (t < 0 || t > 36) return null;
    return Array.from({ length: 14 }, (_, i) => {
      const a = -Math.PI / 2 + (random(`${seed}a${i}`) - 0.5) * 2.2;
      const v = 7 + random(`${seed}v${i}`) * 9;
      const vx = Math.cos(a) * v, vy = Math.sin(a) * v;
      const y0 = SURF - d1(540) - 10;
      return <Drop key={i} x={540 + vx * t} y={y0 + vy * t + 0.42 * t * t} vx={vx} vy={vy + 0.84 * t} r={5 + random(`${seed}r${i}`) * 4} c={C.goldHi} o={1 - t / 36} />;
    });
  };

  // brackets on the held trains: one wavelength between two crests, and one crest height
  // the main crest of the left packet (nearest its centre) and its neighbour toward the middle
  const crestsL = (() => {
    const mx: [number, number][] = [];
    for (let x = KID_A + 20; x < 560; x += 2) { const v = yL(x); if (v > yL(x - 2) && v >= yL(x + 2) && v > 4) mx.push([x, v]); }
    if (!mx.length) return [];
    const i = mx.reduce((b, m, j) => (m[1] > mx[b][1] ? j : b), 0);
    return mx[i + 1] ? [mx[i + 1][0], mx[i][0]] : mx[i - 1] ? [mx[i][0], mx[i - 1][0]] : [];
  })();
  const lenK = prog(fr, f(POOL.sameLength) - 2, 12, ease) * (1 - prog(fr, f(POOL.surge) - 4, 8));
  const widK = prog(fr, f(POOL.sameWidth) - 2, 12, ease) * (1 - prog(fr, f(POOL.surge) - 4, 8));
  const cA = crestsL[0], cB = crestsL[1];

  const label1 = pop(fr, f(POOL.label1), 12) * (1 - prog(fr, f(POOL.rightAnswers) - 4, 4, easeIn));
  const label1b = pop(fr, f(POOL.rightAnswers), 11) * (1 - prog(fr, f(POOL.pillarsUp) - 2, 6, easeIn));
  const label2 = pop(fr, f(POOL.lane2Flat) + 2, 12);
  const chanceK = pop(fr, f(POOL.split) + 4, 12);

  return (
    <Stage fr={fr} cam={cam} handheld={0.45} bg="#120A33">
      <PoolDefs />
      <WhipDefs k={whip} id="whipP" />
      <g filter={whip > 0.02 ? "url(#whipP)" : undefined}>
        <Backdrop fr={fr} />
        <Earth />
        {/* the surface in perspective */}
        <Surface fr={fr} gold={0.55 * goldK}>
          <circle cx={540} cy={834} r={260} fill="url(#poolGold)" opacity={(0.75 * coinGlow) * (1 - toFront)} />
          {/* the gold light carried in from the landing, settling into the water */}
          <ellipse cx={540} cy={834} rx={240} ry={110} fill="url(#glowGold)" opacity={1 - prog(fr, s, 22)} />
          {openRings}
          {crests(KID_A, 0)}
          {crests(KID_B, 3)}
          {/* waist rings around the kids */}
          {[KID_A, KID_B].map((x, i) => [0, 1].map((j) => { const k = ((fr + j * 22 + i * 9) % 44) / 44; return <ellipse key={`${i}${j}`} cx={x} cy={SURF - 2} rx={50 + 50 * k} ry={(50 + 50 * k) * 0.3} fill="none" stroke={C.tealHi} strokeWidth={4 * (1 - k) + 1} opacity={0.6 * (1 - k)} />; }))}
        </Surface>
        <SectionBack fr={fr} gold={0.7 * goldK} />
        {/* the kids below the waterline (seen through the water) */}
        <g clipPath="url(#plBelow)">
          <Kid x={KID_A} y={SURF - 2} dir={1} st={STYLE_A} pose={kidPose(fr, "A")} fr={fr} rim={0.8 * goldK} />
          <Kid x={KID_B} y={SURF - 2} dir={-1} st={STYLE_B} pose={kidPose(fr, "B")} fr={fr} rim={0.8 * goldK} />
        </g>
        {/* bubbles from the friend under water */}
        {fr >= f(POOL.bubbles) && fr < f(POOL.friend) + 10 && Array.from({ length: 9 }, (_, i) => {
          const age = fr - f(POOL.bubbles) - i * 2;
          if (age < 0) return null;
          const y = SURF + 120 - age * 5;
          if (y < SURF + 4) return null;
          return <circle key={i} cx={KID_B - 140 + Math.sin(age * 0.4 + i) * 8 + i * 4} cy={y} r={5 + (i % 3) * 3} fill="none" stroke="#CFFBF4" strokeWidth={3} opacity={0.8} />;
        })}
        <WaterBody id="pl1" Y={SURF} x0={60} x1={1020} bottom={FLOOR} disp={d1} stroke={goldK > 0.4 ? C.goldHi : C.tealHi} glow={goldK} />
        <WaterLight fr={fr} gold={goldK} />
        <Component Y={SURF} x0={60} x1={1020} disp={yL} c={C.tealHi} o={0.9 * goldK * calm} />
        <Component Y={SURF} x0={60} x1={1020} disp={yR} c={C.lilac} o={0.9 * goldK * calm} dash="4 10" />
        {/* lane 2 */}
        {Y2 > -300 && (
          <g>
            <rect x={-30} y={Y2 - 186} width={1140} height={300} fill="#120A33" opacity={0.35} filter="url(#soft14)" />
            <rect x={96} y={Y2 - 160} width={888} height={250} rx={18} fill="#8E80D4" />
            <rect x={126} y={Y2 - 160} width={828} height={226} fill="url(#plWall)" />
            <rect x={126} y={Y2 - 160} width={828} height={226} fill="#120A33" opacity={0.35} />
            {Array.from({ length: 21 }, (_, i) => <line key={i} x1={126 + i * 40} y1={Y2 - 160} x2={126 + i * 40} y2={Y2 + 66} stroke="#5FB4D8" strokeWidth={1.5} opacity={0.25} />)}
            {flat2 > 0 && <ellipse cx={540} cy={Y2} rx={420} ry={90} fill="url(#glowCoral)" opacity={0.45 * flat2} />}
            <WaterBody id="pl2" Y={Y2} x0={126} x1={954} bottom={Y2 + 66} disp={d2} stroke={flat2 > 0.5 ? C.coral : C.tealHi} glow={flat2 * 0.6} glowC={C.coral} />
            <Component Y={Y2} x0={126} x1={954} disp={yL2} c={C.tealHi} o={0.9 * prog(fr, f(POOL.lane2Meet) - 6, 8)} />
            <Component Y={Y2} x0={126} x1={954} disp={yR2} c={C.lilac} o={0.9 * prog(fr, f(POOL.lane2Meet) - 6, 8)} dash="4 10" />
            <Tag x={540} y={Y2 - 104} k={label2} text="out of sync → cancel" c={C.coral} size={46} />
            <Tag x={540} y={Y2 - 58} k={label2} text="(wrong answers)" c={C.coral} size={38} />
          </g>
        )}
        {/* pillars: the probability of each answer */}
        {PX.map((x, i) => {
          const h = pillarH(i);
          if (i === 2) return <Pillar key={i} x={x} Y={SURF + 4} h={h} w={78} fill="url(#plGoldCol)" cap={C.goldHi} fr={fr} seed={i} glow={0.8} />;
          return (
            <g key={i}>
              <Pillar x={x} Y={SURF + 4} h={h} w={64} fill="url(#plTealCol)" cap="#CFFBF4" fr={fr} seed={i} />
              {split > 0 && <g opacity={split}><Pillar x={x} Y={SURF + 4} h={h} w={64} fill="url(#plCoralCol)" cap="#FFC2B6" fr={fr} seed={i} /></g>}
            </g>
          );
        })}
        {/* the coin (rides the crest, then the gold pillar) */}
        <circle cx={coinX} cy={coinY} r={140 + 20 * Math.sin(fr * 0.2)} fill="url(#glowGold)" opacity={0.75} />
        <FlatCoin x={coinX} y={coinY} r={coinR} k={coinK} face={1} shadow={false} />
        {/* the kids above the waterline */}
        <g clipPath="url(#plAbove)">
          <Kid x={KID_A} y={SURF - 2} dir={1} st={STYLE_A} pose={kidPose(fr, "A")} fr={fr} rim={0.8 * goldK} />
          <Kid x={KID_B} y={SURF - 2} dir={-1} st={STYLE_B} pose={kidPose(fr, "B")} fr={fr} rim={0.8 * goldK} />
        </g>
        {/* the friend bursting up: a crown of water */}
        {(() => {
          const t = fr - f(POOL.friend) + 2;
          if (t < 0 || t > 30) return null;
          return (
            <g>
              {Array.from({ length: 12 }, (_, i) => {
                const a = -Math.PI / 2 + (i / 11 - 0.5) * 2.4;
                const v = 8 + random(`fu${i}`) * 7;
                return <Drop key={i} x={KID_B + Math.cos(a) * v * t} y={SURF - 60 + Math.sin(a) * v * t + 0.5 * t * t} vx={Math.cos(a) * v} vy={Math.sin(a) * v + t} r={5 + random(`fur${i}`) * 4} o={1 - t / 30} />;
              })}
              <Ring x={KID_B} y={SURF - 4} r={60 + 140 * (t / 30)} k={t / 30} w={10} />
            </g>
          );
        })()}
        {splashes.map((sp, i) => <SplashFX key={i} fr={fr} s={sp} gold={goldK} />)}
        {spray(POOL.bigger1 - 0.1, "g1")}
        {spray(POOL.bigger2 - 0.1, "g2")}
        {spray(POOL.goesUp, "g3")}
        {goldK > 0.2 && <Sparkles fr={fr} x={540} y={SURF - 90} r={200} n={9} seed="plsp" c={C.goldHi} />}
        {/* brackets: same length, same height */}
        {cA !== undefined && cB !== undefined && (
          <g>
            {(() => {
              const hx = yL(cA) > yL(cB) ? cA : cB, hy = Math.max(yL(cA), yL(cB));
              const lx = Math.min(cA, cB);
              return (
                <>
                  <Bracket x0={cA} x1={cB} y={SURF - hy - 30} k={lenK} />
                  <Bracket x0={1080 - cB} x1={1080 - cA} y={SURF - hy - 30} k={lenK} />
                  <Bracket x0={SURF} x1={SURF - yL(hx)} y={lx - 32} k={widK} vertical />
                  <Bracket x0={SURF} x1={SURF - yL(hx)} y={1080 - lx + 32} k={widK} vertical />
                </>
              );
            })()}
            {widK > 0 && <line x1={110} y1={SURF} x2={970} y2={SURF} stroke={C.cream} strokeWidth={2} strokeDasharray="6 10" opacity={0.45 * widK} />}
          </g>
        )}
        <Tag x={540} y={SURF - 200} k={label1} text="in sync → bigger wave" c={C.goldHi} size={42} />
        <Tag x={540} y={SURF - 150} k={label1b} text="right answer ✓" c={C.goldHi} size={48} />
        <Tag x={540} y={pTop - 64} k={chanceK} text="right answer: chance ↑" c={C.goldHi} size={58} />
      </g>
      {/* near foreground: a palm frond hanging into the top-left */}
      <Layer depth={1.35}>
        <g opacity={1}>
          <Leaf x={-30} y={180} a={128 + Math.sin(fr * 0.04) * 3} s={2.1} c="#123C44" vein="#8FF3E3" />
          <Leaf x={-60} y={120} a={150 + Math.sin(fr * 0.05 + 1) * 3} s={1.7} c="#0F3038" vein="#8FF3E3" />
        </g>
      </Layer>
    </Stage>
  );
};
