// recall: the gold cube centre-right; question cards fly in, answer cards come out and stack up;
// on "everything" a fourth card comes back ink-smudged and gets stamped LOSSY.
import React from "react";
import { smooth } from "../lib";
import { GoldCube, Sparkle } from "./cube";
import { Dressing } from "./dressing";
import { BgImage, Card, Defs, HAND, IMG, INK, RED, Stamp, TYPE, back, boil, lerp, pS, twos } from "./kit";
import { B, T } from "./T";

export const RC = { x: 700, y: 560, e: 120 };
const Q = [
  { q: "Gandhiji's birthday?", a: "2 Oct 1869", qAt: T.gandhi - 0.1, aAt: T.there1 - 0.05 },
  { q: "Distance: Sun to Moon?", a: "~150 million km", note: "about the Earth-Sun distance; it varies", qAt: T.distance - 0.1, aAt: T.there2 - 0.05 },
  { q: "Capital of China?", a: "Beijing", qAt: T.capital - 0.1, aAt: T.there3 - 0.1 },
];
const SLOTS = [{ x: 790, y: 800 }, { x: 770, y: 925 }, { x: 795, y: 1050 }];
const QSLOTS = [{ x: 260, y: 640 }, { x: 250, y: 790 }, { x: 265, y: 940 }];
const LOSSY = { x: 700, y: 1110, at: T.everything - 0.05 };

