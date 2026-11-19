// v5 HTML overlays (v3 layout). He is always the cut-out bottom-left (box x 0-713, y 653-1920; face x 90-370, y 940-1240) and the
// captions sit at x 555-930, y 1215-1500, so every graphic lives in the TOP BAND (y 220-640, x 80-940) or the RIGHT
// COLUMN (x 560-940, y 640-1180). World-anchored labels are clamped into those zones.
import React from "react";
import { B } from "../beats";
import { OUTRO, lerp, popS, progS } from "../lib";
import { TILE, add, project, type V3 } from "./cam";
import { C } from "./parts";
import { T } from "./timing";
import { CHAIN, NIGHT, SCALE, GLOW } from "./times";
import { ART_BOT, ART_GUY, CHAI_A, CHAI_B, DIAMOND, PAINTING, panWorld } from "./tiles";
import { DiamondIcon, Heart, HumanIcon, INK, Pill, ROUND, RobotIcon, Sparkle, Stamp } from "./ui";

const win = (t: number, a: number, b: number, d = 11, out = 0.25) => (t < a - 0.05 || t > b + out ? 0 : popS(t, a, d) * (1 - progS(t, b, out)));
const tileTop = (p: V3, y = 0.18): V3 => [p[0], y, p[2]];
const A = (t: number, p: V3) => project(t, p);
const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
// v6: he is big bottom-left (head + hair ~x 40-660, y 800+). World-anchored labels (bottom-anchored, centred) are
// clamped into the top band; small world effects are drawn only where they can't touch his head.
const RC = (x: number, y: number, halfW = 170): [number, number] => [cl(x, 60 + halfW, 1000 - halfW), cl(y, 440, 780)];
const clr = (x: number, y: number) => y < 780 || x > 690;

const ext = (c: string) => `0 3px 0 ${c}, 0 6px 0 ${c}, 0 9px 0 ${c}, 0 16px 24px rgba(59,47,92,.35)`;

// Frame-0 hook headline (his exact spoken hook), big in the top band; holds until his first question.
const Hook: React.FC<{ t: number }> = ({ t }) => {
  const k = 1 - progS(t, Math.min(T.hookEnd + 0.15, T.askFirst - 0.3), 0.3);
  if (k <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 60, width: 880, top: 300, textAlign: "center", fontFamily: ROUND, fontWeight: 700, opacity: k, transform: `translateY(${(1 - k) * -30}px)` }}>
      <div style={{ fontSize: 74, lineHeight: 1.04, color: "#fff", textShadow: ext(INK) }}>
        <span style={{ color: C.lav }}>ROBOTS</span> WILL TAKE<br />THESE <span style={{ color: C.butter }}>JOBS</span> FIRST.
      </div>
      <div style={{ display: "inline-block", marginTop: 26, background: C.coral, color: "#fff", fontSize: 52, padding: "8px 34px 12px", borderRadius: 40, boxShadow: `0 8px 0 ${C.coralDeep}, 0 18px 30px rgba(59,47,92,.3)` }}>Is yours on the list?</div>
    </div>
  );
};

