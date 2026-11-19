// c7-drug v3: "Infinite black canvas, live marker drawing". He is always the still cut-out bottom-left;
// the canvas lives in the top band and the right column; one page per beat; zoom-out map ending.
import React from "react";
import { AbsoluteFill } from "remotion";
import type { WorldDef } from "../Film";
import { B } from "./beats";
import { parallax } from "../kit/camera";
import { Finish } from "../kit/finish";
import { H, OUTRO, W, progS } from "../lib";
import { isEmph } from "../captions";
import { camera } from "./camera";
import { COL, INK, MONO, RoughDefs, Stroke, Write } from "../kit/ink";
import { PageCheaper, PageComment, PageHook, PageKeys, PageLive, PageMarket, PagePatt, PageProtein, PageQ, PageYears } from "./pages";

const Grid: React.FC = () => (
  <>
    <defs>
      <pattern id="dots" x={0} y={0} width={60} height={60} patternUnits="userSpaceOnUse">
        <circle cx={30} cy={30} r={2.2} fill="#24252c" />
      </pattern>
    </defs>
    <rect x={-6000} y={-6000} width={16000} height={22000} fill="url(#dots)" />
  </>
);

const Back: React.FC<{ t: number; fr: number }> = ({ t, fr }) => {
  const cam = camera(t);
  const dim = 1 - 0.68 * progS(t, B.end.s + 0.3, 0.6); // the end-card map sits back behind the text
  return (
    <AbsoluteFill style={{ background: COL.bg }}>
      <Finish fr={fr} bloom={0.55}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute" }}>
          <RoughDefs fr={fr} />
          <g transform={parallax(cam, 1)}>
            <Grid />
            <g filter="url(#rough)" opacity={dim}>
              <PageHook t={t} />
              <PageYears t={t} />
              <PageQ t={t} />
              <PagePatt t={t} />
              <PageProtein t={t} />
              <PageMarket t={t} />
              <PageCheaper t={t} />
              <PageKeys t={t} />
              <PageLive t={t} />
              <PageComment t={t} />
            </g>
          </g>
        </svg>
      </Finish>
    </AbsoluteFill>
  );
};

// End card: top band = the title question; right column = Follow for more AI news + handle (he stays at the left).
const EndCard: React.FC<{ t: number }> = ({ t }) => {
  const s0 = B.end.s;
  if (t < s0 + 0.1) return null;
  return (
    <g>
      <Write t={t} x={70} y={340} at={s0 + 0.15} dur={0.4} s="WILL AI MAKE" size={88} weight={700} glow />
      <Write t={t} x={70} y={460} at={s0 + 0.4} dur={0.5} s="MEDICINE" size={104} c={COL.yellow} weight={700} glow />
      <Write t={t} x={70} y={580} at={s0 + 0.6} dur={0.4} s="CHEAPER?" size={104} c={COL.green} weight={700} glow />
      <Write t={t} x={595} y={800} at={OUTRO.t} dur={0.45} s="Follow for more" size={52} glow />
      <Write t={t} x={595} y={900} at={OUTRO.t + 0.6} dur={0.3} s="AI NEWS" size={90} c={COL.green} weight={700} glow />
      <Stroke t={t} d="M598 925 Q760 940 915 920" at={OUTRO.t + 0.85} dur={0.3} c={COL.green} w={7} />
      <Write t={t} x={595} y={1010} at={OUTRO.t + 0.9} dur={0.4} s="@madhav_somani" size={40} c={COL.cyan} font={MONO} glow />
    </g>
  );
};

const Front: React.FC<{ t: number; fr: number }> = ({ t, fr }) => (
  <AbsoluteFill>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute" }}>
      <RoughDefs fr={fr} id="roughF" scale={3.5} />
      <g filter="url(#roughF)">
        <EndCard t={t} />
      </g>
    </svg>
  </AbsoluteFill>
);

// Captions: Ink Free marker type, emphasis words yellow; heavy dark halo instead of a box.
const Caption: WorldDef["Caption"] = ({ t, c, r }) => {
  const k = progS(t, c.s, 0.15);
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y + (1 - k) * 14, width: r.w, textAlign: r.align, opacity: k }}>
      <span style={{ fontFamily: INK, fontWeight: 700, fontSize: 52, lineHeight: 1.12, color: COL.white,
        textShadow: "0 0 6px #000, 0 0 14px #000, 0 3px 2px #000, 0 0 26px rgba(0,0,0,0.9)" }}>
        {c.words.map((w, i) => (
          <React.Fragment key={i}>
            <span style={{ color: isEmph(w.w) ? COL.yellow : COL.white, opacity: t >= w.s - 0.02 ? 1 : 0.55 }}>{w.w.replace(/[,]$/, "")}</span>
            {i < c.words.length - 1 ? " " : ""}
          </React.Fragment>
        ))}
      </span>
    </div>
  );
};

export const World: WorldDef = {
  Back,
  Front,
  Caption,
  cutoutFilter: "drop-shadow(0 0 3px rgba(244,244,239,0.9)) drop-shadow(0 0 20px rgba(79,216,255,0.35))",
};
