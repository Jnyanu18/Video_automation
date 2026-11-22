import React from "react";
import { useCurrentFrame } from "remotion";
import { F, FPS } from "../../kit/theme";
import type { View } from "./faceless";
import { SERIF, c01, sp, ease, In, Card, Check, Captions } from "./keynote";

/** Google's AI that sleeps (ai-sleep, 2026-11-07), in the style of 37-claude-mouse-surgery (Vishnu): a night world for the
 *  hook, a colour world per chapter, the same line-art brain as the AI's mind, our own line art; no 3D. Facts from Google
 *  Research's "sleep framework" post (2026-10-27). Memory cards and dream questions are ILLUSTRATIVE. Structure from
 *  DfZuDIUOGJZ (a talking head with cuts), never its look. */

type World = { bg: string; ink: string; dim: string; line: string; card: string; accent: string };
const W: Record<string, World> = {
  night: { bg: "#0b1026", ink: "#eef1ff", dim: "#8a93b8", line: "#1c2448", card: "#141b3a", accent: "#ffd76a" },
  white: { bg: "#f4f2ee", ink: "#16161a", dim: "#8a8780", line: "#e4e1da", card: "#ffffff", accent: "#e5484d" },
  day: { bg: "#ffe9b8", ink: "#2a1d05", dim: "#8a6a2a", line: "#f2d48c", card: "#fff8e6", accent: "#e07b00" },
  indigo: { bg: "#1a1f5c", ink: "#ffffff", dim: "#aab0e8", line: "#2c3380", card: "#252b74", accent: "#9fb4ff" },
  dream: { bg: "#2a1446", ink: "#ffffff", dim: "#c3a9e6", line: "#3d2063", card: "#3a1d5e", accent: "#ff8ad8" },
  green: { bg: "#d9f2e2", ink: "#0f2a1b", dim: "#4f7a60", line: "#b6e2c6", card: "#ffffff", accent: "#1a9c55" },
};
let TH: World = W.night;
const RED = "#e5484d", GREEN = "#1a9c55";
const Mono: React.FC<{ s: number; c?: string; children: React.ReactNode; w?: number }> = ({ s, c, children, w = 600 }) => <span style={{ fontFamily: F.mono, fontSize: s, letterSpacing: 2, color: c || TH.dim, fontWeight: w }}>{children}</span>;
const Head: React.FC<{ t: number; a: string; i?: string; b?: string; top?: number; size?: number }> = ({ t, a, i, b, top = 190, size = 100 }) => (
  <In t={t} dy={26} style={{ left: 50, right: 50, top, textAlign: "center", fontFamily: SERIF, fontSize: size, color: TH.ink, lineHeight: 1.05 }}>
    {a}{i ? <span style={{ fontStyle: "italic", color: TH.accent }}> {i}</span> : null}{b ? ` ${b}` : null}
  </In>
);
const Moon: React.FC<{ x: number; y: number; s: number; o?: number }> = ({ x, y, s, o = 1 }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" style={{ position: "absolute", left: x, top: y, opacity: o }}>
    <path d="M62 8 A44 44 0 1 0 92 70 A34 34 0 1 1 62 8 Z" fill="#ffd76a" style={{ filter: "drop-shadow(0 0 18px rgba(255,215,106,0.7))" }} />
  </svg>
);
const Zs: React.FC<{ now: number; x: number; y: number; k: number }> = ({ now, x, y, k }) => (
  <>{[0, 1, 2].map((i) => {
    const f = ((now * 0.5 + i / 3) % 1);
    return <div key={i} style={{ position: "absolute", left: x + f * 120 + i * 10, top: y - f * 220, fontFamily: SERIF, fontStyle: "italic", fontSize: 50 + i * 16, color: "#c9d2ff", opacity: k * (1 - f) }}>z</div>;
  })}</>
);
/** a memory card, a small labelled tile */
const Mem: React.FC<{ x: number; y: number; w?: number; label: string; color: string; o?: number; rot?: number; ink?: string }> = ({ x, y, w = 190, label, color, o = 1, rot = 0, ink = "#16161a" }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: 110, borderRadius: 18, background: color, display: "flex", alignItems: "center", justifyContent: "center", opacity: o, transform: `rotate(${rot}deg)`, boxShadow: "0 10px 22px rgba(0,0,0,0.18)" }}>
    <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 30, color: ink }}>{label}</span>
  </div>
);
/** the AI as an AI (Vishnu, 2026-11-07: "AI should be like an AI, a bot or superintelligence"): a floating bot with a visor,
 *  two eyes, an antenna and a halo ring; asleep (0..1) closes the eyes into arcs and dims the glow */
