// HTML overlays for the bubble film (v6): series tag, hook headline, anonymous Instagram questions, glass chips,
// conductor beams, the "in plain words" card, the pipeline, the comment prompt and the end card.
// v6 layout: he is a big cut-out bottom-left (SIDE_FACE ~x 0-680, y 770-1390). Main graphics in the top band
// (y 280-760, x 40-940), secondary ones in the right column (x 700-950, y 770-1290), captions below (y 1300+).
import React from "react";
import { B } from "../beats";
import { OUTRO, lerp, popS, progS } from "../lib";
import { project, type V3 } from "./cam";
import { DESK0, OBJ_ARRIVE, OBJ_LABEL, OBJ_ORDER, OBJ_POS, OBJ_SCALE, STEPS, poseAt, win } from "./rig";
import { agentLocal, objK } from "./scene";
import { T, tw } from "./timing";
import { UI_FONT, editorLines } from "./tex";

export const CYAN = "#5ee7ff", MAGENTA = "#ff5fd2", GOLD = "#ffc94a", MINT = "#4dff9d";
export const IRI_GRAD = (_t: number) => "linear-gradient(100deg, #7df3ff 0%, #ff7ad9 50%, #ffd36a 100%)";
const IG_GRAD = "linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5)";
const DM_GRAD = "linear-gradient(135deg, #a033ff 0%, #6a5cff 55%, #2f8bff 100%)";
// Per creator/series (configurable): the end-card handle and the persistent series tag (the format comes from news-qa-reel).
export const HANDLE = "@madhav_somani";
export const SERIES = "MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS";

export const anchor = (t: number, p: V3) => {
  const [x, y, d] = project(poseAt(t), p);
  return { x, y, ok: d > 0 };
};
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// w = fixed width: the chip wraps inside it (used in the narrow right column)
type ChipProps = { x: number; y: number; text: React.ReactNode; k: number; color?: string; size?: number; align?: "left" | "center" | "right"; sub?: React.ReactNode; w?: number };
const rgb = (c: string) => c === GOLD ? "255,201,74" : c === MAGENTA ? "255,95,210" : c === MINT ? "77,255,157" : "94,231,255";
export const Chip: React.FC<ChipProps> = ({ x, y, text, k, color = CYAN, size = 40, align = "center", sub, w }) => {
  if (k <= 0.001) return null;
  const tx = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  const e = rgb(color);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, transform: `translate(${tx}, -50%) scale(${lerp(0.9, 1, k)})`, transformOrigin: align === "left" ? "0 50%" : "50% 50%", opacity: Math.min(1, k * 1.3), fontFamily: UI_FONT, whiteSpace: w ? "normal" : "nowrap", textAlign: align === "left" ? "left" : "center" }}>
      <div style={{
        padding: `${size * 0.3}px ${size * 0.5}px`, borderRadius: size * 0.55,
        background: "linear-gradient(180deg, rgba(14,22,56,.84), rgba(6,10,30,.78))",
        border: `2px solid rgba(${e},.7)`,
        boxShadow: `0 0 26px rgba(${e},.32), inset 0 1px 0 rgba(255,255,255,.2), 0 12px 34px rgba(0,0,0,.6)`,
        color: "#f2f7ff", fontSize: size, fontWeight: 700, letterSpacing: "-0.005em", lineHeight: 1.1, textShadow: "0 2px 10px rgba(0,0,0,.8)",
      }}>
        {text}
        {sub && <div style={{ fontSize: Math.max(30, size * 0.8), fontWeight: 700, color: `rgba(${e},1)`, marginTop: size * 0.12 }}>{sub}</div>}
      </div>
    </div>
  );
};
const Hi: React.FC<{ c: string; children: React.ReactNode }> = ({ c, children }) => <span style={{ color: c }}>{children}</span>;
const RX = 826, RW = 244; // right-column centre x and chip width

