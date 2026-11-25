import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "../../kit/theme";
import { ClayBuddy, Mood } from "../../kit/ClayBuddy";
import { CLAY, CLAY_FONT, clay } from "../talking-head/clay";

// The signature pick (2026-10-26): three directions for the faceless lane, each shown on the same three moments of
// free-business-email (the hook, the hidden door, the ask). Vishnu picks one; it is then locked in brand/BRAND.md.
// Every direction keeps the same four parts: the line on top with its key word marked, a small section tag, the
// buddy in every shot, and one big object that acts the line out.

type Dir = {
  name: string;
  bg: React.CSSProperties;
  blobs: [string, string];
  text: string;
  sub: string;
  font: string;
  lineFont: string;
  mark: (s: string) => React.ReactNode;
  card: string;
  accent: string;
  buddy: { body: string; ink: string };
  surface: (fill: string, r?: number) => React.CSSProperties;
};

const glow = (fill: string, r = 44): React.CSSProperties => ({
  ...clay(fill, r),
  boxShadow: "inset -10px -12px 22px rgba(0,0,0,0.28), inset 10px 12px 22px rgba(255,255,255,0.35), 0 0 60px rgba(255,196,0,0.35), 0 30px 50px rgba(0,0,0,0.6)",
});

const DIRS: Dir[] = [
  {
    name: "A  Clay room",
    bg: { background: "#E9DDFB" },
    blobs: ["#FFD6A8", "#BFF0D4"],
    text: CLAY.ink,
    sub: "#7b62a8",
    font: CLAY_FONT,
    lineFont: CLAY_FONT,
    mark: (s) => <span style={{ ...clay("#FFB4C8", 22), padding: "0 14px" }}>{s}</span>,
    card: "#F7F2FF",
    accent: "#FFF0B8",
    buddy: { body: "#CBB7F5", ink: CLAY.ink },
    surface: clay,
  },
  {
    name: "B  Gold desk",
    bg: { background: C.parchment },
    blobs: [C.goldWash, "#eef0f4"],
    text: C.ink,
    sub: C.graphite,
    font: F.display,
    lineFont: F.body,
    mark: (s) => <span style={{ fontFamily: F.display, fontStyle: "italic", color: C.goldDeep, background: C.goldWash, padding: "0 10px", borderRadius: 12 }}>{s}</span>,
    card: C.paper,
    accent: C.gold,
    buddy: { body: C.gold, ink: C.ink },
    surface: clay,
  },
  {
    name: "C  Night shift",
    bg: { background: "radial-gradient(circle at 50% 38%, #2a2b33 0%, #14151a 62%)" },
    blobs: ["#2a2418", "#1d1e25"],
    text: "#f8f9fb",
    sub: "#9aa1ad",
    font: CLAY_FONT,
    lineFont: F.body,
    mark: (s) => <span style={{ color: C.gold, textShadow: "0 0 24px rgba(255,196,0,0.6)" }}>{s}</span>,
    card: "#24252d",
    accent: C.gold,
    buddy: { body: C.gold, ink: C.ink },
    surface: glow,
  },
];

/** The spoken line on top, key word marked, with the section tag above it. */
const Line: React.FC<{ d: Dir; tag: string; before: string; mark: string; after?: string }> = ({ d, tag, before, mark, after = "" }) => (
  <div style={{ position: "absolute", top: 150, left: 80, right: 80 }}>
    <div style={{ fontFamily: F.mono, fontSize: 30, color: d.sub, letterSpacing: 1, marginBottom: 26 }}>{tag}</div>
    <div style={{ fontFamily: d.lineFont, fontWeight: 600, fontSize: 74, lineHeight: 1.18, color: d.text }}>
      {before} {d.mark(mark)}{after}
    </div>
  </div>
);

const Room: React.FC<{ d: Dir; children: React.ReactNode }> = ({ d, children }) => (
  <AbsoluteFill style={{ ...d.bg, overflow: "hidden" }}>
    <div style={{ ...d.surface(d.blobs[0], 999), position: "absolute", width: 460, height: 460, right: -170, top: 620, opacity: 0.9 }} />
    <div style={{ ...d.surface(d.blobs[1], 999), position: "absolute", width: 300, height: 300, left: -110, bottom: 220, opacity: 0.9 }} />
    {children}
  </AbsoluteFill>
);

const Buddy: React.FC<{ d: Dir; mood: Mood; size?: number; style?: React.CSSProperties }> = ({ d, mood, size = 260, style }) => (
  <div style={{ position: "absolute", ...style }}>
    <ClayBuddy mood={mood} size={size} delay={-60} body={d.buddy.body} ink={d.buddy.ink} />
  </div>
);

