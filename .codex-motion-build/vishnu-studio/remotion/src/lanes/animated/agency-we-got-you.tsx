import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";
import { FPS } from "../../kit/theme";

/** We got you (Auralion Labs), v3, 2026-11-07. Rebuilt from a second look at the reference (DeUQCEbDPM7, Wixnova, see
 *  research/viral/DeUQCEbDPM7/card.md "Second look"), after Vishnu rejected v2:
 *  - only the text changes: the background, logo and footer never move;
 *  - a long pendulum, pivot far above the frame, about 9 degrees each side, so the string is nearly vertical and the
 *    string itself is the line that cuts the text (left of it the question, right of it the answer);
 *  - every question has one shape and one size: NEED / <words>?;
 *  - a seamless 12 s loop: the last frame runs straight into the first, no end card.
 *  Look (Vishnu, 2026-11-07): dark. A black stage with a soft spotlight, the question in grey, the answer in white. */

const SLUG = "agency-we-got-you";
const POPPINS = loadFont("normal", { weights: ["600", "800"], subsets: ["latin"] }).fontFamily;

const W = 1080, H = 1920;
const QUESTIONS = ["A WEBSITE?", "A MOBILE APP?", "SOFTWARE?", "AI AGENTS?", "AUTOMATION?"];
const ANSWER = ["WE GOT", "YOU."];
const HALF = 1.2;                                   // one swing; a question and its answer take 2.4 s
export const seconds = QUESTIONS.length * 2 * HALF; // 12 s, and frame 360 would be frame 0 again: a seamless loop

// The pendulum: pivot far above the frame, a long string, a small angle.
const PIVOT_X = W / 2, PIVOT_Y = -1540, BADGE_Y = 1150, LEN = BADGE_Y - PIVOT_Y, REACH = 0.385 * W;
const MAX = Math.asin(REACH / LEN);                 // about 8.9 degrees
const BADGE = 132;

// The text: one size for every question, centred on the spotlight, above the badge.
const SIZE = 92, LINE = 1.08, TEXT_TOP = 732;
const GREY = "#9a9ca8", WHITE = "#ffffff", INK = "#161722";

const angle = (t: number) => MAX * Math.cos((Math.PI * t) / HALF); // far right at t = 0

/** x of the string (extended past its ends) at height y */
const stringX = (th: number, y: number) => PIVOT_X + (y - PIVOT_Y) * Math.tan(th);

const Mask: React.FC<{ file: string; w: number; h: number; color: string }> = ({ file, w, h, color }) => (
  <div style={{ width: w, height: h, backgroundColor: color, WebkitMaskImage: `url(${staticFile(`${SLUG}/brand/${file}`)})`, WebkitMaskRepeat: "no-repeat", WebkitMaskSize: "contain", WebkitMaskPosition: "center" }} />
);

const Text: React.FC<{ lines: string[]; color: string }> = ({ lines, color }) => (
  <div style={{ position: "absolute", left: 0, top: TEXT_TOP, width: W, textAlign: "center", fontFamily: POPPINS, fontWeight: 800, fontSize: SIZE, lineHeight: LINE, letterSpacing: -1, wordSpacing: 10, color }}>
    {lines.map((l, i) => <div key={i}>{l}</div>)}
  </div>
);

export const AgencyWeGotYou: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const th = angle(t);
  const bx = PIVOT_X + LEN * Math.sin(th), by = PIVOT_Y + LEN * Math.cos(th);

  // Which question is left of the string: on a leftward swing (the answer coming in) it is question k; on the rightward
  // swing after it, the next question comes in. Modulo the count, so the last swing brings back the first: the loop.
  const half = Math.floor(t / HALF);
  const k = Math.floor(half / 2) % QUESTIONS.length;
  const idx = half % 2 === 1 ? (k + 1) % QUESTIONS.length : k;
  const question = ["NEED", QUESTIONS[idx]];

  // The cut follows the string itself, a slanted line, not a vertical one at the badge.
  const xTop = stringX(th, 0), xBot = stringX(th, H);
  const left = `polygon(0 0, ${xTop}px 0, ${xBot}px ${H}px, 0 ${H}px)`;
  const right = `polygon(${xTop}px 0, ${W}px 0, ${W}px ${H}px, ${xBot}px ${H}px)`;

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 55% at 50% 45%, #2b2d3b 0%, #191a24 45%, #0a0a0f 100%)", overflow: "hidden" }}>
      {/* never moves: the logo, the footer */}
      <div style={{ position: "absolute", left: 0, top: 210, width: W, display: "flex", justifyContent: "center", alignItems: "center", gap: 18 }}>
        <Mask file="mark.svg" w={58} h={57} color={WHITE} />
        <div style={{ fontFamily: POPPINS, fontWeight: 800, fontSize: 44, color: WHITE, letterSpacing: -0.5 }}>Auralion Labs</div>
      </div>
      <div style={{ position: "absolute", left: 0, top: 1630, width: W, textAlign: "center", fontFamily: POPPINS, fontWeight: 600 }}>
        <div style={{ fontSize: 26, color: "rgba(255,255,255,0.85)", letterSpacing: 4 }}>WEBSITES · APPS · SOFTWARE · AI</div>
        <div style={{ fontSize: 26, color: GREY, letterSpacing: 2, marginTop: 12 }}>auralionlabs.com</div>
      </div>

      {/* only the text changes: the question left of the string, the answer right of it */}
      <div style={{ position: "absolute", inset: 0, clipPath: left }}><Text lines={question} color={GREY} /></div>
      <div style={{ position: "absolute", inset: 0, clipPath: right }}><Text lines={ANSWER} color={WHITE} /></div>

      {/* the string, with a soft shadow on the stage for depth, and the badge */}
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <defs><filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter></defs>
        <line x1={PIVOT_X + 26} y1={PIVOT_Y} x2={bx + 26} y2={by + 14} stroke="rgba(0,0,0,0.55)" strokeWidth={8} filter="url(#soft)" />
        <line x1={PIVOT_X} y1={PIVOT_Y} x2={bx} y2={by} stroke="#d6d8e0" strokeWidth={5} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", left: bx - BADGE / 2, top: by - 6, width: BADGE, height: BADGE, transform: `rotate(${(-th * 180) / Math.PI}deg)`, transformOrigin: "50% 6px", borderRadius: 32, background: WHITE, boxShadow: "22px 26px 34px rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Mask file="mark.svg" w={80} h={79} color={INK} />
      </div>
    </AbsoluteFill>
  );
};
