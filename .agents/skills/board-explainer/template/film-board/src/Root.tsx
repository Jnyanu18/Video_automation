import React from "react";
import { Composition } from "remotion";
import { Board } from "./Board";
import { BoardIG } from "./BoardIG";
import ITEMS from "./items.json";
import ITEMS_IG from "./items_ig.json";

export const Root: React.FC = () => (
  <>
    <Composition id="Board" component={Board} defaultProps={{ faces: false }} durationInFrames={Math.round((ITEMS as { total: number }).total * 30)} fps={30} width={1920} height={1080} />
    <Composition id="BoardIG" component={BoardIG} durationInFrames={Math.round((ITEMS_IG as { total: number }).total * 30)} fps={30} width={1080} height={1920} />
  </>
);
