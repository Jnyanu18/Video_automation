import React from "react";
import { useCurrentFrame, staticFile } from "remotion";
import { F, FPS } from "../../kit/theme";
import type { View } from "./faceless";
import { SERIF, c01, sp, ease, In, Card, Check, typed, Captions } from "./keynote";

/** Ghost vs Substack's cut (ghost-vs-substack, 2026-11-07). The 34-three-agents system: our white keynote base, a colour
 *  world per chapter (Substack orange, Ghost dark), chapter tabs, serif headlines with one italic word. Logos are Simple
 *  Icons 15.12.0, unchanged, tinted with each brand's colour. The 10,000 example is arithmetic on Substack's 10%; the
 *  publication and its members on screen are ILLUSTRATIVE. Structure from DdWc2kUByhe (a voiced tool card). */

type World = { bg: string; ink: string; dim: string; line: string; card: string; accent: string };
const W: Record<string, World> = {
  white: { bg: "#f4f2ee", ink: "#16161a", dim: "#8a8780", line: "#e4e1da", card: "#ffffff", accent: "#2f5ff0" },
  orange: { bg: "#ff6719", ink: "#ffffff", dim: "#ffd3bb", line: "#ff7f3d", card: "#ff7f3d", accent: "#2b1203" },
  ghost: { bg: "#15171a", ink: "#ffffff", dim: "#8c9196", line: "#2a2e33", card: "#1f2226", accent: "#ff1a75" },
  green: { bg: "#d9f2e2", ink: "#0f2a1b", dim: "#4f7a60", line: "#b6e2c6", card: "#ffffff", accent: "#1a9c55" },
};
let TH: World = W.white;
const ORANGE = "#ff6719", PINK = "#ff1a75", GREEN = "#1a9c55", RED = "#e5484d";
const logo = (f: string) => staticFile(`ghost-vs-substack/raw/logos/${f}`);
const Mark: React.FC<{ f: string; s: number; color: string }> = ({ f, s, color }) => (
  <div style={{ width: s, height: s, background: color, WebkitMaskImage: `url(${logo(f)})`, maskImage: `url(${logo(f)})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center", flexShrink: 0 }} />
);
const Mono: React.FC<{ s: number; c?: string; children: React.ReactNode; w?: number }> = ({ s, c, children, w = 600 }) => <span style={{ fontFamily: F.mono, fontSize: s, letterSpacing: 2, color: c || TH.dim, fontWeight: w }}>{children}</span>;
const Head: React.FC<{ t: number; a: string; i?: string; b?: string; top?: number; size?: number }> = ({ t, a, i, b, top = 200, size = 96 }) => (
  <In t={t} dy={26} style={{ left: 50, right: 50, top, textAlign: "center", fontFamily: SERIF, fontSize: size, color: TH.ink, lineHeight: 1.05 }}>
    {a}{i ? <span style={{ fontStyle: "italic" }}> {i}</span> : null}{b ? ` ${b}` : null}
  </In>
);
/** a pie of one month's subscription money; `cut` of it (0..1) slides out as a wedge */
const Pie: React.FC<{ cx: number; cy: number; r: number; cut: number; out: number; color: string; cutColor: string }> = ({ cx, cy, r, cut, out, color, cutColor }) => {
  const a = cut * Math.PI * 2;
  const p = (ang: number, rr = r, dx = 0, dy = 0) => `${(cx + dx + rr * Math.sin(ang)).toFixed(1)} ${(cy + dy - rr * Math.cos(ang)).toFixed(1)}`;
  const mid = a / 2, dx = Math.sin(mid) * out, dy = -Math.cos(mid) * out;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
      <path d={`M ${cx} ${cy} L ${p(a)} A ${r} ${r} 0 ${cut > 0.5 ? 0 : 1} 1 ${p(Math.PI * 2 - 0.0001)} Z`} fill={color} />
      {cut > 0 ? <path d={`M ${cx + dx} ${cy + dy} L ${p(0, r, dx, dy)} A ${r} ${r} 0 ${cut > 0.5 ? 1 : 0} 1 ${p(a, r, dx, dy)} Z`} fill={cutColor} /> : null}
    </svg>
  );
};
type B = (now: number, T: (k: string) => number) => React.ReactNode;

// 1. Substack takes 10% (an orange card, the pie loses a slice); Ghost takes zero (a dark card slams in beside it)
const b1: B = (now, T) => {
  const t0 = T("b1"), tt = T("ten"), tg = T("ghost"), tz = T("zero");
  const slice = ease(now - tt, 0.5);
  const gk = sp(now - tg, 190);
  return (
    <>
      <Card x={60} y={260} w={460} h={900} t={now - t0} fill={ORANGE} r={36}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 50, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <Mark f="substack.svg" s={90} color="#ffffff" />
          <span style={{ fontFamily: SERIF, fontSize: 58, color: "#fff" }}>Substack</span>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center", fontFamily: F.body, fontWeight: 900, fontSize: 130, color: "#fff", opacity: c01((now - tt) / 0.12) }}>10%</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 850, textAlign: "center" }}><Mono s={22} c="#ffe1d0">OF EVERY PAID SUB</Mono></div>
      </Card>
      <Pie cx={290} cy={720} r={150} cut={0.1 * c01((now - tt + 0.1) / 0.2)} out={70 * slice} color="#ffffff" cutColor="#2b1203" />
      {now >= tg - 0.1 ? (
        <div style={{ position: "absolute", left: 560, top: 260, transform: `translateY(${(1 - gk) * -500}px) rotate(${(1 - gk) * 8}deg)` }}>
          <div style={{ width: 460, height: 900, borderRadius: 36, background: "#15171a", boxShadow: "0 30px 60px rgba(0,0,0,0.3)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 50, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <Mark f="ghost_ring.png" s={90} color="#ffffff" />
              <span style={{ fontFamily: SERIF, fontSize: 58, color: "#fff" }}>Ghost</span>
            </div>
            <svg width={460} height={460} style={{ position: "absolute", left: 0, top: 240 }}><circle cx={230} cy={220} r={150} fill="#ffffff" /></svg>
            <div style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center", fontFamily: F.body, fontWeight: 900, fontSize: 130, color: PINK, opacity: c01((now - tz) / 0.1), transform: `scale(${now >= tz ? 1.6 - 0.6 * sp(now - tz, 220) : 1})` }}>0%</div>
            <div style={{ position: "absolute", left: 0, right: 0, top: 850, textAlign: "center" }}><Mono s={22} c="#8c9196">ALL OF IT IS YOURS</Mono></div>
          </div>
        </div>
      ) : null}
    </>
  );
};

// 2. Ghost: the same job for free; open source and its stars; host it yourself; blog, newsletter, members; 0% to Ghost
const b2: B = (now, T) => {
  const t0 = T("b2"), ts = T("stars"), th = T("host"), tb = T("blog"), tn = T("newsletters"), tm = T("memberships"), tc = T("cent");
  const stars = Math.round(55700 * ease(now - t0 - 0.3, Math.max(1, ts - t0 + 0.3)));
  const feats: [string, string, number][] = [["Fast blog", "yourname.com", tb], ["Email newsletters", "sent to 4,812 readers", tn], ["Paid memberships", "$8 a month", tm]];
  return (
    <>
      <In t={now - t0} style={{ left: 0, right: 0, top: 190, display: "flex", justifyContent: "center", alignItems: "center", gap: 24 }}>
        <Mark f="ghost_ring.png" s={88} color="#ffffff" />
        <span style={{ fontFamily: SERIF, fontSize: 100, color: TH.ink }}>Ghost</span>
      </In>
      <In t={now - t0 - 0.2} style={{ left: 0, right: 0, top: 330, display: "flex", justifyContent: "center", gap: 22, alignItems: "center" }}>
        <Mark f="github.svg" s={40} color={TH.dim} />
        <svg width={40} height={40} viewBox="0 0 24 24"><path fill="#e3b341" d="M12 2l3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.6 5.6 21.2l1.6-7.1L1.8 9.3 9 8.6z" /></svg>
        <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 52, color: TH.ink }}>{stars.toLocaleString("en-US")}</span>
        <Mono s={22}>STARS · MIT · OPEN SOURCE</Mono>
      </In>
      {now >= th - 0.1 ? (
        <In t={now - th} style={{ left: 0, right: 0, top: 450, display: "flex", justifyContent: "center" }}>
          <div style={{ padding: "12px 28px", borderRadius: 999, border: `2px solid ${TH.dim}`, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#30d158" }} /><Mono s={22} c={TH.ink}>RUNNING ON YOUR OWN SERVER</Mono>
          </div>
        </In>
      ) : null}
      {now < tb - 0.15 ? (
        <Card x={190} y={560} w={700} h={600} t={now - t0 - 0.35} fill={TH.card} r={34} style={{ border: `2px solid ${TH.line}` }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 50, textAlign: "center" }}><Mono s={24}>GHOST ITSELF COSTS</Mono></div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 100, textAlign: "center", fontFamily: F.body, fontWeight: 900, fontSize: 210, color: PINK, letterSpacing: -6 }}>$0</div>
          {now >= th - 0.1 ? (
            <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center", gap: 26, opacity: c01((now - th) / 0.15) }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 150, height: 150, borderRadius: 18, border: `4px solid ${TH.ink}`, padding: 16, transform: `translateY(${(1 - sp(now - th - i * 0.1, 200)) * 40}px)` }}>
                  {[0, 1, 2].map((r) => <div key={r} style={{ height: 22, marginBottom: 14, borderRadius: 6, background: TH.line, display: "flex", alignItems: "center", paddingLeft: 10 }}><div style={{ width: 10, height: 10, borderRadius: 5, background: r === 0 ? "#30d158" : TH.dim }} /></div>)}
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}
      {feats.map(([a, b, t], i) => (now >= t - 0.15 ? (
        <Card key={i} x={110} y={580 + i * 220} w={860} h={180} t={now - t + 0.15} fill={TH.card} r={26} style={{ border: `2px solid ${TH.line}` }}>
          <div style={{ position: "absolute", left: 36, top: 36, fontFamily: SERIF, fontSize: 54, color: TH.ink }}>{a}</div>
          <div style={{ position: "absolute", left: 36, top: 112 }}><Mono s={22}>{b}</Mono></div>
          <div style={{ position: "absolute", right: 36, top: 60 }}><Check t={now - t - 0.1} color={PINK} size={58} /></div>
        </Card>
      ) : null))}
      {now >= tc - 0.1 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1260, display: "flex", justifyContent: "center" }}>
          <div style={{ fontFamily: F.mono, fontWeight: 800, fontSize: 58, letterSpacing: 4, color: PINK, border: `6px solid ${PINK}`, borderRadius: 16, padding: "6px 26px", transform: `rotate(-6deg) scale(${2 - sp(now - tc, 200)})`, opacity: c01((now - tc) / 0.08) }}>0% TO GHOST</div>
        </div>
      ) : null}
    </>
  );
};

// 3. Making 10,000 a month: Substack's 1,000 slice comes back to you, month after month
const b3: B = (now, T) => {
  const t0 = T("b3"), tb = T("back"), te = T("every");
  const back = ease(now - tb, 0.6);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const lit = now >= te ? Math.min(12, Math.floor((now - te) * 9) + 1) : 0;
  return (
    <>
      <Head t={now - t0} a="Making" i="$10,000" b="a month?" top={190} size={92} />
      <Card x={110} y={420} w={860} h={420} t={now - t0 - 0.15} fill={TH.card} r={30}>
        <div style={{ position: "absolute", left: 36, top: 30 }}><Mono s={20}>ONE MONTH OF PAID SUBSCRIPTIONS · EXAMPLE</Mono></div>
        <div style={{ position: "absolute", left: 36, right: 36, top: 100, height: 110, borderRadius: 18, background: TH.line, overflow: "hidden", display: "flex" }}>
          <div style={{ width: "90%", background: GREEN, display: "flex", alignItems: "center", paddingLeft: 24 }}><span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 40, color: "#fff" }}>$9,000</span></div>
          <div style={{ width: "10%", background: back > 0 ? GREEN : ORANGE, transform: `translateY(${-back * 0}px)` }} />
        </div>
        <div style={{ position: "absolute", left: 36, right: 36, top: 240, display: "flex", alignItems: "center" }}>
          <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 36, color: TH.ink }}>On Substack, it keeps</span>
          <span style={{ marginLeft: "auto", fontFamily: F.mono, fontWeight: 800, fontSize: 44, color: back > 0.5 ? TH.dim : ORANGE, textDecoration: back > 0.5 ? "line-through" : "none" }}>$1,000</span>
        </div>
        <div style={{ position: "absolute", left: 36, right: 36, top: 320, display: "flex", alignItems: "center", opacity: c01((now - tb) / 0.15) }}>
          <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 36, color: GREEN }}>On Ghost, you keep it</span>
          <span style={{ marginLeft: "auto", fontFamily: F.mono, fontWeight: 800, fontSize: 44, color: GREEN }}>+$1,000</span>
        </div>
      </Card>
      {now >= tb - 0.1 ? Array.from({ length: 6 }).map((_, i) => {
        const k = ease(now - tb - i * 0.08, 0.6);
        return <div key={i} style={{ position: "absolute", left: 820 - k * (300 + i * 30), top: 560 + k * (420 + (i % 3) * 30), width: 70, height: 70, borderRadius: 35, background: "#f3b01c", border: "5px solid #c98c00", opacity: c01(k * 3) * (1 - c01((k - 0.85) * 6)), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.body, fontWeight: 900, fontSize: 34, color: "#7a5200" }}>$</div>;
      }) : null}
      {now >= tb - 0.1 ? (
        <In t={now - tb - 0.3} style={{ left: 330, top: 930 }}>
          <div style={{ width: 420, height: 230, borderRadius: 30, background: "#7a4b1f", position: "relative", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ position: "absolute", right: -10, top: 70, width: 150, height: 90, borderRadius: 20, background: "#8f5a28", border: "4px solid #5c3712" }} />
            <div style={{ position: "absolute", left: 30, top: 80, fontFamily: F.body, fontWeight: 800, fontSize: 48, color: "#ffe9c7" }}>+$1,000</div>
            <div style={{ position: "absolute", left: 30, top: 150 }}><Mono s={20} c="#ffe9c7">YOUR POCKET</Mono></div>
          </div>
        </In>
      ) : null}
      {now >= te - 0.1 ? (
        <div style={{ position: "absolute", left: 90, right: 90, top: 1240, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {months.map((m, i) => <div key={m} style={{ width: 130, padding: "12px 0", borderRadius: 14, textAlign: "center", background: i < lit ? GREEN : TH.card, transform: `scale(${i < lit ? 0.9 + 0.1 * sp(now - te - i / 9, 240) : 1})` }}><Mono s={20} c={i < lit ? "#fff" : TH.dim}>{m} +1K</Mono></div>)}
        </div>
      ) : null}
    </>
  );
};

// 4. Comment GHOST; the setup guide card
const b4: B = (now, T) => {
  const t0 = T("b4"), tl = T("link");
  return (
    <>
      <In t={now - t0} style={{ left: 0, right: 0, top: 300, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: TH.card, borderRadius: 999, padding: "18px 40px 18px 18px", boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: TH.line }} />
          <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 48, color: TH.dim }}>Comment</span>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 56, color: TH.ink, letterSpacing: 3, minWidth: 210 }}>{typed("GHOST", now - t0 - 0.35, 12)}</span>
        </div>
      </In>
      {now >= tl - 0.5 ? (
        <Card x={150} y={520} w={780} h={700} t={now - tl + 0.5} fill={TH.card} r={34}>
          <div style={{ position: "absolute", left: 44, top: 40, display: "flex", alignItems: "center", gap: 14 }}><Mark f="ghost_ring.png" s={34} color={TH.ink} /><Mono s={22}>SETUP GUIDE · GHOST</Mono></div>
          <div style={{ position: "absolute", left: 44, top: 100, fontFamily: SERIF, fontSize: 58, color: TH.ink }}>Leave Substack, <span style={{ fontStyle: "italic" }}>keep</span> your list</div>
          {["Get Ghost running", "Bring your subscribers over", "Turn on paid memberships"].map((r, i) => (
            <div key={i} style={{ position: "absolute", left: 44, right: 44, top: 290 + i * 110, height: 90, borderTop: `2px solid ${TH.line}`, display: "flex", alignItems: "center", gap: 18, opacity: c01((now - tl + 0.3 - i * 0.1) / 0.15) }}>
              <Check t={now - tl + 0.2 - i * 0.1} color={PINK} size={40} />
              <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 38, color: TH.ink }}>{r}</span>
            </div>
          ))}
        </Card>
      ) : null}
    </>
  );
};

const BEATS: { key: string; draw: B; world: string; tab: number }[] = [
  { key: "b1", draw: b1, world: "white", tab: -1 }, { key: "b2", draw: b2, world: "ghost", tab: 0 },
  { key: "b3", draw: b3, world: "green", tab: 1 }, { key: "b4", draw: b4, world: "white", tab: -1 },
];
const TABS = ["01 GHOST", "02 YOUR MONEY"];

export const GhostSubstack: View = {
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
    const accent = TH === W.ghost ? PINK : TH === W.green ? GREEN : ORANGE;
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, background: prev.bg, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: TH.bg, clipPath: `circle(${flood * 130}% at 50% 45%)` }} />
        {tab >= 0 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 90, display: "flex", justifyContent: "center", gap: 10 }}>
            {TABS.map((l, i) => <div key={i} style={{ fontFamily: F.mono, fontSize: 18, letterSpacing: 2, padding: "8px 14px", borderRadius: 999, background: i === tab ? TH.ink : "transparent", color: i === tab ? TH.bg : TH.dim, border: `2px solid ${i === tab ? TH.ink : TH.dim}` }}>{l}</div>)}
          </div>
        ) : null}
        <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "50% 45%" }}>{BEATS[cur].draw(now, T)}</div>
        {words ? <Captions words={words} now={now} ink={TH.ink} accent={accent} /> : null}
      </div>
    );
  },
  hits: ({ at, p }) => {
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => at(parts[k]);
    const soft = 0.62;
    return [
      { t: T("ten") + 0.1, sound: "click", gain: 0.22 * soft }, { t: T("ghost"), sound: "whoosh", gain: 0.28 }, { t: T("zero"), sound: "subdrop", gain: 0.35 },
      { t: T("b2"), sound: "swish", gain: 0.2 * soft }, { t: T("cent"), sound: "pop", gain: 0.18 * soft },
      { t: T("b3"), sound: "swish", gain: 0.2 * soft }, { t: T("back"), sound: "cash", gain: 0.2 * soft },
      { t: T("b4") + 0.35, sound: "typing", gain: 0.15 * soft },
    ];
  },
};
