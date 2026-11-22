import React from "react";
import { useCurrentFrame, Img, staticFile, Easing } from "remotion";
const Easing_out = (x: number) => Easing.out(Easing.cubic)(x);
import { F, FPS } from "../../kit/theme";
import type { View } from "./faceless";
import { SERIF, c01, sp, ease, In, Card, Check, typed, Captions } from "./keynote";
import { Clawd, NoteIcon } from "./rea";

/** BLA, Blind LLM Agents (bla-shield, 2026-11-08): 41-reverse-anything's world flipped. Clawd bounces off the shield, is
 *  lied to, chases ghosts and burns out. The logo, repo, stars, commits, terminal lines and file types are real (the
 *  README's real REA results, 2026-11-08); the app, passwords, maze and token meter are ILLUSTRATIVE. Retention first:
 *  a visible event about every second, the open question at 8 to 12 s, the proof last. */

type World = { bg: string; ink: string; dim: string; line: string; card: string; accent: string };
const W: Record<string, World> = {
  dark: { bg: "#0d0d10", ink: "#f2f2f5", dim: "#83838f", line: "#26262e", card: "#17171c", accent: "#3b82f6" },
  white: { bg: "#f4f2ee", ink: "#16161a", dim: "#8a8780", line: "#e4e1da", card: "#ffffff", accent: "#2f5ff0" },
  amber: { bg: "#f3b01c", ink: "#1d1606", dim: "#6b5214", line: "#d99c12", card: "#fff6dc", accent: "#1d1606" },
  violet: { bg: "#1a1030", ink: "#f3eeff", dim: "#9b8fc0", line: "#2e2250", card: "#251843", accent: "#b69cff" },
  blue: { bg: "#0b3fd6", ink: "#ffffff", dim: "#b8ccff", line: "#2a58e0", card: "#1f4fe0", accent: "#ffffff" },
  maze: { bg: "#08201a", ink: "#e6fff4", dim: "#5f8f7c", line: "#16463a", card: "#0e2d25", accent: "#7dffc4" },
  red: { bg: "#e5383b", ink: "#ffffff", dim: "#ffd0d0", line: "#f05a5c", card: "#ffffff", accent: "#ffffff" },
  green: { bg: "#d9f2e2", ink: "#0f2a1b", dim: "#4f7a60", line: "#b6e2c6", card: "#ffffff", accent: "#2fbf71" },
};
let TH: World = W.dark;
const GREEN = "#2fbf71", RED = "#ff4d4f", CLAY = "#d97757", APP = "#7c5cff", SHIELD = "#3b82f6";
const logo = staticFile("bla-shield/raw/bla_logo.png");
const claude = staticFile("bla-shield/raw/claude_symbol.svg");
const Mono: React.FC<{ s: number; c?: string; children: React.ReactNode; w?: number }> = ({ s, c, children, w = 600 }) => <span style={{ fontFamily: F.mono, fontSize: s, letterSpacing: 2, color: c || TH.dim, fontWeight: w }}>{children}</span>;
const Head: React.FC<{ t: number; a: string; i?: string; b?: string; top?: number; size?: number }> = ({ t, a, i, b, top = 200, size = 96 }) => (
  <In t={t} dy={26} style={{ left: 50, right: 50, top, textAlign: "center", fontFamily: SERIF, fontSize: size, color: TH.ink, lineHeight: 1.05 }}>
    {a}{i ? <span style={{ fontStyle: "italic" }}> {i}</span> : null}{b ? ` ${b}` : null}
  </In>
);
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// the Notely app card from 41, at any size
const AppCard: React.FC<{ x: number; y: number; w: number; t: number; tag?: React.ReactNode }> = ({ x, y, w, t, tag }) => {
  const k = w / 760;
  return (
    <Card x={x} y={y} w={w} h={w * 0.72} t={t} fill="#ffffff" r={36 * k}>
      <div style={{ position: "absolute", left: 50 * k, top: 46 * k, display: "flex", alignItems: "center", gap: 20 * k }}>
        <NoteIcon s={86 * k} /><span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 52 * k, color: "#16161a" }}>Notely Pro</span>
      </div>
      <div style={{ position: "absolute", left: 50 * k, top: 170 * k, fontFamily: F.body, fontWeight: 900, fontSize: 170 * k, color: "#16161a", letterSpacing: -5 * k }}>$20<span style={{ fontSize: 52 * k, fontWeight: 600, color: "#8a8780" }}> / month</span></div>
      <div style={{ position: "absolute", left: 50 * k, top: 410 * k, display: "flex", gap: 30 * k }}>
        {["Search", "Sync", "Export"].map((f) => <span key={f} style={{ fontFamily: F.body, fontWeight: 600, fontSize: 34 * k, color: "#16161a" }}>• {f}</span>)}
      </div>
      {tag}
    </Card>
  );
};
const Stars: React.FC<{ x: number; y: number; now: number }> = ({ x, y, now }) => (
  <>{[0, 1, 2].map((i) => { const a = now * 6 + (i * Math.PI * 2) / 3; return <svg key={i} width={40} height={40} viewBox="0 0 24 24" style={{ position: "absolute", left: x + Math.cos(a) * 90 - 20, top: y + Math.sin(a) * 26 - 20 }}><path fill="#ffd34d" d="M12 2l3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.6 5.6 21.2l1.6-7.1L1.8 9.3 9 8.6z" /></svg>; })}</>
);
type B = (now: number, T: (k: string) => number) => React.ReactNode;

