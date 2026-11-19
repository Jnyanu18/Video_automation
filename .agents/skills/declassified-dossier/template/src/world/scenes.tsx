// Declassified Dossier, v5 (his re-recorded take: he reads the question, then answers). He is always the still
// cut-out bottom-left (head + hair ≈ x 90-520, y 1110-1590, see SIDE_FACE). Every picture lives in the TOP BAND
// (sheet x 50-1030, y 235-635) or the RIGHT COLUMN (x 575-935, y 655-1180; <= 1110 while the MY ANSWER tag shows).
// One primary motion at a time; panels swap with a quick slide on beat changes, then hold still.
import React from "react";
import { B } from "../beats";
import { ease } from "../lib";
import { COND, Clip, HANDLE, HI, Hi, INK, MANILA, MEMO, MONO, Pencil, Pin, RED, Stamp, Type, Whale, arrowHead, lerp, loopPath, pB, pS, rnd, sm } from "./kit";
import { T } from "./T";

// slide in from the right at s (0.35 s), out to the left at e (0.3 s)
const slide = (t: number, s: number, e: number, delay = 0) => {
  const k = sm((t - s + 0.12 - delay) / 0.35), o = sm((t - e + 0.12) / 0.3);
  return { x: lerp(1150, 0, ease(k)) - 1200 * o * o, vis: k > 0 && o < 1 };
};
// v6 staging (bigger presenter): every scene is still drawn in its v5 coordinates (top band x 50-1030, y 235-635;
// right column x 575-935, y 655-1180) and mapped into the v6 zones: top band -> x 40-942, y 300-668 (0.92) under the
// series tag; right column (cx 755) -> x 678-944, y 770-1159 (0.74) beside his head. `raw` = already in screen space.
export const BAND_TF = "translate(40 300) scale(0.92) translate(-50 -235)";
export const COL_TF = "translate(678 770) scale(0.74) translate(-575 -655)";
const Slot: React.FC<{ t: number; s: number; e: number; delay?: number; rot?: number; cx?: number; cy?: number; raw?: boolean; children: React.ReactNode }> = ({ t, s, e, delay, rot = 0, cx = 540, cy = 435, raw, children }) => {
  const col = cx === 755;
  const d = slide(t, s, e, delay);
  if (!d.vis) return null;
  // v6: the right column never slides left across his head on exit; it fades out while drifting right
  if (col) {
    const o = sm((t - e + 0.12) / 0.3), k = sm((t - s + 0.12 - (delay ?? 0)) / 0.35);
    return <g transform={COL_TF} opacity={1 - o}><g transform={`translate(${lerp(1150, 0, ease(k)) + 260 * o} 0) rotate(${rot} ${cx} ${cy})`}>{children}</g></g>;
  }
  return <g transform={raw ? "" : BAND_TF}><g transform={`translate(${d.x} 0) rotate(${rot} ${cx} ${cy})`}>{children}</g></g>;
};
const TopSheet: React.FC<{ fill?: "memo" | "manila" }> = ({ fill = "memo" }) => <rect x={50} y={235} width={980} height={400} fill={`url(#p${fill})`} filter="url(#dsh)" />;
const ColSheet: React.FC<{ y0?: number; y1?: number; fill?: "memo" | "manila" }> = ({ y0 = 660, y1 = 1175, fill = "memo" }) => <rect x={575} y={y0} width={360} height={y1 - y0} fill={`url(#p${fill})`} filter="url(#dsh)" />;
const fadeIn = (t: number, at: number, dur = 0.25) => pS(t, at, dur);
const Tick: React.FC<{ x: number; y: number; t: number; at: number; s?: number }> = ({ x, y, t, at, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}><Pencil d="M-28,0 L-6,24 L34,-30" p={pS(t, at, 0.22)} w={10} /></g>
);

const WhalePhoto: React.FC<{ x: number; y: number; rot?: number; t: number; stampAt?: number; label?: string }> = ({ x, y, rot = 4, t, stampAt, label = "DEEPSEEK" }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <rect x={-130} y={-140} width={260} height={300} fill="#f4f1e8" filter="url(#dsh)" />
    <rect x={-115} y={-125} width={230} height={220} fill="#dfe8f6" />
    <g transform="translate(0 -14)"><Whale s={0.95} /></g>
    <text x={0} y={142} textAnchor="middle" fontFamily={COND} fontSize={40} fill={INK}>{label}</text>
    <Clip x={-60} y={-185} rot={-6} />
    {stampAt !== undefined && <Stamp x={0} y={-10} t={t} at={stampAt} text="BANNED" size={70} rot={-20} />}
  </g>
);

// ---------------------------------------------------------------- Q bubble (his question) + MY ANSWER tag
// "A · MY ANSWER" sits right above his caption for ~1.9 s when his answer starts (twice per video).
const ATag: React.FC<{ t: number; at: number }> = ({ t, at }) => {
  if (t < at - 0.05 || t > at + 2.0) return null;
  const k = pB(t, at - 0.05, 0.3, 1.5), o = 1 - sm((t - at - 1.75) / 0.25);
  return (
    <g transform={`translate(692 1290) rotate(-2) scale(${k * 0.8})`} opacity={o}>
      <rect x={0} y={-62} width={300} height={62} fill={RED} filter="url(#dsh2)" />
      <circle cx={32} cy={-31} r={22} fill="#fff" />
      <text x={32} y={-18} textAnchor="middle" fontFamily={COND} fontSize={36} fill={RED}>A</text>
      <text x={66} y={-17} fontFamily={COND} fontSize={42} fill="#fff" letterSpacing={1}>MY ANSWER</text>
    </g>
  );
};

// ---------------------------------------------------------------- 1. HOOK headline (frame 0 = cover) + Q1
const Hook: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Slot t={t} s={-9} e={B.qwhy.s} rot={-0.6}>
      <TopSheet />
      <rect x={50} y={235} width={980} height={78} fill={RED} />
      <text x={86} y={293} fontFamily={COND} fontSize={52} fill="#fff" letterSpacing={2}>US NEWS · OCT 20</text>
      <Hi x={80} y={330} w={720} h={86} t={t} at={T.banned - 0.05} />
      <text x={86} y={404} fontFamily={COND} fontSize={84} fill={INK}>The US just banned</text>
      <text x={86} y={498} fontFamily={COND} fontSize={84} fill={INK}>a Chinese AI.</text>
      <text x={86} y={596} fontFamily={COND} fontSize={80} fill={RED}>Was that fair?</text>
    </Slot>
    <Slot t={t} s={-9} e={B.news.s} cx={755} cy={900}>
      <WhalePhoto x={755} y={860} t={t} stampAt={T.banned + 0.02} />
      <g opacity={fadeIn(t, T.chinese - 0.1)} transform="translate(755 1085) rotate(-2)">
        <rect x={-165} y={-40} width={330} height={80} fill={MEMO} filter="url(#dsh2)" />
        <text y={14} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={34} fill={RED}>CHINESE AI</text>
      </g>
    </Slot>
  </>
);

// ---------------------------------------------------------------- 2. dated news card: Oct 20, banned from the federal system
const News: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Slot t={t} s={B.news.s} e={B.data.s} rot={0.5}>
      <TopSheet />
      {/* calendar page */}
      <g transform="translate(185 435) rotate(-3)">
        <rect x={-110} y={-150} width={220} height={290} fill="#fff" filter="url(#dsh2)" />
        <rect x={-110} y={-150} width={220} height={70} fill={RED} />
        <text y={-98} textAnchor="middle" fontFamily={COND} fontSize={50} fill="#fff">OCT</text>
        <text y={60} textAnchor="middle" fontFamily={COND} fontSize={150} fill={INK}>20</text>
        <text y={118} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={30} fill={INK}>2026</text>
        <Pencil d={loopPath(0, 10, 92, 92, "oct")} p={pS(t, T.october + 0.25, 0.45)} w={6} />
      </g>
      <Type x={335} y={320} text="U.S. GOVERNMENT:" t={t} at={T.government - 0.1} cps={40} size={36} fill={RED} />
      <g opacity={fadeIn(t, T.banning - 0.05, 0.2)}>
        <text x={335} y={418} fontFamily={COND} fontSize={80} fill={INK}>Banning DeepSeek</text>
        <text x={335} y={505} fontFamily={COND} fontSize={80} fill={INK}>from the</text>
      </g>
      <Hi x={330} y={530} w={520} h={84} t={t} at={T.federal} />
      <text x={335} y={596} fontFamily={COND} fontSize={80} fill={RED} opacity={fadeIn(t, T.federal - 0.1, 0.2)}>federal system</text>
    </Slot>
    <Slot t={t} s={B.news.s} e={B.data.s} delay={0.1} cx={755} cy={880}>
      <ColSheet y0={680} y1={1100} />
      <text x={755} y={740} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={30} fill={INK}>FEDERAL SYSTEM</text>
      <rect x={615} y={770} width={280} height={190} rx={10} fill="#2a2d33" stroke={INK} strokeWidth={4} />
      <rect x={630} y={785} width={250} height={160} fill="#dfe8f6" />
      <g transform="translate(755 870)"><Whale s={0.55} /></g>
      <rect x={735} y={960} width={40} height={40} fill="#2a2d33" />
      <rect x={685} y={998} width={140} height={14} rx={6} fill="#2a2d33" />
      <Stamp x={755} y={870} t={t} at={T.banning} text="BANNED" size={60} rot={-12} />
      <text x={755} y={1062} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={26} fill={INK} opacity={fadeIn(t, T.federal)}>removed from use</text>
    </Slot>
  </>
);

