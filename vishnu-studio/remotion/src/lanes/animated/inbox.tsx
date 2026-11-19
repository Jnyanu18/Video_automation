import React from "react";
import { useCurrentFrame, Img, staticFile, Easing } from "remotion";
import { loadFont as loadInterTight } from "@remotion/google-fonts/InterTight";
import { FPS } from "../../kit/theme";
import type { View } from "./faceless";
import { Captions } from "./keynote";

/** open-inbox (2026-11-09): the product-film look of 48-echo-hermes, lifted (Vishnu: "make sure the dark is not too
 *  dark and the other texts don't look like AI"): a charcoal stage with a brighter spotlight, no spaced caps or mono
 *  tags, plain sentence-case notes, Inter Tight headlines. Every screen is OpenInbox's own screenshot
 *  (github.com/sums001/OpenInbox, MIT); amber outlines land on the exact part each word names.
 *  ILLUSTRATIVE: the $6 a person in the hook and its avatars. */

const SANS = loadInterTight("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;
const BG = "#17181c", INK = "#f5f3ef", DIM = "#a3a2ab", LINE = "#2c2d33", AMBER = "#f5b83d", RED = "#ff6b5e", CF = "#f38020";
const RAW = (f: string) => staticFile(`open-inbox/raw/${f}`);
const c01 = (x: number) => Math.max(0, Math.min(1, x));
const eo = (t: number, d = 0.6) => Easing.out(Easing.cubic)(c01(t / d));
const eio = (t: number, d = 0.6) => Easing.inOut(Easing.cubic)(c01(t / d));

const Rise: React.FC<{ t: number; children: React.ReactNode; style?: React.CSSProperties; d?: number }> = ({ t, children, style, d = 0.6 }) => {
  const k = eo(t, d);
  return t < 0 ? null : <div style={{ position: "absolute", opacity: k, transform: `translateY(${(1 - k) * 22}px)`, filter: `blur(${(1 - k) * 10}px)`, ...style }}>{children}</div>;
};
const Head: React.FC<{ t: number; text: React.ReactNode; top?: number; size?: number }> = ({ t, text, top = 230, size = 88 }) => (
  <Rise t={t} style={{ left: 70, right: 70, top, textAlign: "center", fontFamily: SANS, fontWeight: 600, fontSize: size, letterSpacing: -2.5, lineHeight: 1.05, color: INK }}>{text}</Rise>
);
const Note: React.FC<{ t: number; children: React.ReactNode; style?: React.CSSProperties; c?: string; s?: number }> = ({ t, children, style, c = DIM, s = 40 }) => (
  <Rise t={t} d={0.45} style={{ fontFamily: SANS, fontWeight: 500, fontSize: s, letterSpacing: -0.5, color: c, ...style }}>{children}</Rise>
);
// a real screenshot on a soft card, with optional amber outlines (in the picture's displayed pixels)
const Shot: React.FC<{ src: string; x: number; y: number; w: number; nat: [number, number]; t: number; push?: number; children?: React.ReactNode }> = ({ src, x, y, w, nat, t, push = 1, children }) => {
  const k = eo(t, 0.7);
  const h = (w * nat[1]) / nat[0];
  return t < 0 ? null : (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: k, transform: `translateY(${(1 - k) * 40}px) scale(${push})`, transformOrigin: "50% 50%" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 22, overflow: "hidden", boxShadow: "0 40px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)" }}>
        <Img src={RAW(src)} style={{ width: w, height: h, display: "block" }} />
      </div>
      {children}
    </div>
  );
};
const Ring: React.FC<{ t: number; x: number; y: number; w: number; h: number; c?: string }> = ({ t, x, y, w, h, c = AMBER }) => {
  const k = eo(t, 0.35);
  return t < 0 ? null : <div style={{ position: "absolute", left: x - 8, top: y - 8, width: w + 16, height: h + 16, borderRadius: 16, border: `4px solid ${c}`, opacity: k, transform: `scale(${1.08 - 0.08 * k})`, boxShadow: `0 0 30px ${c}55` }} />;
};
const Tag: React.FC<{ t: number; x: number; y: number; text: string; c?: string }> = ({ t, x, y, text, c = AMBER }) => (
  <Rise t={t} d={0.35} style={{ left: x, top: y, padding: "8px 18px", borderRadius: 12, background: c, fontFamily: SANS, fontWeight: 700, fontSize: 30, color: "#1a1408", whiteSpace: "nowrap" }}>{text}</Rise>
);
const CfLogo: React.FC<{ s: number }> = ({ s }) => (
  <div style={{ width: s, height: s, background: CF, WebkitMaskImage: `url(${RAW("cloudflare.svg")})`, WebkitMaskSize: "contain", WebkitMaskRepeat: "no-repeat", WebkitMaskPosition: "center", maskImage: `url(${RAW("cloudflare.svg")})`, maskSize: "contain", maskRepeat: "no-repeat", maskPosition: "center" }} />
);