// 1. HOOK: Clawd is already mid-leap at the app; a shield flashes on and it bonks off; it lands dizzy
const b1: B = (now, T) => {
  const t0 = T("b1"), hit = T("anymore") - 0.05;
  const PX = 18, home = { x: 378, y: 1270 };
  const before = now < hit;
  let cx = home.x, cy = home.y, rot = 0, sy = 1, sx = 1, step = 0;
  if (before) {
    const run = c01((now - t0) / 0.85);
    cx = -60 + (home.x + 60) * Easing_out(run); step = run < 1 ? Math.sin((now - t0) * 26) : 0; cy = home.y - (run < 1 ? Math.abs(Math.sin((now - t0) * 13)) * 16 : 0);
    if (now >= hit - 0.45 && now < hit - 0.22) { const k = c01((now - hit + 0.45) / 0.15); sy = 1 - 0.25 * k; sx = 1 + 0.15 * k; }
    if (now >= hit - 0.22) { const k = c01((now - hit + 0.22) / 0.22); cy = home.y - (home.y - 1000) * k; sy = 1.1; }
  } else {
    const u = now - hit;
    if (u < 0.6) { const k = u / 0.6; cy = 1000 + (home.y - 1030) * k * k - Math.sin(k * Math.PI) * 140; cx = home.x - 60 * Math.sin(k * Math.PI); rot = -200 * k; }
    else { const u2 = u - 0.6; rot = -200 + 20 * Math.sin(u2 * 10) * Math.exp(-u2 * 3) - (u2 < 0.2 ? 0 : -20); sy = u2 < 0.15 ? 0.8 : 1; rot = 160 + 12 * Math.sin(u2 * 9); }
  }
  const flash = before ? 0 : 1 - c01((now - hit) / 0.5);
  const shieldOn = !before;
  const ring = ease(now - hit, 0.4);
  return (
    <>
      <Head t={now - t0 + 1} a="Not dangerous" i="anymore." top={190} size={84} />
      <AppCard x={270} y={480} w={540} t={now - t0 + 1} />
      {shieldOn ? (
        <>
          <div style={{ position: "absolute", left: 540 - 340, top: 690 - 340, width: 680, height: 680, borderRadius: "50%", border: `8px solid ${SHIELD}`, background: `radial-gradient(circle, rgba(59,130,246,${0.08 + 0.3 * flash}) 55%, rgba(59,130,246,${0.25 + 0.4 * flash}) 100%)`, boxShadow: `0 0 ${60 + 80 * flash}px rgba(59,130,246,0.7)`, transform: `scale(${0.85 + 0.15 * c01(sp(now - hit, 260))})` }} />
          <div style={{ position: "absolute", left: 540 - 340 * ring - 20, top: 1010 - 30, width: 680 * ring + 40, height: 60, borderRadius: "50%", border: `6px solid #9cc3ff`, opacity: 1 - ring }} />
          <Img src={logo} style={{ position: "absolute", left: 760, top: 860, width: 150, height: 150, transform: `scale(${sp(now - hit - 0.1, 240)})` }} />
        </>
      ) : null}
      <Clawd x={cx} y={cy} px={PX} sx={sx} sy={sy} rot={rot} step={step} />
      {now >= hit + 0.6 ? <Stars x={home.x + 162} y={home.y + 130} now={now} /> : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1480, textAlign: "center", opacity: c01((now - hit) / 0.3) }}><Mono s={20} c={SHIELD} w={800}>BLOCKED BY BLA</Mono></div>
    </>
  );
};

// 2. Flashback to 41: a polaroid, the mini app shatters on "pull apart"
const b2: B = (now, T) => {
  const t0 = T("b2"), tp = T("pull");
  const burst = ease(now - tp, 0.5);
  const tilt = -4 + 2 * Math.sin((now - t0) * 1.5);
  return (
    <>
      <Head t={now - t0} a="Last time:" i="REA." top={190} size={100} />
      <div style={{ position: "absolute", left: 140, top: 400, width: 800, height: 900, background: "#ffffff", borderRadius: 18, boxShadow: "0 30px 60px rgba(0,0,0,0.18)", transform: `rotate(${tilt}deg) scale(${c01(sp(now - t0, 180))})`, padding: 34 }}>
        <div style={{ position: "relative", width: 732, height: 700, background: "#0d0d10", borderRadius: 8, overflow: "hidden" }}>
          {Array.from({ length: 16 }).map((_, i) => {
            const gx = i % 4, gy = Math.floor(i / 4), s = 110;
            const dx = (gx - 1.5) * 90 + (rnd(i) - 0.5) * 160, dy = (gy - 1.5) * 90 + (rnd(i + 5) - 0.5) * 160;
            return <div key={i} style={{ position: "absolute", left: 146 + gx * s, top: 120 + gy * s, width: s - 4, height: s - 4, background: i === 0 ? APP : "#ffffff", borderRadius: 6, transform: `translate(${dx * burst}px, ${dy * burst}px) rotate(${(rnd(i + 9) - 0.5) * 140 * burst}deg)` }} />;
          })}
          <div style={{ position: "absolute", left: 160, top: 150, fontFamily: F.body, fontWeight: 900, fontSize: 120, color: "#16161a", opacity: 1 - burst }}>$20</div>
          <Clawd x={150 + (now >= tp ? 60 : 0)} y={now >= tp ? 420 - 150 * Math.sin(c01((now - tp) / 0.4) * Math.PI) : 560} px={14} arm={now >= tp && now < tp + 0.3 ? 1 : 0} />
        </div>
        <div style={{ marginTop: 26, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 54, color: "#16161a" }}>reel 41</span>
          <span style={{ padding: "10px 22px", borderRadius: 999, background: "#16161a" }}><Mono s={22} c="#ffffff" w={800}>REA · 441K ★</Mono></span>
        </div>
      </div>
    </>
  );
};