const Bot: React.FC<{ cx: number; cy: number; s: number; asleep: number; now: number; glow?: number }> = ({ cx, cy, s, asleep, now, glow = 1 }) => {
  const bob = 10 * Math.sin(now * 1.6) * (1 - 0.6 * asleep);
  const eye = "#7fe3ff";
  const g = glow * (1 - 0.65 * asleep);
  return (
    <svg width={400 * s} height={400 * s} viewBox="0 0 400 400" style={{ position: "absolute", left: cx - 200 * s, top: cy - 200 * s + bob, overflow: "visible" }}>
      <ellipse cx={200} cy={215} rx={190} ry={58} fill="none" stroke={eye} strokeWidth={3} strokeDasharray="14 12" strokeDashoffset={-now * 40} opacity={0.25 + 0.6 * g} />
      <line x1={200} y1={92} x2={200} y2={52} stroke="#c9d2ff" strokeWidth={6} strokeLinecap="round" />
      <circle cx={200} cy={42} r={13} fill={eye} opacity={0.3 + 0.7 * g * (0.6 + 0.4 * Math.sin(now * 5))} style={{ filter: `drop-shadow(0 0 ${14 * g}px ${eye})` }} />
      <rect x={68} y={148} width={26} height={62} rx={11} fill="#c9d2ff" />
      <rect x={306} y={148} width={26} height={62} rx={11} fill="#c9d2ff" />
      <rect x={140} y={272} width={120} height={78} rx={30} fill="#d9deff" />
      <rect x={90} y={90} width={220} height={175} rx={62} fill="#eef1ff" style={{ filter: `drop-shadow(0 0 ${30 * g}px rgba(127,227,255,0.55))` }} />
      <rect x={114} y={128} width={172} height={96} rx={44} fill="#0b1026" />
      {asleep > 0.5 ? (
        <>
          <path d="M146 180 Q163 196 180 180" stroke={eye} strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.7} />
          <path d="M220 180 Q237 196 254 180" stroke={eye} strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.7} />
        </>
      ) : (
        <>
          <rect x={150} y={154} width={28} height={44} rx={14} fill={eye} style={{ filter: `drop-shadow(0 0 ${12 * g}px ${eye})` }} />
          <rect x={222} y={154} width={28} height={44} rx={14} fill={eye} style={{ filter: `drop-shadow(0 0 ${12 * g}px ${eye})` }} />
        </>
      )}
    </svg>
  );
};
/** a thought cloud made of circles, like a person dreaming; children sit inside it */
const DreamCloud: React.FC<{ x: number; y: number; w: number; h: number; k: number; color: string; children?: React.ReactNode }> = ({ x, y, w, h, k, color, children }) => {
  const bumps: [number, number, number][] = [[0.18, 0.2, 0.2], [0.42, 0.08, 0.24], [0.68, 0.14, 0.22], [0.88, 0.36, 0.18], [0.84, 0.72, 0.2], [0.56, 0.9, 0.22], [0.25, 0.88, 0.2], [0.08, 0.56, 0.2]];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `scale(${0.6 + 0.4 * k})`, opacity: c01(k * 2), transformOrigin: "30% 100%" }}>
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {bumps.map(([bx, by, br], i) => <circle key={i} cx={bx * w} cy={by * h} r={br * w} fill={color} />)}
        <rect x={w * 0.08} y={h * 0.16} width={w * 0.84} height={h * 0.7} rx={60} fill={color} />
      </svg>
      <div style={{ position: "absolute", left: w * 0.08, top: h * 0.1, width: w * 0.84, height: h * 0.8 }}>{children}</div>
    </div>
  );
};

