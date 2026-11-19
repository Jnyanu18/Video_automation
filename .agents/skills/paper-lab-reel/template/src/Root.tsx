import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { TOTAL } from "./lib";
import { PaperWorld } from "./paper/world";

// Template: the source film also registered a 3D world, a debug world and style-frame comps
// (StyleA/B/C, 30 frames each). Add your own style frames and a Debug world here as needed.
const FilmPaper = () => <Film world={PaperWorld} />;

const C = { width: 1080, height: 1920, fps: 30 };
export const Root: React.FC = () => (
  <>
    <Composition id="FilmPaper" component={FilmPaper} {...C} durationInFrames={TOTAL} />
  </>
);