// 3. A college student: a laptop wearing a graduation cap, the repo and its commits; REA gets struck out
const b3: B = (now, T) => {
  const t0 = T("b3"), tb = T("beat");
  const commits = Math.round(385 * ease(now - t0 - 0.2, 1.0));
  const strike = ease(now - tb, 0.3);
  return (
    <>
      <Head t={now - t0} a="A student" i="did this." top={190} size={104} />
      <div style={{ position: "absolute", left: 170, top: 520, width: 740, transform: `translateY(${(1 - c01(sp(now - t0, 170))) * 80}px)` }}>
        <svg width={260} height={150} viewBox="0 0 260 150" style={{ position: "absolute", left: 240, top: -118, transform: `rotate(${-6 + 3 * Math.sin(now * 4)}deg)` }}>
          <polygon points="130,10 250,55 130,100 10,55" fill={TH.ink} />
          <rect x={80} y={70} width={100} height={50} rx={8} fill={TH.ink} />
          <line x1={230} y1={58} x2={232} y2={120} stroke="#ffd34d" strokeWidth={6} /><circle cx={232} cy={126} r={10} fill="#ffd34d" />
        </svg>
        <div style={{ height: 420, borderRadius: "26px 26px 0 0", background: "#0d0d10", border: `10px solid ${TH.ink}`, borderBottom: "none", padding: 40 }}>
          <div style={{ fontFamily: F.mono, fontSize: 38, color: "#f2f2f5" }}>qybaihe/<b>bla</b></div>
          <div style={{ marginTop: 30, fontFamily: F.body, fontWeight: 900, fontSize: 130, color: "#9fe870", letterSpacing: -3 }}>{commits}</div>
          <Mono s={24} c="#8a8a95">COMMITS · MIT · FREE</Mono>
        </div>
        <div style={{ height: 36, margin: "0 -60px", borderRadius: "0 0 30px 30px", background: TH.ink }} />
      </div>
      <div style={{ position: "absolute", left: 300, top: 1140, display: "flex", alignItems: "center", gap: 18, padding: "18px 34px", borderRadius: 999, background: "#1b1b20", opacity: c01((now - t0 - 0.3) / 0.2) }}>
        <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 52, color: "#f2f2f5", letterSpacing: 4 }}>REA</span>
        <Mono s={22} c="#8a8a95">441K STARS</Mono>
        <div style={{ position: "absolute", left: 20, top: "50%", height: 10, borderRadius: 5, background: RED, width: `${strike * 440}px`, transform: "rotate(-6deg)" }} />
      </div>
      {now >= tb ? <div style={{ position: "absolute", left: 700, top: 1080, transform: `rotate(12deg) scale(${sp(now - tb, 300)})`, padding: "12px 24px", border: `6px solid ${RED}`, borderRadius: 14 }}><span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 48, color: RED }}>BEATEN</span></div> : null}
    </>
  );
};