type B = (now: number, T: (k: string) => number) => React.ReactNode;

// 1. HOOK: a team fills in, each person a few dollars a month; on "zero" the total falls to $0
const PEOPLE = ["DO", "MC", "RO", "PR", "LF", "HW", "SB", "AT", "JB", "NL", "KW", "TH"];
const COLS = ["#5b7cfa", "#e0726b", "#3fb68b", "#d29a3c", "#9b7bea", "#4aa8c9"];
const b1: B = (now, T) => {
  const tz = T("zero");
  const n = Math.min(PEOPLE.length, Math.floor(now / 0.32) + 4);
  const zero = eio(now - tz, 0.5);
  const total = Math.round(n * 6 * (1 - zero));
  return (
    <>
      <Head t={now + 0.6} text={now < tz ? <>Email on your <span style={{ color: AMBER }}>own domain.</span></> : <>Now it's <span style={{ color: AMBER }}>free.</span></>} />
      {PEOPLE.slice(0, n).map((p, i) => {
        const t = now - Math.max(0, i - 3) * 0.32 + (i < 4 ? 0.35 : 0), k = eo(t, 0.35);
        const x = 150 + (i % 4) * 210, y = 540 + Math.floor(i / 4) * 210;
        return (
          <div key={p} style={{ position: "absolute", left: x, top: y, width: 150, textAlign: "center", opacity: k * (1 - 0.6 * zero), transform: `scale(${0.85 + 0.15 * k})` }}>
            <div style={{ width: 110, height: 110, margin: "0 auto", borderRadius: 55, background: COLS[i % COLS.length], display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 600, fontSize: 40, color: "#fff" }}>{p}</div>
            <div style={{ marginTop: 10, fontFamily: SANS, fontWeight: 500, fontSize: 28, color: zero > 0.5 ? DIM : INK, textDecoration: zero > 0.5 ? "line-through" : "none" }}>$6 a month</div>
          </div>
        );
      })}
      <Rise t={now - 0.3} style={{ left: 0, right: 0, top: 1210, textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 36, color: DIM }}>Your team, every month</div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 170, letterSpacing: -6, color: zero > 0.5 ? AMBER : INK, fontVariantNumeric: "tabular-nums" }}>${total}</div>
      </Rise>
    </>
  );
};

// 2. OpenInbox: the real logo; open source; your own Cloudflare account; free plan; no server
const b2: B = (now, T) => {
  const t0 = T("b2"), tos = T("os"), tcf = T("cf"), tfr = T("free"), tsv = T("server");
  return (
    <>
      <Rise t={now - t0} style={{ left: 140, right: 140, top: 330 }}><Img src={RAW("openinbox-logo.png")} style={{ width: 760, display: "block", margin: "0 auto" }} /></Rise>
      <Note t={now - tos} style={{ left: 0, right: 0, top: 600, textAlign: "center" }}>Open source, MIT license</Note>
      <Rise t={now - tcf} style={{ left: 140, right: 140, top: 760, height: 260, borderRadius: 30, background: "rgba(255,255,255,0.05)", border: `1.5px solid ${LINE}`, display: "flex", alignItems: "center", gap: 36, padding: "0 50px" }}>
        <CfLogo s={150} />
        <div>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 50, letterSpacing: -1, color: INK }}>Your own Cloudflare account</div>
          {now >= tfr ? <div style={{ marginTop: 10, fontFamily: SANS, fontWeight: 600, fontSize: 40, color: AMBER, opacity: eo(now - tfr, 0.3) }}>On the free plan</div> : null}
        </div>
      </Rise>
      <Note t={now - tsv} style={{ left: 0, right: 0, top: 1090, textAlign: "center" }} c={INK} s={44}>No server to pay for or look after</Note>
    </>
  );
};

