import React from "react";
import { useCurrentFrame } from "remotion";
import { C, FPS, Word } from "./theme";

/**
 * Pixel Vishnu: a 16-bit character drawn from Vishnu's photo (big dark curls, black rectangular
 * glasses, warm light-brown skin, lean build, navy blazer over a white tee with a gold lapel pin). Drawn as code, one rect per pixel, so it
 * scales crisply and never needs an image generator.
 *
 * Talks when the voice talks: the mouth opens and closes while the current time falls inside a word
 * from words.json. Blinks every few seconds. `tick` shows a gold tick beside him on key beats.
 */

// 32 columns per row, 41 rows. "." is transparent.
const BASE = [
  "...........HH.HHHH.HH...........",
  "........HHHHHHHHHHHHHHH.........",
  "......HHHHhHHHHHHHHHHhHHHH......",
  ".....HHHHHHhHHHHHHHhhHHHHHH.....",
  "....HHHhHHHHHHHHHHHHHHHHhHHH....",
  "....HHHHHHHHhHHHHHHhHHHHHHHH....",
  "...HHHhHHHHHHHHHHHHHHHHHHhhHH...",
  "...HHHHHHHHHHhHHHHhHHHHHHHHHH...",
  "...HHHHHHHHSSHSSSSHSSHHHHHHHH...",
  "...HHHHHHSSSSSSSSSSSSSSHHHHHH...",
  "...HHHHHSSHHHHSSSSHHHHSSHHHHH...",
  "...HHHHHGGGGGGGGGGGGGGGGHHHHH...",
  "...HHHHHGLLLLLGGGGLLLLLGHHHHH...",
  "...HHHHHGLLELLGddGLLELLGHHHHH...",
  "...HHHHHGLLLLLGddGLLLLLGHHHHH...",
  "...HHHHHGGGGGGGddGGGGGGGHHHHH...",
  "....HHHHSSSSSSSddSSSSSSSHHHH....",
  ".....HHHHSSSSSSSSSSSSSSHHHH.....",
  "......HHHHSSSMMMMMMSSSHHHH......",
  "...........dSSSSSSSSd...........",
  "............SSSSSSSS............",
  "............dddddddd............",
  "..........BBSSSSSSSSBB..........",
  ".......BBBBbTTSSSSTTbBBBB.......",
  "......BBBBBbTTTTTTTTbBBBBB......",
  ".....BBBBBBbTTTTTTTTbBBBBBB.....",
  "....BBBBBBBbbTTTTTTbbBBBBBBB....",
  "...BBBBBBBBBbbTTTTbbBBBBBBBBB...",
  "...BBBBBbBBYBbTTTTbBBBBbBBBBB...",
  "...BBBBBbBBBBBbTTbBBBBBbBBBBB...",
  "...BBBBBbBBBBBbbbbBBBBBbBBBBB...",
  "...BBBBBbBBBBBBbbBBBBBBbBBBBB...",
  "...BBBBBbBBBBBBbbBBBBBBbBBBBB...",
  "...BBBBBbBBBBBBbbBBBBBBbBBBBB...",
  "...BBBBBb.BBBBBbbBBBBB.bBBBBB...",
  "...BBBBBb.BBBBBbbBBBBB.bBBBBB...",
  "...BBBBBb..BBBBbbBBBB..bBBBBB...",
  "...BBBBBb..BBBBbbBBBB..bBBBBB...",
  "...TTTTTb..BBBBbbBBBB..bTTTTT...",
  "...lSSSd...BBBBbbBBBB...dSSSl...",
  "...lSSSd...bbbbbbbbbb...dSSSl...",
];

const COLS = 32;
const MOUTH_ROW = 18;
const EYE_ROW = 13;
// Open mouth: swap these cells into rows MOUTH_ROW and MOUTH_ROW + 1.
const MOUTH_OPEN: [number, string][] = [[13, "MmmmmM"], [14, "MMMM"]];

