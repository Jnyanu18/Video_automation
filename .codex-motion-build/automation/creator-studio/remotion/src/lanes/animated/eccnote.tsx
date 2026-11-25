import React from "react";
import { useCurrentFrame, Img, staticFile } from "remotion";
import { F, FPS } from "../../kit/theme";
import type { View } from "./faceless";
import { SERIF, c01, sp, ease, In, Card, Check, typed, Captions } from "./keynote";

/** ECC in the keynote system (ecc-keynote, 2026-11-08): the same script and voice as 44-ecc-dev-team, in our own look
 *  (Vishnu: "another video on the same script, our previously referenced style"). A colour world per beat flooding from
 *  the centre, chapter tabs, serif headlines with one italic word. Real: ECC's block-E icon, the Claude symbol, the stars, contents, install and hackathon (README, 2026-11-08). The course and its
 *  price are ILLUSTRATIVE. */

type World = { bg: string; ink: string; dim: string; line: string; card: string; accent: string };
const W: Record<string, World> = {
  dark: { bg: "#0d0d10", ink: "#f2f2f5", dim: "#83838f", line: "#26262e", card: "#17171c", accent: "#f59e0b" },
  white: { bg: "#f4f2ee", ink: "#16161a", dim: "#8a8780", line: "#e4e1da", card: "#ffffff", accent: "#2f5ff0" },
  amber: { bg: "#f59e0b", ink: "#1d1606", dim: "#6b4a06", line: "#d98a07", card: "#fff6dc", accent: "#1d1606" },
  blue: { bg: "#1f4fe0", ink: "#ffffff", dim: "#c7d5ff", line: "#3a63e8", card: "#ffffff", accent: "#ffd23f" },
  gold: { bg: "#16130b", ink: "#fff6d8", dim: "#a8986a", line: "#2c2615", card: "#211c10", accent: "#ffd23f" },
  green: { bg: "#d9f2e2", ink: "#0f2a1b", dim: "#4f7a60", line: "#b6e2c6", card: "#ffffff", accent: "#2fbf71" },
};
let TH: World = W.dark;
const GREEN = "#2fbf71", RED = "#ff4d4f", CLAY = "#d97757", GOLD = "#e3b341";
const ECC = staticFile("ecc-keynote/raw/ecc_icon.svg");
const CLAUDE = staticFile("ecc-keynote/raw/claude_symbol.svg");
const Mono: React.FC<{ s: number; c?: string; children: React.ReactNode; w?: number }> = ({ s, c, children, w = 600 }) => <span style={{ fontFamily: F.mono, fontSize: s, letterSpacing: 2, color: c || TH.dim, fontWeight: w }}>{children}</span>;
const Head: React.FC<{ t: number; a: string; i?: string; b?: string; top?: number; size?: number }> = ({ t, a, i, b, top = 200, size = 96 }) => (
  <In t={t} dy={26} style={{ left: 50, right: 50, top, textAlign: "center", fontFamily: SERIF, fontSize: size, color: TH.ink, lineHeight: 1.05 }}>
    {a}{i ? <span style={{ fontStyle: "italic" }}> {i}</span> : null}{b ? ` ${b}` : null}
  </In>
);
const StarSvg: React.FC<{ s: number; style?: React.CSSProperties }> = ({ s, style }) => <svg width={s} height={s} viewBox="0 0 24 24" style={style}><path fill={GOLD} d="M12 2l3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.6 5.6 21.2l1.6-7.1L1.8 9.3 9 8.6z" /></svg>;
const Role: React.FC<{ x: number; y: number; t: number; name: string; icon: string; c: string; w?: number }> = ({ x, y, t, name, icon, c, w = 300 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: 96, borderRadius: 24, background: "#ffffff", boxShadow: "0 14px 30px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 16, paddingLeft: 20, transform: `scale(${c01(sp(t, 240))})`, opacity: c01(t / 0.1) }}>
    <div style={{ width: 58, height: 58, borderRadius: 16, background: c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}><span style={{ fontFamily: F.mono, fontWeight: 800, fontSize: 28, color: "#fff" }}>{icon}</span></div>
    <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 34, color: "#16161a" }}>{name}</span>
  </div>
);
type B = (now: number, T: (k: string) => number) => React.ReactNode;

