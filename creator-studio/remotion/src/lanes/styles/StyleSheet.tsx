import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { loadFont as lAnton } from "@remotion/google-fonts/Anton";
import { loadFont as lArchivo } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as lBungee } from "@remotion/google-fonts/Bungee";
import { loadFont as lCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as lFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as lInstrument } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as lJosefin } from "@remotion/google-fonts/JosefinSans";
import { loadFont as lMonoton } from "@remotion/google-fonts/Monoton";
import { loadFont as lNunito } from "@remotion/google-fonts/Nunito";
import { loadFont as lOutfit } from "@remotion/google-fonts/Outfit";
import { loadFont as lMarker } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as lPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as lPress } from "@remotion/google-fonts/PressStart2P";
import { loadFont as lRighteous } from "@remotion/google-fonts/Righteous";
import { loadFont as lSpaceMono } from "@remotion/google-fonts/SpaceMono";
import { loadFont as lSyne } from "@remotion/google-fonts/Syne";
import { loadFont as lUnbounded } from "@remotion/google-fonts/Unbounded";
import { loadFont as lVT } from "@remotion/google-fonts/VT323";
import { F } from "../../kit/theme";

// A review sheet of art styles (Vishnu, 2026-10-23): the same three tiles drawn in each style, a headline, a chat
// and a stat, so styles are compared on the same content. One frame is one page of five styles.
//   node kit/remotion.mjs sheet style-sheet <outDir> 5

const o = { subsets: ["latin" as const] };
const f = {
  anton: lAnton("normal", { weights: ["400"], ...o }).fontFamily,
  archivo: lArchivo("normal", { weights: ["400"], ...o }).fontFamily,
  bungee: lBungee("normal", { weights: ["400"], ...o }).fontFamily,
  caveat: lCaveat("normal", { weights: ["700"], ...o }).fontFamily,
  fredoka: lFredoka("normal", { weights: ["600"], ...o }).fontFamily,
  instrument: lInstrument("normal", { weights: ["400"], ...o }).fontFamily,
  instrumentI: lInstrument("italic", { weights: ["400"], ...o }).fontFamily,
  josefin: lJosefin("normal", { weights: ["700"], ...o }).fontFamily,
  monoton: lMonoton("normal", { weights: ["400"], ...o }).fontFamily,
  nunito: lNunito("normal", { weights: ["800"], ...o }).fontFamily,
  outfit: lOutfit("normal", { weights: ["400", "700"], ...o }).fontFamily,
  marker: lMarker("normal", { weights: ["400"], ...o }).fontFamily,
  playfair: lPlayfair("normal", { weights: ["700", "900"], ...o }).fontFamily,
  press: lPress("normal", { weights: ["400"], ...o }).fontFamily,
  righteous: lRighteous("normal", { weights: ["400"], ...o }).fontFamily,
  spacemono: lSpaceMono("normal", { weights: ["400", "700"], ...o }).fontFamily,
  syne: lSyne("normal", { weights: ["800"], ...o }).fontFamily,
  unbounded: lUnbounded("normal", { weights: ["700"], ...o }).fontFamily,
  vt: lVT("normal", { weights: ["400"], ...o }).fontFamily,
};

type CSS = React.CSSProperties;
const W = 600;
const H = 750;
const FACE = staticFile("_styles/face.jpg");
const ASK = "Move everything due this week to Monday";
const ANS = "12 tasks moved. Want me to tell the team?";
const YES = "Yes, tell them";

// ---- shared pieces ----

const Tile: React.FC<{ style?: CSS; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{ width: W, height: H, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column",
    justifyContent: "center", padding: 48, boxSizing: "border-box", flexShrink: 0, ...style }}>{children}</div>
);
const Rel: React.FC<{ style?: CSS; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{ position: "relative", ...style }}>{children}</div>
);
const Abs: React.FC<{ style: CSS; children?: React.ReactNode }> = ({ style, children }) => (
  <div style={{ position: "absolute", ...style }}>{children}</div>
);
const H1: React.FC<{ s: CSS; m: CSS }> = ({ s, m }) => (
  <div style={s}>Let AI <span style={{ display: "inline-block", ...m }}>do the work</span> for your users</div>
);
const Chat: React.FC<{ panel: CSS; user: CSS; agent: CSS; btn: CSS; head?: React.ReactNode; gap?: number }> = (p) => (
  <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: p.gap ?? 22, ...p.panel }}>
    {p.head}
    <div style={{ alignSelf: "flex-end", maxWidth: "84%", ...p.user }}>{ASK}</div>
    <div style={{ alignSelf: "flex-start", maxWidth: "88%", ...p.agent }}>{ANS}</div>
    <div style={{ alignSelf: "flex-start", ...p.btn }}>{YES}</div>
  </div>
);
const grid = (c: string, s: number, w = 1): CSS => ({
  backgroundImage: `linear-gradient(${c} ${w}px, transparent ${w}px), linear-gradient(90deg, ${c} ${w}px, transparent ${w}px)`,
  backgroundSize: `${s}px ${s}px`,
});
const NOISE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;
const Grain: React.FC<{ o: number; blend?: CSS["mixBlendMode"] }> = ({ o, blend }) => (
  <AbsoluteFill style={{ backgroundImage: NOISE, opacity: o, mixBlendMode: blend ?? "multiply", pointerEvents: "none" }} />
);
const burst = (n = 12, r1 = 50, r2 = 36) =>
  `polygon(${Array.from({ length: n * 2 }, (_, i) => {
    const a = (Math.PI * i) / n;
    const r = i % 2 ? r2 : r1;
    return `${(50 + r * Math.cos(a)).toFixed(1)}% ${(50 + r * Math.sin(a)).toFixed(1)}%`;
  }).join(",")})`;
const torn = (k = 1) => {
  const pts: string[] = [];
  for (let i = 0; i <= 20; i++) pts.push(`${i * 5}% ${(2 + (Math.sin(i * k * 2.3) + 1) * 1.6).toFixed(1)}%`);
  for (let i = 20; i >= 0; i--) pts.push(`${i * 5}% ${(94 + (Math.cos(i * k * 1.7) + 1) * 2.2).toFixed(1)}%`);
  return `polygon(${pts.join(",")})`;
};
const depth = (c: string, n = 22) => Array.from({ length: n }, (_, i) => `${i + 1}px ${i + 1}px 0 ${c}`).join(",");
const Photo: React.FC<{ style?: CSS }> = ({ style }) => (
  <Img src={FACE} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...style }} />
);
const Duo: React.FC<{ light: string; dark: string }> = ({ light, dark }) => (
  <AbsoluteFill style={{ background: light, isolation: "isolate" }}>
    <Photo style={{ filter: "grayscale(1) contrast(1.3)", mixBlendMode: "multiply" }} />
    <AbsoluteFill style={{ background: dark, mixBlendMode: "lighten" }} />
  </AbsoluteFill>
);

// ---- the styles ----

type Style = { name: string; a: React.ReactNode; b: React.ReactNode; c: React.ReactNode };

const clay = (fill: string, r = 44): CSS => ({
  background: fill, borderRadius: r,
  boxShadow: "inset -10px -12px 22px rgba(0,0,0,0.13), inset 10px 12px 22px rgba(255,255,255,0.75), 0 26px 40px rgba(90,60,140,0.25)",
});
const claymorphism: Style = {
  name: "Claymorphism",
  a: (
    <Tile style={{ background: "#E9DDFB", gap: 40 }}>
      <Abs style={{ ...clay("#FFD6A8", 999), width: 220, height: 220, right: -50, top: -40 }} />
      <Abs style={{ ...clay("#BFF0D4", 999), width: 140, height: 140, left: -30, bottom: 60 }} />
      <Rel style={{ ...clay("#FFD6E7", 999), alignSelf: "flex-start", padding: "14px 30px", fontFamily: f.fredoka, fontSize: 30, color: "#5a3d8a" }}>AI agent</Rel>
      <Rel><H1 s={{ fontFamily: f.fredoka, fontWeight: 600, fontSize: 80, lineHeight: 1.08, color: "#3d2766" }} m={{ ...clay("#BFF0D4", 30), padding: "0 18px", margin: "6px 0" }} /></Rel>
    </Tile>
  ),
  b: (
    <Tile style={{ background: "#E9DDFB" }}>
      <Chat panel={{ ...clay("#F7F2FF"), padding: 30 }} gap={26}
        user={{ ...clay("#C9E4FF", 30), padding: "20px 24px", fontFamily: f.fredoka, fontSize: 30, color: "#2d3a66" }}
        agent={{ ...clay("#FFF0B8", 30), padding: "20px 24px", fontFamily: f.fredoka, fontSize: 30, color: "#5a4300" }}
        btn={{ ...clay("#FFB4C8", 999), padding: "16px 30px", fontFamily: f.fredoka, fontSize: 28, color: "#6a1f3a" }} />
    </Tile>
  ),
  c: (
    <Tile style={{ background: "#E9DDFB", alignItems: "center" }}>
      <div style={{ ...clay("#FFE3A3", 70), width: 420, height: 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: f.fredoka, fontSize: 210, lineHeight: 1, color: "#5a3d00" }}>24</div>
        <div style={{ fontFamily: f.fredoka, fontSize: 34, color: "#7a5a10" }}>days of 30</div>
      </div>
    </Tile>
  ),
};

