import React from "react";
import { useCurrentFrame, Img, OffthreadVideo, Sequence, staticFile, Easing } from "remotion";
import { loadFont as loadInterTight } from "@remotion/google-fonts/InterTight";
import { F, FPS } from "../../kit/theme";
import type { View } from "./faceless";
import { Captions } from "./keynote";

/** echo-hermes v2 (2026-11-09): the product-film look, made for this reel (Vishnu: "more professional and less AI
 *  feel, don't use any other video style"). Near-black stage with a soft spotlight and film grain, Inter Tight type,
 *  thin mono labels, slow pushes, blur-in text, crossfades between beats. Everything shown is real:
 *  - the Echo Dot 3rd gen photos (Samuel Wiki, Wikimedia Commons, CC0), cut out, ring off and ring lit;
 *  - the Hermes screen recorded from the repo's own ?demo mode (show-b4.mp4, time-mapped to the voice);
 *  - the Hermes avatar (avatar-default.svg), the tool levels, the model numbers (github.com/majorminorlabs/hermes-voice). */

const SANS = loadInterTight("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;
const BG = "#0a0a0c", INK = "#f4f2ee", DIM = "#8b8a93", LINE = "#24242a", AMBER = "#f5b83d", OKC = "#7ed4a6", NOC = "#ff7a6b";
const RAW = (f: string) => staticFile(`echo-hermes/raw/${f}`);
const c01 = (x: number) => Math.max(0, Math.min(1, x));
const eo = (t: number, d = 0.6) => Easing.out(Easing.cubic)(c01(t / d));
const eio = (t: number, d = 0.6) => Easing.inOut(Easing.cubic)(c01(t / d));

// text that rises out of a blur
const Rise: React.FC<{ t: number; children: React.ReactNode; style?: React.CSSProperties; d?: number }> = ({ t, children, style, d = 0.6 }) => {
  const k = eo(t, d);
  return t < 0 ? null : <div style={{ position: "absolute", opacity: k, transform: `translateY(${(1 - k) * 22}px)`, filter: `blur(${(1 - k) * 10}px)`, ...style }}>{children}</div>;
};
const Head: React.FC<{ t: number; text: React.ReactNode; top?: number; size?: number; color?: string }> = ({ t, text, top = 250, size = 92, color = INK }) => (
  <Rise t={t} style={{ left: 70, right: 70, top, textAlign: "center", fontFamily: SANS, fontWeight: 600, fontSize: size, letterSpacing: -2.5, lineHeight: 1.04, color }}>{text}</Rise>
);
const Label: React.FC<{ t: number; children: React.ReactNode; style?: React.CSSProperties; c?: string }> = ({ t, children, style, c = DIM }) => (
  <Rise t={t} d={0.4} style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: 4, color: c, ...style }}>{children}</Rise>
);