// ---------------------------------------------------------------- 3. Homeland Security: could send sensitive data to China
const Data: React.FC<{ t: number }> = ({ t }) => {
  const pa = pS(t, T.sensitive - 0.2, 0.6);
  const path = "M270,470 C420,400 600,400 720,470";
  return (
    <>
      <Slot t={t} s={B.data.s} e={B.outside.s} rot={0.5}>
        <TopSheet />
        <Type x={86} y={295} text="HOMELAND SECURITY SAYS:" t={t} at={B.data.s + 0.1} cps={45} size={34} />
        <circle cx={180} cy={490} r={88} fill="#dfe8f6" stroke={INK} strokeWidth={3} />
        <g transform="translate(180 494)"><Whale s={0.66} /></g>
        <text x={180} y={615} textAnchor="middle" fontFamily={COND} fontSize={38} fill={INK}>DEEPSEEK</text>
        <Pencil d={path} p={pa} w={7} />
        {pa > 0.95 && <Pencil d={arrowHead(720, 470, 0.55)} p={1} w={7} />}
        {pa > 0.6 && Array.from({ length: 5 }, (_, i) => {
          const u = (t - T.sensitive - 0.2) * 0.9 - i * 0.18;
          if (u < 0 || u > 1) return null;
          const x = lerp(270, 720, u), y = 470 - Math.sin(u * Math.PI) * 52;
          return <rect key={i} x={x - 12} y={y - 10} width={24} height={18} fill={HI} stroke={INK} strokeWidth={2} />;
        })}
        <text x={495} y={385} textAnchor="middle" fontFamily={COND} fontSize={48} fill={INK} opacity={fadeIn(t, T.sensitive)}>SENSITIVE DATA</text>
        <text x={495} y={540} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={32} fill={RED} opacity={fadeIn(t, T.sensitive)}>could be sent</text>
        <g opacity={fadeIn(t, T.china - 0.15)} transform="translate(830 490)">
          <rect x={-95} y={-60} width={190} height={120} fill="#e07a6a" stroke={INK} strokeWidth={3} />
          <text y={18} textAnchor="middle" fontFamily={COND} fontSize={56} fill="#fff">CHINA</text>
        </g>
      </Slot>
      <Slot t={t} s={B.data.s} e={B.enigma.s} delay={0.1} cx={755} cy={900}>
        <ColSheet y0={680} y1={1120} />
        {/* plain badge (no real seal) */}
        <g transform="translate(755 830)">
          <path d="M0,-95 L80,-62 L80,10 C80,60 40,88 0,105 C-40,88 -80,60 -80,10 L-80,-62 Z" fill="#2c4f9e" stroke={INK} strokeWidth={4} />
          <path d="M0,-70 L58,-46 L58,8 C58,46 30,68 0,80 C-30,68 -58,46 -58,8 L-58,-46 Z" fill="none" stroke={MEMO} strokeWidth={3} />
          <text y={22} textAnchor="middle" fontFamily={COND} fontSize={58} fill={MEMO}>DHS</text>
        </g>
        <text x={755} y={990} textAnchor="middle" fontFamily={COND} fontSize={44} fill={INK}>THEIR WORRY:</text>
        <text x={755} y={1060} textAnchor="middle" fontFamily={COND} fontSize={50} fill={RED}>DATA → CHINA</text>
      </Slot>
    </>
  );
};

// ---------------------------------------------------------------- 4. WHAT IF? Enigma on the British side, leaking to Germany
// Diorama in the top band (Germany left, front line centre, British right); the machine sits in the right column; a hidden
// red wire runs out of the machine, under the front line, into the German bunker. A hypothetical, so it's tagged WHAT IF?
const WIRE: [number, number][] = [[919, 877], [934, 877], [934, 636], [196, 636], [196, 602]]; // screen space (v6 zones)
const wireD = "M" + WIRE.map((p) => p.join(",")).join("L");
const wireLen = WIRE.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - WIRE[i][0], p[1] - WIRE[i][1]), 0);
const wireAt = (u: number): [number, number] => {
  let d = u * wireLen;
  for (let i = 1; i < WIRE.length; i++) {
    const a = WIRE[i - 1], b = WIRE[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= L) return [lerp(a[0], b[0], d / L), lerp(a[1], b[1], d / L)];
    d -= L;
  }
  return WIRE[WIRE.length - 1];
};
const Bunker: React.FC<{ x: number; c: string }> = ({ x, c }) => (
  <g transform={`translate(${x} 562)`}>
    <path d="M-100,0 C-100,-70 100,-70 100,0 Z" fill={c} stroke={INK} strokeWidth={3} />
    <rect x={-40} y={-34} width={80} height={14} fill="#1b1a19" />
    {Array.from({ length: 6 }, (_, i) => <rect key={i} x={-108 + i * 36} y={-10} width={34} height={14} rx={4} fill="#c9b07a" stroke={INK} strokeWidth={2} />)}
  </g>
);
const Enigma: React.FC<{ t: number }> = ({ t }) => {
  const pw = pS(t, T.started, 0.9, sm);
  const lit = t > T.encrypt + 0.1 && t < T.started ? Math.floor((t - T.encrypt) * 5) % 17 : -1;
  return (
    <>
      <Slot t={t} s={B.enigma.s} e={B.restrict.s} rot={-0.3}>
        <TopSheet />
        {/* sky + earth */}
        <rect x={50} y={340} width={980} height={222} fill="#c9d6d6" opacity={0.45} />
        <rect x={50} y={560} width={980} height={75} fill="#6f5c3d" />
        <rect x={50} y={556} width={980} height={8} fill="#556b3a" />
        {/* front line: barbed wire */}
        <text x={540} y={378} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={24} fill={INK}>FRONT LINE</text>
        {[500, 580].map((x) => <rect key={x} x={x - 4} y={470} width={8} height={92} fill="#4a3a24" />)}
        <path d={Array.from({ length: 9 }, (_, i) => `${i ? "L" : "M"}${500 + (i % 2) * 80},${400 + i * 20}`).join("")} fill="none" stroke="#3a3a3a" strokeWidth={4} />
        <path d={Array.from({ length: 9 }, (_, i) => `${i ? "L" : "M"}${580 - (i % 2) * 80},${400 + i * 20}`).join("")} fill="none" stroke="#3a3a3a" strokeWidth={4} />
        {/* British side (right) */}
        <g opacity={fadeIn(t, T.british - 0.1)}>
          <Bunker x={860} c="#8a9a6a" />
          <text x={860} y={440} textAnchor="middle" fontFamily={COND} fontSize={56} fill="#2c4f9e">BRITISH</text>
          <circle cx={970} cy={420} r={26} fill="#2c4f9e" /><circle cx={970} cy={420} r={17} fill="#fff" /><circle cx={970} cy={420} r={8} fill={RED} />
        </g>
        {/* German side (left) */}
        <g opacity={fadeIn(t, T.fighting - 0.1)}>
          <Bunker x={220} c="#7c7f84" />
          <text x={220} y={440} textAnchor="middle" fontFamily={COND} fontSize={56} fill={INK}>GERMANY</text>
          <path d="M290,500 L290,452 M276,462 L290,452 L304,462" stroke={INK} strokeWidth={4} fill="none" />
        </g>
        <Stamp x={220} y={318} t={t} at={T.germanyE} text="RECEIVED" size={42} rot={-6} />
        {/* WHAT IF? tag (hypothetical) */}
        <Stamp x={540} y={290} t={t} at={T.enigma + 0.2} text="WHAT IF?" size={58} rot={-4} />
      </Slot>
      <Slot t={t} s={B.enigma.s} e={B.restrict.s} delay={0.1} cx={755} cy={900}>
        <ColSheet y0={670} y1={1150} fill="manila" />
        <text x={755} y={722} textAnchor="middle" fontFamily={COND} fontSize={46} fill={INK}>ENIGMA</text>
        <text x={755} y={754} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={22} fill={INK}>WWII cipher machine</text>
        <rect x={610} y={772} width={290} height={218} rx={8} fill="#6b4a2b" stroke={INK} strokeWidth={4} />
        <rect x={624} y={786} width={262} height={190} fill="#2b2724" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={705 + i * 38} y={794} width={26} height={34} rx={4} fill="#8a8f96" stroke="#111" strokeWidth={2} />
            <text x={718 + i * 38} y={820} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={22} fill="#111">{"QXR"[i]}</text>
          </g>
        ))}
        {Array.from({ length: 17 }, (_, i) => {
          const row = i < 9 ? 0 : 1, col = row ? i - 9 : i;
          return <circle key={i} cx={651 + col * 26 + row * 13} cy={852 + row * 26} r={9} fill={i === lit ? HI : "#4a4744"} stroke="#9a968f" strokeWidth={1.5} />;
        })}
        {Array.from({ length: 17 }, (_, i) => {
          const row = i < 9 ? 0 : 1, col = row ? i - 9 : i;
          return <circle key={i} cx={651 + col * 26 + row * 13} cy={918 + row * 28} r={10} fill="#141312" stroke="#e8e2d4" strokeWidth={2} />;
        })}
        <g opacity={fadeIn(t, T.encrypt - 0.3)}>
          <rect x={600} y={1010} width={310} height={122} fill={MEMO} filter="url(#dsh2)" />
          <Type x={755} y={1052} anchor="middle" text="ATTACK AT DAWN" t={t} at={T.encrypt - 0.25} cps={30} size={30} />
          <text x={755} y={1080} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={22} fill={INK} opacity={fadeIn(t, T.encrypt + 0.35)}>↓ encrypted</text>
          <Type x={755} y={1116} anchor="middle" text="QXRTB ZM PLWVK" t={t} at={T.encrypt + 0.45} cps={30} size={30} fill={RED} />
        </g>
      </Slot>
      <Slot t={t} s={B.enigma.s} e={B.restrict.s} raw>
        {/* hidden wire + leaking data (screen space) */}
        <Pencil d={wireD} p={pw} w={6} />
        <text x={600} y={660} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={21} fill="#fff" opacity={fadeIn(t, T.started + 0.6)}>HIDDEN WIRE</text>
        {t > T.sending - 0.1 && Array.from({ length: 6 }, (_, i) => {
          const u = ((t - T.sending + 0.1) * 0.55 - i * 0.16);
          if (u < 0 || u > 1) return null;
          const [x, y] = wireAt(u);
          return <rect key={i} x={x - 11} y={y - 9} width={22} height={18} fill={HI} stroke={INK} strokeWidth={2} />;
        })}
      </Slot>
    </>
  );
};

