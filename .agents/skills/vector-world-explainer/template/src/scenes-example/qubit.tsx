import React from "react";
import { interpolate } from "remotion";
import { f, mix, pop, prog, ease, easeIn, easeInOut, clamp, type SceneProps } from "../lib";
import { FlatCoin, SpinArcs, SpinCoin } from "../kit/coin";
import { C, NUNITO, Star } from "../kit/palette";
import { Sparkles } from "../kit/room";
import { camAt, type Key } from "../kit/camera";
import { Motes, Steam, WhipDefs } from "../kit/life";
import { Hand } from "./kit/aiwave-kit";
import { Stage, Study } from "./stage";
import { Laptop } from "../kit/props";
import { QUBIT } from "./qubit-events";

// Qubit: the same coin (tails up, matched from bits) rattles, is flicked up onto its edge and spins
// up to a steady spin: the axis precesses, the contact point skitters on the desk, its shadow
// moves. "It's when you do the operation while they're still spinning": two coins from the row hop
// up and spin too; a hand reaches in and taps the top of the spinning coin (a gate): a teal pulse
// flows into it, its axis leans and its 0 face turns teal, and it keeps spinning; a second tap sends
// pulses along links into the two small coins (a gate on several qubits). Gold and teal light sweep
// the room on "heads"/"tails"; ripples on "superposition". Ends with a whip-tilt down onto the desk
// top (myth starts with the same momentum).
const CX = 600, R = 235, FLOOR = 1165; // contact line on the desk; standing centre = FLOOR - R
export const WHIP_DOWN = 1150; // world px the camera travels down during the whip (myth continues it)

// the row of small coins left on the desk by bits; two of them (3, 4) hop up and spin
const ROW = [1, 0, 1, 1, 0].map((b, i) => ({ b: b as 0 | 1, x: 640 + i * 82, y: 1095 + i * 4 }));
const SMALL = [{ i: 3, hop: QUBIT.hop1, r: 58, w: 0.55 }, { i: 4, hop: QUBIT.hop2, r: 58, w: 0.5 }];

// damped wobble after an impulse at frame g
const kick = (fr: number, g: number, decay = 14, freq = 0.45) => (fr < g ? 0 : Math.exp(-(fr - g) / decay) * Math.sin((fr - g) * freq));
const impulse = (fr: number, g: number, decay = 4) => (fr < g ? 0 : Math.exp(-(fr - g) / decay));

