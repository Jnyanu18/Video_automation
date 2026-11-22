import React from "react";
import { useCurrentFrame, Img, staticFile } from "remotion";
import { F, FPS } from "../../kit/theme";
import type { View } from "./faceless";
import { SERIF, c01, sp, ease, In, Card, Check, typed, Captions } from "./keynote";

/** REA, Reverse Engineer Anything (reverse-anything, 2026-11-08). The 34-three-agents system: a colour world per chapter
 *  flooding from the centre, chapter tabs, serif headlines with one italic word. The repo name, description, MIT and
 *  stars are real (GitHub, 2026-11-08); the paid app "Notely Pro", its code and features are ILLUSTRATIVE. Structure
 *  from DfbPAqMxegB (a desk and a block character), never its look. */

type World = { bg: string; ink: string; dim: string; line: string; card: string; accent: string };
const W: Record<string, World> = {
  dark: { bg: "#0d0d10", ink: "#f2f2f5", dim: "#83838f", line: "#26262e", card: "#17171c", accent: "#d97757" },
  white: { bg: "#f4f2ee", ink: "#16161a", dim: "#8a8780", line: "#e4e1da", card: "#ffffff", accent: "#2f5ff0" },
  vault: { bg: "#141018", ink: "#f4eefc", dim: "#8d8499", line: "#2b2433", card: "#1e1924", accent: "#ff5a5f" },
  blue: { bg: "#1f4fe0", ink: "#ffffff", dim: "#c7d5ff", line: "#3a63e8", card: "#2f5ff0", accent: "#9fe870" },
  amber: { bg: "#f3b01c", ink: "#1d1606", dim: "#6b5214", line: "#d99c12", card: "#fff6dc", accent: "#1d1606" },
  print: { bg: "#123a7a", ink: "#eaf2ff", dim: "#8fb1e6", line: "#2a5296", card: "#174891", accent: "#ffffff" },
  green: { bg: "#d9f2e2", ink: "#0f2a1b", dim: "#4f7a60", line: "#b6e2c6", card: "#ffffff", accent: "#2fbf71" },
};
let TH: World = W.dark;
const GREEN = "#2fbf71", RED = "#ff4d4f", CLAY = "#d97757", APP = "#7c5cff";
const claude = staticFile("reverse-anything/raw/claude_symbol.svg");
const LOGOS = [staticFile("reverse-anything/raw/claude_symbol.svg"), staticFile("reverse-anything/raw/codex-color.svg"), staticFile("reverse-anything/raw/cursor.svg")];
const Mono: React.FC<{ s: number; c?: string; children: React.ReactNode; w?: number }> = ({ s, c, children, w = 600 }) => <span style={{ fontFamily: F.mono, fontSize: s, letterSpacing: 2, color: c || TH.dim, fontWeight: w }}>{children}</span>;
const Head: React.FC<{ t: number; a: string; i?: string; b?: string; top?: number; size?: number }> = ({ t, a, i, b, top = 200, size = 96 }) => (
  <In t={t} dy={26} style={{ left: 50, right: 50, top, textAlign: "center", fontFamily: SERIF, fontSize: size, color: TH.ink, lineHeight: 1.05 }}>
    {a}{i ? <span style={{ fontStyle: "italic" }}> {i}</span> : null}{b ? ` ${b}` : null}
  </In>
);
// a seeded pseudo-random, so binary and tiles are the same every frame
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const bits = (row: number, n: number, shift = 0) => Array.from({ length: n }).map((_, k) => (rnd(row * 31 + k + shift) > 0.5 ? "1" : "0")).join("");
export const NoteIcon: React.FC<{ s: number; c?: string }> = ({ s, c = APP }) => (
  <div style={{ width: s, height: s, borderRadius: s * 0.24, background: c, display: "flex", flexDirection: "column", justifyContent: "center", gap: s * 0.1, padding: `0 ${s * 0.22}px` }}>
    {[1, 0.75, 0.9].map((w, i) => <div key={i} style={{ height: s * 0.08, width: `${w * 100}%`, borderRadius: 4, background: "#fff" }} />)}
  </div>
);
type B = (now: number, T: (k: string) => number) => React.ReactNode;