// 4. He doesn't block the AI: a wall builds, then crosses out; the app whispers a lie to Clawd
const b4: B = (now, T) => {
  const t0 = T("b4"), tk = T("block"), tl = T("lies");
  const lie = now >= tl - 0.15;
  return (
    <>
      <Head t={now - t0} a={lie ? "It" : "No"} i={lie ? "lies." : "wall."} top={190} size={120} />
      {!lie ? (
        <>
          <div style={{ position: "absolute", left: 190, top: 500, width: 700, height: 560, display: "flex", flexWrap: "wrap", gap: 10, alignContent: "flex-start" }}>
            {Array.from({ length: 24 }).map((_, i) => {
              const row = Math.floor(i / 4);
              return <div key={i} style={{ width: 167, height: 84, borderRadius: 8, background: "#7a4b3a", border: "4px solid #4a2a20", transform: `translateY(${(1 - c01(sp(now - t0 - row * 0.08 - (i % 4) * 0.03, 220))) * -500}px)`, opacity: c01((now - t0 - row * 0.08) / 0.1) }} />;
            })}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1100, textAlign: "center" }}><Mono s={30} c={TH.ink} w={800}>BLOCK</Mono></div>
          {now >= tk ? (
            <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
              <path d="M 200 480 L 880 1080" stroke={RED} strokeWidth={30} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ease(now - tk, 0.2)} />
              <path d="M 880 480 L 200 1080" stroke={RED} strokeWidth={30} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ease(now - tk - 0.15, 0.2)} />
            </svg>
          ) : null}
        </>
      ) : (
        <>
          <AppCard x={500} y={470} w={460} t={1} />
          <In t={now - tl} style={{ left: 120, top: 860 }}>
            <div style={{ position: "relative", width: 640, padding: "28px 34px", borderRadius: 30, background: "#ffffff", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
              <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 44, color: "#16161a", lineHeight: 1.25 }}>{typed("Psst. The real code is this way...", now - tl - 0.1, 30)}</div>
              <div style={{ position: "absolute", right: 120, top: -28, width: 0, height: 0, borderLeft: "26px solid transparent", borderRight: "26px solid transparent", borderBottom: "30px solid #ffffff" }} />
            </div>
          </In>
          <Clawd x={150 + 20 * Math.sin(now * 6)} y={1180} px={18} step={Math.sin(now * 14)} />
          <svg width={300} height={120} viewBox="0 0 300 120" style={{ position: "absolute", left: 640, top: 1200, opacity: c01((now - tl - 0.6) / 0.2) }}>
            <path d="M 10 60 H 230" stroke="#ffd34d" strokeWidth={14} strokeDasharray="30 18" strokeDashoffset={-(now * 120) % 48} />
            <path d="M 210 20 L 280 60 L 210 100 Z" fill="#ffd34d" />
          </svg>
          <div style={{ position: "absolute", left: 650, top: 1330, opacity: c01((now - tl - 0.8) / 0.2) }}><Mono s={22} c="#ffd34d" w={800}>FAKE ARROW</Mono></div>
        </>
      )}
    </>
  );
};

// 5. It's called BLA: the logo springs in with a light sweep
const b5: B = (now, T) => {
  const t0 = T("b5");
  const sweep = c01((now - t0 - 0.3) / 0.6);
  return (
    <>
      <div style={{ position: "absolute", left: 290, top: 420, width: 500, height: 500, transform: `scale(${sp(now - t0, 200)}) rotate(${(1 - c01(sp(now - t0, 200))) * -20}deg)` }}>
        <Img src={logo} style={{ width: 500, height: 500, filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.4))" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(110deg, transparent ${sweep * 140 - 40}%, rgba(255,255,255,0.55) ${sweep * 140 - 25}%, transparent ${sweep * 140 - 10}%)`, WebkitMaskImage: `url(${logo})`, WebkitMaskSize: "100% 100%" }} />
      </div>
      <In t={now - t0 - 0.2} style={{ left: 0, right: 0, top: 960, textAlign: "center", fontFamily: F.body, fontWeight: 900, fontSize: 170, color: TH.ink, letterSpacing: 12 }}>BLA</In>
      <In t={now - t0 - 0.35} style={{ left: 0, right: 0, top: 1170, textAlign: "center" }}><Mono s={32} c={TH.dim} w={700}>BLIND LLM AGENTS</Mono></In>
    </>
  );
};

// 6. The traps: the app is stamped HARDENED; fake password, decoy code, dead end drop in; all of them look real
const b6: B = (now, T) => {
  const t0 = T("b6"), tf = T("fake"), td = T("decoy"), te = T("dead"), tr = T("look");
  const real = now >= tr;
  const traps: { t: number; title: string; body: React.ReactNode }[] = [
    { t: tf, title: "FAKE PASSWORD", body: <span style={{ fontFamily: F.mono, fontSize: 30, color: "#16161a" }}>admin_pass =<br />"Pr0-2026!"</span> },
    { t: td, title: "DECOY CODE", body: <span style={{ fontFamily: F.mono, fontSize: 30, color: "#16161a" }}>unlockPro()<br />{"{ ... }"}</span> },
    { t: te, title: "DEAD END", body: <svg width={120} height={110} viewBox="0 0 120 110"><rect x={20} y={10} width={80} height={95} rx={6} fill="none" stroke="#16161a" strokeWidth={6} /><circle cx={84} cy={60} r={6} fill="#16161a" /><path d="M 0 105 H 120" stroke="#16161a" strokeWidth={6} /></svg> },
  ];
  return (
    <>
      <Head t={now - t0} a="Traps" i="everywhere." top={190} size={104} />
      <AppCard x={270} y={370} w={540} t={now - t0} />
      {now >= t0 + 0.4 ? (
        <div style={{ position: "absolute", left: 640, top: 340, transform: `rotate(10deg) scale(${sp(now - t0 - 0.4, 300)})`, display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 14, background: SHIELD, boxShadow: "0 12px 24px rgba(0,0,0,0.2)" }}>
          <Img src={logo} style={{ width: 48, height: 48 }} /><span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 32, color: "#fff" }}>HARDENED</span>
        </div>) : null}
      {traps.map((tp, i) => {
        const k = sp(now - tp.t, 220);
        return now >= tp.t - 0.05 ? (
          <div key={i} style={{ position: "absolute", left: 45 + i * 335, top: 830 + (1 - c01(k)) * -260, width: 320, height: 470, borderRadius: 26, background: "#ffffff", boxShadow: "0 20px 40px rgba(0,0,0,0.12)", transform: `rotate(${(i - 1) * 4}deg)`, opacity: c01((now - tp.t + 0.05) / 0.1) }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 40, height: 180, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>{tp.body}</div>
            <div style={{ position: "absolute", left: 20, right: 20, bottom: 30, padding: "14px 0", borderRadius: 14, textAlign: "center", background: real ? GREEN : "#16161a", transform: `scale(${real ? 1 + 0.12 * Math.sin(c01((now - tr - i * 0.1) / 0.3) * Math.PI) : 1})` }}>
              <Mono s={22} c="#ffffff" w={800}>{real ? "LOOKS REAL" : tp.title}</Mono>
            </div>
          </div>
        ) : null;
      })}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1340, textAlign: "center", opacity: c01((now - tf) / 0.3) }}><Mono s={18}>ILLUSTRATIVE</Mono></div>
    </>
  );
};