type B = (now: number, T: (k: string) => number) => React.ReactNode;

// 1. Google just taught an AI to sleep: the brain dims, the moon rises, z's; "woke up smarter": it snaps awake, brighter
const b1: B = (now, T) => {
  const t0 = T("b1"), ts = T("sleep"), tw = T("woke");
  const asleep = c01((now - ts) / 0.5) * (1 - c01((now - tw) / 0.25));
  const awake = ease(now - tw, 0.4);
  return (
    <>
      <Head t={now - t0} a="An AI that" i="sleeps." top={200} size={112} />
      <In t={now - t0 - 0.2} style={{ left: 0, right: 0, top: 350, textAlign: "center" }}><Mono s={24}>GOOGLE RESEARCH</Mono></In>
      <Moon x={760} y={430 - 60 * c01((now - ts) / 0.6)} s={170} o={c01((now - ts) / 0.4) * (1 - 0.7 * awake)} />
      <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + 0.06 * awake * Math.exp(-Math.max(0, now - tw) * 2)})`, transformOrigin: "540px 880px" }}>
        <Bot cx={540} cy={880} s={1.9} asleep={asleep} glow={1 + 0.8 * awake * Math.exp(-Math.max(0, now - tw) * 0.8)} now={now} />
      </div>
      <Zs now={now} x={760} y={640} k={asleep} />
      {now >= tw ? (
        <In t={now - tw} style={{ left: 0, right: 0, top: 1240, display: "flex", justifyContent: "center" }}>
          <div style={{ padding: "16px 34px", borderRadius: 999, background: TH.accent, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 40, color: "#2a1d05" }}>+ SMARTER</span>
          </div>
        </In>
      ) : null}
    </>
  );
};

// 2. The problem: teach it something new and the oldest card falls off the shelf
const b2: B = (now, T) => {
  const t0 = T("b2"), tn = T("new"), to = T("old");
  const push = ease(now - tn, 0.7);
  const cards = [["Python", "#c9e3ff"], ["French", "#ffd6d6"], ["Your name", "#d9f2e2"], ["Chess", "#fff1c2"]];
  return (
    <>
      <Head t={now - t0} a="It" i="forgets." top={200} size={112} />
      <In t={now - t0 - 0.1} style={{ left: 0, right: 0, top: 360, textAlign: "center" }}><Mono s={22}>WHAT IT KNOWS · ILLUSTRATIVE</Mono></In>
      <div style={{ position: "absolute", left: 60, right: 60, top: 860, height: 18, borderRadius: 9, background: TH.ink }} />
      {cards.map(([l, c], i) => {
        const x = 30 + i * 205 + push * 205;
        const falling = i === 3 ? c01((now - tn - 0.4) / 0.6) : 0;
        return <Mem key={i} x={x + falling * 40} y={740 + falling * 560} w={190} label={l} color={c} o={1 - falling * 0.9} rot={falling * 35} />;
      })}
      {now >= tn - 0.1 ? <Mem x={30 - 205 + push * 205} y={740 - (1 - push) * 300} w={190} label="Spanish" color="#ffffff" o={c01((now - tn) / 0.15)} /> : null}
      {now >= to - 0.2 ? (
        <In t={now - to + 0.2} style={{ left: 0, right: 0, top: 1060, display: "flex", justifyContent: "center" }}>
          <div style={{ padding: "14px 30px", borderRadius: 999, border: `4px solid ${RED}` }}><Mono s={28} c={RED} w={800}>CHESS · FORGOTTEN</Mono></div>
        </In>
      ) : null}
    </>
  );
};

// 3. Copy the brain: by day a fast tray fills; at night (b3b) the tray empties into new long-term boxes, old boxes locked
const b3: B = (now, T) => {
  const t0 = T("b3"), tf = T("fast");
  const items = ["meeting notes", "a new word", "your code"];
  return (
    <>
      <Head t={now - t0} a="Copy the" i="brain." top={200} size={112} />
      <svg width={220} height={220} viewBox="0 0 100 100" style={{ position: "absolute", left: 430, top: 380 }}>
        <circle cx={50} cy={50} r={20} fill="#ffb11b" />
        {Array.from({ length: 8 }).map((_, i) => { const a = (i / 8) * Math.PI * 2 + now * 0.6; return <line key={i} x1={50 + Math.cos(a) * 28} y1={50 + Math.sin(a) * 28} x2={50 + Math.cos(a) * 40} y2={50 + Math.sin(a) * 40} stroke="#ffb11b" strokeWidth={5} strokeLinecap="round" />; })}
      </svg>
      <In t={now - t0 - 0.2} style={{ left: 0, right: 0, top: 610, textAlign: "center" }}><Mono s={28} c={TH.ink} w={800}>BY DAY</Mono></In>
      {now >= t0 + 0.4 ? (
        <Card x={190} y={700} w={700} h={520} t={now - t0 - 0.4} fill={TH.card} r={30} style={{ border: `3px dashed ${TH.accent}` }}>
          <div style={{ position: "absolute", left: 30, top: 24 }}><Mono s={22} c={TH.accent}>FAST · SHORT-TERM MEMORY</Mono></div>
          {items.map((l, i) => {
            const k = sp(now - tf - 0.1 - i * 0.25, 200);
            return <div key={i} style={{ position: "absolute", left: 60, right: 60, top: 100 + i * 130 - (1 - k) * 200, height: 100, borderRadius: 16, background: "#ffffff", border: `2px solid ${TH.line}`, display: "flex", alignItems: "center", paddingLeft: 26, opacity: c01(k * 2) }}><span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 32, color: TH.ink }}>{l}</span></div>;
          })}
        </Card>
      ) : null}
    </>
  );
};
const b3b: B = (now, T) => {
  const t0 = T("b3b"), tm = T("moving"), tu = T("touching");
  const move = ease(now - tm, 0.9);
  const items = ["meeting notes", "a new word", "your code"];
  return (
    <>
      <Moon x={455} y={170} s={170} />
      <In t={now - t0} style={{ left: 0, right: 0, top: 360, textAlign: "center" }}><Mono s={28} c={TH.ink} w={800}>AT NIGHT</Mono></In>
      <div style={{ position: "absolute", left: 190, top: 430, width: 700, height: 250, borderRadius: 30, border: `3px dashed ${TH.dim}`, opacity: 1 - 0.5 * move }}>
        <div style={{ position: "absolute", left: 30, top: 18 }}><Mono s={20}>SHORT-TERM · EMPTYING</Mono></div>
      </div>
      {items.map((l, i) => {
        const k = ease(now - tm - i * 0.15, 0.8);
        const x0 = 230 + i * 210, y0 = 520, x1 = 120 + i * 290, y1 = 1000;
        return <div key={i} style={{ position: "absolute", left: x0 + (x1 - x0) * k, top: y0 + (y1 - y0) * k, width: 200, height: 84, borderRadius: 14, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.body, fontWeight: 700, fontSize: 24, color: "#16161a", boxShadow: k > 0.95 ? `0 0 30px ${TH.accent}` : "none" }}>{l}</div>;
      })}
      <div style={{ position: "absolute", left: 90, right: 90, top: 960, height: 170, borderRadius: 26, border: `4px solid ${TH.accent}`, opacity: c01((now - tm) / 0.3) }}>
        <div style={{ position: "absolute", left: 24, top: -40 }}><Mono s={22} c={TH.accent} w={800}>NEW LONG-TERM MEMORY</Mono></div>
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 1200, display: "flex", gap: 16, opacity: c01((now - tu + 0.2) / 0.3) }}>
        {["Python", "French", "Your name", "Chess"].map((l, i) => (
          <div key={i} style={{ flex: 1, height: 110, borderRadius: 16, background: TH.card, border: `2px solid ${TH.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <svg width={34} height={34} viewBox="0 0 24 24"><rect x={5} y={10} width={14} height={11} rx={2} fill={TH.dim} /><path d="M8 10 V7 a4 4 0 0 1 8 0 V10" stroke={TH.dim} strokeWidth={2.4} fill="none" /></svg>
            <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 22, color: TH.ink }}>{l}</span>
          </div>
        ))}
      </div>
      {now >= tu - 0.2 ? <In t={now - tu} style={{ left: 0, right: 0, top: 1340, textAlign: "center" }}><Mono s={22} c={TH.ink}>OLD MEMORY · UNTOUCHED</Mono></In> : null}
    </>
  );
};