// Clawd, Claude Code's mascot, built pixel for pixel from its own terminal block art (the reference's character too)
const CLAWD_ART = [" ▐▛███▜▌", "▝▜█████▛▘", "  ▘▘ ▝▝"];
const QUAD: Record<string, number[]> = { "▐": [1, 3], "▌": [0, 2], "▛": [0, 1, 2], "▜": [0, 1, 3], "█": [0, 1, 2, 3], "▝": [1], "▘": [0], " ": [] };
const CLAWD_PX: [number, number][] = CLAWD_ART.flatMap((line, L) => Array.from(line).flatMap((ch, j) => (QUAD[ch] || []).map((q) => [2 * j + (q % 2), 2 * L + (q >> 1)] as [number, number])));
export const Clawd: React.FC<{ x: number; y: number; px: number; sx?: number; sy?: number; arm?: number; step?: number; rot?: number }> = ({ x, y, px, sx = 1, sy = 1, arm = 0, step = 0, rot = 0 }) => (
  <svg width={22 * px} height={6 * px} viewBox="0 0 22 6" style={{ position: "absolute", left: x, top: y, overflow: "visible", transform: `rotate(${rot}deg) scale(${sx}, ${sy})`, transformOrigin: "50% 100%", shapeRendering: "crispEdges" }}>
    {CLAWD_PX.map(([cx, cy], i) => <rect key={i} x={cx} y={cy - (cy === 4 && ((cx < 9) === (step > 0)) ? 0.5 * Math.abs(step) : 0)} width={1.02} height={1.02} fill="#d97757" />)}
    {arm > 0 ? <rect x={17} y={2} width={arm * 4} height={1.02} fill="#d97757" /> : null}
    {arm > 0 ? <rect x={17 + arm * 4} y={1.5} width={1.6} height={2} fill="#d97757" /> : null}
    <rect x={5} y={1} width={1.02} height={1.02} fill="#16161a" /><rect x={12} y={1} width={1.02} height={1.02} fill="#16161a" />
  </svg>
);

