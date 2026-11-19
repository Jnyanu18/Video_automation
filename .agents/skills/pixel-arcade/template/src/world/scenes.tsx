// v3 screens. He is always the still cut-out bottom-left (box x 0-713, y 653-1920, face x 90-370 y 940-1240).
// Graphics live in the TOP BAND (y 228-630, x 81-999) and the RIGHT COLUMN (x 561-939, y 640-1180).
// Calm rules: one primary motion at a time, no perpetual bob/blink/drift, pops settle fast.
import React from "react";
import { random } from "remotion";
import { OUTRO, lerp, popS, progS, smooth, ease } from "../lib";
import { T } from "./timing";
import {
  C, CART, COIN, CROWN, FIGHTER_IDLE, FIGHTER_PUNCH, FLAG, HEART, PLAYER, QBLOCK,
  PxBar, PxPanel, PxText, Sprite, coinPal, crownPal, fighterPal, heartPal, qPal,
} from "./px";

const snap = (v: number, g = 9) => Math.round(v / g) * g;
const COL = { x: 561, y: 640, w: 378, h: 540 }; // right column
const CX = COL.x + COL.w / 2;
const appear = (t: number, at: number) => (t < at ? 0 : Math.min(1, popS(t, at, 14) * 1.6));
const slideIn = (t: number, at: number) => `translate(${snap((1 - popS(t, at, 14)) * 40)} 0)`;

// ---------- backdrop: static starfield + neon floor behind him ----------
export const Backdrop: React.FC<{ tint?: string }> = ({ tint = C.mag }) => {
  const hz = 1260;
  return (
    <g>
      <rect x={0} y={0} width={1080} height={1920} fill={C.bg} />
      <rect x={0} y={hz - 300} width={1080} height={300} fill={tint} opacity={0.07} />
      <rect x={0} y={hz} width={1080} height={1920 - hz} fill="#12041c" />
      {Array.from({ length: 80 }, (_, i) => {
        const big = random(`sb${i}`) > 0.85;
        return <rect key={i} x={snap(random(`sx${i}`) * 1080)} y={snap(random(`sy${i}`) * 1250)} width={big ? 9 : 5} height={big ? 9 : 5} fill={i % 7 === 0 ? C.blue : i % 5 === 0 ? C.yellow : "#cfd3ff"} opacity={big ? 0.85 : 0.5} />;
      })}
      {Array.from({ length: 21 }, (_, k) => <line key={`v${k}`} x1={540 + (k - 10) * 20} y1={hz} x2={540 + (k - 10) * 160} y2={1920} stroke={tint} strokeWidth={5} opacity={0.5} />)}
      {Array.from({ length: 10 }, (_, j) => {
        const p = (j + 0.5) / 10;
        return <rect key={`h${j}`} x={0} y={snap(hz + Math.pow(p, 2.2) * (1920 - hz), 3)} width={1080} height={Math.max(3, Math.round(p * 9))} fill={tint} opacity={0.55 * Math.min(1, p * 3)} />;
      })}
      <rect x={0} y={hz - 3} width={1080} height={6} fill={tint} opacity={0.9} filter="url(#bloom)" />
    </g>
  );
};

// diagonal split background for the fight beat (full bleed, behind him)
export const SplitBg: React.FC = () => {
  let left = "";
  for (let y = 0; y < 1920; y += 18) { const w = snap(560 + (960 - y) * 0.22, 18); left += `M0 ${y}h${w}v18h${-w}z`; }
  return (
    <g>
      <rect x={0} y={0} width={1080} height={1920} fill={C.psDark} />
      <path d={left} fill={C.xboxDark} />
      {Array.from({ length: 16 }, (_, i) => {
        const y = snap(150 + random(`vy${i}`) * 1700), len = snap(90 + random(`vl${i}`) * 200), L = i % 2 === 0;
        const x = snap(random(`vx${i}`) * 400);
        return <rect key={i} x={L ? x : 1080 - x - len} y={y} width={len} height={9} fill={L ? C.green : C.blue} opacity={0.25} />;
      })}
    </g>
  );
};

