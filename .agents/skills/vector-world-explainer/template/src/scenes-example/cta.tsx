import React from "react";

import { easeIn, easeInOut, ease, f, lerp, pop, prog, type SceneProps } from "../lib";
import { camAt, shake, type Key } from "../kit/camera";
import { C, COND, NUNITO } from "../kit/palette";
import { NightSky, Sparkles } from "../kit/room";
import { Motes, Steam } from "../kit/life";
import { BigCoin, EStage, coinRoll, coinTurn } from "./kit/endkit";
import { FlatCoin } from "../kit/coin";
import { TopicCoin } from "./kit/aiwave-kit";
import { WillowDefs } from "./kit/hook-kit";
import { Study } from "./stage";
import { K } from "./cta-events";
import { COIN_HANDOFF, tossTh } from "./aiwave-events";

// CTA (109.08-115.2): the gold coin the student tossed (aiwave) tumbles down into the study and lands
// upright on the table, its face the chip die with the film's maze; "keep learning" lights the maze's
// solution; "next big breakthroughs" puts three small topic coins on wall ledges beside it (an AI
// chip, the quantum chip, a mystery "?"); "follow" slams FOLLOW in above the coin. Madhav (right,
// drawn by Film.tsx) leaves at 113.95 and the end card holds, alive but still: glint, motes, steam.

// Where the coin stands in the study (world) and the study camera (also used by the ending act).
export const COIN_W = { x: 400, y: 790, R: 250 };
export const STUDY_CAM = { x: 540, y: 1060, zoom: 1 };
export const STUDY_HH = 0.4;

// The study as the coin's backdrop: its light washes the wall and pools on the table.
export const CoinStudyWorld: React.FC<{ fr: number; glowK?: number; children?: React.ReactNode }> = ({ fr, glowK = 1, children }) => (
  <Study fr={fr} glow={{ x: COIN_W.x, y: COIN_W.y, r: 780, k: glowK }} sky={<NightSky fr={fr} />} over={<Steam fr={fr} x={1030} y={1168} />}>
    {/* contact shadow of the standing coin on the table */}
    <ellipse cx={COIN_W.x + 30} cy={1046} rx={230} ry={20} fill="#120830" opacity={0.55 * glowK} filter="url(#soft8)" />
    {children}
  </Study>
);

// the topic ledges (world): x, coin centre y
const LEDGE_X = 870;
const TOPICS: { y: number; icon: "ai" | "q" | "?"; at: number }[] = [
  { y: 560, icon: "ai", at: K.topic1 },
  { y: 735, icon: "q", at: K.topic2 },
  { y: 910, icon: "?", at: K.topic3 },
];
const TR = 64;