// 4. It dreams like a person: the bot asleep, thought bubbles rising into a dream cloud; the questions appear inside it,
//    tagged with the parts of itself they mix; the best ones are kept
const b4: B = (now, T) => {
  const t0 = T("b4"), tq = T("invents"), tm = T("mixes"), tb = T("best");
  const qs: [string, string, string][] = [["What is 7 x 8 in French?", "MATH", "FRENCH"], ["Explain chess with Python", "CHESS", "PYTHON"], ["A poem about your code", "POETRY", "CODE"]];
  const cloud = ease(now - t0 - 0.5, 0.6);
  return (
    <>
      <Head t={now - t0} a="Then it" i="dreams." top={170} size={104} />
      <Bot cx={300} cy={1310} s={0.85} asleep={1} now={now} />
      <Zs now={now} x={130} y={1140} k={1} />
      {[0, 1, 2].map((i) => <div key={i} style={{ position: "absolute", left: 345 + i * 38, top: 1205 - i * 42, width: 22 + i * 12, height: 22 + i * 12, borderRadius: 40, background: "#f6eaff", opacity: c01((now - t0 - 0.15 - i * 0.12) / 0.15) }} />)}
      <DreamCloud x={130} y={480} w={820} h={560} k={cloud} color="#f6eaff">
        <div style={{ position: "absolute", left: 0, right: 0, top: 6, textAlign: "center" }}><Mono s={20} c="#6b4a8f">DREAMING · ILLUSTRATIVE</Mono></div>
        {now >= tq - 0.1 ? qs.map(([q, a1, a2], i) => {
          const k = sp(now - tq - i * 0.3, 180);
          const mixed = now >= tm - 0.1;
          const best = now >= tb && i !== 1;
          const drop = now >= tb && i === 1 ? c01((now - tb) / 0.4) : 0;
          return (
            <div key={i} style={{ position: "absolute", left: 10, right: 10, top: 46 + i * 138 + drop * 40, height: 120, borderRadius: 22, background: "#ffffff", border: `3px solid ${best ? "#ff4fc3" : "#e6d4f7"}`, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 26, opacity: c01(k * 2) * (1 - drop * 0.8), transform: `scale(${0.85 + 0.15 * k})` }}>
              <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 32, color: "#2a1446" }}>{q}</span>
              {mixed ? <div style={{ display: "flex", gap: 10, marginTop: 8, opacity: c01((now - tm - i * 0.15) / 0.2) }}>{[a1, a2].map((tg, j) => <span key={j} style={{ fontFamily: F.mono, fontSize: 16, letterSpacing: 2, padding: "3px 10px", borderRadius: 999, background: j ? "#dbe8ff" : "#ffe1f3", color: "#2a1446" }}>{tg}</span>)}</div> : null}
              {best ? <div style={{ position: "absolute", right: 22, top: 38 }}><Check t={now - tb - i * 0.1} color="#ff4fc3" size={46} /></div> : null}
            </div>
          );
        }) : null}
      </DreamCloud>
    </>
  );
};

