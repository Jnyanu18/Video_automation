import React from "react";
import { useCurrentFrame, Easing, Img, staticFile } from "remotion";
import { F, FPS } from "../../kit/theme";
import type { View } from "./faceless";
import { SERIF, c01, sp, ease, In, Card, Check, typed, Captions } from "./keynote";

/** anthropic-gap (2026-11-06), Vishnu's structure: the gap is a height. Devs at Anthropic stand on a tall tower, everyone
 *  else stands at the bottom, and each step of the method from Anthropic's own guide (goal, interview, check) is a column
 *  that rises out of the ground on its cue, taller than the last, with gaps between them; the dev jumps from column top to
 *  column top. Dusk look (Vishnu asked for something cooler than the flat white): a night-blue sky warming to a Claude-orange
 *  glow at the top, where the Anthropic devs stand; a dark ground with a lit edge; rim-lit columns; white cards that pop. */

const ORANGE = "#d97757", BLUE = "#5b7cff", GREEN = "#2fbf7f", GROUND = 1450, TOWER = 640, TOWER_X = 770;
const COLS = [{ x: 70, top: 1250, label: "GOAL", c: ORANGE }, { x: 300, top: 1050, label: "INTERVIEW", c: BLUE }, { x: 530, top: 850, label: "CHECK", c: GREEN }];
const CW = 200;
const INK = "#f4f1ea", DIM = "#9c97b3";
const claude = staticFile("anthropic-gap/raw/crops/claude_symbol.svg");

/** Claude's real symbol (Wikimedia Commons, "Claude AI symbol.svg", CC0; trademark Anthropic), used as it is */
const ClaudeMark: React.FC<{ s: number }> = ({ s }) => <Img src={claude} style={{ width: s, height: s }} />;

/** a dev: round head, hoodie, a laptop with Claude's mark on the lid; squashes on landing; drawn 1.25x */
const Dev: React.FC<{ x: number; y: number; hoodie: string; squash?: number; arm?: number; flip?: boolean; laptop?: boolean; rim?: string }> = ({ x, y, hoodie, squash = 0, arm = 0, flip, laptop = true, rim = "rgba(255,190,150,0.0)" }) => (
  <svg width={200} height={250} viewBox="0 0 160 200" style={{ position: "absolute", left: x - 100, top: y - 238, overflow: "visible", transform: `scale(${flip ? -1 : 1}, 1)`, transformOrigin: "50% 100%", filter: `drop-shadow(0 0 10px ${rim})` }}>
    <g transform={`translate(80 190) scale(${1 + squash * 0.12}, ${1 - squash * 0.15}) translate(-80 -190)`}>
      <rect x={58} y={150} width={14} height={40} rx={7} fill="#1c1b24" /><rect x={88} y={150} width={14} height={40} rx={7} fill="#1c1b24" />
      <rect x={44} y={86} width={72} height={78} rx={30} fill={hoodie} />
      <rect x={104} y={96} width={16} height={56} rx={8} fill={hoodie} transform={`rotate(${-arm} 112 100)`} />
      <circle cx={80} cy={58} r={30} fill="#f0c7a2" />
      <path d="M50 52 C52 28 108 28 110 52 C100 40 62 40 50 52 Z" fill="#3a2a22" />
      <circle cx={70} cy={60} r={3.5} fill="#1d1d22" /><circle cx={90} cy={60} r={3.5} fill="#1d1d22" />
      {laptop ? (
        <g>
          <rect x={16} y={112} width={62} height={44} rx={6} fill="#d9dce4" />
          <image href={claude} x={35} y={122} width={24} height={24} />
          <rect x={10} y={154} width={74} height={8} rx={4} fill="#a9aebb" />
        </g>
      ) : null}
    </g>
  </svg>
);

