import React from "react";
import { interpolate, random } from "remotion";
import { clamp, ease, easeIn, easeInOut, f, lerp, pop, prog, type SceneProps } from "../lib";
import { camAt, shake, toScreen, type Cam } from "../kit/camera";
import { C, NUNITO, Star } from "../kit/palette";
import { NightSky, Sparkles, WIN } from "../kit/room";
import { Motes, Steam, WhipDefs } from "../kit/life";
import { BigCoin, EStage, aimCam } from "./kit/endkit";
import { QUBITS, WillowChip, WillowDefs, type QState } from "./kit/hook-kit";
import { Chandelier } from "../kit/objects";
import { ChatTile, ImageGenTile, NeuralNet, RobotTile, SeaWorld, Student, Wave, studentHand, waveGeo } from "./kit/aiwave-kit";
import { Study } from "./stage";
import { AW, ERRS, COIN_HANDOFF, tossTh } from "./aiwave-events";

// AI wave (96.86-109.08). Four places, joined through content:
//  A. the night study: pull back out of the chip's glowing die; the chip on the desk tilts up to us;
//     push through the porthole, which already holds the night sea
//  B. the night sea: a great wave rises carrying AI (chat, image generator, robot arm) and the quantum
//     chip surges onto its crest as the next one; the camera dives onto the chip (match cut)
//  C. the lab bench: coral errors flicker on the chip; an AI network sends pulses that correct them
//     gold one by one (AI-decoded error correction, e.g. DeepMind's AlphaQubit, 2024)
//  D. dawn at sea (after a whip-pan): a student with a laptop surfs the rising wave and tosses the
//     gold coin up toward camera; it becomes the CTA's coin.
// Madhav is on screen (lower right) the whole act: key visuals stay in the top stage / left column.

const S0 = f(AW.start), SEA = f(AW.seaCut), BENCH = f(AW.benchCut), SEA2 = f(AW.seaCut2);

// ---------------- A. the study ----------------
const CHIP_A: [number, number] = [400, 1090];
const WIDE_A = { x: 540, y: 1160, zoom: 1 };
const Z_DIE = 6.5;
const Q_SEA = 0.42; // the sea seen in the porthole: sea world scaled by Q_SEA, its centre at the window centre
const Z_WIN = 3.3; // camera zoom on the window at the cut (sea then continues at Q_SEA * Z_WIN)

const camA = (fr: number): Cam => {
  const p = prog(fr, S0, f(AW.pull1) - S0, ease);
  const drift = camAt(fr, [[f(AW.pull1), WIDE_A], [f(AW.push0), { x: 530, y: 1140, zoom: 1.04 }]]);
  const base = aimCam(1 - p, drift, CHIP_A, Z_DIE);
  const q = prog(fr, f(AW.push0), SEA - f(AW.push0), easeIn);
  const c = q > 0 ? aimCam(q, drift, [WIN.x, WIN.y], Z_WIN) : base;
  return { ...c, rot: 0 };
};

// ---------------- B. the night sea ----------------
const S_LINE = 1320; // sea level under the wave
const waveB = (fr: number) => {
  const rise = prog(fr, f(AW.rise0), f(AW.rise1) - f(AW.rise0), ease);
  const H = lerp(160, 760, rise) + 40 * prog(fr, f(AW.crest), 12) + 50 * prog(fr, f(AW.curl), 20, easeInOut) + 0.6 * Math.max(0, fr - f(AW.rise1));
  return { cx: 330 + 30 * prog(fr, f(AW.curl), 30), cy: S_LINE - H, H };
};
const chipOnCrest = (fr: number) => {
  const w = waveB(fr), g = waveGeo(w.cx, w.cy, S_LINE);
  const [x, y] = g.lipAt(0.34);
  const k = pop(fr, f(AW.crest) - 2, 12);
  const lvl = 1 - prog(fr, f(AW.chipPush), BENCH - f(AW.chipPush), easeInOut);
  return { x: x + 10, y: y - 54 - (1 - Math.min(1, k)) * 120, k: fr >= f(AW.chipPush) ? 1 + (Math.min(1.08, k) - 1) * lvl : k, rot: (-8 + 4 * Math.sin(fr * 0.12)) * lvl };
};
const CHIP_B_S = 0.34, CHIP_K = 0.66;