// 5. The test: Manchu, then Kalamang. Usual methods lose Manchu; the sleeping AI keeps both
const b5: B = (now, T) => {
  const t0 = T("b5"), tk = T("kalamang"), tu = T("usual"), tf = T("barely");
  const lose = c01((now - tu - 0.2) / 0.5);
  const Col: React.FC<{ x: number; title: string; keep: boolean; t: number }> = ({ x, title, keep, t }) => (
    <Card x={x} y={520} w={440} h={640} t={t} fill={TH.card} r={30}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 30, textAlign: "center" }}><Mono s={22} c={TH.ink} w={800}>{title}</Mono></div>
      {[["Manchu", "#ffd6d6"], ["Kalamang", "#c9e3ff"]].map(([l, c], i) => {
        const shown = i === 0 ? c01((now - t0 - 0.3) / 0.2) : c01((now - tk) / 0.2);
        const gone = i === 0 && !keep ? lose : 0;
        return (
          <div key={i} style={{ position: "absolute", left: 40, right: 40, top: 120 + i * 200, height: 150, borderRadius: 22, background: c, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, opacity: shown * (1 - gone * 0.85), filter: `blur(${gone * 6}px)` }}>
            <span style={{ fontFamily: SERIF, fontSize: 52, color: "#16161a" }}>{l}</span>
            {keep && now >= tf - 0.1 ? <Check t={now - tf - i * 0.1} color={GREEN} size={46} /> : null}
          </div>
        );
      })}
      {!keep && now >= tu ? <div style={{ position: "absolute", left: 0, right: 0, top: 520, textAlign: "center", opacity: lose }}><Mono s={24} c={RED} w={800}>MANCHU FORGOTTEN</Mono></div> : null}
      {keep && now >= tf ? <div style={{ position: "absolute", left: 0, right: 0, top: 520, textAlign: "center", opacity: c01((now - tf) / 0.2) }}><Mono s={24} c={GREEN} w={800}>BOTH KEPT</Mono></div> : null}
    </Card>
  );
  return (
    <>
      <Head t={now - t0} a="The" i="test." top={190} size={112} />
      <In t={now - t0 - 0.1} style={{ left: 0, right: 0, top: 340, textAlign: "center" }}><Mono s={22}>TWO LANGUAGES IT HAD NEVER SEEN</Mono></In>
      <Col x={70} title="USUAL METHODS" keep={false} t={now - t0 - 0.2} />
      <Col x={570} title="WITH SLEEP" keep t={now - t0 - 0.35} />
    </>
  );
};