// 7. The chase: a night maze; Clawd runs after ghost files that vanish; smacks a limit wall; a token meter burns
const b7: B = (now, T) => {
  const t0 = T("b7"), tc = T("chases"), th = T("hits"), tb = T("burns");
  const PATH: [number, number][] = [[140, 1180], [140, 900], [420, 900], [420, 620], [760, 620], [760, 900], [900, 900]];
  const segLen = PATH.slice(1).map((p, i) => Math.abs(p[0] - PATH[i][0]) + Math.abs(p[1] - PATH[i][1]));
  const total = segLen.reduce((a, b) => a + b, 0);
  const prog = c01((now - t0) / Math.max(1, th - t0)) * total;
  let d = prog, pos = PATH[0];
  for (let i = 0; i < segLen.length; i++) { if (d <= segLen[i]) { const a = PATH[i], b = PATH[i + 1], k = d / segLen[i]; pos = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; break; } d -= segLen[i]; pos = PATH[i + 1]; }
  const smack = now >= th;
  const ghosts: [number, number, number][] = [[140, 760, 0.25], [560, 620, 0.55], [760, 760, 0.8]];
  const tokens = Math.round(12000 * Math.pow(c01((now - tb) / 1.4), 2) * 1000);
  return (
    <>
      <Head t={now - t0} a={smack ? "Out of" : "Chasing"} i={smack ? "room." : "ghosts."} top={190} size={104} />
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        {["M 60 520 H 1020 V 1300 H 60 Z", "M 60 1040 H 280", "M 280 760 V 1300", "M 280 760 H 600", "M 600 760 V 1040", "M 600 1040 H 880", "M 880 760 V 1040", "M 880 520 V 680", "M 520 520 V 520"].map((p, i) => <path key={i} d={p} stroke={TH.line} strokeWidth={22} fill="none" strokeLinecap="round" />)}
        {smack ? <rect x={940} y={760} width={30} height={300} rx={10} fill={RED} opacity={0.6 + 0.4 * Math.sin(now * 20)} /> : null}
      </svg>
      {ghosts.map(([gx, gy, f], i) => {
        const reached = prog / total > f;
        const fade = reached ? 1 - c01((prog / total - f) * 8) : 1;
        return fade > 0.01 ? (
          <div key={i} style={{ position: "absolute", left: gx - 50, top: gy - 70 + 10 * Math.sin(now * 4 + i), opacity: fade * c01((now - t0 - i * 0.2) / 0.3), transform: `scale(${1 + (1 - fade) * 0.5})` }}>
            <svg width={100} height={120} viewBox="0 0 100 120"><path d="M 10 110 V 50 a 40 40 0 0 1 80 0 V 110 l -13 -12 l -13 12 l -14 -12 l -14 12 l -13 -12 Z" fill="#ffffff" opacity={0.9} /><circle cx={36} cy={50} r={7} fill="#08201a" /><circle cx={64} cy={50} r={7} fill="#08201a" /></svg>
            <div style={{ textAlign: "center", marginTop: -6 }}><Mono s={16} c={TH.ink}>{["key.txt", "pro.js", "admin"][i]}</Mono></div>
          </div>
        ) : null;
      })}
      <Clawd x={pos[0] - 99 + (smack ? -30 * Math.exp(-(now - th) * 6) : 0)} y={pos[1] - 40} px={11} step={smack ? 0 : Math.sin(now * 22)} sx={smack && now - th < 0.2 ? 0.75 : 1} />
      {smack ? <div style={{ position: "absolute", left: 640, top: 1080, transform: `scale(${sp(now - th, 300)})`, padding: "12px 22px", borderRadius: 14, background: RED }}><Mono s={24} c="#ffffff" w={800}>LIMIT REACHED</Mono></div> : null}
      {now >= tb - 0.1 ? (
        <div style={{ position: "absolute", left: 140, right: 140, top: 1340, display: "flex", alignItems: "center", gap: 18, padding: "18px 28px", borderRadius: 22, background: TH.card, border: `3px solid ${now >= tb + 0.6 ? "#ff8a3d" : TH.line}`, opacity: c01((now - tb + 0.1) / 0.15) }}>
          <svg width={50} height={60} viewBox="0 0 50 60" style={{ transform: `scale(${1 + 0.1 * Math.sin(now * 18)})` }}><path d="M25 2 C 30 18, 46 24, 42 42 C 40 54, 30 58, 25 58 C 14 58, 6 50, 8 38 C 10 28, 18 26, 18 14 C 22 18, 24 22, 25 2 Z" fill="#ff8a3d" /></svg>
          <Mono s={22} c={TH.dim}>TOKENS BURNED</Mono>
          <span style={{ marginLeft: "auto", fontFamily: F.mono, fontWeight: 800, fontSize: 46, color: "#ff8a3d" }}>{tokens.toLocaleString("en-US")}</span>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1460, textAlign: "center" }}><Mono s={16}>ILLUSTRATIVE</Mono></div>
    </>
  );
};