const SeaScene1: React.FC<{ fr: number }> = ({ fr }) => {
  const w = waveB(fr), g = waveGeo(w.cx, w.cy, S_LINE);
  const ride = Math.max(0, fr - f(AW.chat)) * 0.0015;
  const tiles = [
    { at: f(AW.chat), t: 0.18, kind: "chat" },
    { at: f(AW.image), t: 0.3, kind: "image" },
    { at: f(AW.robot), t: 0.42, kind: "robot" },
  ];
  const ch = chipOnCrest(fr);
  const flare = Math.max(0, 1 - (fr - f(AW.crest)) / 24) * (fr >= f(AW.crest) ? 1 : 0);
  return (
    <g>
      <SeaWorld fr={fr} />
      {/* a smaller swell behind (the wave before) */}
      <Wave id="b0" fr={fr} cx={900} cy={1080 - 40 * Math.sin(fr * 0.03)} S={1250} gold={0.2} foam={0.7} />
      <Wave id="b1" fr={fr} cx={w.cx} cy={w.cy} S={S_LINE} gold={0.4 + 0.6 * Math.min(1, ch.k)} />
      {tiles.map((tl, i) => {
        const k = pop(fr, tl.at, 13);
        if (fr < tl.at) return null;
        const [x, y] = g.faceAt(Math.max(0.05, tl.t - ride));
        const [x2, y2] = g.faceAt(Math.max(0.07, tl.t - ride + 0.02));
        const rot = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI - 60;
        const s = 0.78 * k;
        const bob = Math.sin(fr * 0.14 + i * 2) * 6;
        return (
          <g key={i}>
            {tl.kind === "chat" && <ChatTile x={x - 30} y={y + bob} s={s} rot={rot * 0.4} k={prog(fr, tl.at + 4, 40)} fr={fr} />}
            {tl.kind === "image" && <ImageGenTile x={x - 40} y={y + bob} s={s} rot={rot * 0.4} k={prog(fr, tl.at + 4, 36)} fr={fr} />}
            {tl.kind === "robot" && <RobotTile x={x - 50} y={y + bob} s={s} rot={rot * 0.4} ph={fr * 0.12} />}
          </g>
        );
      })}
      {/* the quantum chip cresting the wave: the next one */}
      {fr >= f(AW.crest) - 2 && (
        <g>
          <circle cx={ch.x} cy={ch.y} r={260} fill="url(#glowGold)" opacity={0.8 + 0.6 * flare} />
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2 + fr * 0.01;
            return <path key={i} d={`M${ch.x + Math.cos(a) * 80},${ch.y + Math.sin(a) * 50} L${ch.x + Math.cos(a) * (180 + 160 * flare)},${ch.y + Math.sin(a) * (120 + 120 * flare)}`} stroke={C.goldHi} strokeWidth={6} strokeLinecap="round" opacity={0.25 + 0.6 * flare} />;
          })}
          <g transform={`rotate(${ch.rot} ${ch.x} ${ch.y})`}>
            <WillowChip fr={fr} x={ch.x} y={ch.y} s={CHIP_B_S * Math.min(1.08, ch.k)} k={CHIP_K} glow={1.3} qubit={(k) => ({ glow: 0.8 + 0.5 * Math.sin(fr * 0.2 + k), color: "#FFE9A8" })} />
          </g>
          <Sparkles fr={fr} x={ch.x} y={ch.y} r={200} n={10} seed="crest" />
        </g>
      )}
      <Motes fr={fr} x={-100} y={300} w={1200} h={900} n={20} seed="seam" c="#EAF7F2" o={0.6} />
    </g>
  );
};
const camB = (fr: number): Cam => {
  const base = camAt(fr, [
    [SEA, { x: 540, y: 960, zoom: Q_SEA * Z_WIN }],
    [SEA + 20, { x: 540, y: 950, zoom: 1.0 }, ease],
    [f(AW.crest), { x: 520, y: 900, zoom: 1.02 }],
    [f(AW.chipPush), { x: 500, y: 860, zoom: 1.08 }],
  ]);
  const q = prog(fr, f(AW.chipPush), BENCH - f(AW.chipPush), easeIn);
  const ch = chipOnCrest(f(AW.chipPush));
  return q > 0 ? { ...aimCam(q, base, [ch.x, ch.y], Z_CHIP), rot: ch.rot * q * 0 } : base;
};
const Z_CHIP = 5.2;

