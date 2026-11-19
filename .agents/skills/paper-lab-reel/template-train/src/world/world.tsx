// Paper Lab world for c3-cs-degree (v6 staging of v5: big cut-out, graphics top + right, IG questions): cream board, cut paper, typewriter scraps, red marker, a paper train set.
// He is always the still cut-out bottom-left; every picture is drawn behind him in the top band / right column.
import type { WorldDef } from "../Film";
import { PaperCaption } from "./caption";
import { V6Back } from "./v6";
import { V6Front } from "./front";

export const World: WorldDef = {
  Back: V6Back,
  Front: V6Front,
  Caption: PaperCaption,
  // white sticker edge + warm drop shadow on the cut-out (layer is scaled 0.66, so px render ~2/3)
  cutoutFilter: "drop-shadow(0 0 0 #fff) drop-shadow(8px 0 0 #fff) drop-shadow(-8px 0 0 #fff) drop-shadow(0 -8px 0 #fff) drop-shadow(0 8px 0 #fff) drop-shadow(20px 28px 22px rgba(74,52,32,.45))",
};
