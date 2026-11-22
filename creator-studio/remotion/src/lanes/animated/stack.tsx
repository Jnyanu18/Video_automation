import React from "react";
import { useCurrentFrame, Img, staticFile } from "remotion";
import { F, FPS } from "../../kit/theme";
import type { View } from "./faceless";
import { SERIF, W0, c01, sp, ease, In, Card, Check, typed, Captions } from "./keynote";

/** Your startup on $0, part 2 (saas-for-zero-2, 2026-11-07). The 34-three-agents standard: our white keynote base, a colour
 *  world per tool flooding from the centre, chapter tabs, serif headlines with one italic word, real logos used as they are
 *  (Simple Icons, and the companies' own sites for Convex, Neon and UptimeRobot), our own take on each tool's interface,
 *  and one made-up product (Ledgerly, an invoicing app, ILLUSTRATIVE) that gains a piece every chapter. A bill strip
 *  keeps a line per tool at $0.00. Structure from DeHYCIpColc, never its look or its mascot. */

const logo = (f: string) => staticFile(`saas-for-zero-2/raw/logos/${f}`);
/** a monochrome Simple Icons mark, tinted with the brand colour */
const Mono: React.FC<{ f: string; s: number; color: string }> = ({ f, s, color }) => (
  <div style={{ width: s, height: s, background: color, WebkitMaskImage: `url(${logo(f)})`, maskImage: `url(${logo(f)})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center", flexShrink: 0 }} />
);
const Pic: React.FC<{ f: string; s: number; r?: number }> = ({ f, s, r = 0 }) => <Img src={logo(f)} style={{ width: s, height: s, objectFit: "contain", borderRadius: r, flexShrink: 0 }} />;

type Tool = { name: string; job: string; tab: string; mark: (s: number) => React.ReactNode; w: { bg: string; ink: string; dim: string; accent: string; card: string } };
const TOOLS: Tool[] = [
  { name: "Convex", job: "BACKEND + DATABASE", tab: "01 BACKEND", mark: (s) => <Pic f="convex_mark.svg" s={s} />,
    w: { bg: "#1d1220", ink: "#ffffff", dim: "#b9a6bd", accent: "#f3b01c", card: "#2b1b30" } },
  { name: "Better Auth", job: "LOGINS", tab: "02 LOGIN", mark: (s) => <Mono f="betterauth.svg" s={s} color="#ffffff" />,
    w: { bg: "#0c0c0e", ink: "#ffffff", dim: "#8e8e96", accent: "#ffffff", card: "#1b1b1f" } },
  { name: "Stripe", job: "PAYMENTS", tab: "03 PAYMENTS", mark: (s) => <Mono f="stripe.svg" s={s} color="#ffffff" />,
    w: { bg: "#635bff", ink: "#ffffff", dim: "#d6d3ff", accent: "#ffffff", card: "#7a73ff" } },
  { name: "Sentry", job: "ERRORS", tab: "04 ERRORS", mark: (s) => <Mono f="sentry.svg" s={s} color="#ffffff" />,
    w: { bg: "#362d59", ink: "#ffffff", dim: "#b8afd6", accent: "#ff5c6a", card: "#463b70" } },
  { name: "UptimeRobot", job: "UPTIME", tab: "05 UPTIME", mark: (s) => <Pic f="uptimerobot.png" s={s} r={s * 0.22} />,
    w: { bg: "#0f241a", ink: "#ffffff", dim: "#9cc2ad", accent: "#3bd671", card: "#18352a" } },
];
const PART1: { f: string; color?: string; img?: boolean }[] = [
  { f: "github.svg", color: "#181717" }, { f: "cloudflarepages.svg", color: "#f38020" }, { f: "neon.svg", img: true },
  { f: "resend.svg", color: "#000000" }, { f: "cloudflare.svg", color: "#f38020" }, { f: "posthog.svg", color: "#1d4aff" }, { f: "zoho.svg", color: "#e42527" },
];
const LOGO2 = (i: number, s: number) => i === 0 ? <Pic f="convex_mark.svg" s={s} /> : i === 4 ? <Pic f="uptimerobot.png" s={s} r={s * 0.22} />
  : <Mono f={["", "betterauth.svg", "stripe.svg", "sentry.svg"][i]} s={s} color={["", "#000000", "#635bff", "#362d59"][i]} />;

type B = (now: number, T: (k: string) => number) => React.ReactNode;
const Mono2: React.FC<{ s: number; c: string; children: React.ReactNode; w?: number }> = ({ s, c, children, w = 600 }) => <span style={{ fontFamily: F.mono, fontSize: s, letterSpacing: 2, color: c, fontWeight: w }}>{children}</span>;
const ToolHead: React.FC<{ t: number; i: number }> = ({ t, i }) => {
  const tl = TOOLS[i];
  return (
    <>
      <In t={t} dy={30} style={{ left: 0, right: 0, top: 200, display: "flex", justifyContent: "center", alignItems: "center", gap: 28 }}>
        {tl.mark(96)}
        <span style={{ fontFamily: SERIF, fontSize: 104, color: tl.w.ink, letterSpacing: -1 }}>{tl.name}</span>
      </In>
      <In t={t - 0.15} dy={14} style={{ left: 0, right: 0, top: 340, textAlign: "center" }}><Mono2 s={26} c={tl.w.dim}>{tl.job}</Mono2></In>
    </>
  );
};
const Free: React.FC<{ t: number; top: number; text: string; accent: string; ink: string }> = ({ t, top, text, accent, ink }) => (
  <In t={t} dy={30} style={{ left: 0, right: 0, top, display: "flex", justifyContent: "center" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "18px 34px", borderRadius: 999, border: `3px solid ${accent}` }}>
      <span style={{ fontFamily: SERIF, fontSize: 54, color: ink }}>{text}</span>
      <span style={{ fontFamily: F.mono, fontWeight: 800, fontSize: 30, letterSpacing: 3, color: accent, transform: `rotate(-6deg) scale(${sp(t - 0.2, 220)})`, display: "inline-block" }}>FREE</span>
    </div>
  </In>
);

// 1. Part one's reel and its views count up; "part two"; the bill; Ledgerly with five empty slots
const SLOTS = ["Backend", "Login", "Payments", "Errors", "Uptime"];
const b1: B = (now, T) => {
  const t0 = T("b1"), tv = T("views"), t2 = T("two"), tz = T("zero"), tr = T("real");
  const views = Math.round(11000 * Easing3(c01((now - t0 - 0.2) / Math.max(0.6, tv - t0 + 0.4))));
  const small = ease(now - t2, 0.45);
  return (
    <>
      <div style={{ position: "absolute", left: 540 - 230 - small * 200, top: 330 - small * 170, width: 460, transform: `scale(${1 - small * 0.42})`, transformOrigin: "0 0" }}>
        <Card x={0} y={0} w={460} h={720} t={now - t0} fill="#ffffff" r={36}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #fbf8f1 0%, #efe9dc 100%)" }} />
          <div style={{ position: "absolute", left: 30, top: 30 }}><Mono2 s={22} c={W0.dim}>PART 1 · REEL</Mono2></div>
          <div style={{ position: "absolute", left: 30, right: 30, top: 120, fontFamily: SERIF, fontSize: 64, lineHeight: 1.05, color: W0.ink }}>Launch a real SaaS for <span style={{ fontStyle: "italic" }}>$0</span></div>
          <div style={{ position: "absolute", left: 30, right: 30, top: 380, display: "flex", flexWrap: "wrap", gap: 16 }}>
            {PART1.map((p, i) => <div key={i} style={{ width: 70, height: 70, borderRadius: 18, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 14px rgba(0,0,0,0.08)", transform: `scale(${sp(now - t0 - 0.2 - i * 0.05, 220)})` }}>{p.img ? <Pic f={p.f} s={44} /> : <Mono f={p.f} s={42} color={p.color!} />}</div>)}
          </div>
          <div style={{ position: "absolute", left: 30, bottom: 34, display: "flex", alignItems: "center", gap: 14 }}>
            <svg width={40} height={40} viewBox="0 0 24 24"><path d="M8 5 L19 12 L8 19 Z" fill={W0.ink} /></svg>
            <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 52, color: W0.ink }}>{views >= 11000 ? "11K+" : views.toLocaleString("en-US")}</span>
            <Mono2 s={22} c={W0.dim}>VIEWS</Mono2>
          </div>
        </Card>
      </div>
      {now >= t2 - 0.1 ? <div style={{ position: "absolute", left: 470, top: 170 }}><In t={now - t2} dy={30} style={{ left: 0, top: 0, fontFamily: SERIF, fontSize: 130, color: W0.ink, whiteSpace: "nowrap" }}>Part <span style={{ fontStyle: "italic" }}>two.</span></In></div> : null}
      {now >= tz - 0.1 ? (
        <Card x={470} y={360} w={520} h={170} t={now - tz} fill="#ffffff" r={28}>
          <div style={{ position: "absolute", left: 30, top: 26 }}><Mono2 s={22} c={W0.dim}>MONTHLY BILL</Mono2></div>
          <div style={{ position: "absolute", left: 30, top: 66, fontFamily: F.mono, fontWeight: 700, fontSize: 72, color: "#1a9c55" }}>$0.00</div>
        </Card>
      ) : null}
      {now >= tr - 0.15 ? (
        <Card x={90} y={640} w={900} h={760} t={now - tr} fill="#ffffff" r={34}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 64, background: "#f3f1ec", display: "flex", alignItems: "center", gap: 10, paddingLeft: 26 }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}
            <span style={{ marginLeft: 20 }}><Mono2 s={22} c={W0.dim} w={500}>ledgerly.app</Mono2></span>
          </div>
          <div style={{ position: "absolute", left: 40, top: 100, fontFamily: SERIF, fontSize: 56, color: W0.ink }}>Ledgerly</div>
          <div style={{ position: "absolute", right: 40, top: 116 }}><Mono2 s={18} c={W0.dim}>ILLUSTRATIVE</Mono2></div>
          {SLOTS.map((s, i) => (
            <div key={i} style={{ position: "absolute", left: 40, right: 40, top: 200 + i * 104, height: 84, borderRadius: 18, border: "3px dashed #bdb7aa", display: "flex", alignItems: "center", paddingLeft: 28, opacity: c01((now - tr - 0.05 - i * 0.06) / 0.12) }}>
              <Mono2 s={30} c={W0.ink}>{s.toUpperCase()}</Mono2>
              <span style={{ marginLeft: "auto", marginRight: 28 }}><Mono2 s={24} c={W0.dim}>EMPTY</Mono2></span>
            </div>
          ))}
        </Card>
      ) : null}
    </>
  );
};
function Easing3(x: number) { return 1 - Math.pow(1 - x, 3); }

// 2. Convex: the invoices table and the app screen; a row turns paid in both at once ("updates by itself")
const b2: B = (now, T) => {
  const t0 = T("b2"), tl = T("logic"), tu = T("updates"), tm = T("million");
  const w = TOOLS[0].w;
  const paid = now >= tu + 0.25;
  const rows = [["INV-1041", "Acme Co", "$1,200"], ["INV-1042", "Northwind", "$860"], ["INV-1043", "Bluebird", "$2,450"]];
  return (
    <>
      <ToolHead t={now - t0} i={0} />
      <Card x={70} y={440} w={940} h={420} t={now - tl} fill={w.card} r={28}>
        <div style={{ position: "absolute", left: 32, top: 26 }}><Mono2 s={22} c={w.dim}>DATA · invoices</Mono2></div>
        <div style={{ position: "absolute", right: 32, top: 24, display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 14, height: 14, borderRadius: 7, background: w.accent, opacity: 0.5 + 0.5 * Math.sin(now * 8) }} /><Mono2 s={20} c={w.accent}>LIVE</Mono2></div>
        {rows.map((r, i) => {
          const hit = i === 1 && paid;
          return (
            <div key={i} style={{ position: "absolute", left: 32, right: 32, top: 90 + i * 104, height: 84, borderRadius: 16, background: hit ? "rgba(243,176,28,0.18)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 30, paddingLeft: 24, opacity: c01((now - tl - 0.2 - i * 0.08) / 0.15) }}>
              <Mono2 s={24} c={w.dim}>{r[0]}</Mono2>
              <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 32, color: w.ink, width: 220 }}>{r[1]}</span>
              <span style={{ fontFamily: F.mono, fontSize: 28, color: w.ink }}>{r[2]}</span>
              <span style={{ marginLeft: "auto", marginRight: 24 }}><Mono2 s={24} c={hit ? w.accent : w.dim}>{hit ? "paid" : "unpaid"}</Mono2></span>
            </div>
          );
        })}
      </Card>
      {now >= tu - 0.2 ? (
        <Card x={170} y={890} w={740} h={360} t={now - tu + 0.2} fill="#ffffff" r={28}>
          <div style={{ position: "absolute", left: 32, top: 26 }}><Mono2 s={20} c={W0.dim}>LEDGERLY · WHAT YOUR USER SEES</Mono2></div>
          <div style={{ position: "absolute", left: 32, top: 90, fontFamily: SERIF, fontSize: 48, color: W0.ink }}>Northwind</div>
          <div style={{ position: "absolute", left: 32, top: 160, fontFamily: F.mono, fontSize: 40, color: W0.ink }}>$860.00</div>
          <div style={{ position: "absolute", left: 32, top: 250, display: "flex", alignItems: "center", gap: 16 }}>
            {paid ? <Check t={now - tu - 0.25} color="#1a9c55" size={56} /> : <div style={{ width: 56, height: 56, borderRadius: 28, border: `4px solid ${W0.line}` }} />}
            <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 44, color: paid ? "#1a9c55" : W0.dim }}>{paid ? "Paid" : "Unpaid"}</span>
          </div>
          <div style={{ position: "absolute", right: 32, bottom: 26 }}><Mono2 s={18} c={W0.dim}>no refresh</Mono2></div>
        </Card>
      ) : null}
      {now >= tm - 0.1 ? <Free t={now - tm} top={1290} text="1,000,000 calls a month" accent={w.accent} ink={w.ink} /> : null}
    </>
  );
};

// 3. Better Auth: the sign-in card types an email, Google, a 2FA code; open source; the users table is yours
const b3: B = (now, T) => {
  const t0 = T("b3"), tg = T("google"), tf = T("factor"), to = T("open"), tu = T("users");
  const w = TOOLS[1].w;
  const code = "482916";
  return (
    <>
      <ToolHead t={now - t0} i={1} />
      {now < tu - 0.1 ? (
        <Card x={190} y={440} w={700} h={820} t={now - t0 - 0.2} fill="#ffffff" r={32}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 50, textAlign: "center", fontFamily: SERIF, fontSize: 56, color: W0.ink }}>Sign in to Ledgerly</div>
          <div style={{ position: "absolute", left: 50, right: 50, top: 160, height: 90, borderRadius: 18, border: `3px solid ${W0.line}`, display: "flex", alignItems: "center", paddingLeft: 26, fontFamily: F.body, fontSize: 34, color: W0.ink }}>{typed("maya@northwind.co", now - t0 - 0.4, 22) || <span style={{ color: W0.dim }}>Email</span>}</div>
          <div style={{ position: "absolute", left: 50, right: 50, top: 280, height: 90, borderRadius: 18, background: W0.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.body, fontWeight: 700, fontSize: 34, color: "#ffffff" }}>Continue</div>
          {now >= tg - 0.1 ? (
            <div style={{ position: "absolute", left: 50, right: 50, top: 400, height: 90, borderRadius: 18, border: `3px solid ${W0.line}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, transform: `scale(${0.9 + 0.1 * sp(now - tg, 220)})`, opacity: c01((now - tg) / 0.12) }}>
              <svg width={40} height={40} viewBox="0 0 48 48"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2.1 5-4.4 6.6v5.5h7.1C42.6 36.7 45 31.1 45 24.5z" /><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.5 46 24 46z" /><path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.7H4.5C3 17.1 2 20.4 2 24s1 6.9 2.5 9.9l7.3-5.7z" /><path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.5 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z" /></svg>
              <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 34, color: W0.ink }}>Continue with Google</span>
            </div>
          ) : null}
          {now >= tf - 0.1 ? (
            <div style={{ position: "absolute", left: 50, right: 50, top: 540, opacity: c01((now - tf) / 0.12) }}>
              <Mono2 s={22} c={W0.dim}>TWO-FACTOR CODE</Mono2>
              <div style={{ display: "flex", gap: 14, marginTop: 18 }}>
                {code.split("").map((d, i) => <div key={i} style={{ width: 86, height: 104, borderRadius: 16, border: `3px solid ${now - tf > 0.15 + i * 0.09 ? W0.ink : W0.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.mono, fontSize: 52, color: W0.ink }}>{now - tf > 0.15 + i * 0.09 ? d : ""}</div>)}
              </div>
            </div>
          ) : null}
        </Card>
      ) : (
        <Card x={110} y={460} w={860} h={560} t={now - tu} fill={w.card} r={28}>
          <div style={{ position: "absolute", left: 32, top: 26 }}><Mono2 s={22} c={w.dim}>YOUR DATABASE · users</Mono2></div>
          {[["maya@northwind.co", "google"], ["sam@bluebird.io", "email"], ["lee@acme.co", "email + 2FA"]].map((r, i) => (
            <div key={i} style={{ position: "absolute", left: 32, right: 32, top: 100 + i * 110, height: 90, borderRadius: 16, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", paddingLeft: 26, opacity: c01((now - tu - 0.1 - i * 0.1) / 0.15) }}>
              <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 32, color: w.ink }}>{r[0]}</span>
              <span style={{ marginLeft: "auto", marginRight: 26 }}><Mono2 s={22} c={w.dim}>{r[1]}</Mono2></span>
            </div>
          ))}
          <div style={{ position: "absolute", left: 32, bottom: 30, display: "flex", alignItems: "center", gap: 14 }}><Check t={now - tu - 0.5} size={44} /><span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 32, color: w.ink }}>Stays in your app</span></div>
        </Card>
      )}
      {now >= to - 0.1 ? <Free t={now - to} top={now < tu - 0.1 ? 1300 : 1100} text="Open source · MIT" accent={w.accent} ink={w.ink} /> : null}
    </>
  );
};

// 4. Stripe: a checkout; "no monthly fee, no setup fee" as zero lines; the fee only appears once a customer pays
const b4: B = (now, T) => {
  const t0 = T("b4"), tn = T("nofee"), ts = T("setup"), tp = T("pays");
  const w = TOOLS[2].w;
  const done = now >= tp + 0.35;
  const Line: React.FC<{ t: number; a: string; b: string; top: number }> = ({ t, a, b, top }) => (
    <div style={{ position: "absolute", left: 40, right: 40, top, display: "flex", alignItems: "center", opacity: c01(t / 0.12), transform: `translateX(${(1 - sp(t)) * 40}px)` }}>
      <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 36, color: W0.ink }}>{a}</span>
      <span style={{ marginLeft: "auto", fontFamily: F.mono, fontWeight: 700, fontSize: 38, color: "#1a9c55" }}>{b}</span>
    </div>
  );
  return (
    <>
      <ToolHead t={now - t0} i={2} />
      <Card x={140} y={440} w={800} h={430} t={now - t0 - 0.2} fill="#ffffff" r={32}>
        <div style={{ position: "absolute", left: 40, top: 34 }}><Mono2 s={20} c={W0.dim}>CHECKOUT · ILLUSTRATIVE</Mono2></div>
        <div style={{ position: "absolute", left: 40, top: 90, fontFamily: SERIF, fontSize: 54, color: W0.ink }}>Ledgerly Pro</div>
        <div style={{ position: "absolute", left: 40, top: 165, fontFamily: F.mono, fontSize: 44, color: W0.ink }}>$19 / month</div>
        <div style={{ position: "absolute", left: 40, right: 40, top: 280, height: 100, borderRadius: 20, background: done ? "#1a9c55" : "#635bff", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, transform: `scale(${now >= tp && now < tp + 0.3 ? 0.96 : 1})` }}>
          {done ? <Check t={now - tp - 0.35} color="#ffffff" size={50} /> : null}
          <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 40, color: "#ffffff" }}>{done ? "Paid" : "Pay $19"}</span>
        </div>
      </Card>
      <Card x={140} y={910} w={800} h={400} t={now - tn + 0.1} fill="#ffffff" r={32}>
        <div style={{ position: "absolute", left: 40, top: 30 }}><Mono2 s={20} c={W0.dim}>WHAT STRIPE CHARGES YOU</Mono2></div>
        {now >= tn - 0.1 ? <Line t={now - tn} a="Monthly fee" b="$0" top={100} /> : null}
        {now >= ts - 0.1 ? <Line t={now - ts} a="Setup fee" b="$0" top={180} /> : null}
        {done ? (
          <div style={{ position: "absolute", left: 40, right: 40, top: 270, display: "flex", alignItems: "center", opacity: c01((now - tp - 0.4) / 0.15) }}>
            <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 36, color: W0.ink }}>A small fee</span>
            <span style={{ marginLeft: "auto" }}><Mono2 s={24} c={w.bg}>ONLY WHEN YOU GET PAID</Mono2></span>
          </div>
        ) : null}
      </Card>
    </>
  );
};

// 5. Sentry: an error is caught in red before the user's angry email gets written
const b5: B = (now, T) => {
  const t0 = T("b5"), tt = T("tell"), tf = T("five");
  const w = TOOLS[3].w;
  const gone = c01((now - tt - 0.3) / 0.3);
  return (
    <>
      <ToolHead t={now - t0} i={3} />
      <Card x={90} y={450} w={900} h={380} t={now - t0 - 0.25} fill={w.card} r={28} style={{ border: `4px solid ${w.accent}` }}>
        <div style={{ position: "absolute", left: 34, top: 28, display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 18, height: 18, borderRadius: 9, background: w.accent }} /><Mono2 s={22} c={w.accent}>NEW ISSUE · CAUGHT</Mono2></div>
        <div style={{ position: "absolute", left: 34, right: 34, top: 90, fontFamily: F.mono, fontSize: 36, color: w.ink, lineHeight: 1.3 }}>TypeError: Cannot read properties of undefined (reading 'total')</div>
        <div style={{ position: "absolute", left: 34, top: 250 }}><Mono2 s={24} c={w.dim} w={500}>invoice.tsx:42 · 3 users · just now</Mono2></div>
      </Card>
      {now >= tt - 0.4 ? (
        <div style={{ position: "absolute", left: 160, top: 900, width: 760, opacity: c01((now - tt + 0.4) / 0.15) * (1 - gone), transform: `translateY(${gone * 60}px) rotate(${gone * -4}deg)` }}>
          <Card x={0} y={0} w={760} h={300} t={now - tt + 0.4} fill="#ffffff" r={28}>
            <div style={{ position: "absolute", left: 32, top: 26 }}><Mono2 s={20} c={W0.dim}>FROM: A USER</Mono2></div>
            <div style={{ position: "absolute", left: 32, right: 32, top: 80, fontFamily: F.body, fontSize: 36, color: W0.ink }}>{typed("hey, your app is broken. invoices won't load", now - tt + 0.3, 30)}</div>
          </Card>
        </div>
      ) : null}
      {now >= tt + 0.6 ? <In t={now - tt - 0.6} style={{ left: 0, right: 0, top: 960, textAlign: "center", fontFamily: SERIF, fontSize: 62, color: w.ink }}>Fixed <span style={{ fontStyle: "italic" }}>before</span> they write.</In> : null}
      {now >= tf - 0.1 ? <Free t={now - tf} top={1220} text="5,000 errors" accent={w.accent} ink={w.ink} /> : null}
    </>
  );
};

// 6. UptimeRobot: a heartbeat bar every five minutes; the site goes down and the alert fires
const b6: B = (now, T) => {
  const t0 = T("b6"), te = T("every5"), td = T("down"), tf = T("fifty");
  const w = TOOLS[4].w;
  const down = now >= td + 0.2;
  const shown = Math.min(28, Math.floor(c01((now - te + 0.1) / Math.max(0.8, td - te)) * 27) + 1);
  return (
    <>
      <ToolHead t={now - t0} i={4} />
      <Card x={70} y={450} w={940} h={340} t={now - t0 - 0.2} fill={w.card} r={28}>
        <div style={{ position: "absolute", left: 34, top: 30, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 24, height: 24, borderRadius: 12, background: down ? "#ff4d4f" : w.accent }} />
          <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 40, color: w.ink }}>ledgerly.app</span>
          <span style={{ marginLeft: 20 }}><Mono2 s={24} c={down ? "#ff4d4f" : w.accent}>{down ? "DOWN" : "UP"}</Mono2></span>
        </div>
        <div style={{ position: "absolute", left: 34, right: 34, top: 120, height: 110, display: "flex", gap: 8, alignItems: "flex-end" }}>
          {Array.from({ length: 28 }).map((_, i) => <div key={i} style={{ flex: 1, height: i < shown ? 110 : 30, borderRadius: 6, background: i < shown ? (down && i === shown - 1 ? "#ff4d4f" : w.accent) : "rgba(255,255,255,0.08)" }} />)}
        </div>
        <div style={{ position: "absolute", left: 34, top: 260 }}><Mono2 s={22} c={w.dim} w={500}>checked every 5 minutes</Mono2></div>
      </Card>
      {down ? (
        <Card x={170} y={860} w={740} h={200} t={now - td - 0.2} fill="#ffffff" r={28}>
          <div style={{ position: "absolute", left: 30, top: 34, display: "flex", alignItems: "center", gap: 22 }}>
            <Pic f="uptimerobot.png" s={84} r={20} />
            <div><div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 36, color: W0.ink }}>ledgerly.app is down</div><div style={{ marginTop: 8 }}><Mono2 s={22} c={W0.dim} w={500}>ALERT · NOW</Mono2></div></div>
          </div>
        </Card>
      ) : null}
      {now >= tf - 0.1 ? <Free t={now - tf} top={1200} text="50 monitors" accent={w.accent} ink={w.ink} /> : null}
    </>
  );
};

// 7. Part one's seven and part two's five snap into one stack; the bill stays $0.00 and is stamped FREE
const b7: B = (now, T) => {
  const t0 = T("b7"), ts = T("still");
  const all = [...PART1.map((p) => (s: number) => (p.img ? <Pic f={p.f} s={s} /> : <Mono f={p.f} s={s} color={p.color!} />)), ...TOOLS.map((_, i) => (s: number) => LOGO2(i, s))];
  return (
    <>
      <In t={now - t0} dy={30} style={{ left: 60, right: 60, top: 200, textAlign: "center", fontFamily: SERIF, fontSize: 96, color: W0.ink, lineHeight: 1.05 }}>One <span style={{ fontStyle: "italic" }}>full</span> stack.</In>
      <div style={{ position: "absolute", left: 120, top: 420, width: 840, display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center" }}>
        {all.map((m, i) => (
          <div key={i} style={{ width: 180, height: 150, borderRadius: 26, background: "#ffffff", boxShadow: "0 14px 30px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, transform: `scale(${sp(now - t0 - 0.15 - i * 0.06, 200)})`, border: i >= 7 ? "3px solid #2f5ff0" : "3px solid transparent" }}>
            {m(64)}
            <Mono2 s={16} c={W0.dim}>{i < 7 ? "PART 1" : "PART 2"}</Mono2>
          </div>
        ))}
      </div>
      {now >= ts - 0.3 ? (
        <Card x={240} y={1070} w={600} h={300} t={now - ts + 0.3} fill="#ffffff" r={32}>
          <div style={{ position: "absolute", left: 40, top: 34 }}><Mono2 s={22} c={W0.dim}>MONTHLY BILL</Mono2></div>
          <div style={{ position: "absolute", left: 40, top: 90, fontFamily: F.mono, fontWeight: 700, fontSize: 110, color: "#1a9c55" }}>$0.00</div>
          <div style={{ position: "absolute", right: 34, top: 150, fontFamily: F.mono, fontWeight: 800, fontSize: 52, letterSpacing: 4, color: "#1a9c55", border: "6px solid #1a9c55", borderRadius: 14, padding: "4px 18px", transform: `rotate(-12deg) scale(${2 - sp(now - ts - 0.2, 200)})`, opacity: c01((now - ts - 0.2) / 0.1) }}>FREE</div>
        </Card>
      ) : null}
    </>
  );
};

// 8. Comment STACK; the guide with both parts slides up
const b8: B = (now, T) => {
  const t0 = T("b8"), tb = T("both");
  return (
    <>
      <In t={now - t0} style={{ left: 0, right: 0, top: 300, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: "#ffffff", borderRadius: 999, padding: "18px 40px 18px 18px", boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: W0.line }} />
          <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 48, color: W0.dim }}>Comment</span>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 56, color: W0.ink, letterSpacing: 3, minWidth: 220 }}>{typed("STACK", now - t0 - 0.35, 12)}</span>
        </div>
      </In>
      {now >= tb - 0.3 ? (
        <Card x={150} y={520} w={780} h={820} t={now - tb + 0.3} fill="#ffffff" r={34}>
          <div style={{ position: "absolute", left: 44, top: 40 }}><Mono2 s={22} c={W0.dim}>THE $0 STARTUP STACK · GUIDE</Mono2></div>
          <div style={{ position: "absolute", left: 44, top: 100, fontFamily: SERIF, fontSize: 60, color: W0.ink }}>Both parts, <span style={{ fontStyle: "italic" }}>every</span> link</div>
          {["Code and hosting", "Database and backend", "Logins", "Payments", "Errors and uptime", "Email and storage"].map((r, i) => (
            <div key={i} style={{ position: "absolute", left: 44, right: 44, top: 240 + i * 92, height: 76, borderTop: `2px solid ${W0.line}`, display: "flex", alignItems: "center", gap: 18, opacity: c01((now - tb - i * 0.08) / 0.15) }}>
              <Check t={now - tb - 0.1 - i * 0.08} size={36} />
              <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 34, color: W0.ink }}>{r}</span>
            </div>
          ))}
        </Card>
      ) : null}
    </>
  );
};

const BEATS: { key: string; draw: B; tool: number | null }[] = [
  { key: "b1", draw: b1, tool: null }, { key: "b2", draw: b2, tool: 0 }, { key: "b3", draw: b3, tool: 1 }, { key: "b4", draw: b4, tool: 2 },
  { key: "b5", draw: b5, tool: 3 }, { key: "b6", draw: b6, tool: 4 }, { key: "b7", draw: b7, tool: null }, { key: "b8", draw: b8, tool: null },
];

/** the running bill: one line per tool reached, each at $0.00 */
const BillStrip: React.FC<{ cur: number; now: number; starts: number[]; ink: string; dim: string }> = ({ cur, now, starts, ink, dim }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top: 1440, display: "flex", alignItems: "center", gap: 14 }}>
    <Mono2 s={26} c={dim}>BILL</Mono2>
    {TOOLS.map((tl, i) => (cur >= i + 1 ? (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 999, background: "rgba(127,127,127,0.2)", transform: `scale(${sp(now - starts[i + 1] - 0.3, 220)})` }}>
        {tl.mark(34)}
        <Mono2 s={26} c={ink}>$0</Mono2>
      </div>
    ) : null))}
    <span style={{ marginLeft: "auto" }}><Mono2 s={34} c={ink} w={800}>$0.00</Mono2></span>
  </div>
);

export const StackZero: View = {
  View: ({ t0, at, p, words }) => {
    const now = t0 + useCurrentFrame() / FPS;
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => (k === "b1" ? t0 : parts[k] ? at(parts[k]) - 0.08 : 999);
    const starts = BEATS.map((b) => T(b.key));
    let cur = 0;
    starts.forEach((s, i) => { if (now >= s) cur = i; });
    const bgOf = (i: number) => (BEATS[i].tool !== null ? TOOLS[BEATS[i].tool!].w.bg : W0.bg);
    const flood = cur === 0 ? 1 : ease(now - starts[cur], 0.45);
    const tk = BEATS[cur].tool;
    const w = tk !== null ? TOOLS[tk].w : null;
    const ink = w ? w.ink : W0.ink, accent = w ? w.accent : "#2f5ff0", dim = w ? w.dim : W0.dim;
    const push = 1 + 0.025 * c01((now - starts[cur]) / 3);
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, background: bgOf(Math.max(0, cur - 1)), overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: bgOf(cur), clipPath: `circle(${flood * 130}% at 50% 45%)` }} />
        {tk !== null ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 90, display: "flex", justifyContent: "center", gap: 10 }}>
            {TOOLS.map((tl, i) => {
              const on = tk === i;
              return <div key={i} style={{ fontFamily: F.mono, fontSize: 18, letterSpacing: 2, padding: "8px 14px", borderRadius: 999, background: on ? ink : "transparent", color: on ? w!.bg : dim, border: `2px solid ${on ? ink : dim}` }}>{tl.tab}</div>;
            })}
          </div>
        ) : null}
        <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "50% 45%" }}>{BEATS[cur].draw(now, T)}</div>
        {tk !== null ? <BillStrip cur={cur} now={now} starts={starts} ink={ink} dim={dim} /> : null}
        {words ? <Captions words={words} now={now} ink={ink} accent={accent} /> : null}
      </div>
    );
  },
  hits: ({ at, p }) => {
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => at(parts[k]);
    const soft = 0.62;
    return [
      { t: T("views") + 0.1, sound: "ding", gain: 0.2 * soft },
      { t: T("two"), sound: "whoosh", gain: 0.3 }, { t: T("two"), sound: "subdrop", gain: 0.35 },
      { t: T("b2"), sound: "swish", gain: 0.2 * soft }, { t: T("updates") + 0.3, sound: "pop", gain: 0.15 * soft },
      { t: T("b3"), sound: "swish", gain: 0.2 * soft }, { t: T("factor") + 0.2, sound: "typing", gain: 0.12 * soft },
      { t: T("b4"), sound: "swish", gain: 0.2 * soft }, { t: T("pays") + 0.35, sound: "cash", gain: 0.18 * soft },
      { t: T("b5"), sound: "swish", gain: 0.2 * soft },
      { t: T("b6"), sound: "swish", gain: 0.2 * soft }, { t: T("down") + 0.2, sound: "click", gain: 0.25 * soft },
      { t: T("b7"), sound: "sweep", gain: 0.2 * soft }, { t: T("still") + 0.2, sound: "subdrop", gain: 0.3 },
      { t: T("b8") + 0.35, sound: "typing", gain: 0.15 * soft },
    ];
  },
};