// ---------------- C. the lab bench ----------------
const CHIP_C: [number, number] = [560, 760];
const CHIP_C_S = 0.95;
const NET: [number, number] = [330, 330];
const fixAt = (i: number) => f(AW.fix0 + ((AW.fix1 - AW.fix0) * i) / (ERRS.length - 1));
const qubitPos = (k: number): [number, number] => [CHIP_C[0] + QUBITS[k].x * CHIP_C_S, CHIP_C[1] + QUBITS[k].y * CHIP_C_S * CHIP_K];
const camC = (fr: number): Cam => {
  const zStart = (600 * CHIP_B_S * Z_CHIP) / (600 * CHIP_C_S);
  const c = camAt(fr, [
    [BENCH, { x: CHIP_C[0], y: CHIP_C[1], zoom: zStart }],
    [BENCH + 20, { x: 540, y: 880, zoom: 1.0 }, ease],
    [f(AW.errMore), { x: 555, y: 845, zoom: 1.1 }],
    [f(AW.net) - 2, { x: 560, y: 830, zoom: 1.18 }],
    [f(AW.net) + 16, { x: 490, y: 800, zoom: 1.0 }, ease],
    [f(AW.whip0), { x: 520, y: 840, zoom: 1.05 }],
  ]);
  const wq = prog(fr, f(AW.whip0), SEA2 - f(AW.whip0), easeIn);
  return { ...c, x: c.x + 900 * wq, rot: 0 };
};