// 6. A research paper from October 27; the brain asleep under the moon; follow
const b6: B = (now, T) => {
  const t0 = T("b6"), tf = T("follow");
  return (
    <>
      <Moon x={720} y={200} s={160} />
      <Bot cx={500} cy={680} s={1.25} asleep={1} now={now} />
      <Zs now={now} x={640} y={480} k={1} />
      <In t={now - t0} style={{ left: 0, right: 0, top: 960, display: "flex", justifyContent: "center" }}>
        <div style={{ padding: "16px 30px", borderRadius: 18, background: TH.card, border: `2px solid ${TH.line}` }}><Mono s={26} c={TH.ink}>GOOGLE RESEARCH · PAPER · OCT 27, 2026</Mono></div>
      </In>
      <In t={now - t0 - 0.2} style={{ left: 0, right: 0, top: 1060, textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontSize: 58, color: TH.dim }}>Not a product yet.</In>
      {now >= tf - 0.1 ? (
        <In t={now - tf} style={{ left: 0, right: 0, top: 1220, display: "flex", justifyContent: "center" }}>
          <div style={{ padding: "18px 60px", borderRadius: 999, background: TH.accent, fontFamily: F.body, fontWeight: 800, fontSize: 44, color: "#2a1d05", transform: `scale(${sp(now - tf, 220)})` }}>Follow for more</div>
        </In>
      ) : null}
    </>
  );
};

