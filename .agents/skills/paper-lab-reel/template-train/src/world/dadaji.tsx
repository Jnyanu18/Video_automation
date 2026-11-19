// Dadaji: the ORIGINAL paper-cut grandfather character from the v4 "Dadaji asks, Madhav answers" pass (archived; the
// final film dropped him when Madhav switched to reading the questions himself as IG DMs). Kept as a reusable
// character: a paper-cut bust (origin = bottom centre, ~380 x 465 at scale 1) whose jaw drops and moustache lifts on twos
// from the voice level, only while a words.json word with `spk: "ch"` (character line, voice clone) is playing.
// Deliberately generic: grey temple hair under a brown cloth flat cap, bushy white brows, big white moustache, rosy
// cheeks, cream kurta, rust open waistcoat with gold buttons, walking stick; not bald, no spectacles, shawl, dhoti or
// beard; not modelled on any real person. Never put words in his mouth that the script doesn't have.
// The full v4 world that staged him (hook, speaking big in the right column, shrinking to a corner portrait card while
// Madhav answers, speech bubbles with exact words) is archive/v4-dadaji-world.tsx.txt (reference only, not built).
// Needs the kit's <Defs/> (for the psh drop-shadow filter) somewhere in the same SVG.
import React from "react";
import { voLevel } from "../lib";
import words from "../words.json";
import { GOLD, INK, TAPE, TYPE, torn, twos } from "./kit";

