import React from "react";
import { Composition } from "remotion";
import { StyleReel, defaultStyleReelProps } from "./StyleReel";

// A vertical reel, 1080 by 1920 at 30 fps, 14 seconds.
export const RemotionRoot: React.FC = () => (
  <Composition id="StyleReel" component={StyleReel} durationInFrames={14 * 30} fps={30} width={1080} height={1920} defaultProps={defaultStyleReelProps} />
);
