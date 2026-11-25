import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";
import { FPS, Word } from "../../kit/theme";
import { c01, ease, sp } from "./keynote";
import wordsJson from "../../../../videos/agency-native-vs-cross/words.json";

/** Native vs cross-platform (Auralion Labs agency reel), 2026-11-08. Self-contained, like agency-we-got-you: the agency's
 *  own look (the website's black and white, Poppins, no gold) with its own captions, so it does not use single.tsx.
 *  Premium UI (Vishnu's word): two real-looking phones on a dark stage, real logos (simple-icons, CC0 data; the marks
 *  belong to their owners), our own app screens labelled ILLUSTRATIVE. Every beat is keyed to a spoken phrase. */

const SLUG = "agency-native-vs-cross";
const POP = loadFont("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] }).fontFamily;
const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.6 : 5;

const W = 1080, H = 1920, INK = "#0d0e14", WHITE = "#ffffff", DIM = "rgba(255,255,255,0.55)";
const BRAND = { react: "#61DAFB", flutter: "#47C5FB", swift: "#F05138", kotlin: "#7F52FF", android: "#3DDC84", apple: "#ffffff" };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
/** When a phrase is first spoken (at or after `from`); 999 if it never is */
const at = (phrase: string, from = 0) => {
  const want = phrase.split(/\s+/).map(norm);
  for (let i = 0; i < words.length; i++) {
    if (words[i].start < from) continue;
    if (want.every((w, k) => words[i + k] && norm(words[i + k].w) === w)) return words[i].start;
  }
  return 999;
};

const T = {
  twice: at("built twice"), one: at("one codebase"), founders: at("most founders"), bills: at("two bills"),
  notAny: at("not anymore"), rn: at("react native"), flutter: at("flutter"), release: at("same features"),
  native: at("so when"), sk: at("swift and kotlin"), hardware: at("hardware"), camera: at("camera"), ar: at("ar"),
  bt: at("bluetooth"), widgets: at("widgets"), watch: at("watch"), territory: at("native territory"),
  rest: at("everything else"), once: at("build it once"), stack: at("comment stack"),
};

const Logo: React.FC<{ name: keyof typeof BRAND | "mark"; size: number; color?: string }> = ({ name, size, color }) => (
  <div style={{ width: size, height: size, flex: "none", backgroundColor: color ?? (name === "mark" ? WHITE : BRAND[name]), WebkitMaskImage: `url(${staticFile(`${SLUG}/brand/${name}.svg`)})`, WebkitMaskSize: "contain", WebkitMaskRepeat: "no-repeat", WebkitMaskPosition: "center" }} />
);

const pop = (now: number, t: number, stiff = 170) => sp(now - t, stiff);

// ---------------------------------------------------------------- the app screens (our own mock, ILLUSTRATIVE)

const Booking: React.FC<{ now: number; live: number; tint: string }> = ({ now, live, tint }) => {
  const days = ["Mon", "Tue", "Wed", "Thu"];
  const slots = ["9:00", "10:30", "12:00", "14:00", "15:30", "17:00"];
  const pick = Math.floor(now * 1.2) % slots.length;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#f6f6f8", padding: "70px 22px 0", fontFamily: POP, color: INK }}>
      <div style={{ fontSize: 14, color: "#8a8a94", fontWeight: 600, letterSpacing: 1 }}>STUDIO HALL</div>
      <div style={{ fontSize: 27, fontWeight: 800, marginTop: 4, letterSpacing: -0.5 }}>Book a session</div>
      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        {days.map((d, i) => (
          <div key={d} style={{ flex: 1, borderRadius: 14, padding: "10px 0", textAlign: "center", background: i === 1 ? INK : WHITE, color: i === 1 ? WHITE : INK, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{d}</div><div style={{ fontSize: 19, fontWeight: 700 }}>{10 + i}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
        {slots.map((s, i) => (
          <div key={s} style={{ borderRadius: 12, padding: "11px 0", textAlign: "center", fontSize: 16, fontWeight: 600, background: i === pick ? tint : WHITE, color: i === pick ? INK : "#3a3a44", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>{s}</div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 22, right: 22, bottom: 40, borderRadius: 16, padding: "15px 0", textAlign: "center", background: INK, color: WHITE, fontSize: 17, fontWeight: 700 }}>Confirm booking</div>
      {live > 0 ? (
        <div style={{ position: "absolute", left: 22, right: 22, top: 250, transform: `scale(${0.6 + 0.4 * live})`, opacity: c01(live * 2), borderRadius: 20, padding: "22px 0", background: WHITE, boxShadow: "0 18px 40px rgba(0,0,0,0.18)", textAlign: "center" }}>
          <div style={{ width: 54, height: 54, borderRadius: 27, background: "#22c55e", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 32, fontWeight: 800 }}>✓</div>
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10 }}>v1.0 is live</div>
          <div style={{ fontSize: 13, color: "#8a8a94", marginTop: 2 }}>released today</div>
        </div>
      ) : null}
    </div>
  );
};

const Orders: React.FC<{ now: number }> = ({ now }) => {
  const rows = [["Asha R.", "On the way"], ["Mohit K.", "Delivered"], ["Priya S.", "Packed"], ["Daniel P.", "Delivered"], ["Neha V.", "On the way"]];
  const off = (now * 40) % 74;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#f6f6f8", padding: "70px 22px 0", fontFamily: POP, color: INK, overflow: "hidden" }}>
      <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: -0.5 }}>Orders</div>
      <div style={{ height: 40, borderRadius: 12, background: WHITE, marginTop: 14, padding: "0 14px", display: "flex", alignItems: "center", color: "#9a9aa4", fontSize: 15 }}>Search orders</div>
      <div style={{ marginTop: 14 - off }}>
        {[...rows, ...rows].map(([n, s], i) => (
          <div key={i} style={{ height: 64, marginBottom: 10, borderRadius: 14, background: WHITE, display: "flex", alignItems: "center", gap: 12, padding: "0 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: "#e7e7ee", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{n[0]}</div>
            <div style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>{n}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: s === "Delivered" ? "#16a34a" : "#6b6a76" }}>{s}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Camera: React.FC<{ now: number }> = ({ now }) => {
  const s = 150 + 10 * Math.sin(now * 4);
  return (
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 40% 40%, #5b4a3a 0%, #2a2420 50%, #0c0b0a 100%)", fontFamily: POP }}>
      <div style={{ position: "absolute", left: "50%", top: "42%", width: s, height: s, transform: "translate(-50%,-50%)", border: "3px solid rgba(255,214,10,0.9)", borderRadius: 14 }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 120, display: "flex", justifyContent: "center", gap: 10 }}>
        {["Mono", "Warm", "Vivid"].map((f, i) => <div key={f} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, color: i === 1 ? INK : WHITE, background: i === 1 ? "rgba(255,214,10,0.95)" : "rgba(255,255,255,0.15)" }}>{f}</div>)}
      </div>
      <div style={{ position: "absolute", left: "50%", bottom: 34, width: 64, height: 64, marginLeft: -32, borderRadius: 32, border: "5px solid white", boxSizing: "border-box" }} />
    </div>
  );
};

/** A phone: dark bezel, a soft rim light, the screen inside; iOS gets the island, Android the punch hole */
const Phone: React.FC<{ x: number; y: number; w: number; kind: "ios" | "android"; s?: number; o?: number; children: React.ReactNode }> = ({ x, y, w, kind, s = 1, o = 1, children }) => {
  const h = w * 2.06;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y, width: w, height: h, transform: `scale(${s})`, opacity: o, borderRadius: w * 0.16, background: "linear-gradient(145deg, #3a3b46, #15161c 45%, #2a2b33)", padding: 10, boxSizing: "border-box", boxShadow: "0 50px 90px rgba(0,0,0,0.6), inset 0 0 0 1.5px rgba(255,255,255,0.12)" }}>
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: w * 0.13, overflow: "hidden" }}>
        {children}
        {kind === "ios" ? <div style={{ position: "absolute", left: "50%", top: 12, width: w * 0.3, height: 26, marginLeft: -w * 0.15, borderRadius: 13, background: "#000" }} />
          : <div style={{ position: "absolute", left: "50%", top: 14, width: 18, height: 18, marginLeft: -9, borderRadius: 9, background: "#000" }} />}
      </div>
    </div>
  );
};

