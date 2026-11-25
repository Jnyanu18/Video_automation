import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "../../kit/theme";

// A fully designed cover, no frame from the video (Vishnu, 2026-10-22): pastel neo-brutalism, a headline that
// says what the video is about, and a picture of the thing itself (a SaaS window with the agent inside it).

const INK = "#111111";
const P = { butter: "#FFE89A", mint: "#B8F2D0", lilac: "#D9C8FF", peach: "#FFC9B0", sky: "#BDE3FF" };
const box = (fill: string, shadow = 10): React.CSSProperties => ({
  background: fill, border: `5px solid ${INK}`, borderRadius: 18, boxShadow: `${shadow}px ${shadow}px 0 ${INK}`,
});

export type CoverDesignProps = { title: string; mark: string; kicker: string; layout: "stack" | "question" | "big" };

const Sticker: React.FC<{ fill: string; rotate: number; size: number; children: React.ReactNode; pad?: string }> = ({ fill, rotate, size, children, pad = "14px 30px" }) => (
  <div style={{ ...box(fill, 8), display: "inline-block", padding: pad, transform: `rotate(${rotate}deg)`, fontFamily: F.body,
    fontWeight: 600, fontSize: size, color: INK, letterSpacing: 1, whiteSpace: "nowrap" }}>{children}</div>
);

/** The thing the video is about: a SaaS app window with the assistant open inside it. */
const AppWindow: React.FC = () => (
  <div style={{ ...box("#ffffff", 14), width: 900, height: 700, overflow: "hidden", display: "flex", flexDirection: "column" }}>
    <div style={{ height: 78, borderBottom: `5px solid ${INK}`, background: P.sky, display: "flex", alignItems: "center", padding: "0 26px", gap: 18 }}>
      <div style={{ ...box("#ffffff", 0), borderWidth: 4, borderRadius: 12, padding: "6px 22px", fontFamily: F.mono, fontSize: 28, color: INK }}>your-saas.com</div>
    </div>
    <div style={{ flex: 1, display: "flex" }}>
      {/* the app: a sidebar and some content, just shapes */}
      <div style={{ width: 200, borderRight: `5px solid ${INK}`, padding: 24, display: "flex", flexDirection: "column", gap: 18, background: "#f6f3ec" }}>
        {[0.9, 0.7, 0.8, 0.6, 0.75].map((w, i) => <div key={i} style={{ height: 20, width: `${w * 100}%`, background: "#d8d2c4", borderRadius: 6 }} />)}
      </div>
      <div style={{ flex: 1, padding: 30, display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
        <div style={{ height: 30, width: "55%", background: "#d8d2c4", borderRadius: 8 }} />
        <div style={{ height: 120, background: "#efeae0", borderRadius: 12 }} />
        <div style={{ height: 120, background: "#efeae0", borderRadius: 12 }} />
        {/* the agent, open over the app */}
        <div style={{ ...box(P.lilac, 10), position: "absolute", right: 24, bottom: 24, width: 420, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontFamily: F.mono, fontSize: 24, color: INK, letterSpacing: 2 }}>AI AGENT</div>
          <div style={{ alignSelf: "flex-end", ...box("#ffffff", 0), borderWidth: 4, borderRadius: 16, padding: "10px 16px", fontFamily: F.body, fontSize: 26, color: INK }}>
            How do I add a teammate?
          </div>
          <div style={{ alignSelf: "flex-start", ...box(P.butter, 0), borderWidth: 4, borderRadius: 16, padding: "10px 16px", fontFamily: F.body, fontSize: 26, color: INK, fontWeight: 600 }}>
            Settings, Team, Invite. Want me to do it?
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Title: React.FC<{ text: string; mark: string; size: number }> = ({ text, mark, size }) => {
  const [before, after] = text.includes(mark) ? text.split(mark) : [text, ""];
  return (
    <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: size, lineHeight: 1.04, color: INK, letterSpacing: -2, textAlign: "center" }}>
      {before}
      {text.includes(mark) ? (
        <span style={{ ...box(P.butter, 9), display: "inline-block", padding: "0 22px", transform: "rotate(-2deg)", margin: "8px 0" }}>{mark}</span>
      ) : null}
      {after}
    </div>
  );
};

export const CoverDesign: React.FC<CoverDesignProps> = ({ title, mark, kicker, layout }) => (
  <AbsoluteFill style={{ background: "#FFF6E6", alignItems: "center", padding: "130px 70px 110px", overflow: "hidden" }}>
    {/* a faint grid, the one texture */}
    <AbsoluteFill style={{ backgroundImage: "linear-gradient(#00000010 2px, transparent 2px), linear-gradient(90deg, #00000010 2px, transparent 2px)", backgroundSize: "90px 90px" }} />
    {/* centred, so Instagram's grid crop (the middle 3:4) keeps the headline */}
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: layout === "big" ? 80 : 54, height: "100%" }}>
      <Sticker fill={P.mint} rotate={-3} size={40}>{kicker}</Sticker>
      <Title text={title} mark={mark} size={layout === "big" ? 168 : layout === "question" ? 118 : 130} />
      {layout !== "big" ? <AppWindow /> : null}
      {layout === "big" ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
          <Sticker fill={P.peach} rotate={2} size={52} pad="22px 40px">Answers questions</Sticker>
          <Sticker fill={P.sky} rotate={-2} size={52} pad="22px 40px">Does tasks</Sticker>
        </div>
      ) : null}
      <Sticker fill="#ffffff" rotate={1.5} size={38}>askverb.com</Sticker>
    </div>
  </AbsoluteFill>
);