export const Qubit: React.FC<SceneProps> = ({ fr }) => {
  const ts = f(QUBIT.flick), te = f(QUBIT.end), tw = f(QUBIT.whipOut), sup = f(QUBIT.superposition);
  const g1 = f(QUBIT.gate1), g2 = f(QUBIT.gate2);
  const up = prog(fr, ts, 12, ease);
  // angular speed ramps up over ~1 s (speed-up), then holds: phi = integral of the ramp.
  const spinT = Math.max(0, fr - ts);
  const w = 0.62, ramp = 30;
  const phi = Math.PI + (spinT < ramp ? (w * spinT * spinT) / (2 * ramp) : w * (ramp / 2) + w * (spinT - ramp));
  const blur = Math.min(1, spinT / 26);
  // precession: the axis wobbles round, big just after the flick, settling to a steady small wobble;
  // each gate tap kicks it (a damped wobble) and leaves the axis leaning a little differently
  const prec = spinT * 0.16;
  const A = 4 + 10 * Math.exp(-spinT / 40) + 4 * impulse(fr, g1, 30) + 4 * impulse(fr, g2, 30);
  const lean = 6 * prog(fr, g1, 12) - 9 * prog(fr, g2, 12) + 3 * prog(fr, f(QUBIT.blend), 30);
  const tilt = A * Math.sin(prec) + lean + 10 * kick(fr, g1) + 8 * kick(fr, g2);
  const dip = 9 * impulse(fr, g1) + 9 * impulse(fr, g2);
  const contact: [number, number] = [CX + 18 * Math.cos(prec) * (A / 14), FLOOR + 6 * Math.sin(prec)];
  const tr = (tilt * Math.PI) / 180;
  const Rr = R - dip * 0.4;
  const centre: [number, number] = [contact[0] + Rr * Math.sin(tr), contact[1] - Rr * Math.cos(tr)];
  const top: [number, number] = [contact[0] + 2 * Rr * Math.sin(tr), contact[1] - 2 * Rr * Math.cos(tr)];
  // before the flick: lying flat, tails up (as bits left it); "that coin" -> it rattles
  const rat = fr >= f(QUBIT.rattle) && fr < ts ? Math.sin((fr - f(QUBIT.rattle)) * 1.7) * (0.5 + 0.5 * prog(fr, f(QUBIT.rattle), 14)) : 0;
  const yFlat = 1290 + (centre[1] - 1290) * up;
  const blendK = prog(fr, f(QUBIT.blend), 20);
  const sweepH = Math.max(0, 1 - Math.abs(fr - f(QUBIT.heads) - 4) / 10);
  const sweepT = Math.max(0, 1 - Math.abs(fr - f(QUBIT.tails) - 4) / 10);
  const flash = 0.5 * impulse(fr, g1, 6) + 0.5 * impulse(fr, g2, 6);
  const glowK = mix(fr, [[f(QUBIT.start), 0.95], [ts, 0.8], [ts + 14, 1], [sup, 1.1]]) + 0.4 * sweepH;
  // the coin's faces after the gates: 0 face teal after tap 1, the 1 face partly teal after tap 2
  const tint0 = 0.55 * prog(fr, g1 + 2, 8), tint1 = 0.14 * prog(fr, g2 + 2, 8);
  const whip = prog(fr, tw, te - tw, easeIn);

  // the hand: distance of the fingertip back along the arm from the coin's top (px)
  const hIn = f(QUBIT.handIn), hReady = f(QUBIT.handReady), hOut = f(QUBIT.handOut), hGone = f(QUBIT.handGone);
  const hd = interpolate(fr, [hIn, hReady, g1 - 6, g1, g1 + 10, g2 - 6, g2, g2 + 10, hOut, hGone], [1150, 80, 120, -3, 60, 110, -3, 60, 70, 1150], { ...clamp, easing: easeInOut });
  const ha = 16 - 4 * prog(fr, hReady, 20) + 3 * impulse(fr, g1, 5) + 3 * impulse(fr, g2, 5);
  const har = (ha * Math.PI) / 180;
  const tip: [number, number] = [top[0] + 10 + Math.cos(har) * hd, top[1] - 4 + Math.sin(har) * hd];

  const keys: Key[] = [
    [f(QUBIT.start), { x: 560, y: 1040, zoom: 1.08 }],
    [f(QUBIT.rattle), { x: 570, y: 1060, zoom: 1.14 }],
    [ts + 4, { x: 575, y: 1040, zoom: 1.12 }],
    [ts + 30, { x: 585, y: 990, zoom: 1.02 }],
    [hReady, { x: 640, y: 960, zoom: 0.98 }],
    [g1 + 4, { x: 620, y: 930, zoom: 1.06 }],
    [g2 + 6, { x: 660, y: 965, zoom: 0.97 }],
    [hGone + 4, { x: 600, y: 975, zoom: 1.03 }],
    [f(QUBIT.same), { x: 600, y: 960, zoom: 1.16 }],
    [sup, { x: 610, y: 960, zoom: 0.98 }],
    [tw, { x: 610, y: 980, zoom: 1.0 }],
    [te, { x: 610, y: 980 + WHIP_DOWN, zoom: 1.04 }, easeIn],
  ];
  const cam = camAt(fr, keys);

  // small coins: hop up from the row onto their edges and spin
  const small = SMALL.map((s, j) => {
    const row = ROW[s.i];
    const h0 = f(s.hop);
    const u = prog(fr, h0, 10, ease);
    const t = Math.max(0, fr - h0);
    const arrive = g2 + 9 + j * 3;
    const wob = 9 * Math.sin(t * 0.13 + j * 2) * 0.5 + 12 * kick(fr, arrive, 12, 0.5);
    const r = 34 + (s.r - 34) * u;
    const hop = Math.sin(Math.PI * u) * 60;
    const tt = (wob * Math.PI) / 180;
    const cx = row.x + r * Math.sin(tt), cy = row.y + 10 - r * Math.cos(tt) * u - hop;
    return { ...s, row, u, cx, cy, r, phi: t * s.w + j * 1.3, wob, arrive, tint: 0.7 * prog(fr, arrive, 8), hop0: h0 };
  });

  // a coin's teal tint, in its own tilted frame
  const tint = (x: number, y: number, r: number, ph: number, t0: number, t1: number, tl: number) => {
    const c = Math.cos(ph), k = c < 0 ? t0 : t1;
    return k > 0 ? (
      <g transform={`translate(${x} ${y}) rotate(${tl})`}>
        <ellipse rx={Math.max(r * Math.abs(c), 1.5)} ry={r} fill={C.teal} opacity={k} style={{ mixBlendMode: "color" }} />
        <ellipse rx={Math.max(r * Math.abs(c), 1.5)} ry={r} fill={C.tealHi} opacity={k * 0.25} style={{ mixBlendMode: "screen" }} />
      </g>
    ) : null;
  };

  return (
    <Stage fr={fr} cam={cam} handheld={0.5}>
      <WhipDefs k={whip} id="whipQ" />
      <g filter={whip > 0.02 ? "url(#whipQ)" : undefined}>
        <Study fr={fr} glow={{ x: CX, y: up > 0 ? centre[1] : 1150, r: 620, kind: sweepT > 0.3 || (fr > g1 && fr < g1 + 12) || (blendK > 0.5 && Math.sin(phi) > 0.6) ? "Teal" : "Gold", k: glowK + flash }} over={<Steam fr={fr} x={1030} y={1150} />}>
          {/* room sweeps: the spinning coin throws gold, then teal light across the wall */}
          <ellipse cx={200 + 700 * prog(fr, f(QUBIT.heads) - 4, 18)} cy={560} rx={260} ry={420} fill="url(#glowGold)" opacity={sweepH} />
          <ellipse cx={900 - 700 * prog(fr, f(QUBIT.tails) - 4, 18)} cy={560} rx={260} ry={420} fill="url(#glowTeal)" opacity={sweepT} />
          {/* the laptop stays on the desk from bits (continuity across the cut) */}
          <g opacity={0.9}><Laptop fr={fr} x={250} y={1090} s={0.5} /></g>
          {ROW.map((c, i) => {
            const s = small.find((q) => q.i === i);
            if (s && s.u > 0) return null;
            return <FlatCoin key={i} x={c.x} y={c.y} r={34} k={0.42} face={c.b} rimGlow={0.4} dim={0.15} />;
          })}
          {/* the small coins spinning beside it */}
          {small.map((s, j) =>
            s.u > 0 ? (
              <g key={j}>
                <ellipse cx={s.row.x + 6} cy={s.row.y + 12} rx={s.r * 0.7} ry={8} fill="#120830" opacity={0.5 * s.u} filter="url(#soft4)" />
                <SpinCoin x={s.cx} y={s.cy} r={s.r} phi={s.phi} blur={Math.min(1, (fr - s.hop0) / 12)} dphi={0.4} tilt={s.wob} />
                {tint(s.cx, s.cy, s.r, s.phi, s.tint, s.tint * 0.4, s.wob)}
                <circle cx={s.cx} cy={s.cy} r={s.r * 1.8} fill="url(#glowTeal)" opacity={0.8 * impulse(fr, s.arrive, 8)} />
              </g>
            ) : null,
          )}
          {/* superposition ripples across the desk */}
          {[0, 1, 2, 3].map((i) => {
            const k = prog(fr, sup + i * 9, 50);
            return k > 0 && k < 1 ? (
              <ellipse key={i} cx={contact[0]} cy={FLOOR + 10} rx={60 + k * 620} ry={18 + k * 170} fill="none" stroke={i % 2 ? C.tealHi : C.goldHi} strokeWidth={10 * (1 - k) + 2} opacity={(1 - k) * 0.9} />
            ) : null;
          })}
          {up < 1 ? (
            <g transform={`translate(${CX} ${yFlat}) rotate(${rat * 2.5})`}>
              <ellipse cx={20} cy={46 + 60 * up} rx={180 - 100 * up} ry={40 - 24 * up} fill="#120830" opacity={0.5} filter="url(#soft8)" />
              {/* identical to bits' last frame at up = 0 (r 170, k 0.5), rising onto its edge */}
              <FlatCoin x={0} y={0} r={170 + (R - 170) * up} k={0.5 + 0.5 * up + rat * 0.04} face={0} shadow={false} />
            </g>
          ) : (
            <>
              {/* contact shadow: under the contact point, thrown away from the tilt, flickering with the turn */}
              <ellipse cx={contact[0] - tilt * 3 + 16} cy={contact[1] + 4} rx={(60 + 70 * Math.abs(Math.cos(phi))) * (1 + Math.abs(tilt) / 30)} ry={14} fill="#120830" opacity={0.55} filter="url(#soft4)" />
              <ellipse cx={contact[0]} cy={contact[1]} rx={22} ry={5} fill={C.goldHi} opacity={0.5 + 0.3 * Math.sin(fr * 1.3)} />
              <SpinCoin x={centre[0]} y={centre[1]} r={Rr} phi={phi} blur={blur} dphi={0.45} tilt={tilt} />
              {tint(centre[0], centre[1], Rr, phi, tint0, tint1, tilt)}
              <SpinArcs x={centre[0]} y={centre[1]} r={Rr} fr={fr} o={blur} tilt={tilt} />
              <circle cx={centre[0]} cy={centre[1]} r={R + 30} fill="url(#glowTeal)" opacity={0.45 * blendK * (0.6 + 0.4 * Math.sin(phi)) + 0.25 * (tint0 + tint1) * (0.5 + 0.5 * Math.sin(phi * 0.5))} />
            </>
          )}
          {/* gate links: on the second tap, teal pulses run from the big coin into both small coins */}
          {small.map((s, j) => {
            const k = prog(fr, g2 + 1, 9 + j * 3, ease);
            const o = 1 - prog(fr, g2 + 22, 14);
            if (k <= 0 || o <= 0) return null;
            const a: [number, number] = [centre[0] + R * 0.35, centre[1] - R * 0.1];
            const b: [number, number] = [s.cx, s.cy];
            const m: [number, number] = [(a[0] + b[0]) / 2 + 20, Math.min(a[1], b[1]) - 150 - j * 50];
            const pt = (t: number): [number, number] => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * m[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * m[1] + t * t * b[1]];
            const [px, py] = pt(k);
            return (
              <g key={j} opacity={o}>
                <path d={`M${a[0]},${a[1]} Q${m[0]},${m[1]} ${b[0]},${b[1]}`} fill="none" stroke={C.teal} strokeWidth={14} opacity={0.35} pathLength={1} strokeDasharray={`${k} 1`} />
                <path d={`M${a[0]},${a[1]} Q${m[0]},${m[1]} ${b[0]},${b[1]}`} fill="none" stroke={C.tealHi} strokeWidth={5} pathLength={1} strokeDasharray={`${k} 1`} strokeLinecap="round" />
                {k < 1 && <circle cx={px} cy={py} r={40} fill="url(#glowTeal)" />}
                {k < 1 && <circle cx={px} cy={py} r={9} fill="#E9FFFA" />}
              </g>
            );
          })}
          {/* the gate's teal pulse ring, flowing INTO the coin from the fingertip */}
          {up >= 1 && [g1, g2].map((g, i) => {
            const k = prog(fr, g, 12, ease);
            return k > 0 && k < 1 ? (
              <g key={i}>
                <ellipse cx={centre[0]} cy={centre[1]} rx={(R + 160) * (1 - 0.75 * k)} ry={(R + 160) * (1 - 0.75 * k)} fill="none" stroke={C.tealHi} strokeWidth={6 + 14 * k} opacity={0.85 * (1 - k * k)} transform={`rotate(${tilt} ${centre[0]} ${centre[1]})`} />
                <circle cx={top[0]} cy={top[1]} r={90 * (1 - k) + 20} fill="url(#glowTeal)" opacity={1 - k} />
                <Star x={top[0] + 6} y={top[1] - 6} s={34 * (1 - k)} c="#E9FFFA" />
              </g>
            ) : null;
          })}
          {/* superposition: a soft sphere of both faces at once */}
          <circle cx={centre[0]} cy={centre[1]} r={R + 40} fill="url(#glowTeal)" opacity={0.6 * prog(fr, sup - 6, 20)} />
          <circle cx={centre[0]} cy={centre[1]} r={(R + 50) * (0.9 + 0.1 * prog(fr, sup - 6, 20))} fill="none" stroke={C.tealHi} strokeWidth={3} opacity={0.5 * prog(fr, sup - 6, 20)} />
          {small.map((s, j) => (
            <circle key={j} cx={s.cx} cy={s.cy} r={s.r * 1.5} fill="none" stroke={C.tealHi} strokeWidth={2} opacity={0.45 * prog(fr, sup - 2 + j * 3, 16)} />
          ))}
          <Sparkles fr={fr} x={CX} y={centre[1]} r={340} n={12} seed="qb" />
          <Motes fr={fr} x={260} y={560} w={700} h={600} n={26} seed="qm" />
          {/* the hand that does the operation */}
          {hd < 1100 && <Hand x={tip[0]} y={tip[1]} a={ha} s={1.15} />}
          {/* the step named: a tap on a spinning coin = a gate (an operation) */}
          {(() => {
            const k = pop(fr, g1 - 1, 12), o = prog(fr, g1 - 1, 4) * (1 - prog(fr, hGone - 6, 8));
            if (o <= 0) return null;
            const lx = 560, ly = 455;
            return (
              <g opacity={o} transform={`translate(${lx} ${ly}) scale(${0.7 + 0.3 * Math.min(1.1, k)}) translate(${-lx} ${-ly})`} fontFamily={NUNITO} textAnchor="middle">
                <ellipse cx={lx} cy={ly - 14} rx={250} ry={60} fill="url(#glowTeal)" opacity={0.5 + 0.4 * impulse(fr, g2, 8)} />
                <text x={lx} y={ly} fontWeight={900} fontSize={42} fill={C.tealHi} stroke="#0E1240" strokeWidth={8} strokeLinejoin="round" style={{ paintOrder: "stroke" }}>gate = an operation</text>
                <path d={`M${lx - 150},${ly + 18} Q${lx},${ly + 30} ${lx + 150},${ly + 18}`} fill="none" stroke={C.teal} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={`${prog(fr, g1 + 2, 10)} 1`} />
              </g>
            );
          })()}
          <g fontFamily={NUNITO} textAnchor="middle">
            <text x={880} y={560} fontWeight={900} fontSize={44} fill="#F3EEFF" letterSpacing={6 + 8 * (1 - prog(fr, f(QUBIT.label), 14))} opacity={prog(fr, f(QUBIT.label), 10)}>QUBIT</text>
          </g>
        </Study>
      </g>
    </Stage>
  );
};