// 1. The $20/month app; Clawd walks in, winds up and punches through it; the pieces land as your own version at $0
const b1: B = (now, T) => {
  const t0 = T("b1"), th = T("hand"), ta = T("apart"), tb = T("build");
  const hit = ta + 0.1;
  const burst = ease(now - hit, 0.5) * (1 - ease(now - tb, 0.45));
  const mine = now >= tb;
  const shake = now >= hit && now < hit + 0.3 ? (1 - (now - hit) / 0.3) * 22 * Math.sin((now - hit) * 90) : 0;
  const cols = 6, rows = 7, cw = 760 / cols, ch = 760 / rows;
  const CODE = ["if (!license.valid)", "  lockApp('Pro')", "plan.price = 20.00", "search(notes, q)", "sync(cloud)", "export(pdf)", "billing.monthly()"];
  // Clawd: walks in, crouches, launches into the card, falls back, hops when the app is yours
  const PX = 26, home = { x: 306, y: 1232 };
  let cx = -500, cy = home.y, csx = 1, csy = 1, arm = 0, step = 0, rot = 0;
  if (now >= th - 0.1) {
    const w = ease(now - th + 0.1, 0.8);
    cx = -500 + (home.x + 500) * w; step = w < 1 ? Math.sin((now - th) * 22) : 0; cy = home.y - (w < 1 ? Math.abs(Math.sin((now - th) * 11)) * 14 : 0);
  }
  if (now >= ta - 0.35 && now < ta) { const k = c01((now - ta + 0.35) / 0.25); csx = 1 + 0.15 * k; csy = 1 - 0.22 * k; cx = home.x - 40 * k; step = 0; }
  if (now >= ta && now < ta + 0.7) {
    const u = now - ta;
    if (u < 0.12) { const k = ease(u, 0.12); cx = home.x - 40 + 120 * k; cy = home.y - 470 * k; arm = k; csx = 1.15 - 0.15 * k; csy = 0.78 + 0.22 * k; }
    else { const k = c01((u - 0.12) / 0.58); cx = home.x + 80 - 80 * k; cy = home.y - 470 + 470 * k * k; arm = 1 - c01((u - 0.12) / 0.2); rot = -8 * (1 - k); }
  }
  if (now >= tb) { const u = now - tb; cy = home.y - (u < 0.5 ? Math.sin((u / 0.5) * Math.PI) * 110 : 0); csy = u > 0.5 && u < 0.7 ? 0.85 : 1; }
  const ring = ease(now - hit, 0.25);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translate(${shake}px, ${shake * 0.5}px)` }}>
      <Head t={now - t0} a={mine ? "Your" : "$20 a"} i={mine ? "own." : "month."} top={180} size={110} />
      <div style={{ position: "absolute", left: 160, top: 470, width: 760, height: 760, opacity: c01(burst * 2), fontFamily: F.mono, fontSize: 34, color: "#9fe870", lineHeight: 1.9, padding: 40 }}>
        {CODE.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      {Array.from({ length: cols * rows }).map((_, i) => {
        const gx = i % cols, gy = Math.floor(i / cols);
        const dx = (gx - cols / 2 + 0.5) * 130 + (rnd(i) - 0.5) * 220, dy = (gy - rows / 2 + 0.5) * 150 + (rnd(i + 99) - 0.5) * 260;
        const rotT = (rnd(i + 7) - 0.5) * 120;
        return (
          <div key={i} style={{ position: "absolute", left: 160 + gx * cw, top: 470 + gy * ch, width: cw + 0.5, height: ch + 0.5, overflow: "hidden", transform: `translate(${dx * burst}px, ${dy * burst}px) rotate(${rotT * burst}deg) scale(${c01(sp(now - t0, 170))})`, opacity: 1 - 0.3 * burst }}>
            <div style={{ position: "absolute", left: -gx * cw, top: -gy * ch, width: 760, height: 760, borderRadius: 40, background: "#ffffff", border: `6px solid ${mine ? GREEN : "#e4e1da"}` }}>
              <div style={{ position: "absolute", left: 60, top: 60, display: "flex", alignItems: "center", gap: 24 }}>
                <NoteIcon s={96} c={mine ? GREEN : APP} />
                <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 56, color: "#16161a" }}>{mine ? "My Notes" : "Notely Pro"}</span>
              </div>
              <div style={{ position: "absolute", left: 60, top: 230, fontFamily: F.body, fontWeight: 900, fontSize: 200, color: "#16161a", letterSpacing: -6 }}>
                {mine ? "$0" : "$20"}<span style={{ fontSize: 60, fontWeight: 600, color: "#8a8780", letterSpacing: 0 }}> / month</span>
              </div>
              {["Search", "Sync", "Export"].map((f, k) => (
                <div key={k} style={{ position: "absolute", left: 60, top: 500 + k * 70, display: "flex", alignItems: "center", gap: 16, fontFamily: F.body, fontWeight: 600, fontSize: 40, color: "#16161a" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 11, background: mine ? GREEN : APP }} />{f}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {!mine && now - t0 > 0.6 ? (
        <div style={{ position: "absolute", left: 620, top: 420, transform: `rotate(-8deg) scale(${sp(now - t0 - 0.6, 260)})`, padding: "14px 26px", borderRadius: 14, background: RED, opacity: 1 - burst }}>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 40, color: "#fff" }}>-$20 · CARD</span>
        </div>
      ) : null}
      {now >= hit && now < hit + 0.25 ? <div style={{ position: "absolute", left: 540 - 300 * ring, top: 850 - 300 * ring, width: 600 * ring, height: 600 * ring, borderRadius: "50%", border: "10px solid #ffffff", opacity: 1 - c01((now - hit) / 0.25) }} /> : null}
      {mine ? <div style={{ position: "absolute", left: 800, top: 410 }}><Check t={now - tb - 0.2} size={110} /></div> : null}
      <Clawd x={cx} y={cy} px={PX} sx={csx} sy={csy} arm={arm} step={step} rot={rot} />
      {now >= th + 0.5 && !(now >= ta - 0.35 && now < ta + 0.7) ? <div style={{ position: "absolute", left: cx + 196, top: 1395, opacity: c01((now - th - 0.5) / 0.2) }}><Mono s={22} c={CLAY} w={800}>CLAUDE</Mono></div> : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1450, textAlign: "center", opacity: c01((now - t0 - 1) / 0.3) }}><Mono s={18}>ILLUSTRATIVE APP</Mono></div>
    </div>
  );
};

// 2. The repo: morluto/rea; R, E, A turn clay with a line drawn under each word; then the card lifts and the stars
//    count up big beneath it
const b2: B = (now, T) => {
  const t0 = T("b2"), ts = T("short"), to = T("over"), tst = T("stars");
  const stars = Math.round(441634 * ease(now - to, Math.max(0.8, tst - to + 0.2)));
  const lift = ease(now - to + 0.15, 0.45);
  const words = ["Reverse", "Engineer", "Anything"];
  return (
    <>
      <Head t={now - t0} a="A free" i="tool." top={200} size={110} />
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${-90 * lift}px) scale(${1 - 0.12 * lift})`, transformOrigin: "540px 430px" }}>
        <Card x={90} y={430} w={900} h={700} t={now - t0 - 0.1} fill={TH.card} r={34}>
          <div style={{ position: "absolute", left: 44, top: 44, display: "flex", alignItems: "center", gap: 18 }}>
            <svg width={56} height={56} viewBox="0 0 24 24"><path fill={TH.ink} d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z" /></svg>
            <span style={{ fontFamily: F.mono, fontSize: 40, color: TH.ink }}>morluto/<b>rea</b></span>
            <span style={{ marginLeft: 10, padding: "6px 16px", borderRadius: 999, border: `2px solid ${TH.line}` }}><Mono s={20}>PUBLIC</Mono></span>
          </div>
          <div style={{ position: "absolute", left: 44, right: 44, top: 140, fontFamily: F.body, fontSize: 32, color: TH.dim, lineHeight: 1.35 }}>Reverse engineer anything with agents, from app behavior down to native binaries.</div>
          <div style={{ position: "absolute", left: 44, top: 290, display: "flex", flexDirection: "column", gap: 10 }}>
            {words.map((w, i) => {
              const tw = ts + i * 0.45, on = now >= tw;
              return (
                <div key={i} style={{ position: "relative", fontFamily: SERIF, fontSize: 92, color: TH.ink, lineHeight: 1.05, opacity: c01((now - t0 - 0.3 - i * 0.12) / 0.2) }}>
                  <span style={{ display: "inline-block", color: on ? CLAY : TH.ink, fontStyle: on ? "italic" : "normal", transform: `scale(${1 + 0.18 * (on ? Math.sin(c01((now - tw) / 0.3) * Math.PI) : 0)})`, transformOrigin: "50% 80%" }}>{w[0]}</span>{w.slice(1)}
                  <div style={{ position: "absolute", left: 0, bottom: -4, height: 6, borderRadius: 3, background: CLAY, width: `${ease(now - tw, 0.35) * 100}%`, maxWidth: 440 }} />
                </div>
              );
            })}
          </div>
          <div style={{ position: "absolute", right: 44, top: 600, padding: "10px 20px", borderRadius: 999, background: "#fff4c2", opacity: c01((now - t0 - 0.6) / 0.2) }}><Mono s={22} c="#7a5b00" w={800}>MIT · FREE</Mono></div>
        </Card>
      </div>
      {now >= to - 0.15 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1130, display: "flex", flexDirection: "column", alignItems: "center", opacity: c01((now - to + 0.15) / 0.2) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <svg width={110} height={110} viewBox="0 0 24 24" style={{ transform: `rotate(${(now - to) * 90}deg) scale(${sp(now - to, 220)})` }}><path fill="#e3b341" d="M12 2l3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.6 5.6 21.2l1.6-7.1L1.8 9.3 9 8.6z" /></svg>
            <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 150, color: TH.ink, letterSpacing: -4 }}>{stars.toLocaleString("en-US")}</span>
          </div>
          <Mono s={26} c={TH.ink} w={800}>STARS ON GITHUB</Mono>
        </div>
      ) : null}
    </>
  );
};