const PALETTE: Record<string, string> = {
  H: "#17110d", // hair
  h: "#33271d", // curl highlight
  S: "#b07a52", // skin
  d: "#93603e", // skin shadow
  l: "#c48f66", // skin highlight
  G: "#0c0c0f", // glasses frame
  L: "#d7dee4", // lens
  E: "#1b1b1f", // eyes
  M: "#6b3624", // mouth closed
  m: "#2a110a", // mouth open
  B: "#1f2a44", // blazer
  b: "#141c31", // blazer shadow, lapels
  T: "#f4f4f2", // tee and cuffs
  Y: "#ffc400", // gold lapel pin
};

// The outline for dark scenes: every empty cell touching the sprite, including a one-cell border on the
// top and sides (not the bottom, where he is cropped at the waist). Mouth and blinks never change the
// silhouette, so this is worked out once.
const OUTLINE: [number, number][] = [];
{
  const filled = (x: number, y: number) => y >= 0 && y < BASE.length && x >= 0 && x < COLS && BASE[y][x] !== ".";
  for (let y = -1; y < BASE.length; y++) {
    for (let x = -1; x <= COLS; x++) {
      if (filled(x, y)) continue;
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) OUTLINE.push([x, y]);
    }
  }
}

function speakingAt(words: Word[], t: number): boolean {
  // Words are sorted; a linear scan is fine for the lengths we render.
  for (const w of words) {
    if (t < w.start) return false;
    if (t <= w.end) return true;
  }
  return false;
}

export const PixelVishnu: React.FC<{
  words: Word[];
  px?: number;
  tick?: boolean;
  /** Seconds to add to the composition time, for scenes that start later than 0. */
  offset?: number;
  /** A light outline so the dark hair and blazer read on the ink background. */
  outline?: boolean;
}> = ({ words, px = 10, tick = false, offset = 0, outline = false }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS + offset;

  const talking = speakingAt(words, t);
  const mouthOpen = talking && Math.floor(frame / 3) % 2 === 0;
  // A short blink roughly every 3.7 seconds.
  const blinking = frame % 110 < 4;
  // A gentle idle bob, 1 pixel, and a little more lift while talking.
  const bob = Math.round(Math.sin(frame / 14) * 0.6 + (talking ? 0.4 : 0));

  const rows = BASE.map((row, y) => {
    if (mouthOpen && (y === MOUTH_ROW || y === MOUTH_ROW + 1)) {
      const [x, cells] = MOUTH_OPEN[y - MOUTH_ROW];
      return row.slice(0, x) + cells + row.slice(x + cells.length);
    }
    if (blinking && y === EYE_ROW) return row.replace(/E/g, "G").replace(/L/g, "G");
    return row;
  });

  // One spare cell on the top and sides, always, so the outline never shifts the layout.
  const w = (COLS + 2) * px;
  const h = (BASE.length + 1) * px;
  return (
    <div style={{ position: "relative", width: w + (tick ? px * 9 : 0), height: h }}>
      <svg
        width={w}
        height={h}
        viewBox={`-1 -1 ${COLS + 2} ${BASE.length + 1}`}
        shapeRendering="crispEdges"
        style={{ transform: `translateY(${bob * px}px)` }}
      >
        {outline
          ? OUTLINE.map(([x, y]) => <rect key={`o${x}-${y}`} x={x} y={y} width={1} height={1} fill={C.graphite} />)
          : null}
        {rows.flatMap((row, y) =>
          row.split("").map((ch, x) =>
            ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[ch]} />,
          ),
        )}
      </svg>
      {tick ? (
        <svg
          width={px * 8}
          height={px * 8}
          viewBox="0 0 8 8"
          shapeRendering="crispEdges"
          style={{ position: "absolute", right: 0, top: px * 16 }}
        >
          {/* The AskVerb tick, in pixels. */}
          {[
            [1, 4], [2, 5], [3, 6], [4, 5], [5, 4], [6, 3], [7, 2], [6, 2],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={C.gold} />
          ))}
        </svg>
      ) : null}
    </div>
  );
};