// ---------------------------------------------------------------- 5. not just the US: South Korea, Italy, Germany restricting
const MX = 70, MY = 235;
const poly = (s: string) => "M" + s.trim().split(/\s+/).map((p) => { const [x, y] = p.split(",").map(Number); return `${x + MX},${y + MY}`; }).join("L") + "Z";
const LAND = [
  "20,120 50,70 110,55 160,70 170,110 150,150 120,160 100,200 70,190 60,150 30,160",
  "70,205 150,198 200,240 190,300 150,370 120,385 100,320 70,270",
  "160,70 260,40 400,30 520,45 600,80 612,120 560,150 545,200 480,232 430,262 400,232 360,250 330,305 300,242 250,232 200,200 170,150",
  "588,150 608,138 622,168 602,205 584,186",
  "470,322 520,296 590,310 602,350 560,386 500,382 470,356",
  "690,70 760,40 860,45 924,80 902,130 862,160 842,205 800,250 772,272 760,232 730,202 702,152 682,110",
  "800,282 850,276 902,312 882,362 852,400 832,398 822,342",
];
const CHN = "400,108 522,108 548,160 522,210 470,232 420,216 390,170";
const USA = "715,138 862,150 846,196 802,236 762,216 726,190";
const RPINS: { p: [number, number]; name: string; at: () => number; lx: number; ly: number; c?: string }[] = [
  { p: [560, 148], name: "S. KOREA", at: () => T.south, lx: 600, ly: 110 },
  { p: [112, 150], name: "ITALY", at: () => T.italy, lx: 150, ly: 200 },
  { p: [92, 100], name: "GERMANY", at: () => T.germany, lx: 130, ly: 60 },
];
const Restrict: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Slot t={t} s={B.restrict.s} e={B.qthreat.s} rot={-0.4}>
      <rect x={50} y={225} width={980} height={420} fill="url(#pmemo)" filter="url(#dsh)" />
      <rect x={MX} y={MY} width={940} height={400} fill="#c9d6d6" opacity={0.55} />
      {LAND.map((l, i) => <path key={i} d={poly(l)} fill={MANILA} stroke="#8a6f3c" strokeWidth={2.5} />)}
      <path d={poly(CHN)} fill="#e07a6a" opacity={0.9} />
      <path d={poly(USA)} fill="#7e9bd6" opacity={0.85} />
      <text x={MX + 468} y={MY + 182} textAnchor="middle" fontFamily={COND} fontSize={40} fill={INK}>CHINA</text>
      {/* the US already did it */}
      <Pin x={MX + 785} y={MY + 185} color="#2c4f9e" s={1.2} />
      <g><rect x={MX + 742} y={MY + 263} width={90} height={42} fill="#2c4f9e" /><text x={MX + 750} y={MY + 295} fontFamily={COND} fontSize={34} fill="#fff">USA</text></g>
      {RPINS.map((r, i) => {
        const at = r.at();
        if (t < at - 0.1) return null;
        return (
          <g key={i}>
            <Pin x={r.p[0] + MX} y={r.p[1] + MY} s={pB(t, at - 0.1, 0.3) * 1.2} />
            <g opacity={fadeIn(t, at)}>
              <rect x={r.lx + MX - 8} y={r.ly + MY - 32} width={r.name.length * 17 + 18} height={42} fill={RED} />
              <text x={r.lx + MX} y={r.ly + MY} fontFamily={COND} fontSize={34} fill="#fff">{r.name}</text>
            </g>
          </g>
        );
      })}
    </Slot>
    <Slot t={t} s={B.restrict.s} e={B.qthreat.s} delay={0.1} cx={755} cy={900}>
      <ColSheet y0={680} y1={1140} />
      <text x={755} y={745} textAnchor="middle" fontFamily={COND} fontSize={46} fill={INK}>NOT JUST</text>
      <text x={755} y={795} textAnchor="middle" fontFamily={COND} fontSize={46} fill={INK}>THE US</text>
      <line x1={600} x2={910} y1={815} y2={815} stroke={RED} strokeWidth={3} />
      {RPINS.map((r, i) => <text key={i} x={610} y={880 + i * 62} fontFamily={COND} fontSize={52} fill={INK} opacity={fadeIn(t, r.at())}>{i + 1}. {r.name}</text>)}
      <Stamp x={755} y={1085} t={t} at={T.restricting} text="RESTRICTING" size={48} rot={-5} />
    </Slot>
  </>
);

// ---------------------------------------------------------------- 6. Q2: security threat or power struggle?
const QCard: React.FC<{ y: number; text: string; t: number; at: number; red?: boolean; rot: number }> = ({ y, text, t, at, red, rot }) => {
  if (t < at - 0.12) return null;
  return (
    <g transform={`translate(755 ${y}) rotate(${rot}) scale(${pB(t, at - 0.12, 0.3, 1.5)})`}>
      <rect x={-170} y={-70} width={340} height={140} fill="url(#pmanila)" filter="url(#dsh)" />
      {text.split("|").map((l, i) => <text key={i} y={-10 + i * 56} textAnchor="middle" fontFamily={COND} fontSize={52} fill={red ? RED : INK}>{l}</text>)}
    </g>
  );
};
const QThreat: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Slot t={t} s={B.qthreat.s} e={B.take.s} delay={0.1} cx={755} cy={900}>
      <QCard y={770} text="SECURITY|THREAT?" t={t} at={T.qThreat} rot={-2} />
      {t > T.qThreat + 0.3 && <text x={755} y={925} textAnchor="middle" fontFamily={COND} fontSize={60} fill={HI} opacity={fadeIn(t, T.qThreat + 0.3)}>OR</text>}
      <QCard y={1040} text="POWER|STRUGGLE?" t={t} at={T.qPower} red rot={2} />
    </Slot>
  </>
);