// the real Echo Dot: ring off, then lit (a crossfade with a bloom)
const Dot: React.FC<{ x: number; y: number; w: number; on: number; push?: number }> = ({ x, y, w, on, push = 1 }) => (
  <div style={{ position: "absolute", left: x - w / 2, top: y - w * 0.41, width: w, height: w * 0.83, transform: `scale(${push})` }}>
    <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "-4%", height: "14%", borderRadius: "50%", background: "rgba(0,0,0,0.65)", filter: "blur(22px)" }} />
    <div style={{ position: "absolute", left: "5%", right: "5%", top: "28%", height: "30%", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(70,160,255,0.55), rgba(40,220,200,0.18), transparent)", filter: "blur(30px)", opacity: on }} />
    <Img src={RAW("dot-off.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
    <Img src={RAW("dot-on.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: on }} />
  </div>
);

type B = (now: number, T: (k: string) => number, t0: number) => React.ReactNode;

// 1. HOOK: the old Echo, ring off; on "into your own" the ring lights; "completely free"
const b1: B = (now, T) => {
  const ty = T("yours"), tf = T("free");
  const on = eio(now - ty, 0.7);
  return (
    <>
      <Label t={now - 0.0} style={{ left: 70, top: 160 }}>AMAZON ECHO DOT · 3RD GEN</Label>
      {now < ty ? <Head t={now + 0.6} text="That old Echo." /> : <Head t={now - ty} text={<>Your own <span style={{ color: AMBER }}>AI assistant.</span></>} />}
      {now >= tf ? <Rise t={now - tf} style={{ left: 0, right: 0, top: 470, textAlign: "center", fontFamily: SANS, fontWeight: 500, fontSize: 56, letterSpacing: -1, color: DIM }}>And it's completely free.</Rise> : null}
      <Dot x={540} y={1010} w={940} on={on} push={1 + 0.06 * eio(now, 5)} />
    </>
  );
};

// 2. Hermes Voice on GitHub: the name, the repo, the stars counting to 500+
const b2: B = (now, T) => {
  const t0 = T("b2"), ts = T("stars");
  const n = Math.round(500 * eio(now - t0 - 0.3, Math.max(0.8, ts - t0 - 0.3)));
  return (
    <>
      <div style={{ position: "absolute", left: 140, top: 1300, width: 800, opacity: 0.1, filter: "blur(6px)" }}><Dot x={400} y={200} w={800} on={1} /></div>
      <Label t={now - t0} style={{ left: 0, right: 0, top: 430, textAlign: "center" }}>OPEN SOURCE · ON GITHUB</Label>
      <Rise t={now - t0 - 0.1} style={{ left: 0, right: 0, top: 500, textAlign: "center", fontFamily: SANS, fontWeight: 600, fontSize: 150, letterSpacing: -6, color: INK }}>Hermes Voice</Rise>
      <Label t={now - t0 - 0.3} style={{ left: 0, right: 0, top: 700, textAlign: "center", letterSpacing: 1 }}>github.com/majorminorlabs/hermes-voice</Label>
      <div style={{ position: "absolute", left: 240, right: 240, top: 790, height: 1, background: LINE, transform: `scaleX(${eo(now - t0 - 0.4, 0.8)})` }} />
      <Rise t={now - t0 - 0.5} style={{ left: 0, right: 0, top: 840, textAlign: "center" }}>
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 210, letterSpacing: -8, color: AMBER, fontVariantNumeric: "tabular-nums" }}>{now >= ts ? "500+" : n}</span>
        <div style={{ fontFamily: F.mono, fontSize: 24, letterSpacing: 6, color: DIM, marginTop: -10 }}>★ STARS ON GITHUB</div>
      </Rise>
    </>
  );
};

// 3. "Hey Hermes": the lit Echo; Alexa struck; your agent (the real Hermes avatar) answers; memory, personality
const b3: B = (now, T) => {
  const t0 = T("b3"), ta = T("alexa"), tm = T("memory"), tp = T("persona");
  const strike = eo(now - ta - 0.2, 0.4);
  return (
    <>
      <Head t={now - t0} text={<>Say <span style={{ color: AMBER }}>“Hey Hermes.”</span></>} top={230} />
      <Dot x={now < ta ? 540 : 540 - 250 * eio(now - ta, 0.8)} y={780} w={520} on={0.75 + 0.25 * Math.sin(now * 5) ** 2} />
      {now >= ta ? (
        <>
          <Rise t={now - ta} style={{ left: 0, right: 0, top: 470, textAlign: "center", fontFamily: SANS, fontWeight: 500, fontSize: 50, color: DIM }}>
            Instead of <span style={{ position: "relative" }}>Alexa<span style={{ position: "absolute", left: -4, right: -4, top: "52%", height: 4, background: NOC, transform: `scaleX(${strike})`, transformOrigin: "0 50%" }} /></span>,
          </Rise>
          <Rise t={now - ta - 0.6} style={{ left: 640, top: 610 }}>
            <div style={{ width: 320, height: 320, borderRadius: 160, overflow: "hidden", background: "radial-gradient(circle at 50% 40%, #2a2f45, #101218)", border: `2px solid ${AMBER}`, boxShadow: `0 0 ${50 + 30 * Math.sin(now * 4) ** 2}px rgba(245,184,61,0.35)` }}>
              <div style={{ width: "100%", height: "100%", background: "#ece8ff", WebkitMaskImage: `url(${RAW("hermes-screen/avatar-default.svg")})`, WebkitMaskSize: "92% auto", WebkitMaskPosition: "center 42%", WebkitMaskRepeat: "no-repeat", maskImage: `url(${RAW("hermes-screen/avatar-default.svg")})`, maskSize: "92% auto", maskPosition: "center 42%", maskRepeat: "no-repeat" }} />
            </div>
            <div style={{ marginTop: 18, textAlign: "center", fontFamily: F.mono, fontSize: 22, letterSpacing: 4, color: AMBER }}>YOUR HERMES AGENT</div>
          </Rise>
        </>
      ) : null}
      {[["Memory", tm, 200], ["Personality", tp, 560]].map(([l, t, x]) => (
        <Rise key={l as string} t={now - (t as number)} d={0.45} style={{ left: x as number, top: 1130, width: 320, padding: "22px 0", textAlign: "center", border: `1.5px solid ${LINE}`, borderRadius: 20, background: "rgba(255,255,255,0.03)", fontFamily: SANS, fontWeight: 600, fontSize: 44, color: INK }}>{l as string}</Rise>
      ))}
    </>
  );
};

// 4. The Echo Show: the real Hermes screen, time-mapped to the words; then the camera and its REC badge
const b4: B = (now, T, t0) => {
  const tb = T("b4"), th = T("heard"), tt = T("tools"), ta = T("answer"), tc = T("camera");
  const cam = now >= tc;
  const push = 1 + 0.05 * eio(now - tb, 8);
  const tag = (t: number, text: string, y: number) => (
    <Rise t={now - t} d={0.4} style={{ left: 90, top: y, display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: AMBER }} /><span style={{ fontFamily: F.mono, fontSize: 24, letterSpacing: 4, color: INK }}>{text}</span>
    </Rise>
  );
  return (
    <>
      <Head t={now - tb} text={cam ? <>It can even <span style={{ color: AMBER }}>see.</span></> : <>Got an <span style={{ color: AMBER }}>Echo Show?</span></>} top={230} />
      <div style={{ position: "absolute", left: 40, top: 520, width: 1000, height: 640, transform: `scale(${push})`, transformOrigin: "50% 50%" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 34, background: "linear-gradient(180deg,#1d1d22,#0c0c0f)", border: "1.5px solid #2e2e35", boxShadow: "0 60px 120px rgba(0,0,0,0.7)" }} />
        <div style={{ position: "absolute", left: 494, top: 12, width: 12, height: 12, borderRadius: 6, background: cam ? "#ff3b30" : "#2a2a30", boxShadow: cam ? "0 0 18px #ff3b30" : "none" }} />
        <div style={{ position: "absolute", left: 40, top: 36, width: 920, height: 575, borderRadius: 10, overflow: "hidden", background: "#000" }}>
          <Sequence from={Math.max(0, Math.round((tb - t0) * FPS))} layout="none">
            <OffthreadVideo src={RAW("show-b4.mp4")} muted style={{ width: 920, height: 575, objectFit: "cover", display: "block" }} />
          </Sequence>
          {cam ? <div style={{ position: "absolute", right: 18, top: 16, padding: "6px 14px", borderRadius: 6, background: "#ff3b30", fontFamily: F.mono, fontWeight: 700, fontSize: 20, color: "#fff", opacity: Math.sin(now * 5) > -0.6 ? 1 : 0.35 }}>● REC</div> : null}
        </div>
      </div>
      {cam ? <Label t={now - tc - 0.2} style={{ left: 0, right: 0, top: 1240, textAlign: "center" }} c={INK}>HERMES EYE · “WHAT AM I HOLDING?”</Label> : (
        <>{tag(th, "WHAT IT HEARD", 1220)}{tag(tt, "THE TOOLS IT'S USING", 1280)}{tag(ta, "THE ANSWER, AS IT'S WRITTEN", 1340)}</>
      )}
    </>
  );
};

// 5. You choose what it may do: three settings, each switching on with its word (the real --tools levels)
const b5: B = (now, T) => {
  const t0 = T("b5");
  const rows: [string, string, string][] = [["web", "Web search + memory", "--tools safe"], ["home", "Your smart home", "--tools home"], ["code", "Coding by voice", "--tools full"]];
  return (
    <>
      <Head t={now - t0} text={<>You choose what it's <span style={{ color: AMBER }}>allowed</span> to do.</>} top={230} size={84} />
      <div style={{ position: "absolute", left: 90, right: 90, top: 560, borderRadius: 30, border: `1.5px solid ${LINE}`, background: "rgba(255,255,255,0.025)", opacity: eo(now - t0 - 0.2, 0.5) }}>
        {rows.map(([k, l, flag], i) => {
          const on = eio(now - T(k), 0.35);
          return (
            <div key={k} style={{ height: 180, display: "flex", alignItems: "center", padding: "0 44px", borderTop: i ? `1.5px solid ${LINE}` : "none", opacity: 0.45 + 0.55 * on }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 52, letterSpacing: -1, color: INK }}>{l}</div>
                <div style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: 2, color: DIM, marginTop: 6 }}>{flag}</div>
              </div>
              <div style={{ width: 120, height: 68, borderRadius: 34, background: on > 0 ? `rgba(245,184,61,${0.2 + 0.8 * on})` : "#2a2a30", position: "relative" }}>
                <div style={{ position: "absolute", top: 6, left: 6 + 52 * on, width: 56, height: 56, borderRadius: 28, background: "#fff" }} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// 6. Only some older Echos work: a spec table from the README; "check your model" highlights a number
const MODELS: [string, string, boolean][] = [["Echo Dot 2nd gen", "RS03QR", true], ["Echo Dot 3rd gen", "D9N29T", true], ["Echo Dot 3rd gen (2019)", "C78MP8", false], ["Echo Show 5", "H23K37", true], ["Echo Show 8", "C7H6N3", true], ["Echo Dot with clock", "36EBT3", false]];
const b6: B = (now, T) => {
  const t0 = T("b6"), tc = T("check");
  return (
    <>
      <Head t={now - t0} text={now < tc ? <>Only some older <span style={{ color: AMBER }}>Echos</span> work.</> : <>Check your <span style={{ color: AMBER }}>model</span> first.</>} top={230} size={84} />
      <Label t={now - t0 - 0.2} style={{ left: 110, top: 520 }}>MODEL</Label>
      <Label t={now - t0 - 0.2} style={{ left: 640, top: 520 }}>NUMBER</Label>
      {MODELS.map(([n, num, ok], i) => {
        const hi = now >= tc && num === "D9N29T";
        return (
          <Rise key={num} t={now - t0 - 0.25 - i * 0.12} d={0.45} style={{ left: 90, right: 90, top: 570 + i * 112, height: 100, display: "flex", alignItems: "center", padding: "0 20px", borderRadius: 18, borderBottom: `1.5px solid ${LINE}`, outline: hi ? `2px solid ${AMBER}` : "none", background: hi ? "rgba(245,184,61,0.08)" : "transparent" }}>
            <span style={{ width: 530, fontFamily: SANS, fontWeight: 500, fontSize: 40, color: ok ? INK : DIM }}>{n}</span>
            <span style={{ flex: 1, fontFamily: F.mono, fontSize: 34, letterSpacing: 2, color: hi ? AMBER : DIM }}>{num}</span>
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: ok ? OKC : NOC }}>{ok ? "✓" : "✕"}</span>
          </Rise>
        );
      })}
      {now >= tc ? <Label t={now - tc - 0.2} style={{ left: 0, right: 0, top: 1290, textAlign: "center" }} c={INK}>IT'S PRINTED UNDER THE BASE</Label> : null}
    </>
  );
};

// 7. Callback: the old Echo again, dark; on "Jarvis" it lights up
const b7: B = (now, T) => {
  const t0 = T("b7"), tj = T("jarvis");
  const on = eio(now - tj, 0.6);
  return (
    <>
      {now < tj ? <Head t={now - t0} text="That Echo in your drawer?" /> : <Head t={now - tj} text={<>It's a <span style={{ color: AMBER }}>Jarvis</span> now.</>} />}
      <div style={{ position: "absolute", left: 140, right: 140, top: 760, height: 520, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(70,160,255,0.35), transparent)", filter: "blur(40px)", opacity: on }} />
      <Dot x={540} y={1000} w={900} on={on} push={1 + 0.05 * eio(now - t0, 3)} />
    </>
  );
};

// 8. Comment ECHO
const b8: B = (now, T) => {
  const t0 = T("b8");
  return (
    <>
      <div style={{ position: "absolute", left: 140, top: 1080, width: 800, opacity: 0.35 }}><Dot x={400} y={200} w={800} on={1} /></div>
      <Label t={now - t0} style={{ left: 0, right: 0, top: 520, textAlign: "center" }}>COMMENT</Label>
      <Rise t={now - t0 - 0.15} style={{ left: 0, right: 0, top: 570, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 230, letterSpacing: -8, color: AMBER }}>ECHO</Rise>
      <Rise t={now - t0 - 0.45} style={{ left: 0, right: 0, top: 860, textAlign: "center", fontFamily: SANS, fontWeight: 500, fontSize: 48, color: INK }}>I'll send you the setup steps.</Rise>
    </>
  );
};

const BEATS: { key: string; draw: B }[] = [
  { key: "b1", draw: b1 }, { key: "b2", draw: b2 }, { key: "b3", draw: b3 }, { key: "b4", draw: b4 },
  { key: "b5", draw: b5 }, { key: "b6", draw: b6 }, { key: "b7", draw: b7 }, { key: "b8", draw: b8 },
];
const XF = 0.35; // crossfade between beats

export const EchoView: View = {
  View: ({ t0, at, p, words }) => {
    const frame = useCurrentFrame();
    const now = t0 + frame / FPS;
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => (k === "b1" ? t0 : parts[k] ? at(parts[k]) - 0.08 : 999);
    const starts = BEATS.map((b) => T(b.key));
    let cur = 0;
    starts.forEach((s, i) => { if (now >= s) cur = i; });
    const fadeOut = cur > 0 ? 1 - eio(now - starts[cur], XF) : 0;
    const progress = c01((now - t0) / Math.max(1, (words && words.length ? words[words.length - 1].end : 40) - t0));
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, background: BG, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 45% at 50% 48%, rgba(255,255,255,0.07), transparent 70%)" }} />
        <div style={{ position: "absolute", inset: 0 }}>{BEATS[cur].draw(now, T, t0)}</div>
        {fadeOut > 0 ? <div style={{ position: "absolute", inset: 0, background: BG, opacity: fadeOut }}><div style={{ position: "absolute", inset: 0 }}>{BEATS[cur - 1].draw(now, T, t0)}</div></div> : null}
        {/* the pinned frame: brand mark top left, progress hairline */}
        <div style={{ position: "absolute", left: 70, top: 92, fontFamily: F.mono, fontSize: 20, letterSpacing: 5, color: DIM }}>HERMES VOICE</div>
        <div style={{ position: "absolute", left: 70, right: 70, top: 128, height: 2, background: LINE }}><div style={{ width: `${progress * 100}%`, height: 2, background: AMBER }} /></div>
        {/* vignette and grain */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55))", pointerEvents: "none" }} />
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: 0.07, mixBlendMode: "overlay", pointerEvents: "none" }}>
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
      { t: T("yours"), sound: "sparkle", gain: 0.18 * s },
      { t: T("b2"), sound: "whoosh", gain: 0.14 * s }, { t: T("stars"), sound: "tick", gain: 0.16 * s },
      { t: T("b3"), sound: "whoosh", gain: 0.14 * s }, { t: T("alexa"), sound: "swipe", gain: 0.14 * s },
      { t: T("b4"), sound: "whoosh", gain: 0.14 * s }, { t: T("camera"), sound: "shutter", gain: 0.16 * s },
      { t: T("b5"), sound: "whoosh", gain: 0.14 * s }, { t: T("web"), sound: "click", gain: 0.18 * s }, { t: T("home"), sound: "click", gain: 0.18 * s }, { t: T("code"), sound: "click", gain: 0.18 * s },
      { t: T("b6"), sound: "whoosh", gain: 0.14 * s }, { t: T("check"), sound: "tick", gain: 0.16 * s },
      { t: T("b7"), sound: "whoosh", gain: 0.14 * s }, { t: T("jarvis"), sound: "riser", gain: 0.16 * s },
      { t: T("b8"), sound: "whoosh", gain: 0.14 * s },
    ];
  },
};
