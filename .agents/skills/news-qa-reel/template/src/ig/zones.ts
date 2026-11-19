// v6 layout zones on the 1080x1920 canvas (x1.3333 at render). Everything a world draws must respect these.
import { SIDE_FACE } from "../presenter";

export const ZONES = {
  igUI: { top: 220, bottom: 380, right: 140 },   // Instagram chrome: keep text out of the top 220, bottom 380, right 140 px
  seriesTag: { x: 40, y: 230, h: 50 },           // persistent series pill, frame 0 to the end
  topBand: { x: 40, y: 280, w: 900, h: 480 },    // MAIN graphics: hook headline, DM cards, diagrams, comment card, end title
  rightCol: { x: 700, y: 770, w: 250, h: 520 },  // SECONDARY graphics beside his head: chips, nodes, follow card
  caption: { x: 692, y: 1300, w: 258 },          // captions, right column under the graphics (up to 3 lines, 54 -> 42 px)
  head: SIDE_FACE,                               // his head + hair: never cover it
} as const;
export const RX = ZONES.rightCol.x + ZONES.rightCol.w / 2 + 1; // right-column centre x (826)