const metal: CSS = { background: "linear-gradient(#fdfdfd, #c9c9c9)", border: "1px solid #8a8a8a", borderRadius: 8, boxShadow: "inset 0 1px 0 #fff, 0 2px 4px rgba(0,0,0,0.45)", textShadow: "0 1px 0 #fff" };
const skeuomorphism: Style = {
  name: "Skeuomorphism",
  a: (
    <Tile style={{ background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 2px, rgba(0,0,0,0.05) 2px 4px), linear-gradient(#e6e1d7, #cdc7bb)", gap: 40 }}>
      <div style={{ ...metal, alignSelf: "flex-start", padding: "10px 24px", fontFamily: F.body, fontWeight: 600, fontSize: 26, color: "#444", letterSpacing: 4 }}>AI AGENT</div>
      <H1 s={{ fontFamily: f.playfair, fontWeight: 700, fontSize: 74, lineHeight: 1.1, color: "#3b2f22", textShadow: "0 2px 0 rgba(255,255,255,0.7)" }}
        m={{ background: "linear-gradient(#a83a32, #7a1f1f)", color: "#fff", textShadow: "0 -1px 0 rgba(0,0,0,0.5)", borderRadius: 10, padding: "0 16px",
          border: "2px dashed rgba(255,215,200,0.7)", outline: "5px solid #7a1f1f", boxShadow: "0 6px 10px rgba(0,0,0,0.45)", margin: "10px 6px" }} />
    </Tile>
  ),
  b: (
    <Tile style={{ background: "linear-gradient(#e6e1d7, #cdc7bb)" }}>
      <Chat panel={{ background: "#dbe2ed", border: "1px solid #8d97a6", borderRadius: 16, padding: "0 24px 28px", boxShadow: "inset 0 3px 8px rgba(0,0,0,0.3)" }}
        head={<div style={{ margin: "0 -24px", padding: "14px 0", textAlign: "center", borderRadius: "16px 16px 0 0", background: "linear-gradient(#b3c2d6, #6d84a3)", color: "#fff", fontFamily: F.body, fontWeight: 600, fontSize: 26, textShadow: "0 -1px 0 rgba(0,0,0,0.4)", borderBottom: "1px solid #4a5d78" }}>AskVerb</div>}
        user={{ background: "linear-gradient(#a3dcff, #2a8fe8 60%, #1b7bd6)", color: "#fff", borderRadius: 22, padding: "16px 22px", fontFamily: F.body, fontSize: 28, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 3px rgba(0,0,0,0.4)", textShadow: "0 -1px 0 rgba(0,0,0,0.3)" }}
        agent={{ background: "linear-gradient(#ffffff, #e1e1e1)", border: "1px solid #aaa", color: "#222", borderRadius: 22, padding: "16px 22px", fontFamily: F.body, fontSize: 28, boxShadow: "0 2px 3px rgba(0,0,0,0.3)" }}
        btn={{ background: "linear-gradient(#a6dcff 0%, #3b9dea 50%, #1f86de 51%, #59b3f5 100%)", border: "1px solid #1a5f9e", borderRadius: 12, padding: "14px 28px", color: "#fff", fontFamily: F.body, fontWeight: 600, fontSize: 26, textShadow: "0 -1px 0 rgba(0,0,0,0.4)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 3px rgba(0,0,0,0.4)" }} />
    </Tile>
  ),
  c: (
    <Tile style={{ background: "repeating-linear-gradient(90deg, #8a5a33 0 6px, #94643b 6px 14px, #7d5130 14px 18px)", alignItems: "center" }}>
      <div style={{ width: 380, borderRadius: 14, overflow: "hidden", boxShadow: "0 18px 30px rgba(0,0,0,0.55)", background: "linear-gradient(#fff, #ececec)", textAlign: "center" }}>
        <div style={{ background: "linear-gradient(#e0574a, #a8261c)", color: "#fff", fontFamily: F.body, fontWeight: 600, fontSize: 40, padding: "18px 0", textShadow: "0 -1px 0 rgba(0,0,0,0.4)", letterSpacing: 4 }}>DAY</div>
        <div style={{ fontFamily: f.playfair, fontWeight: 900, fontSize: 230, lineHeight: 1.1, color: "#222" }}>24</div>
        <div style={{ fontFamily: F.body, fontSize: 28, color: "#777", paddingBottom: 24 }}>of 30</div>
      </div>
    </Tile>
  ),
};

const neu: CSS = { background: "#E0E5EC", boxShadow: "14px 14px 28px #a3b1c6, -14px -14px 28px #ffffff" };
const neuIn: CSS = { background: "#E0E5EC", boxShadow: "inset 8px 8px 16px #a3b1c6, inset -8px -8px 16px #ffffff" };
const neumorphism: Style = {
  name: "Neumorphism",
  a: (
    <Tile style={{ background: "#E0E5EC", gap: 44 }}>
      <div style={{ ...neu, alignSelf: "flex-start", borderRadius: 999, padding: "16px 30px", fontFamily: f.nunito, fontSize: 24, color: "#6b7a99", letterSpacing: 4 }}>AI AGENT</div>
      <H1 s={{ fontFamily: f.nunito, fontSize: 74, lineHeight: 1.12, color: "#3b4664" }} m={{ ...neuIn, borderRadius: 26, padding: "0 18px", color: "#5b7cfa", margin: "8px 0" }} />
    </Tile>
  ),
  b: (
    <Tile style={{ background: "#E0E5EC" }}>
      <Chat panel={{ ...neu, borderRadius: 40, padding: 32 }} gap={26}
        user={{ ...neuIn, borderRadius: 28, padding: "20px 24px", fontFamily: f.nunito, fontSize: 28, color: "#3b4664" }}
        agent={{ ...neu, borderRadius: 28, padding: "20px 24px", fontFamily: f.nunito, fontSize: 28, color: "#3b4664", boxShadow: "8px 8px 16px #a3b1c6, -8px -8px 16px #ffffff" }}
        btn={{ ...neu, borderRadius: 999, padding: "16px 30px", fontFamily: f.nunito, fontSize: 26, color: "#5b7cfa", boxShadow: "8px 8px 16px #a3b1c6, -8px -8px 16px #ffffff" }} />
    </Tile>
  ),
  c: (
    <Tile style={{ background: "#E0E5EC", alignItems: "center" }}>
      <div style={{ ...neu, width: 420, height: 420, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...neuIn, width: 300, height: 300, borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "10px solid transparent", boxSizing: "border-box",
          background: "conic-gradient(#5b7cfa 0 80%, #E0E5EC 80% 100%) border-box" }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#E0E5EC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: f.nunito, fontSize: 130, lineHeight: 1, color: "#3b4664" }}>24</div>
            <div style={{ fontFamily: f.nunito, fontSize: 26, color: "#8a96b3" }}>of 30 days</div>
          </div>
        </div>
      </div>
    </Tile>
  ),
};

const bx = (bg: string, extra?: CSS): CSS => ({ background: bg, borderRadius: 26, padding: 26, boxSizing: "border-box", ...extra });
const bento: Style = {
  name: "Bento grid",
  a: (
    <Tile style={{ background: "#0E0E10", padding: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1.6fr 1fr 0.8fr", gap: 14, height: "100%" }}>
        <div style={bx("#1C1C1F", { gridColumn: "1 / 3", display: "flex", alignItems: "flex-end" })}>
          <H1 s={{ fontFamily: f.outfit, fontWeight: 700, fontSize: 64, lineHeight: 1.02, color: "#fff", letterSpacing: -1 }} m={{ color: "#D4FF3A" }} />
        </div>
        <div style={bx("#D4FF3A", { fontFamily: f.outfit, fontWeight: 700, fontSize: 34, color: "#0E0E10", display: "flex", alignItems: "flex-end" })}>AI agent</div>
        <div style={bx("#FF6B35", { fontFamily: f.outfit, fontWeight: 700, fontSize: 90, color: "#0E0E10", display: "flex", alignItems: "flex-end", lineHeight: 1 })}>24/30</div>
        <div style={bx("#1C1C1F", { gridColumn: "1 / 3", fontFamily: f.outfit, fontSize: 30, color: "#a5a5ad", display: "flex", alignItems: "center" })}>askverb.com</div>
      </div>
    </Tile>
  ),
  b: (
    <Tile style={{ background: "#0E0E10", padding: 24 }}>
      <Chat panel={bx("#1C1C1F", { padding: 30 })}
        head={<div style={{ fontFamily: f.outfit, fontSize: 24, color: "#77777f" }}>Agent</div>}
        user={{ background: "#2C2C30", color: "#fff", borderRadius: 20, padding: "18px 22px", fontFamily: f.outfit, fontSize: 29 }}
        agent={{ background: "#D4FF3A", color: "#0E0E10", borderRadius: 20, padding: "18px 22px", fontFamily: f.outfit, fontSize: 29, fontWeight: 700 }}
        btn={{ background: "#fff", color: "#0E0E10", borderRadius: 999, padding: "14px 28px", fontFamily: f.outfit, fontWeight: 700, fontSize: 26 }} />
    </Tile>
  ),
  c: (
    <Tile style={{ background: "#0E0E10", padding: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gridTemplateRows: "1fr 1fr", gap: 14, height: "100%" }}>
        <div style={bx("#D4FF3A", { gridRow: "1 / 3", display: "flex", flexDirection: "column", justifyContent: "space-between" })}>
          <div style={{ fontFamily: f.outfit, fontSize: 28, color: "#0E0E10" }}>Day</div>
          <div style={{ fontFamily: f.outfit, fontWeight: 700, fontSize: 210, lineHeight: 0.9, color: "#0E0E10" }}>24</div>
        </div>
        <div style={bx("#1C1C1F", { display: "flex", flexDirection: "column", justifyContent: "space-between" })}>
          <div style={{ fontFamily: f.outfit, fontSize: 24, color: "#77777f" }}>Sign-ups</div>
          <div style={{ fontFamily: f.outfit, fontWeight: 700, fontSize: 90, color: "#fff", lineHeight: 1 }}>23</div>
        </div>
        <div style={bx("#FF6B35", { display: "flex", flexDirection: "column", justifyContent: "space-between" })}>
          <div style={{ fontFamily: f.outfit, fontSize: 24, color: "#0E0E10" }}>Goal</div>
          <div style={{ fontFamily: f.outfit, fontWeight: 700, fontSize: 90, color: "#0E0E10", lineHeight: 1 }}>10</div>
        </div>
      </div>
    </Tile>
  ),
};

const HELV = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const swiss: Style = {
  name: "Swiss / International Typographic",
  a: (
    <Tile style={{ background: "#fff", justifyContent: "space-between", padding: 40 }}>
      <Abs style={{ right: 0, top: 100, width: 230, height: 230, background: "#E30613" }} />
      <Rel style={{ display: "flex", gap: 30, fontFamily: HELV, fontWeight: 700, fontSize: 20, color: "#111", textTransform: "uppercase", letterSpacing: 1 }}>
        <span>AskVerb</span><span>AI agent</span><span>No. 24</span>
      </Rel>
      <div>
        <div style={{ height: 4, background: "#111", marginBottom: 20 }} />
        <H1 s={{ fontFamily: HELV, fontWeight: 700, fontSize: 92, lineHeight: 0.94, letterSpacing: -4, color: "#111" }} m={{ color: "#E30613" }} />
      </div>
    </Tile>
  ),
  b: (
    <Tile style={{ background: "#fff", padding: 40 }}>
      <Chat panel={{ borderTop: "8px solid #111", paddingTop: 26 }} gap={0}
        head={<div style={{ fontFamily: HELV, fontWeight: 700, fontSize: 20, textTransform: "uppercase", marginBottom: 26 }}>01 / Request</div>}
        user={{ maxWidth: "100%", alignSelf: "stretch", fontFamily: HELV, fontWeight: 700, fontSize: 44, lineHeight: 1, letterSpacing: -2, color: "#111", paddingBottom: 30, borderBottom: "2px solid #111" }}
        agent={{ maxWidth: "100%", alignSelf: "stretch", background: "#E30613", color: "#fff", fontFamily: HELV, fontWeight: 700, fontSize: 40, lineHeight: 1.02, letterSpacing: -1.5, padding: 26, marginTop: 30 }}
        btn={{ background: "#111", color: "#fff", fontFamily: HELV, fontWeight: 700, fontSize: 24, padding: "14px 24px", marginTop: 20, textTransform: "uppercase" }} />
    </Tile>
  ),
  c: (
    <Tile style={{ background: "#fff", padding: 40, justifyContent: "flex-end" }}>
      <Abs style={{ left: 40, top: 40, fontFamily: HELV, fontWeight: 700, fontSize: 20, textTransform: "uppercase" }}>Day</Abs>
      <div style={{ fontFamily: HELV, fontWeight: 700, fontSize: 400, lineHeight: 0.78, letterSpacing: -26, color: "#E30613", marginLeft: -16 }}>24</div>
      <div style={{ height: 4, background: "#111", margin: "30px 0 16px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: HELV, fontWeight: 700, fontSize: 24 }}><span>of 30</span><span>10 customers</span></div>
    </Tile>
  ),
};

const MemphisDeco: React.FC = () => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
    <path d="M30 120 q30 -40 60 0 t60 0 t60 0 t60 0" stroke="#FF5C8A" strokeWidth="12" fill="none" strokeLinecap="round" />
    <polygon points="500,40 570,160 430,160" fill="#00C2D1" stroke="#1a1a1a" strokeWidth="5" />
    <circle cx="520" cy="640" r="60" fill="none" stroke="#5B2EFF" strokeWidth="12" />
    <path d="M40 650 l30 -30 l30 30 l30 -30 l30 30 l30 -30" stroke="#1a1a1a" strokeWidth="8" fill="none" />
    {Array.from({ length: 20 }, (_, i) => <circle key={i} cx={380 + (i % 5) * 26} cy={520 + Math.floor(i / 5) * 26} r={6} fill="#FFD23F" stroke="#1a1a1a" strokeWidth="2" />)}
  </svg>
);
const memphis: Style = {
  name: "Memphis",
  a: (
    <Tile style={{ background: "#FFF1D0", gap: 36 }}>
      <MemphisDeco />
      <Rel style={{ alignSelf: "flex-start", background: "#00C2D1", border: "5px solid #1a1a1a", padding: "10px 24px", transform: "rotate(-4deg)", fontFamily: f.righteous, fontSize: 30 }}>AI AGENT</Rel>
      <Rel><H1 s={{ fontFamily: f.righteous, fontSize: 80, lineHeight: 1.08, color: "#1a1a1a" }} m={{ background: "#FF5C8A", padding: "0 16px", boxShadow: "10px 10px 0 #5B2EFF", margin: "8px 0" }} /></Rel>
    </Tile>
  ),
  b: (
    <Tile style={{ background: "#FFF1D0" }}>
      <MemphisDeco />
      <Chat panel={{ background: "#fff", border: "5px solid #1a1a1a", boxShadow: "16px 16px 0 #FFD23F", padding: 28 }}
        user={{ background: "#5B2EFF", color: "#fff", borderRadius: "0 30px 30px 30px", padding: "18px 22px", fontFamily: f.righteous, fontSize: 28 }}
        agent={{ background: "#FFD23F", border: "4px solid #1a1a1a", borderRadius: "30px 30px 30px 0", padding: "18px 22px", fontFamily: f.righteous, fontSize: 28 }}
        btn={{ background: "#FF5C8A", border: "4px solid #1a1a1a", padding: "12px 26px", fontFamily: f.righteous, fontSize: 26, transform: "rotate(2deg)" }} />
    </Tile>
  ),
  c: (
    <Tile style={{ background: "#FFF1D0", alignItems: "center" }}>
      <MemphisDeco />
      <div style={{ position: "relative", width: 400, height: 400, borderRadius: "50%", background: "#00C2D1", border: "6px solid #1a1a1a", boxShadow: "18px 18px 0 #FF5C8A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: f.righteous, fontSize: 220, lineHeight: 1, color: "#1a1a1a" }}>24</div>
        <div style={{ fontFamily: f.righteous, fontSize: 34, background: "#FFD23F", border: "4px solid #1a1a1a", padding: "4px 18px", transform: "rotate(-6deg)" }}>of 30 days</div>
      </div>
    </Tile>
  ),
};

const gloss = (top: string, mid: string, low: string, bot: string): CSS => ({
  background: `linear-gradient(180deg, ${top} 0%, ${mid} 49%, ${low} 50%, ${bot} 100%)`,
  border: "2px solid rgba(255,255,255,0.9)", boxShadow: "0 10px 26px rgba(0,70,130,0.3), inset 0 2px 0 rgba(255,255,255,0.8)",
});
const glassW = gloss("rgba(255,255,255,0.95)", "rgba(255,255,255,0.7)", "rgba(255,255,255,0.45)", "rgba(255,255,255,0.75)");
const aqua = gloss("#9fe3ff", "#3fb2f0", "#1590de", "#5cc8ff");
const lime = gloss("#d0ff9e", "#6fd84a", "#3fb52a", "#8be86a");
const AeroSky: React.FC = () => (
  <>
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #4fc0ff 0%, #c4ecff 62%, #8fe388 63%, #2f9e3d 100%)" }} />
    {[[460, 90, 120], [80, 560, 70], [520, 520, 50], [40, 80, 40]].map(([x, y, r], i) => (
      <Abs key={i} style={{ left: x, top: y, width: r * 2, height: r * 2, borderRadius: "50%", background: "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95) 0 12%, rgba(255,255,255,0.15) 40%, rgba(120,210,255,0.35) 75%, rgba(255,255,255,0.7) 100%)", border: "1px solid rgba(255,255,255,0.8)" }} />
    ))}
  </>
);
const aero: Style = {
  name: "Y2K / Frutiger Aero",
  a: (
    <Tile style={{ gap: 36 }}>
      <AeroSky />
      <Rel style={{ ...lime, alignSelf: "flex-start", borderRadius: 999, padding: "12px 30px", fontFamily: f.nunito, fontSize: 28, color: "#fff", textShadow: "0 1px 2px rgba(0,80,0,0.6)" }}>AI agent</Rel>
      <Rel><H1 s={{ fontFamily: f.nunito, fontSize: 76, lineHeight: 1.1, color: "#04355f", textShadow: "0 2px 0 rgba(255,255,255,0.85)" }}
        m={{ ...aqua, borderRadius: 999, padding: "0 22px", color: "#fff", textShadow: "0 2px 3px rgba(0,60,120,0.6)", margin: "8px 0" }} /></Rel>
    </Tile>
  ),
  b: (
    <Tile>
      <AeroSky />
      <Chat panel={{ ...glassW, borderRadius: 30, padding: 28, backdropFilter: "blur(6px)" }}
        user={{ ...aqua, borderRadius: 24, padding: "16px 22px", fontFamily: f.nunito, fontSize: 27, color: "#fff", textShadow: "0 1px 2px rgba(0,60,120,0.6)" }}
        agent={{ ...glassW, borderRadius: 24, padding: "16px 22px", fontFamily: f.nunito, fontSize: 27, color: "#04355f" }}
        btn={{ ...lime, borderRadius: 999, padding: "14px 28px", fontFamily: f.nunito, fontSize: 26, color: "#fff", textShadow: "0 1px 2px rgba(0,80,0,0.6)" }} />
    </Tile>
  ),
  c: (
    <Tile style={{ alignItems: "center" }}>
      <AeroSky />
      <div style={{ position: "relative", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle at 35% 25%, #ffffff 0 8%, #bff0ff 25%, #29a8f0 70%, #0b6fc2 100%)", boxShadow: "0 30px 50px rgba(0,60,120,0.4), inset 0 -20px 40px rgba(0,40,100,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: f.nunito, fontSize: 200, lineHeight: 1, color: "#fff", textShadow: "0 4px 10px rgba(0,50,110,0.5)" }}>24</div>
        <div style={{ fontFamily: f.nunito, fontSize: 32, color: "#fff" }}>of 30 days</div>
      </div>
    </Tile>
  ),
};

const PINK = "#FF48B0";
const BLUE = "#0078BF";
const riso: Style = {
  name: "Risograph print",
  a: (
    <Tile style={{ background: "#F3EEE3", gap: 34 }}>
      <Abs style={{ width: 360, height: 360, borderRadius: "50%", background: PINK, mixBlendMode: "multiply", opacity: 0.85, right: -90, top: -60 }} />
      <Abs style={{ width: 300, height: 300, borderRadius: "50%", background: "#FFE800", mixBlendMode: "multiply", right: 10, top: 100 }} />
      <Rel style={{ alignSelf: "flex-start", background: BLUE, color: "#F3EEE3", padding: "8px 20px", fontFamily: f.archivo, fontSize: 26, mixBlendMode: "multiply" }}>AI AGENT</Rel>
      <Rel><H1 s={{ fontFamily: f.archivo, fontSize: 78, lineHeight: 1.04, color: BLUE, textShadow: `5px 4px 0 rgba(255,72,176,0.8)`, mixBlendMode: "multiply" }} m={{ background: "#FFE800", padding: "0 10px" }} /></Rel>
      <Grain o={0.45} />
    </Tile>
  ),
  b: (
    <Tile style={{ background: "#F3EEE3" }}>
      <Chat panel={{ padding: 0 }} gap={24}
        user={{ background: BLUE, color: "#F3EEE3", padding: "18px 22px", fontFamily: f.archivo, fontSize: 28, mixBlendMode: "multiply", transform: "rotate(-1.5deg)" }}
        agent={{ background: PINK, color: "#1a1a1a", padding: "18px 22px", fontFamily: f.archivo, fontSize: 28, mixBlendMode: "multiply", transform: "rotate(1deg)", boxShadow: `-6px 5px 0 rgba(0,120,191,0.6)` }}
        btn={{ background: "#FFE800", color: BLUE, padding: "12px 26px", fontFamily: f.archivo, fontSize: 26, mixBlendMode: "multiply" }} />
      <Grain o={0.45} />
    </Tile>
  ),
  c: (
    <Tile style={{ background: "#F3EEE3", alignItems: "center" }}>
      <Abs style={{ width: 360, height: 360, borderRadius: "50%", background: PINK, mixBlendMode: "multiply", left: 40, top: 150 }} />
      <Abs style={{ width: 360, height: 360, borderRadius: "50%", background: BLUE, mixBlendMode: "multiply", left: 200, top: 230 }} />
      <Rel style={{ fontFamily: f.archivo, fontSize: 280, lineHeight: 1, color: "#F3EEE3", mixBlendMode: "screen", textShadow: "6px 4px 0 #FFE800" }}>24</Rel>
      <Rel style={{ fontFamily: f.archivo, fontSize: 34, color: "#FFE800", marginTop: 10 }}>DAYS OF 30</Rel>
      <Grain o={0.45} />
    </Tile>
  ),
};

const dots = (c: string, s = 26, r = 22): CSS => ({ backgroundImage: `radial-gradient(${c} ${r}%, transparent ${r + 1}%)`, backgroundSize: `${s}px ${s}px` });
const INK = "#111";
const popart: Style = {
  name: "Halftone / Pop art",
  a: (
    <Tile style={{ background: "#FFE600", ...dots("#FF3B3B"), gap: 30 }}>
      <Rel style={{ alignSelf: "flex-start", clipPath: burst(14, 50, 36), background: INK, width: 250, height: 250, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: -20 }}>
        <div style={{ clipPath: burst(14, 50, 36), background: "#FF3B3B", width: 232, height: 232, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: f.bungee, fontSize: 36, color: "#FFE600", textAlign: "center", lineHeight: 1 }}>AI<br />AGENT!</div>
      </Rel>
      <Rel style={{ background: "#fff", border: `8px solid ${INK}`, borderRadius: 40, padding: "26px 30px" }}>
        <H1 s={{ fontFamily: f.bungee, fontSize: 56, lineHeight: 1.1, color: INK }} m={{ background: "#00B7EB", border: `5px solid ${INK}`, padding: "0 10px", margin: "6px 0" }} />
      </Rel>
    </Tile>
  ),
  b: (
    <Tile style={{ background: "#00B7EB", ...dots("#0a7fb0", 22, 24) }}>
      <Chat panel={{ background: "#fff", border: `8px solid ${INK}`, padding: 26, boxShadow: `12px 12px 0 ${INK}` }}
        user={{ background: "#FFE600", border: `5px solid ${INK}`, borderRadius: 30, padding: "16px 20px", fontFamily: f.bungee, fontSize: 25, lineHeight: 1.2 }}
        agent={{ background: "#fff", border: `5px solid ${INK}`, borderRadius: 30, padding: "16px 20px", fontFamily: f.bungee, fontSize: 25, lineHeight: 1.2 }}
        btn={{ background: "#FF3B3B", color: "#fff", border: `5px solid ${INK}`, padding: "12px 24px", fontFamily: f.bungee, fontSize: 24, transform: "rotate(-3deg)" }} />
    </Tile>
  ),
  c: (
    <Tile style={{ padding: 0 }}>
      <AbsoluteFill style={{ background: "#FF3B3B", isolation: "isolate" }}>
        <Photo style={{ filter: "grayscale(1) contrast(1.8) brightness(1.1)", mixBlendMode: "multiply" }} />
        <AbsoluteFill style={{ ...dots("#FFE600", 12, 30), mixBlendMode: "screen", opacity: 0.8 }} />
      </AbsoluteFill>
      <Abs style={{ left: 30, bottom: 40, background: "#FFE600", border: `6px solid ${INK}`, padding: "10px 24px", fontFamily: f.bungee, fontSize: 52, transform: "rotate(-4deg)" }}>I'M 22.</Abs>
    </Tile>
  ),
};

const kraft: CSS = { background: "#C8A27A" };
const tape = (rot: number, extra?: CSS): CSS => ({ position: "absolute", width: 150, height: 44, background: "rgba(255,244,200,0.75)", transform: `rotate(${rot}deg)`, boxShadow: "0 1px 2px rgba(0,0,0,0.15)", ...extra });
const collage: Style = {
  name: "Paper cutout / Collage",
  a: (
    <Tile style={{ ...kraft, gap: 24 }}>
      <Rel style={{ background: "#fffaf0", clipPath: torn(1), padding: "50px 34px", transform: "rotate(-2deg)", filter: "drop-shadow(0 6px 6px rgba(0,0,0,0.3))" }}>
        <div style={{ fontFamily: f.playfair, fontWeight: 900, fontSize: 72, lineHeight: 1.05, color: "#1b1b1b" }}>
          Let AI <span style={{ display: "inline-block", background: "#1b1b1b", color: "#fff", padding: "0 12px", transform: "rotate(2deg)", fontFamily: f.marker, fontWeight: 400 }}>do the work</span> for{" "}
          <span style={{ display: "inline-block", background: "#E84A2E", color: "#fff", padding: "0 10px", transform: "rotate(-3deg)" }}>your</span> users
        </div>
      </Rel>
      <div style={tape(-8, { right: 30, top: 70 })} />
      <Rel style={{ alignSelf: "flex-end", background: "#2E6FE8", color: "#fff", fontFamily: f.marker, fontSize: 32, padding: "8px 20px", transform: "rotate(4deg)", clipPath: torn(3) }}>AI agent</Rel>
      <Grain o={0.3} />
    </Tile>
  ),
  b: (
    <Tile style={kraft}>
      <Chat panel={{ padding: 0 }} gap={28}
        user={{ background: "#2E6FE8", color: "#fff", padding: "22px 24px", fontFamily: f.playfair, fontWeight: 700, fontSize: 30, clipPath: torn(2), transform: "rotate(2deg)" }}
        agent={{ background: "#fffaf0", color: "#1b1b1b", padding: "26px 24px", fontFamily: f.playfair, fontWeight: 700, fontSize: 30, clipPath: torn(5), transform: "rotate(-2deg)" }}
        btn={{ background: "#E84A2E", color: "#fff", padding: "10px 24px", fontFamily: f.marker, fontSize: 28, transform: "rotate(3deg)" }} />
      <div style={tape(10, { right: 20, top: 120 })} />
      <Grain o={0.3} />
    </Tile>
  ),
  c: (
    <Tile style={{ ...kraft, alignItems: "center" }}>
      <div style={{ position: "relative", width: 420, height: 520, background: "#F2C94C", clipPath: torn(4), transform: "rotate(-3deg)", padding: 30, boxSizing: "border-box" }}>
        <div style={{ width: "100%", height: "100%", clipPath: torn(7) }}><Photo style={{ filter: "contrast(1.1) saturate(0.8)" }} /></div>
      </div>
      <div style={tape(-12, { left: 110, top: 100 })} />
      <Abs style={{ bottom: 50, right: 40, background: "#1b1b1b", color: "#fff", fontFamily: f.marker, fontSize: 40, padding: "6px 18px", transform: "rotate(-4deg)" }}>day 24</Abs>
      <Grain o={0.3} />
    </Tile>
  ),
};

const sketch: CSS = { border: "3px solid #222", borderRadius: "255px 18px 225px 18px / 18px 225px 18px 255px" };
const notebook: CSS = { background: "repeating-linear-gradient(#fdfdf8 0 46px, #a9c7ea 46px 48px)", };
const Margin = () => <Abs style={{ left: 70, top: 0, bottom: 0, width: 3, background: "#e88" }} />;
const doodle: Style = {
  name: "Hand-drawn doodle",
  a: (
    <Tile style={{ ...notebook, paddingLeft: 100, gap: 30 }}>
      <Margin />
      <Rel style={{ ...sketch, alignSelf: "flex-start", padding: "4px 20px", fontFamily: f.caveat, fontSize: 40, transform: "rotate(-3deg)" }}>AI agent!</Rel>
      <Rel><H1 s={{ fontFamily: f.caveat, fontSize: 96, lineHeight: 0.98, color: "#1d2a4d" }} m={{ background: "linear-gradient(transparent 52%, #FFF176 52%, #FFF176 90%, transparent 90%)", padding: "0 6px" }} /></Rel>
      <svg width="200" height="90" style={{ position: "absolute", right: 30, bottom: 70 }}>
        <path d="M10 70 C 60 10, 120 10, 170 40" stroke="#222" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M150 22 L172 40 L146 52" stroke="#222" strokeWidth="4" fill="none" strokeLinecap="round" />
      </svg>
    </Tile>
  ),
  b: (
    <Tile style={{ ...notebook, paddingLeft: 100 }}>
      <Margin />
      <Chat panel={{ padding: 0 }} gap={26}
        user={{ ...sketch, padding: "12px 22px", fontFamily: f.caveat, fontSize: 40, lineHeight: 1, background: "#E3F2FD" }}
        agent={{ ...sketch, borderRadius: "18px 225px 18px 255px / 255px 18px 225px 18px", padding: "12px 22px", fontFamily: f.caveat, fontSize: 40, lineHeight: 1, background: "#FFF9C4" }}
        btn={{ ...sketch, padding: "4px 26px", fontFamily: f.caveat, fontSize: 38, background: "#C8E6C9", transform: "rotate(-2deg)" }} />
    </Tile>
  ),
  c: (
    <Tile style={{ ...notebook, alignItems: "center" }}>
      <Margin />
      <Rel style={{ fontFamily: f.caveat, fontSize: 300, lineHeight: 1, color: "#1d2a4d" }}>24</Rel>
      <svg width="440" height="300" style={{ position: "absolute", left: 80, top: 210 }}>
        <ellipse cx="220" cy="150" rx="200" ry="125" stroke="#e53935" strokeWidth="5" fill="none" transform="rotate(-6 220 150)" />
      </svg>
      <Rel style={{ fontFamily: f.caveat, fontSize: 48, color: "#e53935", transform: "rotate(-4deg)" }}>days in. 6 to go!</Rel>
    </Tile>
  ),
};

const iso: Style = {
  name: "Isometric 3D",
  a: (
    <Tile style={{ background: "#E8F0FF", justifyContent: "flex-end", gap: 24 }}>
      <Abs style={{ left: 170, top: 110, width: 260, height: 180, background: "#5B6CFF", borderRadius: 18, transform: "rotateX(55deg) rotateZ(-45deg)", boxShadow: depth("#3b48c4", 30) }} />
      <Abs style={{ left: 250, top: 70, width: 130, height: 90, background: "#FF8A5B", borderRadius: 12, transform: "rotateX(55deg) rotateZ(-45deg)", boxShadow: depth("#c8603a", 20) }} />
      <Abs style={{ left: 110, top: 200, width: 90, height: 90, background: "#3DDC97", borderRadius: 12, transform: "rotateX(55deg) rotateZ(-45deg)", boxShadow: depth("#24a46c", 16) }} />
      <Rel style={{ fontFamily: f.outfit, fontWeight: 700, fontSize: 24, color: "#5B6CFF", letterSpacing: 3 }}>AI AGENT</Rel>
      <Rel><H1 s={{ fontFamily: f.outfit, fontWeight: 700, fontSize: 64, lineHeight: 1.04, color: "#1b2150" }} m={{ color: "#5B6CFF" }} /></Rel>
    </Tile>
  ),
  b: (
    <Tile style={{ background: "#E8F0FF" }}>
      <Chat panel={{ background: "#fff", borderRadius: 24, padding: 28, boxShadow: depth("#c3d0f0", 18) }}
        user={{ background: "#5B6CFF", color: "#fff", borderRadius: 18, padding: "16px 22px", fontFamily: f.outfit, fontSize: 28, boxShadow: depth("#3b48c4", 8) }}
        agent={{ background: "#3DDC97", color: "#0b3b26", borderRadius: 18, padding: "16px 22px", fontFamily: f.outfit, fontWeight: 700, fontSize: 28, boxShadow: depth("#24a46c", 8) }}
        btn={{ background: "#FF8A5B", color: "#fff", borderRadius: 14, padding: "14px 26px", fontFamily: f.outfit, fontWeight: 700, fontSize: 26, boxShadow: depth("#c8603a", 8) }} />
    </Tile>
  ),
  c: (
    <Tile style={{ background: "#E8F0FF", justifyContent: "space-between" }}>
      <div style={{ fontFamily: f.outfit, fontWeight: 700, fontSize: 120, color: "#1b2150", lineHeight: 1 }}>24<span style={{ fontSize: 40, color: "#7b84b8" }}> / 30 days</span></div>
      <svg width="504" height="420" viewBox="0 0 504 420">
        {[[90, 90, "#c3d0f0", "#9aa9d6", "#7d8cbb"], [250, 180, "#5B6CFF", "#3b48c4", "#2c379c"], [410, 280, "#FF8A5B", "#c8603a", "#a24a2b"]].map(([x, h, top, l, r], i) => {
          const cx = x as number, by = 380, hh = h as number, w = 70, d = 40;
          return (
            <g key={i}>
              <polygon points={`${cx - w},${by - d - hh} ${cx},${by - hh} ${cx},${by} ${cx - w},${by - d}`} fill={l as string} />
              <polygon points={`${cx},${by - hh} ${cx + w},${by - d - hh} ${cx + w},${by - d} ${cx},${by}`} fill={r as string} />
              <polygon points={`${cx - w},${by - d - hh} ${cx},${by - 2 * d - hh} ${cx + w},${by - d - hh} ${cx},${by - hh}`} fill={top as string} />
            </g>
          );
        })}
      </svg>
    </Tile>
  ),
};

const GREEN = "#39FF6A";
const crtText: CSS = { fontFamily: f.vt, color: GREEN, textShadow: `0 0 6px ${GREEN}, 0 0 18px rgba(57,255,106,0.5)` };
const Scan: React.FC = () => (
  <>
    <AbsoluteFill style={{ background: "repeating-linear-gradient(rgba(0,0,0,0.4) 0 2px, transparent 2px 5px)", pointerEvents: "none" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75) 100%)", pointerEvents: "none" }} />
  </>
);
const crt: Style = {
  name: "Retro terminal / CRT",
  a: (
    <Tile style={{ background: "#041a0a", gap: 26 }}>
      <div style={{ ...crtText, fontSize: 36 }}>C:\VERB&gt; run agent.exe</div>
      <div style={{ ...crtText, fontSize: 92, lineHeight: 0.95 }}>LET AI <span style={{ background: GREEN, color: "#041a0a", textShadow: "none", padding: "0 8px" }}>DO THE WORK</span> FOR YOUR USERS_</div>
      <Scan />
    </Tile>
  ),
  b: (
    <Tile style={{ background: "#041a0a" }}>
      <div style={{ ...crtText, fontSize: 40, lineHeight: 1.15, display: "flex", flexDirection: "column", gap: 26 }}>
        <div>user&gt; {ASK.toLowerCase()}</div>
        <div>verb&gt; {ANS.toLowerCase()} [Y/n]</div>
        <div><span style={{ background: GREEN, color: "#041a0a", textShadow: "none", padding: "0 10px" }}>Y</span> _</div>
      </div>
      <Scan />
    </Tile>
  ),
  c: (
    <Tile style={{ background: "#041a0a", gap: 20 }}>
      <div style={{ ...crtText, fontSize: 40 }}>CHALLENGE.LOG</div>
      <div style={{ ...crtText, fontSize: 250, lineHeight: 0.9 }}>24/30</div>
      <div style={{ ...crtText, fontSize: 44 }}>[################------]</div>
      <div style={{ ...crtText, fontSize: 36 }}>paying: 0 &nbsp; goal: 10</div>
      <Scan />
    </Tile>
  ),
};

const px = (c: string, s = 6): CSS => ({ boxShadow: `0 -${s}px 0 0 ${c}, 0 ${s}px 0 0 ${c}, -${s}px 0 0 0 ${c}, ${s}px 0 0 0 ${c}` });
const Cloud: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <>
    <Abs style={{ left: x, top: y + 24, width: 144, height: 36, background: "#fff" }} />
    <Abs style={{ left: x + 24, top: y + 12, width: 96, height: 12, background: "#fff" }} />
    <Abs style={{ left: x + 48, top: y, width: 48, height: 12, background: "#fff" }} />
  </>
);
const Bricks: React.FC = () => (
  <Abs style={{ left: 0, right: 0, bottom: 0, height: 96, background: "#C84C0C", backgroundImage: "linear-gradient(#000 3px, transparent 3px), linear-gradient(90deg, #000 3px, transparent 3px)", backgroundSize: "48px 48px" }} />
);
const pixel: Style = {
  name: "Pixel art / 8-bit",
  a: (
    <Tile style={{ background: "#5C94FC", gap: 34, paddingBottom: 130 }}>
      <Cloud x={380} y={60} /><Cloud x={60} y={110} /><Bricks />
      <Rel style={{ alignSelf: "flex-start", background: "#FCE000", color: "#000", padding: "10px 14px", fontFamily: f.press, fontSize: 22, ...px("#000") }}>AI AGENT</Rel>
      <Rel><H1 s={{ fontFamily: f.press, fontSize: 44, lineHeight: 1.45, color: "#fff", textShadow: "4px 4px 0 #000" }} m={{ color: "#FCE000" }} /></Rel>
    </Tile>
  ),
  b: (
    <Tile style={{ background: "#5C94FC", justifyContent: "flex-end", paddingBottom: 40 }}>
      <Cloud x={60} y={70} />
      <div style={{ position: "relative", background: "#000", border: "6px solid #fff", outline: "6px solid #000", padding: 26, display: "flex", flexDirection: "column", gap: 24, fontFamily: f.press, fontSize: 22, lineHeight: 1.6, color: "#fff" }}>
        <div><span style={{ color: "#FCE000" }}>YOU:</span> {ASK.toUpperCase()}</div>
        <div><span style={{ color: "#3DDC97" }}>VERB:</span> {ANS.toUpperCase()}</div>
        <div style={{ color: "#FCE000" }}>&#9654; YES &nbsp;&nbsp; NO</div>
      </div>
    </Tile>
  ),
  c: (
    <Tile style={{ background: "#000", gap: 40, alignItems: "center" }}>
      <div style={{ fontFamily: f.press, fontSize: 30, color: "#fff" }}>WORLD 1-1</div>
      <div style={{ fontFamily: f.press, fontSize: 120, color: "#FCE000", textShadow: "8px 8px 0 #C84C0C" }}>24</div>
      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: 15 }, (_, i) => <div key={i} style={{ width: 26, height: 40, background: i < 12 ? "#3DDC97" : "#333" }} />)}
      </div>
      <div style={{ fontFamily: f.press, fontSize: 24, color: "#fff" }}>DAY 24 OF 30</div>
    </Tile>
  ),
};

const win95: CSS = { background: "#c0c0c0", borderStyle: "solid", borderWidth: 3, borderColor: "#fff #404040 #404040 #fff", boxShadow: "inset -3px -3px #808080, inset 3px 3px #dfdfdf" };
const Sunset: React.FC = () => (
  <>
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #1a0033 0%, #5b1a8a 35%, #ff6ad5 62%, #ffb86c 70%, #1a0033 70%)" }} />
    <Abs style={{ left: 150, top: 190, width: 300, height: 300, borderRadius: "50%", background: "linear-gradient(#ffe46b, #ff5fa2)",
      WebkitMaskImage: "linear-gradient(#000 50%, transparent 50% 54%, #000 54% 63%, transparent 63% 68%, #000 68% 77%, transparent 77% 83%, #000 83%)",
      maskImage: "linear-gradient(#000 50%, transparent 50% 54%, #000 54% 63%, transparent 63% 68%, #000 68% 77%, transparent 77% 83%, #000 83%)" }} />
    <Abs style={{ left: -400, right: -400, top: 525, height: 420, transform: "perspective(260px) rotateX(62deg)", transformOrigin: "top", ...grid("#ff3fd2", 60, 3) }} />
  </>
);
const chrome: CSS = { backgroundImage: "linear-gradient(180deg, #ffffff 0%, #a8e6ff 46%, #2b0a5a 50%, #ff8fe0 78%, #ffffff 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" };
const vaporwave: Style = {
  name: "Vaporwave",
  a: (
    <Tile style={{ justifyContent: "flex-start", gap: 10, paddingTop: 50 }}>
      <Sunset />
      <Rel style={{ fontFamily: f.monoton, fontSize: 40, color: "#7ff9ff", letterSpacing: 14, textShadow: "0 0 12px #7ff9ff" }}>AI AGENT</Rel>
      <Rel><H1 s={{ fontFamily: f.unbounded, fontSize: 56, lineHeight: 1.08, color: "#fff", textShadow: "4px 4px 0 #ff3fd2, 0 0 24px rgba(127,249,255,0.6)" }} m={{ color: "#7ff9ff" }} /></Rel>
    </Tile>
  ),
  b: (
    <Tile>
      <Sunset />
      <div style={{ position: "relative", ...win95, padding: 4 }}>
        <div style={{ background: "linear-gradient(90deg, #000080, #1084d0)", color: "#fff", fontFamily: F.body, fontWeight: 600, fontSize: 24, padding: "6px 12px", display: "flex", justifyContent: "space-between" }}>
          <span>askverb.exe</span><span style={{ ...win95, color: "#000", padding: "0 10px", fontSize: 18, borderWidth: 2 }}>x</span>
        </div>
        <Chat panel={{ padding: 22, background: "#c0c0c0" }} gap={18}
          user={{ background: "#fff", border: "2px solid #000", padding: "12px 16px", fontFamily: F.body, fontSize: 26 }}
          agent={{ background: "#ffffe1", border: "2px solid #000", padding: "12px 16px", fontFamily: F.body, fontSize: 26 }}
          btn={{ ...win95, padding: "8px 26px", fontFamily: F.body, fontSize: 24, outline: "2px dotted #000", outlineOffset: -8 }} />
      </div>
    </Tile>
  ),
  c: (
    <Tile style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 70 }}>
      <Sunset />
      <Rel style={{ fontFamily: f.unbounded, fontSize: 240, lineHeight: 1, ...chrome, filter: "drop-shadow(6px 6px 0 #ff3fd2)" }}>24</Rel>
      <Rel style={{ fontFamily: f.monoton, fontSize: 44, color: "#7ff9ff", textShadow: "0 0 12px #7ff9ff" }}>D A Y S</Rel>
    </Tile>
  ),
};

const kinetic: Style = {
  name: "Kinetic typography",
  a: (
    <Tile style={{ background: "#0b0b0b", padding: 0, justifyContent: "center", gap: 0 }}>
      {[["LET AI", "#fff", 190, -10, false], ["DO THE", "#FFE14D", 210, 20, false], ["WORK", "transparent", 260, -30, true], ["FOR YOUR USERS", "#fff", 92, 24, false]].map(([t, c, s, x, outline], i) => (
        <div key={i} style={{ fontFamily: f.anton, fontSize: s as number, lineHeight: 0.86, color: c as string, marginLeft: x as number, whiteSpace: "nowrap",
          WebkitTextStroke: outline ? "3px #fff" : undefined }}>{t}</div>
      ))}
    </Tile>
  ),
  b: (
    <Tile style={{ background: "#FFE14D", padding: 30, gap: 10 }}>
      <div style={{ fontFamily: f.anton, fontSize: 82, lineHeight: 0.92, color: "#0b0b0b", textTransform: "uppercase" }}>{ASK}</div>
      <div style={{ fontFamily: f.anton, fontSize: 250, lineHeight: 0.9, color: "transparent", WebkitTextStroke: "4px #0b0b0b", transform: "rotate(-4deg)" }}>DONE.</div>
      <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 30, color: "#0b0b0b" }}>12 tasks moved.</div>
    </Tile>
  ),
  c: (
    <Tile style={{ background: "#0b0b0b", padding: 0, flexDirection: "row", alignItems: "center" }}>
      <div style={{ fontFamily: f.anton, fontSize: 600, lineHeight: 0.8, color: "#FFE14D", marginLeft: -30 }}>24</div>
      <div style={{ fontFamily: f.anton, fontSize: 120, color: "#fff", writingMode: "vertical-rl", lineHeight: 0.9 }}>DAYS IN</div>
    </Tile>
  ),
};

const editorial: Style = {
  name: "Editorial / Magazine",
  a: (
    <Tile style={{ background: "#F4F0E8", justifyContent: "space-between", padding: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "2px solid #1a1a1a", paddingBottom: 12 }}>
        <span style={{ fontFamily: f.instrument, fontSize: 64, color: "#1a1a1a" }}>Verb</span>
        <span style={{ fontFamily: F.body, fontSize: 18, letterSpacing: 3, color: "#555" }}>ISSUE 24 . OCTOBER</span>
      </div>
      <H1 s={{ fontFamily: f.instrument, fontSize: 102, lineHeight: 0.92, color: "#1a1a1a", letterSpacing: -2 }} m={{ fontFamily: f.instrumentI, color: "#B4432A" }} />
      <div style={{ columnCount: 2, columnGap: 24, fontFamily: F.body, fontSize: 17, lineHeight: 1.45, color: "#333", borderTop: "1px solid #1a1a1a", paddingTop: 14 }}>
        A 22-year-old builder on giving every SaaS its own AI agent, one that works inside the product, signed in as the user, and finishes the task.
      </div>
    </Tile>
  ),
  b: (
    <Tile style={{ background: "#F4F0E8", padding: 44, gap: 20 }}>
      <div style={{ fontFamily: f.instrument, fontSize: 200, lineHeight: 0.5, color: "#B4432A", height: 70 }}>&ldquo;</div>
      <div style={{ fontFamily: f.instrumentI, fontSize: 60, lineHeight: 1.02, color: "#1a1a1a" }}>{ASK}.</div>
      <div style={{ height: 1, background: "#1a1a1a", margin: "10px 0" }} />
      <div style={{ fontFamily: F.body, fontSize: 24, lineHeight: 1.5, color: "#333" }}><b>The reply:</b> {ANS}</div>
      <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 22, letterSpacing: 2, color: "#B4432A", borderBottom: "2px solid #B4432A", alignSelf: "flex-start" }}>YES, TELL THEM</div>
    </Tile>
  ),
  c: (
    <Tile style={{ background: "#F4F0E8", padding: 40, justifyContent: "flex-start", gap: 16 }}>
      <div style={{ height: 440, overflow: "hidden" }}><Photo style={{ filter: "grayscale(1) contrast(1.15)" }} /></div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
        <div style={{ fontFamily: f.instrument, fontSize: 170, lineHeight: 0.8, color: "#1a1a1a" }}>24</div>
        <div style={{ fontFamily: f.instrumentI, fontSize: 34, lineHeight: 1.1, color: "#333", paddingBottom: 6 }}>days into a thirty-day bet on one product.</div>
      </div>
    </Tile>
  ),
};

const bpLine = "rgba(255,255,255,0.9)";
const blueprintBg: CSS = { background: "#1F4E8C", backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.3) 2px, transparent 2px), linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "150px 150px, 150px 150px, 30px 30px, 30px 30px" };
const note: CSS = { fontFamily: f.spacemono, fontSize: 18, color: "#cfe3ff", letterSpacing: 1 };
const blueprint: Style = {
  name: "Blueprint / Technical drawing",
  a: (
    <Tile style={{ ...blueprintBg, gap: 26 }}>
      <div style={note}>FIG. 01 . AI AGENT . SCALE 1:1</div>
      <H1 s={{ fontFamily: f.spacemono, fontWeight: 700, fontSize: 62, lineHeight: 1.12, color: "#fff" }} m={{ border: `3px dashed ${bpLine}`, padding: "0 12px", margin: "8px 0" }} />
      <svg width="500" height="80"><line x1="0" y1="40" x2="500" y2="40" stroke={bpLine} strokeWidth="2" /><polygon points="0,40 16,32 16,48" fill="#fff" /><polygon points="500,40 484,32 484,48" fill="#fff" /><text x="190" y="30" fill="#cfe3ff" fontFamily={f.spacemono} fontSize="20">under 1 hr</text></svg>
    </Tile>
  ),
  b: (
    <Tile style={blueprintBg}>
      <Chat panel={{ border: `3px solid ${bpLine}`, padding: 28 }}
        head={<div style={note}>A. REQUEST &nbsp; B. REPLY &nbsp; C. CONFIRM</div>}
        user={{ border: `2px dashed ${bpLine}`, padding: "14px 18px", fontFamily: f.spacemono, fontSize: 24, color: "#fff" }}
        agent={{ border: `2px solid ${bpLine}`, padding: "14px 18px", fontFamily: f.spacemono, fontSize: 24, color: "#fff", background: "rgba(255,255,255,0.08)" }}
        btn={{ border: `2px solid ${bpLine}`, borderRadius: 999, padding: "10px 24px", fontFamily: f.spacemono, fontWeight: 700, fontSize: 22, color: "#fff" }} />
    </Tile>
  ),
  c: (
    <Tile style={{ ...blueprintBg, alignItems: "center" }}>
      <svg width="460" height="460" viewBox="0 0 460 460">
        <circle cx="230" cy="230" r="200" stroke={bpLine} strokeWidth="3" fill="none" />
        <circle cx="230" cy="230" r="150" stroke={bpLine} strokeWidth="1" strokeDasharray="8 8" fill="none" />
        <path d={`M230 30 A200 200 0 1 1 ${230 - 200 * Math.sin(2 * Math.PI * 0.2)} ${230 - 200 * Math.cos(2 * Math.PI * 0.2)}`} stroke="#fff" strokeWidth="12" fill="none" />
        <line x1="10" y1="230" x2="450" y2="230" stroke="rgba(255,255,255,0.3)" /><line x1="230" y1="10" x2="230" y2="450" stroke="rgba(255,255,255,0.3)" />
        <text x="230" y="260" textAnchor="middle" fill="#fff" fontFamily={f.spacemono} fontWeight={700} fontSize="110">24</text>
        <text x="230" y="310" textAnchor="middle" fill="#cfe3ff" fontFamily={f.spacemono} fontSize="22">DAY / 30</text>
      </svg>
    </Tile>
  ),
};

const mesh: CSS = { background: "radial-gradient(at 15% 15%, #ff7a59 0, transparent 50%), radial-gradient(at 85% 25%, #7b5cff 0, transparent 55%), radial-gradient(at 45% 95%, #00d1b2 0, transparent 55%), radial-gradient(at 90% 90%, #ffcf5c 0, transparent 40%), #1b1036" };
const meshStyle: Style = {
  name: "Grainy mesh gradient",
  a: (
    <Tile style={{ ...mesh, gap: 30 }}>
      <Rel style={{ fontFamily: F.body, fontWeight: 600, fontSize: 26, color: "rgba(255,255,255,0.85)", letterSpacing: 4 }}>AI AGENT</Rel>
      <Rel><H1 s={{ fontFamily: f.unbounded, fontSize: 64, lineHeight: 1.08, color: "#fff" }} m={{ color: "#FFE9A8" }} /></Rel>
      <Grain o={0.35} blend="overlay" />
    </Tile>
  ),
  b: (
    <Tile style={mesh}>
      <Chat panel={{ padding: 0 }}
        user={{ background: "#fff", color: "#1b1036", borderRadius: 28, padding: "20px 24px", fontFamily: F.body, fontSize: 29 }}
        agent={{ background: "#1b1036", color: "#fff", borderRadius: 28, padding: "20px 24px", fontFamily: F.body, fontSize: 29 }}
        btn={{ background: "#FFE9A8", color: "#1b1036", borderRadius: 999, padding: "16px 30px", fontFamily: F.body, fontWeight: 600, fontSize: 26 }} />
      <Grain o={0.35} blend="overlay" />
    </Tile>
  ),
  c: (
    <Tile style={{ ...mesh, alignItems: "flex-start", justifyContent: "flex-end" }}>
      <Rel style={{ fontFamily: f.unbounded, fontSize: 300, lineHeight: 0.9, color: "#fff" }}>24</Rel>
      <Rel style={{ fontFamily: F.body, fontSize: 32, color: "rgba(255,255,255,0.85)" }}>days into 30</Rel>
      <Grain o={0.35} blend="overlay" />
    </Tile>
  ),
};

const R = "#D7263D", Bb = "#1D4E9E", Y = "#F2B705";
const bauhaus: Style = {
  name: "Bauhaus",
  a: (
    <Tile style={{ background: "#F2E8D5", justifyContent: "flex-end", gap: 20 }}>
      <Abs style={{ right: -60, top: -60, width: 300, height: 300, borderRadius: "50%", background: R }} />
      <Abs style={{ left: 0, top: 60, width: 220, height: 110, borderRadius: "110px 110px 0 0", background: Bb }} />
      <Abs style={{ left: 260, top: 150, width: 0, height: 0, borderLeft: "80px solid transparent", borderRight: "80px solid transparent", borderBottom: `140px solid ${Y}` }} />
      <Abs style={{ left: 0, right: 0, top: 300, height: 18, background: "#111" }} />
      <Rel><H1 s={{ fontFamily: f.josefin, fontSize: 70, lineHeight: 1.02, color: "#111", textTransform: "uppercase" }} m={{ background: Bb, color: "#F2E8D5", padding: "8px 14px 0", margin: "6px 0" }} /></Rel>
    </Tile>
  ),
  b: (
    <Tile style={{ background: "#F2E8D5" }}>
      <Abs style={{ left: -80, bottom: -80, width: 260, height: 260, borderRadius: "50%", background: Y }} />
      <Chat panel={{ padding: 0 }} gap={20}
        user={{ background: R, color: "#F2E8D5", padding: "22px 24px", fontFamily: f.josefin, fontSize: 30, textTransform: "uppercase", lineHeight: 1.1 }}
        agent={{ background: "#111", color: "#F2E8D5", padding: "22px 24px", borderRadius: "0 60px 60px 0", fontFamily: f.josefin, fontSize: 30, textTransform: "uppercase", lineHeight: 1.1 }}
        btn={{ background: Bb, color: "#F2E8D5", padding: "14px 28px", borderRadius: 999, fontFamily: f.josefin, fontSize: 26, textTransform: "uppercase" }} />
    </Tile>
  ),
  c: (
    <Tile style={{ background: "#F2E8D5", alignItems: "center" }}>
      <Abs style={{ left: 0, right: 0, top: 360, height: 30, background: "#111" }} />
      <Abs style={{ left: 60, top: 60, width: 80, height: 620, background: Y }} />
      <div style={{ position: "relative", width: 400, height: 400, borderRadius: "50%", background: R, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: f.josefin, fontSize: 220, lineHeight: 0.9, color: "#F2E8D5", paddingTop: 30 }}>24</div>
        <div style={{ fontFamily: f.josefin, fontSize: 32, color: "#F2E8D5" }}>OF 30</div>
      </div>
    </Tile>
  ),
};

const ACID = "#C6FF00";
const acid: Style = {
  name: "Acid graphics / Brutalist web",
  a: (
    <Tile style={{ background: "#0A0A0A", gap: 10, padding: 36 }}>
      <svg width="140" height="140" style={{ position: "absolute", right: 30, bottom: 110 }} viewBox="-70 -70 140 140">
        {Array.from({ length: 8 }, (_, i) => <line key={i} x1="0" y1="0" x2={66 * Math.cos((i * Math.PI) / 4)} y2={66 * Math.sin((i * Math.PI) / 4)} stroke={ACID} strokeWidth="5" />)}
      </svg>
      <div style={{ fontFamily: f.spacemono, fontSize: 20, color: ACID }}>/// AI_AGENT v0.24 /// SYS.OK</div>
      <div style={{ fontFamily: f.syne, fontSize: 76, lineHeight: 0.82, color: ACID, transform: "scaleY(1.4)", transformOrigin: "top", marginBottom: 190, textTransform: "uppercase", letterSpacing: -4 }}>
        Let AI <span style={{ color: "transparent", WebkitTextStroke: `2px ${ACID}` }}>do the work</span> for your users
      </div>
      <div style={{ height: 50, backgroundImage: `repeating-linear-gradient(90deg, ${ACID} 0 3px, transparent 3px 6px, ${ACID} 6px 12px, transparent 12px 15px)` }} />
    </Tile>
  ),
  b: (
    <Tile style={{ background: "#fff", justifyContent: "flex-start", padding: 30 }}>
      <div style={{ fontFamily: "'Times New Roman', Times, serif", color: "#000", fontSize: 28, lineHeight: 1.35 }}>
        <div style={{ fontSize: 46, fontWeight: 700 }}>askverb</div>
        <hr style={{ border: 0, borderTop: "2px solid #000" }} />
        <p style={{ margin: "18px 0" }}><b>user:</b> {ASK}</p>
        <p style={{ margin: "18px 0" }}><b>agent:</b> {ANS}</p>
        <p style={{ margin: "18px 0" }}><span style={{ color: "#0000EE", textDecoration: "underline" }}>[ yes, tell them ]</span> <span style={{ color: "#551A8B", textDecoration: "underline" }}>[ no ]</span></p>
        <hr style={{ border: 0, borderTop: "1px solid #000" }} />
        <div style={{ fontSize: 20 }}>last modified: day 24</div>
      </div>
    </Tile>
  ),
  c: (
    <Tile style={{ background: ACID, padding: 30, justifyContent: "space-between" }}>
      <div style={{ fontFamily: f.spacemono, fontWeight: 700, fontSize: 24, color: "#0A0A0A", display: "flex", justifyContent: "space-between" }}><span>DAY_COUNT</span><span>[24/30]</span></div>
      <div style={{ fontFamily: f.syne, fontSize: 290, lineHeight: 0.7, color: "#0A0A0A", transform: "scaleY(1.5)", transformOrigin: "bottom", letterSpacing: -14 }}>24</div>
      <div style={{ background: "#0A0A0A", color: ACID, fontFamily: f.spacemono, fontSize: 22, padding: "8px 12px" }}>PAYING=0 // GOAL=10 // KEEP SHIPPING</div>
    </Tile>
  ),
};

const stk = (bg: string, rot: number, extra?: CSS): CSS => ({ background: bg, border: "7px solid #fff", borderRadius: 22, transform: `rotate(${rot}deg)`, boxShadow: "0 6px 12px rgba(0,0,0,0.45)", ...extra });
const Laptop: CSS = { background: "#2a2a30", backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "8px 8px" };
const stickers: Style = {
  name: "Sticker bomb",
  a: (
    <Tile style={{ ...Laptop, gap: 16, alignItems: "flex-start" }}>
      <Abs style={{ ...stk("#FF4F79", 12, { borderRadius: "50%" }), right: 30, top: 40, width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, color: "#fff" }}>&#9733;</Abs>
      <Abs style={{ ...stk("#111", -8, { padding: "8px 18px", fontFamily: f.bungee, fontSize: 22, color: ACID }), left: 40, bottom: 60 }}>askverb.com</Abs>
      <Rel style={{ ...stk("#FFD23F", -6, { padding: "10px 24px", fontFamily: f.bungee, fontSize: 64, color: "#111" }) }}>LET AI</Rel>
      <Rel style={{ ...stk("#7B5CFF", 3, { padding: "10px 24px", fontFamily: f.bungee, fontSize: 64, color: "#fff" }), marginLeft: 40 }}>DO THE WORK</Rel>
      <Rel style={{ ...stk("#3DDC97", -3, { padding: "10px 24px", fontFamily: f.fredoka, fontSize: 44, color: "#111" }) }}>for your users</Rel>
    </Tile>
  ),
  b: (
    <Tile style={Laptop}>
      <Abs style={{ ...stk("#FF4F79", -10, { padding: "6px 16px", fontFamily: f.bungee, fontSize: 24, color: "#fff" }), right: 30, top: 50 }}>AI AGENT</Abs>
      <Chat panel={{ padding: 0, marginTop: 40 }} gap={30}
        user={{ ...stk("#fff", 3, { border: "7px solid #FFD23F" }), padding: "16px 22px", fontFamily: f.fredoka, fontSize: 30, color: "#111" }}
        agent={{ ...stk("#7B5CFF", -2), padding: "16px 22px", fontFamily: f.fredoka, fontSize: 30, color: "#fff" }}
        btn={{ ...stk("#3DDC97", 4, { borderRadius: 999 }), padding: "12px 28px", fontFamily: f.bungee, fontSize: 24, color: "#111" }} />
    </Tile>
  ),
  c: (
    <Tile style={{ ...Laptop, alignItems: "center" }}>
      <Abs style={{ ...stk("#3DDC97", 14, { padding: "6px 14px", fontFamily: f.bungee, fontSize: 22, color: "#111" }), left: 40, top: 60 }}>0 to 10</Abs>
      <Abs style={{ ...stk("#FF4F79", -12, { borderRadius: "50%", width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: f.bungee, fontSize: 30, color: "#fff" }), right: 40, bottom: 70 }}>GO!</Abs>
      <div style={{ ...stk("#FFD23F", -5, { borderRadius: "50%", border: "10px solid #fff" }), width: 400, height: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: f.bungee, fontSize: 40, color: "#111" }}>DAY</div>
        <div style={{ fontFamily: f.bungee, fontSize: 190, lineHeight: 1, color: "#111" }}>24</div>
      </div>
    </Tile>
  ),
};

const duotone: Style = {
  name: "Duotone",
  a: (
    <Tile style={{ padding: 40, justifyContent: "flex-end" }}>
      <Duo light="#FF5EA8" dark="#1B1464" />
      <Rel><H1 s={{ fontFamily: f.anton, fontSize: 104, lineHeight: 0.94, color: "#fff", textTransform: "uppercase" }} m={{ color: "#FFE0F0" }} /></Rel>
    </Tile>
  ),
  b: (
    <Tile style={{ background: "linear-gradient(160deg, #1B1464, #FF5EA8)" }}>
      <Chat panel={{ padding: 0 }}
        user={{ background: "#FF5EA8", color: "#1B1464", padding: "20px 24px", borderRadius: 6, fontFamily: f.outfit, fontWeight: 700, fontSize: 30 }}
        agent={{ background: "#1B1464", color: "#FFD1E6", padding: "20px 24px", borderRadius: 6, fontFamily: f.outfit, fontSize: 30 }}
        btn={{ background: "#FFD1E6", color: "#1B1464", padding: "14px 28px", borderRadius: 6, fontFamily: f.outfit, fontWeight: 700, fontSize: 26 }} />
    </Tile>
  ),
  c: (
    <Tile style={{ padding: 40, justifyContent: "flex-end" }}>
      <Duo light="#C6FF00" dark="#0F3D3E" />
      <Rel style={{ fontFamily: f.anton, fontSize: 260, lineHeight: 0.85, color: "#fff", textShadow: "6px 6px 0 #0F3D3E" }}>24</Rel>
      <Rel style={{ fontFamily: f.outfit, fontWeight: 700, fontSize: 34, color: "#fff" }}>DAYS OF 30</Rel>
    </Tile>
  ),
};

const Polaroid: React.FC<{ rot: number; w: number; caption: string; style?: CSS }> = ({ rot, w, caption, style }) => (
  <div style={{ background: "#fff", padding: `${w * 0.05}px ${w * 0.05}px ${w * 0.2}px`, width: w, boxSizing: "border-box", transform: `rotate(${rot}deg)`, boxShadow: "0 10px 20px rgba(0,0,0,0.3)", position: "relative", ...style }}>
    <div style={{ height: w * 0.95 }}><Photo style={{ filter: "sepia(0.25) contrast(1.05) saturate(1.1)" }} /></div>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: w * 0.04, textAlign: "center", fontFamily: f.caveat, fontSize: w * 0.09, color: "#333" }}>{caption}</div>
  </div>
);
const scrapPaper: CSS = { background: "#EFE6D8" };
const scrapbook: Style = {
  name: "Polaroid / Scrapbook",
  a: (
    <Tile style={{ ...scrapPaper, justifyContent: "flex-start", gap: 20, paddingTop: 40 }}>
      <Polaroid rot={-6} w={250} caption="day 1" style={{ alignSelf: "flex-end" }} />
      <div style={tape(30, { right: 160, top: 40, width: 110 })} />
      <Rel><H1 s={{ fontFamily: f.playfair, fontWeight: 900, fontSize: 66, lineHeight: 1.04, color: "#2a2018" }} m={{ fontFamily: f.caveat, fontSize: 84, color: "#C2452D", fontWeight: 700 }} /></Rel>
      <Grain o={0.25} />
    </Tile>
  ),
  b: (
    <Tile style={scrapPaper}>
      <Chat panel={{ padding: 0 }} gap={30}
        user={{ background: "#fff", padding: "18px 22px", fontFamily: f.caveat, fontSize: 40, lineHeight: 1, color: "#2a2018", transform: "rotate(2deg)", boxShadow: "0 4px 8px rgba(0,0,0,0.2)", backgroundImage: "repeating-linear-gradient(transparent 0 38px, #c8d8ee 38px 40px)", borderTop: "4px solid #e57373" }}
        agent={{ background: "#FFF59D", padding: "22px 22px", fontFamily: f.caveat, fontSize: 40, lineHeight: 1, color: "#2a2018", transform: "rotate(-2deg)", boxShadow: "0 6px 10px rgba(0,0,0,0.2)" }}
        btn={{ background: "rgba(194,69,45,0.85)", color: "#fff", padding: "8px 26px", fontFamily: f.caveat, fontSize: 38, transform: "rotate(-3deg)" }} />
      <Grain o={0.25} />
    </Tile>
  ),
  c: (
    <Tile style={{ ...scrapPaper, alignItems: "center" }}>
      <Polaroid rot={4} w={420} caption="day 24 of 30, still going" />
      <div style={tape(-20, { left: 70, top: 90 })} />
      <Grain o={0.25} />
    </Tile>
  ),
};

