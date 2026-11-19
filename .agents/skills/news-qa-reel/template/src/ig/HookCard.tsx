// Frame-0 hook headline (the cover): his EXACT spoken hook, big, in the top band under the series tag, until the
// first question (or ~3 s). Keep it honest: no claim the video doesn't support.
import React from "react";
import { progS } from "../lib";
import { UI_FONT } from "./theme";
import { ZONES } from "./zones";

export const HookCard: React.FC<{ t: number; until: number; title: React.ReactNode; sub?: React.ReactNode; size?: number }> = ({ t, until, title, sub, size = 96 }) => {
  const out = progS(t, until - 0.2, 0.25);
  if (out >= 1) return null;
  return (
    <div style={{ position: "absolute", left: ZONES.topBand.x, width: ZONES.topBand.w, top: 306, fontFamily: UI_FONT, opacity: 1 - out }}>
      <div style={{ padding: "28px 34px 30px", borderRadius: 34, background: "linear-gradient(180deg, rgba(8,12,38,.86), rgba(4,6,22,.8))", border: "2px solid rgba(255,201,74,.55)", boxShadow: "0 18px 50px rgba(0,0,0,.7)" }}>
        <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.03em", color: "#fff", textShadow: "0 4px 20px rgba(0,0,0,.8)" }}>{title}</div>
        {sub && <div style={{ marginTop: 18, fontSize: Math.round(size * 0.62), fontWeight: 700, lineHeight: 1.1, color: "#eaf2ff" }}>{sub}</div>}
      </div>
    </div>
  );
};
