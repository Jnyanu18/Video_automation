// The spoken comment prompt as an IG comment box. No fake usernames, avatars or counts: an empty gradient ring and
// "Add a comment..." that becomes the prompt text when he says it.
import React from "react";
import { lerp, popS, progS } from "../lib";
import { IG_GRAD, UI_FONT } from "./theme";

type P = { t: number; a: number; b: number; title: string; typedAt: number; typed?: string; x?: number; top?: number; w?: number };
export const CommentCard: React.FC<P> = ({ t, a, b, title, typedAt, typed = "Comment your take", x = 40, top = 330, w = 520 }) => {
  const k = popS(t, a, 14) * (1 - progS(t, b - 0.1, 0.2));
  if (k <= 0.001) return null;
  const on = progS(t, typedAt, 0.5) > 0.5;
  return (
    <div style={{ position: "absolute", left: x, width: w, top, fontFamily: UI_FONT, opacity: Math.min(1, k * 1.3), transform: `scale(${lerp(0.92, 1, k)})`, transformOrigin: "50% 0" }}>
      <div style={{ padding: "26px 24px", borderRadius: 30, background: "rgba(24,24,30,.95)", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 14px 40px rgba(0,0,0,.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: "none", width: 58, height: 58, borderRadius: 29, padding: 3, background: IG_GRAD }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 26, background: "#1b1b22" }} />
          </div>
          <div style={{ fontSize: 50, fontWeight: 800, color: "#fff" }}>{title}</div>
        </div>
        <div style={{ marginTop: 22, padding: "16px 22px", borderRadius: 28, border: "2px solid rgba(255,255,255,.22)", fontSize: 38, color: on ? "#fff" : "rgba(255,255,255,.55)", fontWeight: 600 }}>
          {on ? typed : "Add a comment..."}
        </div>
      </div>
    </div>
  );
};
