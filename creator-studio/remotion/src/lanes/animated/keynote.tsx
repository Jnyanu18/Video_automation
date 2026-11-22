import React from "react";
import { useCurrentFrame, interpolate, Easing, spring, Img, staticFile } from "remotion";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { F, FPS, Word } from "../../kit/theme";
import type { View } from "./faceless";

/** The keynote look in our white signature theme (three-agents, 2026-11-06), after DePHvVvs9VW's structure without its look
 *  (DEC-2026-019): each product gets its own colour world that floods in from the centre, chapter tabs track where you are,
 *  a serif headline carries one italic word, and interface mock-ups build on every phrase. Motion is smooth and springy
 *  (a keynote, not paper): entrances overshoot a little and settle; the camera pushes slightly on each beat. Mock data is
 *  labelled ILLUSTRATIVE. Each product has our own stand-in mark, never its mascot. */

export const SERIF = loadFraunces("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;
loadFraunces("italic", { weights: ["500"], subsets: ["latin"] });

export const W0 = { bg: "#f4f2ee", ink: "#16161a", dim: "#8a8780", card: "#ffffff", line: "#e4e1da" };
const WORLD = {
  dots: { bg: "#130a1f", ink: "#ffffff", dim: "#b9a8d6", accent: "#ffd23f", card: "#241538" },
  muse: { bg: "#1f4fe0", ink: "#ffffff", dim: "#c7d5ff", accent: "#ffffff", card: "#2f5ff0" },
  grok: { bg: "#0d0d0f", ink: "#ffffff", dim: "#8e8e96", accent: "#f2f2f2", card: "#1b1b1f" },
};
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
export const c01 = (x: number) => Math.max(0, Math.min(1, x));
/** a keynote entrance: springs in with a small overshoot */
export const sp = (t: number, stiff = 160) => (t <= 0 ? 0 : spring({ frame: t * FPS, fps: FPS, config: { damping: 13, stiffness: stiff, mass: 0.7 } }));
export const ease = (t: number, d = 0.35) => Easing.out(Easing.cubic)(c01(t / d));
export const In: React.FC<{ t: number; dy?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ t, dy = 40, children, style }) => {
  const k = sp(t);
  return <div style={{ position: "absolute", opacity: c01(t / 0.15), transform: `translateY(${(1 - k) * dy}px) scale(${0.94 + 0.06 * k})`, ...style }}>{children}</div>;
};