// PLAYER 1 frame behind his cut-out
export const P1Frame: React.FC<{ label?: string }> = ({ label = "P1 MADHAV" }) => (
  <g>
    <rect x={45} y={780} width={486} height={1200} fill={C.panel2} opacity={0.92} />
    {Array.from({ length: 13 }, (_, i) => <rect key={i} x={54} y={810 + i * 90} width={468} height={4} fill={C.green} opacity={0.12} />)}
    <path fill={C.green} d="M36 780h504v9h-504z M36 789h9v1131h-9z M531 789h9v1131h-9z" />
    <rect x={36} y={708} width={378} height={72} fill={C.green} />
    <PxText x={60} y={726} s={6} text={label} fill="#000" shadow={null} />
  </g>
);

// ================= 1. HOOK (0 - ceo) =================
export const Hook: React.FC<{ t: number }> = ({ t }) => {
  const swap = T.labs + 0.44; // ~3.2 s: hook headline -> news question card
  const k2 = appear(t, swap);
  const items: [number, React.ReactNode][] = [
    [-1, (
      <g>
        <Sprite rows={CROWN} pal={crownPal} x={588} y={712} s={6} />
        <PxText x={660} y={708} s={6} text="NEW CEO" fill={C.yellow} glow />
      </g>
    )],
    [T.gp - 0.05, (
      <g>
        <PxText x={588} y={800} s={6} text="GAME PASS" fill={C.white} />
        <PxText x={588} y={858} s={8} text="PRICE ↓" fill={C.green} glow />
      </g>
    )],
    [T.labs - 0.05, (
      <g>
        <PxText x={588} y={960} s={6} text="XBOX LABS" fill={C.white} />
        <PxText x={588} y={1018} s={7} text="UNLOCKED" fill={C.blue} glow />
      </g>
    )],
  ];
  return (
    <g>
      {t < swap + 0.15 && (
        <g opacity={t < swap ? 1 : 1 - progS(t, swap, 0.15)}>
          <PxText x={540} y={250} s={10} text="IS XBOX LOSING" fill={C.white} align="center" outline="#000" />
          <PxText x={540} y={350} s={9} text="TO PLAYSTATION?" fill={C.blue} align="center" outline="#000" glow />
          <PxText x={540} y={455} s={7} text="HERE'S MY TAKE." fill={C.green} align="center" outline="#000" glow />
        </g>
      )}
      {t >= swap && (
        <g opacity={k2}>
          <PxPanel x={81} y={232} w={918} h={330} color={C.red} fill={C.panel} />
          <rect x={90} y={241} width={900} height={72} fill={C.red} />
          <PxText x={540} y={259} s={5} text="GAME NEWS · 2026" fill={C.white} align="center" shadow={null} />
          <PxText x={540} y={352} s={9} text="WHAT'S HAPPENING" fill={C.white} align="center" />
          <PxText x={540} y={438} s={13} text="TO XBOX?" fill={C.green} align="center" glow />
        </g>
      )}
      <PxPanel x={COL.x} y={COL.y} w={COL.w} h={480} color={C.green} fill={C.panel} />
      <rect x={COL.x + 9} y={COL.y + 9} width={COL.w - 18} height={45} fill={C.xbox} />
      <PxText x={CX} y={COL.y + 17} s={5} text="PATCH v2026" fill={C.white} align="center" shadow={null} />
      {items.map(([at, el], i) => t >= at && <g key={i} opacity={appear(t, at)} transform={slideIn(t, at)}>{el}</g>)}
    </g>
  );
};

