// algebra + practice + nn on a notebook page: x + y = z inked, x and z circled "given", y = ?; practice
// cards pile up; y = z − x rearranged by moving the symbols; WORKS stamp; then the symbols peel off as nodes.
import React from "react";
import { smooth } from "../lib";
import { Card, Defs, HAND, INK, RED, BLUE, Stamp, back, boil, circlePath, lerp, pS, rnd, twos } from "./kit";
import { B, T } from "./T";

const SLOT = [190, 365, 540, 715, 890];
const EQ_Y = 740;           // algebra baseline centre
const CARD = { x: 540, y: 600, w: 920, h: 300 }; // practice equation card
// nodes of the network the symbols become (OUT, nn beat)
const NCOLS = [3, 5, 5, 3];
export const NN_NODES = NCOLS.flatMap((n, c) => Array.from({ length: n }, (_, j) => ({ c, j, x: 150 + c * 260, y: 430 + ((j + 0.5) / n) * 760 })));
// which node each symbol becomes: y, =, z, −, x  -> middle layers
const SYM_NODE = [4, 6, 10, 12, 9];
export const NN_END = B.recall.s - 0.15; // nodes start collapsing into the cube

// a symbol written on with a left-to-right reveal
const Written: React.FC<{ ch: string; x: number; y: number; size: number; p: number; color?: string; id: string }> = ({ ch, x, y, size, p, color = INK, id }) => {
  if (p <= 0) return null;
  const w = Math.max(1, ch.length) * size * 0.5 + size * 0.3;
  return (
    <g>
      <clipPath id={id}><rect x={x - w / 2} y={y - size} width={w * p} height={size * 1.4} /></clipPath>
      <text x={x} y={y + size * 0.3} textAnchor="middle" fontFamily={HAND} fontSize={size} fill={color} clipPath={`url(#${id})`}>{ch}</text>
    </g>
  );
};

const PRACTICE = ["2 + y = 5  →  y = 3", "7 + y = 10  →  y = 3", "4 + y = 9  →  y = 5"];

const NotebookPage: React.FC<{ t: number }> = () => (
  <g>
    <rect x={-40} y={-40} width={1160} height={2000} fill="url(#plined)" />
    <line x1={140} y1={-40} x2={140} y2={1960} stroke={RED} strokeOpacity={0.5} strokeWidth={3} />
    {[260, 960, 1660].map((y) => <circle key={y} cx={56} cy={y} r={22} fill="#d9cdb4" stroke="#bfb196" strokeWidth={2} />)}
    <text x={180} y={318} fontFamily={HAND} fontSize={64} fill={BLUE} transform="rotate(-2 180 318)">Algebra</text>
    <path d="M180,334 Q300,346 420,330" stroke={BLUE} strokeWidth={4} fill="none" />
    {/* margin doodles */}
    <path d="M86,520 l10,-24 l10,24 l-24,-15 h28 z" fill="none" stroke={BLUE} strokeWidth={3} />
    <path d={Array.from({ length: 40 }, (_, i) => `${i ? "L" : "M"}${(96 + Math.cos(i * 0.5) * i * 0.6).toFixed(1)},${(1300 + Math.sin(i * 0.5) * i * 0.6).toFixed(1)}`).join("")} fill="none" stroke={BLUE} strokeWidth={2.5} />
    <g opacity={0.3}><circle cx={930} cy={1380} r={80} fill="none" stroke="#9a6b3a" strokeWidth={8} /></g>
    <g transform="translate(560 1640) rotate(-12)" filter="url(#psh)">
      <rect x={0} y={-9} width={300} height={18} fill="#f2b632" /><rect x={300} y={-9} width={26} height={18} fill="#c8c8c8" /><rect x={326} y={-9} width={22} height={18} rx={4} fill="#e88b8b" />
      <path d="M0,-9 L-34,0 L0,9 Z" fill="#e8c9a0" /><path d="M-24,-3 L-34,0 L-24,3 Z" fill="#333" />
    </g>
    <path d="M 860 250 l 120 -10 l 4 40 l -120 10 z" fill="#f7d774" opacity={0.8} />
  </g>
);