const minimal: Style = {
  name: "Minimal monochrome",
  a: (
    <Tile style={{ background: "#fff", justifyContent: "space-between", padding: 56 }}>
      <div style={{ fontFamily: F.body, fontSize: 16, letterSpacing: 5, color: "#999" }}>AI AGENT</div>
      <H1 s={{ fontFamily: f.instrument, fontSize: 84, lineHeight: 1, color: "#111", letterSpacing: -1 }} m={{ fontFamily: f.instrumentI }} />
      <div style={{ fontFamily: F.body, fontSize: 16, color: "#999" }}>askverb.com</div>
    </Tile>
  ),
  b: (
    <Tile style={{ background: "#fff", padding: 56 }}>
      <Chat panel={{ padding: 0 }} gap={28}
        user={{ border: "1px solid #111", borderRadius: 999, padding: "16px 26px", fontFamily: F.body, fontSize: 26, color: "#111" }}
        agent={{ background: "#111", borderRadius: 26, padding: "18px 26px", fontFamily: F.body, fontSize: 26, color: "#fff" }}
        btn={{ fontFamily: F.body, fontSize: 22, color: "#111", borderBottom: "1px solid #111", paddingBottom: 4 }} />
    </Tile>
  ),
  c: (
    <Tile style={{ background: "#fff", padding: 56, justifyContent: "space-between" }}>
      <div style={{ fontFamily: F.body, fontSize: 16, letterSpacing: 5, color: "#999" }}>DAY</div>
      <div style={{ fontFamily: f.instrument, fontSize: 380, lineHeight: 0.8, color: "#111" }}>24</div>
      <div style={{ fontFamily: F.body, fontSize: 16, color: "#999" }}>of 30</div>
    </Tile>
  ),
};

export const STYLES: Style[] = [
  claymorphism, skeuomorphism, neumorphism, bento, swiss,
  memphis, aero, riso, popart, collage,
  doodle, iso, crt, pixel, vaporwave,
  kinetic, editorial, blueprint, meshStyle, bauhaus,
  acid, stickers, duotone, scrapbook, minimal,
];

export const PER_PAGE = 5;
export const SHEET = { width: 3 * W + 2 * 40 + 2 * 40, height: 50 + PER_PAGE * (80 + H) + (PER_PAGE - 1) * 50 + 50 };

export const StyleSheet: React.FC = () => {
  const page = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#E9E9E9", padding: "50px 40px", gap: 50 }}>
      {STYLES.slice(page * PER_PAGE, (page + 1) * PER_PAGE).map((s, i) => (
        <div key={s.name}>
          <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 50, height: 80, color: "#111" }}>{page * PER_PAGE + i + 1}. {s.name}</div>
          <div style={{ display: "flex", gap: 40 }}>{s.a}{s.b}{s.c}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