// 1. HOOK: one developer and the Claude card; the dev team snaps into place around it; then $0
const ORBIT: [string, string, string][] = [["Planner", "P", "#ff4f8b"], ["Architect", "A", "#3d7bff"], ["Reviewer", "R", "#2fbf71"], ["Security", "S", "#ff8a3d"], ["Build fixer", "B", "#9b6bff"], ["Tester", "T", "#00a3a3"]];
const b1: B = (now, T) => {
  const t0 = T("b1"), tr = T("turned"), tt = T("team"), tf = T("free");
  const free = now >= tf;
  return (
    <>
      <Head t={now - t0 + 1} a={now < tt ? "One" : "A whole"} i={now < tt ? "developer." : "dev team."} top={190} size={104} />
      <div style={{ position: "absolute", left: 410, top: 680, width: 260, height: 200, borderRadius: 34, background: "#1b1b20", border: `4px solid ${CLAY}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 + 0.03 * Math.sin(now * 4)})`, boxShadow: "0 20px 50px rgba(217,119,87,0.35)" }}><Img src={CLAUDE} style={{ width: 120, height: 120, transform: `rotate(${now * 20}deg)` }} /></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 890, textAlign: "center" }}><Mono s={28} c={CLAY} w={800}>CLAUDE CODE</Mono></div>
      {ORBIT.map(([n, ic, c], i) => {
        const ti = tr + i * ((tt - tr) / 6);
        const left = i % 2 === 0;
        const x = left ? 60 : 720, y = 420 + Math.floor(i / 2) * 230 + (i >= 4 ? 280 : 0);
        return now >= ti - 0.05 ? <Role key={i} x={x + (left ? -1 : 1) * (1 - c01(sp(now - ti, 200))) * 300} y={y} t={now - ti} name={n} icon={ic} c={c} /> : null;
      })}
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        {ORBIT.map((_, i) => {
          const ti = tr + i * ((tt - tr) / 6);
          const left = i % 2 === 0;
          const y = 468 + Math.floor(i / 2) * 230 + (i >= 4 ? 280 : 0);
          const k = c01((now - ti - 0.15) / 0.3);
          return <line key={i} x1={left ? 360 : 720} y1={y} x2={(left ? 360 : 720) + ((left ? 400 : 680) - (left ? 360 : 720)) * k} y2={y + (800 - y) * k} stroke={TH.dim} strokeWidth={3} strokeDasharray="10 10" />;
        })}
      </svg>
      {free ? (
        <div style={{ position: "absolute", left: 300, top: 1150, padding: "20px 50px", borderRadius: 24, background: GREEN, transform: `rotate(-6deg) scale(${sp(now - tf, 280)})`, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
          <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 110, color: "#ffffff" }}>$0</span>
          <span style={{ marginLeft: 20 }}><Mono s={30} c="#ffffff" w={800}>FREE</Mono></span>
        </div>
      ) : (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1210, textAlign: "center" }}><Mono s={28} c={TH.ink} w={800}>{`${1 + ORBIT.filter((_, i) => now >= tr + i * ((tt - tr) / 6)).length} ON THE TEAM`}</Mono></div>
      )}
    </>
  );
};