const LabBench: React.FC<{ fr: number }> = ({ fr }) => {
  const errOn = (i: number) => f(i < 4 ? AW.err0 + i * 0.12 : AW.errMore + (i - 4) * 0.08);
  const qubit = (k: number): QState => {
    const i = ERRS.indexOf(k);
    if (i >= 0) {
      const fx = fixAt(i);
      if (fr >= fx) return { glow: 1.0 + 0.8 * Math.exp(-(fr - fx) / 8), color: "#FFE9A8" };
      if (fr >= errOn(i)) return { glow: random(`er${k}${Math.floor(fr / 2)}`) > 0.35 ? 1.4 : 0.25, color: C.coral };
    }
    return { glow: 0.35 + 0.2 * Math.sin(fr * 0.13 + k * 0.7), color: C.tealHi };
  };
  const nErr = ERRS.filter((_, i) => fr >= errOn(i) && fr < fixAt(i)).length;
  const fixed = ERRS.filter((_, i) => fr >= fixAt(i)).length;
  const netK = pop(fr, f(AW.net), 13);
  const out: [number, number] = [NET[0] + 240, NET[1] + 20];
  return (
    <g>
      <defs>
        <linearGradient id="labWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#140E40" />
          <stop offset="1" stopColor="#2C1E6A" />
        </linearGradient>
        <linearGradient id="bench" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5A4AA8" />
          <stop offset="0.4" stopColor="#3E3188" />
          <stop offset="1" stopColor="#261B5E" />
        </linearGradient>
      </defs>
      <rect x={-700} y={-600} width={2480} height={1600} fill="url(#labWall)" />
      {/* the cryostat hanging in the background, soft */}
      <g opacity={0.55} filter="url(#soft4)">
        <circle cx={130} cy={560} r={360} fill="url(#glowGold)" opacity={0.6} />
        <Chandelier x={130} top={60} s={0.62} fr={fr} chipGlow={0.8} />
      </g>
      {/* instrument rack, right */}
      <g>
        <rect x={830} y={150} width={330} height={820} rx={14} fill="#1E1752" />
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i}>
            <rect x={846} y={170 + i * 132} width={298} height={112} rx={8} fill="#2B2470" />
            <rect x={862} y={190 + i * 132} width={120} height={60} rx={6} fill="#141C4E" />
            <path d={`M868,${226 + i * 132} ${Array.from({ length: 10 }, (_, j) => `L${870 + j * 11},${220 + i * 132 + 14 * Math.sin(fr * 0.2 + j + i * 2)}`).join(" ")}`} fill="none" stroke={i % 2 ? C.tealHi : "#8C7CE8"} strokeWidth={2.5} opacity={0.8} />
            {[0, 1, 2].map((j) => <circle key={j} cx={1010 + j * 40} cy={220 + i * 132} r={11} fill="#4A4388" stroke="#8F88C9" strokeWidth={3} />)}
            <circle cx={1010} cy={258 + i * 132} r={5} fill={(fr + i * 7) % 40 < 20 ? C.tealHi : "#4A4388"} />
            <circle cx={1030} cy={258 + i * 132} r={5} fill={nErr > 0 && i % 2 && (fr + i * 5) % 12 < 6 ? C.coral : "#4A4388"} />
          </g>
        ))}
      </g>
      {/* cable tray along the wall */}
      <rect x={-700} y={930} width={2480} height={24} fill="#1A1348" />
      {/* bench */}
      <rect x={-700} y={960} width={2480} height={700} fill="url(#bench)" />
      <rect x={-700} y={958} width={2480} height={8} fill="#8C7CE8" opacity={0.6} />
      <rect x={-700} y={1600} width={2480} height={20} rx={10} fill="#6A58C0" />
      <rect x={-700} y={1620} width={2480} height={400} fill="#150B33" />
      {/* the chip's light on the bench */}
      <ellipse cx={CHIP_C[0]} cy={CHIP_C[1] + 260} rx={620} ry={200} fill={fixed >= ERRS.length - 2 ? "url(#poolGold)" : nErr > 2 ? "url(#glowCoral)" : "url(#glowTeal)"} opacity={0.9} />
      {/* coax cables off the holder */}
      {[[-1, -0.6], [-1, 0.2], [1, -0.4], [1, 0.4], [-1, 0.8], [1, 0.9]].map(([sd, v], i) => {
        const x0 = CHIP_C[0] + sd * 240, y0 = CHIP_C[1] + v * 160;
        const x1 = CHIP_C[0] + sd * 760, y1 = CHIP_C[1] + 340 + i * 40;
        return (
          <g key={i}>
            <path d={`M${x0},${y0} C${x0 + sd * 200},${y0 + 40} ${x1 - sd * 260},${y1 - 160} ${x1},${y1}`} fill="none" stroke="#0E0A2E" strokeWidth={18} opacity={0.5} transform="translate(8 14)" />
            <path d={`M${x0},${y0} C${x0 + sd * 200},${y0 + 40} ${x1 - sd * 260},${y1 - 160} ${x1},${y1}`} fill="none" stroke="#9C95D8" strokeWidth={14} />
            <path d={`M${x0},${y0} C${x0 + sd * 200},${y0 + 40} ${x1 - sd * 260},${y1 - 160} ${x1},${y1}`} fill="none" stroke="#D9D2F2" strokeWidth={4} opacity={0.6} transform="translate(-3 -4)" />
          </g>
        );
      })}
      {/* tweezers on the bench */}
      <path d="M820,1250 L1000,1190 M820,1258 L1000,1215" stroke="#CFC4F5" strokeWidth={8} strokeLinecap="round" />
      {/* the chip */}
      <circle cx={CHIP_C[0]} cy={CHIP_C[1]} r={420} fill={fixed >= ERRS.length - 2 ? "url(#glowGold)" : nErr > 2 ? "url(#glowCoral)" : "url(#glowTeal)"} opacity={0.55} />
      {/* "breakthrough": the errors spread and the chip's light flares coral */}
      {fr >= f(AW.errMore) && fr < fixAt(2) + 10 && <circle cx={CHIP_C[0]} cy={CHIP_C[1]} r={520 + 120 * Math.exp(-(fr - f(AW.errMore)) / 6)} fill="url(#glowCoral)" opacity={0.85 * (1 - prog(fr, fixAt(2), 10))} />}
      <WillowChip fr={fr} x={CHIP_C[0]} y={CHIP_C[1]} s={CHIP_C_S} k={CHIP_K} qubit={qubit} />
      {/* the errors: coral flicker glows over the faulty qubits */}
      {ERRS.map((k, i) => {
        if (fr < errOn(i) || fr >= fixAt(i)) return null;
        const [x, y] = qubitPos(k);
        const on = random(`er${k}${Math.floor(fr / 2)}`) > 0.35;
        return <g key={`e${k}`}><circle cx={x} cy={y} r={on ? 40 : 22} fill="url(#glowCoral)" opacity={on ? 1 : 0.5} />{on && <circle cx={x} cy={y} r={7} fill="#FFD2C8" />}</g>;
      })}
      {/* correction bursts */}
      {ERRS.map((k, i) => {
        const u = prog(fr, fixAt(i), 14);
        if (u <= 0 || u >= 1) return null;
        const [x, y] = qubitPos(k);
        return (
          <g key={k}>
            <ellipse cx={x} cy={y} rx={14 + 60 * u} ry={(14 + 60 * u) * CHIP_K} fill="none" stroke={C.goldHi} strokeWidth={6 * (1 - u) + 1} opacity={1 - u} />
            <Star x={x} y={y} s={26 * (1 - u)} c="#FFF6D8" />
          </g>
        );
      })}
      {/* AI network above, sending pulses into the chip */}
      {fr >= f(AW.net) && (
        <g>
          {ERRS.map((k, i) => {
            const fx = fixAt(i), t0 = fx - 12;
            const [qx, qy] = qubitPos(k);
            const m: [number, number] = [(out[0] + qx) / 2 + 80, Math.min(out[1], qy) - 40];
            const d = `M${out[0]},${out[1]} Q${m[0]},${m[1]} ${qx},${qy}`;
            const u = prog(fr, t0, 12, easeIn);
            const fade = 1 - prog(fr, fx + 2, 10);
            if (fr < t0 || fade <= 0) return null;
            const px = (1 - u) ** 2 * out[0] + 2 * (1 - u) * u * m[0] + u * u * qx, py = (1 - u) ** 2 * out[1] + 2 * (1 - u) * u * m[1] + u * u * qy;
            return (
              <g key={k} opacity={fade}>
                <path d={d} fill="none" stroke={C.gold} strokeWidth={3} opacity={0.45} pathLength={1} strokeDasharray={`${u} 1`} />
                {u < 1 && <circle cx={px} cy={py} r={34} fill="url(#glowGold)" />}
                {u < 1 && <circle cx={px} cy={py} r={8} fill="#FFF6D8" />}
              </g>
            );
          })}
          <NeuralNet x={NET[0]} y={NET[1]} s={0.95} fr={fr} k={Math.min(1.05, netK)} grow={prog(fr, f(AW.net), 22, ease)} pulse={fr >= f(AW.pulse0) ? ((fr - f(AW.pulse0)) / 14) % 1 : 0} />
        </g>
      )}
      {/* honest tag */}
      <text x={NET[0] + 40} y={NET[1] + 228} textAnchor="middle" fontFamily={NUNITO} fontWeight={900} fontSize={40} fill={C.cream} stroke="#0E0A2E" strokeWidth={9} strokeLinejoin="round" style={{ paintOrder: "stroke" }} opacity={prog(fr, f(AW.tag), 10)} transform={`translate(0 ${(1 - prog(fr, f(AW.tag), 10, ease)) * 14})`}>
        AI-decoded <tspan fill={C.goldHi}>error correction</tspan>
      </text>
    </g>
  );
};

