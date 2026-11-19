import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { ACTS, cue, f, prog, pop, lerp, clamp, easeInOut, ease } from "../lib";
import { C, MONO, PLEX, SERIF, World, DateStamp, PhotoCard, Pin, SystemMap, Watermark, Footnote, Tag } from "../kit/casefile";

const F = (s: number) => f(s);
const typed = (fr: number, text: string, a: number, b: number) => text.slice(0, Math.round(text.length * interpolate(fr, [F(a), F(b)], [0, 1], clamp)));

/* ---------------- Act 1+2: the terminal (hook + "Not broken. Just slow.") ---------------- */
export const STAMP = { x: 560, y: 1372 };
export const TerminalScene: React.FC<{ fr: number }> = ({ fr }) => {
  const tNot = F(cue("Not")), tSlow = F(cue("slow", 1)), tHalf = F(cue("half", 0)), end = F(ACTS.notBroken[1]);
  // camera: slow push on the hook, push into the readout on "Not broken", dive into the red stamp at the end
  const push = prog(fr, tNot - 4, 22, easeInOut), dive = prog(fr, end - 16, 18, (t) => t * t * t);
  const zoom = lerp(1 + 0.05 * (fr / tNot), 1.12, push) * lerp(1, 7, dive);
  const x = lerp(540, STAMP.x, dive), y = lerp(lerp(960, 1090, push), STAMP.y, dive);
  const headO = 1 - prog(fr, tNot - 6, 14);
  const cursor = Math.floor(fr / 15) % 2 === 0;
  const l2 = typed(fr, "$ time ssh nobody@localhost", 0.35, 1.9);
  const l5 = typed(fr, "$ time ssh nobody@localhost", 3.0, 3.8);
  const r1 = prog(fr, F(2.3), 6), r2 = pop(fr, tHalf - 2, 12);
  const ok = prog(fr, tNot, 10), stamp = pop(fr, tSlow - 2, 10);
  const line = (o: number, children: React.ReactNode, style?: React.CSSProperties) => <div style={{ opacity: o, minHeight: 58, ...style }}>{children}</div>;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 60% at 50% 55%, #1b1b1d 0%, ${C.bg} 70%)` }}>
      <World x={x} y={y} zoom={zoom} blur={dive * 6}>
        <SystemMap seed="term" opacity={0.18} />
        {/* hook headline: frame 0 is the cover */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 268, textAlign: "center", opacity: headO }}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 92, lineHeight: 1.02, color: C.ink, textShadow: "0 0 30px rgba(255,255,255,0.25)" }}>
            The <span style={{ color: C.red, textShadow: C.redGlow }}>half-second</span>
            <br />that saved Linux
          </div>
          <div style={{ width: 520, height: 3, background: C.ink, opacity: 0.6, margin: "26px auto 16px" }} />
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, letterSpacing: 4, color: C.dim }}>CASE FILE 001 · CVE-2024-3094</div>
        </div>
        <DateStamp fr={fr} at={F(0.05)} line1="FRIDAY, MARCH 29, 2024" line2="ONE SLOW SSH LOGIN" x={110} y={590} />
        {/* terminal */}
        <div style={{ position: "absolute", left: 70, top: 760, width: 940, height: 560, background: "rgba(14,14,16,0.94)", border: "3px solid #e9e7e0", boxShadow: C.whiteGlow, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ height: 52, borderBottom: "2px solid #3a3a3a", display: "flex", alignItems: "center", gap: 12, padding: "0 20px", fontFamily: PLEX, fontSize: 24, color: C.dim }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: "#4a4a4a" }} />)}
            <span style={{ marginLeft: 16 }}>andres@debian-sid: ~</span>
          </div>
          <div style={{ padding: "22px 30px", fontFamily: PLEX, fontWeight: 500, fontSize: 39, color: C.ink, lineHeight: 1.5 }}>
            {line(prog(fr, 2, 8), <span style={{ color: C.dim }}># before</span>)}
            {line(1, <>{l2}{fr < F(2.0) && cursor ? "▍" : ""}</>)}
            {line(r1, <>real&nbsp;&nbsp;0m0.299s</>)}
            {line(prog(fr, F(2.85), 8), <span style={{ color: C.dim }}># after a routine update</span>)}
            {line(prog(fr, F(2.95), 4), <>{l5}{fr >= F(2.95) && fr < tHalf && cursor ? "▍" : ""}</>)}
            {line(Math.min(1, r2 * 1.3), <span style={{ display: "inline-block", color: C.red, textShadow: C.redGlow, fontWeight: 700, transform: `scale(${lerp(1.25, 1, r2)})`, transformOrigin: "0 50%" }}>real&nbsp;&nbsp;0m0.807s</span>)}
            {line(ok, <span style={{ color: C.ink }}>✓ no errors&nbsp;&nbsp;✓ login works</span>, { marginTop: 6 })}
          </div>
        </div>
        {/* +508 ms stamp */}
        <div style={{ position: "absolute", left: STAMP.x, top: STAMP.y, transform: `translate(-50%,-50%) rotate(-7deg) scale(${lerp(1.8, 1, stamp)})`, opacity: Math.min(1, stamp * 1.5) }}>
          <div style={{ border: `5px solid ${C.red}`, boxShadow: C.redGlow, padding: "6px 22px", fontFamily: PLEX, fontWeight: 700, fontSize: 64, color: C.red, textShadow: C.redGlow, background: "rgba(40,0,0,0.6)", letterSpacing: 2 }}>+508 ms</div>
        </div>
      </World>
      <Footnote n={1} o={prog(fr, F(2.3), 10) * (1 - prog(fr, end - 10, 8))} />
    </AbsoluteFill>
  );
};

/* ---------------- Act 3: tracing the delay through the system map ---------------- */
const NODES = [
  { x: 250, y: 470, label: "ssh login" },
  { x: 430, y: 780, label: "sshd" },
  { x: 700, y: 1060, label: "libsystemd" },
  { x: 470, y: 1390, label: "liblzma · xz" },
];
const ROUTE: [number, number][] = [[250, 470], [250, 625], [430, 625], [430, 780], [430, 905], [700, 905], [700, 1060], [700, 1225], [470, 1225], [470, 1390]];
const NODE_AT_POINT = [0, 3, 6, 9];
const segLen = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
const cum = [0, ...segLen.map((_, i) => segLen.slice(0, i + 1).reduce((a, b) => a + b, 0))];
const TOTAL_LEN = cum[cum.length - 1];
const routePoint = (L: number): [number, number] => {
  const i = Math.max(0, cum.findIndex((c, k) => k > 0 && c >= L) - 1);
  const t = segLen[i] ? (L - cum[i]) / segLen[i] : 0;
  return [lerp(ROUTE[i][0], ROUTE[i + 1][0], Math.min(1, Math.max(0, t))), lerp(ROUTE[i][1], ROUTE[i + 1][1], Math.min(1, Math.max(0, t)))];
};

export const TraceScene: React.FC<{ fr: number }> = ({ fr }) => {
  const a = F(ACTS.trace[0]), end = F(ACTS.trace[1]);
  const times = [cue("followed"), cue("delay"), cue("down"), cue("xz") - 0.15].map(F);
  // route length reached at each frame: piecewise, node k reached at times[k]
  const L = interpolate(fr, times, NODE_AT_POINT.map((p) => cum[p]), { ...clamp, easing: easeInOut });
  const head = routePoint(L);
  const pts = ROUTE.filter((_, i) => cum[i] <= L).concat([head]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
  // camera: open close on the start (continuity with the red stamp), pull out, follow the route down, dive into xz
  const keys: [number, number, number, number][] = [
    [a, 250, 520, 3.2], [a + 22, 520, 860, 1.0], [times[2], 560, 960, 1.04], [times[3] + 6, 480, 1280, 1.45], [end - 14, 470, 1360, 1.6], [end + 6, 470, 1390, 6],
  ];
  const kf = keys.map((k) => k[0]);
  const ef = { ...clamp, easing: easeInOut };
  const cx = interpolate(fr, kf, keys.map((k) => k[1]), ef), cy = interpolate(fr, kf, keys.map((k) => k[2]), ef);
  const cz = Math.exp(interpolate(fr, kf, keys.map((k) => Math.log(k[3])), ef));
  const blur = Math.max(prog(fr, end - 8, 12) * 6, (1 - prog(fr, a, 14)) * 5);
  const ring = (fr - times[3]) / 30;
  const glowPulse = 0.75 + 0.25 * Math.sin(fr * 0.25);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <World x={cx} y={cy} zoom={cz} blur={blur}>
        <SystemMap seed="trace" opacity={0.95} />
        <Watermark text="DEBIAN" x={-40} y={1540} size={110} o={0.22} />
        <Watermark text="SID" x={760} y={560} size={80} o={0.18} />
        {/* faint copies of other routes that are fine */}
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {Array.from({ length: 6 }, (_, i) => {
            const sx = 100 + random(`fr${i}`) * 900, sy = 300 + random(`fy${i}`) * 1300;
            return <circle key={i} cx={sx} cy={sy} r={7} fill="#d6d3cc" opacity={0.6} />;
          })}
          <path d={d} stroke={C.red} strokeWidth={22} fill="none" opacity={0.25} strokeLinejoin="round" style={{ filter: "blur(10px)" }} />
          <path d={d} stroke={C.red} strokeWidth={8} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={NODES[0].x} cy={NODES[0].y} r={13} fill="none" stroke={C.red} strokeWidth={5} />
          <circle cx={head[0]} cy={head[1]} r={11} fill="#fff" opacity={fr > times[0] && fr < times[3] ? 0.95 : 0} />
          {fr >= times[3] && [0, 0.5].map((o, i) => {
            const r = ((ring + o) % 1);
            return <circle key={i} cx={NODES[3].x} cy={NODES[3].y} r={20 + r * 120} fill="none" stroke={C.red} strokeWidth={5 * (1 - r)} opacity={1 - r} />;
          })}
          {fr >= times[3] && <circle cx={NODES[3].x} cy={NODES[3].y} r={18} fill={C.red} opacity={glowPulse} />}
        </svg>
        {NODES.map((n, i) => (
          <Pin key={i} x={n.x} y={n.y - 18} text={n.label} red={i === 3} size={i === 3 ? 38 : 30} t={prog(fr, i === 0 ? a + 8 : times[i] - 6, 10)} />
        ))}
        <div style={{ position: "absolute", left: NODES[3].x - 230, top: NODES[3].y + 40, width: 460, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 28, color: C.ink, letterSpacing: 2, opacity: prog(fr, F(cue("compression")), 10), textShadow: "0 2px 10px #000" }}>
          A TINY COMPRESSION LIBRARY
        </div>
        {/* investigator card */}
        <div style={{ position: "absolute", left: 640, top: 250 }}>
          <PhotoCard fr={fr} at={F(cue("Andres")) - 3} w={230} name="Andres Freund" role="ENGINEER · MICROSOFT" seed="andres" />
        </div>
      </World>
    </AbsoluteFill>
  );
};

/* ---------------- Act 5: the testimony card ---------------- */
const QUOTE_PRE = "[...] logins with ssh taking a lot of CPU [...]";
const QUOTE = "The upstream xz repository and the xz tarballs have been backdoored.";
export const SpreadScene: React.FC<{ fr: number }> = ({ fr }) => {
  const a = F(ACTS.spread[0]), end = F(ACTS.spread[1]);
  const t = (fr - a) / (end - a);
  const qn = Math.round(QUOTE.length * prog(fr, a + 22, 38, (x) => x));
  const pre = prog(fr, a + 8, 12);
  const fed = pop(fr, F(cue("Fedora")) - 2, 12), deb = pop(fr, F(cue("Debian")) - 2, 12);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <World x={540} y={lerp(980, 940, t)} zoom={lerp(1.0, 1.07, t)} blur={(1 - prog(fr, a, 10)) * 6 + prog(fr, end - 8, 10) * 4}>
        <div style={{ position: "absolute", inset: 0, filter: "blur(3px)" }}><SystemMap seed="spread" opacity={0.28} /></div>
        <div style={{ position: "absolute", left: 90, top: 300 }}>
          <PhotoCard fr={fr} at={a + 2} w={200} name="Andres Freund" role="ENGINEER" seed="andres" />
        </div>
        <div style={{ position: "absolute", left: 380, top: 330, width: 620, fontFamily: MONO, color: C.ink }}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 120, lineHeight: 0.6, opacity: prog(fr, a + 4, 10) }}>“</div>
          <div style={{ height: 3, background: C.ink, width: lerp(0, 600, prog(fr, a + 6, 16)), marginTop: 6, boxShadow: C.whiteGlow }} />
          <div style={{ marginTop: 26, fontSize: 30, color: C.dim, opacity: pre, lineHeight: 1.45 }}>{QUOTE_PRE}</div>
        </div>
        <div style={{ position: "absolute", left: 90, top: 760, width: 900, fontFamily: MONO, fontWeight: 700, fontSize: 52, lineHeight: 1.42, color: C.ink }}>
          {QUOTE.slice(0, qn).split(" ").map((w, i) => {
            const red = /backdoored/.test(w);
            return <span key={i} style={{ color: red ? C.red : C.ink, textShadow: red ? C.redGlow : undefined }}>{w} </span>;
          })}
          <span style={{ opacity: qn < QUOTE.length && Math.floor(fr / 8) % 2 ? 1 : 0 }}>▍</span>
        </div>
        <div style={{ position: "absolute", left: 90, top: 1090, width: 900, opacity: prog(fr, a + 30, 12) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ flex: 1, height: 3, background: C.ink, boxShadow: C.whiteGlow }} />
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 120, lineHeight: 0.6, color: C.ink, marginTop: 50 }}>”</div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 28, color: C.dim, lineHeight: 1.5, marginTop: -8 }}>Email to the oss-security list, Andres Freund<br />March 29, 2024</div>
        </div>
        <div style={{ position: "absolute", left: 90, top: 1300, display: "flex", gap: 26, alignItems: "flex-end" }}>
          {[["Fedora", "40 BETA · RAWHIDE", fed], ["Debian", "TESTING · UNSTABLE", deb]].map(([n, s, p], i) => (
            <div key={i} style={{ opacity: Math.min(1, (p as number) * 1.4), transform: `translateY(${(1 - (p as number)) * 24}px)`, display: "flex", flexDirection: "column", gap: 8 }}>
              <Tag text={n as string} size={46} red />
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: C.ink, letterSpacing: 2 }}>{s as string}</div>
            </div>
          ))}
        </div>
      </World>
      <Footnote n={3} o={prog(fr, a + 10, 10)} />
    </AbsoluteFill>
  );
};