// 3. The company keeps the code in a vault; "So how?"
const b3: B = (now, T) => {
  const t0 = T("b3"), th = T("how");
  const shut = ease(now - t0 - 0.9, 0.35);
  const q = now >= th - 0.05;
  return (
    <>
      <Head t={now - t0} a="Never" i="shared." top={200} size={110} />
      <div style={{ position: "absolute", left: 240, top: 450, width: 600, height: 640, borderRadius: 40, background: TH.card, border: `6px solid ${TH.line}`, transform: `scale(${q ? 1 - 0.25 * ease(now - th, 0.4) : c01(sp(now - t0, 170))})`, opacity: q ? 1 - 0.6 * ease(now - th, 0.4) : 1 }}>
        <div style={{ position: "absolute", left: 50, right: 50, top: 60, fontFamily: F.mono, fontSize: 40, color: "#9fe870", lineHeight: 1.7 }}>
          {["search(notes, q)", "sync(cloud)", "export(pdf)", "if (!paid)", "  lock()", "plan.price = 20"].map((l, i) => <div key={i}>{l}</div>)}
        </div>
        {/* the door slides shut over the code */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${shut * 100}%`, borderRadius: 34, background: "#2b2433", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <svg width={200} height={240} viewBox="0 0 100 120" style={{ opacity: c01((shut - 0.7) / 0.3) }}>
            <path d="M25 55 V35 a25 25 0 0 1 50 0 V55" stroke={TH.accent} strokeWidth={10} fill="none" />
            <rect x={12} y={52} width={76} height={60} rx={10} fill={TH.accent} />
            <circle cx={50} cy={78} r={8} fill="#2b2433" /><rect x={46} y={80} width={8} height={18} rx={3} fill="#2b2433" />
          </svg>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -80, textAlign: "center" }}><Mono s={26} c={TH.accent} w={800}>SOURCE CODE · COMPANY ONLY</Mono></div>
      </div>
      {q ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontSize: 520, color: TH.ink, lineHeight: 1, transform: `scale(${sp(now - th, 200)})` }}>?</div>
      ) : null}
    </>
  );
};

// 4. The app on your laptop peels back to code, the code turns to 0s and 1s, a chip reads it; to you it's noise
const b4: B = (now, T) => {
  const t0 = T("b4"), ti = T("inside"), tt = T("turned"), tc = T("chip"), tn = T("noise");
  const peel = ease(now - ti, 0.45);
  const bin = now >= tt;
  const chipUp = sp(now - tc, 160);
  const jitter = now >= tn ? 1 : 0;
  const CODE = ["function search(q) {", "  return notes", "    .filter(match(q))", "}", "sync(cloud)", "export(pdf)"];
  return (
    <>
      <Head t={now - t0} a={jitter ? "To you," : "It's all"} i={jitter ? "noise." : "inside."} top={190} size={104} />
      <div style={{ position: "absolute", left: 120, top: 420, width: 840, opacity: c01((now - t0) / 0.2), transform: `translateY(${(1 - c01(sp(now - t0, 170))) * 60}px)` }}>
        <div style={{ height: 600, borderRadius: "28px 28px 0 0", background: "#0f1730", border: `10px solid ${TH.ink}`, borderBottom: "none", position: "relative", overflow: "hidden" }}>
          {/* what's under the app: code, then binary */}
          <div style={{ position: "absolute", left: 36, top: 30, fontFamily: F.mono, fontSize: bin ? 34 : 40, lineHeight: 1.5, color: bin ? "#9fe870" : "#c7d5ff", letterSpacing: bin ? 4 : 0 }}>
            {(bin ? Array.from({ length: 11 }) : CODE).map((l, i) => (
              <div key={i} style={{ transform: jitter ? `translateX(${(rnd(i + Math.floor(now * 12)) - 0.5) * 30}px)` : "none", opacity: jitter ? 0.5 + 0.5 * rnd(i * 3 + Math.floor(now * 12)) : 1 }}>
                {bin ? bits(i, 22, Math.floor((now - tt) * 6)) : (l as string)}
              </div>
            ))}
          </div>
          {/* the app window peeling off */}
          <div style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, background: "#ffffff", transformOrigin: "100% 0%", transform: `rotate(${peel * 70}deg) translate(${peel * 300}px, ${-peel * 200}px)`, opacity: 1 - c01((peel - 0.7) / 0.3), boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ height: 70, background: "#efeef5", display: "flex", alignItems: "center", gap: 10, paddingLeft: 22 }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}
              <span style={{ marginLeft: 16, fontFamily: F.body, fontWeight: 700, fontSize: 26, color: "#16161a" }}>Notely Pro</span>
            </div>
            <div style={{ position: "absolute", left: 40, top: 110, display: "flex", gap: 30 }}>
              <NoteIcon s={120} />
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 10 }}>
                {[420, 360, 300, 380].map((w, i) => <div key={i} style={{ width: w, height: 22, borderRadius: 11, background: "#e4e1ef" }} />)}
              </div>
            </div>
          </div>
        </div>
        <div style={{ height: 40, margin: "0 -70px", borderRadius: "0 0 34px 34px", background: TH.ink }} />
      </div>
      {now >= tc - 0.1 ? (
        <div style={{ position: "absolute", left: 390, top: 1140 + (1 - c01(chipUp)) * 300, width: 300, height: 220, opacity: c01((now - tc + 0.1) / 0.15) }}>
          <svg width={300} height={220} viewBox="0 0 300 220">
            {Array.from({ length: 8 }).map((_, i) => <rect key={i} x={50 + i * 27} y={0} width={12} height={220} rx={4} fill={TH.dim} />)}
            <rect x={30} y={25} width={240} height={170} rx={22} fill="#0f1730" stroke={TH.ink} strokeWidth={6} />
            <text x={150} y={125} textAnchor="middle" fontFamily={F.mono} fontSize={40} fontWeight={800} fill="#9fe870">CPU</text>
          </svg>
          <div style={{ marginTop: 10, textAlign: "center" }}><Mono s={22} c={TH.ink} w={800}>ONLY THE CHIP READS IT</Mono></div>
        </div>
      ) : null}
    </>
  );
};

// 5. REA hands Claude the tools: the binary decodes letter by letter into words, then the steps land one per phrase
const b5: B = (now, T) => {
  const t0 = T("b5"), tk = T("back"), to = T("open"), steps: [string, number][] = [["Open the file", to], ["Check the plan", T("check")], ["Save the work", T("save")]];
  const goal = ["open(file) check(plan)", "save(work) -> steps   "];
  const k = c01((now - tk) / Math.max(0.6, to - tk - 0.2));
  const row = (r: number) => {
    const b = bits(r + 1, 40, Math.floor((now - t0) * 8));
    const n = Math.floor(k * goal[r].length);
    return goal[r].slice(0, n) + b.slice(n, goal[r].length);
  };
  const pulse = now >= tk && now < to ? 1 + 0.05 * Math.sin((now - tk) * 18) : 1;
  return (
    <>
      <Head t={now - t0} a="Noise into" i="steps." top={190} size={104} />
      <In t={now - t0 - 0.1} style={{ left: 140, top: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 32px", borderRadius: 999, background: "#1b1b20" }}>
          <Img src={claude} style={{ width: 56, height: 56 }} /><span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 40, color: "#f2f2f5" }}>Claude</span>
        </div>
      </In>
      <In t={now - t0 - 0.3} style={{ left: 600, top: 380 }}>
        <div style={{ width: 340, height: 130, borderRadius: 26, background: TH.ink, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, position: "relative", transform: `scale(${pulse})` }}>
          <div style={{ position: "absolute", top: -34, left: 110, width: 120, height: 50, borderRadius: "20px 20px 0 0", border: `10px solid ${TH.ink}`, borderBottom: "none" }} />
          <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 64, color: TH.bg, letterSpacing: 6 }}>REA</span>
          <Mono s={18} c={TH.bg}>TOOLS</Mono>
        </div>
      </In>
      <div style={{ position: "absolute", left: 70, right: 70, top: 600, opacity: c01((now - t0 - 0.4) / 0.2) * (now >= to - 0.3 ? 1 - 0.7 * c01((now - to + 0.3) / 0.3) : 1) }}>
        {[0, 1].map((r) => {
          const n = Math.floor(k * goal[r].length);
          return (
            <div key={r} style={{ fontFamily: F.mono, fontSize: 52, letterSpacing: 2, whiteSpace: "pre", lineHeight: 1.5 }}>
              {Array.from(row(r)).map((c, j) => <span key={j} style={{ color: j < n ? TH.ink : TH.dim, fontWeight: j < n ? 800 : 400 }}>{c}</span>)}
            </div>
          );
        })}
        <div style={{ marginTop: 18, height: 14, borderRadius: 7, background: "rgba(0,0,0,0.12)" }}><div style={{ width: `${k * 100}%`, height: "100%", borderRadius: 7, background: TH.ink }} /></div>
        <div style={{ marginTop: 10 }}><Mono s={20} c={TH.ink} w={800}>{k < 1 ? `DECODING ${Math.round(k * 100)}%` : "DECODED"}</Mono></div>
      </div>
      {now >= to - 0.3 ? (
        <Card x={110} y={860} w={860} h={460} t={now - to + 0.3} fill={TH.card} r={30}>
          <div style={{ position: "absolute", left: 40, top: 32 }}><Mono s={20}>READABLE STEPS · ILLUSTRATIVE</Mono></div>
          {steps.map(([s, t], i) => (
            <div key={i} style={{ position: "absolute", left: 40, right: 40, top: 90 + i * 120, height: 100, borderTop: `2px solid ${TH.line}`, display: "flex", alignItems: "center", gap: 22, opacity: c01((now - t + 0.1) / 0.12) }}>
              <span style={{ fontFamily: F.mono, fontSize: 40, color: TH.dim, width: 40 }}>{i + 1}</span>
              <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 52, color: TH.ink, minWidth: 520 }}>{typed(s, now - t + 0.05, 30)}</span>
              <Check t={now - t - 0.35} size={50} />
            </div>
          ))}
        </Card>
      ) : null}
    </>
  );
};

// 6. Blueprint: each part traced and labelled, a blueprint drawn, the same feature built in your own app
const b6: B = (now, T) => {
  const t0 = T("b6"), tp = T("blueprint"), ts = T("same");
  const built = now >= ts - 0.1;
  const parts: [string, number, number][] = [["SEARCH", 160, 520], ["SYNC", 600, 600], ["EXPORT", 260, 880]];
  const draw = ease(now - tp + 0.1, 0.8);
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: 0.25 }}>
        {Array.from({ length: 28 }).map((_, i) => <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={1920} stroke={TH.dim} strokeWidth={1} />)}
        {Array.from({ length: 48 }).map((_, i) => <line key={`h${i}`} x1={0} y1={i * 40} x2={1080} y2={i * 40} stroke={TH.dim} strokeWidth={1} />)}
      </svg>
      <Head t={now - t0} a={built ? "In your" : "A"} i={built ? "own app." : "blueprint."} top={190} size={104} />
      {!built ? (
        <>
          {now < tp - 0.1 ? parts.map(([l, x, y], i) => (
            <In key={i} t={now - t0 - 0.2 - i * 0.35} style={{ left: x, top: y }}>
              <div style={{ width: 320, height: 200, border: `4px dashed ${TH.ink}`, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: F.mono, fontSize: 36, color: TH.ink, fontWeight: 800, letterSpacing: 3 }}>{l}</span>
              </div>
              <div style={{ marginTop: 10 }}><Mono s={20} c={TH.dim}>{["finds notes by word", "keeps devices in step", "saves as a PDF"][i]}</Mono></div>
            </In>
          )) : (
            <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
              {/* a line drawing of the search feature: a window, a search bar, results */}
              {[
                "M 140 460 H 940 V 1240 H 140 Z", "M 140 540 H 940", "M 200 600 H 880 V 680 H 200 Z", "M 820 625 a 18 18 0 1 1 0.1 0 M 833 652 l 18 18",
                "M 200 740 H 880", "M 200 840 H 760", "M 200 940 H 820", "M 200 1040 H 700",
              ].map((d, i) => <path key={i} d={d} stroke={TH.ink} strokeWidth={5} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - c01(draw * 1.6 - i * 0.12)} />)}
              <text x={170} y={1300} fontFamily={F.mono} fontSize={24} fill={TH.dim} letterSpacing={2}>FIG. 1 · SEARCH, AS NOTELY DOES IT</text>
            </svg>
          )}
        </>
      ) : (
        <Card x={130} y={440} w={820} h={820} t={now - ts + 0.1} fill="#ffffff" r={30}>
          <div style={{ height: 70, background: "#efeef5", borderRadius: "30px 30px 0 0", display: "flex", alignItems: "center", gap: 10, paddingLeft: 24 }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}
            <span style={{ marginLeft: 16, fontFamily: F.body, fontWeight: 700, fontSize: 26, color: "#16161a" }}>My app</span>
          </div>
          <div style={{ position: "absolute", left: 50, right: 50, top: 120, height: 90, borderRadius: 45, border: `3px solid ${GREEN}`, display: "flex", alignItems: "center", paddingLeft: 34, fontFamily: F.body, fontSize: 38, color: "#16161a" }}>
            {typed("meeting notes", now - ts - 0.2, 20)}<span style={{ opacity: Math.sin(now * 10) > 0 ? 1 : 0, marginLeft: 2 }}>|</span>
          </div>
          {["Meeting notes · Monday", "Meeting notes · Q4 plan", "Notes from the meeting"].map((r, i) => (
            <div key={i} style={{ position: "absolute", left: 50, right: 50, top: 260 + i * 120, height: 96, borderRadius: 18, background: "#f4f2ee", display: "flex", alignItems: "center", paddingLeft: 30, gap: 18, opacity: c01((now - ts - 0.9 - i * 0.15) / 0.15) }}>
              <NoteIcon s={50} c={GREEN} />
              <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 34, color: "#16161a" }}>{r}</span>
            </div>
          ))}
          <div style={{ position: "absolute", left: 50, bottom: 50, display: "flex", alignItems: "center", gap: 16 }}>
            <Check t={now - ts - 1.3} size={56} /><span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 36, color: "#16161a", opacity: c01((now - ts - 1.3) / 0.2) }}>Search, built</span>
          </div>
        </Card>
      )}
    </>
  );
};

// 7. Runs on your own computer; Claude Code, Codex and Cursor plug in
const b7: B = (now, T) => {
  const t0 = T("b7"), tw = T("works");
  const tools: [string, number][] = [["Claude Code", tw + 0.4], ["Codex", tw + 1.4], ["Cursor", tw + 2.4]];
  return (
    <>
      <Head t={now - t0} a="On your" i="computer." top={190} size={104} />
      <div style={{ position: "absolute", left: 170, top: 410, width: 740, opacity: c01((now - t0) / 0.2), transform: `scale(${0.9 + 0.1 * c01(sp(now - t0, 170))})` }}>
        <div style={{ height: 380, borderRadius: "26px 26px 0 0", border: `8px solid ${TH.ink}`, borderBottom: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ padding: "18px 34px", borderRadius: 999, background: TH.ink }}><span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 64, color: TH.bg, letterSpacing: 6 }}>REA</span></div>
        </div>
        <div style={{ height: 32, margin: "0 -54px", borderRadius: "0 0 28px 28px", background: TH.ink }} />
        <div style={{ marginTop: 18, textAlign: "center" }}><Mono s={24} c={TH.ink} w={800}>RUNS LOCALLY · YOUR APP STAYS ON YOUR MACHINE</Mono></div>
      </div>
      {tools.map(([n, t], i) => (
        <div key={i} style={{ position: "absolute", left: 230 - (1 - c01(sp(now - t, 200))) * 500, top: 960 + i * 120, width: 620, height: 96, borderRadius: 26, background: i === 0 ? "#0a0a0c" : TH.card, display: "flex", alignItems: "center", gap: 18, paddingLeft: 28, opacity: c01((now - t) / 0.12), boxShadow: "0 12px 26px rgba(0,0,0,0.12)" }}>
          <Img src={LOGOS[i]} style={{ width: 52, height: 52, borderRadius: i === 1 ? 12 : 0 }} />
          <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 40, color: i === 0 ? "#f2f2f5" : TH.ink }}>{n}</span>
          <span style={{ marginLeft: "auto", marginRight: 26 }}><Check t={now - t - 0.25} size={42} /></span>
        </div>
      ))}
    </>
  );
};

// 8. Comment REA; the setup guide card
const b8: B = (now, T) => {
  const t0 = T("b8"), tg = T("guide");
  return (
    <>
      <In t={now - t0} style={{ left: 0, right: 0, top: 300, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: TH.card, borderRadius: 999, padding: "18px 40px 18px 18px", boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: TH.line }} />
          <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 48, color: TH.dim }}>Comment</span>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 56, color: TH.ink, letterSpacing: 3, minWidth: 140 }}>{typed("REA", now - t0 - 0.35, 8)}</span>
        </div>
      </In>
      {now >= tg - 0.6 ? (
        <Card x={150} y={520} w={780} h={760} t={now - tg + 0.6} fill={TH.card} r={34}>
          <div style={{ position: "absolute", left: 44, top: 40 }}><Mono s={22}>SETUP GUIDE · REA + CLAUDE CODE</Mono></div>
          <div style={{ position: "absolute", left: 44, top: 100, fontFamily: SERIF, fontSize: 60, color: TH.ink }}>The link, <span style={{ fontStyle: "italic" }}>and</span> the steps</div>
          {["Install it (one command)", "Connect Claude Code", "Point it at an app", "Ask for a feature"].map((r, i) => (
            <div key={i} style={{ position: "absolute", left: 44, right: 44, top: 250 + i * 110, height: 90, borderTop: `2px solid ${TH.line}`, display: "flex", alignItems: "center", gap: 18, opacity: c01((now - tg + 0.4 - i * 0.1) / 0.15) }}>
              <Check t={now - tg + 0.3 - i * 0.1} size={40} />
              <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 38, color: TH.ink }}>{r}</span>
            </div>
          ))}
        </Card>
      ) : null}
    </>
  );
};

const BEATS: { key: string; draw: B; world: string; tab: number }[] = [
  { key: "b1", draw: b1, world: "dark", tab: -1 }, { key: "b2", draw: b2, world: "white", tab: 0 }, { key: "b3", draw: b3, world: "vault", tab: 1 },
  { key: "b4", draw: b4, world: "blue", tab: 1 }, { key: "b5", draw: b5, world: "amber", tab: 2 }, { key: "b6", draw: b6, world: "print", tab: 3 },
  { key: "b7", draw: b7, world: "green", tab: 3 }, { key: "b8", draw: b8, world: "white", tab: -1 },
];
const TABS = ["01 THE TOOL", "02 THE LOCK", "03 DECODE", "04 REBUILD"];

export const ReaView: View = {
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
    const capAccent = TH === W.white ? "#2f5ff0" : TH === W.dark ? CLAY : TH === W.amber ? "#ffffff" : TH === W.green ? "#1a9c55" : TH.accent;
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
      { t: T("hand"), sound: "swish", gain: 0.2 * soft },
      { t: T("apart"), sound: "whoosh", gain: 0.28 }, { t: T("apart") + 0.05, sound: "subdrop", gain: 0.35 }, { t: T("build") + 0.3, sound: "pop", gain: 0.2 * soft },
      { t: T("b2"), sound: "swish", gain: 0.2 * soft }, { t: T("short"), sound: "click", gain: 0.18 * soft }, { t: T("stars") + 0.1, sound: "ding", gain: 0.18 * soft },
      { t: T("b3") + 0.9, sound: "lock", gain: 0.22 * soft },
      { t: T("b4"), sound: "swish", gain: 0.2 * soft }, { t: T("chip"), sound: "pop", gain: 0.15 * soft },
      { t: T("b5"), sound: "swish", gain: 0.2 * soft }, { t: T("open"), sound: "click", gain: 0.15 * soft }, { t: T("check"), sound: "click", gain: 0.15 * soft }, { t: T("save"), sound: "click", gain: 0.15 * soft },
      { t: T("b6"), sound: "swish", gain: 0.2 * soft }, { t: T("same"), sound: "pop", gain: 0.18 * soft },
      { t: T("b7"), sound: "swish", gain: 0.2 * soft }, { t: T("works") + 0.4, sound: "pop", gain: 0.15 * soft },
      { t: T("b8") + 0.35, sound: "typing", gain: 0.15 * soft },
    ];
  },
};