// 3. Deploy: the button is clicked, one token pasted, then the real Domains card with its three checks lit
const b3: B = (now, T) => {
  const t0 = T("b3"), ttk = T("token"), trc = T("records");
  const click = now >= t0 + 0.35;
  const cur = eio(now - t0, 0.35);
  const dots = Math.min(28, Math.floor(c01((now - ttk - 0.1) / 0.25) * 28));
  return (
    <>
      <Head t={now - t0} text={now < trc ? <>Click deploy. Paste <span style={{ color: AMBER }}>one token.</span></> : <>Your mail records, <span style={{ color: AMBER }}>done.</span></>} size={80} />
      {now < trc ? (
        <>
          <Rise t={now - t0} style={{ left: 190, top: 560, width: 700, height: 140, borderRadius: 18, background: CF, display: "flex", alignItems: "center", justifyContent: "center", gap: 20, transform: `scale(${click ? 0.97 : 1})`, boxShadow: "0 20px 50px rgba(243,128,32,0.35)" }}>
            <div style={{ width: 70, height: 70, background: "#fff", WebkitMaskImage: `url(${RAW("cloudflare.svg")})`, WebkitMaskSize: "contain", WebkitMaskRepeat: "no-repeat", maskImage: `url(${RAW("cloudflare.svg")})`, maskSize: "contain", maskRepeat: "no-repeat" }} />
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 54, color: "#fff" }}>Deploy to Cloudflare</span>
          </Rise>
          <svg width={60} height={60} viewBox="0 0 24 24" style={{ position: "absolute", left: 760 - 180 * cur, top: 760 - 100 * cur }}><path d="M4 2 L4 20 L9 15 L12 22 L15 21 L12 14 L19 14 Z" fill="#fff" stroke="#000" strokeWidth={1.2} /></svg>
          {now >= ttk ? <Rise t={now - ttk} style={{ left: 120, right: 120, top: 830 }}>
            <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 34, color: DIM, marginBottom: 12 }}>Cloudflare API token</div>
            <div style={{ height: 110, borderRadius: 18, background: "#0f1013", border: `2px solid ${dots >= 28 ? AMBER : LINE}`, display: "flex", alignItems: "center", padding: "0 30px", fontFamily: SANS, fontSize: 52, letterSpacing: 6, color: INK }}>{"•".repeat(dots)}</div>
          </Rise> : null}
        </>
      ) : (
        <Shot src="crops/domain.png" x={40} y={560} w={1000} nat={[1140, 340]} t={now - trc} push={1 + 0.03 * eio(now - trc, 3)}>
          <Ring t={now - trc - 0.4} x={168} y={108} w={502} h={32} />
          <Tag t={now - trc - 0.7} x={640} y={330} text="Set up for you" />
        </Shot>
      )}
    </>
  );
};

// 4. Mailboxes: support, sales, everyone; per seat, still zero
const BOXES: [string, string][] = [["sup", "support@acme.com"], ["sales", "sales@acme.com"], ["team", "team@acme.com"]];
const b4: B = (now, T) => {
  const t0 = T("b4"), tseat = T("seat"), tz = T("zero2");
  return (
    <>
      <Head t={now - t0} text={<>As many mailboxes <span style={{ color: AMBER }}>as you want.</span></>} size={80} />
      <div style={{ position: "absolute", left: 40, top: 520, width: 1000, opacity: 0.22, filter: "blur(1px)" }}><Shot src="crops/users.png" x={0} y={0} w={1000} nat={[2320, 1260]} t={now - t0} /></div>
      {BOXES.map(([k, a], i) => (
        <Rise key={k} t={now - T(k)} d={0.45} style={{ left: 130, right: 130, top: 600 + i * 150, height: 120, borderRadius: 24, background: "#22242a", border: `1.5px solid ${LINE}`, display: "flex", alignItems: "center", gap: 28, padding: "0 36px", boxShadow: "0 20px 40px rgba(0,0,0,0.35)" }}>
          <svg width={56} height={56} viewBox="0 0 24 24"><rect x={2} y={5} width={20} height={14} rx={2.5} fill="none" stroke={AMBER} strokeWidth={1.8} /><path d="M3 7 L12 13 L21 7" fill="none" stroke={AMBER} strokeWidth={1.8} /></svg>
          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 52, letterSpacing: -1, color: INK }}>{a}</span>
        </Rise>
      ))}
      {now >= tseat ? (
        <Rise t={now - tseat} style={{ left: 0, right: 0, top: 1100, textAlign: "center" }}>
          <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 56, color: DIM }}>Per seat </span>
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 110, letterSpacing: -4, color: AMBER, opacity: now >= tz ? 1 : 0.2 }}>$0</span>
        </Rise>
      ) : null}
    </>
  );
};

