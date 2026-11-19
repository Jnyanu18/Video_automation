// Starter world: "Infinite black canvas, live marker drawing" (Remotion variant of canvas-explainer).
// Back = the canvas (dot grid + pages under one rough-marker filter) seen through the world camera, inside Finish
// (bloom, vignette, grain). Front = the persistent series tag and the end card. He is always the cut-out bottom-left.
import React from "react";
import { AbsoluteFill } from "remotion";
import type { WorldDef } from "../Film";
import { B } from "../beats";
import { parallax } from "../kit/camera";
import { Finish } from "../kit/finish";
import { H, OUTRO, W, progS } from "../lib";
import { isEmph } from "../captions";
import { camera } from "./camera";
import { COL, INK, MONO, RoughDefs, SANS, Stroke, Write } from "../kit/ink";
import { Connectors, PageHook, PageQ, PageTake } from "./pages";

// v6 series tag, top of frame from frame 0 to the end. Set to null for a film outside the IG-questions series.
export const SERIES_TAG: string | null = "MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS";
// Ink "boil" (frames per noise step). 0 = static (Madhav's calm default since v2); 4 = the v1 hand-animated boil.
const BOIL = 0;

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
          <RoughDefs fr={fr} boil={BOIL} />
          <g transform={parallax(cam, 1)}>
            <Grid />
            <g filter="url(#rough)" opacity={dim}>
              <Connectors t={t} />
              <PageHook t={t} />
              <PageQ t={t} />
              <PageTake t={t} />
            </g>
          </g>
        </svg>
      </Finish>
    </AbsoluteFill>
  );
};

const SeriesTag: React.FC = () => (SERIES_TAG ? (
  <g>
    <rect x={60} y={120} width={960} height={64} rx={32} fill="#15161c" stroke={COL.yellow} strokeOpacity={0.7} strokeWidth={2} />
    <text x={540} y={163} fontSize={30} fontFamily={SANS} fontWeight={800} fill={COL.yellow} textAnchor="middle" letterSpacing={1.5}>{SERIES_TAG}</text>
  </g>
) : null);

// End card: top band = the title question; right column = Follow for more + handle (he stays at the left).
const EndCard: React.FC<{ t: number }> = ({ t }) => {
  const s0 = B.end.s;
  if (t < s0 + 0.1) return null;
  return (
    <g>
      <Write t={t} x={70} y={360} at={s0 + 0.15} dur={0.4} s="CAN AI FIND" size={92} weight={700} glow />
      <Write t={t} x={70} y={480} at={s0 + 0.4} dur={0.5} s="MEDICINE" size={108} c={COL.yellow} weight={700} glow />
      <Write t={t} x={70} y={600} at={s0 + 0.6} dur={0.4} s="FASTER?" size={108} c={COL.green} weight={700} glow />
      <Write t={t} x={700} y={860} at={OUTRO.t} dur={0.45} s="Follow for" size={48} glow />
      <Write t={t} x={700} y={920} at={OUTRO.t + 0.3} dur={0.3} s="more" size={48} glow />
      <Write t={t} x={700} y={1010} at={OUTRO.t + 0.6} dur={0.3} s="AI NEWS" size={72} c={COL.green} weight={700} glow />
      <Stroke t={t} d="M702 1032 Q820 1044 935 1026" at={OUTRO.t + 0.85} dur={0.3} c={COL.green} w={7} />
      <Write t={t} x={700} y={1100} at={OUTRO.t + 0.9} dur={0.4} s="@your_handle" size={34} c={COL.cyan} font={MONO} glow />
    </g>
  );
};

const Front: React.FC<{ t: number; fr: number }> = ({ t, fr }) => (
  <AbsoluteFill>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute" }}>
      <SeriesTag />
      <RoughDefs fr={fr} id="roughF" scale={3.5} boil={BOIL} />
      <g filter="url(#roughF)">
        <EndCard t={t} />
      </g>
    </svg>
  </AbsoluteFill>
);

// Captions: Ink Free marker type, emphasis words yellow; a heavy dark halo instead of a box. Not-yet-spoken words dim.
const Caption: WorldDef["Caption"] = ({ t, c, r }) => {
  const k = progS(t, c.s, 0.15);
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y + (1 - k) * 14, width: r.w, textAlign: r.align, opacity: k }}>
      <span style={{ fontFamily: INK, fontWeight: 700, fontSize: 48, lineHeight: 1.12, color: COL.white,
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
  // white sticker rim + faint cyan glow around the cut-out
  cutoutFilter: "drop-shadow(0 0 3px rgba(244,244,239,0.9)) drop-shadow(0 0 20px rgba(79,216,255,0.35))",
};