// ---------------- D. dawn at sea, the student ----------------
const waveD = (fr: number) => {
  const rise = prog(fr, f(AW.rise2) - 6, 26, ease);
  const H = lerp(380, 640, rise) + 150 * pop(fr, f(AW.surge), 10) + 0.5 * Math.max(0, fr - f(AW.rise2));
  return { cx: 300, cy: S_LINE - H };
};
const STUDENT_S = 0.95;
const studentAt = (fr: number) => {
  const w = waveD(fr), g = waveGeo(w.cx, w.cy, S_LINE);
  const [x, y] = g.lipAt(0.3);
  return { x: x - 10, y: y + 6, rot: -6 + 3 * Math.sin(fr * 0.09) };
};
const RAISE0 = f(AW.toss) - 9, TOSS = f(AW.toss);
const tossK = (fr: number) => interpolate(fr, [RAISE0 - 6, RAISE0, TOSS, TOSS + 8], [0, -0.25, 1, 0.55], { ...clamp, easing: easeInOut });
const camD = (fr: number): Cam => {
  const c = camAt(fr, [
    [SEA2, { x: 540, y: 900, zoom: 1.0 }],
    [f(AW.surge) - 2, { x: 520, y: 840, zoom: 1.03 }],
    [f(AW.surge) + 22, { x: 430, y: 470, zoom: 1.2 }, ease],
    [f(AW.look), { x: 420, y: 430, zoom: 1.24 }],
    [f(AW.look) + 10, { x: 410, y: 400, zoom: 1.32 }, ease],
    [TOSS, { x: 410, y: 395, zoom: 1.32 }],
    [f(AW.end), { x: 430, y: 120, zoom: 1.04 }, easeInOut],
  ]);
  const wq = 1 - prog(fr, SEA2, f(AW.whip1) - SEA2, ease);
  return { ...c, x: c.x - 900 * wq, rot: 0 };
};
const handWorld = (fr: number): [number, number] => {
  const st = studentAt(fr);
  const [hx, hy] = studentHand(Math.max(0, tossK(fr)));
  const r = (st.rot * Math.PI) / 180;
  const X = hx * STUDENT_S, Y = (hy + Math.sin(fr * 0.18) * 4) * STUDENT_S;
  return [st.x + X * Math.cos(r) - Y * Math.sin(r), st.y + X * Math.sin(r) + Y * Math.cos(r)];
};