// 8. The proof: a terminal runs the real REA against BLA's samples; the README's real results scroll in
const b8: B = (now, T) => {
  const t0 = T("b8");
  const LINES: [string, string][] = [["Electron ASAR", "capacity error"], ["WebAssembly", "interface budget"], ["JavaScript", "budget rejected"], ["SQLite", "column eval failed"], ["Go buildinfo", "capacity error"], ["GGUF model", "capacity error"]];
  return (
    <>
      <Head t={now - t0} a="Tested on" i="real REA." top={190} size={100} />
      <Card x={70} y={420} w={940} h={860} t={now - t0} fill="#0a0a0c" r={28}>
        <div style={{ height: 64, background: "#1b1b20", borderRadius: "28px 28px 0 0", display: "flex", alignItems: "center", gap: 10, paddingLeft: 24 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}
          <span style={{ marginLeft: 16 }}><Mono s={20} c="#8a8a95" w={500}>~/bla · a normal laptop</Mono></span>
        </div>
        <div style={{ position: "absolute", left: 36, right: 36, top: 100, fontFamily: F.mono, fontSize: 32, color: "#c9c9d2", lineHeight: 1.7 }}>
          <div><span style={{ color: SHIELD }}>$</span> {typed("npm run redteam:rea", now - t0 - 0.2, 24)}</div>
          {LINES.map(([f, r], i) => {
            const ti = t0 + 1.3 + i * 0.45;
            return now >= ti ? (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", opacity: c01((now - ti) / 0.12) }}>
                <span>REA ▸ {f}</span><span style={{ color: RED }}>✗ {r}</span>
              </div>
            ) : null;
          })}
        </div>
      </Card>
    </>
  );
};

// 9. 10 kinds of files, 10 walls
const FILES = ["Electron ASAR", "WebAssembly", "JavaScript", "SQLite", "Go buildinfo", "Erlang BEAM", "PCAP", "Safetensors", "GGUF", "Electron fuses"];
const b9: B = (now, T) => {
  const t0 = T("b9"), tw = T("walls");
  const span = Math.max(1.2, tw - t0 + 0.6);
  const n = Math.min(10, Math.floor(c01((now - t0) / span) * 10 + 0.0001) + (now >= t0 ? 1 : 0));
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 170, textAlign: "center", fontFamily: F.body, fontWeight: 900, fontSize: 200, color: TH.ink, letterSpacing: -4 }}>{n}<span style={{ fontSize: 90, opacity: 0.6 }}>/10</span></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 420, textAlign: "center" }}><Mono s={30} c={TH.ink} w={800}>WALLS HIT</Mono></div>
      {FILES.map((f, i) => {
        const ti = t0 + (i / 10) * span;
        const on = now >= ti;
        return (
          <div key={i} style={{ position: "absolute", left: 80 + (i % 2) * 470, top: 520 + Math.floor(i / 2) * 150, width: 450, height: 120, borderRadius: 22, background: "#ffffff", display: "flex", alignItems: "center", paddingLeft: 28, gap: 16, opacity: c01((now - t0 + 0.4 - i * 0.03) / 0.15), overflow: "hidden" }}>
            <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 36, color: "#16161a" }}>{f}</span>
            {on ? <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 110, background: "#16161a", transform: `translateX(${(1 - c01(sp(now - ti, 400))) * 120}px)`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 54, color: RED }}>✗</span></div> : null}
          </div>
        );
      })}
    </>
  );
};

