// Poster widgets: gauge dials, boarding pass, tear-off calendar, price tag, starburst stamp.
import React from "react";
import { BLACK, COND, CREAM, Ink, MUSTARD, NAVY, ORANGE, TEAL, ht, starPath } from "./kit";

const pol = (cx: number, cy: number, r: number, deg: number) => [cx + Math.cos((deg * Math.PI) / 180) * r, cy + Math.sin((deg * Math.PI) / 180) * r];
const arcD = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const [x0, y0] = pol(cx, cy, r, a0), [x1, y1] = pol(cx, cy, r, a1);
  return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};
const MAXY = 25;
const yAng = (y: number) => 180 + (y / MAXY) * 180;

// Semicircular gauge, centre (cx,cy) = needle pivot. band = [y0,y1] highlighted years. val = needle years.
export const Dial: React.FC<{ cx: number; cy: number; r: number; band: [number, number]; val: number; color: string; title: string; big: string; k: number; bandK: number }> =
  ({ cx, cy, r, band, val, color, title, big, k, bandK }) => {
    if (k <= 0) return null;
    const ticks = [];
    for (let y = 0; y <= MAXY; y += 1) {
      const a = yAng(y), major = y % 5 === 0;
      const [x0, y0] = pol(cx, cy, r - 18, a), [x1, y1] = pol(cx, cy, r - (major ? 50 : 32), a);
      ticks.push(<line key={y} x1={x0} y1={y0} x2={x1} y2={y1} stroke={NAVY} strokeWidth={major ? 6 : 3} />);
      if (major) { const [tx, ty] = pol(cx, cy, r - 82, a); ticks.push(<text key={`t${y}`} x={tx} y={ty + 13} textAnchor="middle" fontFamily={COND} fontSize={36} fill={NAVY}>{y}</text>); }
    }
    const b1 = band[0] + (band[1] - band[0]) * bandK;
    return (
      <g transform={`translate(${cx} ${cy}) scale(${0.7 + 0.3 * k}) translate(${-cx} ${-cy})`} opacity={Math.min(1, k * 1.5)}>
        <g filter="url(#misreg)">
          <path d={`${arcD(cx, cy, r + 26, 180, 360)} L${cx + r + 26} ${cy + 44} L${cx - r - 26} ${cy + 44} Z`} fill={NAVY} />
          <path d={`${arcD(cx, cy, r, 180, 360)} L${cx + r} ${cy + 26} L${cx - r} ${cy + 26} Z`} fill={CREAM} />
          <path d={`${arcD(cx, cy, r * 0.55, 180, 360)} Z`} fill={ht("mustard-m")} />
        </g>
        {bandK > 0 && <path d={arcD(cx, cy, r - 34, yAng(band[0]), yAng(Math.max(band[0] + 0.01, b1)))} fill="none" stroke={color} strokeWidth={46} />}
        {ticks}
        <g transform={`rotate(${yAng(val) - 270} ${cx} ${cy})`}>
          <path d={`M${cx - 12} ${cy} L${cx} ${cy - r + 46} L${cx + 12} ${cy} Z`} fill={NAVY} />
        </g>
        <circle cx={cx} cy={cy} r={24} fill={color} stroke={NAVY} strokeWidth={6} />
        <text x={cx} y={cy - r - 50} textAnchor="middle" fontFamily={COND} fontSize={54} letterSpacing={3} fill={NAVY}>{title}</text>
        <Ink x={cx} y={cy + 150} size={104} fill={color} ghost={NAVY} off={[5, 5]}>{big}</Ink>
        <text x={cx} y={cy + 196} textAnchor="middle" fontFamily={COND} fontSize={36} letterSpacing={4} fill={NAVY}>YEARS</text>
      </g>
    );
  };

