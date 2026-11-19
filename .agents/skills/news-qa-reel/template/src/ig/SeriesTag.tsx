// Persistent series tag (frame 0 to the end), styled like an IG chip. Text = SERIES.tag (src/series.ts).
import React from "react";
import { SERIES } from "../series";
import { Plane } from "./Plane";
import { IG_GRAD, UI_FONT } from "./theme";
import { ZONES } from "./zones";

export const SeriesTag: React.FC<{ text?: string; size?: number }> = ({ text = SERIES.tag, size = 25 }) => (
  <div style={{ position: "absolute", left: ZONES.seriesTag.x, top: ZONES.seriesTag.y, fontFamily: UI_FONT, padding: 3, borderRadius: 999, background: IG_GRAD, boxShadow: "0 8px 24px rgba(0,0,0,.55)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 22px 8px 12px", borderRadius: 999, background: "rgba(14,14,20,.92)" }}>
      <div style={{ width: 34, height: 34, borderRadius: 17, background: IG_GRAD, display: "flex", alignItems: "center", justifyContent: "center" }}><Plane s={20} /></div>
      <div style={{ fontSize: size, fontWeight: 800, color: "#fff", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{text}</div>
    </div>
  </div>
);
