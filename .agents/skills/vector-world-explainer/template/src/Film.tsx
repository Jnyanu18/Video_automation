import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { ACTS, type ActName, f } from "./lib";
import { Finish } from "./kit/finish";
import { Avatar } from "./kit/avatar";
import { Captions, HookTitle } from "./CaptionView";
import { SCENES } from "./scenes-example";
import { CUT_GLOWS } from "./transitions";

export const actAt = (fr: number): ActName => {
  const t = fr / 30;
  const names = Object.keys(ACTS) as ActName[];
  return names.find((n) => t >= ACTS[n][0] && t < ACTS[n][1]) ?? names[names.length - 1];
};

// Light carried across a cut: a local glow at the matched point (the thing the camera pushed
// through), peaking on the cut frame. Not a flat flash: it sits on the object and has its colour.
const CutGlow: React.FC<{ fr: number }> = ({ fr }) => (
  <>
    {CUT_GLOWS.map((g, i) => {
      const c = f(g.t);
      const pre = f(g.pre ?? 0.25), post = f(g.post ?? 0.35);
      if (fr < c - pre || fr > c + post) return null;
      const k = fr < c ? (fr - (c - pre)) / pre : 1 - (fr - c) / post;
      const e = Math.max(0, k) ** 1.6;
      const [x0, y0] = fr < c ? g.from : g.to;
      return (
        <div key={i} style={{ position: "absolute", inset: 0, mixBlendMode: "screen", background: `radial-gradient(circle ${g.r * (0.6 + 0.6 * e)}px at ${x0}px ${y0}px, ${g.color} 0%, ${g.color}88 35%, rgba(0,0,0,0) 100%)`, opacity: e * (g.k ?? 0.85) }} />
      );
    })}
  </>
);

export const Film: React.FC = () => {
  const fr = useCurrentFrame();
  const act = actAt(fr);
  const Scene = SCENES[act];
  return (
    <AbsoluteFill style={{ background: "#120A33" }}>
      <Finish fr={fr} bloom={0.55}>
        <Scene fr={fr} />
      </Finish>
      <CutGlow fr={fr} />
      {act === "hook" && <HookTitle fr={fr} />}
      <Avatar fr={fr} />
      <Captions fr={fr} />
      <Audio src={staticFile("vo.wav")} />
      <Audio src={staticFile("bed.wav")} />
    </AbsoluteFill>
  );
};
export { f };