// Boarding pass (Rocket Mail). (x,y) = top-left, 600 x 300.
export const BoardingPass: React.FC<{ x: number; y: number; k: number; stampK: number; rot?: number; s?: number }> = ({ x, y, k, stampK, rot = -3, s = 1 }) => {
  if (k <= 0) return null;
  const w = 600, h = 300;
  const notch = `M0 0 H${w} V${h * 0.5 - 22} a22 22 0 0 0 0 44 V${h} H0 V${h * 0.5 + 22} a22 22 0 0 0 0 -44 Z`;
  return (
    <g transform={`translate(${x + w / 2} ${y + h / 2}) rotate(${rot + (1 - k) * 18}) scale(${(0.5 + 0.5 * k) * s}) translate(${-w / 2} ${-h / 2})`} opacity={Math.min(1, k * 2)}>
      <path d={notch} fill={NAVY} transform="translate(9 11)" />
      <path d={notch} fill={CREAM} stroke={NAVY} strokeWidth={4} />
      <rect x={0} y={0} width={w} height={64} fill={TEAL} />
      <rect x={0} y={0} width={w} height={64} fill={ht("navy-s")} opacity={0.5} />
      <text x={24} y={46} fontFamily={COND} fontSize={38} letterSpacing={4} fill={CREAM}>ROCKET MAIL · BOARDING PASS</text>
      <Ink x={30} y={176} size={110} anchor="start" fill={NAVY}>SEA</Ink>
      <MiniPlaneArrow x={238} y={138} />
      <Ink x={332} y={176} size={110} anchor="start" fill={NAVY}>DEL</Ink>
      <text x={32} y={214} fontFamily={COND} fontSize={30} letterSpacing={2} fill={TEAL}>SEATTLE</text>
      <text x={334} y={214} fontFamily={COND} fontSize={30} letterSpacing={2} fill={TEAL}>NEW DELHI</text>
      <line x1={20} x2={w - 20} y1={232} y2={232} stroke={NAVY} strokeWidth={3} strokeDasharray="10 8" />
      <text x={32} y={280} fontFamily={COND} fontSize={44} letterSpacing={2} fill={ORANGE}>FLIGHT TIME · 1 HOUR</text>
      {stampK > 0 && (
        <g transform={`translate(${w - 150} ${h + 40}) rotate(-8) scale(${1.6 - 0.6 * Math.min(1, stampK)})`} opacity={Math.min(1, stampK * 2) * 0.92}>
          <rect x={-104} y={-48} width={208} height={96} rx={10} fill="none" stroke={ORANGE} strokeWidth={6} />
          <text x={0} y={-6} textAnchor="middle" fontFamily={COND} fontSize={34} fill={ORANGE}>MADHAV'S</text>
          <text x={0} y={32} textAnchor="middle" fontFamily={COND} fontSize={34} fill={ORANGE}>PREDICTION</text>
        </g>
      )}
    </g>
  );
};
const MiniPlaneArrow: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <line x1={0} y1={0} x2={70} y2={0} stroke={ORANGE} strokeWidth={10} strokeLinecap="round" />
    <path d="M58 -20 L86 0 L58 20 Z" fill={ORANGE} />
  </g>
);

// Tear-off calendar card. (x,y) = top-left, 300 x 340. `flip` 0..1 runs the year pages.
export const Calendar: React.FC<{ x: number; y: number; k: number; flip: number; label: string; sub?: string; color?: string }> =
  ({ x, y, k, flip, label, sub = "YEARS?", color = ORANGE }) => {
    if (k <= 0) return null;
    const w = 300, h = 330;
    const pages = 6;
    const pg = Math.min(pages, Math.floor(flip * pages));
    const yrs = ["2026", "2029", "2032", "2035", "2038", "2041"];
    return (
      <g transform={`translate(${x} ${y + (1 - k) * -120})`} opacity={Math.min(1, k * 2)}>
        <rect x={10} y={12} width={w} height={h} rx={14} fill={NAVY} />
        <rect x={0} y={0} width={w} height={h} rx={14} fill={CREAM} stroke={NAVY} strokeWidth={5} />
        <rect x={0} y={0} width={w} height={84} rx={14} fill={color} />
        <rect x={0} y={60} width={w} height={24} fill={color} />
        {[60, 150, 240].map((cx) => <circle key={cx} cx={cx} cy={8} r={10} fill={NAVY} />)}
        <text x={w / 2} y={60} textAnchor="middle" fontFamily={COND} fontSize={44} letterSpacing={3} fill={CREAM}>{flip < 1 ? yrs[Math.min(5, pg)] : "+"}</text>
        <Ink x={w / 2} y={214} size={120} fill={NAVY} width={label.length > 4 ? 250 : undefined}>{label}</Ink>
        <text x={w / 2} y={290} textAnchor="middle" fontFamily={COND} fontSize={48} letterSpacing={4} fill={TEAL}>{sub}</text>
        {flip > 0 && flip < 1 && (
          <path d={`M0 84 H${w} L${w} ${84 + 60 * (1 - ((flip * pages) % 1))} L0 ${84 + 120 * (1 - ((flip * pages) % 1))} Z`} fill={MUSTARD} stroke={NAVY} strokeWidth={3} opacity={0.9} />
        )}
      </g>
    );
  };

