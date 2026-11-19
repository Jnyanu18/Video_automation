import React from "react";
import { useCurrentFrame, Img, staticFile } from "remotion";
import { F, FPS } from "../../kit/theme";
import type { View } from "./faceless";
import { SERIF, c01, sp, ease, In, Card, Check, typed, Captions } from "./keynote";

/** Three GitHub repos (three-repos, 2026-11-08): Hallmark, Cloudflare's security-audit skill, AI Job Search. The keynote
 *  system with a world per repo in its own colours. Real: the marks (Hallmark favicon, Cloudflare via Simple Icons), Pip
 *  (the job-search mascot GIF, six frames), star counts, theme names and verdicts from the READMEs (2026-11-08). Pages,
 *  code, jobs and skills are ILLUSTRATIVE. Retention: the hook's loop ("#3 got its creator hired") stays pinned on screen
 *  until the payoff. */

type World = { bg: string; ink: string; dim: string; line: string; card: string; accent: string };
const W: Record<string, World> = {
  gh: { bg: "#0d1117", ink: "#f0f6fc", dim: "#8b949e", line: "#21262d", card: "#161b22", accent: "#e3b341" },
  cream: { bg: "#f5f2ea", ink: "#0f0f0e", dim: "#8a8780", line: "#e2ddd0", card: "#ffffff", accent: "#fc4c02" },
  orange: { bg: "#f38020", ink: "#1a0d02", dim: "#7a3f0c", line: "#f59a48", card: "#fff4ea", accent: "#ffffff" },
  teal: { bg: "#2a9d8f", ink: "#ffffff", dim: "#c9efe9", line: "#45ada1", card: "#ffffff", accent: "#ffe27a" },
  white: { bg: "#f4f2ee", ink: "#16161a", dim: "#8a8780", line: "#e4e1da", card: "#ffffff", accent: "#2f5ff0" },
};
let TH: World = W.gh;
const GREEN = "#2fbf71", RED = "#ff4d4f", GOLD = "#e3b341";
const HM = staticFile("three-repos/raw/hallmark.svg");
const CF = staticFile("three-repos/raw/cloudflare.svg");
const pip = (now: number) => staticFile(`three-repos/raw/pip_${String(Math.floor(now / 0.11) % 6).padStart(2, "0")}.png`);
const Mono: React.FC<{ s: number; c?: string; children: React.ReactNode; w?: number }> = ({ s, c, children, w = 600 }) => <span style={{ fontFamily: F.mono, fontSize: s, letterSpacing: 2, color: c || TH.dim, fontWeight: w }}>{children}</span>;
const Head: React.FC<{ t: number; a: string; i?: string; b?: string; top?: number; size?: number }> = ({ t, a, i, b, top = 200, size = 96 }) => (
  <In t={t} dy={26} style={{ left: 50, right: 50, top, textAlign: "center", fontFamily: SERIF, fontSize: size, color: TH.ink, lineHeight: 1.05 }}>
    {a}{i ? <span style={{ fontStyle: "italic" }}> {i}</span> : null}{b ? ` ${b}` : null}
  </In>
);
const StarSvg: React.FC<{ s: number; c?: string; style?: React.CSSProperties }> = ({ s, c = GOLD, style }) => <svg width={s} height={s} viewBox="0 0 24 24" style={style}><path fill={c} d="M12 2l3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.6 5.6 21.2l1.6-7.1L1.8 9.3 9 8.6z" /></svg>;
const GhMark: React.FC<{ s: number; c: string }> = ({ s, c }) => <svg width={s} height={s} viewBox="0 0 24 24"><path fill={c} d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z" /></svg>;
const Ring: React.FC<{ x: number; y: number; w: number; h: number; t: number; label: string }> = ({ x, y, w, h, t, label }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, border: `5px solid ${RED}`, borderRadius: 999, opacity: c01(t / 0.12), transform: `scale(${0.8 + 0.2 * c01(sp(t, 300))})` }}>
    <div style={{ position: "absolute", right: -10, top: -38, padding: "4px 12px", borderRadius: 8, background: RED }}><Mono s={18} c="#fff" w={800}>{label}</Mono></div>
  </div>
);
type B = (now: number, T: (k: string) => number) => React.ReactNode;

