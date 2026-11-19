// Front overlays (over the real footage in FULL/FWD beats, inside the top band or the right column),
// plus the ending: the polaroid flies into the gold cube, the cube unfolds into the end card.
import React from "react";
import { OUTRO, smooth } from "../lib";
import { GoldCube, Sparkle } from "./cube";
import { Defs, HAND, INK, RED, SERIF, TAPE, TYPE, back, boil, lerp, pS, torn, twos } from "./kit";
import { B, HAND as HOFF, T } from "./T";
import { Hook } from "./caption";

// ---- the end-card geometry (shared with the Back end scene) ----
export const END = { x: 540, y: 900, e: 150, front: B.end.s + 0.85, unfold0: B.end.s + 1.0, unfold1: B.end.s + 1.3, card0: B.end.s + 1.25, card1: B.end.s + 1.55 };
const CARD_W = 900, CARD_H = 720;

const Note: React.FC<{ x: number; y: number; rot: number; s: number; text: string; fill?: string; size?: number }> = ({ x, y, rot, s, text, fill = "#fff1a8", size = 56 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${Math.max(0.01, s)})`} filter="url(#psh2)">
    <rect x={-150} y={-90} width={300} height={180} fill={fill} />
    <rect x={-150} y={-90} width={300} height={30} fill="#f3df7c" />
    <text textAnchor="middle" y={22} fontFamily={HAND} fontSize={size} fill={INK}>{text}</text>
  </g>
);
const Sticker: React.FC<{ x: number; y: number; rot: number; s: number; text: string; fill?: string; size?: number; color?: string }> = ({ x, y, rot, s, text, fill = RED, size = 54, color = "#fffaf0" }) => {
  const w = text.length * size * 0.55 + size * 1.2;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${Math.max(0.01, s)})`} filter="url(#psh2)">
      <rect x={-w / 2 - 10} y={-size * 0.95} width={w + 20} height={size * 1.9} rx={size * 0.95} fill="#fff" />
      <rect x={-w / 2} y={-size * 0.75} width={w} height={size * 1.5} rx={size * 0.75} fill={fill} />
      <text textAnchor="middle" y={size * 0.34} fontFamily={SERIF} fontSize={size} fill={color}>{text}</text>
    </g>
  );
};
// cut-paper question mark (red paper, white sticker edge)
const QMark: React.FC<{ x: number; y: number; s: number; rot?: number }> = ({ x, y, s, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${Math.max(0.01, s)})`} filter="url(#psh2)">
    <text textAnchor="middle" y={70} fontFamily={SERIF} fontSize={220} fill="#fff" stroke="#fff" strokeWidth={22} strokeLinejoin="round">?</text>
    <text textAnchor="middle" y={70} fontFamily={SERIF} fontSize={220} fill={RED}>?</text>
  </g>
);

export const PaperFront: React.FC<{ t: number; fr: number }> = ({ t }) => {
  const tt = twos(t);
  const els: React.ReactNode[] = [];
  // ---- beautiful + maybe: the cube beside him, then up beside the hypothesis note ----
  if (t > HOFF.outFull - 0.1 && t < B.books.s + 0.2) {
    const k1 = smooth((t - (HOFF.outFull - 0.1)) / 0.7);
    const toNote = smooth((t - (T.maybe - 0.1)) / 0.5);
    const exit = smooth((t - (B.books.s - 0.35)) / 0.45);
    const bx = lerp(740, 880, k1), by = lerp(1060, 760, k1) - Math.sin(k1 * Math.PI) * 60;
    const x = lerp(bx, 840, toNote) + exit * 400, y = lerp(by, 360, toNote) - exit * 200 + Math.sin(t * 1.8) * 8;
    const squash = 1 - 0.18 * Math.sin(Math.min(1, Math.max(0, (t - T.small1) / 0.4)) * Math.PI);
    const e = lerp(EB, 78, toNote) * (1 - 0.15 * Math.sin(Math.min(1, Math.max(0, (t - T.small1) / 0.9)) * Math.PI));
    const pop = back((t - (HOFF.outFull - 0.15)) / 0.3, 2);
    els.push(<GoldCube key="cb" x={x} y={y} e={e * Math.min(1, Math.max(0.01, pop))} yaw={(t - 31) * 18} squash={squash} glow={0.35} />);
    const sp = t > T.came && t < T.came + 0.6 ? Math.sin(((t - T.came) / 0.6) * Math.PI) : 0;
    els.push(<Sparkle key="cbs" x={x + 60} y={y - 70} s={sp} r={34} />);
    els.push(<Sparkle key="cbs2" x={x - 70} y={y - 20} s={sp * 0.7} r={22} rot={15} />);
  }
  if (t > T.maybe - 0.15 && t < B.books.s + 0.2) {
    const s = back((tt - (T.maybe - 0.1)) / 0.3, 2.4), exit = smooth((t - (B.books.s - 0.35)) / 0.4);
    els.push(<Note key="hyp" x={380 - exit * 700} y={350} rot={-4} s={s} text="a hypothesis" />);
    // red question marks drawn by hand on "questions"
    [0, 1].map((i) => {
      const p = pS(t, T.questions1 - 0.1 + i * 0.2, 0.3);
      if (p > 0) els.push(<text key={`q${i}`} x={600 + i * 80 - exit * 700} y={330 + i * 60} fontFamily={HAND} fontSize={(110 - i * 25) * back(p, 2)} fill={RED} transform={`rotate(${10 + i * 8} ${600 + i * 80} ${330 + i * 60})`}>?</text>);
    });
  }
  // ---- amazing: the cube sparkles once beside him ----
  if (t > B.amazing.s + 0.2 && t < B.question.s + 0.4) {
    const s = back((tt - (T.amazing - 0.15)) / 0.35, 2), out = smooth((t - (B.question.s - 0.1)) / 0.4);
    const sp = t > T.pops - 0.05 && t < T.pops + 0.7 ? Math.sin(((t - T.pops + 0.05) / 0.75) * Math.PI) : 0;
    if (s > 0.01) {
      els.push(<GoldCube key="am" x={880} y={760 + Math.sin(t * 1.6) * 8} e={EB * Math.max(0.01, s) * (1 - out) * (1 + 0.12 * sp)} yaw={(t - 87) * 20} glow={0.35 + sp} squash={1 - 0.15 * sp} />);
      [0, 1, 2, 3, 4].forEach((i) => els.push(<Sparkle key={`ams${i}`} x={880 + Math.cos(i * 1.26) * (70 + 60 * sp)} y={760 + Math.sin(i * 1.26) * (70 + 60 * sp)} s={sp * (i % 2 ? 0.7 : 1)} r={28} rot={i * 20} />));
    }
  }
  // ---- question: a single cut-paper "?" in the top band ----
  if (t > T.question - 0.2 && t < B.cosmos.s + 0.1) {
    const s = back((tt - (T.question - 0.1)) / 0.35, 2.4);
    const small = smooth((tt - T.soSmall) / 0.3) * (1 - smooth((tt - (T.reality1 - 0.1)) / 0.35));
    const out = smooth((t - (B.cosmos.s - 0.35)) / 0.35);
    els.push(<QMark key="qm" x={540 + boil("qm", tt, 2)} y={340 - out * 400} s={s * (1 - 0.5 * small)} rot={-6 + Math.sin(t * 1.3) * 4} />);
  }
  // ---- agi: cube by his shoulder + tag "open question" ----
  if (t > B.agi.s - 0.1 && t < B.cta1.s + 0.4) {
    const s = back((tt - (B.agi.s + 0.05)) / 0.35, 2), out = smooth((t - (B.cta1.s - 0.1)) / 0.4);
    const x = 840 + out * 400, y = 820 + Math.sin(t * 1.7) * 7;
    els.push(<GoldCube key="ag" x={x} y={y} e={EB * Math.max(0.01, s)} yaw={(t - 127) * 20} glow={0.35} />);
    const tag = back((tt - (T.agi2 - 0.1)) / 0.3, 2);
    if (tag > 0.01) els.push(<g key="agt" transform={`translate(${x - 10} ${y + 120}) rotate(${-6 + Math.sin(t * 2.2) * 4}) scale(${tag})`}>
      <line x1={0} y1={-60} x2={0} y2={-24} stroke="#8a6a3a" strokeWidth={2.5} />
      <g filter="url(#psh)"><path d={torn(250, 56, "oqt", "lr", 3)} fill="#fffaf0" /><text textAnchor="middle" y={10} fontFamily={TYPE} fontSize={30} fill={INK}>open question</text></g>
    </g>);
  }
  // ---- cta1: masking-tape lower third in the top band ----
  if (t > T.random - 0.3 && t < B.cta2.s + 0.4) {
    const k = smooth((tt - (T.random - 0.2)) / 0.45), out = smooth((t - (B.cta2.s - 0.2)) / 0.45);
    const w = 860 * k;
    const ul = pS(t, T.curiosity, 0.4);
    els.push(<g key="tape" transform={`translate(${110 - out * 1100} 330) rotate(-2)`}>
      <clipPath id="tapeclip"><rect x={-20} y={-60} width={w + 20} height={120} /></clipPath>
      <g clipPath="url(#tapeclip)" filter="url(#psh)">
        <path d={torn(860, 96, "cta1", "lr", 5)} transform="translate(430 0)" fill={TAPE} opacity={0.93} />
        <text x={430} y={16} textAnchor="middle" fontFamily={TYPE} fontSize={48} fill={INK}>Random thoughts with Madhav</text>
      </g>
      {ul > 0 && <path d="M 80 56 Q 430 70 780 50" stroke={RED} strokeWidth={7} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ul} />}
    </g>);
  }
  // ---- cta3: stickers pop in the top band ----
  if (t > B.cta3.s && t < B.end.s + 0.3) {
    const out = smooth((t - (B.end.s - 0.4)) / 0.5);
    const a = back((tt - (T.scientists + 0.4)) / 0.3, 2.4), b = back((tt - (T.engineers - 0.05)) / 0.3, 2.4), q = back((tt - (T.questions2 - 0.1)) / 0.3, 2.4);
    if (a > 0.01) els.push(<Sticker key="sc" x={300} y={330 - out * 500} rot={-6} s={a} text="+ scientists" />);
    if (b > 0.01) els.push(<Sticker key="en" x={760} y={420 - out * 500} rot={5} s={b} text="+ engineers" fill="#2f5fb3" />);
    if (q > 0.01) els.push(<QMark key="q3" x={880 + out * 400} y={700} s={q * 0.7} rot={10 + Math.sin(t * 1.5) * 5} />);
    const ex = pS(t, T.excited - 0.05, 0.4);
    if (ex > 0 && out < 1) [0, 1, 2, 3, 4, 5].forEach((i) => els.push(<Sparkle key={`ex${i}`} x={880 + Math.cos(i * 1.05) * 140 * ex} y={700 + Math.sin(i * 1.05) * 140 * ex} s={Math.sin(ex * Math.PI)} r={24} rot={i * 15} />));
  }
  // ---- end: the cube (in front of the shrinking polaroid) unfolds into the end card ----
  if (t >= END.front) {
    const gulp = Math.sin(Math.min(1, Math.max(0, (t - END.front) / 0.15)) * Math.PI) * 0.15;
    const u = smooth((t - END.unfold0) / (END.unfold1 - END.unfold0));
    const c = smooth((t - END.card0) / (END.card1 - END.card0));
    const settle = t > END.card1 ? 1 + 0.02 * Math.exp(-(t - END.card1) * 25) * Math.cos((t - END.card1) * 50) : 1;
    const cw = lerp(END.e, CARD_W, c) * (c > 0.99 ? settle : 1), ch = lerp(END.e, CARD_H, c) * (c > 0.99 ? settle : 1);
    const yawEnd = endYaw(END.front);
    els.push(<g key="end">
      {c < 1 && <g transform={`translate(${END.x} ${END.y}) scale(${1 - 0.5 * c}) translate(${-END.x} ${-END.y})`}>
        <GoldCube x={END.x} y={END.y} e={END.e} yaw={lerp(yawEnd, 0, u)} pitch={lerp(-24, 0, u)} unfold={u} squash={1 - gulp} glow={0.6 * (1 - c)} shadow={u < 0.3} />
      </g>}
      {c > 0 && <g transform={`translate(${END.x} ${END.y})`}>
        <g filter="url(#psh2)">
          <rect x={-cw / 2} y={-ch / 2} width={cw} height={ch} fill="#d9a520" />
          <rect x={-cw / 2 + 12} y={-ch / 2 + 12} width={Math.max(0, cw - 24)} height={Math.max(0, ch - 24)} fill="#fffdf6" />
        </g>
        {/* folded gold corner */}
        <path d={`M${cw / 2 - 90 * c},${-ch / 2} L${cw / 2},${-ch / 2} L${cw / 2},${-ch / 2 + 90 * c} Z`} fill="#f2c94c" />
        <path d={`M${cw / 2 - 90 * c},${-ch / 2} L${cw / 2},${-ch / 2 + 90 * c}`} stroke="#a8780f" strokeWidth={2} />
        {c > 0.6 && <g opacity={1} transform={`scale(${lerp(0.6, 1, smooth((c - 0.6) / 0.4))})`}>
          <text y={-170} textAnchor="middle" fontFamily={SERIF} fontSize={86} fill={INK}>Is intelligence</text>
          <text y={-66} textAnchor="middle" fontFamily={SERIF} fontSize={86} fill={INK}>just <tspan fill={RED}>compression?</tspan></text>
          <path d="M -60 -30 Q 120 -16 330 -34" stroke={RED} strokeWidth={9} fill="none" strokeLinecap="round" />
          <line x1={-300} y1={36} x2={300} y2={36} stroke="#d9a520" strokeWidth={3} />
          {/* the spoken outro ("Follow for more AI news") underlines Follow, then pops the handle */}
          <text y={118} textAnchor="middle" fontFamily={TYPE} fontSize={42} fill={INK}>Follow for more AI news</text>
          {(() => { const k = pS(t, OUTRO.t, 0.45); return k > 0 && <path d="M -262 140 Q -200 150 -128 138" stroke={RED} strokeWidth={7} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - k} />; })()}
          {(() => { const pulse = Math.sin(smooth((t - (OUTRO.t + 1.0)) / 0.45) * Math.PI); return (
            <g transform={`translate(0 222) rotate(-2) scale(${1 + 0.12 * pulse})`}>
              <path d={torn(470, 84, "endtape", "lr", 5)} fill={TAPE} opacity={0.95} />
              <text y={16} textAnchor="middle" fontFamily={TYPE} fontSize={50} fill={RED}>@madhav_somani</text>
            </g>); })()}
        </g>}
      </g>}
    </g>);
  }
  return (
    <>
      <Hook t={t} />
      {els.length > 0 && <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}><Defs />{els}</svg>}
    </>
  );
};
const EB = 96; // cube edge beside him in FULL beats
export const endYaw = (t: number) => (t - B.end.s) * 30 + 30;
export { HOFF };