// ================= 2. NEW CEO =================
export const Ceo: React.FC<{ t: number }> = ({ t }) => {
  const kA = appear(t, T.ceo + 0.1), kF = appear(t, T.feb), kP = t >= T.phil ? 1 : 0.45, kR = popS(t, T.retired, 10);
  return (
    <g>
      <g opacity={kA}>
        <PxPanel x={81} y={232} w={918} h={330} color={C.yellow} fill={C.panel} />
        <Sprite rows={CROWN} pal={crownPal} x={117} y={262} s={7} />
        <PxText x={198} y={259} s={6} text="NEW CEO" fill={C.yellow} />
        <PxText x={540} y={330} s={12} text="ASHA SHARMA" fill={C.yellow} align="center" glow />
      </g>
      {t >= T.feb && <PxText x={540} y={460} s={7} text="SINCE FEB 2026" fill={C.white} align="center" opacity={kF} />}
      <g opacity={kA * kP}>
        <PxPanel x={COL.x} y={COL.y} w={COL.w} h={400} color={C.grey} fill={C.panel} />
        <PxText x={CX} y={COL.y + 36} s={5} text="PREVIOUS CEO" fill={C.grey} align="center" />
        <PxText x={CX} y={COL.y + 110} s={8} text="PHIL" fill={C.white} align="center" />
        <PxText x={CX} y={COL.y + 186} s={8} text="SPENCER" fill={C.white} align="center" />
      </g>
      {t >= T.retired && (
        <g transform={`translate(${CX} ${COL.y + 320}) scale(${lerp(1.6, 1, kR)}) translate(${-CX} ${-(COL.y + 320)})`} opacity={Math.min(1, kR * 2)}>
          <rect x={CX - 162} y={COL.y + 280} width={324} height={84} fill={C.red} />
          <rect x={CX - 153} y={COL.y + 289} width={306} height={66} fill={C.panel} />
          <PxText x={CX} y={COL.y + 301} s={6} text="RETIRED" fill={C.red} align="center" shadow={null} />
        </g>
      )}
    </g>
  );
};

// ================= 3. IDENTITY OR FUTURE =================
export const Question: React.FC<{ t: number }> = ({ t }) => {
  const sel = t >= T.prep ? 1 : t >= T.lose ? 0 : -1;
  const k = appear(t, T.q + 0.1);
  return (
    <g opacity={k}>
      <PxPanel x={81} y={232} w={918} h={330} color={C.mag} fill={C.panel} />
      <PxText x={540} y={262} s={6} text="CHOOSE YOUR PATH" fill={C.yellow} align="center" glow />
      <PxText x={180} y={350} s={6} text="LOSING ITS IDENTITY" fill={sel === 0 ? C.white : "#7a7fa0"} />
      <PxText x={180} y={450} s={6} text="PREPARING FOR FUTURE" fill={sel === 1 ? C.green : "#7a7fa0"} glow={sel === 1} />
      {sel >= 0 && <PxText x={117} y={sel === 0 ? 350 : 450} s={6} text="▶" fill={C.yellow} />}
      <Sprite rows={FIGHTER_IDLE} pal={fighterPal("x")} x={CX - 112} y={780} s={14} />
      <PxText x={CX} y={660} s={12} text={sel === 1 ? "!" : "?"} fill={sel === 1 ? C.green : C.yellow} align="center" glow />
      <PxText x={CX} y={1105} s={6} text="XBOX" fill={C.green} align="center" outline="#000" />
    </g>
  );
};

