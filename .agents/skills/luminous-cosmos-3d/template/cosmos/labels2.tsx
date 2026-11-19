// HTML labels beyond the first act: "copy every page" (glitching out on "mug up"), "given" under x
// and z, "a hypothesis", "Open question - not proven", "open question", the CTA chips.
import React from "react";
import { B } from "../beats";
import { popS, progS } from "../lib";
import { add } from "./cam";
import { SANS } from "./fonts";
import { AMBER, Chip, MAGENTA, anchor, win } from "./ui";
import { T } from "./timing";
import { bookPos } from "./sets/books";
import { glyphPos } from "./sets/board";

export const extraLabels = (t: number): React.ReactNode => {
  const out: React.ReactNode[] = [];
  // books: rote copying fails
  if (t > T.turning - 0.3 && t < T.mug + 1.4) {
    const a = anchor(t, "books", add(bookPos(4), [0, 3.4, 0]));
    const k = popS(t, T.turning, 13) * (1 - progS(t, T.mug + 0.9, 0.4));
    const g = progS(t, T.mug, 0.25) * (1 - progS(t, T.mug + 0.6, 0.3)) + progS(t, T.mug, 0.2) * 0.25;
    if (a.ok) {
      out.push(<Chip key="cp" x={a.x} y={Math.max(300, a.y)} text="copy every page" k={k} size={36} color={g > 0.1 ? "#ffd2f1" : "#eaf8ff"} glitch={g} t={t} />);
      const strike = progS(t, T.mug + 0.1, 0.3) * k;
      if (strike > 0) out.push(<div key="cps" style={{ position: "absolute", left: a.x - 170, top: Math.max(300, a.y) - 3, width: 340 * strike, height: 6, background: MAGENTA, boxShadow: "0 0 14px rgba(255,95,210,.9)", borderRadius: 3 }} />);
    }
  }
  // board: "given"
  if (t > T.xAndZ - 0.2 && t < T.moveY) {
    const k = popS(t, T.xAndZ, 13) * (1 - progS(t, T.moveY - 0.5, 0.4));
    for (const id of ["x", "z"] as const) {
      const a = anchor(t, "board", add(glyphPos(id, t), [0, -1.0, 0.2]));
      if (a.ok) out.push(<Chip key={`g${id}`} x={a.x} y={a.y} text="given" k={k} size={34} color={AMBER} glass={false} />);
    }
  }
  // hypotheses and open questions
  out.push(<Chip key="hyp" x={300} y={330} text="a hypothesis" k={popS(t, T.maybe1, 13) * (1 - progS(t, B.books.s - 0.35, 0.3))} size={38} />);
  out.push(<Chip key="oq" x={540} y={1170} text="Open question - not proven" k={popS(t, T.agi1, 13) * (1 - progS(t, T.maybeFind + 0.4, 0.4))} size={38} color="#ffd2f1" />);
  out.push(<Chip key="oq2" x={840} y={930} text="open question" k={popS(t, T.agi2 + 0.25, 13) * (1 - progS(t, B.cta1.s + 0.6, 0.3))} size={34} color="#ffd2f1" />);
  // CTAs
  const lt = win(t, T.random - 0.3, B.cta2.s - 0.1, 0.35, 0.3);
  if (lt > 0) out.push(
    <div key="lt" style={{ position: "absolute", left: 70, top: 262, opacity: lt, transform: `translateX(${(1 - lt) * -40}px)`, fontFamily: SANS }}>
      <div style={{ padding: "16px 28px", borderRadius: 26, background: "linear-gradient(180deg, rgba(40,28,120,.72), rgba(20,12,70,.72))", border: "2px solid rgba(94,231,255,.55)", boxShadow: "0 0 30px rgba(94,231,255,.3), 0 10px 30px rgba(7,5,28,.6)", color: "#fff", fontSize: 44, fontWeight: 800 }}>
        Random thoughts <span style={{ color: AMBER }}>with Madhav</span>
      </div>
    </div>,
  );
  out.push(<Chip key="fol" x={560} y={272} text="Follow @madhav_somani" k={popS(t, T.followingMe, 13) * (1 - progS(t, B.cta3.s - 0.2, 0.3))} size={42} color="#ffffff" />);
  const endFade = 1 - progS(t, B.end.s - 0.3, 0.3);
  out.push(<Chip key="sci" x={300} y={330} text="+ scientists" k={popS(t, T.scientists, 13) * endFade} size={40} color="#ffffff" />);
  out.push(<Chip key="eng" x={760} y={330} text="+ engineers" k={popS(t, T.engineers, 13) * endFade} size={40} color="#ffffff" />);
  out.push(<Chip key="qq" x={880} y={470} text="?" k={popS(t, T.questions2, 11) * endFade} size={72} color={AMBER} weight={800} />);
  return <>{out}</>;
};