export const Cta: React.FC<SceneProps> = ({ fr }) => {
  const t0 = f(K.start), tl = f(K.land);
  // camera: identical to STUDY_CAM at the cut (the coin's screen position matches aiwave's last frame)
  const keys: Key[] = [
    [t0, STUDY_CAM],
    [tl + 2, { x: 540, y: 1050, zoom: 1.02 }],
    [f(K.pan), { x: 545, y: 1045, zoom: 1.03 }],
    [f(K.pan) + 24, { x: 600, y: 1040, zoom: 1.0 }],
    [f(K.follow) - 2, { x: 600, y: 1035, zoom: 1.02 }],
    [f(K.settle), { x: 600, y: 1030, zoom: 1.0 }],
    [f(K.hold), { x: 580, y: 960, zoom: 1.08 }, easeInOut],
  ];
  const cam = camAt(fr, keys);

  // the drop: from the hand-off point (screen -> world at STUDY_CAM) to standing on the table
  const startW: [number, number] = [COIN_HANDOFF.x, COIN_HANDOFF.y + (STUDY_CAM.y - 960)];
  const d = prog(fr, t0, tl - t0, easeIn);
  const bounce = fr >= tl ? 26 * Math.exp(-(fr - tl) / 5) * Math.abs(Math.sin((fr - tl) * 0.42)) : 0;
  const squash = fr >= tl ? 0.06 * Math.exp(-(fr - tl) / 3) : 0;
  const hitDip = 10 * Math.sin(Math.PI * prog(fr, f(K.hit) - 2, 7)) * (fr < f(K.follow) + 2 ? 1 : 0);
  const followHop = fr >= f(K.follow) ? 18 * Math.exp(-(fr - f(K.follow)) / 5) * Math.abs(Math.sin((fr - f(K.follow)) * 0.5)) : 0;
  const R = lerp(COIN_HANDOFF.R, COIN_W.R, d);
  const cx = lerp(startW[0], COIN_W.x, d), cy = lerp(startW[1], COIN_W.y, d) - bounce + hitDip - followHop + R * squash;
  const settleK = prog(fr, tl, 16, easeInOut);
  const th = lerp(tossTh(fr / 30), coinTurn(fr), settleK);
  const roll = lerp(-14 * Math.sin(Math.PI * d), coinRoll(fr), settleK);
  const lit = 0.25 + 0.75 * prog(fr, f(K.learn), 26, easeInOut);
  const sw1 = prog(fr, f(K.sweep), 18, easeInOut), sw2 = prog(fr, f(K.glint), 20, easeInOut);
  const sweep = sw1 > 0 && sw1 < 1 ? sw1 : sw2 > 0 && sw2 < 1 ? sw2 : -1;
  const landFlash = fr >= tl ? Math.exp(-(fr - tl) / 7) : 0;

  // FOLLOW lands on the word
  const fk = pop(fr, f(K.follow) - 4, 11);
  const fo = Math.min(1, Math.max(0, (fr - (f(K.follow) - 4)) / 3));
  const hk = prog(fr, f(K.handle), 9, ease);
  const lab = prog(fr, f(K.label), 10);
  const shakes = [shake(fr, tl, 10, 14), shake(fr, f(K.follow), 8, 12)];
  return (
    <>
      <EStage fr={fr} cam={cam} handheld={STUDY_HH} shake={shakes}>
        <WillowDefs />
        <CoinStudyWorld fr={fr} glowK={0.55 + 0.45 * d + 0.4 * landFlash + 0.2 * fo}>
          {/* FOLLOW's warm light on the wall above the coin */}
          <ellipse cx={COIN_W.x} cy={500} rx={430} ry={160} fill="url(#glowGold)" opacity={0.6 * fo} />
          {/* dust puff where it lands */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const u = prog(fr, tl, 22, ease);
            if (u <= 0 || u >= 1) return null;
            const s = i % 2 ? 1 : -1;
            return <circle key={i} cx={COIN_W.x + s * (60 + 140 * u + i * 20)} cy={1035 - 30 * u * (i % 3)} r={14 + 22 * u} fill="#CFC4F5" opacity={0.35 * (1 - u)} />;
          })}
          {/* topic ledges with their coins */}
          {TOPICS.map((tp, i) => {
            const k = pop(fr, f(tp.at), 12);
            const ledge = prog(fr, f(tp.at) - 6, 8, ease);
            if (ledge <= 0) return null;
            const wob = fr >= f(tp.at) ? 0.25 * Math.exp(-(fr - f(tp.at)) / 12) * Math.sin((fr - f(tp.at)) * 0.5) : 0;
            return (
              <g key={i}>
                <ellipse cx={LEDGE_X + 10} cy={tp.y + TR + 24} rx={110 * ledge} ry={14} fill="#120830" opacity={0.4} filter="url(#soft4)" />
                <rect x={LEDGE_X - 95 * ledge} y={tp.y + TR} width={190 * ledge} height={16} rx={6} fill="#5A3A8E" />
                <rect x={LEDGE_X - 95 * ledge} y={tp.y + TR} width={190 * ledge} height={5} rx={2.5} fill="#8C6AD0" />
                <path d={`M${LEDGE_X - 60},${tp.y + TR + 16} l0,26 l26,-26Z M${LEDGE_X + 60},${tp.y + TR + 16} l0,26 l-26,-26Z`} fill="#B07A2E" opacity={ledge} />
                {k > 0.01 && (
                  <g transform={`translate(${LEDGE_X} ${tp.y + TR}) scale(${Math.min(1.15, k)}) translate(${-LEDGE_X} ${-(tp.y + TR)})`}>
                    <TopicCoin x={LEDGE_X} y={tp.y} R={TR} icon={tp.icon} th={0.28 + 0.12 * Math.sin(fr * 0.05 + i * 1.7) + wob} fr={fr} lit={0.8} />
                  </g>
                )}
              </g>
            );
          })}
          <g fontFamily={COND} fontWeight={800} textAnchor="middle" opacity={lab} transform={`translate(0 ${(1 - lab) * 16})`}>
            <text x={LEDGE_X} y={420} fontSize={46} letterSpacing={2 + 4 * (1 - lab)} fill={C.cream}>NEXT BIG</text>
            <text x={LEDGE_X} y={468} fontSize={46} letterSpacing={2 + 4 * (1 - lab)} fill={C.goldHi}>BREAKTHROUGHS</text>
          </g>
          {/* the film's row of coins (bits, qubit), lying on the table in the big coin's light */}
          {[1, 0, 1, 1, 0, 1].map((b, i) => (
            <FlatCoin key={i} x={150 + i * 92} y={1135 + Math.abs(i - 2.5) * 8} r={38} k={0.42} face={b as 0 | 1} rimGlow={0.5} dim={0.1} />
          ))}
          <Sparkles fr={fr} x={COIN_W.x} y={COIN_W.y} r={400} n={14} seed="cta" />
          <Motes fr={fr} x={60} y={300} w={900} h={700} n={26} seed="ctam" />
          <BigCoin id="cta" fr={fr} x={cx} y={cy} R={R} th={th} roll={roll} sweep={sweep} lit={lit} glow={1 + 0.5 * landFlash} />
          {/* landing ring on the table */}
          {landFlash > 0.05 && <ellipse cx={COIN_W.x} cy={1040} rx={180 + 260 * (1 - landFlash)} ry={26 + 30 * (1 - landFlash)} fill="none" stroke={C.goldHi} strokeWidth={8 * landFlash} opacity={landFlash} />}
          {/* FOLLOW, over the coin's light */}
          <g transform={`translate(${COIN_W.x} 410) scale(${0.55 + 0.45 * fk}) translate(${-COIN_W.x} -410)`} opacity={fo}>
            <text x={COIN_W.x} y={440} textAnchor="middle" fontFamily={COND} fontWeight={800} fontSize={176} letterSpacing={4} fill="#5B3410" opacity={0.35} transform="translate(5 8)">FOLLOW</text>
            <text x={COIN_W.x} y={440} textAnchor="middle" fontFamily={COND} fontWeight={800} fontSize={176} letterSpacing={4} fill={C.cream} style={{ filter: "drop-shadow(0 0 24px rgba(255,203,87,0.75))" }}>FOLLOW</text>
          </g>
          {/* the handle under FOLLOW */}
          <text x={COIN_W.x} y={500 + (1 - hk) * 14} textAnchor="middle" fontFamily={NUNITO} fontWeight={800} fontSize={38} letterSpacing={0.5} fill={C.cream} stroke="#2A1440" strokeWidth={8} strokeLinejoin="round" style={{ paintOrder: "stroke" }} opacity={hk}>@madhav_somani</text>
          {fr >= f(K.follow) && fr < f(K.follow) + 14 && (
            <ellipse cx={COIN_W.x} cy={420} rx={300 + 240 * prog(fr, f(K.follow), 14)} ry={90 + 60 * prog(fr, f(K.follow), 14)} fill="none" stroke={C.goldHi} strokeWidth={6} opacity={1 - prog(fr, f(K.follow), 14)} />
          )}
        </CoinStudyWorld>
      </EStage>
    </>
  );
};