// ================= 4. FIGHT WITH PLAYSTATION =================
const Spark: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => {
  if (k <= 0 || k >= 1) return null;
  const r = 15 + k * 70;
  return (
    <g opacity={1 - k}>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <rect key={i} x={snap(x + Math.cos(a) * r - 9)} y={snap(y + Math.sin(a) * r - 9)} width={18} height={18} fill={i % 2 ? C.yellow : C.white} />;
      })}
    </g>
  );
};
export const Fight: React.FC<{ t: number }> = ({ t }) => {
  const k = appear(t, T.vs + 0.05);
  const pL = t > T.fight + 0.12 && t < T.fight + 0.42, pR = t > T.ps && t < T.ps + 0.3;
  const hpL = 1 - (t > T.ps + 0.08 ? 0.12 : 0), hpR = 1 - (t > T.fight + 0.2 ? 0.12 : 0);
  const vsS = t < T.round ? lerp(2.2, 1, popS(t, T.vs + 0.05, 11)) : 0;
  return (
    <g opacity={k}>
      <PxBar x={90} y={250} w={378} h={50} v={hpL} color={C.green} dir={-1} />
      <PxBar x={612} y={250} w={378} h={50} v={hpR} color={C.blue} dir={1} />
      <rect x={486} y={232} width={108} height={86} fill="#000" />
      <PxText x={540} y={250} s={7} text="99" fill={C.yellow} align="center" shadow={null} />
      <PxText x={90} y={318} s={6} text="XBOX" fill={C.green} outline="#000" />
      <PxText x={990} y={318} s={6} text="PLAYSTATION" fill={C.blue} outline="#000" align="right" />
      {vsS > 0 && (
        <g transform={`translate(540 470) scale(${vsS}) translate(-540 -470)`}>
          <PxText x={540} y={415} s={16} text="VS" fill={C.yellow} align="center" outline={C.mag} glow />
        </g>
      )}
      {t >= T.round && t < T.fight && <PxText x={540} y={430} s={12} text="ROUND 1" fill={C.white} align="center" outline="#000" glow />}
      {t >= T.fight && (
        <g transform={`translate(540 470) scale(${lerp(1.6, 1, popS(t, T.fight, 10))}) translate(-540 -470)`}>
          <PxText x={540} y={420} s={15} text="FIGHT!" fill={C.red} align="center" outline={C.yellow} glow />
        </g>
      )}
      <PxText x={990} y={575} s={5} text="MADHAV'S TAKE" fill={C.mag} align="right" outline="#000" />
      {/* fighters in the right column */}
      <Sprite rows={pL ? FIGHTER_PUNCH : FIGHTER_IDLE} pal={fighterPal("x")} x={570 + (pL ? 18 : 0)} y={850} s={10} />
      <Sprite rows={pR ? FIGHTER_PUNCH : FIGHTER_IDLE} pal={fighterPal("p")} x={(pR ? 740 - 40 - 18 : 780)} y={850} s={10} mirror />
      <Spark x={800} y={960} k={(t - (T.fight + 0.2)) / 0.3} />
      <Spark x={720} y={960} k={(t - (T.ps + 0.08)) / 0.3} />
      {t > T.fight + 0.4 && <PxText x={CX} y={700} s={6} text="2 HIT COMBO!" fill={C.yellow} align="center" outline="#000" />}
      {t > T.ps + 0.1 && <PxText x={CX} y={770} s={6} text="COUNTER!" fill={C.blue} align="center" outline="#000" />}
    </g>
  );
};

// ================= 5. GAMING IS NOT GOING ANYWHERE =================
const crowdCols = [[C.green, C.xboxDark], [C.blue, C.psDark], [C.mag, "#6a0a58"], [C.yellow, "#8a6a00"], ["#ff8a2b", "#7a3a00"], ["#b06bff", "#3a1a70"]];
const crowd = Array.from({ length: 20 }, (_, i) => ({ i, x: 576 + (i % 5) * 72, y: 690 + Math.floor(i / 5) * 118 }));
export const Crowd: React.FC<{ t: number }> = ({ t }) => {
  const k1 = appear(t, T.crowd + 0.05), k2 = popS(t, T.anywhere, 11);
  return (
    <g>
      <PxText x={540} y={270} s={9} text="GAMING IS NOT" fill={C.white} align="center" outline="#000" opacity={k1} />
      {t >= T.anywhere && (
        <g transform={`translate(540 400) scale(${lerp(1.25, 1, k2)}) translate(-540 -400)`}>
          <PxText x={540} y={370} s={10} text="GOING ANYWHERE" fill={C.green} align="center" outline="#000" glow />
        </g>
      )}
      {t >= T.people && <PxText x={540} y={500} s={6} text="PEOPLE STILL LOVE GAMES ♥" fill={C.mag} align="center" outline="#000" opacity={appear(t, T.people)} />}
      {crowd.map((p) => {
        const at = (p.i < 10 ? T.anywhere : T.people) + (Math.floor(p.i / 5) % 2) * 0.08;
        if (t < at) return null;
        const k = popS(t, at, 12);
        const [c1, c2] = crowdCols[Math.floor(random(`cc${p.i}`) * crowdCols.length)];
        return (
          <g key={p.i} transform={`translate(0 ${snap((1 - k) * 30)})`} opacity={Math.min(1, k * 2)}>
            <Sprite rows={PLAYER} pal={{ K: "#000", H: "#2a1a10", S: random(`sk${p.i}`) > 0.5 ? "#e0a070" : "#b07850", C: c1, D: c2, Q: t >= T.play ? C.white : "#3a3f55" }} x={p.x} y={p.y} s={8} />
          </g>
        );
      })}
      {t > T.love && [2, 6, 13, 17].map((i, j) => {
        const p = crowd[i], k = (t - T.love - j * 0.08) / 1.3;
        if (k < 0 || k > 1) return null;
        return <Sprite key={i} rows={HEART} pal={heartPal} x={p.x} y={snap(p.y - 20 - k * 160)} s={7} opacity={1 - k * k} />;
      })}
    </g>
  );
};