// 5. In through Cloudflare; out through Resend or Brevo (the real Integrations cards); one hits its limit, the next takes over
const b5: B = (now, T) => {
  const t0 = T("b5"), tout = T("out"), tr = T("resend"), tb = T("brevo"), tl = T("limit"), tn = T("next");
  const fill = eio(now - tl, 0.6);
  return (
    <>
      <Head t={now - t0} text={now < tl ? <>In through <span style={{ color: CF }}>Cloudflare.</span> Out for free.</> : <>One runs out, <span style={{ color: AMBER }}>the next takes over.</span></>} size={76} />
      <Rise t={now - t0} style={{ left: 0, right: 0, top: 470, display: "flex", justifyContent: "center", alignItems: "center", gap: 30 }}>
        <CfLogo s={110} /><svg width={140} height={30}><line x1={0} y1={15} x2={120} y2={15} stroke={DIM} strokeWidth={3} strokeDasharray="10 8" strokeDashoffset={-now * 40} /><path d="M118 6 L134 15 L118 24 Z" fill={DIM} /></svg>
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 48, color: INK }}>Your inbox</span>
      </Rise>
      <Shot src="crops/resend.png" x={180} y={640} w={720} nat={[712, 360]} t={now - tout} push={1 + 0.02 * eio(now - tout, 4)}>
        <Ring t={now - tr} x={0} y={0} w={720} h={364} c={now >= tn ? DIM : AMBER} />
        {now >= tl ? <div style={{ position: "absolute", left: 41, top: 229, width: 644, height: 13, borderRadius: 7, overflow: "hidden", background: "#e5e5ea" }}><div style={{ width: `${71 + 29 * fill}%`, height: "100%", background: fill >= 1 ? RED : "#4f46e5" }} /></div> : null}
        {now >= tl ? <Tag t={now - tl - 0.4} x={380} y={-30} text="Free limit reached" c={RED} /> : null}
      </Shot>
      <Shot src="crops/brevo.png" x={180} y={1040} w={720} nat={[712, 360]} t={now - tout - 0.25}>
        {now >= tn ? <Ring t={now - tn} x={0} y={0} w={720} h={364} /> : now >= tb ? <Ring t={now - tb} x={0} y={0} w={720} h={364} c={DIM} /> : null}
        {now >= tn ? <Tag t={now - tn - 0.2} x={470} y={-30} text="Sending now" /> : null}
      </Shot>
    </>
  );
};

// 6. Search, filters, snooze (the real command palette); then the real "Undo" toast after Send
const b6: B = (now, T) => {
  const t0 = T("b6"), tu = T("undo");
  return (
    <>
      <Head t={now - t0} text={now < tu ? <>Search, filters, <span style={{ color: AMBER }}>snooze.</span></> : <>Even <span style={{ color: AMBER }}>undo send.</span></>} size={84} />
      {now < tu ? (
        <Shot src="crops/palette.png" x={150} y={480} w={780} nat={[1260, 1220]} t={now - t0} push={1 + 0.04 * eio(now - t0, 3)} />
      ) : (
        <>
          <Shot src="crops/compose.png" x={150} y={480} w={780} nat={[1180, 1220]} t={now - tu + 0.3} />
          <Rise t={now - tu} d={0.4} style={{ left: 190, top: 1080, transform: "scale(1.9)", transformOrigin: "0 0" }}>
            <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: `0 0 0 3px ${AMBER}, 0 20px 50px rgba(0,0,0,0.6)` }}><Img src={RAW("crops/undo.png")} style={{ width: 405, display: "block" }} /></div>
          </Rise>
        </>
      )}
    </>
  );
};