// ---------------------------------------------------------------- 7. his answer: not OR, it's AND
const Take: React.FC<{ t: number }> = ({ t }) => {
  const kOr = pS(t, T.notOr, 0.2), kAnd = pB(t, T.and - 0.05, 0.3, 1.6);
  return (
    <>
      <Slot t={t} s={B.take.s} e={B.cars.s} rot={-0.4}>
        <TopSheet />
        <rect x={50} y={235} width={980} height={70} fill={INK} />
        <text x={540} y={284} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={38} fill={MEMO}>MADHAV'S TAKE</text>
        {[{ x: 270, l: ["SECURITY", "THREAT"], at: T.aThreat }, { x: 810, l: ["POWER", "STRUGGLE"], at: T.aPower }].map((c, i) => (
          <g key={i} transform={`translate(${c.x} 470) rotate(${i ? 1.5 : -1.5})`}>
            <rect x={-170} y={-110} width={340} height={220} fill="url(#pmanila)" filter="url(#dsh2)" />
            <text y={-12} textAnchor="middle" fontFamily={COND} fontSize={70} fill={INK}>{c.l[0]}</text>
            <text y={68} textAnchor="middle" fontFamily={COND} fontSize={70} fill={INK}>{c.l[1]}</text>
            <Tick x={135} y={-70} t={t} at={c.at} />
          </g>
        ))}
        <text x={540} y={495} textAnchor="middle" fontFamily={COND} fontSize={64} fill={INK} opacity={1 - kAnd * 0.75}>OR</text>
        <Pencil d="M500,440 L580,500" p={kOr} w={9} />
        <Pencil d="M580,440 L500,500" p={pS(t, T.notOr + 0.15, 0.2)} w={9} />
        {t > T.and - 0.05 && (
          <g transform={`translate(540 590) rotate(-4) scale(${kAnd})`}>
            <rect x={-95} y={-44} width={190} height={84} fill={HI} filter="url(#dsh2)" />
            <text y={28} textAnchor="middle" fontFamily={COND} fontSize={72} fill={RED}>AND</text>
          </g>
        )}
      </Slot>
      <Slot t={t} s={B.take.s} e={B.cars.s} delay={0.1} cx={755} cy={880}>
        <ColSheet y0={680} y1={1100} />
        <text x={755} y={740} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={30} fill={INK}>IT'S BOTH</text>
        <circle cx={700} cy={890} r={112} fill="#2c4f9e" opacity={0.28} stroke="#2c4f9e" strokeWidth={4} />
        <circle cx={810} cy={890} r={112} fill={RED} opacity={0.28} stroke={RED} strokeWidth={4} />
        <text x={655} y={895} textAnchor="middle" fontFamily={COND} fontSize={30} fill={INK}>SECURITY</text>
        <text x={858} y={895} textAnchor="middle" fontFamily={COND} fontSize={30} fill={INK}>POWER</text>
        <g opacity={fadeIn(t, T.and + 0.2)}>
          <g transform="translate(755 960)"><Whale s={0.22} /></g>
          <text x={755} y={1062} textAnchor="middle" fontFamily={COND} fontSize={44} fill={RED}>NOT OR. AND.</text>
        </g>
      </Slot>
    </>
  );
};