// 2. The repo: ECC's icon, affaan-m/ECC, the stars roll to 299,359
const b2: B = (now, T) => {
  const t0 = T("b2"), ta = T("almost"), ts = T("stars");
  const stars = Math.round(299359 * ease(now - t0 - 0.3, Math.max(0.8, ts - t0)));
  return (
    <>
      <Head t={now - t0} a="Everything" i="Claude Code." top={190} size={92} />
      <Card x={90} y={420} w={900} h={760} t={now - t0} fill={TH.card} r={34}>
        <div style={{ position: "absolute", left: 50, top: 50, display: "flex", alignItems: "center", gap: 30 }}>
          <Img src={ECC} style={{ width: 170, height: 170, transform: `rotate(${(1 - c01(sp(now - t0 - 0.2, 200))) * -30}deg)` }} />
          <div><div style={{ fontFamily: F.body, fontWeight: 900, fontSize: 110, color: TH.ink, letterSpacing: 6 }}>ECC</div><Mono s={24}>affaan-m/ECC · MIT</Mono></div>
        </div>
        <div style={{ position: "absolute", left: 50, right: 50, top: 280, fontFamily: F.body, fontSize: 34, color: TH.dim, lineHeight: 1.35 }}>Skills, memory, security and research-first development for Claude Code, Codex, Cursor and beyond.</div>
        <div style={{ position: "absolute", left: 50, right: 50, top: 450, height: 2, background: TH.line }} />
        <div style={{ position: "absolute", left: 50, top: 500, display: "flex", alignItems: "center", gap: 20, opacity: c01((now - t0 - 0.2) / 0.15) }}>
          <StarSvg s={100} style={{ transform: `rotate(${(now - t0) * 70}deg) scale(${sp(now - t0 - 0.2, 220)})` }} />
          <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 140, color: TH.ink, letterSpacing: -4 }}>{stars.toLocaleString("en-US")}</span>
        </div>
        <div style={{ position: "absolute", left: 50, top: 680, opacity: c01((now - t0 - 0.3) / 0.2) }}><Mono s={26} c={TH.ink} w={800}>STARS ON GITHUB</Mono></div>
      </Card>
    </>
  );
};

// 3. Inside: 71 agents, 314 skills, 98 commands, each landing on its word
const b3: B = (now, T) => {
  const t0 = T("b3"), ta = T("a71"), ts = T("s314"), tc = T("c98");
  const rows: [number, string, number][] = [[71, "agents", ta], [314, "skills", ts], [98, "commands", tc]];
  return (
    <>
      <Head t={now - t0} a="What's" i="inside." top={190} size={110} />
      {rows.map(([n, l, t], i) => {
        const v = Math.round(n * ease(now - t, 0.6));
        const on = now >= t - 0.05;
        return (
          <div key={i} style={{ position: "absolute", left: 90, right: 90, top: 420 + i * 300, height: 260, borderRadius: 34, background: on ? TH.card : "rgba(255,255,255,0.25)", boxShadow: on ? "0 20px 40px rgba(0,0,0,0.15)" : "none", display: "flex", alignItems: "center", paddingLeft: 50, gap: 30, transform: `scale(${on ? 0.92 + 0.08 * c01(sp(now - t, 240)) : 0.92})` }}>
            <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 170, color: on ? TH.ink : TH.dim, letterSpacing: -6, minWidth: 330 }}>{on ? v : "?"}</span>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 90, color: on ? TH.ink : TH.dim }}>{l}</span>
          </div>
        );
      })}
    </>
  );
};

// 4. The team chart: your Claude at the top, the four roles join one per word, then the lines light up
const ROLES: [string, string, string, string][] = [["planner", "Planner", "P", "#ff4f8b"], ["architect", "Architect", "A", "#3d7bff"], ["reviewer", "Code reviewer", "R", "#2fbf71"], ["security", "Security", "S", "#ff8a3d"]];
const b4: B = (now, T) => {
  const t0 = T("b4"), tall = T("all");
  const live = now >= tall;
  return (
    <>
      <Head t={now - t0} a={live ? "All working" : "Your"} i={live ? "for you." : "team."} top={190} size={104} />
      <In t={now - t0} style={{ left: 330, top: 400 }}>
        <div style={{ width: 420, height: 150, borderRadius: 34, background: "#1b1b20", display: "flex", alignItems: "center", justifyContent: "center", gap: 20, boxShadow: live ? `0 0 60px rgba(255,210,63,0.7)` : "0 20px 40px rgba(0,0,0,0.3)" }}>
          <Img src={CLAUDE} style={{ width: 80, height: 80 }} /><span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 48, color: "#f2f2f5" }}>Your Claude</span>
        </div>
      </In>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        {ROLES.map(([k], i) => {
          const t = T(k);
          const x = 70 + (i % 2) * 500 + 220, y = 700 + Math.floor(i / 2) * 260;
          const d = `M 540 550 C 540 620, ${x} 620, ${x} ${y}`;
          return now >= t ? <g key={i}><path d={d} stroke={live ? TH.accent : TH.dim} strokeWidth={live ? 6 : 3} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ease(now - t, 0.4)} /></g> : null;
        })}
        {live ? ROLES.map((_, i) => {
          const x = 70 + (i % 2) * 500 + 220, y = 700 + Math.floor(i / 2) * 260;
          const k = ((now - tall) * 1.2 + i * 0.25) % 1;
          const px = 540 + (x - 540) * k, py = 550 + (y - 550) * k;
          return <circle key={`p${i}`} cx={px} cy={py} r={12} fill={TH.accent} />;
        }) : null}
      </svg>
      {ROLES.map(([k, n, ic, c], i) => {
        const t = T(k);
        return now >= t - 0.05 ? <Role key={i} x={70 + (i % 2) * 500} y={700 + Math.floor(i / 2) * 260} t={now - t} name={n} icon={ic} c={c} w={440} /> : null;
      })}
      {live ? <In t={now - tall - 0.3} style={{ left: 0, right: 0, top: 1240, textAlign: "center" }}><Mono s={26} c={TH.ink} w={800}>+ 67 MORE AGENTS</Mono></In> : null}
    </>
  );
};