// 10. 3,000 stars in 2 weeks
const b10: B = (now, T) => {
  const t0 = T("b10"), tw = T("weeks");
  const stars = Math.round(3087 * ease(now - t0, Math.max(0.8, tw - t0)));
  const bar = ease(now - t0 - 0.3, Math.max(0.8, tw - t0));
  return (
    <>
      <Head t={now - t0} a="In two" i="weeks." top={190} size={110} />
      <In t={now - t0} style={{ left: 0, right: 0, top: 500, display: "flex", justifyContent: "center", alignItems: "center", gap: 24 }}>
        <svg width={150} height={150} viewBox="0 0 24 24" style={{ transform: `rotate(${(now - t0) * 60}deg)` }}><path fill="#e3b341" d="M12 2l3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.6 5.6 21.2l1.6-7.1L1.8 9.3 9 8.6z" /></svg>
        <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 200, color: TH.ink, letterSpacing: -6 }}>{stars.toLocaleString("en-US")}</span>
      </In>
      <In t={now - t0 - 0.1} style={{ left: 0, right: 0, top: 760, textAlign: "center" }}><Mono s={30} c={TH.ink} w={800}>STARS ON GITHUB · qybaihe/bla</Mono></In>
      <div style={{ position: "absolute", left: 120, right: 120, top: 900, opacity: c01((now - t0 - 0.3) / 0.2) }}>
        <div style={{ display: "flex", gap: 8 }}>
          {Array.from({ length: 14 }).map((_, i) => <div key={i} style={{ flex: 1, height: 90, borderRadius: 12, background: i / 14 < bar ? "#e3b341" : TH.line, transform: `scale(${i / 14 < bar ? 1 : 0.9})` }} />)}
        </div>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}><Mono s={26} c={TH.ink} w={800}>OCT 25 · CREATED</Mono><Mono s={26} c={TH.ink} w={800}>NOV 8</Mono></div>
      </div>
    </>
  );
};

// 11. Your users get the exact same app: before and after, an equals sign, 100% same output
const b11: B = (now, T) => {
  const t0 = T("b11"), ts = T("same");
  const Phone: React.FC<{ x: number; label: string; t: number; badge?: boolean }> = ({ x, label, t, badge }) => (
    <div style={{ position: "absolute", left: x, top: 450, width: 340, height: 640, borderRadius: 50, background: "#16161a", padding: 16, transform: `translateY(${(1 - c01(sp(t, 180))) * 200}px)`, opacity: c01(t / 0.15) }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 38, background: "#ffffff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 30, top: 60, display: "flex", alignItems: "center", gap: 14 }}><NoteIcon s={60} /><span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 30, color: "#16161a" }}>Notely Pro</span></div>
        {[0, 1, 2, 3].map((i) => <div key={i} style={{ position: "absolute", left: 30, right: 30, top: 170 + i * 90, height: 66, borderRadius: 14, background: "#f4f2ee" }} />)}
        {badge ? <Img src={logo} style={{ position: "absolute", right: 18, top: 18, width: 56, height: 56 }} /> : null}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: -60, textAlign: "center" }}><Mono s={24} c={TH.ink} w={800}>{label}</Mono></div>
    </div>
  );
  return (
    <>
      <Head t={now - t0} a="Same" i="app." top={190} size={120} />
      <Phone x={110} label="BEFORE" t={now - t0} />
      <Phone x={630} label="AFTER BLA" t={now - t0 - 0.2} badge />
      <div style={{ position: "absolute", left: 490, top: 690, fontFamily: F.body, fontWeight: 900, fontSize: 130, color: TH.ink, transform: `scale(${sp(now - t0 - 0.4, 260)})` }}>=</div>
      {now >= ts - 0.1 ? (
        <In t={now - ts + 0.1} style={{ left: 0, right: 0, top: 1210, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 34px", borderRadius: 999, background: "#ffffff" }}><Check t={now - ts} size={48} /><Mono s={28} c={TH.ink} w={800}>100% SAME OUTPUT</Mono></div>
        </In>
      ) : null}
    </>
  );
};

// 12. Comment BLA; the setup guide card
const b12: B = (now, T) => {
  const t0 = T("b12"), tg = T("setup");
  return (
    <>
      <In t={now - t0} style={{ left: 0, right: 0, top: 300, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: TH.card, borderRadius: 999, padding: "18px 40px 18px 18px", boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}>
          <Img src={logo} style={{ width: 64, height: 64 }} />
          <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 48, color: TH.dim }}>Comment</span>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 56, color: TH.ink, letterSpacing: 3, minWidth: 140 }}>{typed("BLA", now - t0 - 0.3, 8)}</span>
        </div>
      </In>
      {now >= tg - 0.9 ? (
        <Card x={150} y={520} w={780} h={700} t={now - tg + 0.9} fill={TH.card} r={34}>
          <div style={{ position: "absolute", left: 44, top: 40 }}><Mono s={22}>SETUP GUIDE · BLA + CLAUDE CODE</Mono></div>
          <div style={{ position: "absolute", left: 44, top: 100, fontFamily: SERIF, fontSize: 60, color: TH.ink }}>Shield <span style={{ fontStyle: "italic" }}>your</span> app</div>
          {["Install it (one command)", "Harden before you ship", "Check it still works", "Test it with REA"].map((r, i) => (
            <div key={i} style={{ position: "absolute", left: 44, right: 44, top: 240 + i * 105, height: 88, borderTop: `2px solid ${TH.line}`, display: "flex", alignItems: "center", gap: 18, opacity: c01((now - tg + 0.7 - i * 0.1) / 0.15) }}>
              <Check t={now - tg + 0.6 - i * 0.1} size={40} />
              <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 38, color: TH.ink }}>{r}</span>
            </div>
          ))}
        </Card>
      ) : null}
    </>
  );
};

