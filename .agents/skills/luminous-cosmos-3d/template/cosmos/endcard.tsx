// The end card over the seed's bloom: the question, then the follow line. Settles by 157.1 s and
// holds still to the last frame.
import React from "react";
import { lerp, popS, progS } from "../lib";
import { SANS } from "./fonts";
import { AMBER } from "./ui";
import { HAND } from "./timing";

export const EndCard: React.FC<{ t: number }> = ({ t }) => {
  const t0 = HAND.end.t1 - 0.55;
  if (t < t0) return null;
  const a = popS(t, t0, 15), b = progS(t, t0 + 0.35, 0.4);
  return (
    <div style={{ position: "absolute", left: 60, width: 960, top: 300, textAlign: "center", fontFamily: SANS, color: "#fff" }}>
      <div style={{ display: "inline-block", padding: "22px 34px", borderRadius: 34, background: "rgba(10,6,40,.62)", border: "2px solid rgba(255,191,60,.45)", boxShadow: "0 12px 50px rgba(7,5,28,.7)", opacity: Math.min(1, a * 1.4), transform: `translateY(${(1 - a) * 30}px) scale(${lerp(0.92, 1, a)})`, fontSize: 92, fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.025em", textShadow: "0 4px 26px rgba(7,5,28,.9)" }}>
        Is intelligence just <span style={{ color: AMBER, textShadow: "0 0 30px rgba(255,191,60,.6), 0 4px 26px rgba(7,5,28,.9)" }}>compression?</span>
      </div>
      <div style={{ display: "inline-block", marginTop: 700, padding: "14px 26px", borderRadius: 24, background: "rgba(10,6,40,.66)", opacity: b, transform: `translateY(${(1 - b) * 16}px)`, fontSize: 42, fontWeight: 700, color: "#eaf8ff", textShadow: "0 3px 18px rgba(7,5,28,.95)" }}>
        Follow for more random thoughts · <span style={{ color: AMBER }}>@madhav_somani</span>
      </div>
    </div>
  );
};