// ================= 6. MICROSOFT OWNS BIG STUDIOS =================
const STUDIO = [
  "....KK........",
  "....KK..KK....",
  "KKKKKKKKKKKKKK",
  "KWWWWWWWWWWWWK",
  "KWYYWWYYWWYYWK",
  "KWYYWWYYWWYYWK",
  "KWWWWWWWWWWWWK",
  "KWYYWWYYWWYYWK",
  "KWYYWWYYWWYYWK",
  "KWWWWWKKWWWWWK",
  "KWWWWWKKWWWWWK",
  "KKKKKKKKKKKKKK",
];
const studioCols = [C.xbox, "#3a3f70", "#6a1a5a", "#14506a", "#5a4a10", "#2a5a2a"];
export const Studios: React.FC<{ t: number }> = ({ t }) => {
  const k = appear(t, T.studios + 0.05), kb = popS(t, T.biggest, 11);
  return (
    <g>
      <g opacity={k}>
        <PxText x={540} y={262} s={7} text="MICROSOFT OWNS SOME" fill={C.white} align="center" outline="#000" />
        <PxText x={540} y={335} s={7} text="OF THE BIGGEST" fill={C.white} align="center" outline="#000" />
      </g>
      {t >= T.biggest && (
        <g transform={`translate(540 455) scale(${lerp(1.3, 1, kb)}) translate(-540 -455)`}>
          <PxText x={540} y={415} s={12} text="STUDIOS" fill={C.yellow} align="center" outline="#000" glow />
          <PxText x={540} y={525} s={6} text="IN GAMING" fill={C.green} align="center" outline="#000" />
        </g>
      )}
      <PxText x={CX} y={660} s={5} text="TEAM ROSTER" fill={C.green} align="center" opacity={k} />
      {Array.from({ length: 9 }, (_, i) => {
        const at = T.studios + 0.3 + i * 0.07;
        if (t < at) return null;
        const kk = popS(t, at, 13);
        const lit = t >= T.biggest;
        return (
          <g key={i} transform={`translate(0 ${snap((1 - kk) * 30)})`} opacity={Math.min(1, kk * 2)}>
            <Sprite rows={STUDIO} pal={{ K: "#000", W: studioCols[i % 6], Y: lit ? C.yellow : "#2a2a40" }} x={561 + (i % 3) * 126} y={712 + Math.floor(i / 3) * 150} s={9} />
          </g>
        );
      })}
    </g>
  );
};