/* ---------------- Act 6: ending title ---------------- */
export const EndingScene: React.FC<{ fr: number }> = ({ fr }) => {
  const a = F(ACTS.ending[0]), end = F(ACTS.ending[1]);
  const t = (fr - a) / (end - a);
  const title = "Half a second.";
  const close = F(cue("close"));
  const out = prog(fr, end - 14, 14);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <World x={540} y={960} zoom={lerp(1.0, 1.08, t)} blur={(1 - prog(fr, a, 10)) * 8}>
        <div style={{ position: "absolute", inset: 0, filter: "blur(4px)" }}><SystemMap seed="end" opacity={0.13} /></div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center", opacity: 1 - out }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, letterSpacing: 6, color: C.dim, opacity: prog(fr, a + 4, 12) }}>CASE FILE 001</div>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 132, color: C.ink, marginTop: 24, textShadow: "0 0 34px rgba(255,255,255,0.3)" }}>
            {title.split("").map((ch, i) => <span key={i} style={{ opacity: prog(fr, a + 3 + i * 1.2, 8) }}>{ch}</span>)}
          </div>
          <div style={{ width: lerp(0, 700, prog(fr, close - 6, 26, ease)), height: 5, margin: "26px auto 30px", background: C.red, boxShadow: C.redGlow }} />
          <div style={{ fontFamily: PLEX, fontWeight: 700, fontSize: 54, color: C.red, textShadow: C.redGlow, opacity: prog(fr, F(cue("That's")) - 4, 10) }}>0m0.807s − 0m0.299s</div>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, letterSpacing: 4, color: C.ink, marginTop: 40, opacity: prog(fr, close + 6, 14) }}>THE XZ BACKDOOR · CVE-2024-3094</div>
        </div>
      </World>
    </AbsoluteFill>
  );
};
