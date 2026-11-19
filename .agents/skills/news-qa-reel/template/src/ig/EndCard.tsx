// End card: the title question in the top band, the follow card in the right column (he stays at the left).
// The CTA appears on OUTRO.t (synced to his spoken outro when he said it), the handle 0.7 s later; everything has
// settled well before the last 0.4 s, so the final frames are static.
import React from "react";
import { OUTRO, popS, progS } from "../lib";
import { SERIES } from "../series";
import { GOLD, UI_FONT } from "./theme";
import { ZONES } from "./zones";

export const EndCard: React.FC<{ t: number; start: number; title: React.ReactNode; size?: number }> = ({ t, start, title, size = 92 }) => {
  if (t < start - 0.05) return null;
  const a = popS(t, start, 15), b = progS(t, OUTRO.t, 0.35), c = progS(t, OUTRO.t + 0.7, 0.35);
  const words = SERIES.follow.split(" ");
  const lead = words.slice(0, -2).join(" "), last = words.slice(-2).join(" "); // colour the last two words
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: UI_FONT, color: "#fff", textAlign: "center" }}>
      <div style={{ position: "absolute", left: ZONES.topBand.x, width: ZONES.topBand.w, top: 310, opacity: Math.min(1, a * 1.4), transform: `translateY(${(1 - a) * 20}px)` }}>
        <div style={{ display: "inline-block", padding: "22px 36px", borderRadius: 34, background: "rgba(6,10,32,.72)", border: "2px solid rgba(255,201,74,.5)", boxShadow: "0 14px 50px rgba(0,0,0,.7)", fontSize: size, fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.025em", textShadow: "0 4px 24px rgba(0,0,0,.9)" }}>
          {title}
        </div>
      </div>
      <div style={{ position: "absolute", left: ZONES.rightCol.x, width: ZONES.rightCol.w, top: 960, opacity: b, transform: `translateY(${(1 - b) * 14}px)` }}>
        <div style={{ padding: "18px 16px", borderRadius: 26, background: "rgba(6,10,32,.8)", border: "2px solid rgba(94,231,255,.5)", fontSize: 44, fontWeight: 800, lineHeight: 1.08, textShadow: "0 3px 18px rgba(0,0,0,.95)" }}>
          {lead} <span style={{ color: GOLD }}>{last}</span>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#cfe9ff", marginTop: 10, opacity: c }}>{SERIES.handle}</div>
        </div>
      </div>
    </div>
  );
};