// 5. The builder won an Anthropic hackathon: a winner card with a trophy and confetti
const b5: B = (now, T) => {
  const t0 = T("b5"), tw = T("won");
  return (
    <>
      <Head t={now - t0} a="Built by a" i="winner." top={190} size={104} />
      <Card x={130} y={430} w={820} h={760} t={now - t0} fill={TH.card} r={34}>
        <svg width={260} height={260} viewBox="0 0 64 64" style={{ position: "absolute", left: 280, top: 60, transform: `scale(${sp(now - t0 - 0.2, 220) * (now >= tw ? 1 + 0.12 * Math.sin(c01((now - tw) / 0.4) * Math.PI) : 1)}) rotate(${Math.sin(now * 3) * 4}deg)` }}>
          <path d="M18 8 H46 V22 C46 32 40 38 32 38 C24 38 18 32 18 22 Z" fill={GOLD} />
          <path d="M18 12 H8 C8 22 12 26 18 26 M46 12 H56 C56 22 52 26 46 26" stroke={GOLD} strokeWidth={4} fill="none" />
          <rect x={28} y={38} width={8} height={10} fill={GOLD} /><rect x={20} y={48} width={24} height={8} rx={2} fill="#8a6a1f" />
        </svg>
        <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center", fontFamily: SERIF, fontSize: 64, color: TH.ink, lineHeight: 1.1 }}>Anthropic<br /><span style={{ fontStyle: "italic" }}>hackathon</span></div>
        {now >= tw ? <div style={{ position: "absolute", left: 230, top: 540, width: 360, padding: "14px 0", textAlign: "center", borderRadius: 999, background: TH.accent, transform: `scale(${sp(now - tw - 0.1, 300)})` }}><span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 52, color: "#16130b" }}>WINNER</span></div> : null}
        <div style={{ position: "absolute", left: 0, right: 0, top: 660, textAlign: "center" }}><Mono s={20}>WITH FORUM VENTURES · SEP 2025 · AFFAAN MUSTAFA</Mono></div>
      </Card>
      {now >= tw ? Array.from({ length: 28 }).map((_, i) => {
        const u = now - tw;
        return <div key={i} style={{ position: "absolute", left: (i * 79) % 1040, top: 300 + ((u * (320 + (i % 4) * 80) + i * 50) % 1200), width: 20, height: 30, background: [GOLD, GREEN, "#2f5ff0", "#ff5ccf", RED][i % 5], transform: `rotate(${u * 300 + i * 40}deg)` }} />;
      }) : null}
    </>
  );
};

