import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { C, F, FPS } from "../../kit/theme";
import { Headline } from "../../kit/Blocks";

// The cover (thumbnail) for a talking-head video: his face from one chosen moment of the cut, and a headline that
// says what the video is about, in the same light card as the edit. Random frames said nothing (2026-10-22).

export type CoverProps = { slug: string; at: number; title: string; mark?: string; kicker?: string };

export const Cover: React.FC<CoverProps> = ({ slug, at, title, mark, kicker }) => (
  <AbsoluteFill style={{ background: C.ink }}>
    <OffthreadVideo src={staticFile(`${slug}/work/cut.mp4`)} trimBefore={Math.round(at * FPS)} muted
      style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    {/* a soft dark fade at the bottom so the card reads on any footage */}
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,21,26,0) 50%, rgba(20,21,26,0.55) 100%)" }} />
    <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 60px 210px" }}>
      <div style={{ background: "rgba(255,255,255,0.97)", borderRadius: 34, padding: "44px 50px", boxShadow: "0 24px 70px rgba(20,21,26,0.35)" }}>
        {kicker ? (
          <div style={{ fontFamily: F.mono, fontSize: 34, letterSpacing: 5, color: C.goldDeep, marginBottom: 18, textTransform: "uppercase" }}>{kicker}</div>
        ) : null}
        <Headline text={title} mark={mark} size={104} />
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);
