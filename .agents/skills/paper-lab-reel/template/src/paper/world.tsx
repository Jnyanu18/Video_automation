// Paper Lab world (style B): cream paper board, cut paper, typewriter scraps, red marker, a gold origami cube.
import React from "react";
import { AbsoluteFill } from "remotion";
import type { WorldDef } from "../Film";
import { BooksScene } from "./books";
import { PaperCaption } from "./caption";
import { CorkScene } from "./cork";
import { CosmosScene, TEAR1 } from "./cosmos";
import { Cta2Scene } from "./cta2";
import { EndScene } from "./end";
import { PaperFront } from "./front";
import { Gauge, LabScene } from "./lab";
import { NotebookScene } from "./notebook";
import { PathScene } from "./path";
import { RecallScene } from "./recall";
import { B, HAND, T } from "./T";

type Scene = { a: number; b: number; C: React.FC<{ t: number; fr: number }> };
// Back scenes and the windows in which they draw. They overlap only during transitions through
// content (the cork board drops onto the lab, the notebook page turns over the books, the notebook
// page is pulled off the recall board, the cosmos paper is torn off the path board); later = on top.
const SCENES: Scene[] = [
  { a: B.network.s - 0.4, b: HAND.outFull + 0.1, C: LabScene },
  { a: HAND.inStart - 0.1, b: B.network.s + 0.35, C: CorkScene },
  { a: T.raw - 0.3, b: HAND.outFull, C: Gauge },
  { a: B.books.s - 0.35, b: B.algebra.s + 0.5, C: BooksScene },
  { a: B.recall.s - 0.35, b: B.amazing.s + 0.45, C: RecallScene },
  { a: B.algebra.s - 0.35, b: B.recall.s + 0.5, C: NotebookScene },
  { a: B.path.s - 0.35, b: B.agi.s + 0.45, C: PathScene },
  { a: B.cosmos.s - 0.3, b: TEAR1 + 0.25, C: CosmosScene },
  { a: B.cta2.s - 0.35, b: B.cta3.s + 0.45, C: Cta2Scene },
  { a: B.end.s - 0.3, b: 999, C: EndScene },
];

const Back: React.FC<{ t: number; fr: number }> = ({ t, fr }) => (
  <AbsoluteFill style={{ background: "#efe4cf" }}>
    {SCENES.filter((s) => t >= s.a && t < s.b).map((s) => <s.C key={SCENES.indexOf(s)} t={t} fr={fr} />)}
  </AbsoluteFill>
);

export const PaperWorld: WorldDef = {
  Back,
  Front: PaperFront,
  Caption: PaperCaption,
  bed: "bed-paper.wav",
  // white sticker edge + warm drop shadow (the cut-out layer is scaled 0.66, so px here render ~2/3)
  cutoutFilter: "drop-shadow(0 0 0 #fff) drop-shadow(8px 0 0 #fff) drop-shadow(-8px 0 0 #fff) drop-shadow(0 -8px 0 #fff) drop-shadow(0 8px 0 #fff) drop-shadow(20px 28px 22px rgba(74,52,32,.45))",
  // polaroid: white border (46px -> ~10px at tile scale), a deeper chin, warm shadow
  tileStyle: { boxShadow: "0 0 0 46px #fbf8f1, 0 96px 0 46px #fbf8f1, 30px 60px 70px 50px rgba(74,52,32,.45)" },
};