const SeaScene2: React.FC<{ fr: number }> = ({ fr }) => {
  const w = waveD(fr), st = studentAt(fr);
  const surge = Math.max(0, 1 - Math.abs(fr - f(AW.surge) - 6) / 14);
  const held = fr < TOSS;
  const [hx, hy] = handWorld(fr);
  return (
    <g>
      <SeaWorld fr={fr} dawn={0.8} />
      <Wave id="d0" fr={fr} cx={880} cy={1060 - 30 * Math.sin(fr * 0.03)} S={1250} gold={0.4} foam={0.7} />
      <Wave id="d1" fr={fr} cx={w.cx} cy={w.cy} S={S_LINE} gold={0.9 + 0.4 * surge} />
      {/* spray thrown off the lip as it surges */}
      {(() => {
        const u = prog(fr, f(AW.surge), 26, ease);
        if (u <= 0 || u >= 1) return null;
        const g = waveGeo(w.cx, w.cy, S_LINE);
        return Array.from({ length: 28 }, (_, i) => {
          const [x, y] = g.lipAt(0.3 + 0.7 * random(`sg${i}`));
          const a = -Math.PI / 2 + (random(`sa${i}`) - 0.3) * 1.6, v = 120 + 260 * random(`sv2${i}`);
          return <circle key={i} cx={x + Math.cos(a) * v * u} cy={y + Math.sin(a) * v * u + 260 * u * u} r={(4 + 7 * random(`sr2${i}`)) * (1 - u * 0.5)} fill="#F2FBF8" opacity={0.9 * (1 - u)} />;
        });
      })()}
      {/* the coin's warm light on him */}
      <circle cx={hx} cy={hy} r={300} fill="url(#glowGold)" opacity={held ? 0.9 : 0.3} />
      <Student x={st.x} y={st.y} s={STUDENT_S} rot={st.rot} fr={fr} toss={Math.max(0, tossK(fr))} look={prog(fr, f(AW.look), 8, ease) * (1 - prog(fr, TOSS + 4, 10))} />
      {held && <BigCoin id="held" fr={fr} x={hx + 4} y={hy - 18} R={22} th={0.3 + 0.2 * Math.sin(fr * 0.1)} glow={0.9} sweep={-1} />}
      <Sparkles fr={fr} x={hx} y={hy} r={120} n={6} seed="held" />
      <Motes fr={fr} x={-100} y={300} w={1200} h={900} n={22} seed="sea2m" c="#FFE9B8" o={0.7} />
    </g>
  );
};

