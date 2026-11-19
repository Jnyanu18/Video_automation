// Small "A / MY ANSWER" tag above his answer. Use it once or twice per video, not on every answer.
import React from "react";
import { lerp } from "../lib";
import { SERIES } from "../series";
import { GOLD, UI_FONT } from "./theme";

export const AnswerTag: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => {
  if (k <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${lerp(0.85, 1, k)})`, opacity: Math.min(1, k * 1.3), fontFamily: UI_FONT, display: "flex", alignItems: "center", gap: 10, padding: "6px 16px 6px 8px", borderRadius: 999, background: "rgba(6,10,32,.85)", border: "2px solid rgba(255,201,74,.7)", whiteSpace: "nowrap" }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: GOLD, color: "#0a0f2e", fontSize: 26, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>A</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: GOLD, letterSpacing: "0.06em" }}>{SERIES.answerLabel}</div>
    </div>
  );
};