// v6: a question he reads, shown as an anonymous Instagram DM (c2-bubble design; no username, photo, time or counts)
const UI_FONT = `"Segoe UI", "Segoe UI Variable Display", Arial, sans-serif`;
const IG_GRAD = "linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5)";
const DM_GRAD = "linear-gradient(135deg, #a033ff 0%, #6a5cff 55%, #2f8bff 100%)";
const Plane: React.FC<{ s: number; c?: string }> = ({ s, c = "#fff" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round">
    <path d="M22 3 L9.2 10.1" /><path d="M22 3 L14.6 21 L11.2 13.2 L3 10.4 Z" />
  </svg>
);
// persistent series tag (frame 0 to the end), styled like an IG chip
const SeriesTag: React.FC = () => (
  <div style={{ position: "absolute", left: 40, top: 230, fontFamily: UI_FONT, padding: 3, borderRadius: 999, background: IG_GRAD, boxShadow: "0 8px 24px rgba(59,47,92,.45)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 22px 8px 12px", borderRadius: 999, background: "rgba(14,14,20,.92)" }}>
      <div style={{ width: 34, height: 34, borderRadius: 17, background: IG_GRAD, display: "flex", alignItems: "center", justifyContent: "center" }}><Plane s={20} /></div>
      <div style={{ fontSize: 25, fontWeight: 800, color: "#fff", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS</div>
    </div>
  </div>
);
const QBubble: React.FC<{ t: number; a: number; b: number; children: React.ReactNode; size?: number }> = ({ t, a, b, children, size = 66 }) => {
  const k = popS(t, a, 14) * (1 - progS(t, b - 0.2, 0.2));
  if (k <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 40, width: 900, top: 306, fontFamily: UI_FONT, opacity: Math.min(1, k * 1.3), transform: `scale(${lerp(0.94, 1, k)})`, transformOrigin: "10% 0" }}>
      <div style={{ padding: "22px 26px 30px", borderRadius: 38, background: "rgba(16,16,22,.95)", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 18px 50px rgba(30,20,60,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 58, height: 58, borderRadius: 29, background: "#3a3a46", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900, color: "#cfcfe0" }}>?</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#fff" }}>Anonymous</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,.6)" }}><Plane s={30} c="rgba(255,255,255,.75)" /> IG question</div>
        </div>
        <div style={{ marginTop: 20, display: "inline-block", padding: "22px 30px 24px", borderRadius: "34px 34px 34px 10px", background: DM_GRAD }}>
          <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.015em", color: "#fff" }}>{children}</div>
        </div>
      </div>
    </div>
  );
};

// v4 "A / MY ANSWER" tag: sits right above his caption when his real answer starts (twice per video).
const ATag: React.FC<{ t: number; a: number }> = ({ t, a }) => {
  const k = win(t, a, a + 1.9, 11, 0.25);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 700, top: 1284, transform: `translateY(-100%) scale(${lerp(0.6, 1, k)})`, transformOrigin: "0 100%", opacity: Math.min(1, k * 1.6), fontFamily: ROUND, display: "flex", alignItems: "center", gap: 12, background: C.coral, color: "#fff", borderRadius: 34, padding: "8px 24px 10px 10px", fontSize: 32, fontWeight: 700, boxShadow: `0 6px 0 ${C.coralDeep}, 0 14px 24px rgba(59,47,92,.3)`, whiteSpace: "nowrap" }}>
      <div style={{ width: 52, height: 52, borderRadius: 26, background: "#fff", color: C.coralDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>A</div>
      MY ANSWER
    </div>
  );
};

// End-card title (top band)
const EndTitle: React.FC<{ k: number }> = ({ k }) =>
  k <= 0.001 ? null : (
    <div style={{ position: "absolute", left: 60, width: 880, top: 320, textAlign: "center", fontFamily: ROUND, fontWeight: 700, fontSize: 84, lineHeight: 1.04, color: "#fff", textShadow: ext(INK), opacity: Math.min(1, k * 1.5), transform: `translateY(${(1 - k) * 30}px)` }}>
      WHICH JOBS WILL<br /><span style={{ color: C.lav }}>ROBOTS</span> TAKE <span style={{ color: C.butter }}>FIRST?</span>
    </div>
  );

// Instagram-style comment prompt (no usernames, no counts)
const CommentCard: React.FC<{ t: number }> = ({ t }) => {
  const k = win(t, T.comment, B.end.s - 0.05, 12);
  if (k <= 0) return null;
  const typed = progS(t, T.commentBelow, 0.6, (x) => x);
  return (
    <div style={{ position: "absolute", left: 120, width: 780, top: 320, fontFamily: ROUND, opacity: Math.min(1, k * 1.5), transform: `scale(${lerp(0.85, 1, k)})`, transformOrigin: "15% 100%" }}>
      <svg width={200} height={150} viewBox="0 0 200 150" style={{ position: "absolute", left: 40, bottom: -118, overflow: "visible" }}>
        <path d="M40 0 L150 0 L20 128 Z" fill="#fff" />
      </svg>
      <div style={{ position: "relative", background: "#fff", borderRadius: 40, padding: "26px 34px 30px", boxShadow: "0 10px 0 rgba(59,47,92,.2), 0 26px 50px rgba(59,47,92,.3)" }}>
        <div style={{ fontSize: 34, fontWeight: 600, color: "#8a84a3", textAlign: "center", marginBottom: 18 }}>Comments</div>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, background: `linear-gradient(135deg, ${C.coral}, ${C.lav})`, flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}><RobotIcon size={44} /></div>
          <div style={{ fontSize: 50, fontWeight: 700, color: INK, lineHeight: 1.12 }}>Which job do you think is <span style={{ color: C.coralDeep }}>safe from robots?</span></div>
        </div>
        <div style={{ marginTop: 26, border: "3px solid #e4e0ef", borderRadius: 34, padding: "12px 26px", fontSize: 38, color: typed > 0 ? INK : "#a39fb8", fontWeight: 600 }}>
          {typed > 0 ? "Comment below" + (typed < 1 ? "" : " \u{1F447}") : "Add a comment..."}
        </div>
      </div>
    </div>
  );
};

