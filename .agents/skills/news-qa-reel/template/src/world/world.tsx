// SAMPLE WORLD: the minimum a style supplies. Replace Back (and the graphics inside Front) with your style; keep the
// format pieces (series tag, hook card, DM cards, comment card, end card) and the zones in ../ig/zones.ts.
//   Back  = full-bleed background behind him (2D, SVG, three.js via ../kit/three-canvas, anything)
//   Front = the series tag + hook + DM questions + your top-band / right-column graphics + comment + end card
import React from "react";
import { AbsoluteFill } from "remotion";
import type { WorldDef } from "../Film";
import { B } from "../beats";
import { cue, live } from "../lib";
import { AnswerTag, AutoQuestions, Chip, CommentCard, EndCard, GOLD, HookCard, QUESTIONS, RX, RightCaption, SeriesTag, ZONES } from "../ig";

// every time in the world comes from his words (cue) or the beats; never hard-coded seconds
const T = {
  firstQ: QUESTIONS[0]?.s ?? 3,
  decide: cue("decide"),
};

const Back: React.FC<{ t: number; fr: number }> = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 60% at 70% 30%, #23306b 0%, #0b1030 55%, #05060f 100%)" }} />
);

const Front: React.FC<{ t: number; fr: number }> = ({ t }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <SeriesTag />
    <HookCard t={t} until={T.firstQ} title={<>AI writes code now.</>} sub={<>Should you still <span style={{ color: GOLD }}>learn it?</span></>} />
    <AutoQuestions t={t} />
    {/* an answer graphic in the top band + a right-column chip, each on its word */}
    <AnswerTag x={540} y={322} k={live(t, B.a1.s + 0.05, B.comment.s)} />
    <Chip x={490} y={470} size={56} k={live(t, T.decide - 0.1, B.comment.s)} color={GOLD} text="You decide" sub="what to build" />
    <Chip x={RX} y={ZONES.rightCol.y + 120} w={ZONES.rightCol.w - 6} size={34} k={live(t, T.decide + 0.4, B.comment.s)} text="Madhav's take" />
    <CommentCard t={t} a={B.comment.s + 0.05} b={B.end.s} title="Would you still pick CS?" typedAt={cue("comments.")} typed="Tell me in the comments" />
    <EndCard t={t} start={B.end.s} title={<>Is CS still <span style={{ color: GOLD }}>worth it?</span></>} />
  </AbsoluteFill>
);

export const World: WorldDef = {
  Back,
  Front,
  Caption: (p) => <RightCaption {...p} />,
  cutoutFilter: "drop-shadow(0 0 14px rgba(125,243,255,.35))",
};
