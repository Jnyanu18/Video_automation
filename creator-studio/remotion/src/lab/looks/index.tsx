import React from "react";
import { Composition, registerRoot } from "remotion";
import { LookLab, LOOK_COUNT } from "./LookLab";

// The look lab's own entry point (render with: npx remotion render remotion/src/lab/looks/index.tsx LookLab <dir> --sequence).
const Root: React.FC = () => <Composition id="LookLab" component={LookLab} durationInFrames={LOOK_COUNT} fps={30} width={1080} height={1920} />;
registerRoot(Root);
