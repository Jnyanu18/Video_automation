// end (Back): the cream board with a few callbacks pinned around the edges, and the gold cube at the
// hand-off point (540,900) that the footage polaroid flies into. The Front takes over the cube at END.front.
import React from "react";
import { GoldCube } from "./cube";
import { Dressing } from "./dressing";
import { END, endYaw } from "./front";
import { BgImage, Card, Defs, HAND, IMG, INK, MATH, Pin, Scrap, back, twos } from "./kit";
import { B } from "./T";

export const EndScene: React.FC<{ t: number; fr: number }> = ({ t }) => {
  const tf = Math.min(t, B.end.s + 1.4); // everything in this scene is still for the last frames
  const tt = twos(tf);
  const cubeIn = back((tt - (B.end.s - 0.3)) / 0.35, 2);
  const curve = Array.from({ length: 30 }, (_, i) => `${i ? "L" : "M"}${(20 + i * 8).toFixed(1)},${(70 + 22 * Math.sin(i * 0.36)).toFixed(1)}`).join("");
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <Defs />
      <BgImage src={IMG.board} t={tf} />
      <Dressing spots={[{ x: 660, y: 1640, rot: -12, kind: 0 }, { x: 1000, y: 1330, rot: 0, kind: 2 }, { x: 40, y: 760, rot: 86, kind: 4 }]} />
      <Scrap x={230} y={330} rot={-6} text="x + y = z" seed="e1" size={32} />
      <g transform="translate(810 340) rotate(5)">
        <Card x={0} y={0} w={280} h={150} lines={false}><text x={18} y={44} fontFamily={HAND} fontSize={36} fill={INK}>one pattern</text><path d={curve} stroke={INK} strokeWidth={4} fill="none" /></Card>
        <Pin x={0} y={-70} />
      </g>
      <g transform="translate(250 1350) rotate(4)"><Card x={0} y={0} w={260} h={120} lines={false}><text x={130} y={80} textAnchor="middle" fontFamily={MATH} fontSize={56} fill={INK}>F = ma</text></Card><Pin x={0} y={-56} color="#2f5fb3" /></g>
      <Scrap x={820} y={1420} rot={-8} text="Beijing" seed="e2" size={30} />
      <Scrap x={560} y={1470} rot={3} text="E = mc²" seed="e3" size={30} fill="#dfeefb" />
      {t < END.front && cubeIn > 0.01 && <GoldCube x={END.x} y={END.y} e={END.e * Math.min(1.08, cubeIn)} yaw={endYaw(t)} glow={0.8} />}
    </svg>
  );
};