export const RecallScene: React.FC<{ t: number; fr: number }> = ({ t }) => {
  const tt = twos(t);
  const cubeIn = back((tt - (B.recall.s + 0.25)) / 0.35, 2.2);
  const inGulp = Q.map((q) => q.qAt + 1.0);
  const gulp = inGulp.reduce((s, a) => s + (t > a && t < a + 0.3 ? Math.sin(((t - a) / 0.3) * Math.PI) * 0.18 : 0), 0);
  const think = t > T.china && t < Q[2].aAt ? boil("rk", tt, 3) : 0;
  const pulse = Math.max(0, ...[...Q.map((q) => q.aAt), T.twoTB].map((a) => (t > a && t < a + 0.5 ? Math.sin(((t - a) / 0.5) * Math.PI) : 0)));
  const camX = Math.sin(t * 0.18) * 7, camS = 1 + 0.025 * smooth((t - B.recall.s) / 12);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <Defs />
      <BgImage src={IMG.board} t={t} dx={30} />
      <Dressing spots={[{ x: 700, y: 1650, rot: -16, kind: 0 }, { x: 80, y: 340, rot: 6, kind: 3 }, { x: 1010, y: 300, rot: 90, kind: 4 }, { x: 60, y: 1050, rot: 0, kind: 2 }]} sticky="ask it!" />
      <g transform={`translate(${540 + camX} 900) scale(${camS}) translate(-540 -900)`}>
        {cubeIn > 0.01 && <GoldCube x={RC.x + think} y={RC.y} e={RC.e * Math.min(1.1, cubeIn)} yaw={30 + (t - B.recall.s) * 9} squash={1 - gulp} glow={0.75 + 0.35 * pulse} />}
        <Sparkle x={RC.x + 80} y={RC.y - 90} s={pulse} r={34} />
        <Sparkle x={RC.x - 90} y={RC.y + 40} s={pulse * 0.7} r={22} rot={20} />
        {/* answer cards (they stay, so each is readable well past 1.5 s) */}
        {Q.map((q, i) => {
          if (tt < q.aAt) return null;
          const k = smooth((tt - q.aAt) / 0.45), s = back((tt - q.aAt) / 0.45, 1.8);
          const x = lerp(RC.x, SLOTS[i].x, k), y = lerp(RC.y, SLOTS[i].y, k) - Math.sin(k * Math.PI) * 80;
          return <Card key={i} x={x} y={y} w={430} h={q.note ? 128 : 104} s={0.3 + 0.7 * Math.max(0, s)} rot={(i - 1) * 2.5 + (1 - k) * 12} lines={false} fill={i === 1 ? "#fffdf6" : "#fff8e6"}>
            <rect x={0} y={0} width={10} height={q.note ? 128 : 104} fill="#d9a520" />
            <text x={205} y={q.note ? 64 : 70} textAnchor="middle" fontFamily={TYPE} fontSize={46} fill={INK}>{q.a}</text>
            {q.note && <text x={205} y={104} textAnchor="middle" fontFamily={TYPE} fontSize={18} fill="#4c4658">{q.note}</text>}
          </Card>;
        })}
        {/* question cards: in from the left, pinned in the left column; a red thread runs card -> cube -> answer */}
        {Q.map((q, i) => {
          if (tt < q.qAt) return null;
          const enter = back((tt - q.qAt) / 0.35, 1.6);
          const slot = QSLOTS[i];
          const x = lerp(-320, slot.x, Math.min(1, enter)), y = slot.y - (1 - Math.min(1, enter)) * 60;
          const th1 = pS(t, q.qAt + 0.45, 0.45), th2 = pS(t, q.aAt, 0.4);
          return <g key={i}>
            {th1 > 0 && <path d={`M${slot.x + 190},${slot.y} Q${(slot.x + RC.x) / 2 + 40},${slot.y - 160} ${RC.x - 50},${RC.y + 30}`} fill="none" stroke={RED} strokeWidth={3.5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - th1} />}
            {th2 > 0 && <path d={`M${RC.x + 40},${RC.y + 60} Q${SLOTS[i].x + 120},${(RC.y + SLOTS[i].y) / 2} ${SLOTS[i].x + 160},${SLOTS[i].y - 40}`} fill="none" stroke={RED} strokeWidth={3.5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - th2} />}
            <Card x={x} y={y} w={400} h={96} rot={-3 + i * 2 + (1 - Math.min(1, enter)) * -10} lines={false} fill="#dfeefb">
              <text x={200} y={60} textAnchor="middle" fontFamily={TYPE} fontSize={31} fill={INK}>{q.q}</text>
            </Card>
            {/* a paper copy of the question flies into the cube */}
            {tt > q.qAt + 0.35 && tt < q.qAt + 1.05 && (() => {
              const go = smooth((tt - q.qAt - 0.35) / 0.65);
              return <Card x={lerp(slot.x, RC.x, go)} y={lerp(slot.y, RC.y, go) - Math.sin(go * Math.PI) * 120} w={400} h={96} s={1 - 0.92 * go} rot={go * 40} lines={false} fill="#eef5fd">
                <text x={200} y={60} textAnchor="middle" fontFamily={TYPE} fontSize={31} fill={INK}>{q.q}</text>
              </Card>;
            })()}
          </g>;
        })}
        {/* the lossy card */}
        {tt > LOSSY.at && (() => {
          const k = smooth((tt - LOSSY.at) / 0.45), s = back((tt - LOSSY.at) / 0.45, 1.8);
          const x = lerp(RC.x, LOSSY.x, k), y = lerp(RC.y, LOSSY.y, k) - Math.sin(k * Math.PI) * 120;
          return <g>
            <Card x={x} y={y} w={460} h={130} s={0.3 + 0.7 * Math.max(0, s)} rot={-5 + (1 - k) * -14} lines={false} fill="#f3ecdd">
              <g filter="url(#psmudge)" opacity={0.45}>
                <text x={220} y={88} textAnchor="middle" fontFamily={HAND} fontSize={58} fill="#4a4458">Be?jng ... km ?</text>
                <ellipse cx={260} cy={80} rx={120} ry={34} fill="#5a5468" opacity={0.25} />
              </g>
              <path d="M40,120 C140,100 260,140 400,108" stroke="#5a5468" strokeWidth={14} opacity={0.25} fill="none" filter="url(#psmudge)" />
            </Card>
            <Stamp x={LOSSY.x} y={LOSSY.y} t={t} at={LOSSY.at + 0.55} lines={["LOSSY:", "models can misremember"]} size={36} rot={-7} paper />
          </g>;
        })()}
      </g>
    </svg>
  );
};