// ================= 7. MAKING GAMES IS CHEAPER (Madhav's take + fact chip) =================
export const Cheap: React.FC<{ t: number }> = ({ t }) => {
  const k = appear(t, T.cheap + 0.05);
  const drain = progS(t, T.cheaper, 0.7);
  const kc = popS(t, T.cheaper + 0.1, 10);
  const stacks = [6, 8, 5];
  return (
    <g>
      <g opacity={k}>
        <PxPanel x={81} y={232} w={918} h={330} color={C.yellow} fill={C.panel} />
        <PxText x={117} y={262} s={6} text="MAKING GAMES" fill={C.white} />
        <PxText x={963} y={266} s={5} text="MADHAV'S TAKE" fill={C.mag} align="right" />
        <PxText x={117} y={345} s={6} text="DEV COST" fill={C.yellow} />
        <PxBar x={117} y={410} w={414} h={56} v={lerp(1, 0.35, drain)} color={C.red} back="#200808" />
        {t >= T.cheaper && (
          <g transform={`translate(760 420) scale(${lerp(1.5, 1, kc)}) translate(-760 -420)`} opacity={Math.min(1, kc * 2)}>
            <PxText x={760} y={395} s={7} text="CHEAPER ↓" fill={C.green} align="center" glow />
          </g>
        )}
      </g>
      {stacks.map((n, j) => {
        const shown = Math.round(lerp(n, Math.max(1, Math.round(n * 0.35)), drain));
        return Array.from({ length: shown }, (_, i) => <Sprite key={`${j}-${i}`} rows={COIN} pal={coinPal} x={606 + j * 108} y={860 - i * 27} s={8} opacity={k} />);
      })}
      {t >= T.cheaper + 0.2 && (
        <g opacity={appear(t, T.cheaper + 0.2)}>
          <PxPanel x={COL.x} y={950} w={COL.w} h={230} color={C.white} fill={C.panel} />
          <PxText x={CX} y={974} s={5} text="FACT CHECK" fill={C.yellow} align="center" />
          <PxText x={CX} y={1026} s={5} text="AAA BUDGETS" fill={C.white} align="center" />
          <PxText x={CX} y={1072} s={5} text="ARE STILL" fill={C.white} align="center" />
          <PxText x={CX} y={1118} s={5} text="RISING ↑" fill={C.red} align="center" />
        </g>
      )}
    </g>
  );
};

// ================= 8. MORE TITLES =================
const cartSlots = Array.from({ length: 16 }, (_, i) => ({ x: 582 + (i % 4) * 84, y: 1100 - Math.floor(i / 4) * 84 }));
const cartCols = [C.green, C.blue, C.mag, C.yellow, "#ff8a2b"];
export const Titles: React.FC<{ t: number }> = ({ t }) => {
  const k = appear(t, T.titles + 0.05);
  const hit = T.lotMore;
  const bump = t > hit && t < hit + 0.2 ? -27 * Math.sin(((t - hit) / 0.2) * Math.PI) : 0;
  const kt = popS(t, T.titlesW, 10);
  return (
    <g>
      <g opacity={k}>
        <PxText x={90} y={262} s={6} text="NEXT LEVEL:" fill={C.white} outline="#000" />
        <PxText x={990} y={266} s={5} text="MADHAV'S TAKE" fill={C.mag} outline="#000" align="right" />
        <PxText x={540} y={340} s={7} text="XBOX WILL HAVE" fill={C.green} align="center" outline="#000" />
      </g>
      {t >= T.titlesW && (
        <g transform={`translate(540 455) scale(${lerp(1.4, 1, kt)}) translate(-540 -455)`} opacity={Math.min(1, kt * 2)}>
          <PxText x={540} y={420} s={10} text="MORE TITLES +" fill={C.yellow} align="center" outline="#000" glow />
        </g>
      )}
      <g opacity={k}>
        <Sprite rows={QBLOCK} pal={t > hit ? { K: "#000", Y: "#c08a50", O: "#7a4a20" } : qPal} x={CX - 50} y={snap(660 + bump)} s={10} />
      </g>
      {cartSlots.map((p, i) => {
        const at = hit + 0.08 + i * 0.07;
        if (t < at) return null;
        const kk = Math.min(1, (t - at) / 0.4);
        const x = lerp(CX - 36, p.x, ease(kk)), y = lerp(770, p.y, kk) - Math.sin(kk * Math.PI) * 40;
        return <Sprite key={i} rows={CART} pal={{ K: "#000", G: "#8a8fa8", L: cartCols[i % 5], W: C.white }} x={snap(x)} y={snap(y)} s={8} />;
      })}
    </g>
  );
};