/** An envelope: a body and a V flap. */
const Envelope: React.FC<{ d: Dir; w: number }> = ({ d, w }) => (
  <div style={{ ...d.surface(d.card, w * 0.08), width: w, height: w * 0.66, position: "relative" }}>
    <svg viewBox="0 0 100 66" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <path d="M 6 8 L 50 40 L 94 8" stroke={d.sub} strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

const Hook: React.FC<{ d: Dir }> = ({ d }) => (
  <Room d={d}>
    <Line d={d} tag="// 01 · the hook" before="Your own business email, for" mark="zero dollars." />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: 260 }}>
      <div style={{ position: "relative" }}>
        <Envelope d={d} w={640} />
        <div style={{ ...d.surface(d.accent, 999), position: "absolute", right: -70, top: -90, width: 280, height: 280, display: "flex",
          alignItems: "center", justifyContent: "center", transform: "rotate(-12deg)", fontFamily: d.font, fontWeight: 700, fontSize: 130, color: C.ink }}>$0</div>
      </div>
    </AbsoluteFill>
    <Buddy d={d} mood="wow" style={{ left: 70, bottom: 260 }} />
  </Room>
);

const Door: React.FC<{ d: Dir }> = ({ d }) => (
  <Room d={d}>
    <Line d={d} tag="// 03 · the catch" before="Finding them is" mark="the hard part." />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: 300 }}>
      <div style={{ position: "relative", width: 520, height: 760 }}>
        {[0, 1, 2, 3, 4].map((k) => (
          <div key={k} style={{ position: "absolute", left: 300 + (k % 2) * 60, top: 80 + k * 120, transform: `rotate(${k % 2 ? 8 : -6}deg)`, opacity: 0.9 }}>
            <Envelope d={d} w={190} />
          </div>
        ))}
        <div style={{ ...d.surface(d.blobs[0] === "#2a2418" ? "#33343d" : d.accent === C.gold ? "#e9ecf2" : "#C9E4FF", 46), position: "absolute", left: 0, top: 0, width: 420, height: 760 }}>
          <div style={{ position: "absolute", left: 300, top: 360, width: 40, height: 40, borderRadius: "50%", background: d.sub }} />
          <div style={{ ...d.surface(d.accent, 30), position: "absolute", left: 250, top: 420, width: 140, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 22, height: 44, borderRadius: 11, background: C.ink }} />
          </div>
          <div style={{ ...d.surface(d.accent, 999), position: "absolute", left: 270, top: 350, width: 100, height: 110, background: "transparent",
            border: `22px solid ${d.accent}`, borderBottom: "none", borderRadius: "60px 60px 0 0", boxShadow: "none" }} />
        </div>
      </div>
    </AbsoluteFill>
    <Buddy d={d} mood="think" size={230} style={{ right: 60, bottom: 230 }} />
  </Room>
);

const Ask: React.FC<{ d: Dir }> = ({ d }) => (
  <Room d={d}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46 }}>
      <ClayBuddy mood="wave" size={380} delay={-60} body={d.buddy.body} ink={d.buddy.ink} />
      <div style={{ fontFamily: d.lineFont, fontWeight: 600, fontSize: 64, color: d.text }}>DM me</div>
      <div style={{ ...d.surface(d.accent, 60), padding: "24px 70px", fontFamily: d.font, fontWeight: 700, fontSize: 150, color: C.ink, transform: "rotate(-3deg)" }}>EMAIL</div>
      <div style={{ fontFamily: d.lineFont, fontWeight: 600, fontSize: 48, color: d.text }}>for the exact link</div>
      <div style={{ fontFamily: F.mono, fontSize: 34, color: d.sub, marginTop: 30 }}>vishnu · askverb.com</div>
    </AbsoluteFill>
  </Room>
);

const Tile: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ width: 540, height: 960, overflow: "hidden", borderRadius: 24, position: "relative", boxShadow: "0 10px 30px rgba(0,0,0,0.18)" }}>
    <div style={{ width: 1080, height: 1920, transform: "scale(0.5)", transformOrigin: "0 0", position: "relative" }}>{children}</div>
  </div>
);

/** The pick sheet: one row per direction, three moments each. 1880 x 3040. */
export const SignatureSheet: React.FC = () => (
  <AbsoluteFill style={{ background: "#d9dce2", padding: 40, gap: 40, flexDirection: "column" }}>
    {DIRS.map((d) => (
      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <Tile><Hook d={d} /></Tile>
        <Tile><Door d={d} /></Tile>
        <Tile><Ask d={d} /></Tile>
        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 64, color: C.ink, width: 80, writingMode: "vertical-rl" }}>{d.name}</div>
      </div>
    ))}
  </AbsoluteFill>
);