export const Aiwave: React.FC<SceneProps> = ({ fr }) => {
  if (fr < SEA) {
    const cam = camA(fr);
    const p = prog(fr, S0, f(AW.pull1) - S0, ease);
    const k = 0.5 + 0.35 * pop(fr, f(AW.turn0), 13);
    const hot = 1 - p; // the die's gold glow carried across the cut, cooling as we pull back
    const fly = prog(fr, f(AW.push0) - 6, SEA - f(AW.push0) + 6, easeInOut);
    const lift = 26 * prog(fr, f(AW.turn0), 14, ease);
    const chipXY: [number, number] = [lerp(CHIP_A[0], 600, fly), lerp(CHIP_A[1] - lift, 160, fly)];
    const chipS = 0.55 * (1 - 0.55 * fly);
    return (
      <EStage fr={fr} cam={cam} handheld={0.4}>
        <WillowDefs />
        <Study fr={fr} glow={{ x: CHIP_A[0], y: CHIP_A[1] - 60, r: 680, k: 0.75 + 0.5 * hot }} over={<Steam fr={fr} x={1030} y={1150} />}
          sky={<g><NightSky fr={fr} planet={false} /><g transform={`translate(${WIN.x} ${WIN.y}) scale(${Q_SEA}) translate(-540 -960)`}><SeaScene1 fr={fr} /></g></g>}>
          <ellipse cx={CHIP_A[0] + 20} cy={CHIP_A[1] + 70} rx={200} ry={30} fill="#120830" opacity={0.55} filter="url(#soft8)" />
          <WillowChip fr={fr} x={chipXY[0]} y={chipXY[1]} s={chipS} k={k - 0.2 * fly} glow={1 + hot} qubit={(i) => ({ glow: 0.6 + 0.3 * Math.sin(fr * 0.15 + i * 0.7) + 0.9 * hot, color: hot > 0.4 || i % 3 ? "#FFE9A8" : C.tealHi })} />
          <circle cx={chipXY[0]} cy={chipXY[1]} r={180} fill="url(#glowGold)" opacity={0.4 + 1.2 * hot + 0.6 * fly} />
          <Sparkles fr={fr} x={CHIP_A[0]} y={CHIP_A[1] - 60} r={200} n={8} seed="awA" />
          <Motes fr={fr} x={120} y={600} w={700} h={500} n={22} seed="awAm" />
        </Study>
      </EStage>
    );
  }
  if (fr < BENCH) {
    return (
      <EStage fr={fr} cam={camB(fr)} handheld={0.4}>
        <WillowDefs />
        <SeaScene1 fr={fr} />
      </EStage>
    );
  }
  if (fr < SEA2) {
    const wq = prog(fr, f(AW.whip0), SEA2 - f(AW.whip0), easeIn);
    return (
      <EStage fr={fr} cam={camC(fr)} handheld={0.4} shake={[shake(fr, f(AW.errMore), 9, 12)]}>
        <WillowDefs />
        <WhipDefs k={wq} id="whipA" vertical={false} />
        <g filter={wq > 0.02 ? "url(#whipA)" : undefined}>
          <LabBench fr={fr} />
        </g>
      </EStage>
    );
  }
  // D: dawn at sea; after the toss the coin flies toward camera in screen space
  const cam = camD(fr);
  const wq = 1 - prog(fr, SEA2, f(AW.whip1) - SEA2, ease);
  const u = prog(fr, TOSS, f(AW.end) - TOSS, (t) => t);
  const h0 = toScreen(camD(TOSS), handWorld(TOSS));
  const cx = lerp(h0[0], COIN_HANDOFF.x, 1 - (1 - u) ** 1.6);
  const cy = lerp(h0[1], COIN_HANDOFF.y, 1 - (1 - u) ** 2.2);
  const R = lerp(22 * 1.12, COIN_HANDOFF.R, u ** 1.7);
  return (
    <>
      <EStage fr={fr} cam={cam} handheld={0.4}>
        <WillowDefs />
        <WhipDefs k={wq} id="whipA2" vertical={false} />
        <g filter={wq > 0.02 ? "url(#whipA2)" : undefined}>
          <SeaScene2 fr={fr} />
        </g>
      </EStage>
      {fr >= TOSS && (
        <EStage fr={fr} cam={{ x: 540, y: 960, zoom: 1 }} handheld={0} bg={null}>
          <BigCoin id="toss" fr={fr} x={cx} y={cy} R={R} th={tossTh(fr / 30)} roll={-20 * (1 - u)} glow={1} />
        </EStage>
      )}
    </>
  );
};

