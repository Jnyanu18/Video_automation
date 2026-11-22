import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, F } from "./theme";

/** Fades and lifts children in over the first 12 frames of their Sequence. */
export const Enter: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div style={{ opacity: p, transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px)` }}>{children}</div>
  );
};

/** A big headline. `mark` puts one phrase on a gold wash, the brand's only ornament. */
export const Headline: React.FC<{ text: string; mark?: string; size?: number; dark?: boolean }> = ({
  text,
  mark,
  size = 96,
  dark = false,
}) => {
  const parts = mark && text.includes(mark) ? text.split(mark) : [text];
  return (
    <div
      style={{
        fontFamily: F.display,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: -size * 0.025,
        color: dark ? C.paper : C.ink,
      }}
    >
      {parts[0]}
      {parts.length > 1 ? (
        <span style={{ background: C.gold, color: C.ink, padding: `0 ${size * 0.12}px`, borderRadius: size * 0.08 }}>
          {mark}
        </span>
      ) : null}
      {parts[1] ?? null}
    </div>
  );
};

/** One number with a label, counting up from zero. */
export const Stat: React.FC<{ value: number; label: string; delay?: number; accent?: boolean; size?: number }> = ({
  value,
  label,
  delay = 0,
  accent = false,
  size = 120,
}) => {
  const frame = useCurrentFrame();
  const shown = Math.round(interpolate(frame - delay, [0, 18], [0, value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <Enter delay={delay}>
      <div style={{ fontFamily: F.mono, fontWeight: 500, fontSize: size, color: accent ? C.gold : C.paper, lineHeight: 1 }}>
        {shown}
      </div>
      <div style={{ fontFamily: F.body, fontSize: size * 0.26, color: "#b9bec8", marginTop: size * 0.12 }}>{label}</div>
    </Enter>
  );
};

/** A plain window, for showing a screen, a file or a terminal line. */
export const Screen: React.FC<{ title: string; lines: string[]; width?: number }> = ({ title, lines, width = 1100 }) => (
  <div style={{ width, borderRadius: 18, overflow: "hidden", border: `2px solid ${C.rule}`, background: C.paper, boxShadow: "0 30px 80px rgba(20,21,26,0.12)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 22px", background: C.parchment, borderBottom: `2px solid ${C.rule}` }}>
      {["#e6e8ec", "#e6e8ec", C.gold].map((c, i) => (
        <span key={i} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
      ))}
      <span style={{ fontFamily: F.mono, fontSize: 24, color: C.graphite, marginLeft: 12 }}>{title}</span>
    </div>
    <div style={{ padding: "26px 30px", fontFamily: F.mono, fontSize: 34, lineHeight: 1.6, color: C.ink }}>
      {lines.map((l, i) => (
        <Enter key={i} delay={6 + i * 8}>
          <div>{l}</div>
        </Enter>
      ))}
    </div>
  </div>
);

/** A small label in the corner: the day of the challenge, or a section name. */
export const Tag: React.FC<{ text: string; dark?: boolean }> = ({ text, dark = false }) => (
  <div
    style={{
      display: "inline-block",
      fontFamily: F.mono,
      fontSize: 26,
      letterSpacing: 2,
      textTransform: "uppercase",
      color: dark ? C.gold : C.goldDeep,
      border: `2px solid ${dark ? C.gold : C.goldDeep}`,
      borderRadius: 999,
      padding: "8px 20px",
    }}
  >
    {text}
  </div>
);