// a repo card that flips in from its back (#n) to its face; used to open each repo
const Flip: React.FC<{ now: number; t: number; n: number; face: React.ReactNode; y?: number }> = ({ now, t, n, face, y = 420 }) => {
  const k = ease(now - t, 0.5);
  const ang = 180 - 180 * k;
  const front = ang < 90;
  return (
    <div style={{ position: "absolute", left: 140, top: y, width: 800, height: 380, transform: `perspective(1600px) rotateY(${ang}deg) scale(${0.9 + 0.1 * c01(sp(now - t, 180))})` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 34, background: front ? TH.card : "#0d1117", boxShadow: "0 30px 60px rgba(0,0,0,0.22)", transform: front ? "none" : "scaleX(-1)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {front ? face : <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 200, color: "#30363d" }}>#{n}</span>}
      </div>
    </div>
  );
};
const StarCount: React.FC<{ now: number; t: number; to: number; land: number; y?: number }> = ({ now, t, to, land, y = 860 }) => {
  const v = Math.round(to * ease(now - t, Math.max(0.6, land - t)));
  return now >= t - 0.05 ? (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", alignItems: "center", gap: 18, opacity: c01((now - t + 0.05) / 0.12) }}>
      <StarSvg s={90} style={{ transform: `rotate(${(now - t) * 80}deg)` }} />
      <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 130, color: TH.ink, letterSpacing: -3 }}>{v.toLocaleString("en-US")}</span>
      <Mono s={24} c={TH.ink} w={800}>STARS</Mono>
    </div>
  ) : null;
};