// 6. One command: the install types, then the three counts tick in
const b6: B = (now, T) => {
  const t0 = T("b6"), tw = T("whole");
  const cmd = "npx ecc-universal setup";
  return (
    <>
      <Head t={now - t0} a="One" i="command." top={190} size={120} />
      <Card x={70} y={430} w={940} h={700} t={now - t0} fill="#0a0a0c" r={28}>
        <div style={{ height: 64, background: "#1b1b20", borderRadius: "28px 28px 0 0", display: "flex", alignItems: "center", gap: 10, paddingLeft: 24 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}
          <span style={{ marginLeft: 16 }}><Mono s={20} c="#8a8a95" w={500}>~/my-app</Mono></span>
        </div>
        <div style={{ position: "absolute", left: 40, right: 40, top: 110, fontFamily: F.mono, fontSize: 40, color: "#f2f2f5", lineHeight: 1.7 }}>
          <div><span style={{ color: GOLD }}>$</span> {typed(cmd, now - t0 - 0.2, 28)}</div>
          {[["71 agents", 1.3], ["314 skills", 1.6], ["98 commands", 1.9]].map(([l, d], i) => (
            now >= t0 + (d as number) ? <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, color: "#9fe870" }}><Check t={now - t0 - (d as number)} size={44} />{l as string} installed</div> : null
          ))}
        </div>
        {now >= tw ? <div style={{ position: "absolute", left: 40, bottom: 50, padding: "14px 30px", borderRadius: 999, background: GREEN, transform: `scale(${sp(now - tw, 280)})` }}><Mono s={28} c="#ffffff" w={800}>DONE · THAT'S THE WHOLE INSTALL</Mono></div> : null}
      </Card>
    </>
  );
};

// 7. People sell courses for this: a course card with a price; on "on GitHub for free" it is struck and the repo lands, $0
const b7: B = (now, T) => {
  const t0 = T("b7"), tf = T("free2");
  const strike = ease(now - tf, 0.3);
  return (
    <>
      <Head t={now - t0} a={now < tf ? "Others" : "This one's"} i={now < tf ? "charge for it." : "free."} top={190} size={100} />
      {now >= t0 ? (
        <Card x={140} y={430} w={800} h={520} t={now - t0} fill="#ffffff" r={30} style={{ transform: `rotate(${-3 * strike}deg) scale(${1 - 0.25 * strike}) translateY(${-140 * strike}px)`, opacity: 1 - 0.4 * strike }}>
          <div style={{ height: 200, borderRadius: "30px 30px 0 0", background: "linear-gradient(120deg,#7c5cff,#ff5ccf)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 50, color: "#fff", textAlign: "center" }}>Claude Code Setup<br />Masterclass</span></div>
          <div style={{ position: "absolute", left: 40, top: 250 }}><Mono s={22} c="#8a8780">ONLINE COURSE · ILLUSTRATIVE</Mono></div>
          <div style={{ position: "absolute", left: 40, top: 300, fontFamily: F.body, fontWeight: 900, fontSize: 130, color: "#16161a" }}>$199</div>
          <div style={{ position: "absolute", right: 40, top: 360, padding: "16px 34px", borderRadius: 16, background: "#7c5cff" }}><span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 34, color: "#fff" }}>Enroll now</span></div>
          {now >= tf ? <div style={{ position: "absolute", left: 20, top: 360, height: 16, borderRadius: 8, background: RED, width: `${strike * 760}px`, transform: "rotate(-8deg)" }} /> : null}
        </Card>
      ) : null}
      {now >= tf ? (
        <Card x={170} y={900} w={740} h={260} t={now - tf - 0.2} fill={TH.card} r={30}>
          <div style={{ position: "absolute", left: 40, top: 50, display: "flex", alignItems: "center", gap: 24 }}>
            <Img src={ECC} style={{ width: 120, height: 120 }} />
            <div><div style={{ fontFamily: F.mono, fontSize: 40, color: TH.ink }}>affaan-m/<b>ECC</b></div><Mono s={22} c={TH.dim}>ON GITHUB · MIT</Mono></div>
          </div>
          <div style={{ position: "absolute", right: 40, top: 70, padding: "16px 30px", borderRadius: 18, background: GREEN, transform: `rotate(6deg) scale(${sp(now - tf - 0.4, 300)})` }}><span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 60, color: "#fff" }}>$0</span></div>
        </Card>
      ) : null}
    </>
  );
};