// ---------------------------------------------------------------- 8. cars: 100% tariff on BYD; security risk? no. power struggle
const CarSide: React.FC<{ x: number; y: number; wheel: number; s?: number; c?: string; label?: string }> = ({ x, y, wheel, s = 1, c = "#2a8f8a", label = "BYD" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={146} cy={8} rx={150} ry={12} fill="rgba(0,0,0,.35)" />
    <path d="M0,-30 C0,-55 18,-62 45,-66 L80,-112 C92,-124 110,-128 130,-128 L190,-128 C214,-128 228,-118 240,-100 L262,-66 C280,-62 292,-52 292,-30 L292,-10 L0,-10 Z" fill={c} stroke={INK} strokeWidth={3} />
    <path d="M88,-104 L128,-104 L128,-70 L62,-70 Z M140,-104 L188,-104 C204,-104 214,-96 222,-84 L232,-70 L140,-70 Z" fill="#cfe6f2" stroke={INK} strokeWidth={2.5} />
    <text x={150} y={-24} textAnchor="middle" fontFamily={COND} fontSize={40} fill="#fff">{label}</text>
    {[60, 232].map((cx) => (
      <g key={cx} transform={`translate(${cx} -8) rotate(${wheel})`}>
        <circle r={30} fill="#1b1a19" /><circle r={14} fill="#9aa1aa" />
        <path d="M-14,0 L14,0 M0,-14 L0,14" stroke="#555" strokeWidth={3} />
      </g>
    ))}
  </g>
);
const Cars: React.FC<{ t: number }> = ({ t }) => {
  const kc = ease(sm((t - T.carMarket + 0.1) / 0.8));
  const carX = lerp(1150, 640, kc);
  const drop = t < T.tariff ? 0 : Math.min(1, (t - T.tariff) / 0.2);
  const arm = lerp(-72, 0, drop * drop);
  return (
    <>
      <Slot t={t} s={B.cars.s} e={B.jobs.s} rot={-0.4}>
        <TopSheet />
        <text x={420} y={320} fontFamily={COND} fontSize={66} fill={INK}>EXAMPLE: <tspan fill={RED}>CARS</tspan></text>
        <rect x={80} y={330} width={180} height={262} fill="#3a4048" stroke={INK} strokeWidth={3} />
        <rect x={70} y={300} width={200} height={40} fill={RED} />
        <text x={170} y={331} textAnchor="middle" fontFamily={COND} fontSize={30} fill="#fff">U.S. BORDER</text>
        <rect x={105} y={360} width={130} height={150} fill="#1d2a38" />
        <rect x={50} y={590} width={980} height={45} fill="#3b3936" />
        {Array.from({ length: 8 }, (_, i) => <rect key={i} x={80 + i * 120} y={609} width={60} height={7} fill={HI} />)}
        <CarSide x={carX} y={598} wheel={-kc * 500} s={0.9} />
        <rect x={262} y={540} width={24} height={52} fill="#2b2b2b" />
        <g transform={`rotate(${arm} 274 548)`}>
          <rect x={274} y={536} width={300} height={24} rx={6} fill="#fff" stroke={INK} strokeWidth={3} />
          {Array.from({ length: 5 }, (_, i) => <rect key={i} x={292 + i * 58} y={538} width={29} height={20} fill={RED} />)}
        </g>
        <circle cx={274} cy={548} r={14} fill="#222" />
        <Type x={420} y={378} text="US: 100% tariff on BYD cars" t={t} at={T.pct - 0.1} cps={40} size={31} fill={RED} />
        <Type x={420} y={430} text="Why do they do it?" t={t} at={T.why} cps={40} size={31} />
      </Slot>
      <Slot t={t} s={B.cars.s} e={B.jobs.s} delay={0.1} cx={755} cy={900}>
        {t > T.pct - 0.1 && (
          <g opacity={fadeIn(t, T.pct - 0.1)} transform="translate(755 785) rotate(-2)">
            <rect x={-175} y={-100} width={350} height={200} fill={HI} filter="url(#dsh2)" />
            <text y={-48} textAnchor="middle" fontFamily={COND} fontSize={40} fill={INK}>US tariff on</text>
            <text y={2} textAnchor="middle" fontFamily={COND} fontSize={40} fill={INK}>Chinese EVs:</text>
            <text y={78} textAnchor="middle" fontFamily={COND} fontSize={80} fill={RED}>100%+</text>
          </g>
        )}
        {t > T.risk - 0.12 && (
          <g transform={`translate(755 975) rotate(1.5) scale(${pB(t, T.risk - 0.12, 0.3, 1.5)})`}>
            <rect x={-170} y={-52} width={340} height={104} fill="url(#pmanila)" filter="url(#dsh2)" />
            <text y={20} textAnchor="middle" fontFamily={COND} fontSize={56} fill={INK}>SECURITY RISK?</text>
            <Pencil d="M-150,-40 L150,40" p={pS(t, T.no - 0.05, 0.18)} w={11} />
            <Pencil d="M150,-40 L-150,40" p={pS(t, T.no + 0.1, 0.18)} w={11} />
          </g>
        )}
        <Stamp x={755} y={1098} t={t} at={T.power2} text="POWER STRUGGLE" size={42} rot={-4} />
        <text x={755} y={1170} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={24} fill={MEMO} opacity={fadeIn(t, T.power2 + 0.3)}>— Madhav's take</text>
      </Slot>
    </>
  );
};

// ---------------------------------------------------------------- 9. verdict: ban it, restrict it, allow more competitors
const Verdict: React.FC<{ t: number }> = ({ t }) => {
  const kn = pS(t, T.competitors - 0.1, 0.35);
  return (
    <>
      <Slot t={t} s={B.verdict.s} e={B.healthy.s} rot={0.4}>
        <TopSheet />
        <rect x={50} y={235} width={980} height={70} fill={INK} />
        <text x={540} y={284} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={38} fill={MEMO}>MADHAV'S VERDICT</text>
        <g opacity={fadeIn(t, T.banIt - 0.1, 0.2)}><text x={90} y={395} fontFamily={COND} fontSize={72} fill={INK}>1. BAN IT</text><Tick x={420} y={368} t={t} at={T.banIt + 0.25} /></g>
        <g opacity={fadeIn(t, T.restrictIt - 0.1, 0.2)}><text x={90} y={485} fontFamily={COND} fontSize={72} fill={INK}>2. RESTRICT IT</text><Tick x={560} y={458} t={t} at={T.restrictIt + 0.3} /></g>
        <Hi x={84} y={520} w={900} h={82} t={t} at={T.competitors} />
        <text x={90} y={583} fontFamily={COND} fontSize={66} fill={RED} opacity={fadeIn(t, T.but - 0.1, 0.2)}>3. BUT ALLOW MORE COMPETITORS</text>
      </Slot>
      <Slot t={t} s={B.verdict.s} e={B.healthy.s} delay={0.1} cx={755} cy={900}>
        <ColSheet y0={680} y1={1160} />
        <text x={755} y={740} textAnchor="middle" fontFamily={COND} fontSize={50} fill={INK}>THE MARKET</text>
        <rect x={605} y={770} width={300} height={290} fill="none" stroke={INK} strokeWidth={5} strokeDasharray="18 10" />
        <g transform="translate(680 830) rotate(-3)">
          <rect x={-60} y={-40} width={120} height={80} fill="#dfe8f6" stroke={INK} strokeWidth={3} />
          <g transform="translate(0 2)"><Whale s={0.42} /></g>
        </g>
        {[[830, 830], [680, 985], [830, 985]].map(([x, y], i) => {
          const k = pB(t, T.competitors - 0.1 + i * 0.12, 0.3, 1.5);
          if (t < T.competitors - 0.1 + i * 0.12) return null;
          return (
            <g key={i} transform={`translate(${x} ${lerp(y - 140, y, Math.min(1, k))}) rotate(${(rnd(`np${i}`) - 0.5) * 8})`} opacity={Math.min(1, k * 2)}>
              <rect x={-62} y={-40} width={124} height={80} fill={MANILA} stroke={INK} strokeWidth={3} filter="url(#dsh2)" />
              <text y={-4} textAnchor="middle" fontFamily={COND} fontSize={28} fill={INK}>NEW</text>
              <text y={28} textAnchor="middle" fontFamily={COND} fontSize={28} fill={INK}>PLAYER</text>
            </g>
          );
        })}
        <text x={755} y={1120} textAnchor="middle" fontFamily={COND} fontSize={44} fill={RED} opacity={kn > 0 ? fadeIn(t, T.enter) : 0}>MORE COMPETITORS</text>
      </Slot>
    </>
  );
};

// ---------------------------------------------------------------- 10. competition always stays healthy (scale)
const Healthy: React.FC<{ t: number }> = ({ t }) => {
  const k = (t - B.healthy.s) / (T.healthy + 0.2 - B.healthy.s);
  const tilt = k < 1 ? 8 * (1 - sm(k)) * Math.cos(k * 4) : 0;
  const piv: [number, number] = [540, 350], L = 290, a = (tilt * Math.PI) / 180;
  const end = (s: number): [number, number] => [piv[0] + s * L * Math.cos(a), piv[1] + s * L * Math.sin(a)];
  const pan = (s: number, label: string, color: string, whale?: boolean) => {
    const [x, y] = end(s);
    return (
      <g key={label}>
        <path d={`M${x},${y} L${x - 90},${y + 150} M${x},${y} L${x + 90},${y + 150}`} stroke="#b08a3a" strokeWidth={3} />
        <path d={`M${x - 110},${y + 150} L${x + 110},${y + 150} C${x + 90},${y + 195} ${x - 90},${y + 195} ${x - 110},${y + 150} Z`} fill="url(#gbrass)" stroke="#6b4f1c" strokeWidth={2} />
        <g transform={`translate(${x} ${y + 112})`}>
          <path d="M-90,-50 L-30,-50 L-20,-62 L90,-62 L90,38 L-90,38 Z" fill={MANILA} stroke={INK} strokeWidth={2.5} filter="url(#dsh2)" />
          {whale && <g transform="translate(58 -26)"><Whale s={0.2} /></g>}
          <text y={16} textAnchor="middle" fontFamily={COND} fontSize={46} fill={color}>{label}</text>
        </g>
      </g>
    );
  };
  return (
    <>
      <Slot t={t} s={B.healthy.s} e={B.comment.s} rot={0.4}>
        <TopSheet />
        <text x={540} y={292} textAnchor="middle" fontFamily={COND} fontSize={46} fill={INK}>US AI  vs  CHINA AI</text>
        <rect x={piv[0] - 9} y={piv[1]} width={18} height={250} fill="url(#gbrass)" />
        <path d={`M${piv[0] - 80},622 L${piv[0] + 80},622 L${piv[0] + 50},596 L${piv[0] - 50},596 Z`} fill="url(#gbrass)" />
        <g transform={`rotate(${tilt} ${piv[0]} ${piv[1]})`}><rect x={piv[0] - L - 8} y={piv[1] - 8} width={2 * L + 16} height={16} rx={8} fill="url(#gbrass)" stroke="#6b4f1c" strokeWidth={2} /></g>
        <circle cx={piv[0]} cy={piv[1]} r={18} fill="url(#gbrass)" stroke="#6b4f1c" strokeWidth={2} />
        {pan(-1, "US AI", "#2c4f9e")}
        {pan(1, "CHINA AI", RED, true)}
      </Slot>
      <Slot t={t} s={B.healthy.s} e={B.comment.s} delay={0.1} cx={755} cy={900}>
        <ColSheet y0={700} y1={1120} />
        <text x={755} y={790} textAnchor="middle" fontFamily={COND} fontSize={62} fill={INK}>COMPETITION</text>
        <text x={755} y={870} textAnchor="middle" fontFamily={COND} fontSize={56} fill={INK}>ALWAYS STAYS</text>
        <Hi x={620} y={905} w={270} h={100} t={t} at={T.healthy - 0.05} />
        <text x={755} y={985} textAnchor="middle" fontFamily={COND} fontSize={84} fill={RED} opacity={fadeIn(t, T.healthy - 0.05, 0.15)}>HEALTHY</text>
        <text x={755} y={1080} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={30} fill={INK} opacity={fadeIn(t, T.healthy + 0.2)}>— Madhav's take</text>
      </Slot>
    </>
  );
};

// ---------------------------------------------------------------- 11. comment prompt (Instagram-style comment card)
const Comment: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Slot t={t} s={B.comment.s} e={B.end.s}>
      <rect x={60} y={260} width={880} height={350} rx={34} fill="#ffffff" filter="url(#dsh)" />
      <text x={500} y={322} textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight={700} fontSize={34} fill="#111">Comments</text>
      <line x1={60} x2={940} y1={350} y2={350} stroke="#ddd" strokeWidth={2} />
      <circle cx={130} cy={430} r={38} fill="#d9d9d9" />
      <text x={190} y={420} fontFamily="Arial, Helvetica, sans-serif" fontWeight={700} fontSize={46} fill="#111">Would you ban it?</text>
      <text x={190} y={468} fontFamily="Arial, Helvetica, sans-serif" fontSize={32} fill="#737373">Tell me in the comments</text>
      <path d="M880,410 c-10,-18 -38,-12 -38,8 c0,18 38,38 38,38 c0,0 38,-20 38,-38 c0,-20 -28,-26 -38,-8 z" fill="none" stroke="#111" strokeWidth={4} transform="translate(-12 0)" />
      <rect x={100} y={515} width={800} height={66} rx={33} fill="none" stroke="#cfcfcf" strokeWidth={3} />
      <text x={140} y={559} fontFamily="Arial, Helvetica, sans-serif" fontSize={32} fill="#8e8e8e">Add a comment…</text>
    </Slot>
    <Slot t={t} s={B.comment.s} e={B.end.s} delay={0.1} cx={755} cy={900}>
      <g transform="translate(755 800) rotate(-3)">
        <rect x={-170} y={-60} width={340} height={120} fill={HI} filter="url(#dsh2)" />
        <text y={22} textAnchor="middle" fontFamily={COND} fontSize={60} fill={INK}>BAN IT?</text>
      </g>
      <g transform="translate(755 960) rotate(2)">
        <rect x={-170} y={-60} width={340} height={120} fill={MEMO} filter="url(#dsh2)" />
        <text y={22} textAnchor="middle" fontFamily={COND} fontSize={46} fill={INK}>LET IT COMPETE?</text>
      </g>
      <Pencil d="M755,1040 L755,1150 M720,1115 L755,1150 L790,1115" p={pS(t, T.comments - 0.1, 0.35)} w={9} />
    </Slot>
  </>
);