export const ClimbGap: View = {
  View: ({ t0, at, p, words }) => {
    const now = t0 + useCurrentFrame() / FPS;
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => (parts[k] ? at(parts[k]) - 0.08 : 999);

    // ---- the world
    const rise = sp(now - T("gap"), 90);                           // the tower rises into a height
    const towerTop = GROUND - (GROUND - TOWER) * rise;
    const colK = COLS.map((_, i) => sp(now - T(["s1", "s2", "s3"][i]), 120));   // each column rises out of the ground
    const colTop = (i: number) => GROUND - (GROUND - COLS[i].top) * colK[i];
    // the dev's path: ground, each column top, then the tower; a jump is an arc over 0.42 s, a squash on landing
    const stops = [{ x: 200, y: GROUND }, ...COLS.map((c) => ({ x: c.x + CW / 2, y: c.top })), { x: 805, y: TOWER }];
    const jumpAt = [T("s1") + 0.45, T("s2") + 0.45, T("s3") + 0.45, T("top")];
    let k = 0; jumpAt.forEach((t, i) => { if (now >= t) k = i + 1; });
    const jt = k === 0 ? 1 : c01((now - jumpAt[k - 1]) / 0.42);
    const from = stops[Math.max(0, k - 1)], to = stops[k];
    const e = Easing.inOut(Easing.quad)(jt);
    const devX = from.x + (to.x - from.x) * e, devY = from.y + (to.y - from.y) * e - Math.sin(jt * Math.PI) * 140;
    const land = k > 0 && jt >= 1 ? Math.max(0, 1 - (now - jumpAt[k - 1] - 0.42) / 0.18) : 0;
    const five = now >= T("five") ? Math.sin(c01((now - T("five")) / 0.3) * Math.PI) : 0;

    // ---- the scroll of "one giant prompt", then crushed to one line
    const grow = ease(now - T("most"), 3.0);
    const crush = ease(now - T("opposite"), 0.35);
    const scrollH = 40 + 520 * grow * (1 - crush * 0.92);

    const card = (key: string) => now >= T(key) && (key === "c3" ? now < T("goal3") : key === "c2" ? now < T("s3") : now < T("s2"));
    const climbDone = now >= T("goal3");
    const glow = 0.55 + 0.45 * rise;

    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, overflow: "hidden", background: "linear-gradient(180deg, #0e0d1c 0%, #1d1838 35%, #3b2746 62%, #5a3240 78%, #0e0d16 78.1%)" }}>
        {/* Claude as the sun in the sky, top left: the real symbol, glowing, turning slowly (Vishnu, 2026-11-06) */}
        <div style={{ position: "absolute", left: 40, top: 70, width: 300, height: 300, borderRadius: 150, background: "radial-gradient(circle, rgba(240,161,132,0.55) 0%, rgba(217,119,87,0.22) 40%, rgba(217,119,87,0) 70%)" }} />
        <div style={{ position: "absolute", left: 110, top: 140, transform: `scale(${0.85 + 0.15 * sp(now, 80)}) rotate(${now * 8}deg)`, filter: "drop-shadow(0 0 30px rgba(240,140,100,0.9))" }}><ClaudeMark s={160} /></div>
        {/* a few stars */}
        <svg width={1080} height={900} style={{ position: "absolute", left: 0, top: 0 }}>{Array.from({ length: 26 }, (_, i) => <circle key={i} cx={(i * 397) % 1080} cy={(i * 173) % 820 + 20} r={i % 4 ? 1.6 : 2.6} fill="#ffffff" opacity={0.25 + 0.35 * Math.abs(Math.sin(now * 1.3 + i))} />)}</svg>
        {/* the ground, with a lit edge */}
        <div style={{ position: "absolute", left: 0, right: 0, top: GROUND, bottom: 0, background: "linear-gradient(180deg, #1a1726, #0b0a12)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: GROUND - 2, height: 3, background: "linear-gradient(90deg, rgba(217,119,87,0.0), rgba(217,119,87,0.7) 70%, rgba(217,119,87,0.9))" }} />

        {/* the tower */}
        <div style={{ position: "absolute", left: TOWER_X, right: -2, top: towerTop, height: GROUND - towerTop, background: "linear-gradient(90deg, #26223a 0%, #1a1729 70%)", borderTopLeftRadius: 14, boxShadow: "inset 6px 0 0 rgba(217,119,87,0.55), -30px 0 60px rgba(0,0,0,0.35)" }}>
          <div style={{ height: 14, background: "linear-gradient(90deg, #f0a184, #d97757)", borderTopLeftRadius: 14 }} />
          {now >= T("devs") ? <div style={{ position: "absolute", left: 30, top: 50, fontFamily: F.mono, fontSize: 24, letterSpacing: 3, color: INK, opacity: c01((now - T("devs")) / 0.2) }}>DEVS AT<br />ANTHROPIC</div> : null}
        </div>
        {/* the gap, measured */}
        {rise > 0.5 && now < T("s3") ? (
          <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
            <line x1={TOWER_X - 30} y1={towerTop} x2={TOWER_X - 30} y2={GROUND} stroke="#8d86a8" strokeWidth={4} strokeDasharray="12 10" />
            <text x={TOWER_X - 48} y={(towerTop + GROUND) / 2} textAnchor="end" fontFamily={F.mono} fontSize={28} letterSpacing={4} fill="#b8b1d0" opacity={c01((rise - 0.5) * 2)}>THE GAP</text>
          </svg>
        ) : null}

        {/* the columns */}
        {COLS.map((c, i) => {
          if (colK[i] <= 0.001) return null;
          const top = colTop(i);
          const lit = climbDone ? now >= T(["goal3", "interview3", "check3"][i]) : true;
          return (
            <div key={i} style={{ position: "absolute", left: c.x, top, width: CW, height: GROUND - top, background: `linear-gradient(90deg, ${c.c}${lit ? "" : "66"} 0%, ${c.c}${lit ? "cc" : "44"} 100%)`, borderRadius: "14px 14px 0 0", boxShadow: lit ? `0 0 40px ${c.c}55, inset 0 14px 0 rgba(255,255,255,0.28)` : "inset 0 14px 0 rgba(255,255,255,0.12)" }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 30, textAlign: "center", fontFamily: F.mono, fontSize: 22, letterSpacing: 3, color: "#ffffff" }}>{String(i + 1).padStart(2, "0")}</div>
              <div style={{ position: "absolute", left: 0, right: 0, top: 62, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 26, letterSpacing: 2, color: "#ffffff" }}>{c.label}</div>
            </div>
          );
        })}

        {/* the devs at Anthropic, on the tower, with Claude */}
        {rise > 0.05 ? (
          <>
            <Dev x={890} y={towerTop} hoodie={ORANGE} arm={five * 120} flip laptop={false} rim="rgba(255,170,130,0.7)" />
            <Dev x={1000} y={towerTop} hoodie="#c2654a" laptop={false} rim="rgba(255,170,130,0.7)" />
            {/* one huge laptop held between them, a single Claude symbol in the middle of the lid */}
            <div style={{ position: "absolute", left: 882, top: towerTop - 190, width: 126, transform: `scale(${sp(now - T("devs"), 200)})`, transformOrigin: "50% 100%" }}>
              <div style={{ height: 104, borderRadius: 10, background: "linear-gradient(180deg, #e6e8ee, #c9cdd8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(240,140,100,0.45)" }}><ClaudeMark s={56} /></div>
              <div style={{ height: 12, margin: "0 -14px", borderRadius: 6, background: "#a9aebb" }} />
            </div>
          </>
        ) : null}
        {/* their prompt: one short line */}
        {now >= T("guide") && now < T("s1") ? (
          <Card x={540} y={towerTop - 520} w={500} h={120} t={now - T("guide")} fill="#ffffff" r={20} shadow="0 20px 40px rgba(0,0,0,0.4)">
            <div style={{ position: "absolute", left: 22, top: 18, fontFamily: F.mono, fontSize: 16, letterSpacing: 2, color: ORANGE }}>THEIR PROMPT</div>
            <div style={{ position: "absolute", left: 22, top: 50, fontFamily: F.body, fontWeight: 600, fontSize: 26, color: "#16161a" }}>Build sign-up. Done when tests pass.</div>
          </Card>
        ) : null}
        {/* everyone else: the giant scroll */}
        {now >= T("most") && now < T("s1") ? (
          <div style={{ position: "absolute", left: 300, top: GROUND - 20 - scrollH, width: 230, height: scrollH, background: "#ffffff", borderRadius: 10, boxShadow: "0 16px 30px rgba(0,0,0,0.4)", overflow: "hidden", transform: `rotate(${3 - crush * 3}deg)` }}>
            <div style={{ fontFamily: F.mono, fontSize: 14, letterSpacing: 2, color: "#b23b3b", padding: "10px 12px 0" }}>{crush > 0.5 ? "ONE LINE" : "THE GIANT PROMPT"}</div>
            {Array.from({ length: 34 }, (_, i) => <div key={i} style={{ height: 8, margin: "9px 12px 0", borderRadius: 4, width: `${60 + ((i * 37) % 38)}%`, background: "#e3dfd6" }} />)}
          </div>
        ) : null}
        <Dev x={devX} y={devY} hoodie="#3d5cff" squash={land} arm={five * 120} laptop={k === 0} rim="rgba(140,160,255,0.45)" />
        {now >= T("else") && k === 0 ? <In t={now - T("else")} dy={14} style={{ left: 90, top: GROUND + 30, fontFamily: F.mono, fontSize: 24, letterSpacing: 3, color: DIM }}>EVERYONE ELSE</In> : null}

        {/* the hook headline */}
        {now < T("most") ? <In t={now} dy={30} style={{ left: 60, width: 640, top: 420, textAlign: "left", fontFamily: SERIF, fontSize: 104, color: INK, lineHeight: 1.05 }}>A huge <span style={{ fontStyle: "italic", color: "#f0a184" }}>gap.</span></In> : null}

        {/* 01 GOAL: what done looks like */}
        {card("c1") ? (
          <Card x={50} y={240} w={640} h={420} t={now - T("c1")} fill="#ffffff" r={28} shadow="0 30px 60px rgba(0,0,0,0.45)">
            <div style={{ position: "absolute", left: 30, top: 26, fontFamily: F.mono, fontSize: 20, letterSpacing: 3, color: ORANGE }}>01 · GOAL</div>
            <div style={{ position: "absolute", left: 30, top: 64, fontFamily: SERIF, fontSize: 46, color: "#16161a" }}>What <span style={{ fontStyle: "italic" }}>done</span> looks like</div>
            {["Sign-up works end to end", "All tests pass", "Page loads in under 1 s"].map((l, i) => (
              <div key={i} style={{ position: "absolute", left: 30, top: 160 + i * 74, display: "flex", alignItems: "center", gap: 16, fontFamily: F.body, fontWeight: 600, fontSize: 28, color: "#16161a", opacity: c01((now - T("done") - i * 0.2) / 0.15) }}>
                <Check t={now - T("done") - i * 0.2 - 0.1} color={ORANGE} size={40} />{l}
              </div>
            ))}
          </Card>
        ) : null}
        {/* 02 INTERVIEW: Claude asks the questions */}
        {card("c2") ? (
          <Card x={50} y={200} w={660} h={560} t={now - T("c2")} fill="#ffffff" r={28} shadow="0 30px 60px rgba(0,0,0,0.45)">
            <div style={{ position: "absolute", left: 30, top: 24, fontFamily: F.mono, fontSize: 20, letterSpacing: 3, color: "#2f5ff0" }}>02 · INTERVIEW</div>
            <div style={{ position: "absolute", left: 30, right: 30, top: 66, background: "#f3f1ec", borderRadius: 16, padding: "14px 18px", fontFamily: F.mono, fontSize: 22, color: "#16161a", minHeight: 60 }}>&gt; {typed("Interview me until you could write the spec.", now - T("say"), 30)}</div>
            {now >= T("asks") ? (
              <>
                <div style={{ position: "absolute", left: 30, top: 186, display: "flex", alignItems: "center", gap: 10 }}><ClaudeMark s={34} /><span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 22, color: "#16161a" }}>Claude</span></div>
                {[{ q: "Who can sign up?", o: ["Anyone", "Invite only"], pick: 1 }, { q: "How do they log in?", o: ["Email", "Email + Google"], pick: 1 }].map((qq, i) => {
                  const t = now - T("asks") - 0.15 - i * 0.55;
                  return t > 0 ? (
                    <div key={i} style={{ position: "absolute", left: 30, right: 30, top: 236 + i * 130, transform: `scale(${sp(t, 200)})`, transformOrigin: "0 0" }}>
                      <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 24, color: "#16161a" }}>{qq.q}</div>
                      <div style={{ display: "flex", gap: 12, marginTop: 10 }}>{qq.o.map((o, j) => { const on = j === qq.pick && t > 0.4; return <div key={j} style={{ fontFamily: F.body, fontWeight: 600, fontSize: 22, padding: "8px 18px", borderRadius: 12, border: `2px solid ${on ? "#2f5ff0" : "#ddd"}`, background: on ? "#2f5ff0" : "#fff", color: on ? "#fff" : "#16161a" }}>{o}</div>; })}</div>
                    </div>
                  ) : null;
                })}
                {now >= T("asks") + 1.3 ? <div style={{ position: "absolute", left: 30, bottom: 26, fontFamily: F.mono, fontSize: 20, color: "#2f5ff0", opacity: c01((now - T("asks") - 1.3) / 0.2) }}>● writing SPEC.md</div> : null}
              </>
            ) : null}
          </Card>
        ) : null}
        {/* 03 CHECK: tests turn green */}
        {card("c3") ? (
          <Card x={50} y={170} w={640} h={420} t={now - T("c3")} fill="#ffffff" r={28} shadow="0 30px 60px rgba(0,0,0,0.45)">
            <div style={{ position: "absolute", left: 30, top: 26, fontFamily: F.mono, fontSize: 20, letterSpacing: 3, color: "#1f9d68" }}>03 · CHECK</div>
            {["sign-up creates a user", "login with Google works", "page loads under 1 s"].map((l, i) => {
              const green = now >= T("green") + i * 0.25;
              return (
                <div key={i} style={{ position: "absolute", left: 30, right: 30, top: 80 + i * 76, display: "flex", alignItems: "center", gap: 16, fontFamily: F.mono, fontSize: 24, color: "#16161a" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 17, background: green ? "#1f9d68" : "#d64545", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.body, fontWeight: 800, fontSize: 22, transform: `scale(${green ? 1 + 0.2 * (1 - c01((now - T("green") - i * 0.25) / 0.2)) : 1})` }}>{green ? "✓" : "✕"}</div>{l}
                </div>
              );
            })}
            {now >= T("finished") ? <In t={now - T("finished")} style={{ left: 30, top: 330, fontFamily: SERIF, fontSize: 64, color: "#1f9d68" }}>Done ✓</In> : null}
          </Card>
        ) : null}
        {/* the comment */}
        {now >= T("comment") ? (
          <In t={now - T("comment")} style={{ left: 0, right: 0, top: 260, display: "flex", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, background: "#ffffff", borderRadius: 999, padding: "18px 40px 18px 18px", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
              <div style={{ width: 64, height: 64, borderRadius: 32, background: "#ece8e0" }} />
              <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 48, color: "#8a857a" }}>Comment</span>
              <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 56, color: "#16161a", letterSpacing: 3, minWidth: 200 }}>{typed("GUIDE", now - T("comment") - 0.3, 12)}</span>
            </div>
          </In>
        ) : null}
        {words ? <Captions words={words} now={now} ink={INK} accent="#f0a184" /> : null}
      </div>
    );
  },
  hits: ({ at, p }) => {
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => at(parts[k]);
    const soft = 0.62;
    return [
      { t: T("gap"), sound: "impact", gain: 0.35 }, { t: T("gap"), sound: "subdrop", gain: 0.4 },
      { t: T("most") + 0.2, sound: "paper", gain: 0.25 * soft },
      { t: T("opposite") + 0.05, sound: "snap", gain: 0.3 * soft },
      { t: T("s1"), sound: "bass", gain: 0.3 * soft }, { t: T("s2"), sound: "bass", gain: 0.3 * soft }, { t: T("s3"), sound: "bass", gain: 0.3 * soft },
      { t: T("s1") + 0.87, sound: "thud", gain: 0.3 * soft }, { t: T("s2") + 0.87, sound: "thud", gain: 0.3 * soft }, { t: T("s3") + 0.87, sound: "thud", gain: 0.3 * soft },
      { t: T("done") + 0.1, sound: "tick", gain: 0.25 * soft },
      { t: T("say"), sound: "typing", gain: 0.15 * soft },
      { t: T("asks") + 0.55, sound: "click", gain: 0.2 * soft },
      { t: T("green"), sound: "ding", gain: 0.2 * soft },
      { t: T("goal3"), sound: "riser", gain: 0.25 },
      { t: T("top") + 0.42, sound: "thud", gain: 0.35 }, { t: T("five"), sound: "clap", gain: 0.35 },
    ];
  },
};