const BEATS: { key: string; draw: B; world: string; tab: number }[] = [
  { key: "b1", draw: b1, world: "dark", tab: -1 }, { key: "b2", draw: b2, world: "white", tab: -1 }, { key: "b3", draw: b3, world: "amber", tab: -1 },
  { key: "b4", draw: b4, world: "violet", tab: 0 }, { key: "b5", draw: b5, world: "blue", tab: 0 }, { key: "b6", draw: b6, world: "white", tab: 1 },
  { key: "b7", draw: b7, world: "maze", tab: 2 }, { key: "b8", draw: b8, world: "dark", tab: 3 }, { key: "b9", draw: b9, world: "red", tab: 3 },
  { key: "b10", draw: b10, world: "white", tab: 3 }, { key: "b11", draw: b11, world: "green", tab: 3 }, { key: "b12", draw: b12, world: "white", tab: -1 },
];
const TABS = ["01 THE TRICK", "02 THE TRAPS", "03 THE CHASE", "04 THE PROOF"];

export const BlaView: View = {
  View: ({ t0, at, p, words }) => {
    const now = t0 + useCurrentFrame() / FPS;
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => (k === "b1" ? t0 : parts[k] ? at(parts[k]) - 0.08 : 999);
    const starts = BEATS.map((b) => T(b.key));
    let cur = 0;
    starts.forEach((s, i) => { if (now >= s) cur = i; });
    const prev = W[BEATS[Math.max(0, cur - 1)].world];
    TH = W[BEATS[cur].world];
    const flood = cur === 0 ? 1 : ease(now - starts[cur], 0.4);
    const push = 1 + 0.025 * c01((now - starts[cur]) / 3);
    const tab = BEATS[cur].tab;
    const capAccent = TH === W.white ? "#2f5ff0" : TH === W.dark ? "#6aa5ff" : TH === W.amber || TH === W.red || TH === W.blue ? "#ffffff" : TH === W.green ? "#1a9c55" : TH.accent;
    const capInk = TH === W.amber ? "#1d1606" : TH.ink;
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, background: prev.bg, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: TH.bg, clipPath: `circle(${flood * 130}% at 50% 45%)` }} />
        {tab >= 0 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 90, display: "flex", justifyContent: "center", gap: 10 }}>
            {TABS.map((l, i) => <div key={i} style={{ fontFamily: F.mono, fontSize: 18, letterSpacing: 2, padding: "8px 14px", borderRadius: 999, background: i === tab ? TH.ink : "transparent", color: i === tab ? TH.bg : TH.dim, border: `2px solid ${i === tab ? TH.ink : TH.dim}` }}>{l}</div>)}
          </div>
        ) : null}
        <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "50% 45%" }}>{BEATS[cur].draw(now, T)}</div>
        {words ? <Captions words={words} now={now} ink={capInk} accent={capAccent} /> : null}
      </div>
    );
  },
  hits: ({ at, p }) => {
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => at(parts[k]);
    const soft = 0.62;
    return [
      { t: 0.02, sound: "whoosh", gain: 0.2 }, { t: T("anymore") - 0.05, sound: "impact", gain: 0.3 }, { t: T("anymore"), sound: "subdrop", gain: 0.35 }, { t: T("anymore") + 0.55, sound: "boing", gain: 0.18 * soft },
      { t: T("b2"), sound: "swish", gain: 0.2 * soft }, { t: T("pull"), sound: "glass", gain: 0.18 * soft },
      { t: T("b3"), sound: "swish", gain: 0.2 * soft }, { t: T("beat"), sound: "stamp", gain: 0.2 * soft },
      { t: T("b4"), sound: "swish", gain: 0.2 * soft }, { t: T("block"), sound: "thud", gain: 0.2 * soft }, { t: T("lies"), sound: "pop", gain: 0.18 * soft },
      { t: T("b5"), sound: "sparkle", gain: 0.2 * soft },
      { t: T("b6") + 0.4, sound: "stamp", gain: 0.18 * soft }, { t: T("fake"), sound: "click", gain: 0.15 * soft }, { t: T("decoy"), sound: "click", gain: 0.15 * soft }, { t: T("dead"), sound: "click", gain: 0.15 * soft },
      { t: T("b7"), sound: "whoosh", gain: 0.18 * soft }, { t: T("hits"), sound: "thud", gain: 0.22 * soft }, { t: T("burns"), sound: "riser", gain: 0.15 * soft },
      { t: T("b8") + 0.2, sound: "typing", gain: 0.15 * soft },
      { t: T("b9"), sound: "swish", gain: 0.2 * soft }, { t: T("b10"), sound: "ding", gain: 0.16 * soft },
      { t: T("b11"), sound: "swish", gain: 0.2 * soft }, { t: T("same"), sound: "pop", gain: 0.18 * soft },
      { t: T("b12") + 0.3, sound: "typing", gain: 0.15 * soft },
    ];
  },
};