// 8. Comment GITHUB
const b8: B = (now, T) => {
  const t0 = T("b8");
  return (
    <>
      <In t={now - t0} style={{ left: 0, right: 0, top: 420, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: TH.card, borderRadius: 999, padding: "20px 44px 20px 20px", boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}>
          <Img src={ECC} style={{ width: 80, height: 80 }} />
          <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 52, color: TH.dim }}>Comment</span>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 60, color: TH.ink, letterSpacing: 3, minWidth: 260 }}>{typed("GITHUB", now - t0 - 0.2, 14)}</span>
        </div>
      </In>
      <In t={now - t0 - 0.4} style={{ left: 0, right: 0, top: 640, textAlign: "center" }}><Mono s={30} c={TH.ink} w={800}>I'LL SEND YOU THE LINK</Mono></In>
    </>
  );
};

const BEATS: { key: string; draw: B; world: string; tab: number }[] = [
  { key: "b1", draw: b1, world: "dark", tab: -1 }, { key: "b2", draw: b2, world: "white", tab: 0 }, { key: "b3", draw: b3, world: "amber", tab: 1 },
  { key: "b4", draw: b4, world: "blue", tab: 1 }, { key: "b5", draw: b5, world: "gold", tab: 2 }, { key: "b6", draw: b6, world: "dark", tab: 2 },
  { key: "b7", draw: b7, world: "green", tab: 3 }, { key: "b8", draw: b8, world: "white", tab: -1 },
];
const TABS = ["01 THE REPO", "02 INSIDE", "03 THE BUILDER", "04 THE PRICE"];

export const EccNoteView: View = {
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
    const capAccent = TH === W.white ? "#2f5ff0" : TH === W.dark ? GOLD : TH === W.amber ? "#ffffff" : TH === W.green ? "#1a9c55" : TH.accent;
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, background: prev.bg, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: TH.bg, clipPath: `circle(${flood * 130}% at 50% 45%)` }} />
        {tab >= 0 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 90, display: "flex", justifyContent: "center", gap: 10 }}>
            {TABS.map((l, i) => <div key={i} style={{ fontFamily: F.mono, fontSize: 18, letterSpacing: 2, padding: "8px 14px", borderRadius: 999, background: i === tab ? TH.ink : "transparent", color: i === tab ? TH.bg : TH.dim, border: `2px solid ${i === tab ? TH.ink : TH.dim}` }}>{l}</div>)}
          </div>
        ) : null}
        <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "50% 45%" }}>{BEATS[cur].draw(now, T)}</div>
        {words ? <Captions words={words} now={now} ink={TH.ink} accent={capAccent} /> : null}
      </div>
    );
  },
  hits: ({ at, p }) => {
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => at(parts[k]);
    const soft = 0.62;
    return [
      ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: T("turned") + i * ((T("team") - T("turned")) / 6), sound: "pop", gain: 0.1 })), { t: T("free"), sound: "cash", gain: 0.25 },
      { t: T("b2"), sound: "swish", gain: 0.2 * soft }, { t: T("stars") + 0.2, sound: "ding", gain: 0.18 * soft },
      { t: T("b3"), sound: "swish", gain: 0.2 * soft }, { t: T("a71"), sound: "click", gain: 0.15 * soft }, { t: T("s314"), sound: "click", gain: 0.15 * soft }, { t: T("c98"), sound: "click", gain: 0.15 * soft },
      { t: T("b4"), sound: "swish", gain: 0.2 * soft }, { t: T("all"), sound: "sweep", gain: 0.15 * soft },
      { t: T("b5"), sound: "swish", gain: 0.2 * soft }, { t: T("won"), sound: "chime", gain: 0.22 * soft },
      { t: T("b6") + 0.2, sound: "typing", gain: 0.12 * soft }, { t: T("whole"), sound: "pop", gain: 0.18 * soft },
      { t: T("courses"), sound: "swish", gain: 0.15 * soft }, { t: T("free2"), sound: "stamp", gain: 0.22 * soft },
      { t: T("b8") + 0.2, sound: "typing", gain: 0.15 * soft },
    ];
  },
};