// ---------------------------------------------------------------- marks: the real mascots (Vishnu, 2026-11-06: mascots are
// constants, used as they are). Dots: OpenAI's press image (via Gizmodo, 2026-09-29). Muse: Hatch, from muse.ai. Grok Bot:
// no official mascot found yet, so a stand-in until Vishnu supplies one.
const crop = (f: string) => staticFile(`three-agents/raw/crops/${f}`);
const DotsMark: React.FC<{ s: number; which?: string }> = ({ s, which = "dot_cloud" }) => (
  <div style={{ width: s, height: s, borderRadius: s * 0.24, background: "#000", overflow: "hidden", flexShrink: 0 }}>
    <Img src={crop(`${which}.png`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 70%" }} />
  </div>
);
const MuseMark: React.FC<{ s: number }> = ({ s }) => (
  <div style={{ width: s, height: s, borderRadius: s / 2, background: "#f3f1ee", overflow: "hidden", flexShrink: 0, boxShadow: `0 ${s * 0.06}px ${s * 0.2}px rgba(20,30,90,0.25)` }}>
    <Img src={crop("hatch_head.png")} style={{ width: "100%", height: "118%", objectFit: "cover", objectPosition: "50% 0%" }} />
  </div>
);
/** Grok Bot's mascot, drawn as it is (Vishnu's reference, 2026-11-06): a round glossy blob with two slanted, rounded eyes
 *  high on the right. White with black eyes on the app icon; the @bot family comes in colours. */
const GrokMark: React.FC<{ s: number; body?: string; eye?: string }> = ({ s, body = "#f4f4f6", eye = "#111114" }) => (
  <svg width={s} height={s} viewBox="0 0 100 100">
    <defs><radialGradient id={`gk${body.slice(1)}`} cx="38%" cy="30%" r="75%"><stop offset="0" stopColor="#ffffff" stopOpacity={0.55} /><stop offset="0.55" stopColor="#ffffff" stopOpacity={0} /></radialGradient></defs>
    <path d="M50 8 C76 8 92 26 92 52 C92 76 74 92 50 92 C26 92 8 76 8 52 C8 26 24 8 50 8 Z" fill={body} />
    <path d="M50 8 C76 8 92 26 92 52 C92 76 74 92 50 92 C26 92 8 76 8 52 C8 26 24 8 50 8 Z" fill={`url(#gk${body.slice(1)})`} />
    <rect x={51} y={24} width={9} height={24} rx={4.5} fill={eye} transform="rotate(-24 55.5 36)" />
    <rect x={67} y={24} width={9} height={24} rx={4.5} fill={eye} transform="rotate(-24 71.5 36)" />
  </svg>
);
/** the Dots crew peeking up from the bottom of the frame, as in OpenAI's own image; black melts into the dark world */
const DotsCrew: React.FC<{ t: number; w?: number; top: number }> = ({ t, w = 760, top }) => (
  <div style={{ position: "absolute", left: 540 - w / 2, top: top + (1 - sp(t, 120)) * 160, width: w, opacity: c01(t / 0.15) }}>
    <Img src={crop("dots_crew.png")} style={{ width: "100%" }} />
  </div>
);
const MARKS = [DotsMark, MuseMark, GrokMark];

// ---------------------------------------------------------------- shared pieces
const Headline: React.FC<{ t: number; a: string; i?: string; b?: string; color: string; top?: number; size?: number }> = ({ t, a, i, b, color, top = 230, size = 104 }) => (
  <In t={t} dy={30} style={{ left: 60, right: 60, top, textAlign: "center", fontFamily: SERIF, fontSize: size, color, lineHeight: 1.05, letterSpacing: -1 }}>
    {a}{i ? <span style={{ fontStyle: "italic" }}> {i}</span> : null}{b ? ` ${b}` : null}
  </In>
);
const Tag: React.FC<{ t: number; text: string; color: string; top: number }> = ({ t, text, color, top }) => (
  <In t={t} dy={14} style={{ left: 0, right: 0, top, textAlign: "center", fontFamily: F.mono, fontSize: 26, letterSpacing: 4, color }}>{text}</In>
);
export const Card: React.FC<{ x: number; y: number; w: number; h: number; t: number; fill: string; r?: number; children?: React.ReactNode; shadow?: string; style?: React.CSSProperties }> = ({ x, y, w, h, t, fill, r = 30, children, shadow = "0 30px 60px rgba(0,0,0,0.18)", style }) => {
  const k = sp(t);
  return <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: fill, borderRadius: r, boxShadow: shadow, opacity: c01(t / 0.12), transform: `translateY(${(1 - k) * 60}px) scale(${0.92 + 0.08 * k})`, overflow: "hidden", ...style }}>{children}</div>;
};
export const Check: React.FC<{ t: number; color?: string; size?: number }> = ({ t, color = "#2fbf71", size = 40 }) => (
  <div style={{ width: size, height: size, borderRadius: size / 2, background: color, transform: `scale(${sp(t, 220)})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24"><path d="M5 12.5 L10 17 L19 7" stroke="#fff" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </div>
);
export const typed = (s: string, t: number, cps = 26) => s.slice(0, Math.max(0, Math.floor(t * cps)));
const AppChip: React.FC<{ label: string; color: string; t: number; ink: string }> = ({ label, color, t, ink }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.1)", borderRadius: 18, padding: "12px 18px", transform: `scale(${sp(t, 200)})`, opacity: c01(t / 0.1) }}>
    <div style={{ width: 34, height: 34, borderRadius: 9, background: color }} />
    <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 28, color: ink }}>{label}</span>
    <div style={{ width: 12, height: 12, borderRadius: 6, background: "#2fbf71" }} />
  </div>
);

// ---------------------------------------------------------------- captions: clean sans, the word being said in the world's accent
const chunked = (words: Word[]) => {
  const out: Word[][] = []; let c: Word[] = [];
  words.forEach((w) => { c.push(w); if (c.length >= 3 || /[.,!?;:]$/.test(w.w)) { out.push(c); c = []; } });
  if (c.length) out.push(c);
  return out;
};
export const Captions: React.FC<{ words: Word[]; now: number; ink: string; accent: string }> = ({ words, now, ink, accent }) => {
  const chunks = chunked(words);
  const cur = [...chunks].reverse().find((c) => c[0].start <= now + 0.04);
  if (!cur) return null;
  const live = [...cur].reverse().find((w) => w.start <= now + 0.04);
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1560, textAlign: "center", fontFamily: F.body, fontWeight: 600, fontSize: 60, color: ink }}>
      {cur.map((w, i) => <span key={i} style={{ margin: "0 0.14em", color: w === live ? accent : ink, opacity: w.start <= now + 0.04 ? 1 : 0.25 }}>{w.w.replace(/[.,]$/, "")}</span>)}
    </div>
  );
};

// ---------------------------------------------------------------- the beats
type B = (now: number, T: (k: string) => number) => React.ReactNode;
const NAMES = ["Dots", "Muse", "Grok Bot"];
const ORG = ["OPENAI", "META", "XAI"];

// 1. Three new agents look alike, then flip into three colour worlds on "completely different"
const b1: B = (now, T) => {
  const t0 = T("b1"), td = T("diff");
  return (
    <>
      <Headline t={now - t0} a={now < td ? "Three new" : "Completely"} i={now < td ? "agents." : "different."} color={W0.ink} />
      {NAMES.map((n, i) => {
        const flip = c01((now - td - i * 0.1) / 0.4);
        const ang = Easing.inOut(Easing.cubic)(flip) * 180;
        const front = ang < 90;
        const world = [WORLD.dots, WORLD.muse, WORLD.grok][i];
        const Mark = MARKS[i];
        return (
          <div key={i} style={{ position: "absolute", left: 70 + i * 320, top: 560, width: 300, height: 560, perspective: 1400 }}>
            <Card x={0} y={0} w={300} h={560} t={now - t0 - 0.1 - i * 0.08} fill={front ? W0.card : world.bg} style={{ transform: `rotateY(${front ? ang : ang - 180}deg)` }}>
              {front ? (
                <>
                  <div style={{ position: "absolute", left: 90, top: 150, width: 120, height: 120, borderRadius: 60, background: W0.line }} />
                  <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", fontFamily: SERIF, fontSize: 54, color: W0.ink }}>{n}</div>
                  <div style={{ position: "absolute", left: 0, right: 0, top: 450, textAlign: "center", fontFamily: F.mono, fontSize: 20, letterSpacing: 3, color: W0.dim }}>AI AGENT</div>
                </>
              ) : (
                <>
                  <div style={{ position: "absolute", left: 80, top: 130 }}><Mark s={140} /></div>
                  <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", fontFamily: SERIF, fontSize: 54, color: world.ink }}>{n}</div>
                  <div style={{ position: "absolute", left: 0, right: 0, top: 450, textAlign: "center", fontFamily: F.mono, fontSize: 20, letterSpacing: 3, color: world.dim }}>{ORG[i]}</div>
                </>
              )}
            </Card>
          </div>
        );
      })}
    </>
  );
};

// 2. Dots, in our own take on OpenAI's layout (their image: chat on the left, the dot's own computer on the right, the dot
//    named on top): lives inside ChatGPT, gets its own computer, keeps working on your goal while you're away. The Dots crew
//    peeks up from the bottom the whole chapter.
const b2: B = (now, T) => {
  const t0 = T("b2"), tin = T("inside"), tc = T("own"), tk = T("keeps"), ta = T("away");
  const w = WORLD.dots;
  const Y = "#ffd23f", INK = "#1d1a14";
  const secs = Math.max(0, now - tk) * 900 + 8040;
  const p2 = (n: number) => String(n).padStart(2, "0");
  const clock = `${p2(Math.floor(secs / 3600))}:${p2(Math.floor((secs % 3600) / 60))}:${p2(Math.floor(secs % 60))}`;
  const away = ease(now - ta, 0.4);
  const bubble = (t: number, mine: boolean, text: string, k: number) => now >= t ? (
    <div key={k} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: 300, background: mine ? Y : "#efede8", color: INK, fontFamily: F.body, fontSize: 21, lineHeight: 1.3, padding: "12px 16px", borderRadius: 18, transform: `scale(${sp(now - t, 220)})`, transformOrigin: mine ? "100% 50%" : "0 50%" }}>{text}</div>
  ) : null;
  const docLines = Math.min(6, Math.max(0, Math.floor((now - tc - 0.5) / 0.35)));
  return (
    <>
      <Tag t={now - t0} text="01 · OPENAI" color={w.dim} top={210} />
      <Headline t={now - t0 - 0.05} a="Dots" color={w.ink} top={250} size={130} />
      {now >= tin ? (
        <Card x={50} y={450} w={980} h={640} t={now - tin} fill="#fbf8f1" r={26} shadow="0 40px 80px rgba(0,0,0,0.55)">
          {/* window chrome */}
          <div style={{ position: "absolute", left: 22, top: 20, display: "flex", gap: 9 }}>{["#ff5f57", "#febc2e", "#28c840"].map((c, i) => <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />)}</div>
          <div style={{ position: "absolute", left: 100, top: 14, fontFamily: F.body, fontWeight: 600, fontSize: 20, color: "#6b665c" }}>ChatGPT</div>
          {/* left pane: the chat with the dot */}
          <div style={{ position: "absolute", left: 20, top: 54, width: 440, bottom: 20, background: "#ffffff", borderRadius: 18, overflow: "hidden" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16 }}>
              <DotsMark s={84} which="dot_triangle" />
              <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 22, color: INK, marginTop: 8 }}>Sunny</div>
              <div style={{ fontFamily: F.body, fontSize: 18, color: "#8a857a" }}>{now >= tk ? "Working…" : "Online"}</div>
            </div>
            {now >= tk ? <div style={{ margin: "10px 18px 0", background: "#fff6d6", border: `2px solid ${Y}`, borderRadius: 14, padding: "10px 14px", fontFamily: F.body, fontSize: 19, color: INK, transform: `scale(${sp(now - tk, 220)})` }}><span style={{ fontFamily: F.mono, fontSize: 15, letterSpacing: 2, color: "#9a7a00" }}>ONGOING GOAL</span><br />{typed("Keep my launch on track", now - tk - 0.15, 30)}</div> : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 18px" }}>
              {bubble(tin + 0.3, true, "Can you keep the launch plan updated?", 0)}
              {bubble(tin + 0.9, false, "Yes. I'll work on it in the background and check in.", 1)}
              {bubble(ta + 0.2, false, "Updated the plan and flagged 2 blockers.", 2)}
            </div>
          </div>
          {/* right pane: its own computer */}
          {now >= tc ? (
            <div style={{ position: "absolute", left: 480, top: 54, right: 20, bottom: 20, background: "#ffffff", borderRadius: 18, overflow: "hidden", transform: `translateX(${(1 - sp(now - tc)) * 120}px)`, opacity: c01((now - tc) / 0.12) }}>
              <div style={{ height: 46, background: "#f3f1ec", display: "flex", alignItems: "center", gap: 10, padding: "0 14px" }}>
                <div style={{ fontFamily: F.mono, fontSize: 15, color: "#6b665c", background: "#fff", borderRadius: 10, padding: "5px 12px", flex: 1 }}>docs · Launch plan</div>
              </div>
              <div style={{ padding: "18px 22px" }}>
                <div style={{ fontFamily: SERIF, fontSize: 30, color: INK }}>Launch plan</div>
                {Array.from({ length: 6 }, (_, i) => <div key={i} style={{ height: 13, borderRadius: 7, marginTop: 16, width: `${[92, 80, 86, 70, 88, 60][i]}%`, background: i < docLines ? (i === docLines - 1 ? Y : "#e4e0d6") : "transparent" }} />)}
              </div>
              <div style={{ position: "absolute", left: 22, right: 22, bottom: 20, display: "flex", alignItems: "center", gap: 10, fontFamily: F.mono, fontSize: 16, color: "#6b665c" }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: "#28c840" }} />ITS OWN COMPUTER + BROWSER
              </div>
            </div>
          ) : null}
          <div style={{ position: "absolute", right: 30, top: 16, fontFamily: F.mono, fontSize: 14, letterSpacing: 2, color: "#b0aa9c" }}>ILLUSTRATIVE</div>
        </Card>
      ) : null}
      {now >= tk ? <div style={{ position: "absolute", left: 0, right: 0, top: 1110, display: "flex", justifyContent: "center", gap: 14 }}>
        {[["Slack", "#e01e5a"], ["GitHub", "#24292f"], ["Teams", "#5b5fc7"]].map(([l, c], i) => <AppChip key={i} label={l} color={c} t={now - tk - 0.3 - i * 0.12} ink={w.ink} />)}
        <div style={{ fontFamily: F.mono, fontSize: 22, color: Y, alignSelf: "center", marginLeft: 8, opacity: c01((now - tk - 0.7) / 0.2) }}>● {clock}</div>
      </div> : null}
      {now >= ta ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1200, display: "flex", justifyContent: "center", alignItems: "center", gap: 16, opacity: away }}>
          <svg width={44} height={44} viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" fill="#ffd86b" /></svg>
          <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 32, color: w.ink }}>you're offline · it keeps going</span>
        </div>
      ) : null}
      <DotsCrew t={now - t0 - 0.2} w={640} top={1300} />
    </>
  );
};

// 3. Muse: your personal life: books your trips, fills out your forms, does your shopping
const b3: B = (now, T) => {
  const t0 = T("b3"), tl = T("life"), tb = T("books"), tf = T("forms"), ts = T("shop");
  const w = WORLD.muse;
  const row = (t: number, y: number, title: string, sub: string, icon: React.ReactNode) => now >= t ? (
    <div style={{ position: "absolute", left: 30, right: 30, top: y, background: "#f4f6ff", borderRadius: 22, padding: "20px 22px", display: "flex", alignItems: "center", gap: 18, transform: `translateX(${(1 - sp(now - t)) * 80}px)`, opacity: c01((now - t) / 0.12) }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: "#dfe6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 28, color: "#16161a" }}>{title}</div>
        <div style={{ fontFamily: F.body, fontSize: 22, color: "#5a6078", marginTop: 4 }}>{sub}</div>
      </div>
      <Check t={now - t - 0.45} />
    </div>
  ) : null;
  return (
    <>
      <Tag t={now - t0} text="02 · META" color={w.dim} top={210} />
      <Headline t={now - t0 - 0.05} a="Muse" color={w.ink} top={250} size={130} />
      {now >= tl ? <Headline t={now - tl} a="For your" i="personal life." color={w.dim} top={410} size={58} /> : null}
      {now >= t0 + 0.35 ? (
        <Card x={260} y={520} w={560} h={960} t={now - t0 - 0.35} fill="#ffffff" r={60} shadow="0 40px 80px rgba(10,20,90,0.45)">
          <div style={{ position: "absolute", left: 0, right: 0, top: 50, display: "flex", justifyContent: "center" }}><MuseMark s={120} /></div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 190, textAlign: "center", fontFamily: F.body, fontWeight: 600, fontSize: 26, color: "#5a6078" }}>Muse is on it</div>
          {row(tb, 260, "Trip to Lisbon booked", "Fri 6:40 pm · window seat", <svg width={34} height={34} viewBox="0 0 24 24"><path d="M2 14l20-7-4 11-6-3-3 4-1-5z" fill="#2f5ff0" /></svg>)}
          {row(tf, 420, "Visa form filled", typed("Name, passport, dates, address", now - tf - 0.1, 40) || " ", <svg width={30} height={34} viewBox="0 0 20 24"><rect x={1} y={1} width={18} height={22} rx={3} fill="none" stroke="#2f5ff0" strokeWidth={2.5} /><path d="M5 8h10M5 12h10M5 16h6" stroke="#2f5ff0" strokeWidth={2.5} /></svg>)}
          {row(ts, 580, "Checked out: 2 items", "Sunscreen, travel adapter · $34.80", <svg width={36} height={34} viewBox="0 0 26 24"><path d="M1 2h4l3 13h12l3-9H7" fill="none" stroke="#2f5ff0" strokeWidth={2.5} strokeLinejoin="round" /><circle cx={10} cy={20} r={2} fill="#2f5ff0" /><circle cx={19} cy={20} r={2} fill="#2f5ff0" /></svg>)}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 40, textAlign: "center", fontFamily: F.mono, fontSize: 18, letterSpacing: 2, color: "#9aa0b8" }}>ILLUSTRATIVE</div>
        </Card>
      ) : null}
    </>
  );
};

// 4. Grok Bot, in our own take on how xAI describes it (message a bot like a teammate; bots work in parallel in a group
//    chat and only pull you in for judgment calls): a whole team; you give each bot a job, like sales or marketing; it only
//    pings you for approval.
const b4: B = (now, T) => {
  const t0 = T("b4"), tt = T("team"), tg = T("give"), tp = T("pings"), tap = T("approval");
  const w = WORLD.grok;
  const bots = [{ n: "Sales", c: "#3b82f6", t: T("sales"), msg: "On it. Drafting follow-ups for 40 trial signups." }, { n: "Marketing", c: "#f97316", t: T("marketing"), msg: "Launch posts planned for Thursday." }, { n: "Ops", c: "#22c55e", t: T("marketing") + 0.45, msg: "Invoices sorted, 3 flagged." }];
  const press = now >= tap ? interpolate(now - tap, [0, 0.08, 0.2], [1, 0.9, 1], clamp) : 1;
  // each bot is a blob from the @bot family in its own colour; grey until it gets a job
  const avatar = (c: string, on: boolean, s = 50) => <div style={{ flexShrink: 0 }}><GrokMark s={s} body={on ? c : "#3a3a42"} eye={on ? "#111114" : "#5a5a62"} /></div>;
  const msgs: { t: number; who: string; c: string; mine?: boolean; text: string }[] = [
    { t: tg + 0.1, who: "You", c: "#f2f2f2", mine: true, text: typed("Sales, follow up with every trial signup. Marketing, plan the launch posts.", now - tg - 0.1, 40) },
    ...bots.map((b) => ({ t: b.t + 0.15, who: `${b.n} bot`, c: b.c, text: b.msg })),
  ];
  return (
    <>
      <Tag t={now - t0} text="03 · XAI" color={w.dim} top={210} />
      <Headline t={now - t0 - 0.05} a="Grok Bot" color={w.ink} top={250} size={130} />
      {now >= tt ? <Headline t={now - tt} a="A whole" i="team." color={w.dim} top={410} size={58} /> : null}
      {now >= t0 + 0.4 ? (
        <Card x={50} y={520} w={980} h={900} t={now - t0 - 0.4} fill="#151518" r={30} shadow="0 40px 80px rgba(0,0,0,0.7)" style={{ border: "2px solid #26262c" }}>
          {/* the left rail: the team */}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 250, background: "#0f0f12", borderRight: "2px solid #222228", padding: "26px 18px", boxSizing: "border-box" }}>
            <div style={{ fontFamily: F.mono, fontSize: 18, letterSpacing: 3, color: w.dim }}>YOUR TEAM</div>
            {bots.map((b, i) => {
              const here = now >= tt + 0.1 + i * 0.12, on = now >= b.t;
              return here ? (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 22, transform: `translateX(${(1 - sp(now - tt - 0.1 - i * 0.12)) * -60}px)`, opacity: c01((now - tt - 0.1 - i * 0.12) / 0.12) }}>
                  {avatar(b.c, on)}
                  <div><div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 25, color: on ? w.ink : "#6a6a72" }}>{on ? b.n : "New bot"}</div><div style={{ fontFamily: F.mono, fontSize: 14, letterSpacing: 1, color: on ? "#22c55e" : "#5a5a62" }}>{on ? "● WORKING" : "○ NO JOB YET"}</div></div>
                </div>
              ) : null;
            })}
          </div>
          {/* the thread */}
          <div style={{ position: "absolute", left: 270, right: 20, top: 22, fontFamily: F.body, fontWeight: 600, fontSize: 24, color: w.ink }}># launch-week</div>
          <div style={{ position: "absolute", left: 270, right: 24, top: 80, display: "flex", flexDirection: "column", gap: 16 }}>
            {msgs.map((m, i) => now >= m.t ? (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", transform: `translateY(${(1 - sp(now - m.t, 200)) * 30}px)`, opacity: c01((now - m.t) / 0.12) }}>
                {m.mine ? <div style={{ width: 46, height: 46, borderRadius: 23, background: "#f2f2f2", flexShrink: 0 }} /> : avatar(m.c, true)}
                <div><div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 23, color: m.mine ? w.ink : m.c }}>{m.who}</div><div style={{ fontFamily: F.body, fontSize: 27, color: "#d8d8de", lineHeight: 1.3, marginTop: 2 }}>{m.text}</div></div>
              </div>
            ) : null)}
            {now >= tp ? (
              <div style={{ marginLeft: 58, background: "#ffffff", borderRadius: 20, padding: "18px 20px", transform: `scale(${sp(now - tp, 200)})`, transformOrigin: "0 0", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
                <div style={{ fontFamily: F.mono, fontSize: 15, letterSpacing: 2, color: "#3b82f6" }}>SALES BOT · NEEDS YOUR APPROVAL</div>
                <div style={{ fontFamily: F.body, fontSize: 24, color: "#16161a", marginTop: 8 }}>40 follow-up emails are ready to send.</div>
                <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
                  <div style={{ background: now >= tap + 0.1 ? "#22c55e" : "#16161a", color: "#fff", fontFamily: F.body, fontWeight: 600, fontSize: 22, padding: "10px 26px", borderRadius: 14, transform: `scale(${press})` }}>{now >= tap + 0.1 ? "Approved ✓" : "Approve"}</div>
                  <div style={{ border: "2px solid #ddd", color: "#16161a", fontFamily: F.body, fontWeight: 600, fontSize: 22, padding: "8px 22px", borderRadius: 14 }}>Edit</div>
                </div>
              </div>
            ) : null}
          </div>
          <div style={{ position: "absolute", right: 24, bottom: 18, fontFamily: F.mono, fontSize: 14, letterSpacing: 2, color: "#55555c" }}>ILLUSTRATIVE</div>
        </Card>
      ) : null}
    </>
  );
};

// 5. So: Dots for ongoing work, Muse for life admin, Grok Bot for a team, back on white
const b5: B = (now, T) => {
  const t0 = T("b5");
  const rows = [{ k: "rd", n: "Dots", what: "Ongoing work", w: WORLD.dots, M: DotsMark }, { k: "rm", n: "Muse", what: "Life admin", w: WORLD.muse, M: MuseMark }, { k: "rg", n: "Grok Bot", what: "A team", w: WORLD.grok, M: GrokMark }];
  return (
    <>
      <Headline t={now - t0} a="So," i="basically." color={W0.ink} top={260} />
      {rows.map((r, i) => {
        const t = now - T(r.k);
        return t > -0.01 ? (
          <Card key={i} x={110} y={520 + i * 250} w={860} h={210} t={t} fill={r.w.bg} r={34}>
            <div style={{ position: "absolute", left: 36, top: 45 }}><r.M s={120} /></div>
            <div style={{ position: "absolute", left: 190, top: 44, fontFamily: F.mono, fontSize: 22, letterSpacing: 3, color: r.w.dim }}>{r.n.toUpperCase()}</div>
            <div style={{ position: "absolute", left: 190, top: 84, fontFamily: SERIF, fontSize: 72, color: r.w.ink }}>{r.what}</div>
          </Card>
        ) : null;
      })}
    </>
  );
};

// 6. Comment AGENT, and the full comparison slides up
const b6: B = (now, T) => {
  const t0 = T("b6"), tc = T("comparison");
  const rows = ["Pricing", "Who can get it", "Privacy", "Strengths", "Limits"];
  return (
    <>
      <In t={now - t0} style={{ left: 0, right: 0, top: 300, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: "#ffffff", borderRadius: 999, padding: "18px 40px 18px 18px", boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: W0.line }} />
          <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 48, color: W0.dim }}>Comment</span>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 56, color: W0.ink, letterSpacing: 3, minWidth: 220 }}>{typed("AGENT", now - t0 - 0.35, 12)}</span>
        </div>
      </In>
      {now >= tc - 0.3 ? (
        <Card x={110} y={520} w={860} h={820} t={now - tc + 0.3} fill="#ffffff" r={34}>
          <div style={{ position: "absolute", left: 40, top: 34, fontFamily: F.mono, fontSize: 22, letterSpacing: 3, color: W0.dim }}>THE FULL COMPARISON</div>
          <div style={{ position: "absolute", left: 290, top: 90, right: 30, display: "flex" }}>
            {MARKS.map((M, i) => <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><M s={64} /><span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 22, color: W0.ink }}>{NAMES[i]}</span></div>)}
          </div>
          {rows.map((r, i) => (
            <div key={i} style={{ position: "absolute", left: 40, right: 30, top: 230 + i * 110, height: 90, borderTop: `2px solid ${W0.line}`, display: "flex", alignItems: "center", opacity: c01((now - tc - i * 0.1) / 0.2) }}>
              <div style={{ width: 250, fontFamily: SERIF, fontSize: 34, color: W0.ink }}>{r}</div>
              {[0, 1, 2].map((j) => <div key={j} style={{ flex: 1, display: "flex", justifyContent: "center" }}><div style={{ width: 150, height: 18, borderRadius: 9, background: W0.line, filter: "blur(1px)" }} /></div>)}
            </div>
          ))}
        </Card>
      ) : null}
    </>
  );
};

const BEATS: { key: string; draw: B; world: keyof typeof WORLD | null }[] = [
  { key: "b1", draw: b1, world: null }, { key: "b2", draw: b2, world: "dots" }, { key: "b3", draw: b3, world: "muse" },
  { key: "b4", draw: b4, world: "grok" }, { key: "b5", draw: b5, world: null }, { key: "b6", draw: b6, world: null },
];

export const KeynoteAgents: View = {
  View: ({ t0, at, p, words }) => {
    const now = t0 + useCurrentFrame() / FPS;
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => (k === "b1" ? t0 : parts[k] ? at(parts[k]) - 0.08 : 999);
    const starts = BEATS.map((b) => T(b.key));
    let cur = 0;
    starts.forEach((s, i) => { if (now >= s) cur = i; });
    // the Dots world fades to pure black at the bottom, where the crew from OpenAI's image sits (its black background melts in)
    const bgOf = (i: number) => (BEATS[i].world === "dots" ? "linear-gradient(180deg, #1c0f30 0%, #0b0612 45%, #000000 68%)" : BEATS[i].world ? WORLD[BEATS[i].world!].bg : W0.bg);
    // the colour world floods from the centre as a growing circle over the previous one
    const flood = cur === 0 ? 1 : ease(now - starts[cur], 0.45);
    const wk = BEATS[cur].world;
    const ink = wk ? WORLD[wk].ink : W0.ink, accent = wk ? WORLD[wk].accent : "#2f5ff0";
    const push = 1 + 0.025 * c01((now - starts[cur]) / 3);
    const chapter = cur >= 1 && cur <= 4;
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, background: bgOf(Math.max(0, cur - 1)), overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: bgOf(cur), clipPath: `circle(${flood * 130}% at 50% 45%)` }} />
        {chapter ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 90, display: "flex", justifyContent: "center", gap: 14 }}>
            {["01 DOTS", "02 MUSE", "03 GROK BOT"].map((l, i) => {
              const on = (cur === 4 && true) || cur - 1 === i;
              return <div key={i} style={{ fontFamily: F.mono, fontSize: 20, letterSpacing: 2, padding: "8px 18px", borderRadius: 999, background: on ? ink : "transparent", color: on ? (wk ? WORLD[wk].bg : W0.bg) : (wk ? WORLD[wk].dim : W0.dim), border: `2px solid ${on ? ink : wk ? WORLD[wk].dim : W0.line}` }}>{l}</div>;
            })}
          </div>
        ) : null}
        <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "50% 45%" }}>{BEATS[cur].draw(now, T)}</div>
        {words ? <Captions words={words} now={now} ink={ink} accent={accent} /> : null}
      </div>
    );
  },
  hits: ({ at, p }) => {
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => at(parts[k]);
    // earshot, 2026-11-06: 1.88 salient hits a second (refs at most 1.66) and a thin bottom: the flip into the three worlds
    // stays loud with a sub under it; everything else sits about 4 dB lower
    const soft = 0.62;
    return [
      { t: T("diff") + 0.1, sound: "whoosh", gain: 0.3 },
      { t: T("diff") + 0.1, sound: "subdrop", gain: 0.4 },
      { t: T("b2"), sound: "swish", gain: 0.2 * soft }, { t: T("own") + 0.05, sound: "pop", gain: 0.15 * soft },
      { t: T("b3"), sound: "swish", gain: 0.2 * soft }, { t: T("books") + 0.45, sound: "ding", gain: 0.15 * soft }, { t: T("forms") + 0.45, sound: "ding", gain: 0.15 * soft }, { t: T("shop") + 0.45, sound: "cash", gain: 0.18 * soft },
      { t: T("b4"), sound: "swish", gain: 0.2 * soft }, { t: T("approval"), sound: "click", gain: 0.25 * soft },
      { t: T("b5"), sound: "sweep", gain: 0.2 * soft },
      { t: T("b6") + 0.35, sound: "typing", gain: 0.15 * soft },
    ];
  },
};