// ================= 9. CAPTURE THE MARKET =================
const MC = 7, MR = 9, TS = 54, MX = 561, MY = 660;
const GB = [1, 7], BB = [5, 1];
const land = (() => {
  const out: { c: number; r: number }[] = [];
  for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) {
    const v = ((c - 3) / 3.7) ** 2 + ((r - 4) / 4.7) ** 2;
    if (v < 1 + (random(`ld${c},${r}`) - 0.5) * 0.4) out.push({ c, r });
  }
  return out;
})();
const owner = (t: number, c: number, r: number) => {
  const tg = T.capture + Math.hypot(c - GB[0], r - GB[1]) * 0.28;
  const tb = T.psMap + Math.hypot(c - BB[0], r - BB[1]) * 0.22;
  if (t >= tg && (t < tb || tg <= tb)) return { o: "g", at: tg };
  if (t >= tb) return { o: "b", at: tb };
  return { o: "n", at: 0 };
};
export const MarketMap: React.FC<{ t: number }> = ({ t }) => {
  const k = appear(t, T.map + 0.05);
  let ng = 0, nb = 0;
  const tiles = land.map(({ c, r }) => {
    const { o, at } = owner(t, c, r);
    if (o === "g") ng++; else if (o === "b") nb++;
    const fl = o !== "n" ? Math.max(0, 1 - (t - at) / 0.25) : 0;
    const fill = o === "g" ? ((c + r) % 2 ? C.xbox : "#149a14") : o === "b" ? ((c + r) % 2 ? C.ps : "#0a82e8") : ((c + r) % 2 ? "#1a1f3c" : "#20264a");
    return (
      <g key={`${c},${r}`}>
        <rect x={MX + 4 + c * TS} y={MY + r * TS} width={TS - 4} height={TS - 4} fill={fill} />
        {fl > 0 && <rect x={MX + 4 + c * TS} y={MY + r * TS} width={TS - 4} height={TS - 4} fill="#fff" opacity={fl} />}
      </g>
    );
  });
  const status = t >= T.psMap ? ["RIVAL ENTERED!", C.blue] : t >= T.capture ? ["GO!", C.green] : t >= T.prepare ? ["READY?", C.white] : null;
  return (
    <g opacity={k}>
      <PxText x={540} y={250} s={7} text="CAPTURE THE" fill={C.white} align="center" outline="#000" />
      <PxText x={540} y={318} s={12} text="MARKET" fill={C.yellow} align="center" outline="#000" glow />
      <PxText x={90} y={440} s={5} text="XBOX" fill={C.green} outline="#000" />
      <PxBar x={220} y={434} w={300} h={44} v={ng / land.length} color={C.green} back="#0a1a0a" seg={15} />
      <PxBar x={560} y={434} w={300} h={44} v={nb / land.length} color={C.blue} back="#0a0f1f" seg={15} dir={-1} />
      <PxText x={990} y={440} s={5} text="PS" fill={C.blue} outline="#000" align="right" />
      {status && <PxText x={540} y={520} s={8} text={status[0]} fill={status[1]} align="center" outline="#000" glow />}
      <rect x={MX} y={MY - 9} width={COL.w} height={MR * TS + 14} fill="#000" opacity={0.55} />
      {tiles}
      {t >= T.capture && <Sprite rows={FLAG} pal={{ K: "#000", C: C.green }} x={MX + 4 + GB[0] * TS + 4} y={MY + GB[1] * TS - 52} s={9} />}
      {t >= T.psMap && <Sprite rows={FLAG} pal={{ K: "#000", C: C.blue }} x={MX + 4 + BB[0] * TS + 4} y={MY + BB[1] * TS - 52} s={9} />}
    </g>
  );
};