// Swinging price tag: "$$$$$" that gets struck through and stamped. (x,y) = hole position.
export const PriceTag: React.FC<{ x: number; y: number; k: number; strike: number; stampK: number; swing: number; head: string; stampText: string }> =
  ({ x, y, k, strike, stampK, swing, head, stampText }) => {
    if (k <= 0) return null;
    const w = 300, h = 330;
    return (
      <g transform={`translate(${x} ${y}) rotate(${swing}) scale(${0.6 + 0.4 * k})`} opacity={Math.min(1, k * 2)}>
        <line x1={0} y1={-90} x2={0} y2={0} stroke={NAVY} strokeWidth={4} />
        <path d={`M${-w / 2 + 10} 70 L-40 0 H40 L${w / 2 - 10} 70 V${h} H${-w / 2 + 10} Z`} fill={NAVY} transform="translate(9 10)" />
        <path d={`M${-w / 2 + 10} 70 L-40 0 H40 L${w / 2 - 10} 70 V${h} H${-w / 2 + 10} Z`} fill={MUSTARD} stroke={NAVY} strokeWidth={5} />
        <circle cx={0} cy={30} r={13} fill={CREAM} stroke={NAVY} strokeWidth={4} />
        <text x={0} y={128} textAnchor="middle" fontFamily={COND} fontSize={38} letterSpacing={2} fill={NAVY}>{head}</text>
        <Ink x={0} y={236} size={104} fill={NAVY} ghost={ORANGE}>$$$$$</Ink>
        {strike > 0 && <line x1={-120} y1={210} x2={-120 + 240 * strike} y2={180} stroke={ORANGE} strokeWidth={14} strokeLinecap="round" />}
        {stampK > 0 && (
          <g transform={`translate(0 290) rotate(-9) scale(${1.6 - 0.6 * Math.min(1, stampK)})`} opacity={Math.min(1, stampK * 2)}>
            <rect x={-128} y={-36} width={256} height={68} rx={8} fill={TEAL} stroke={NAVY} strokeWidth={4} />
            <text x={0} y={16} textAnchor="middle" fontFamily={COND} fontSize={46} letterSpacing={2} fill={CREAM}>{stampText}</text>
          </g>
        )}
      </g>
    );
  };

// Starburst with big condensed text in it.
export const Burst: React.FC<{ x: number; y: number; r: number; k: number; text: string; size: number; rot?: number; fill?: string; color?: string; sub?: string }> =
  ({ x, y, r, k, text, size, rot = -6, fill = MUSTARD, color = NAVY, sub }) => {
    if (k <= 0.001) return null;
    return (
      <g transform={`translate(${x} ${y}) rotate(${rot + (1 - Math.min(1, k)) * -20}) scale(${k})`}>
        <path d={starPath(r, r * 0.8, 18)} fill={NAVY} transform="translate(9 10)" />
        <path d={starPath(r, r * 0.8, 18)} fill={fill} stroke={NAVY} strokeWidth={5} />
        <path d={starPath(r * 0.84, r * 0.68, 18, 0.17)} fill={ht("orange-s")} opacity={0.6} />
        <Ink x={0} y={size * 0.36 - (sub ? 18 : 0)} size={size} fill={color} ghost={ORANGE === fill ? CREAM : ORANGE}>{text}</Ink>
        {sub && <text x={0} y={size * 0.36 + 30} textAnchor="middle" fontFamily={BLACK} fontSize={34} fill={NAVY}>{sub}</text>}
      </g>
    );
  };
