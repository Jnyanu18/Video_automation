import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CLAY_FONT, clay } from "../lanes/talking-head/clay";

// The clay buddy (2026-10-25): a small claymorphism character that reacts to the story beside Vishnu's footage.
// One body, five faces. It never talks and never covers a face in the footage; it sits in a corner or the top half.

export type Mood = "happy" | "wow" | "sad" | "think" | "wave";

const DEFAULT_BODY = "#CBB7F5";
const DEFAULT_INK = "#3d2766";

const Mouth: React.FC<{ mood: Mood; ink: string }> = ({ mood, ink: INK }) => {
  const d =
    mood === "happy" || mood === "wave" ? "M 70 128 Q 100 160 130 128" :
    mood === "wow" ? "" :
    mood === "sad" ? "M 74 146 Q 100 124 126 146" :
    "M 80 138 L 122 134";
  return (
    <svg width="200" height="200" viewBox="0 0 200 200" style={{ position: "absolute", inset: 0 }}>
      {mood === "wow" ? <ellipse cx="100" cy="138" rx="14" ry="18" fill={INK} /> : <path d={d} stroke={INK} strokeWidth="9" fill="none" strokeLinecap="round" />}
    </svg>
  );
};

/** The buddy at a size; `mood` picks the face, `bubble` an optional speech-bubble line beside it. */
export const ClayBuddy: React.FC<{ mood: Mood; size?: number; bubble?: string; delay?: number; body?: string; ink?: string }> = ({ mood, size = 320, bubble, delay = 0, body: BODY = DEFAULT_BODY, ink: INK = DEFAULT_INK }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 9, stiffness: 150, mass: 0.7 } });
  const k = size / 200;
  const blink = (frame - delay) % 75 > 70 ? 0.1 : 1;
  const bob = Math.sin((frame - delay) / 9) * 4;
  const eyeY = mood === "sad" ? 86 : 78;
  const brow = mood === "sad" ? 8 : mood === "wow" ? -10 : mood === "think" ? -4 : 0;
  const arm = (side: number) => {
    const wave = mood === "wave" ? Math.sin((frame - delay) / 4) * 30 : 0;
    const up = mood === "wow" || mood === "happy" ? -50 : mood === "think" && side > 0 ? -70 : mood === "sad" ? 30 : 10;
    return (
      <div style={{ ...clay(BODY, 999), position: "absolute", width: 46, height: 92, top: 96, left: side < 0 ? -18 : 172,
        transformOrigin: "50% 10%", transform: `rotate(${side * (up + (side > 0 ? wave : 0))}deg)` }} />
    );
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 * k, transform: `scale(${p}) translateY(${bob}px)`, transformOrigin: "50% 100%" }}>
      <div style={{ position: "relative", width: 200 * k, height: 200 * k }}>
        <div style={{ position: "absolute", width: 200, height: 200, transform: `scale(${k})`, transformOrigin: "0 0" }}>
          {arm(-1)}
          {arm(1)}
          <div style={{ ...clay(BODY, 0), position: "absolute", inset: 0, borderRadius: "50% 50% 46% 46% / 56% 56% 44% 44%" }} />
          {[70, 130].map((x) => (
            <div key={x} style={{ position: "absolute", left: x - 17, top: eyeY - 20, width: 34, height: 40 * blink, marginTop: 20 * (1 - blink),
              borderRadius: "50%", background: "#fff", boxShadow: "inset -3px -4px 6px rgba(0,0,0,0.12)" }}>
              <div style={{ position: "absolute", left: mood === "think" ? 14 : 9, top: mood === "think" ? 6 : 12, width: 16, height: 16 * blink, borderRadius: "50%", background: INK }} />
            </div>
          ))}
          {[70, 130].map((x, i) => (
            <div key={`b${x}`} style={{ position: "absolute", left: x - 18, top: eyeY - 38 + brow * (i ? 1 : -1) * 0.3 + brow, width: 36, height: 8,
              borderRadius: 8, background: INK, transform: `rotate(${(mood === "sad" ? -14 : mood === "think" ? 8 : 0) * (i ? -1 : 1)}deg)` }} />
          ))}
          {[54, 146].map((x) => <div key={`c${x}`} style={{ position: "absolute", left: x - 14, top: 112, width: 28, height: 16, borderRadius: "50%", background: "#FFB4C8", opacity: 0.8 }} />)}
          <Mouth mood={mood} ink={INK} />
        </div>
      </div>
      {bubble ? (
        <div style={{ ...clay("#ffffff", 36), padding: `${14 * k}px ${24 * k}px`, fontFamily: CLAY_FONT, fontWeight: 600, fontSize: 30 * k, color: INK,
          maxWidth: 420 * k, opacity: interpolate(p, [0.6, 1], [0, 1], { extrapolateLeft: "clamp" }) }}>{bubble}</div>
      ) : null}
    </div>
  );
};

/** A review sheet: the five faces side by side on the brand's lilac. */
export const BuddySheet: React.FC = () => (
  <AbsoluteFill style={{ background: "#E9DDFB", flexDirection: "row", alignItems: "center", justifyContent: "space-around", padding: 60 }}>
    {(["happy", "wow", "sad", "think", "wave"] as Mood[]).map((m) => (
      <div key={m} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <ClayBuddy mood={m} size={300} delay={-40} />
        <div style={{ ...clay("#ffffff", 999), padding: "8px 28px", fontFamily: CLAY_FONT, fontWeight: 600, fontSize: 34, color: INK }}>{m}</div>
      </div>
    ))}
  </AbsoluteFill>
);