// little SVG icons used only in v5 labels
const Moon: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40"><path d="M27 4 A16 16 0 1 0 36 26 A13 13 0 0 1 27 4Z" fill={C.butter} stroke={C.butterDeep} strokeWidth="2" /></svg>
);
const ChaiIcon: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <path d="M14 4 C11 7 17 9 14 12 M21 4 C18 7 24 9 21 12" stroke="#c9b8a6" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M7 15 H29 L26 35 H10 Z" fill={C.cream} stroke={C.wood} strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M8.2 19 H27.8" stroke="#b97a4a" strokeWidth="4" />
    <path d="M29 19 C36 19 36 28 27.5 28" stroke={C.wood} strokeWidth="2.6" fill="none" />
  </svg>
);
const ChatDots: React.FC<{ x: number; y: number; k: number; flip?: boolean; color?: string }> = ({ x, y, k, flip, color = "#fff" }) =>
  k <= 0.01 ? null : (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${lerp(0.5, 1, k)})`, transformOrigin: flip ? "80% 100%" : "20% 100%", opacity: Math.min(1, k * 1.6) }}>
      <div style={{ position: "relative", background: color, borderRadius: 30, padding: "14px 22px", display: "flex", gap: 10, boxShadow: "0 6px 0 rgba(59,47,92,.2), 0 14px 22px rgba(59,47,92,.25)" }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: INK, opacity: 0.75 }} />)}
        <div style={{ position: "absolute", [flip ? "right" : "left"]: 18, bottom: -12, width: 24, height: 24, background: color, transform: "rotate(45deg)", borderRadius: 4, zIndex: -1 }} />
      </div>
    </div>
  );

const CHAIN_LABELS = ["MINE", "FACTORY", "WAREHOUSE", "ROAD", "DELIVERY"];

const worldLabels = (t: number): React.ReactNode[] => {
  const o: React.ReactNode[] = [];
  // ---- answer 1: humanoid robots -> everywhere -> the supply chain -> runs 24/7
  o.push(<Pill key="hum" x={510} y={440} text="HUMANOID ROBOTS" icon={<RobotIcon size={56} />} bg={C.lav} fg="#fff" edge={C.lavDeep} size={60} k={win(t, T.humanoid + 0.1, T.everywhere - 0.15)} />);
  o.push(<Pill key="evw" x={510} y={440} text="EVERYWHERE" icon={<RobotIcon size={56} />} bg={C.lav} fg="#fff" edge={C.lavDeep} size={64} k={win(t, T.everywhere, T.supplyChain - 0.15)} />);
  const ce = B.askDecide.s - 0.1;
  const hk = win(t, T.supplyChain, ce);
  if (hk > 0) {
    o.push(<Pill key="hdr" x={510} y={390} text="ANYWHERE IN THE SUPPLY CHAIN" size={44} bg={C.butter} edge={C.butterDeep} k={hk} />);
    CHAIN.forEach((s, i) => {
      const f = popS(t, s, 10);
      const x = 510 + (i - 2) * 168;
      o.push(
        <div key={`ch${i}`} style={{ position: "absolute", left: x - 70, top: 426, width: 140, textAlign: "center", opacity: hk, fontFamily: ROUND }}>
          <div style={{ margin: "0 auto", width: 92, height: 92, borderRadius: 46, background: f > 0.5 ? C.lav : "#fff", border: "4px solid #fff", boxShadow: "0 6px 0 rgba(59,47,92,.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ transform: `scale(${f > 0.5 ? lerp(0.6, 1, f) : 1})` }}>{f > 0.5 ? <RobotIcon size={54} /> : <HumanIcon size={54} />}</div>
          </div>
          <div style={{ marginTop: 8, fontSize: 25, fontWeight: 700, color: "#fff", textShadow: `0 2px 0 ${INK}, 0 4px 8px rgba(59,47,92,.5)` }}>{CHAIN_LABELS[i]}</div>
        </div>,
      );
      if (i < 4) o.push(<div key={`ar${i}`} style={{ position: "absolute", left: x + 56, top: 460, fontSize: 40, fontWeight: 700, fontFamily: ROUND, color: "#fff", opacity: hk, textShadow: `0 3px 0 ${INK}` }}>{"›"}</div>);
    });
  }
  o.push(<Stamp key="247" x={830} y={900} text="RUNS 24/7" k={win(t, T.h247, NIGHT.off)} color={C.lavDeep} size={52} rot={-5} />);
  {
    const nk = win(t, T.runs, NIGHT.off);
    if (nk > 0) o.push(<div key="moon" style={{ position: "absolute", left: 965, top: 790, transform: `translate(-50%,-50%) scale(${lerp(0.5, 1, nk)})`, opacity: nk }}><Moon size={70} /></div>);
  }

  // ---- answer 2: it depends on the task -> repetitive / pattern-based work tips the scale to the robot
  const re = T.artBased - 0.1;
  o.push(<Pill key="dep" x={510} y={420} text="IT DEPENDS" sub="on what kind of task" size={60} k={win(t, T.dependsW, B.repetitive.s - 0.1)} />);
  {
    const [lx, ly] = A(t, add(panWorld(t, "L"), [0, 0.18 - 0.55, 0]));
    const [rx, ry] = A(t, add(panWorld(t, "R"), [0, 0.18 - 0.55, 0]));
    const L = RC(lx, ly + 120, 110), Rr = RC(rx, ry + 120, 110);
    const sk = (a: number) => win(t, a, T.pattern - 0.2);
    o.push(<Pill key="hp" x={L[0]} y={Math.max(L[1], Rr[1] + (Math.abs(L[0] - Rr[0]) < 220 ? 90 : 0))} text="HUMAN" icon={<HumanIcon size={38} />} size={36} k={sk(SCALE.human)} />);
    o.push(<Pill key="rp" x={Rr[0]} y={Rr[1]} text="ROBOT" icon={<RobotIcon size={38} />} size={36} k={sk(SCALE.robot)} bg={C.lav} fg="#fff" edge={C.lavDeep} />);
  }
  o.push(<Pill key="rep" x={510} y={410} text="REPETITIVE" icon={<RobotIcon size={56} />} bg={C.lav} fg="#fff" edge={C.lavDeep} size={64} k={win(t, T.repetitive, re)} />);
  {
    const pk = win(t, T.pattern, re);
    o.push(<Pill key="pat" x={510} y={540} text="PATTERN-BASED" size={50} bg={C.butter} edge={C.butterDeep} k={pk} />);
    if (pk > 0) [0, 1, 2, 3, 4, 5].forEach((i) => {
      const f = popS(t, T.pattern + 0.25 + i * 0.12, 10) * pk;
      o.push(<div key={`pt${i}`} style={{ position: "absolute", left: 510 + (i - 2.5) * 64 - 24, top: 564, width: 48, height: 48, borderRadius: 10, background: i % 2 ? C.coral : C.wood, border: "4px solid #fff", boxShadow: "0 5px 0 rgba(59,47,92,.25)", transform: `scale(${f})`, opacity: Math.min(1, f * 1.5) }} />);
    });
  }

  // ---- art-based value: the gallery
  const ae = B.feeling.s - 0.1;
  o.push(<Pill key="artb" x={510} y={410} text="ART-BASED WORK" icon={<span style={{ fontSize: 50 }}>{"✎"}</span>} size={60} bg={C.butter} edge={C.butterDeep} k={win(t, T.artBased, T.valueOf - 0.1)} />);
  o.push(<Pill key="vop" x={510} y={410} text="THE VALUE OF A PAINTING" size={54} k={win(t, T.valueOf, T.valueFrom - 0.1)} />);
  o.push(<Pill key="how" x={510} y={540} text="HOW WOULD AI KNOW?" icon={<RobotIcon size={52} />} bg={C.lav} fg="#fff" edge={C.lavDeep} size={58} k={win(t, T.howAI, ae)} />);
  {
    const b = A(t, add(add(tileTop(TILE.gallery), ART_BOT), [0, 1.45, 0]));
    const bk = win(t, T.valueFrom, ae);
    if (bk > 0 && clr(b[0], b[1])) o.push(<Pill key="bq" x={b[0]} y={b[1]} text="?" size={52} tail k={bk} bg={C.lav} fg="#fff" edge={C.lavDeep} />);
  }
  // ---- feeling: hearts travel from the art guy to the painting
  const fe = B.chai.s - 0.1;
  {
    const g = A(t, add(add(tileTop(TILE.gallery), ART_GUY), [0, 1.35, 0]));
    const pnt = A(t, add(tileTop(TILE.gallery), PAINTING));
    const und = win(t, T.humanFeeling, fe);
    [0, 1, 2].forEach((i) => {
      const ph = Math.max(0, Math.min(1, (t - T.humanFeeling - 0.2 - i * 0.35) / 1.4));
      const hx = lerp(g[0], pnt[0], ph), hy = lerp(g[1] + 40, pnt[1], ph) - Math.sin(ph * Math.PI) * 90;
      if (clr(hx, hy)) o.push(<Heart key={`h${i}`} x={hx} y={hy} s={und * Math.sin(ph * Math.PI) * 0.9} color={i % 2 ? C.coral : C.pink} />);
    });
    o.push(<Pill key="hf" x={510} y={410} text="HUMAN FEELING" icon={<span style={{ fontSize: 52, color: C.coral }}>{"♥"}</span>} size={62} k={win(t, T.humanFeeling, fe)} />);
    o.push(<Pill key="emo" x={510} y={530} text="it comes from emotions" size={42} bg={C.pink} edge={C.coral} k={win(t, T.emotions, fe)} />);
  }

  // ---- chai: a robot can't sit with us, have a sip, have some gossip
  const he = B.jeweller.s - 0.1;
  o.push(<Pill key="cant" x={510} y={410} text="A ROBOT CAN'T..." icon={<RobotIcon size={52} />} bg={C.lav} fg="#fff" edge={C.lavDeep} size={58} k={win(t, T.chai, T.valueStill - 0.1)} />);
  ([["SIT WITH US", T.sit, 190], ["HAVE A SIP", T.sip, 500], ["GOSSIP", T.gossip, 790]] as [string, number, number][]).forEach(([txt, at, x], i) => {
    o.push(<Pill key={`ch-${i}`} x={x} y={550} text={txt} icon={i === 1 ? <ChaiIcon size={44} /> : undefined} size={38} bg={C.butter} edge={C.butterDeep} k={win(t, at, T.valueStill - 0.1)} />);
  });
  {
    const ca = A(t, add(add(tileTop(TILE.house), CHAI_A), [0, 1.25, 0]));
    const cb = A(t, add(add(tileTop(TILE.house), CHAI_B), [0, 1.25, 0]));
    const gk = win(t, T.gossip, T.wouldLike - 0.05);
    const gk2 = win(t, T.gossip + 0.35, T.wouldLike - 0.05);
    if (clr(ca[0], ca[1])) o.push(<ChatDots key="cd1" x={ca[0] + 30} y={ca[1]} k={gk} />);
    if (clr(cb[0], cb[1])) o.push(<ChatDots key="cd2" x={cb[0] - 30} y={cb[1]} k={gk2} flip color={C.butter} />);
    const lk = win(t, T.wouldLike, he);
    const mx = (ca[0] + cb[0]) / 2, my = Math.min(ca[1], cb[1]);
    if (clr(mx, my)) o.push(<Heart key="like" x={mx} y={my - 30} s={lk * 1.1} color={C.coral} />);
  }
  o.push(<Pill key="vstay" x={510} y={410} text="THAT VALUE STAYS WITH HUMANS" icon={<HumanIcon size={50} />} size={50} bg={C.butter} edge={C.butterDeep} k={win(t, T.valueStill, he)} />);

  // ---- jeweller + diamond
  const je = B.close.s - 0.1;
  o.push(<Pill key="jwl" x={510} y={410} text="JEWELLER" icon={<DiamondIcon size={56} />} size={64} bg={C.butter} edge={C.butterDeep} k={win(t, T.jeweller, T.whichDiamond - 0.1)} />);
  o.push(<Pill key="wd" x={510} y={410} text={<>WHICH DIAMOND <span style={{ color: C.coralDeep }}>+</span> WHICH PERSON</>} icon={<DiamondIcon size={50} />} size={50} k={win(t, T.whichDiamond, T.robotCant - 0.1)} />);
  {
    const d = A(t, add(tileTop(TILE.jewel), DIAMOND));
    const sp = popS(t, T.whichDiamond, 8);
    const base = win(t, T.whichDiamond + 0.3, T.robotCant - 0.1);
    if (clr(d[0], d[1])) [0, 1, 2, 3, 4].forEach((i) => {
      const a = (i / 5) * Math.PI * 2 + 0.4, r = 70 + sp * 50;
      o.push(<Sparkle key={`sp${i}`} x={d[0] + Math.cos(a) * r} y={d[1] + Math.sin(a) * r * 0.8} s={base * (i % 2 ? 0.6 : 0.9) * (0.6 + sp * 0.5)} rot={i * 18} color={i % 2 ? "#ffffff" : "#bff6ff"} />);
    });
  }
  o.push(<Pill key="rct" x={510} y={410} text="A ROBOT CAN'T TAKE THAT" icon={<RobotIcon size={50} />} bg={C.lav} fg="#fff" edge={C.lavDeep} size={52} k={win(t, T.robotCant, je)} />);

  // ---- close: the artistic touch stays human (Madhav's take); human tiles glow
  {
    const ck = B.comment.s - 0.1;
    o.push(<Pill key="take" x={510} y={370} text="MADHAV'S TAKE" bg={C.coral} fg="#fff" edge={C.coralDeep} size={36} k={win(t, T.artistic, ck)} />);
    o.push(<Pill key="art" x={510} y={480} text="THE ARTISTIC TOUCH" icon={<span style={{ fontSize: 54 }}>{"✎"}</span>} bg={C.butter} fg={INK} edge={C.butterDeep} size={62} k={win(t, T.artistic, ck)} />);
    o.push(<Stamp key="sh" x={510} y={580} text="STAYS HUMAN" k={win(t, T.staysHuman, ck)} color={C.coralDeep} size={68} rot={-4} />);
        // v6: the human jobs are listed in the right column (the top band holds the close pills)
    ([["JEWELLER", <DiamondIcon size={34} />], ["ART", <span style={{ fontSize: 32 }}>{"\u270e"}</span>], ["CHAI", <ChaiIcon size={34} />]] as [string, React.ReactNode][]).forEach(([txt, ic], i) => {
      o.push(<Pill key={`gl${i}`} x={860} y={880 + i * 92} text={txt} icon={ic} size={32} k={win(t, GLOW + 0.3 + i * 0.15, ck)} bg={C.butter} edge={C.butterDeep} />);
    });
  }
  return o;
};

// End card: title (top band) + follow (right column), he stays at the left.
const EndCard: React.FC<{ t: number }> = ({ t }) => {
  const s = B.end.s;
  const tk = popS(t, s, 13);
  const fk = popS(t, OUTRO.t, 11), ak = popS(t, OUTRO.t + Math.min(1.0, OUTRO.dur * 0.6), 10), hk = popS(t, OUTRO.t + 0.4, 12);
  return (
    <>
      <EndTitle k={tk} />
      <div style={{ position: "absolute", left: 830, top: 930, transform: `translate(-50%,-50%) scale(${lerp(0.6, 1, fk)})`, opacity: Math.min(1, fk * 1.6), fontFamily: ROUND, textAlign: "center" }}>
        <div style={{ background: "#fff", borderRadius: 44, padding: "16px 30px 20px", fontSize: 46, fontWeight: 700, color: INK, lineHeight: 1.15, whiteSpace: "nowrap", boxShadow: `0 9px 0 rgba(59,47,92,.3), 0 24px 40px rgba(59,47,92,.3)` }}>
          Follow for more<br />
          <span style={{ display: "inline-block", color: "#fff", background: C.coral, borderRadius: 26, padding: "0 20px 4px", marginTop: 6, transform: `scale(${lerp(0.5, 1, ak)})`, opacity: Math.min(1, ak * 1.5) }}>AI news</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 830, top: 1100, transform: "translate(-50%,-50%)", opacity: hk, fontFamily: ROUND, fontSize: 40, fontWeight: 600, color: "#fff", textShadow: `0 3px 0 ${INK}, 0 8px 16px rgba(59,47,92,.4)` }}>@madhav_somani</div>
    </>
  );
};

export const Overlays: React.FC<{ t: number; covered: boolean; worldVis: boolean }> = ({ t }) => (
  <>
    <SeriesTag />
    <Hook t={t} />
    {t < B.end.s && worldLabels(t)}
    <QBubble t={t} a={T.askFirst} b={T.supply + 0.05} size={70}>Which job will robots <span style={{ color: C.butter }}>take first?</span></QBubble>
    <QBubble t={t} a={T.askDecide} b={T.depends + 0.05}>But how does a company decide <span style={{ color: C.butter }}>you want a robot?</span></QBubble>
    <ATag t={t} a={T.supply} />
    <ATag t={t} a={T.depends} />
    <CommentCard t={t} />
    {t >= B.end.s - 0.05 && <EndCard t={t} />}
  </>
);