// paper-plane (IG DM) icon
const Plane: React.FC<{ s: number; c?: string }> = ({ s, c = "#fff" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round">
    <path d="M22 3 L9.2 10.1" /><path d="M22 3 L14.6 21 L11.2 13.2 L3 10.4 Z" />
  </svg>
);

// ---- persistent series tag (frame 0 to the end), styled like an IG chip ----------------------------------
const SeriesTag: React.FC = () => (
  <div style={{ position: "absolute", left: 40, top: 230, fontFamily: UI_FONT, padding: 3, borderRadius: 999, background: IG_GRAD, boxShadow: "0 8px 24px rgba(0,0,0,.55)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 22px 8px 12px", borderRadius: 999, background: "rgba(14,14,20,.92)" }}>
      <div style={{ width: 34, height: 34, borderRadius: 17, background: IG_GRAD, display: "flex", alignItems: "center", justifyContent: "center" }}><Plane s={20} /></div>
      <div style={{ fontSize: 25, fontWeight: 800, color: "#fff", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{SERIES}</div>
    </div>
  </div>
);

// ---- hook headline (frame 0 = cover): EXACTLY "I barely write code anymore. Here's what I do instead." ----
const HookTitle: React.FC<{ t: number }> = ({ t }) => {
  const out = progS(t, B.q1.s - 0.2, 0.25);
  if (out >= 1) return null;
  return (
    <div style={{ position: "absolute", left: 40, width: 900, top: 306, fontFamily: UI_FONT, opacity: 1 - out }}>
      <div style={{ padding: "28px 34px 30px", borderRadius: 34, background: "linear-gradient(180deg, rgba(8,12,38,.86), rgba(4,6,22,.8))", border: "2px solid rgba(255,201,74,.55)", boxShadow: "0 18px 50px rgba(0,0,0,.7), 0 0 40px rgba(125,243,255,.15)" }}>
        <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.03em", color: "#fff", textShadow: "0 4px 20px rgba(0,0,0,.8)" }}>
          I barely{" "}
          <span style={{ backgroundImage: IRI_GRAD(0), WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", textShadow: "none" }}>write code</span>{" "}
          anymore.
        </div>
        <div style={{ marginTop: 18, fontSize: 60, fontWeight: 700, lineHeight: 1.1, color: "#eaf2ff" }}>
          Here's what I do <span style={{ color: GOLD }}>instead.</span>
        </div>
      </div>
    </div>
  );
};

// ---- a question he reads out, shown as an anonymous Instagram DM (no username, photo, time or counts) ----------
type QWord = { w: string; c?: string; at?: number };
const IGQuestion: React.FC<{ t: number; a: number; b: number; words: QWord[]; size?: number }> = ({ t, a, b, words, size = 66 }) => {
  const k = popS(t, a, 14) * (1 - progS(t, b - 0.2, 0.2));
  if (k <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 40, width: 900, top: 306, fontFamily: UI_FONT, opacity: Math.min(1, k * 1.3), transform: `scale(${lerp(0.94, 1, k)})`, transformOrigin: "10% 0" }}>
      <div style={{ padding: "22px 26px 30px", borderRadius: 38, background: "rgba(16,16,22,.95)", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 18px 50px rgba(0,0,0,.65)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 58, height: 58, borderRadius: 29, background: "#3a3a46", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900, color: "#cfcfe0" }}>?</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#fff" }}>Anonymous</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,.6)" }}><Plane s={30} c="rgba(255,255,255,.75)" /> IG question</div>
        </div>
        <div style={{ marginTop: 20, display: "inline-block", padding: "22px 30px 24px", borderRadius: "34px 34px 34px 10px", background: DM_GRAD }}>
          <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.015em", color: "#fff" }}>
            {words.map((x, i) => {
              const on = x.at === undefined ? 1 : progS(t, x.at - 0.05, 0.2);
              return <React.Fragment key={i}>{i ? " " : ""}<span style={{ color: x.c && on > 0.5 ? x.c : undefined }}>{x.w}</span></React.Fragment>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
const qWords = (s: string, marks: Record<string, [string, number]> = {}): QWord[] =>
  s.split(" ").map((w) => { const m = marks[w.toLowerCase().replace(/[^a-z']/g, "")]; return { w, c: m?.[0], at: m?.[1] }; });

// small "MY ANSWER" tag above an answer chip
const ATag: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => {
  if (k <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${lerp(0.85, 1, k)})`, opacity: Math.min(1, k * 1.3), fontFamily: UI_FONT, display: "flex", alignItems: "center", gap: 10, padding: "6px 16px 6px 8px", borderRadius: 999, background: "rgba(6,10,32,.85)", border: "2px solid rgba(255,201,74,.7)", whiteSpace: "nowrap" }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: GOLD, color: "#0a0f2e", fontSize: 26, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>A</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: GOLD, letterSpacing: "0.06em" }}>MY ANSWER</div>
    </div>
  );
};

// ---- conductor beams: from "Me: the conductor" (under the monitor) to the workflow nodes in the right column ----
const COND_XY: [number, number] = [300, 728];
const BEAM_FROM: [number, number] = [478, 728];
const Beams: React.FC<{ t: number }> = ({ t }) => {
  const on = win(t, B.steps.s + 0.2, B.plain.s, 0.3, 0.2);
  if (on <= 0.01) return null;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="beam" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#ffc94a" /><stop offset="0.5" stopColor="#ff7ad9" /><stop offset="1" stopColor="#7df3ff" /></linearGradient>
        <filter id="bglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {STEPS.map((s) => {
        const a = anchor(t, add(DESK0, s.p));
        const k = progS(t, s.t - 0.15, 0.35);
        if (!a.ok || k <= 0) return null;
        const [x0, y0] = BEAM_FROM, cx = a.x - 20, cy = y0;
        const L = 900;
        const active = Math.exp(-Math.pow((t - s.t - 0.2) / 0.6, 2));
        return <path key={s.id} d={`M ${x0} ${y0} Q ${cx} ${cy} ${a.x - 12} ${a.y}`} fill="none" stroke="url(#beam)" strokeWidth={3 + 3 * active} strokeLinecap="round" strokeDasharray={`${L * k} ${L}`} opacity={on * (0.5 + 0.5 * active)} filter="url(#bglow)" />;
      })}
      <circle cx={BEAM_FROM[0]} cy={BEAM_FROM[1]} r={8} fill="#fff1c8" opacity={on} filter="url(#bglow)" />
    </svg>
  );
};

// ---- "In plain words": managing AI agents vs writing code (right column) ---------------------------------
const Plain: React.FC<{ t: number }> = ({ t }) => {
  const k = popS(t, B.plain.s + 0.05, 14) * (1 - progS(t, B.old.s - 0.15, 0.15));
  if (k <= 0.001) return null;
  const a = progS(t, T.manage - 0.05, 0.6), b = progS(t, T.writing - 0.05, 0.5);
  const row = (label: string, c: string, w: number, on: number, arrow: string) => (
    <div style={{ marginTop: 22, opacity: Math.min(1, on * 2) }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#f2f7ff", lineHeight: 1.1 }}>{label} <span style={{ color: c }}>{arrow}</span></div>
      <div style={{ marginTop: 10, height: 28, borderRadius: 14, background: "rgba(255,255,255,.08)" }}>
        <div style={{ width: `${w * on * 100}%`, height: "100%", borderRadius: 14, background: c, boxShadow: `0 0 22px ${c}` }} />
      </div>
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 700, width: 248, top: 790, fontFamily: UI_FONT, opacity: Math.min(1, k * 1.3), transform: `scale(${lerp(0.92, 1, k)})`, transformOrigin: "50% 0" }}>
      <div style={{ padding: "22px 20px 26px", borderRadius: 28, background: "linear-gradient(180deg, rgba(14,22,56,.88), rgba(6,10,30,.82))", border: "2px solid rgba(255,201,74,.6)", boxShadow: "0 14px 40px rgba(0,0,0,.6)" }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: GOLD, lineHeight: 1.05 }}>In plain words</div>
        <div style={{ fontSize: 28, fontWeight: 600, color: "#cfe0ff", marginTop: 6 }}>Madhav's work now</div>
        {row("Managing AI agents", CYAN, 0.92, a, "▲")}
        {row("Writing code", MAGENTA, 0.28, b, "▼")}
      </div>
    </div>
  );
};

// ---- comment prompt (Instagram-style; no usernames, no counts), top band left of the planet ---------------
const CommentPrompt: React.FC<{ t: number }> = ({ t }) => {
  const k = popS(t, B.comment.s + 0.05, 14) * (1 - progS(t, B.end.s - 0.1, 0.2));
  if (k <= 0.001) return null;
  const typed = progS(t, T.comment, 0.5);
  return (
    <div style={{ position: "absolute", left: 40, width: 470, top: 330, fontFamily: UI_FONT, opacity: Math.min(1, k * 1.3), transform: `scale(${lerp(0.92, 1, k)})`, transformOrigin: "50% 0" }}>
      <div style={{ padding: "26px 24px", borderRadius: 30, background: "rgba(24,24,30,.95)", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 14px 40px rgba(0,0,0,.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: "none", width: 58, height: 58, borderRadius: 29, padding: 3, background: IG_GRAD }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 26, background: "#1b1b22" }} />
          </div>
          <div style={{ fontSize: 50, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>Bubble or not?</div>
        </div>
        <div style={{ marginTop: 22, padding: "16px 22px", borderRadius: 28, border: "2px solid rgba(255,255,255,.22)", fontSize: 38, whiteSpace: "nowrap", color: typed > 0.5 ? "#fff" : "rgba(255,255,255,.55)", fontWeight: 600 }}>
          {typed > 0.5 ? "Comment your take" : "Add a comment..."}
        </div>
      </div>
    </div>
  );
};

// ---- end card (title in the top band, follow in the right column) ------------------------------------------
const EndCard: React.FC<{ t: number }> = ({ t }) => {
  const t0 = B.end.s;
  if (t < t0 - 0.05) return null;
  const a = popS(tw(t), t0, 15), b = progS(t, OUTRO.t, 0.35), c = progS(t, OUTRO.t + 0.7, 0.35);
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: UI_FONT, color: "#fff", textAlign: "center" }}>
      <div style={{ position: "absolute", left: 40, width: 900, top: 310, opacity: Math.min(1, a * 1.4), transform: `translateY(${(1 - a) * 20}px)` }}>
        <div style={{ display: "inline-block", padding: "22px 36px", borderRadius: 34, background: "rgba(6,10,32,.72)", border: "2px solid rgba(255,201,74,.5)", boxShadow: "0 14px 50px rgba(0,0,0,.7)", fontSize: 92, fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.025em", textShadow: "0 4px 24px rgba(0,0,0,.9)" }}>
          Is the AI boom<br />
          <span style={{ backgroundImage: IRI_GRAD(0), WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", textShadow: "none" }}>a bubble?</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 700, width: 250, top: 960, opacity: b, transform: `translateY(${(1 - b) * 14}px)` }}>
        <div style={{ padding: "18px 16px", borderRadius: 26, background: "rgba(6,10,32,.8)", border: "2px solid rgba(94,231,255,.5)", fontSize: 44, fontWeight: 800, lineHeight: 1.08, textShadow: "0 3px 18px rgba(0,0,0,.95)" }}>
          Follow for more <span style={{ color: GOLD }}>AI news</span>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#cfe9ff", marginTop: 10, opacity: c }}>{HANDLE}</div>
        </div>
      </div>
    </div>
  );
};

// ---- the pipeline (top band, 2 x 3): Write code -> Raise PR -> Review | Approve -> QA -> Deploy; then stamped AI ----
const ROWS = () => [
  { label: "Write code", lit: T.writeCode, ai: T.aiBuild },
  { label: "Raise a PR", lit: T.raisePR, ai: T.aiBuild + 0.2 },
  { label: "Review", lit: T.reviewing, ai: T.aiReview },
  { label: "Approve", lit: T.approve, ai: T.aiApprove },
  { label: "QA", lit: T.qa1, ai: T.aiQA },
  { label: "Deploy", lit: T.deploy1, ai: T.aiDeploy },
];
export const STAMP_T = () => ROWS().map((r) => r.ai);
const Person: React.FC<{ c: string }> = ({ c }) => (
  <svg width={34} height={34} viewBox="0 0 30 30"><circle cx={15} cy={10} r={6} fill={c} /><path d="M 4 29 Q 4 17 15 17 Q 26 17 26 29 Z" fill={c} /></svg>
);
const PIPE_X = [40, 500], PIPE_W = 440, PIPE_Y0 = 518, PIPE_DY = 86;
const Pipeline: React.FC<{ t: number }> = ({ t }) => {
  const on = popS(t, B.old.s + 0.05, 15) * (1 - progS(t, B.stay.s - 0.2, 0.2));
  if (on <= 0.001) return null;
  const rows = ROWS();
  const aiMode = t >= B.ai.s;
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: UI_FONT, opacity: Math.min(1, on * 1.3) }}>
      {/* header across the top band */}
      <div style={{ position: "absolute", left: 40, width: 900, top: 300 }}>
        <div style={{ padding: "16px 28px 18px", borderRadius: 30, background: "linear-gradient(180deg, rgba(14,22,56,.9), rgba(6,10,30,.84))", border: `2px solid ${aiMode ? "rgba(255,95,210,.75)" : "rgba(94,231,255,.6)"}`, boxShadow: "0 14px 40px rgba(0,0,0,.6)" }}>
          {!aiMode ? (
            <>
              <div style={{ fontSize: 54, fontWeight: 800, color: "#fff", lineHeight: 1.05 }}><span style={{ fontSize: 32, color: CYAN, letterSpacing: "0.05em", marginRight: 16 }}>BEFORE</span>How a feature shipped</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#cfe0ff", marginTop: 6 }}>a person at every step</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 54, fontWeight: 800, color: "#fff", lineHeight: 1.05 }}><span style={{ fontSize: 32, color: MAGENTA, letterSpacing: "0.05em", marginRight: 16 }}>NOW</span><Hi c={MAGENTA}>AI</Hi> at every step</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: GOLD, marginTop: 6 }}>Madhav's experience</div>
            </>
          )}
        </div>
      </div>
      {/* connectors */}
      {PIPE_X.map((x, j) => <div key={j} style={{ position: "absolute", left: x + 36, top: PIPE_Y0, width: 4, height: PIPE_DY * 2, background: "linear-gradient(180deg, rgba(94,231,255,.7), rgba(255,95,210,.7))", borderRadius: 2 }} />)}
      {rows.map((r, i) => {
        const x = PIPE_X[Math.floor(i / 3)], y = PIPE_Y0 + (i % 3) * PIPE_DY;
        const rk = popS(t, B.old.s + 0.15 + i * 0.06, 15);
        const lit = progS(t, r.lit - 0.1, 0.25);
        const ai = progS(t, r.ai - 0.05, 0.22);
        const c = ai > 0.5 ? MAGENTA : CYAN;
        const hot = Math.max(lit, ai);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y - 36, width: PIPE_W, height: 72, opacity: Math.min(1, rk * 1.3) * (0.5 + 0.5 * hot), transform: `scale(${lerp(0.92, 1, rk)})`, transformOrigin: "0 50%" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 36, background: "linear-gradient(180deg, rgba(14,22,56,.92), rgba(6,10,30,.88))", border: `2px solid rgba(${rgb(c)},${0.35 + 0.5 * hot})`, boxShadow: `0 0 ${18 * hot}px rgba(${rgb(c)},.4)` }} />
            <div style={{ position: "absolute", left: 10, top: 9, width: 54, height: 54, borderRadius: 27, background: ai > 0.5 ? "linear-gradient(135deg, #ff7ad9, #7df3ff)" : "rgba(94,231,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0a0f2e", fontSize: 24, fontWeight: 900 }}>
              {ai > 0.5 ? "AI" : <Person c="#bfefff" />}
            </div>
            <div style={{ position: "absolute", left: 80, top: 0, height: 72, display: "flex", alignItems: "center", fontSize: 40, fontWeight: 800, color: "#f2f7ff" }}>{r.label}</div>
            {ai > 0.001 && (
              <div style={{ position: "absolute", right: 16, top: 8, height: 56, padding: "0 16px", display: "flex", alignItems: "center", borderRadius: 10, border: `4px solid ${MAGENTA}`, color: MAGENTA, fontSize: 42, fontWeight: 900, letterSpacing: "0.04em", background: "rgba(40,6,40,.6)", transform: `rotate(-9deg) scale(${lerp(1.6, 1, ai)})`, opacity: ai, boxShadow: "0 0 18px rgba(255,95,210,.45)" }}>AI</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ---- all overlays -----------------------------------------------------------------------------
export const Overlays: React.FC<{ t: number; covered: boolean }> = ({ t }) => {
  const chips: React.ReactNode[] = [];
  const push = (key: string, el: React.ReactNode) => chips.push(<React.Fragment key={key}>{el}</React.Fragment>);
  const live = (a: number, b: number, d = 13) => popS(t, a, d) * (1 - progS(t, b - 0.2, 0.2));

  // Q1 (an anonymous IG question he reads) + the answer: Big Tech is pouring billions in
  const q1 = <IGQuestion t={t} a={B.q1.s} b={B.money.s} words={qWords("Is the AI boom the future, or a bubble about to pop?", { future: [CYAN, T.future], bubble: ["#ffd36a", T.bubble1], pop: ["#ffd36a", T.pop] })} />;
  push("atag1", <ATag x={540} y={322} k={live(B.money.s + 0.05, B.touch.s)} />);
  push("money", <Chip x={540} y={398} k={live(T.pouring - 0.1, B.touch.s)} color={GOLD} size={52} text={<>Big Tech is pouring <Hi c={GOLD}>billions</Hi> in</>} />);
  // touch: header + icon labels, each on its word
  push("touch", <Chip x={540} y={322} k={live(T.aiNow - 0.05, B.q2.s)} color={GOLD} size={44} text={<>AI now touches <Hi c={GOLD}>everything</Hi></>} />);
  if (t > B.touch.s && t < B.q2.s) {
    OBJ_ORDER.forEach((id, i) => {
      const k = Math.min(1, objK(t, i)) * progS(t, OBJ_ARRIVE(i) - 0.1, 0.3) * (1 - progS(t, B.q2.s - 0.2, 0.2));
      const a = anchor(t, add(OBJ_POS[id], [0, -0.68 * OBJ_SCALE, 0]));
      if (!a.ok || k <= 0.01) return;
      push("o" + id, <Chip x={Math.min(812, Math.max(130, a.x))} y={Math.min(1250, a.y)} k={k} size={32} color={i % 3 === 0 ? CYAN : i % 3 === 1 ? MAGENTA : GOLD} text={OBJ_LABEL[id]} />);
    });
  }
  // Q2 (an anonymous IG question) + the answer at the desk
  const q2 = <IGQuestion t={t} a={B.q2.s} b={B.msft.s + 0.1} words={qWords("What's actually changed in your job?", { changed: ["#ffd36a", T.changed], job: [CYAN, T.job] })} size={72} />;
  push("atag2", <ATag x={RX} y={782} k={live(B.msft.s + 0.05, B.code.s)} />);
  push("msft", <Chip x={RX} y={905} w={RW} k={live(T.microsoft - 0.25, T.evolved - 0.05)} color={CYAN} size={40} text="Madhav" sub={<>works at <Hi c={CYAN}>Microsoft</Hi></>} />);
  push("evolved", <Chip x={RX} y={920} w={RW} k={live(T.evolved - 0.05, B.code.s)} color={CYAN} size={38} text="How we work:" sub="completely evolved" />);
  push("code", <Chip x={RX} y={880} w={RW} k={live(T.dontCode, B.night.s)} color={GOLD} size={38} text="Writing code" sub={<Hi c={GOLD}>→ the AI agent</Hi>} />);
  push("night", <Chip x={RX} y={915} w={RW} k={live(T.night - 0.3, B.orch.s)} color={GOLD} size={38} text="Before: coded every night" sub={progS(t, T.butNow, 0.2) > 0.5 ? "Now: I don't" : " "} />);
  if (t > B.msft.s - 0.2 && t < B.orch.s) {
    const ag = anchor(t, add(DESK0, add(agentLocal(t, editorLines(t)), [0, 0.09, 0])));
    const agk = live(T.evolved + 0.5, B.night.s);
    if (ag.ok) push("agent", <Chip x={Math.min(880, ag.x)} y={Math.max(320, ag.y - 34)} k={agk} color={CYAN} size={32} text="AI agent" />);
  }
  // orchestrate + workflow (right column)
  push("orch", <Chip x={RX} y={814} w={RW} k={live(T.orchestrate - 0.1, B.plain.s)} color={GOLD} size={34} text={<>Now: I <Hi c={GOLD}>orchestrate</Hi></>} />);
  if (t > B.orch.s && t < B.plain.s) {
    STEPS.forEach((s, i) => {
      const a = anchor(t, add(DESK0, s.p));
      const lit = t > s.t - 0.1;
      const done = i === 3 && t > T.output;
      const k = popS(t, B.orch.s + 0.35 + i * 0.08, 14);
      if (a.ok) push("s" + s.id, <Chip x={a.x + 26} y={a.y} align="left" w={i === 3 ? 200 : undefined} k={k} size={32} color={done ? MINT : lit ? [CYAN, MAGENTA, GOLD, CYAN][i] : CYAN}
        text={<span style={{ opacity: lit ? 1 : 0.45 }}>{s.label}{done ? " ✓" : ""}</span>} />);
    });
    push("cond", <Chip x={COND_XY[0]} y={COND_XY[1]} k={live(B.steps.s + 0.3, B.plain.s)} color={GOLD} size={34} text={<>Me: the <Hi c={GOLD}>conductor</Hi></>} />);
  }
  // it's gonna stay (top band, left of the planet)
  push("stay", <Chip x={270} y={470} w={420} k={live(B.stay.s + 0.25, B.comment.s)} color={GOLD} size={50} text="Madhav's take:" sub={<>AI is <Hi c={GOLD}>gonna stay</Hi></>} />);
  return (
    <>
      <SeriesTag />
      <HookTitle t={t} />
      <Beams t={t} />
      {chips}
      {q1}
      {q2}
      <Plain t={t} />
      <Pipeline t={t} />
      <CommentPrompt t={t} />
      <EndCard t={t} />
    </>
  );
};