// 7. Comment INBOX; follow so the message reaches you
const b7: B = (now, T) => {
  const t0 = T("b7"), tf = T("follow");
  return (
    <>
      <Rise t={now - t0} style={{ left: 240, right: 240, top: 380 }}><Img src={RAW("openinbox-logo.png")} style={{ width: 560, display: "block", margin: "0 auto" }} /></Rise>
      <Note t={now - t0 - 0.1} style={{ left: 0, right: 0, top: 600, textAlign: "center" }}>Comment</Note>
      <Rise t={now - t0 - 0.2} style={{ left: 0, right: 0, top: 650, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 210, letterSpacing: -8, color: AMBER }}>INBOX</Rise>
      <Note t={now - t0 - 0.5} style={{ left: 0, right: 0, top: 920, textAlign: "center" }} c={INK} s={46}>and I'll send you the setup guide.</Note>
      {now >= tf ? <Rise t={now - tf} style={{ left: 0, right: 0, top: 1060, display: "flex", justifyContent: "center" }}>
        <div style={{ padding: "18px 56px", borderRadius: 14, background: "#4f8cff", fontFamily: SANS, fontWeight: 700, fontSize: 44, color: "#fff" }}>Follow</div>
      </Rise> : null}
    </>
  );
};

const BEATS: { key: string; draw: B }[] = [
  { key: "b1", draw: b1 }, { key: "b2", draw: b2 }, { key: "b3", draw: b3 }, { key: "b4", draw: b4 },
  { key: "b5", draw: b5 }, { key: "b6", draw: b6 }, { key: "b7", draw: b7 },
];
const XF = 0.35;

export const InboxView: View = {
  View: ({ t0, at, p, words }) => {
    const frame = useCurrentFrame();
    const now = t0 + frame / FPS;
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => (k === "b1" ? t0 : parts[k] ? at(parts[k]) - 0.08 : 999);
    const starts = BEATS.map((b) => T(b.key));
    let cur = 0;
    starts.forEach((s, i) => { if (now >= s) cur = i; });
    const fadeOut = cur > 0 ? 1 - eio(now - starts[cur], XF) : 0;
    const end = words && words.length ? words[words.length - 1].end : 47;
    const progress = c01((now - t0) / Math.max(1, end - t0));
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, background: BG, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 75% 50% at 50% 45%, rgba(255,255,255,0.11), transparent 72%)" }} />
        <div style={{ position: "absolute", inset: 0, transform: "translateY(70px)" }}>{BEATS[cur].draw(now, T)}</div>
        {fadeOut > 0 ? <div style={{ position: "absolute", inset: 0, background: BG, opacity: fadeOut }}><div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 75% 50% at 50% 45%, rgba(255,255,255,0.11), transparent 72%)" }} /><div style={{ position: "absolute", inset: 0, transform: "translateY(70px)" }}>{BEATS[cur - 1].draw(now, T)}</div></div> : null}
        <div style={{ position: "absolute", left: 70, right: 70, top: 120, height: 3, borderRadius: 2, background: LINE }}><div style={{ width: `${progress * 100}%`, height: 3, borderRadius: 2, background: AMBER }} /></div>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 62%, rgba(0,0,0,0.38))", pointerEvents: "none" }} />
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: 0.05, mixBlendMode: "overlay", pointerEvents: "none" }}>
          <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={2} seed={frame % 12} /></filter>
          <rect width={1080} height={1920} filter="url(#grain)" />
        </svg>
        {words ? <Captions words={words} now={now} ink={INK} accent={AMBER} /> : null}
      </div>
    );
  },
  hits: ({ at, p }) => {
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => at(parts[k]);
    const s = 0.55;
    return [
      { t: T("zero"), sound: "cash", gain: 0.2 * s },
      { t: T("b2"), sound: "whoosh", gain: 0.14 * s }, { t: T("cf"), sound: "pop", gain: 0.12 * s },
      { t: T("b3") + 0.35, sound: "click", gain: 0.2 * s }, { t: T("token"), sound: "keypress", gain: 0.14 * s }, { t: T("records"), sound: "ding", gain: 0.14 * s },
      { t: T("b4"), sound: "whoosh", gain: 0.14 * s }, { t: T("sup"), sound: "pop", gain: 0.1 * s }, { t: T("sales"), sound: "pop", gain: 0.1 * s }, { t: T("team"), sound: "pop", gain: 0.1 * s },
      { t: T("b5"), sound: "whoosh", gain: 0.14 * s }, { t: T("limit"), sound: "error", gain: 0.12 * s }, { t: T("next"), sound: "tick", gain: 0.16 * s },
      { t: T("b6"), sound: "whoosh", gain: 0.14 * s }, { t: T("undo"), sound: "click", gain: 0.18 * s },
      { t: T("b7"), sound: "whoosh", gain: 0.14 * s },
    ];
  },
};