// ---------------------------------------------------------------- 12. END card (he stays bottom-left)
const End: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Slot t={t} s={B.end.s} e={999} rot={-0.6}>
      <path d="M50,268 L50,635 L1030,635 L1030,268 L470,268 L440,232 L80,232 L50,268 Z" fill="url(#pmanila)" filter="url(#dsh)" />
      <text x={90} y={262} fontFamily={MONO} fontWeight={700} fontSize={26} fill={INK}>CASE FILE: DEEPSEEK</text>
      <Stamp x={820} y={312} t={t} at={-9} text="CLASSIFIED" size={38} rot={6} />
      <text x={86} y={420} fontFamily={COND} fontSize={92} fill={INK}>THE US JUST <tspan fill={RED}>BANNED</tspan></text>
      <text x={86} y={515} fontFamily={COND} fontSize={92} fill={INK}>A CHINESE AI.</text>
      <text x={88} y={592} fontFamily={MONO} fontWeight={700} fontSize={44} fill={RED}>Was that fair?</text>
    </Slot>
    <Slot t={t} s={B.end.s} e={999} delay={0.08} cx={755} cy={900}>
      <ColSheet y0={680} y1={1170} />
      <Stamp x={755} y={770} t={t} at={T.outro - 0.02} text="FOLLOW" size={84} rot={-4} />
      <text x={755} y={885} textAnchor="middle" fontFamily={COND} fontSize={56} fill={INK} opacity={fadeIn(t, T.outro + 0.2, 0.2)}>FOR MORE</text>
      <Hi x={605} y={935} w={300} h={120} t={t} at={T.outro + 0.6} dur={0.25} />
      <Stamp x={755} y={995} t={t} at={T.outro + 0.55} text="AI NEWS" size={92} rot={3} />
      <Type x={755} y={1120} anchor="middle" text={HANDLE} t={t} at={T.outro + 0.3} cps={40} size={36} />
    </Slot>
  </>
);