// ================= 10. TEAM XBOX OR TEAM PLAYSTATION? COMMENT =================
export const Comment: React.FC<{ t: number }> = ({ t }) => {
  const k = appear(t, T.comment + 0.05), kp = appear(t, T.teamPs - 0.05), kc = appear(t, T.commentW);
  return (
    <g>
      <PxText x={540} y={262} s={10} text="TEAM XBOX" fill={C.green} align="center" outline="#000" glow opacity={k} />
      <PxText x={540} y={355} s={6} text="OR" fill={C.white} align="center" outline="#000" opacity={kp} />
      <PxText x={540} y={420} s={8} text="TEAM PLAYSTATION?" fill={C.blue} align="center" outline="#000" glow opacity={kp} />
      {/* Instagram-style comment bubble (no usernames, no counts) */}
      <g opacity={k}>
        <PxPanel x={COL.x} y={COL.y + 20} w={COL.w} h={200} color={C.white} fill={C.panel} />
        <path fill={C.white} d={`M${COL.x + 54} ${COL.y + 211}h36v18h-9v18h-9v18h-18z`} />
        <PxText x={CX} y={COL.y + 62} s={5} text="XBOX OR PS?" fill={C.white} align="center" />
        <Sprite rows={HEART} pal={{ ...heartPal, M: C.green }} x={CX - 90} y={COL.y + 130} s={7} />
        <Sprite rows={HEART} pal={{ ...heartPal, M: C.blue }} x={CX + 40} y={COL.y + 130} s={7} />
      </g>
      {t >= T.commentW && (
        <g opacity={kc} transform={slideIn(t, T.commentW)}>
          <PxText x={CX} y={COL.y + 300} s={8} text="COMMENT" fill={C.yellow} align="center" outline="#000" glow />
          <PxText x={CX} y={COL.y + 380} s={8} text="BELOW ↓" fill={C.yellow} align="center" outline="#000" glow />
          <rect x={COL.x} y={COL.y + 470} width={COL.w} height={70} fill="#000" />
          <rect x={COL.x} y={COL.y + 470} width={COL.w} height={70} fill="none" stroke={C.white} strokeWidth={6} />
          <PxText x={CX} y={COL.y + 490} s={5} text="ADD COMMENT" fill={C.grey} align="center" />
        </g>
      )}
    </g>
  );
};

// ================= END =================
export const EndCard: React.FC<{ t: number }> = ({ t }) => {
  const still = T.total - 0.4;
  const tt = Math.min(t, still);
  const k0 = appear(tt, T.end + 0.02);
  const kc = popS(tt, T.end + 0.25, 10);
  const strike = progS(tt, T.end + 0.12, 0.12);
  const kf = appear(tt, T.follow), ka = popS(tt, T.aiNews, 10);
  return (
    <g>
      <g opacity={k0}>
        <PxText x={540} y={244} s={5} text="IS XBOX LOSING TO PLAYSTATION?" fill={C.white} align="center" outline="#000" />
        <PxText x={540} y={318} s={10} text="GAME OVER?" fill="#7a2020" align="center" outline="#000" />
        <rect x={540 - 300} y={348} width={snap(600 * strike)} height={14} fill={C.yellow} />
        <g transform={`translate(540 450) scale(${lerp(1.5, 1, kc)}) translate(-540 -450)`} opacity={Math.min(1, kc * 2)}>
          <PxText x={540} y={420} s={9} text="NO - CONTINUE" fill={C.green} align="center" outline="#000" glow />
        </g>
        <rect x={81} y={520} width={918} height={84} fill={C.yellow} opacity={0.16} />
        <PxText x={540} y={540} s={6} text="1ST @MADHAV_SOMANI" fill={C.yellow} align="center" glow />
      </g>
      {tt >= T.follow && (
        <g opacity={kf}>
          <PxPanel x={COL.x} y={COL.y + 20} w={COL.w} h={420} color={C.green} fill={C.panel} />
          <PxText x={CX} y={COL.y + 70} s={9} text="FOLLOW" fill={C.white} align="center" />
          <PxText x={CX} y={COL.y + 160} s={7} text="FOR MORE" fill={C.white} align="center" />
        </g>
      )}
      {tt >= T.aiNews && (
        <g transform={`translate(${CX} ${COL.y + 300}) scale(${lerp(1.5, 1, ka)}) translate(${-CX} ${-(COL.y + 300)})`} opacity={Math.min(1, ka * 2)}>
          <PxText x={CX} y={COL.y + 260} s={8} text="AI NEWS" fill={C.green} align="center" glow />
          <Sprite rows={COIN} pal={coinPal} x={CX - 24} y={COL.y + 350} s={8} />
        </g>
      )}
    </g>
  );
};
void smooth; void OUTRO;