const BEATS: { key: string; draw: B; world: string; tab: number }[] = [
  { key: "b1", draw: b1, world: "night", tab: -1 }, { key: "b2", draw: b2, world: "white", tab: 0 }, { key: "b3", draw: b3, world: "day", tab: 1 },
  { key: "b3b", draw: b3b, world: "indigo", tab: 2 }, { key: "b4", draw: b4, world: "dream", tab: 3 }, { key: "b5", draw: b5, world: "green", tab: 4 },
  { key: "b6", draw: b6, world: "night", tab: -1 },
];
const TABS = ["01 FORGETTING", "02 DAY", "03 NIGHT", "04 DREAMS", "05 THE TEST"];

export const SleepAi: View = {
  View: ({ t0, at, p, words }) => {
    const now = t0 + useCurrentFrame() / FPS;
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => (k === "b1" ? t0 : parts[k] ? at(parts[k]) - 0.08 : 999);
    const starts = BEATS.map((b) => T(b.key));
    let cur = 0;
    starts.forEach((s, i) => { if (now >= s) cur = i; });
    const prev = W[BEATS[Math.max(0, cur - 1)].world];
    TH = W[BEATS[cur].world];
    const flood = cur === 0 ? 1 : ease(now - starts[cur], 0.45);
    const push = 1 + 0.025 * c01((now - starts[cur]) / 3);
    const tab = BEATS[cur].tab;
    const stars = TH === W.night || TH === W.indigo;
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, background: prev.bg, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: TH.bg, clipPath: `circle(${flood * 130}% at 50% 45%)` }} />
        {stars ? Array.from({ length: 40 }).map((_, i) => { const x = (Math.sin(i * 12.9898) * 43758.5453) % 1; const y = (Math.sin(i * 78.233) * 12345.678) % 1; return <div key={i} style={{ position: "absolute", left: Math.abs(x) * 1080, top: Math.abs(y) * 1500, width: 3, height: 3, borderRadius: 2, background: "#fff", opacity: 0.3 + 0.4 * Math.abs(Math.sin(now * 1.5 + i)) }} />; }) : null}
        {tab >= 0 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 90, display: "flex", justifyContent: "center", gap: 8 }}>
            {TABS.map((l, i) => <div key={i} style={{ fontFamily: F.mono, fontSize: 16, letterSpacing: 2, padding: "8px 12px", borderRadius: 999, background: i === tab ? TH.ink : "transparent", color: i === tab ? TH.bg : TH.dim, border: `2px solid ${i === tab ? TH.ink : TH.dim}` }}>{l}</div>)}
          </div>
        ) : null}
        <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "50% 45%" }}>{BEATS[cur].draw(now, T)}</div>
        {words ? <Captions words={words} now={now} ink={TH.ink} accent={TH.accent} /> : null}
      </div>
    );
  },
  hits: ({ at, p }) => {
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => at(parts[k]);
    const soft = 0.62;
    return [
      { t: T("woke"), sound: "whoosh", gain: 0.28 }, { t: T("woke") + 0.05, sound: "subdrop", gain: 0.35 },
      { t: T("b2"), sound: "swish", gain: 0.2 * soft }, { t: T("new") + 0.5, sound: "click", gain: 0.2 * soft },
      { t: T("b3"), sound: "swish", gain: 0.2 * soft }, { t: T("b3b"), sound: "sweep", gain: 0.2 * soft },
      { t: T("b4"), sound: "swish", gain: 0.2 * soft }, { t: T("best"), sound: "ding", gain: 0.15 * soft },
      { t: T("b5"), sound: "swish", gain: 0.2 * soft }, { t: T("barely"), sound: "pop", gain: 0.18 * soft },
      { t: T("b6"), sound: "sweep", gain: 0.18 * soft },
    ];
  },
};