// ================================================================ v5b additions (security / employment / war)
// A paper-cut person (no face), feet at x,y, ~70 px tall at s = 1.
const Person: React.FC<{ x: number; y: number; c?: string; s?: number; op?: number }> = ({ x, y, c = "#2c4f9e", s = 1, op = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={op}>
    <path d="M-16,0 L-16,-34 C-16,-46 16,-46 16,-34 L16,0 Z" fill={c} stroke={INK} strokeWidth={2.5} />
    <circle cx={0} cy={-56} r={12} fill="#e8c39e" stroke={INK} strokeWidth={2.5} />
  </g>
);

// ---------------------------------------------------------------- no one wants to send sensitive data outside their country
const Outside: React.FC<{ t: number }> = ({ t }) => {
  const kf = ease(sm((t - T.noOne - 0.1) / (T.outside - T.noOne - 0.1)));
  const fx = lerp(150, 430, kf);
  return (
    <Slot t={t} s={B.outside.s} e={B.enigma.s} rot={-0.4}>
      <TopSheet />
      <rect x={70} y={255} width={470} height={360} fill="#7e9bd6" opacity={0.25} />
      <text x={305} y={320} textAnchor="middle" fontFamily={COND} fontSize={50} fill={INK}>THEIR COUNTRY</text>
      <text x={800} y={320} textAnchor="middle" fontFamily={COND} fontSize={50} fill={INK} opacity={0.6}>OUTSIDE</text>
      <path d="M555,255 L555,615" stroke={RED} strokeWidth={6} strokeDasharray="22 12" />
      <text x={575} y={605} fontFamily={MONO} fontWeight={700} fontSize={24} fill={RED}>BORDER</text>
      <g transform={`translate(${fx} 470) rotate(-3)`}>
        <path d="M-80,-55 L-30,-55 L-20,-70 L80,-70 L80,55 L-80,55 Z" fill={HI} stroke={INK} strokeWidth={3} filter="url(#dsh2)" />
        <text y={-6} textAnchor="middle" fontFamily={COND} fontSize={30} fill={INK}>SENSITIVE</text>
        <text y={30} textAnchor="middle" fontFamily={COND} fontSize={30} fill={INK}>DATA</text>
      </g>
      {t > T.outside - 0.1 && (
        <g transform={`translate(555 470) scale(${pB(t, T.outside - 0.1, 0.3, 1.6)})`}>
          <path d="M-26,-20 L-26,-46 A26,26 0 0 1 26,-46 L26,-20" fill="none" stroke="#5a5f66" strokeWidth={11} />
          <rect x={-44} y={-24} width={88} height={74} rx={10} fill="url(#gbrass)" stroke={INK} strokeWidth={3} />
          <circle cy={6} r={9} fill={INK} /><rect x={-3} y={8} width={6} height={22} fill={INK} />
        </g>
      )}
      <Stamp x={800} y={480} t={t} at={T.country} text="STAYS HOME" size={56} rot={-5} />
    </Slot>
  );
};

// ---------------------------------------------------------------- employment: own car industry, cheap car arrives, jobs lost
const Jobs: React.FC<{ t: number }> = ({ t }) => {
  const dark = sm((t - T.losingFactories) / 0.35);
  const leave = sm((t - T.losingJob) / 0.9);
  const kc = ease(sm((t - T.cheap + 0.05) / 0.7));
  const shop = ease(sm((t - T.move) / 0.8));
  return (
    <>
      <Slot t={t} s={B.jobs.s} e={B.ailoss.s} rot={0.3}>
        <TopSheet />
        <Type x={86} y={292} text="YOUR OWN AUTOMOTIVE INDUSTRY" t={t} at={T.automotive - 0.2} cps={45} size={30} fill={RED} />
        <text x={840} y={292} textAnchor="middle" fontFamily={COND} fontSize={40} fill={INK}>YOUR MARKET</text>
        <rect x={50} y={590} width={980} height={45} fill="#3b3936" />
        {Array.from({ length: 8 }, (_, i) => <rect key={i} x={80 + i * 120} y={609} width={60} height={7} fill={HI} />)}
        {/* factory */}
        <g transform="translate(110 590) scale(1.7)">
          <path d="M0,0 L0,-60 L30,-40 L30,-60 L60,-40 L60,-60 L90,-40 L90,-110 L110,-110 L110,0 Z" fill={dark > 0.5 ? "#6d6f72" : "#7e9bd6"} stroke={INK} strokeWidth={1.5} />
          {[14, 50].map((x) => <rect key={x} x={x} y={-28} width={16} height={16} fill={dark > 0.5 ? "#2a2826" : HI} />)}
          {[0, 1, 2].map((i) => <circle key={i} cx={100 + i * 7} cy={-122 - i * 12} r={6 + i * 2} fill="#b8b4ac" opacity={0.8 * (1 - dark)} />)}
        </g>
        <text x={204} y={628} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={22} fill="#fff">FACTORY</text>
        {/* workers */}
        {[0, 1, 2, 3].map((i) => {
          const k = pB(t, T.employs - 0.1 + i * 0.08, 0.3, 1.5);
          if (t < T.employs - 0.1 + i * 0.08) return null;
          return <Person key={i} x={350 + i * 42 - leave * 260} y={588} s={k} c="#d08a2c" op={1 - leave} />;
        })}
        {/* local car + cheap car */}
        <CarSide x={565} y={598} wheel={0} s={0.5} c="#2c4f9e" label="LOCAL" />
        {t > T.cheap - 0.1 && <CarSide x={lerp(1150, 860, kc)} y={598} wheel={-kc * 400} s={0.5} c="#e07a6a" label="" />}
        {t > T.cheap + 0.3 && (
          <g transform="translate(933 375) rotate(4)" opacity={fadeIn(t, T.cheap + 0.3)}>
            <rect x={-95} y={-30} width={190} height={56} fill={HI} stroke={INK} strokeWidth={3} />
            <text y={14} textAnchor="middle" fontFamily={COND} fontSize={38} fill={RED}>VERY CHEAP</text>
          </g>
        )}
        {/* shoppers switch */}
        {[0, 1, 2].map((i) => <Person key={i} x={lerp(600 + i * 45, 880 + i * 45, shop)} y={520} s={0.9} c={["#2a8f8a", "#8a5ab0", "#c0282d"][i]} />)}
        <Stamp x={205} y={470} t={t} at={T.losingFactories} text="CLOSED" size={58} rot={-8} />
      </Slot>
      <Slot t={t} s={T.employs - 0.1} e={B.ailoss.s} cx={755} cy={880}>
        <ColSheet y0={680} y1={1120} />
        <text x={755} y={760} textAnchor="middle" fontFamily={COND} fontSize={52} fill={INK}>THAT EMPLOYS</text>
        <text x={755} y={825} textAnchor="middle" fontFamily={COND} fontSize={52} fill={INK}>PEOPLE</text>
        {[0, 1, 2, 3].map((i) => <Person key={i} x={665 + i * 60} y={975} s={1.3} c={leave > 0.3 ? "#9a968f" : "#d08a2c"} />)}
        <Stamp x={755} y={1050} t={t} at={T.losingJob} text="JOBS LOST" size={56} rot={-4} />
      </Slot>
    </>
  );
};

// ---------------------------------------------------------------- AI parallel: buy AI instead of making it -> three losses
const AILoss: React.FC<{ t: number }> = ({ t }) => {
  const km = pB(t, T.makeAI - 0.1, 0.3, 1.5), kb = pB(t, T.buying - 0.1, 0.3, 1.5);
  const loss = [{ l: "EMPLOYMENT", at: T.employment }, { l: "TECH FRONT", at: T.tech }, { l: "LEARNING", at: T.learning }];
  return (
    <>
      <Slot t={t} s={B.ailoss.s} e={B.war.s} rot={-0.3}>
        <TopSheet />
        <rect x={50} y={235} width={980} height={70} fill={INK} />
        <text x={540} y={284} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={38} fill={MEMO}>SAME WITH AI</text>
        {t > T.makeAI - 0.1 && (
          <g transform={`translate(290 465) rotate(-1.5) scale(${km})`}>
            <rect x={-200} y={-130} width={400} height={265} fill="url(#pmanila)" filter="url(#dsh2)" />
            <text y={-62} textAnchor="middle" fontFamily={COND} fontSize={66} fill={INK}>MAKE AI</text>
            <g transform="translate(-130 70) scale(0.9)"><path d="M0,0 L0,-60 L30,-40 L30,-60 L60,-40 L60,-60 L90,-40 L90,-110 L110,-110 L110,0 Z" fill="#7e9bd6" stroke={INK} strokeWidth={3} /></g>
            <rect x={40} y={-30} width={90} height={90} rx={8} fill={INK} /><text x={85} y={30} textAnchor="middle" fontFamily={COND} fontSize={48} fill={HI}>AI</text>
            <Type x={0} y={115} anchor="middle" text="learn by building" t={t} at={T.building - 0.1} cps={40} size={28} fill={RED} />
          </g>
        )}
        <Pencil d="M500,470 L585,470" p={pS(t, T.rather, 0.3)} w={8} />
        {pS(t, T.rather, 0.3) > 0.95 && <Pencil d={arrowHead(585, 470, 0)} p={1} w={8} />}
        {t > T.buying - 0.1 && (
          <g transform={`translate(800 465) rotate(1.5) scale(${kb})`}>
            <rect x={-200} y={-130} width={400} height={265} fill={MEMO} filter="url(#dsh2)" />
            <text y={-62} textAnchor="middle" fontFamily={COND} fontSize={66} fill={RED}>BUY AI</text>
            <rect x={-70} y={-20} width={140} height={100} fill="#c9a46a" stroke={INK} strokeWidth={3} />
            <path d="M-70,-20 L70,80 M70,-20 L-70,80" stroke="#8a6f3c" strokeWidth={2} />
            <text y={44} textAnchor="middle" fontFamily={COND} fontSize={50} fill={INK}>AI</text>
            <text y={118} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={26} fill={INK}>from someone else</text>
          </g>
        )}
      </Slot>
      <Slot t={t} s={T.employment - 0.5} e={B.war.s} cx={755} cy={900}>
        <ColSheet y0={680} y1={1130} />
        <text x={755} y={760} textAnchor="middle" fontFamily={COND} fontSize={58} fill={INK}>YOU LOSE:</text>
        <line x1={600} x2={910} y1={785} y2={785} stroke={RED} strokeWidth={3} />
        {loss.map((r, i) => (
          <g key={i} opacity={fadeIn(t, r.at - 0.1, 0.2)}>
            <rect x={600} y={830 + i * 100} width={56} height={56} fill="none" stroke={INK} strokeWidth={4} />
            <Pencil d={`M606,${836 + i * 100} L650,${880 + i * 100} M650,${836 + i * 100} L606,${880 + i * 100}`} p={pS(t, r.at + 0.05, 0.25)} w={8} />
            <text x={672} y={877 + i * 100} fontFamily={COND} fontSize={50} fill={INK}>{r.l}</text>
          </g>
        ))}
      </Slot>
    </>
  );
};

// ---------------------------------------------------------------- war (hypothetical, non-graphic): borrowed AI on the strategy table
const UNITS_B: [number, number][] = [[210, 400], [260, 500], [180, 560]];
const UNITS_R: [number, number][] = [[800, 380], [860, 470], [780, 550]];
const WarMap: React.FC<{ t: number; dead?: boolean }> = ({ t, dead }) => (
  <>
    <rect x={50} y={235} width={980} height={400} fill="url(#pmanila)" filter="url(#dsh)" />
    <rect x={70} y={255} width={940} height={360} fill="#8fa874" />
    {Array.from({ length: 9 }, (_, i) => <line key={i} x1={70 + i * 117} x2={70 + i * 117} y1={255} y2={615} stroke="#5f7a4a" strokeWidth={1.5} opacity={0.5} />)}
    {Array.from({ length: 4 }, (_, i) => <line key={`h${i}`} x1={70} x2={1010} y1={255 + i * 120} y2={255 + i * 120} stroke="#5f7a4a" strokeWidth={1.5} opacity={0.5} />)}
    <path d="M120,615 C260,520 300,380 470,330 C600,295 700,300 760,255" fill="none" stroke="#6d9bc9" strokeWidth={16} opacity={0.8} />
    <path d="M540,255 L540,615" stroke={INK} strokeWidth={4} strokeDasharray="14 10" opacity={0.6} />
    {UNITS_B.map(([x, y], i) => <g key={i}><rect x={x - 28} y={y - 18} width={56} height={36} fill="#2c4f9e" stroke={INK} strokeWidth={2.5} />{dead && <text x={x + 34} y={y + 10} fontFamily={COND} fontSize={34} fill={INK}>?</text>}</g>)}
    {UNITS_R.map(([x, y], i) => <rect key={i} x={x - 28} y={y - 18} width={56} height={36} fill={RED} stroke={INK} strokeWidth={2.5} />)}
    {!dead && <>
      <Pencil d="M245,400 C330,360 400,360 470,390" p={pS(t, T.strategize, 0.5)} stroke="#1d3f8f" w={7} />
      <Pencil d="M295,500 C360,520 420,520 470,500" p={pS(t, T.strategize + 0.4, 0.5)} stroke="#1d3f8f" w={7} />
    </>}
    {dead && <rect x={70} y={255} width={940} height={360} fill="#3a3836" opacity={0.45} />}
    <text x={90} y={600} fontFamily={MONO} fontWeight={700} fontSize={26} fill={INK} opacity={dead ? 0.7 : fadeIn(t, T.battlefield)}>BATTLEFIELD</text>
  </>
);
const War: React.FC<{ t: number }> = ({ t }) => (
  <Slot t={t} s={B.war.s} e={B.plug.s} rot={0.3}>
    <WarMap t={t} />
    <Stamp x={540} y={320} t={t} at={T.ifWar} text="IF THERE IS A WAR" size={46} rot={-4} />
  </Slot>
);
const Plug: React.FC<{ t: number }> = ({ t }) => {
  const grab = sm((t - T.otherPerson - 0.2) / 0.5), pull = sm((t - T.notGonna) / 0.35);
  const px = 320 + pull * 70, py = 540 - pull * 90;
  return (
    <Slot t={t} s={B.plug.s} e={B.stuck.s} rot={-0.3}>
      <TopSheet />
      {/* their AI server */}
      <rect x={90} y={300} width={190} height={300} rx={8} fill="#3a3d43" stroke={INK} strokeWidth={4} />
      {[0, 1, 2, 3].map((i) => <g key={i}><rect x={108} y={320 + i * 62} width={154} height={46} fill="#24262a" /><circle cx={240} cy={343 + i * 62} r={6} fill={t > T.notGonna + 0.2 ? "#555" : "#58d36b"} /></g>)}
      <text x={185} y={290} textAnchor="middle" fontFamily={COND} fontSize={36} fill={INK}>THEIR AI</text>
      <rect x={280} y={525} width={18} height={30} fill="#111" />
      {/* cable to your terminal (column) */}
      <path d={`M${px + 30},${py + 15} C${px + 200},${py + 30} 700,600 1010,600`} fill="none" stroke="#111" strokeWidth={8} />
      <rect x={px} y={py} width={34} height={30} rx={4} fill="#2b2b2b" />
      {/* their hand pulls the plug */}
      <g transform={`translate(${px + 18} ${lerp(180, py - 6, grab)})`} opacity={grab > 0 ? 1 : 0}>
        <rect x={-22} y={-150} width={44} height={110} fill="#2a2d33" />
        <path d="M-30,-44 C-34,-10 -20,8 0,10 C20,8 34,-10 30,-44 Z" fill="#e8c39e" stroke={INK} strokeWidth={3} />
      </g>
      {t > T.notGonna - 0.12 && (
        <g opacity={sm((t - T.notGonna + 0.12) / 0.2)}>
          <g filter="url(#dsh2)"><path d="M470,380 L440,330 L470,345 Z" fill="#fff" /><rect x={460} y={255} width={550} height={300} rx={36} fill="#fff" /></g>
          <text x={490} y={335} fontFamily={COND} fontSize={64} fill={INK}>"I'm not gonna</text>
          <text x={490} y={410} fontFamily={COND} fontSize={64} fill={RED}>give it to you."</text>
          <Type x={490} y={470} text="You're using it to" t={t} at={T.attack} cps={30} size={30} />
          <Type x={490} y={512} text="attack my ally." t={t} at={T.attack + 0.6} cps={30} size={30} />
        </g>
      )}
    </Slot>
  );
};
const Stuck: React.FC<{ t: number }> = ({ t }) => (
  <Slot t={t} s={B.stuck.s} e={B.natsec.s} rot={0.3}>
    <WarMap t={t} dead />
    <Stamp x={540} y={420} t={t} at={T.stuck} text="STUCK" size={110} rot={-6} />
    {t > T.cantHave - 0.1 && (
      <g opacity={fadeIn(t, T.cantHave - 0.1, 0.2)}>
        <rect x={250} y={520} width={580} height={70} fill={INK} />
        <text x={540} y={568} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={36} fill={MEMO}>You can't have that.</text>
      </g>
    )}
  </Slot>
);
// the borrowed AI terminal (right column) from the war to the verdict: on -> ACCESS DENIED -> broken hardware
const Terminal: React.FC<{ t: number }> = ({ t }) => {
  const off = t > T.notGonna + 0.2, crack = pS(t, T.broken - 0.05, 0.25);
  return (
    <Slot t={t} s={B.war.s} e={B.verdict.s} delay={0.1} cx={755} cy={900}>
      <ColSheet y0={670} y1={1150} />
      <text x={755} y={730} textAnchor="middle" fontFamily={COND} fontSize={48} fill={INK}>YOUR STRATEGY AI</text>
      <rect x={605} y={755} width={300} height={210} rx={10} fill="#2a2d33" stroke={INK} strokeWidth={4} />
      <rect x={620} y={770} width={270} height={180} fill={off ? "#0d0d0e" : "#123a2a"} />
      {!off && <>
        <Type x={640} y={815} text="> AI READY" t={t} at={B.war.s + 0.3} cps={30} size={28} fill="#58d36b" />
        {t > T.strategize && <Type x={640} y={860} text="> PLANNING..." t={t} at={T.strategize} cps={30} size={28} fill="#58d36b" />}
        <Pencil d="M650,915 C700,885 760,885 810,905" p={pS(t, T.strategize + 0.6, 0.6)} stroke="#58d36b" w={5} />
      </>}
      {off && <>
        <text x={755} y={850} textAnchor="middle" fontFamily={COND} fontSize={50} fill={RED}>ACCESS</text>
        <text x={755} y={905} textAnchor="middle" fontFamily={COND} fontSize={50} fill={RED}>DENIED</text>
      </>}
      <Pencil d="M700,775 L740,835 L715,880 L770,945 M740,835 L800,820 L860,860" p={crack} stroke="#e8e2d4" w={4} />
      <rect x={735} y={965} width={40} height={30} fill="#2a2d33" />
      <rect x={685} y={993} width={140} height={14} rx={6} fill="#2a2d33" />
      <g opacity={fadeIn(t, T.someoneAI - 0.1)} transform="translate(755 1045) rotate(-2)">
        <rect x={-165} y={-32} width={330} height={60} fill={HI} />
        <text y={12} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={26} fill={INK}>{off ? "cut off by its owner" : "someone else's AI"}</text>
      </g>
      <Stamp x={755} y={1112} t={t} at={T.broken} text="BROKEN HARDWARE" size={36} rot={-3} />
    </Slot>
  );
};
// reprise: national security AND a power struggle
const NatSec: React.FC<{ t: number }> = ({ t }) => (
  <Slot t={t} s={B.natsec.s} e={B.verdict.s} rot={-0.4}>
    <TopSheet />
    <rect x={50} y={235} width={980} height={70} fill={INK} />
    <text x={540} y={284} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={38} fill={MEMO}>SO IT BECOMES</text>
    {[{ x: 270, l: ["NATIONAL", "SECURITY"], at: T.national }, { x: 810, l: ["POWER", "STRUGGLE"], at: T.power3 }].map((c, i) => (
      <g key={i} transform={`translate(${c.x} 470) rotate(${i ? 1.5 : -1.5})`}>
        <rect x={-170} y={-110} width={340} height={220} fill="url(#pmanila)" filter="url(#dsh2)" />
        <text y={-12} textAnchor="middle" fontFamily={COND} fontSize={66} fill={INK}>{c.l[0]}</text>
        <text y={64} textAnchor="middle" fontFamily={COND} fontSize={66} fill={INK}>{c.l[1]}</text>
        <Tick x={135} y={-80} t={t} at={c.at} />
      </g>
    ))}
    <g transform="translate(540 480) rotate(-4)">
      <rect x={-85} y={-44} width={170} height={84} fill={HI} filter="url(#dsh2)" />
      <text y={28} textAnchor="middle" fontFamily={COND} fontSize={70} fill={RED}>AND</text>
    </g>
  </Slot>
);

export const Scenes: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Hook t={t} /><News t={t} /><Data t={t} /><Enigma t={t} /><Restrict t={t} /><QThreat t={t} />
    <Take t={t} /><Cars t={t} /><Outside t={t} /><Jobs t={t} /><AILoss t={t} /><War t={t} /><Plug t={t} /><Stuck t={t} /><Terminal t={t} /><NatSec t={t} /><Verdict t={t} /><Healthy t={t} /><Comment t={t} /><End t={t} />
    <ATag t={t} at={T.october - 0.05} /><ATag t={t} at={T.honest - 0.05} />
  </>
);