export const NotebookScene: React.FC<{ t: number; fr: number }> = ({ t }) => {
  const tt = twos(t);
  // page turns in over the books (free edge sweeps right -> left)
  const turn = smooth((t - (B.algebra.s - 0.3)) / 0.65);
  const edge = lerp(1180, -60, turn);
  const curlW = 80 * Math.sin(Math.min(1, turn) * Math.PI);
  // page leaves (pulled down) as recall begins
  const leave = smooth((t - (B.recall.s - 0.25)) / 0.6);
  const camS = 1 + 0.02 * Math.sin(t * 0.2), camY = Math.cos(t * 0.15) * 6;
  // ---- algebra ----
  const algOut = smooth((t - (T.doIt - 0.1)) / 0.5); // the algebra fades under the practice cards: it slides up & shrinks
  const w = (at: number) => pS(t, at, 0.22);
  const toks = ["x", "+", "y", "=", "z"];
  const tokAt = [T.x1, T.x1 + 0.18, T.plusY - 0.05, T.plusY + 0.2, T.z1 - 0.1];
  // ---- practice ----
  const cards = [
    ...PRACTICE.map((s, i) => ({ s, at: [T.doIt + 0.3, T.findIt, T.practiced][i] })),
    ...Array.from({ length: 9 }, (_, i) => ({ s: PRACTICE[i % 3], at: T.readMuch + i * 0.16 })),
  ];
  const pileOut = smooth((t - (T.equation - 0.2)) / 0.5);
  const eqIn = back((tt - (T.equation - 0.05)) / 0.4, 1.6);
  // rearrangement: stage 1 (move the Y), stage 2 (Z on the left side)
  const s1 = smooth((tt - T.moveY) / 0.7), s2 = smooth((tt - (T.zLeft - 0.05)) / 0.8);
  const ul = pS(t, T.leftSide + 0.4, 0.35);
  // ---- nn: symbols peel off and become nodes ----
  const peel = smooth((tt - (T.howBeautiful - 0.05)) / 0.7);
  const cardFall = smooth((t - (T.howBeautiful + 0.1)) / 0.6);
  const threads = pS(t, T.recog - 0.1, 0.9);
  const more = (i: number) => back((tt - (T.thatsHow - 0.1) - i * 0.04) / 0.3, 2);
  const fire = (c: number) => t > T.nnWorks + c * 0.18 && t < T.nnWorks + c * 0.18 + 0.5;
  const collapse = smooth((t - NN_END) / 0.55);
  const CUBE_AT = { x: 700, y: 560 };
  // token positions in the practice card (slot index over time)
  const slotPos = (from: number, to: number, k: number, arc: number) => ({ x: lerp(SLOT[from], SLOT[to], k), y: -Math.sin(k * Math.PI) * arc });
  const sym = (): { ch: string; x: number; y: number; rot?: number }[] => {
    const y = slotPos(2, 0, s1, 150);
    const xDown = { x: SLOT[0], y: 150 * s1 };
    const x = s2 > 0 ? { x: lerp(SLOT[0], SLOT[4], s2), y: lerp(150, 0, s2) + Math.sin(s2 * Math.PI) * 90 } : xDown;
    const eq = slotPos(3, 1, s2, -40), z = slotPos(4, 2, s2, 140), pl = slotPos(1, 3, s2, -60);
    return [
      { ch: "y", ...y }, { ch: "=", ...eq }, { ch: "z", ...z },
      { ch: s2 > 0.5 ? "−" : "+", ...pl, rot: s2 > 0.25 && s2 < 0.75 ? 90 * Math.sin((s2 - 0.25) * 2 * Math.PI) : 0 }, { ch: "x", ...x },
    ];
  };
  const S = sym();
  const showPractice = t > B.practice.s - 0.4;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <Defs />
      <clipPath id="nbturn"><path d={`M${edge},-100 L1200,-100 L1200,2100 L${edge + 30},2100 Z`} /></clipPath>
      {/* shadow the turning page casts on the books */}
      {turn < 1 && <rect x={edge - 60} y={-100} width={80} height={2200} fill="#2a1f12" opacity={0.25 * Math.sin(turn * Math.PI)} filter="url(#psmudge)" />}
      <g clipPath={turn < 1 ? "url(#nbturn)" : undefined}>
        <g transform={`translate(0 ${leave * leave * 2000}) rotate(${leave * 4} 540 0)`}>
          <g transform={`translate(540 ${960 + camY}) scale(${camS}) translate(-540 -960)`}>
            <NotebookPage t={t} />
            {/* algebra */}
            {eqIn < 0.6 && <g transform={`translate(540 ${EQ_Y}) scale(${1 - 0.55 * algOut}) translate(-540 ${-EQ_Y - algOut * 800})`}>
              {toks.map((c, i) => <Written key={i} ch={c} x={SLOT[i]} y={EQ_Y} size={270} p={w(tokAt[i])} id={`al${i}`} />)}
              {[0, 4].map((i, j) => {
                const at = j ? T.zg : T.xg, p = pS(t, at - 0.05, 0.3);
                return p > 0 && <g key={i}>
                  <path d={circlePath(SLOT[i], EQ_Y - 25, 100, 122, `ac${i}`)} fill="none" stroke={RED} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
                  <Written ch="given" x={SLOT[i] + (j ? -10 : 10)} y={EQ_Y + 200} size={80} p={pS(t, T.given + j * 0.12, 0.3)} color={RED} id={`gv${i}`} />
                </g>;
              })}
              <Written ch="y =" x={440} y={EQ_Y + 420} size={200} p={pS(t, T.find, 0.45)} id="yq1" />
              <Written ch="?" x={650} y={EQ_Y + 420} size={230} p={pS(t, T.valY - 0.1, 0.25)} color={RED} id="yq2" />
              {/* y in the equation gets a blue ring when asked */}
              {t > T.find && <path d={circlePath(SLOT[2], EQ_Y - 25, 90, 112, "ayq")} fill="none" stroke={BLUE} strokeWidth={6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pS(t, T.find + 0.1, 0.3)} />}
            </g>}
          </g>
          {/* practice cards pile up */}
          {showPractice && cards.map((c, i) => {
            if (tt < c.at - 0.05) return null;
            const k = back((tt - c.at + 0.05) / 0.3, 1.7);
            const px = 560 + (rnd(`pcx${i}`) - 0.5) * 520, py = 820 + (rnd(`pcy${i}`) - 0.5) * 480 - i * 6;
            const fromX = 1400, fromY = py - 200;
            const x = lerp(fromX, px, Math.min(1, k)) + pileOut * 900, y = lerp(fromY, py, Math.min(1, k)) + pileOut * 300;
            return pileOut < 1 && <Card key={i} x={x} y={y} w={540} h={220} rot={(rnd(`pcr${i}`) - 0.5) * 22 + (1 - Math.min(1, k)) * 20}>
              <text x={270} y={146} textAnchor="middle" fontFamily={HAND} fontSize={72} fill={i < 3 ? INK : "#3a3550"}>{c.s}</text>
            </Card>;
          })}
          {/* the equation card: rearranged by moving the symbols */}
          {eqIn > 0.01 && <g transform={`translate(0 ${cardFall * cardFall * 1500}) rotate(${cardFall * 6} 540 600)`}>
            <g transform={`translate(${CARD.x} ${CARD.y - (1 - Math.min(1, eqIn)) * 900}) rotate(${-1.5 + (1 - Math.min(1, eqIn)) * 8})`}>
              <Card x={0} y={0} w={CARD.w} h={CARD.h} lines={false} />
              {peel < 0.02 && S.map((s, i) => <text key={i} transform={`translate(${s.x - 540} ${s.y + 62}) rotate(${s.rot ?? 0} 0 -50)`} textAnchor="middle" fontFamily={HAND} fontSize={170} fill={i === 0 && s1 > 0 && s1 < 1 ? RED : INK}>{s.ch}</text>)}
              {ul > 0 && peel < 0.02 && <path d={`M${SLOT[0] - 540 - 60},110 Q0,125 ${SLOT[4] - 540 + 60},104`} stroke={RED} strokeWidth={9} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ul} />}
            </g>
            {t < T.howBeautiful + 0.3 && <Stamp x={800} y={880} t={t} at={T.works + 0.2} lines={["WORKS"]} size={64} rot={-10} />}
          </g>}
          {/* nn: the symbols become nodes, joined by thread */}
          {peel > 0 && <g transform={`translate(${CUBE_AT.x} ${CUBE_AT.y}) scale(${1 - collapse}) translate(${-CUBE_AT.x} ${-CUBE_AT.y})`}>
            {threads > 0 && NN_NODES.map((a, i) => NN_NODES.filter((b) => b.c === a.c + 1).map((b, j) => {
              const k = Math.max(0, Math.min(1, threads * 3 - a.c));
              return <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={lerp(a.x, b.x, k)} y2={lerp(a.y, b.y, k)} stroke={fire(a.c) ? RED : "#8a6a3a"} strokeWidth={fire(a.c) ? 3.5 : 2} opacity={0.8} />;
            }))}
            {NN_NODES.map((n, i) => {
              const si = SYM_NODE.indexOf(i);
              let x = n.x, y = n.y, s = 1, label = "";
              if (si >= 0) {
                const sp = S[si], sx = CARD.x + sp.x - 540, sy = CARD.y + sp.y;
                x = lerp(sx, n.x, peel) + Math.sin(peel * Math.PI) * 60; y = lerp(sy, n.y, peel) - Math.sin(peel * Math.PI) * 120; s = lerp(1.8, 1, peel); label = sp.ch;
              } else {
                s = Math.max(0, more(i));
                if (s <= 0.01) return null;
              }
              const hot = fire(n.c);
              return <g key={i} transform={`translate(${x + boil(`n${i}`, tt, 1)} ${y}) scale(${s})`} filter="url(#psh)">
                <circle r={50} fill={hot ? "#ffe9e2" : "#fffaf0"} stroke={hot ? RED : INK} strokeWidth={hot ? 6 : 4} />
                {label && <text y={26} textAnchor="middle" fontFamily={HAND} fontSize={78} fill={hot ? RED : INK}>{label}</text>}
              </g>;
            })}
          </g>}
        </g>
      </g>
      {/* the curling edge of the turning page */}
      {turn > 0 && turn < 1 && <rect x={edge - 2} y={-100} width={curlW} height={2200} fill="url(#pcurl)" opacity={0.95} />}
    </svg>
  );
};