/** A glass code card with a file tab and code that types */
const Code: React.FC<{ x: number; y: number; w: number; file: string; lines: string[]; t: number; now: number; s?: number; children?: React.ReactNode }> = ({ x, y, w, file, lines, t, now, s = 1, children }) => {
  let left = Math.max(0, Math.floor((now - t) * 70));
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y, width: w, transform: `scale(${s})`, borderRadius: 24, background: "rgba(24,25,34,0.9)", boxShadow: "0 30px 60px rgba(0,0,0,0.5), inset 0 0 0 1.5px rgba(255,255,255,0.1)", padding: "18px 22px 22px", boxSizing: "border-box", fontFamily: "Consolas, 'IBM Plex Mono', monospace" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 11, height: 11, borderRadius: 6, background: c }} />)}
        <div style={{ marginLeft: 10, fontFamily: POP, fontSize: 20, fontWeight: 600, color: DIM }}>{file}</div>
      </div>
      <div style={{ marginTop: 14, fontSize: 24, lineHeight: 1.55, color: "#e6e6ee", whiteSpace: "pre" }}>
        {lines.map((l, i) => { const shown = l.slice(0, Math.max(0, left)); left -= l.length; return <div key={i} style={{ minHeight: 30 }}>{shown}</div>; })}
      </div>
      {children}
    </div>
  );
};

