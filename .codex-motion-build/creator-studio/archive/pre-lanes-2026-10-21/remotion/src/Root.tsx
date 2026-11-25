import React from "react";
import { Composition } from "remotion";
import { FPS } from "./kit/theme";
import { VIDEOS } from "./videos/registry";
import { TalkingHead, thMetadata } from "./talking/TalkingHead";

// Every animated video gets two compositions from one scene: <slug>-16x9 and <slug>-9x16.
// Talking-head videos share one composition, "talking-head"; the slug picks which video it draws.
export const Root: React.FC = () => (
  <>
    {VIDEOS.map((v) => (
      <React.Fragment key={v.slug}>
        <Composition id={`${v.slug}-16x9`} component={v.Scene} durationInFrames={Math.ceil(v.seconds * FPS)} fps={FPS} width={1920} height={1080} />
        <Composition id={`${v.slug}-9x16`} component={v.Scene} durationInFrames={Math.ceil(v.seconds * FPS)} fps={FPS} width={1080} height={1920} />
      </React.Fragment>
    ))}
    <Composition
      id="talking-head"
      component={TalkingHead}
      durationInFrames={FPS}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ slug: "who-is-vishnu", edit: null }}
      calculateMetadata={thMetadata}
    />
  </>
);