const CH = (words as { s: number; e: number; spk?: string }[]).filter((w) => w.spk === "ch");
const chSpeaking = (t: number) => CH.some((w) => t >= w.s && t < w.e);
// jaw open 0..1 on twos (3 steps), from the voice level, only while a character word is playing
export const jawOpen = (t: number) => {
  const tt = twos(t);
  if (!chSpeaking(tt)) return 0;
  const v = Math.min(1, voLevel(Math.round(tt * 30)) * 2.4);
  return Math.round(v * 3) / 3;
};
const SKIN = "#c98b62", SKIN_D = "#b0704c", HAIR = "#e3e2dc", CAP = "#6d5a46", CAP_D = "#4f4031", VEST = "#8a3d2b", KURTA = "#f5efe2", EDGE = "#fffdf6";
const Sticker: React.FC<{ children: React.ReactNode; w?: number }> = ({ children, w = 12 }) => (
  <g filter="url(#psh)">
    <g stroke={EDGE} strokeWidth={w} strokeLinejoin="round" fill={EDGE}>{children}</g>
    {children}
  </g>
);
const Tuft: React.FC = () => <path d="M-60,-402 Q-96,-398 -96,-364 Q-96,-340 -80,-330 Q-82,-360 -70,-378 Q-66,-392 -60,-402 Z" fill={HAIR} stroke="#bdbcb4" strokeWidth={2} />;
// origin = bottom centre of the bust; ~380 wide, ~465 tall at scale 1
export const Dadaji: React.FC<{ open: number; tag?: boolean }> = ({ open, tag = true }) => {
  const j = open * 14;
  return <g>
    <Sticker>
      {/* torso (kurta) + sleeves + neck + head + ears + cap */}
      <path d="M-172,0 L-178,-168 Q-170,-220 -98,-236 L98,-236 Q170,-220 178,-168 L172,0 Z" fill={KURTA} />
      <path d="M-176,-196 Q-200,-110 -190,-14 L-150,-14 Q-150,-110 -146,-190 Z" fill={KURTA} />
      <path d="M150,-210 Q200,-186 196,-130 L178,-86 L140,-100 L156,-150 Z" fill={KURTA} />
      <rect x={-28} y={-270} width={56} height={44} fill={SKIN} />
      <ellipse cx={-77} cy={-338} rx={15} ry={24} fill={SKIN} /><ellipse cx={77} cy={-338} rx={15} ry={24} fill={SKIN} />
      <ellipse cx={0} cy={-345} rx={78} ry={90} fill={SKIN} />
      <path d="M-88,-380 Q-92,-446 -8,-458 Q74,-462 90,-400 Q92,-388 88,-380 Z" fill={CAP} />
    </Sticker>
    {/* waistcoat panels (open V) + buttons */}
    <path d="M-150,0 L-158,-172 Q-150,-220 -96,-234 L-34,-236 L-12,-112 L-12,0 Z" fill={VEST} />
    <path d="M150,0 L158,-172 Q150,-220 96,-234 L34,-236 L12,-112 L12,0 Z" fill={VEST} />
    <path d="M-150,0 L-158,-172 Q-150,-220 -96,-234" fill="none" stroke="#6e2f20" strokeWidth={4} />
    {[-150, -100, -50].map((y) => <circle key={y} cx={24} cy={y} r={6} fill={GOLD} stroke="#8a6a1a" strokeWidth={1.5} />)}
    <path d="M-36,-236 Q0,-222 36,-236" fill="none" stroke="#d9cfb8" strokeWidth={6} />
    <line x1={0} y1={-226} x2={0} y2={-120} stroke="#d9cfb8" strokeWidth={3} />
    {/* walking stick + hand */}
    <path d="M162,6 L162,-110 Q162,-146 132,-146 Q106,-146 106,-122" stroke="#6b4423" strokeWidth={15} fill="none" strokeLinecap="round" />
    <path d="M162,6 L162,-110" stroke="#8a5a35" strokeWidth={5} fill="none" />
    <ellipse cx={160} cy={-100} rx={22} ry={19} fill={SKIN} stroke={SKIN_D} strokeWidth={2} />
    {/* grey hair at the temples, under the cap */}
    <Tuft /><g transform="scale(-1 1)"><Tuft /></g>
    <ellipse cx={-77} cy={-336} rx={6} ry={12} fill={SKIN_D} /><ellipse cx={77} cy={-336} rx={6} ry={12} fill={SKIN_D} />
    {/* cloth cap: band, brim, tweed flecks, button */}
    <path d="M-88,-382 Q0,-398 88,-382" fill="none" stroke={CAP_D} strokeWidth={7} />
    <path d="M-72,-386 Q0,-404 76,-386 Q84,-366 0,-370 Q-80,-366 -72,-386 Z" fill={CAP_D} />
    {Array.from({ length: 9 }, (_, i) => <line key={i} x1={-60 + i * 15} y1={-400 - (i % 3) * 14} x2={-52 + i * 15} y2={-404 - (i % 3) * 14} stroke="#8c775f" strokeWidth={3} strokeLinecap="round" />)}
    <circle cx={-8} cy={-456} r={7} fill={CAP_D} />
    {/* face: bushy white brows, twinkly eyes, nose, rosy cheeks */}
    <path d="M-56,-368 Q-36,-388 -12,-372" stroke={HAIR} strokeWidth={11} fill="none" strokeLinecap="round" />
    <path d="M56,-368 Q36,-388 12,-372" stroke={HAIR} strokeWidth={11} fill="none" strokeLinecap="round" />
    <ellipse cx={-32} cy={-350} rx={7} ry={8} fill={INK} /><ellipse cx={32} cy={-350} rx={7} ry={8} fill={INK} />
    <circle cx={-30} cy={-353} r={2.4} fill="#fff" /><circle cx={34} cy={-353} r={2.4} fill="#fff" />
    <path d="M-56,-350 L-48,-346 M-56,-340 L-48,-340" stroke={SKIN_D} strokeWidth={2.5} strokeLinecap="round" />
    <path d="M56,-350 L48,-346 M56,-340 L48,-340" stroke={SKIN_D} strokeWidth={2.5} strokeLinecap="round" />
    <circle cx={-48} cy={-316} r={15} fill="#e0806a" opacity={0.45} /><circle cx={48} cy={-316} r={15} fill="#e0806a" opacity={0.45} />
    <ellipse cx={0} cy={-320} rx={18} ry={16} fill="#bb7651" /><ellipse cx={-5} cy={-325} rx={5} ry={4} fill="#d9a07c" />
    {/* mouth (dark) behind the dropping jaw */}
    <ellipse cx={0} cy={-286 + j * 0.4} rx={30} ry={3 + j * 0.95} fill="#4a1d1a" />
    {open > 0.3 && <ellipse cx={0} cy={-278 + j * 0.7} rx={14} ry={5} fill="#c4544a" />}
    <path d="M-52,-292 Q-50,-262 0,-252 Q50,-262 52,-292 Z" fill={SKIN} transform={`translate(0 ${j})`} />
    {j > 0 && <path d="M-52,-292 Q-50,-262 0,-252 Q50,-262 52,-292" fill="none" stroke={SKIN_D} strokeWidth={2} transform={`translate(0 ${j})`} />}
    {/* the big white moustache (lifts a touch when he talks) */}
    <path transform={`translate(0 ${-j * 0.25})`} d="M0,-312 C-30,-328 -72,-324 -96,-300 C-110,-286 -104,-266 -88,-270 C-72,-290 -40,-284 0,-292 C40,-284 72,-290 88,-270 C104,-266 110,-286 96,-300 C72,-324 30,-328 0,-312 Z" fill="#f8f6f0" stroke="#cfc9bc" strokeWidth={2.5} />
    <path transform={`translate(0 ${-j * 0.25})`} d="M-70,-302 Q-40,-310 -12,-302 M70,-302 Q40,-310 12,-302" stroke="#d8d3c7" strokeWidth={3} fill="none" />
    {/* name tag on tape */}
    {tag && <g transform="translate(-4 -64) rotate(-4)">
      <g filter="url(#psh)"><path d={torn(300, 58, "dadtag", "lr", 4)} fill={TAPE} opacity={0.95} /></g>
      <text textAnchor="middle" y={11} fontFamily={TYPE} fontSize={32} fill={INK} letterSpacing={1}>DADAJI ASKS</text>
    </g>}
  </g>;
};