// ---------------------------------------------------------------- captions, the agency's own (white, the said word bright)

const chunks = (() => {
  const out: Word[][] = []; let c: Word[] = [];
  words.forEach((w) => { c.push(w); if (c.length >= 3 || /[.,!?:]$/.test(w.w)) { out.push(c); c = []; } });
  if (c.length) out.push(c);
  return out;
})();

const Captions: React.FC<{ now: number }> = ({ now }) => {
  const i = chunks.findIndex((c, k) => now >= c[0].start && (k === chunks.length - 1 || now < chunks[k + 1][0].start));
  if (i < 0 || now > chunks[i][chunks[i].length - 1].end + 0.6) return null;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1560, textAlign: "center", fontFamily: POP, fontWeight: 800, fontSize: 74, lineHeight: 1.1, letterSpacing: -1 }}>
      {chunks[i].map((w, k) => (
        <span key={k} style={{ display: "inline-block", margin: "0 0.16em", color: now >= w.start ? WHITE : "rgba(255,255,255,0.42)", textShadow: "0 4px 18px rgba(0,0,0,0.8)" }}>{w.w.replace(/[.,!?:]$/, "")}</span>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- pieces

const Tab: React.FC<{ n: string; label: string; t: number; now: number }> = ({ n, label, t, now }) => {
  const k = pop(now, t);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center", opacity: c01(k * 1.5), transform: `translateY(${(1 - k) * -20}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 26px", borderRadius: 40, background: "rgba(255,255,255,0.08)", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.14)", fontFamily: POP, fontSize: 26, fontWeight: 700, letterSpacing: 3, color: WHITE }}>
        <span style={{ color: DIM }}>{n}</span>{label}
      </div>
    </div>
  );
};

const Chip: React.FC<{ x: number; y: number; t: number; now: number; label: string; icon: React.ReactNode }> = ({ x, y, t, now, label, icon }) => {
  const k = pop(now, t, 220);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${k})`, display: "flex", alignItems: "center", gap: 12, padding: "16px 26px", borderRadius: 24, background: WHITE, color: INK, fontFamily: POP, fontSize: 33, fontWeight: 700, boxShadow: "0 20px 40px rgba(0,0,0,0.45)", whiteSpace: "nowrap" }}>
      {icon}{label}
    </div>
  );
};

const Dot: React.FC<{ c: string; ch: string }> = ({ c, ch }) => <div style={{ width: 40, height: 40, borderRadius: 12, background: c, color: WHITE, fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{ch}</div>;

const Pill: React.FC<{ k: number; children: React.ReactNode; big?: boolean }> = ({ k, children, big }) => (
  <div style={{ transform: `scale(${k})`, display: "flex", alignItems: "center", gap: big ? 14 : 10, padding: big ? "16px 28px" : "10px 16px", borderRadius: big ? 26 : 18, background: big ? "rgba(255,255,255,0.08)" : WHITE, boxShadow: big ? "inset 0 0 0 1.5px rgba(255,255,255,0.14)" : "0 14px 30px rgba(0,0,0,0.4)", fontFamily: POP, fontSize: big ? 38 : 21, fontWeight: big ? 800 : 700, color: big ? WHITE : INK }}>{children}</div>
);

// ---------------------------------------------------------------- the reel

export const AgencyNativeVsCross: React.FC = () => {
  const now = useCurrentFrame() / FPS;
  const actB = now >= T.native && now < T.rest, actC = now >= T.rest && now < T.stack, actD = now >= T.stack;
  const actA = !actB && !actC && !actD;

  // the slow camera push, restarting each act
  const actStart = actD ? T.stack : actC ? T.rest : actB ? T.native : 0;
  const push = 1 + 0.035 * ease(now - actStart, 6);

  // act A: one phone splits into two on "twice"; the two files merge into one card on "one codebase"; the old way (two
  // files, two bills) on "most founders", gone on "not anymore"; the frameworks land on the card; the same release
  const split = pop(now, T.twice, 140);
  const oldWay = now >= T.founders && now < T.notAny;
  const merged = now >= T.one && !oldWay;
  const cardT = now >= T.notAny ? T.notAny : T.one;
  const fold = pop(now, T.notAny, 200);
  const liveK = pop(now, T.release, 200);
  const phoneY = 700, pw = 340;
  const lx = 540 - 250 * split, rx = 540 + 250 * split;

  return (
    <AbsoluteFill style={{ background: "#07070b", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 60% at 50% 45%, #1f2130 0%, #11121a 50%, #07070b 100%)" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1.4px)", backgroundSize: "26px 26px", WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 45%, #000 20%, transparent 90%)" }} />
      </AbsoluteFill>

      <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "50% 50%" }}>
        {actA ? (
          <>
            {now >= T.one ? <Tab n="01" label={oldWay ? "THE OLD WAY" : "ONE CODEBASE"} t={oldWay ? T.founders : T.one} now={now} /> : null}

            {merged ? (
              <Code x={540} y={290} w={720} file="App.tsx" t={cardT} now={now} s={0.85 + 0.15 * pop(now, cardT)}
                lines={["export function Booking() {", "  const slots = useSlots()", "  return <SlotPicker slots={slots} />", "}"]}>
                <div style={{ position: "absolute", right: -20, top: -36, display: "flex", gap: 12 }}>
                  {now >= T.rn ? <Pill k={pop(now, T.rn, 220)}><Logo name="react" size={30} />React Native</Pill> : null}
                  {now >= T.flutter ? <Pill k={pop(now, T.flutter, 220)}><Logo name="flutter" size={30} />Flutter</Pill> : null}
                </div>
              </Code>
            ) : null}

            {oldWay ? (
              <>
                <Code x={285} y={290} w={480} file="App.swift" t={T.founders} now={now} s={0.8 + 0.2 * pop(now, T.founders)} lines={["struct Booking: View {", "  // the same app,", "  // written again", "}"]}>
                  <div style={{ position: "absolute", right: 16, top: 14 }}><Logo name="swift" size={30} /></div>
                </Code>
                <Code x={795} y={290} w={480} file="App.kt" t={T.founders + 0.2} now={now} s={0.8 + 0.2 * pop(now, T.founders + 0.2)} lines={["@Composable fun Booking() {", "  // the same app,", "  // written again", "}"]}>
                  <div style={{ position: "absolute", right: 16, top: 14 }}><Logo name="kotlin" size={30} /></div>
                </Code>
                {[285, 795].map((x, i) => { const k = pop(now, T.bills + i * 0.15, 230); return k > 0 ? (
                  <div key={x} style={{ position: "absolute", left: x - 90, top: 560, width: 200, transform: `rotate(${i ? 4 : -4}deg) scale(${k})`, borderRadius: 14, background: "#fffdf6", padding: "12px 0", textAlign: "center", fontFamily: POP, color: INK, boxShadow: "0 16px 30px rgba(0,0,0,0.45)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 3, color: "#8a8a94" }}>INVOICE</div>
                    <div style={{ fontSize: 26, fontWeight: 800 }}>BILL {i + 1}</div>
                  </div>) : null; })}
              </>
            ) : null}
            {now >= T.notAny && fold < 0.98 ? [285, 795].map((x, i) => (
              <div key={x} style={{ position: "absolute", left: x - 100, top: 560, width: 200, height: 80, opacity: 1 - fold, transform: `translateY(${fold * 300}px) rotate(${(i ? 1 : -1) * fold * 50}deg)`, borderRadius: 14, background: "#fffdf6", fontFamily: POP, fontSize: 26, fontWeight: 800, color: INK, display: "flex", alignItems: "center", justifyContent: "center" }}>BILL {i + 1}</div>
            )) : null}

            {merged && split > 0.9 ? (
              <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
                {[lx, rx].map((x, i) => (
                  <path key={i} d={`M540 555 C 540 630, ${x} 610, ${x} ${phoneY - 10}`} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={3} strokeDasharray="10 12" strokeDashoffset={-now * 60} />
                ))}
              </svg>
            ) : null}

            <Phone x={rx} y={phoneY} w={pw} kind="android" o={c01(split * 3)}><Booking now={now} live={liveK} tint={BRAND.android} /></Phone>
            <Phone x={lx} y={phoneY} w={pw} kind="ios"><Booking now={now} live={liveK} tint={BRAND.react} /></Phone>
            {split > 0.05 ? (
              <>
                {[[lx, "apple", "iOS"], [rx, "android", "Android"]].map(([x, n, label]) => (
                  <div key={label as string} style={{ position: "absolute", left: (x as number) - 100, top: phoneY + pw * 2.06 + 22, width: 200, display: "flex", justifyContent: "center", alignItems: "center", gap: 10, opacity: c01(split * 2), fontFamily: POP, fontSize: 26, fontWeight: 700, color: WHITE }}>
                    <Logo name={n as "apple"} size={30} />{label}
                  </div>))}
              </>
            ) : null}
          </>
        ) : null}

        {actB ? (
          <>
            <Tab n="02" label="WHEN TO GO NATIVE" t={T.native} now={now} />
            <div style={{ position: "absolute", left: 0, right: 0, top: 270, display: "flex", justifyContent: "center", gap: 26 }}>
              {now >= T.sk ? <Pill big k={pop(now, T.sk, 200)}><Logo name="swift" size={50} />Swift</Pill> : null}
              {now >= T.sk + 0.25 ? <Pill big k={pop(now, T.sk + 0.25, 200)}><Logo name="kotlin" size={50} />Kotlin</Pill> : null}
            </div>
            <Phone x={540} y={450} w={390} kind="ios" s={0.9 + 0.1 * pop(now, T.native)}>
              {now >= T.hardware ? <Camera now={now} /> : <Booking now={now} live={0} tint={BRAND.swift} />}
            </Phone>
            <Chip x={200} y={640} t={T.camera} now={now} label="Camera" icon={<Dot c="#111" ch="◉" />} />
            <Chip x={900} y={770} t={T.ar} now={now} label="AR" icon={<Dot c="#7c3aed" ch="◆" />} />
            <Chip x={190} y={920} t={T.bt} now={now} label="Bluetooth" icon={<Dot c="#2563eb" ch="ᛒ" />} />
            <Chip x={890} y={1060} t={T.widgets} now={now} label="Widgets" icon={<Dot c="#f59e0b" ch="▦" />} />
            <Chip x={215} y={1200} t={T.watch} now={now} label="Watch app" icon={<Dot c="#111" ch="⌚" />} />
            {now >= T.territory ? (
              <div style={{ position: "absolute", left: 0, right: 0, top: 1310, display: "flex", justifyContent: "center" }}>
                <div style={{ transform: `rotate(-4deg) scale(${pop(now, T.territory, 260)})`, padding: "12px 34px", border: `6px solid ${WHITE}`, borderRadius: 18, background: "rgba(7,7,11,0.6)", fontFamily: POP, fontSize: 54, fontWeight: 800, letterSpacing: 4, color: WHITE }}>NATIVE</div>
              </div>) : null}
          </>
        ) : null}

        {actC ? (
          <>
            <Tab n="03" label="EVERYTHING ELSE" t={T.rest} now={now} />
            <Code x={540} y={280} w={680} file="App.tsx" t={T.rest} now={now} s={0.85 + 0.15 * pop(now, T.rest)} lines={["export function Orders() {", "  return <OrderList />", "}"]} />
            <Phone x={295} y={560} w={340} kind="ios" s={0.9 + 0.1 * pop(now, T.rest + 0.1)}><Orders now={now} /></Phone>
            <Phone x={785} y={560} w={340} kind="android" s={0.9 + 0.1 * pop(now, T.rest + 0.2)}><Orders now={now + 0.4} /></Phone>
            {now >= T.once ? (
              <div style={{ position: "absolute", left: 0, right: 0, top: 860, display: "flex", justifyContent: "center" }}>
                <div style={{ transform: `rotate(-5deg) scale(${pop(now, T.once, 260)})`, padding: "14px 36px", borderRadius: 20, background: WHITE, fontFamily: POP, fontSize: 64, fontWeight: 800, letterSpacing: 2, color: INK, boxShadow: "0 30px 60px rgba(0,0,0,0.6)" }}>BUILD ONCE</div>
              </div>) : null}
          </>
        ) : null}

        {actD ? (
          <>
            <Tab n="FREE" label="CHECKLIST" t={T.stack} now={now} />
            {(() => {
              const k = pop(now, T.stack, 160);
              const items = ["Does the core job need the hardware?", "iOS and Android on day one?", "A web app to share code with?", "Who maintains it in two years?"];
              return (
                <div style={{ position: "absolute", left: 80, right: 80, top: 330, transform: `translateY(${(1 - k) * 80}px) rotate(-1.5deg)`, opacity: c01(k * 1.5), borderRadius: 30, background: WHITE, padding: "48px 50px", fontFamily: POP, color: INK, boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 3, color: "#8a8a94" }}>AURALION LABS</div>
                  <div style={{ fontSize: 58, fontWeight: 800, letterSpacing: -1, lineHeight: 1.08, marginTop: 10 }}>Native or cross&#8209;platform?</div>
                  {items.map((it, i) => { const c = pop(now, T.stack + 0.35 + i * 0.3, 240); return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 30, fontSize: 33, fontWeight: 600 }}>
                      <div style={{ width: 48, height: 48, flex: "none", borderRadius: 14, border: "3px solid #d4d4dc", background: c > 0.5 ? INK : WHITE, color: WHITE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, transform: `scale(${0.8 + 0.2 * c})` }}>{c > 0.5 ? "✓" : ""}</div>{it}
                    </div>); })}
                </div>);
            })()}
            <div style={{ position: "absolute", left: 0, right: 0, top: 1200, display: "flex", justifyContent: "center" }}>
              <div style={{ transform: `scale(${pop(now, T.stack + 0.2, 220)})`, display: "flex", alignItems: "center", gap: 18, padding: "20px 34px", borderRadius: 999, background: "rgba(255,255,255,0.1)", boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.2)", fontFamily: POP, fontSize: 56, fontWeight: 700, color: WHITE }}>
                Comment <span style={{ fontWeight: 800, padding: "4px 16px", borderRadius: 14, background: WHITE, color: INK }}>STACK</span>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", justifyContent: "center", alignItems: "center", gap: 12, opacity: 0.85 }}>
        <Logo name="mark" size={34} /><div style={{ fontFamily: POP, fontSize: 26, fontWeight: 700, color: WHITE }}>Auralion Labs</div>
      </div>
      {!actD ? <div style={{ position: "absolute", right: 40, top: 1490, fontFamily: POP, fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "rgba(255,255,255,0.35)" }}>ILLUSTRATIVE</div> : null}

      <Captions now={now} />
    </AbsoluteFill>
  );
};