// 1. HOOK: three face-down repo cards, a star counter rolling to 187,005; the third lifts: HIRED?
const b1: B = (now, T) => {
  const t0 = T("b1"), ts = T("stars0"), tl = T("last");
  const v = Math.round(92000 + (187005 - 92000) * ease(now - t0, Math.max(1, ts - t0 + 0.3)));
  const lift = ease(now - tl, 0.4);
  return (
    <>
      <Head t={now - t0 + 1} a="3 free" i="repos." top={190} size={110} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center", alignItems: "center", gap: 18 }}>
        <StarSvg s={110} style={{ transform: `rotate(${now * 70}deg)` }} />
        <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 170, color: TH.ink, letterSpacing: -5 }}>{v.toLocaleString("en-US")}</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 590, textAlign: "center" }}><Mono s={28} c={TH.dim} w={800}>STARS BETWEEN THEM</Mono></div>
      {[0, 1, 2].map((i) => {
        const up = i === 2 ? lift : 0;
        return (
          <div key={i} style={{ position: "absolute", left: 95 + i * 305, top: 720 - up * 70, width: 280, height: 400, borderRadius: 28, background: i === 2 && up > 0 ? "#1f2a1f" : TH.card, border: `4px solid ${i === 2 && up > 0 ? GREEN : TH.line}`, boxShadow: i === 2 && up > 0 ? `0 0 ${60 * up}px rgba(47,191,113,0.6)` : "0 20px 40px rgba(0,0,0,0.4)", transform: `rotate(${(i - 1) * 5 - up * 5}deg) scale(${c01(sp(now - t0 + 0.5 - i * 0.1, 200)) * (1 + 0.08 * up)})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
            <GhMark s={70} c={TH.dim} />
            <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 90, color: TH.ink }}>#{i + 1}</span>
            {i === 2 && up > 0 ? <div style={{ padding: "8px 18px", borderRadius: 12, border: `4px solid ${GREEN}`, transform: `rotate(-8deg) scale(${sp(now - tl - 0.2, 300)})` }}><span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 40, color: GREEN }}>HIRED?</span></div> : <Mono s={24}>???</Mono>}
          </div>
        );
      })}
    </>
  );
};

// the open loop, pinned during repos 1 and 2
const Teaser: React.FC<{ now: number; t: number }> = ({ now, t }) => (
  <div style={{ position: "absolute", right: 40, top: 1420, display: "flex", alignItems: "center", gap: 14, padding: "16px 26px", boxShadow: "0 12px 30px rgba(0,0,0,0.3)", borderRadius: 999, background: "#0d1117", opacity: c01((now - t - 0.6) / 0.3), transform: `rotate(-3deg) scale(${1 + 0.04 * Math.sin(now * 5)})` }}>
    <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 40, color: "#f0f6fc" }}>#3</span>
    <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 36, color: GREEN }}>HIRED?</span>
    <Mono s={22} c="#8b949e">COMING UP</Mono>
  </div>
);

// 2. Hallmark: flip; stars; an AI-slop page ringed; 3 themes dealt from 50; the page built; checked in a browser
const b2: B = (now, T) => {
  const t0 = T("b2"), tst = T("stars1"), tsp = T("stops"), td = T("deals"), tb = T("builds"), tc = T("checks"), tsc = T("screams");
  const stage = now < tsp ? 0 : now < td ? 1 : now < tb ? 2 : 3;
  return (
    <>
      {stage === 0 ? (
        <>
          <Head t={now - t0} a="Number" i="one." top={190} size={110} />
          <Flip now={now} t={t0} n={1} face={
            <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
              <Img src={HM} style={{ width: 170, height: 170, borderRadius: 30, boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }} />
              <div><div style={{ fontFamily: SERIF, fontSize: 96, color: TH.ink }}>Hallmark</div><Mono s={22}>NUTLOPE/HALLMARK · BY TOGETHER AI</Mono></div>
            </div>} />
          <StarCount now={now} t={tst} to={50490} land={tst + 0.8} />
          <In t={now - t0 - 0.6} style={{ left: 0, right: 0, top: 1060, textAlign: "center" }}><Mono s={26} c={TH.ink} w={800}>ANTI-AI-SLOP DESIGN SKILL</Mono></In>
        </>
      ) : null}
      {stage === 1 ? (
        <>
          <Head t={now - tsp} a="Looks" i="AI-made?" top={190} size={104} />
          <Card x={110} y={420} w={860} h={900} t={now - tsp} fill="#ffffff" r={24}>
            <div style={{ position: "absolute", left: 60, top: 60 }}><Mono s={20} c="#7c5cff" w={800}>✦ INTRODUCING</Mono></div>
            <div style={{ position: "absolute", left: 60, top: 110, right: 60, fontFamily: F.body, fontWeight: 800, fontSize: 64, color: "#16161a", lineHeight: 1.05 }}>Unlock the power of <span style={{ color: "#7c5cff" }}>AI</span></div>
            <div style={{ position: "absolute", left: 60, right: 60, top: 300, height: 230, borderRadius: 22, background: "linear-gradient(120deg,#7c5cff,#ff5ccf,#ffb05c)" }} />
            {[0, 1, 2].map((i) => <div key={i} style={{ position: "absolute", left: 60 + i * 255, top: 580, width: 230, height: 200, borderRadius: 18, background: "#f1effa" }}><div style={{ margin: 24, width: 50, height: 50, borderRadius: 14, background: "#7c5cff" }} /></div>)}
          </Card>
          <Ring x={150} y={455} w={330} h={90} t={now - tsp - 0.6} label="EYEBROW" />
          <Ring x={140} y={700} w={800} h={260} t={now - tsp - 1.1} label="GRADIENT" />
          <Ring x={140} y={985} w={800} h={230} t={now - tsp - 1.6} label="3 SAME CARDS" />
          {now >= tsp + 2.3 ? <div style={{ position: "absolute", left: 300, top: 1240, transform: `rotate(-8deg) scale(${sp(now - tsp - 2.3, 300)})`, padding: "10px 30px", border: `8px solid ${RED}`, borderRadius: 16 }}><span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 80, color: RED }}>AI SLOP</span></div> : null}
        </>
      ) : null}
      {stage === 2 ? (
        <>
          <Head t={now - td} a="3 out of" i="50." top={190} size={110} />
          <div style={{ position: "absolute", left: 420, top: 470, width: 240, height: 340 }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ position: "absolute", left: i * 3, top: -i * 3, width: 240, height: 340, borderRadius: 22, background: "#0f0f0e", border: "3px solid #2a2a28" }} />)}
            <div style={{ position: "absolute", left: 15, top: -15, width: 240, height: 340, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}><span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 110, color: "#f5f2ea" }}>50</span><Mono s={20} c="#8a8780">THEMES</Mono></div>
          </div>
          {[["Dusk", "#1e2a4a", "#f7c873"], ["Cobalt", "#1d4ed8", "#ffffff"], ["Studio", "#efe9dc", "#0f0f0e"]].map(([n, bg, ink], i) => {
            const k = ease(now - td - 0.3 - i * 0.3, 0.35);
            return (
              <div key={i} style={{ position: "absolute", left: 420 + (i - 1) * 310 * k + 0, top: 470 + 420 * k, width: 240, height: 340, borderRadius: 22, background: bg, boxShadow: "0 20px 40px rgba(0,0,0,0.2)", transform: `rotate(${(i - 1) * 8 * k}deg)`, opacity: c01(k * 4), display: "flex", alignItems: "flex-end", padding: 24 }}>
                <span style={{ fontFamily: SERIF, fontSize: 56, color: ink }}>{n}</span>
              </div>
            );
          })}
        </>
      ) : null}
      {stage === 3 ? (
        <>
          <Head t={now - tb} a={now < tsc - 0.1 ? "Built," : "Ships"} i={now < tsc - 0.1 ? "then checked." : "clean."} top={190} size={100} />
          <Card x={90} y={400} w={900} h={940} t={now - tb} fill="#efe9dc" r={22}>
            {now >= tc - 0.1 ? (
              <div style={{ height: 64, background: "#e2dccd", borderRadius: "22px 22px 0 0", display: "flex", alignItems: "center", gap: 10, paddingLeft: 22 }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}
                <div style={{ marginLeft: 18, padding: "6px 18px", borderRadius: 999, background: "#f5f2ea" }}><Mono s={18} c="#5a564c">field-office.studio · Chrome</Mono></div>
              </div>
            ) : null}
            <div style={{ position: "absolute", left: 60, top: 120, fontFamily: SERIF, fontSize: 88, color: "#0f0f0e", lineHeight: 1, opacity: c01((now - tb) / 0.2) }}>Field<br /><span style={{ fontStyle: "italic" }}>Office.</span></div>
            <div style={{ position: "absolute", left: 60, top: 340, width: 420, fontFamily: F.body, fontSize: 30, color: "#3a372f", lineHeight: 1.4, opacity: c01((now - tb - 0.3) / 0.2) }}>An identity studio for people who make things by hand.</div>
            <div style={{ position: "absolute", right: 60, top: 120, width: 300, height: 380, background: "#0f0f0e", opacity: c01((now - tb - 0.5) / 0.2), transform: `translateY(${(1 - c01(sp(now - tb - 0.5, 200))) * 60}px)`, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 40, top: 40, width: 150, height: 150, borderRadius: 75, background: "#fc4c02" }} />
              <div style={{ position: "absolute", left: 30, bottom: 30, fontFamily: SERIF, fontStyle: "italic", fontSize: 120, color: "#efe9dc", lineHeight: 1 }}>FO</div>
              <div style={{ position: "absolute", right: 30, top: 60, width: 90, height: 90, border: "6px solid #efe9dc", transform: `rotate(${(now - tb) * 30}deg)` }} />
            </div>
            <div style={{ position: "absolute", left: 60, top: 560, padding: "18px 34px", background: "#0f0f0e", opacity: c01((now - tb - 0.7) / 0.2) }}><span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 30, color: "#efe9dc" }}>Book a call</span></div>
            {now >= tc ? <div style={{ position: "absolute", left: 0, right: 0, top: 64 + ((now - tc) * 420) % 560, height: 4, background: "#fc4c02", boxShadow: "0 0 20px #fc4c02", opacity: now < tsc ? 1 : 0 }} /> : null}
            {now >= tc ? (
              <div style={{ position: "absolute", left: 60, right: 60, top: 680, display: "flex", flexDirection: "column", gap: 12 }}>
                {["No eyebrow labels", "No gradient hero", "No 3 same cards"].map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, opacity: c01((now - tc - 0.3 - i * 0.4) / 0.12) }}><Check t={now - tc - 0.35 - i * 0.4} size={40} /><span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 32, color: "#0f0f0e" }}>{r}</span></div>
                ))}
              </div>
            ) : null}
          </Card>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1360, textAlign: "center" }}><Mono s={16}>ILLUSTRATIVE PAGE · THEME NAMES FROM HALLMARK</Mono></div>
        </>
      ) : null}
      {stage < 3 || now < tsc ? <Teaser now={now} t={t0} /> : null}
    </>
  );
};

// 3. Cloudflare: flip; stars; a magnifier on code; a hunter flags a line; a fresh verifier; verdicts; one node grows a fleet
const b3: B = (now, T) => {
  const t0 = T("b3"), tst = T("stars2"), ta = T("turns"), tf = T("finds"), tv = T("fresh"), to = T("own");
  const stage = now < ta ? 0 : now < to ? 1 : 2;
  const CODE = ["app.post('/search', (req) => {", "  const q = req.body.q", "  return db.query(", "    'SELECT * FROM notes", "     WHERE t = ' + q)", "})"];
  return (
    <>
      {stage === 0 ? (
        <>
          <Head t={now - t0} a="Number" i="two." top={190} size={110} />
          <Flip now={now} t={t0} n={2} face={
            <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
              <svg width={190} height={190} viewBox="0 0 24 24"><path fill="#F38020" d="M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.6045-.499-1.0615-.5205l-8.6592-.1123a.1559.1559 0 0 1-.1333-.0713c-.0283-.042-.0351-.0986-.021-.1553.0278-.084.1123-.1484.2036-.1562l8.7359-.1123c1.0351-.0489 2.1601-.8868 2.5537-1.9136l.499-1.3013c.0215-.0561.0293-.1128.0147-.168-.5625-2.5463-2.835-4.4453-5.5499-4.4453-2.5039 0-4.6284 1.6177-5.3876 3.8614-.4927-.3658-1.1187-.5625-1.794-.499-1.2026.119-2.1665 1.083-2.2861 2.2856-.0283.31-.0069.6128.0635.894C1.5683 13.171 0 14.7754 0 16.752c0 .1748.0142.3515.0352.5273.0141.083.0844.1475.1689.1475h15.9814c.0909 0 .1758-.0645.2032-.1553l.12-.4268zm2.7568-5.5634c-.0771 0-.1611 0-.2383.0112-.0566 0-.1054.0415-.127.0976l-.3378 1.1744c-.1475.5068-.0918.9707.1543 1.3164.2256.3164.6055.498 1.0625.5195l1.8437.1133c.0557 0 .1055.0263.1329.0703.0283.043.0351.1074.0214.1562-.0283.084-.1132.1485-.204.1553l-1.921.1123c-1.041.0488-2.1582.8867-2.5527 1.914l-.1406.3585c-.0283.0713.0215.1416.0986.1416h6.5977c.0771 0 .1474-.0489.169-.126.1122-.4082.1757-.837.1757-1.2803 0-2.6025-2.125-4.727-4.7344-4.727" /></svg>
              <div><div style={{ fontFamily: SERIF, fontSize: 92, color: TH.ink }}>Cloudflare</div><Mono s={22}>SECURITY-AUDIT-SKILL</Mono></div>
            </div>} />
          <StarCount now={now} t={tst} to={66167} land={tst + 0.8} />
        </>
      ) : null}
      {stage === 1 ? (
        <>
          <Head t={now - ta} a={now < tf ? "Security" : now < tv ? "Found" : "Prove it"} i={now < tf ? "auditor." : now < tv ? "a bug." : "wrong."} top={190} size={104} />
          <Card x={70} y={400} w={940} h={520} t={now - ta} fill="#0d1117" r={24}>
            <div style={{ position: "absolute", left: 36, top: 36, right: 36, fontFamily: F.mono, fontSize: 32, lineHeight: 1.65, color: "#c9d1d9" }}>
              {CODE.map((l, i) => <div key={i} style={{ whiteSpace: "pre", background: now >= tf && (i === 3 || i === 4) ? "rgba(255,77,79,0.25)" : "transparent", borderRadius: 6 }}>{l}</div>)}
            </div>
            {now < tf ? <svg width={150} height={150} viewBox="0 0 100 100" style={{ position: "absolute", left: 80 + ((now - ta) * 260) % 640, top: 120 + 80 * Math.sin((now - ta) * 3) }}><circle cx={40} cy={40} r={28} fill="rgba(255,255,255,0.15)" stroke="#ffffff" strokeWidth={8} /><path d="M 60 60 L 90 90" stroke="#ffffff" strokeWidth={12} strokeLinecap="round" /></svg> : null}
          </Card>
          {now >= tf ? (
            <In t={now - tf} style={{ left: 70, top: 960 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 26px", borderRadius: 22, background: TH.card }}>
                <div style={{ width: 60, height: 60, borderRadius: 30, background: "#16161a", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: 5, background: RED }} /><div style={{ width: 10, height: 10, borderRadius: 5, background: RED }} /></div>
                <div><Mono s={20} c={TH.dim} w={800}>AGENT 1 · HUNTER</Mono><div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 36, color: TH.ink }}>SQL injection?</div></div>
              </div>
            </In>
          ) : null}
          {now >= tv ? (
            <div style={{ position: "absolute", left: 540 + (1 - c01(sp(now - tv, 200))) * 500, top: 960 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 26px", borderRadius: 22, background: TH.card, border: `4px solid ${GREEN}` }}>
                <div style={{ width: 60, height: 60, borderRadius: 30, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: 5, background: "#fff" }} /><div style={{ width: 10, height: 10, borderRadius: 5, background: "#fff" }} /></div>
                <div><Mono s={20} c={TH.dim} w={800}>AGENT 2 · FRESH</Mono><div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 36, color: TH.ink }}>{now < tv + 1.0 ? typed("Disproving...", now - tv - 0.2, 20) : "Can't. Real."}</div></div>
              </div>
            </div>
          ) : null}
          {now >= tv + 0.9 ? (
            <div style={{ position: "absolute", left: 70, right: 70, top: 1140, display: "flex", gap: 14 }}>
              {[["CONFIRMED", RED, true], ["NEEDS CHECK", "#7a3f0c", false], ["REJECTED", "#7a3f0c", false]].map(([l, c, on], i) => (
                <div key={i} style={{ flex: 1, padding: "18px 0", textAlign: "center", borderRadius: 16, background: on ? "#ffffff" : "rgba(255,255,255,0.35)", border: on ? `4px solid ${c}` : "4px solid transparent", opacity: c01((now - tv - 0.9 - i * 0.1) / 0.12), transform: on ? `scale(${1 + 0.1 * Math.sin(c01((now - tv - 1.1) / 0.3) * Math.PI)})` : "none" }}>
                  <Mono s={22} c={c as string} w={800}>{l}</Mono>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
      {stage === 2 ? (
        <>
          <Head t={now - to} a="Cloudflare's own" i="system." top={190} size={92} />
          <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
            {Array.from({ length: 22 }).map((_, i) => {
              const a = (i / 22) * Math.PI * 2 + 0.3, r = 200 + (i % 3) * 110;
              const x = 540 + Math.cos(a) * r, y = 830 + Math.sin(a) * r * 0.85;
              const k = c01((now - to - 0.3 - i * 0.06) / 0.25);
              return <g key={i} opacity={k}><line x1={540} y1={830} x2={540 + (x - 540) * k} y2={830 + (y - 830) * k} stroke="#ffffff" strokeWidth={3} opacity={0.6} /><circle cx={540 + (x - 540) * k} cy={830 + (y - 830) * k} r={16} fill="#ffffff" /></g>;
            })}
            <circle cx={540} cy={830} r={70 * c01(sp(now - to, 200))} fill="#1a0d02" />
          </svg>
          <div style={{ position: "absolute", left: 0, right: 0, top: 812, textAlign: "center" }}><Mono s={20} c="#ffffff" w={800}>THIS SKILL</Mono></div>
          <In t={now - to - 1.2} style={{ left: 0, right: 0, top: 1300, textAlign: "center" }}><Mono s={26} c={TH.ink} w={800}>GREW INTO CLOUDFLARE'S BUG HUNTING SYSTEM</Mono></In>
        </>
      ) : null}
      <Teaser now={now} t={t0 - 1} />
    </>
  );
};

// 4. AI Job Search: flip with Pip; stars; jobs stream in; ranked by fit; CV and letter typed; a made-up skill struck out
const b4: B = (now, T) => {
  const t0 = T("b4"), tst = T("stars3"), tj = T("jobs"), tr = T("ranks"), tw = T("writes"), tn = T("never");
  const stage = now < tj ? 0 : now < tw ? 1 : now < tn ? 2 : 3;
  const JOBS: [string, string, number][] = [["Data Scientist", "Copenhagen", 81], ["AI Engineer", "Aarhus", 92], ["Geophysicist", "Odense", 64], ["ML Engineer", "Remote", 77]];
  return (
    <>
      {stage === 0 ? (
        <>
          <Head t={now - t0} a="Number" i="three." top={190} size={110} />
          <Flip now={now} t={t0} n={3} face={
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <Img src={pip(now)} style={{ width: 260, height: 260 }} />
              <div><div style={{ fontFamily: SERIF, fontSize: 84, color: "#16161a" }}>AI Job Search</div><Mono s={22} c="#5f7f7a">AND PIP, ITS COURIER BIRD</Mono></div>
            </div>} />
          <StarCount now={now} t={tst} to={70348} land={tst + 0.8} />
        </>
      ) : null}
      {stage === 1 ? (
        <>
          <Head t={now - tj} a={now < tr ? "Finds" : "Ranked by"} i={now < tr ? "jobs." : "fit."} top={190} size={110} />
          {JOBS.map(([title, city, fit], i) => {
            const order = now < tr ? i : [1, 0, 3, 2].indexOf(i);
            const y = 420 + order * 200;
            const k = sp(now - tj - i * 0.15, 200);
            return (
              <div key={i} style={{ position: "absolute", left: 110 + (1 - c01(k)) * 900, top: y, width: 860, height: 170, borderRadius: 26, background: "#ffffff", display: "flex", alignItems: "center", paddingLeft: 36, gap: 24, boxShadow: "0 14px 30px rgba(0,0,0,0.15)", transition: "none" }}>
                <div style={{ width: 80, height: 80, borderRadius: 20, background: ["#e9f6f4", "#fff3d6", "#f1effa", "#e8f0ff"][i] }} />
                <div><div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 42, color: "#16161a" }}>{title}</div><Mono s={20} c="#8a8780">{city.toUpperCase()}</Mono></div>
                {now >= tr ? <div style={{ marginLeft: "auto", marginRight: 36, padding: "12px 22px", borderRadius: 16, background: fit > 85 ? GREEN : fit > 70 ? "#ffe27a" : "#f1f1f1", transform: `scale(${sp(now - tr - i * 0.1, 260)})` }}><span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 38, color: "#16161a" }}>{fit}% fit</span></div> : null}
              </div>
            );
          })}
          <div style={{ position: "absolute", left: 0, right: 0, top: 1240, textAlign: "center" }}><Mono s={16} c={TH.dim}>ILLUSTRATIVE</Mono></div>
        </>
      ) : null}
      {stage === 2 ? (
        <>
          <Head t={now - tw} a="Tailored," i="every time." top={190} size={100} />
          <Card x={90} y={420} w={430} h={600} t={now - tw} fill="#ffffff" r={18}>
            <div style={{ position: "absolute", left: 30, top: 30 }}><Mono s={20} c="#2a9d8f" w={800}>CV · AI ENGINEER</Mono></div>
            {Array.from({ length: 9 }).map((_, i) => <div key={i} style={{ position: "absolute", left: 30, top: 90 + i * 52, height: 18, borderRadius: 9, background: "#bdb8ab", width: `${c01((now - tw - 0.2 - i * 0.12) / 0.2) * (i % 3 === 0 ? 60 : 85)}%` }} />)}
          </Card>
          <Card x={560} y={470} w={430} h={600} t={now - tw - 0.3} fill="#ffffff" r={18}>
            <div style={{ position: "absolute", left: 30, top: 30 }}><Mono s={20} c="#2a9d8f" w={800}>COVER LETTER</Mono></div>
            <div style={{ position: "absolute", left: 30, right: 30, top: 90, fontFamily: F.body, fontSize: 26, color: "#16161a", lineHeight: 1.45 }}>{typed("Dear hiring team, your seismic data team caught my eye because...", now - tw - 0.6, 26)}</div>
          </Card>
          <Img src={pip(now)} style={{ position: "absolute", left: -200 + ((now - tw) * 380), top: 1060 + 30 * Math.sin(now * 3), width: 260, height: 260 }} />
        </>
      ) : null}
      {stage === 3 ? (
        <>
          <Head t={now - tn} a="No made-up" i="skills." top={190} size={100} />
          {[["Python", true], ["Seismic data", true], ["Machine learning", true], ["Kubernetes", false]].map(([s, ok], i) => (
            <div key={i} style={{ position: "absolute", left: 160, top: 430 + i * 170, width: 760, height: 140, borderRadius: 26, background: "#ffffff", display: "flex", alignItems: "center", paddingLeft: 40, gap: 24, opacity: c01((now - tn - i * 0.2) / 0.15), transform: `translateX(${(1 - c01(sp(now - tn - i * 0.2, 220))) * 300}px)` }}>
              <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 46, color: ok ? "#16161a" : "#b8b4aa", textDecoration: !ok && now > tn + 1.0 ? "line-through" : "none" }}>{s as string}</span>
              <span style={{ marginLeft: "auto", marginRight: 34 }}>{ok ? <Check t={now - tn - 0.2 - i * 0.2} size={48} /> : now > tn + 1.0 ? <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 52, color: RED }}>✗</span> : null}</span>
            </div>
          ))}
          {now > tn + 1.0 ? <In t={now - tn - 1.0} style={{ left: 0, right: 0, top: 1130, textAlign: "center" }}><Mono s={26} c={TH.ink} w={800}>NOT ON YOUR PROFILE · LEFT OUT</Mono></In> : null}
        </>
      ) : null}
    </>
  );
};

// 5. The payoff: laid off, 69 applications, 20 interviews, HIRED as an AI engineer
const b5: B = (now, T) => {
  const t0 = T("b5"), ta = T("apps"), ti = T("interviews"), tj = T("job");
  const apps = Math.round(69 * ease(now - ta, Math.max(0.6, ti - ta - 0.1)));
  const hired = now >= tj;
  return (
    <>
      <Head t={now - t0} a={hired ? "Laid off to" : now < ta ? "Laid" : "69"} i={hired ? "hired." : now < ta ? "off." : "applications."} top={190} size={100} />
      {now < ta ? (
        <Card x={190} y={480} w={700} h={600} t={now - t0} fill="#ffffff" r={18}>
          <div style={{ position: "absolute", left: 50, top: 50 }}><Mono s={22} c="#8a8780" w={800}>NOTICE</Mono></div>
          <div style={{ position: "absolute", left: 50, right: 50, top: 110, fontFamily: SERIF, fontSize: 70, color: "#16161a", lineHeight: 1.1 }}>Your position<br />has been <span style={{ fontStyle: "italic", color: RED }}>cut.</span></div>
          <div style={{ position: "absolute", left: 50, top: 420 }}><Mono s={26} c="#16161a" w={800}>LATE 2025</Mono></div>
          <div style={{ position: "absolute", right: 50, bottom: 50, width: 190, height: 190, borderRadius: 95, border: `6px solid ${RED}`, transform: `rotate(-12deg) scale(${sp(now - t0 - 0.6, 300)})`, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}><span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 32, color: RED, lineHeight: 1 }}>LAID<br />OFF</span></div>
        </Card>
      ) : (
        <>
          <div style={{ position: "absolute", left: 90, top: 420, width: 900, display: "flex", flexWrap: "wrap", gap: 10 }}>
            {Array.from({ length: 69 }).map((_, i) => {
              const on = i < apps;
              const iv = now >= ti && i < Math.round(20 * ease(now - ti, 0.6));
              return <div key={i} style={{ width: 80, height: 56, borderRadius: 8, background: !on ? "rgba(0,0,0,0.06)" : iv ? GREEN : "#ffffff", border: `3px solid ${on ? (iv ? GREEN : "#d8d3c6") : "transparent"}`, transform: `scale(${on ? 1 : 0.8})`, display: "flex", alignItems: "center", justifyContent: "center" }}>{on ? <svg width={44} height={30} viewBox="0 0 44 30"><rect x={2} y={2} width={40} height={26} rx={3} fill="none" stroke={iv ? "#ffffff" : "#8a8780"} strokeWidth={3} /><path d="M 2 4 L 22 17 L 42 4" fill="none" stroke={iv ? "#ffffff" : "#8a8780"} strokeWidth={3} /></svg> : null}</div>;
            })}
          </div>
          <div style={{ position: "absolute", left: 90, right: 90, top: 1100, display: "flex", justifyContent: "space-between" }}>
            <Mono s={30} c={TH.ink} w={800}>{apps} APPLICATIONS</Mono>
            {now >= ti ? <Mono s={30} c={GREEN} w={800}>20 INTERVIEWS</Mono> : null}
          </div>
          {hired ? (
            <div style={{ position: "absolute", left: 140, top: 640, width: 800, padding: "40px 0", borderRadius: 30, background: "#16161a", textAlign: "center", transform: `rotate(-4deg) scale(${sp(now - tj, 260)})`, boxShadow: "0 30px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ fontFamily: F.body, fontWeight: 900, fontSize: 120, color: GREEN, letterSpacing: 4 }}>HIRED</div>
              <Mono s={34} c="#ffffff" w={800}>AI ENGINEER · JUNE 2026</Mono>
            </div>
          ) : null}
          {hired ? Array.from({ length: 30 }).map((_, i) => {
            const u = now - tj, x = 540 + (Math.sin(i * 12.9) * 520) * Math.min(1, u * 2), y = 700 - 300 * Math.min(1, u * 3) + 900 * u * u * 0.5 + (i % 5) * 30;
            return <div key={i} style={{ position: "absolute", left: x, top: y, width: 18, height: 28, background: [GOLD, GREEN, "#2f5ff0", "#ff5ccf", RED][i % 5], transform: `rotate(${u * 400 + i * 30}deg)` }} />;
          }) : null}
        </>
      )}
    </>
  );
};

// 6. Comment LINKS: the three repos in one card
const b6: B = (now, T) => {
  const t0 = T("b6");
  return (
    <>
      <In t={now - t0} style={{ left: 0, right: 0, top: 300, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: TH.card, borderRadius: 999, padding: "18px 40px", boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}>
          <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 48, color: TH.dim }}>Comment</span>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 56, color: TH.ink, letterSpacing: 3, minWidth: 190 }}>{typed("LINKS", now - t0 - 0.2, 14)}</span>
        </div>
      </In>
      <Card x={150} y={500} w={780} h={620} t={now - t0 - 0.2} fill={TH.card} r={34}>
        {[[<Img key="h" src={HM} style={{ width: 70, height: 70, borderRadius: 14 }} />, "Hallmark", "50K"], [<Img key="c" src={CF} style={{ width: 70, height: 70 }} />, "Cloudflare security-audit", "66K"], [<Img key="p" src={pip(now)} style={{ width: 90, height: 90, margin: -10 }} />, "AI Job Search", "70K"]].map(([icon, n, s], i) => (
          <div key={i} style={{ position: "absolute", left: 44, right: 44, top: 60 + i * 180, height: 150, borderBottom: i < 2 ? `2px solid ${TH.line}` : "none", display: "flex", alignItems: "center", gap: 24, opacity: c01((now - t0 - 0.3 - i * 0.12) / 0.15) }}>
            {icon}<span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 38, color: TH.ink }}>{n as string}</span>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}><StarSvg s={34} /><span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 34, color: TH.ink }}>{s as string}</span></span>
          </div>
        ))}
      </Card>
    </>
  );
};

const BEATS: { key: string; draw: B; world: string; tab: number }[] = [
  { key: "b1", draw: b1, world: "gh", tab: -1 }, { key: "b2", draw: b2, world: "cream", tab: 0 }, { key: "b3", draw: b3, world: "orange", tab: 1 },
  { key: "b4", draw: b4, world: "teal", tab: 2 }, { key: "b5", draw: b5, world: "white", tab: 2 }, { key: "b6", draw: b6, world: "white", tab: -1 },
];
const TABS = ["01 HALLMARK", "02 CLOUDFLARE", "03 JOB SEARCH"];

export const ReposView: View = {
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
    const push = 1 + 0.02 * c01((now - starts[cur]) / 3);
    const tab = BEATS[cur].tab;
    const capAccent = TH === W.gh ? GOLD : TH === W.cream ? "#fc4c02" : TH === W.orange ? "#ffffff" : TH === W.teal ? "#ffe27a" : "#2f5ff0";
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
      { t: T("stars0"), sound: "ding", gain: 0.2 }, { t: T("last") + 0.2, sound: "pop", gain: 0.2 },
      { t: T("b2"), sound: "whoosh", gain: 0.2 * soft }, { t: T("stars1") + 0.8, sound: "ding", gain: 0.14 * soft }, { t: T("stops") + 2.3, sound: "stamp", gain: 0.2 * soft },
      { t: T("deals") + 0.3, sound: "pageflip", gain: 0.2 * soft }, { t: T("checks"), sound: "sweep", gain: 0.15 * soft },
      { t: T("b3"), sound: "whoosh", gain: 0.2 * soft }, { t: T("stars2") + 0.8, sound: "ding", gain: 0.14 * soft }, { t: T("finds"), sound: "error", gain: 0.12 * soft }, { t: T("fresh") + 1.1, sound: "stamp", gain: 0.18 * soft }, { t: T("own"), sound: "riser", gain: 0.12 * soft },
      { t: T("b4"), sound: "whoosh", gain: 0.2 * soft }, { t: T("stars3") + 0.8, sound: "ding", gain: 0.14 * soft }, { t: T("ranks"), sound: "pop", gain: 0.15 * soft }, { t: T("writes"), sound: "typing", gain: 0.12 * soft },
      { t: T("b5") + 0.6, sound: "stamp", gain: 0.2 * soft }, { t: T("job"), sound: "cash", gain: 0.25 * soft }, { t: T("job") + 0.05, sound: "subdrop", gain: 0.25 },
      { t: T("b6") + 0.2, sound: "typing", gain: 0.15 * soft },
    ];
  },
};
