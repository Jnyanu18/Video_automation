import React from "react";
import { random } from "remotion";
import { ease, easeIn, f, pop, prog, type SceneProps } from "../lib";
import { Phone } from "../kit/objects";
import { C } from "../kit/palette";
import { Sparkles } from "../kit/room";
import { camAt } from "../kit/camera";
import { Motes, Steam } from "../kit/life";
import { BatDefs, CAM_KEYS, Gallery, StudySky, camHH, lockAt, molAt } from "./kit/problems-kit";
import { Stage, Study } from "./stage";
import { USES } from "./uses-events";

// Uses: framed on the window (we dove back through it) and pulled back down to the desk. A phone
// running "Photogram" scrolls, squashes, shrugs (hands up, head tilt, a spinner going nowhere),
// settles and droops; its pixels lift off and snap into a drug molecule (medicine); the molecule
// glides up-left as a gold padlock pops up and cracks (codes); the camera pulls back while both
// glide to their places in the problems gallery (kit/problems-kit: one camera path, shared motion).
const PH = { x: 540, y: 1010, s: 0.82 };
const PH_BOTTOM = PH.y + 320 * PH.s;

// shrug curve at frame t: spring up with overshoot, spring back down
const shrugAt = (t: number) => pop(t, f(USES.shrug), 9) - pop(t, f(USES.settle), 11);

export const Uses: React.FC<SceneProps> = ({ fr }) => {
  const tm = f(USES.molecule), td = f(USES.dissolve);
  const sh = shrugAt(fr);
  const lag = (shrugAt(fr - 3) - sh) * 45; // the little hands trail the shrug (follow-through)
  const ant = Math.sin(Math.PI * prog(fr, f(USES.squash), f(USES.shrug) - f(USES.squash) + 1)); // anticipation squash
  const landSq = fr >= f(USES.settle) + 4 ? Math.exp(-(fr - f(USES.settle) - 4) / 3) * Math.sin((fr - f(USES.settle) - 4) * 0.9) : 0;
  const droop = prog(fr, f(USES.droop), 12);
  const st = Math.min(1, Math.max(0, sh));
  const sy = 1 - 0.1 * ant + 0.08 * st - 0.07 * landSq;
  const sx = 1 + 0.08 * ant - 0.04 * st + 0.05 * landSq;
  const lift = Math.max(0, sh) * 40;
  const tiltRot = -3 + 13 * sh - 8 * droop + Math.sin(fr * 0.06) * 1.2;
  const scroll = 50 * prog(fr, f(USES.scroll), 10, ease);
  const spinner = Math.min(1, prog(fr, f(USES.shrug) - 2, 6)) * (1 - prog(fr, td, 6));
  const breakK = prog(fr, td, tm - td, easeIn);
  // the phone pops up on the table (scaling from its base, above the caption band) as the pull-back lands
  const rise = Math.min(1.06, pop(fr, f(USES.start) + 11, 11));
  const m = molAt(fr), lk = lockAt(fr);
  const crack = prog(fr, f(USES.crack), 10);
  const cam = camAt(fr, CAM_KEYS);
  return (
    <Stage fr={fr} cam={cam} handheld={camHH(fr)}>
      <BatDefs />
      <Study
        fr={fr}
        sky={<StudySky fr={fr} />}
        glow={{ x: 540 + 60 * prog(fr, f(USES.padlock), 10), y: 980, r: 650, kind: "Gold", k: 0.6 + 0.25 * Math.max(m.form, crack) }}
        over={<Steam fr={fr} x={1030} y={1150} />}
      >
        {breakK < 1 && (
          <g transform={`translate(${PH.x} ${PH_BOTTOM}) scale(${sx * (1 - 0.6 * breakK) * rise} ${sy * (1 - 0.6 * breakK) * rise}) translate(${-PH.x} ${-PH_BOTTOM}) translate(0 ${-lift - 80 * breakK})`} opacity={1 - Math.max(0, breakK - 0.7) / 0.3}>
            <Phone x={PH.x} y={PH.y} s={PH.s} rot={tiltRot} shrug={Math.max(0, sh) * (1 - droop * 0.6) + 0.15 * droop} armLag={lag - 30 * droop} handRot={30 * Math.max(0, sh) - 20 * droop} scroll={scroll} spinner={spinner} screenGlow={0.4 * breakK} fr={fr} />
          </g>
        )}
        {/* the phone's pixels fly up and snap into the molecule */}
        {breakK > 0 && m.form < 1 && (
          <g>
            {Array.from({ length: 90 }, (_, i) => {
              const sx0 = 430 + random(`px${i}`) * 220, sy0 = 780 + random(`py${i}`) * 460;
              const ex = 380 + random(`ex${i}`) * 320, ey = 780 + random(`ey${i}`) * 240;
              const t = Math.min(1, Math.max(0, (fr - td - random(`pd${i}`) * 6) / (tm - td)));
              const e = ease(t);
              return <rect key={i} x={sx0 + (ex - sx0) * e - 5} y={sy0 + (ey - sy0) * e - 5 - Math.sin(Math.PI * t) * 60} width={10} height={10} rx={2} fill={["#F2678E", "#FFCB57", C.tealHi, C.cream, "#8C7CE8"][i % 5]} opacity={1 - m.form} />;
            })}
          </g>
        )}
        <Gallery fr={fr} />
        {crack > 0 && <Sparkles fr={fr} x={lk.x} y={lk.y + 40} r={300 * lk.s} n={10} seed="lk" />}
        <Motes fr={fr} x={200} y={720} w={700} h={560} n={20} seed="um" />
      </Study>
    </Stage>
  );
};
