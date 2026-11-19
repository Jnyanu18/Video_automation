import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { TOTAL } from "./lib";
import { World } from "./world/world";

const FilmComp = () => <Film world={World} />;
export const Root: React.FC = () => <Composition id="Film" component={FilmComp} width={1080} height={1920} fps={30} durationInFrames={TOTAL} />;
