import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { TOTAL } from "./lib";

export const Root: React.FC = () => <Composition id="Film" component={Film} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />;
