// Sound events for the Paper Lab film (output seconds). Built from the same cue constants the scenes
// draw with. x = stereo hint from the object's screen position (-1 left .. 1 right).
// Kept off key spoken words where possible: most hits sit on the word onset the picture lands on,
// so the mix should keep them short and under the voice.
import { OUTRO, type SoundEvent } from "../lib";
import { B, HAND, T, HOOK_WORDS } from "./T";

const px = (x: number) => +((x - 540) / 540).toFixed(2);
const r = (t: number) => +t.toFixed(2);
const e = (id: string, t: number, what: string, x?: number, dur?: number): SoundEvent => ({ id, t: r(t), what, ...(x !== undefined ? { x } : {}), ...(dur ? { dur } : {}) });

export const EVENTS: SoundEvent[] = [
  // hook
  ...HOOK_WORDS.slice(0, 6).map((w, i) => e(`hook-word-${i}`, Math.max(0, w.s - 0.04), "torn paper word slaps down (light paper flap)")),
  e("hook-compression", HOOK_WORDS[6].s - 0.04, "big torn-paper word lands hard, letters squash together (paper thump + crumple)", 0, 0.45),
  e("think-crumple", T.think - 0.05, "scraps crumple into a paper cloud top-right", px(860), 0.5),
  // internet
  e("tile-polaroid", HAND.inStart, "footage becomes a polaroid and flies to the board (whoosh)", 0, 0.65),
  e("polaroid-pin", HAND.inTile, "polaroid lands on the corkboard (pin press)", 0),
  e("pullback", HAND.inTile + 0.05, "camera pulls back across a vast corkboard (long airy whoosh)", 0, 1.1),
  e("pins-drop", T.online - 0.1, "dozens of clippings pinned around the board (scattered pin taps)", 0, 1.4),
  e("gauge-in", T.raw - 0.2, "yellow tape ruler slaps onto the top of the board", 0),
  e("threads", T.spread, "red string stretched between pins across the board", 0.3, 1.4),
  e("gauge-circle-internet", T.internet, "red marker circles 'internet: zettabytes'", px(238), 0.4),
  // slice
  e("knife-cut", T.used + 0.25, "craft knife slices along a steel ruler (paper cut)", -0.6, 1.0),
  e("strip-lift", T.compressed - 0.5, "the cut strip lifts off the board (paper peel)", 0, 0.3),
  e("tag-filtered", T.compressed - 0.35, "typed tag drops in: 'Real training sets: a filtered slice'", 0),
  e("strip-up", T.compressed, "strip slides up the board", 0, 0.55),
  e("tag-tokens", T.llm - 0.5, "typed tag drops in: '~15T tokens of text (Llama 3)'", 0.1),
  e("gauge-training", T.llm + 0.15, "marker circle slides to 'training ~60 TB'", 0),
  // network / rules
  e("board-drop", B.network.s - 0.3, "corkboard falls away to the cream lab board (big paper swoosh)", 0, 0.6),
  e("pencil-net", B.network.s + 0.1, "pencil draws the neural network on graph paper (scribble)", 0, 0.9),
  e("strip-unravel", B.network.s + 0.25, "the strip tears into scraps that flutter into a cloud", 0.5, 3.4),
  ...[T.trained + 0.05, T.neural + 0.15, T.pattern, T.recognize].map((t, i) => e(`node-fill-${i}`, t, `marker fills network layer ${i + 1} red (marker dab)`, px(250 + i * 193))),
  e("card-in", T.figure - 0.1, "index card slides in from the right", 0.5),
  e("collapse", B.rules.s + 0.1, "scraps stream through the network onto one curve (rushing paper)", 0, 2.6),
  e("one-pattern", T.rules, "'one pattern' handwritten on the card (pen)", 0.2, 0.5),
  e("arrow-express", T.express - 0.1, "red marker arrow from network to card", 0.7, 0.35),
  // sizes
  e("lab-out", B.sizes.s - 0.3, "lab pulled off the board", 0, 0.7),
  e("stack-drop", T.so + 0.05, "tall paper stack drops onto the board (heavy paper thud)", px(330)),
  e("tag-training", T.zetta2, "tag 'training text ~60 TB' swings onto the stack", px(350)),
  ...[0, 1, 2, 3].map((i) => e(`fold-${i}`, T.was + ((T.two - T.was) * i) / 4, "origami fold, the stack shrinks a step (crisp paper fold)", px(330 + i * 100))),
  e("cube-land", T.two, "gold origami cube lands (small bright tick + chime)", px(740)),
  e("gauge-weights", T.tb + 0.15, "marker circle slides to 'weights ~0.8 TB'", 0.6),
  e("tag-llama", T.tb + 0.5, "typed tag 'Llama 3.1 405B · 16-bit · illustrative'", 0),
  e("tile-emerge", HAND.outStart, "footage polaroid grows out of the cube (reverse whoosh)", px(740), 1.6),
  // beautiful / maybe
  e("cube-float", HAND.outFull - 0.1, "cube floats up beside him", 0.6, 0.7),
  e("cube-sparkle", T.came, "cube sparkles", 0.6),
  e("note-hypothesis", T.maybe - 0.1, "sticky note slapped on: 'a hypothesis'", px(380)),
  e("question-marks", T.questions1 - 0.1, "two red marker question marks", 0.2, 0.5),
  // books
  e("books-pile", B.books.s, "pile of books drops onto the board", 0),
  e("books-fan", T.ten - 0.1, "ten books fan out (book thumps in a ripple)", 0, 0.7),
  e("open-book", T.page - 0.15, "open book slides in", -0.4),
  e("page-flips", T.turn - 0.05, "pages flip in stop-motion (page turns)", -0.4, 1.4),
  e("copier", T.turning + 0.05, "photocopier slides in and starts copying (machine whirr)", 0.6, 1.2),
  e("copier-x", T.mug - 0.05, "red marker X across the photocopier; machine stops", 0.6, 0.5),
  e("threads-lift", T.build1 - 0.2, "red threads lift off the pages", 0, 0.9),
  e("knot", T.patterns - 0.15, "threads knot into a pattern", 0.5, 0.7),
  // algebra
  e("page-turn", B.algebra.s - 0.3, "a notebook page turns over the frame (page swish)", 0, 0.65),
  ...[["x", T.x1], ["y", T.plusY], ["z", T.z1 - 0.1]].map(([s, t]) => e(`write-${s}`, t as number, `'${s}' inked on the page (marker)`)),
  e("circle-x", T.xg - 0.05, "red circle around x", px(190)),
  e("circle-z", T.zg - 0.05, "red circle around z", px(890)),
  e("y-question", T.find, "'y = ?' written", 0, 0.6),
  // practice
  ...[T.doIt + 0.3, T.findIt, T.practiced].map((t, i) => e(`card-${i}`, t, "practice card slaps onto the pile", 0.3)),
  e("card-flurry", T.readMuch, "a flurry of practice cards", 0.3, 1.4),
  e("pile-out", T.equation - 0.2, "pile swept off; equation card drops in", 0.6, 0.5),
  e("move-y", T.moveY, "y hops over to the left (paper slide)", -0.6, 0.7),
  e("move-z", T.zLeft - 0.05, "z, = and x slide into y = z − x", 0, 0.8),
  e("stamp-works", T.works + 0.2, "rubber stamp WORKS (stamp thunk)", px(800)),
  // nn
  e("peel", T.howBeautiful - 0.05, "symbols peel off the card and become nodes", 0, 0.7),
  e("threads-nn", T.recog - 0.1, "threads stretched between nodes", 0, 0.9),
  e("nodes-pop", T.thatsHow - 0.1, "more paper nodes pop in", 0, 0.6),
  e("nn-fire", T.nnWorks, "signal ripples through the network", 0, 0.8),
  e("collapse-cube", B.recall.s - 0.15, "network collapses into the gold cube; notebook page pulled away", 0.3, 0.6),
  // recall
  ...[T.gandhi, T.distance, T.capital].map((t, i) => e(`q-${i}`, t - 0.1, "question card slides in", -0.5)),
  ...[T.there1, T.there2, T.there3].map((t, i) => e(`a-${i}`, t - 0.05, "answer card pops out of the cube", 0.45)),
  e("cube-pulse-2tb", T.twoTB, "cube pulses", 0.3),
  e("cube-think", T.china, "cube rattles, thinking", 0.3, 1.5),
  e("lossy-card", T.everything - 0.05, "smudged card comes out", 0.3),
  e("lossy-stamp", T.everything + 0.5, "stamp: LOSSY: models can misremember", 0.3),
  // amazing / question
  e("cube-pop-amazing", T.amazing - 0.15, "cube pops in beside him", 0.6),
  e("cube-sparkle-pops", T.pops - 0.05, "cube sparkle burst", 0.6, 0.7),
  e("qmark", T.question - 0.1, "cut-paper question mark lands in the top band", 0),
  // cosmos
  e("tile-cosmos", HAND.cosStart, "footage polaroid flies into the paper cosmos (whoosh into space)", 0, 1.7),
  e("grail-rays", T.holy, "gold paper rays burst from the cube (warm shimmer)", 0, 0.8),
  e("stamp-open", T.agi1 - 0.05, "stamp: Open question - not proven", 0),
  e("push-in", T.something, "camera pushes toward the tiny cube", 0, 2.2),
  ...[[T.everyRule, "F = ma"], [T.regulation, "Maxwell's equations"], [T.everyInfo, "E = mc²"], [T.universe - 1.0, "DNA strip"]].map(([t, s], i) =>
    e(`law-${i}`, (t as number) - 0.05, `law card slides in: ${s}; then spirals into the cube`, i % 2 ? 0.5 : -0.5, 2.3)),
  e("find-flash", T.needFind - 0.1, "cube flares (soft shimmer)", 0, 1.3),
  e("tear", B.path.s - 0.3, "navy cosmos paper torn off the board (long paper rip)", 0, 0.75),
  // path
  e("pencil-path", T.path - 0.15, "pencil draws a dotted path from him to the cube", 0, 1.3),
  e("ring-cube", T.thinkAbout, "red marker ring around the cube", 0.4),
  e("robot-in", T.ai - 0.2, "paper robot arm swings in from the right (cardboard creak)", 0.9, 0.5),
  ...[0, 1, 2, 3].map((i) => e(`robot-fold-${i}`, T.build2 - 0.25 + i * 1.15 + 0.85, "robot hand folds a scrap into the cube (paper fold + tick)", 0.45)),
  e("reality-stars", T.reality2, "paper stars pop around the glowing cube", 0.4, 0.5),
  // agi / cta
  e("cube-agi", B.agi.s + 0.05, "cube pops by his shoulder", 0.55),
  e("tag-open", T.agi2 - 0.1, "tag 'open question' swings in", 0.55),
  e("tape-cta1", T.random - 0.2, "masking tape torn and stuck across the top", 0, 0.45),
  e("underline-cta1", T.curiosity, "red underline", 0, 0.4),
  e("follow-sticker", T.follow - 0.1, "sticker slaps on: Follow @madhav_somani", 0),
  e("science-clips", T.beauty - 0.2, "science clippings slide in", 0.3, 0.7),
  e("paper-dolls", T.people - 0.1, "paper-doll chain unfolds", 0.4, 0.9),
  ...[0, 1, 2, 3].map((i) => e(`stem-pin-${i}`, T.stem - 0.15 + i * 0.08, ["flask", "chip", "gear", "pi"][i] + " icon pinned", px(190 + i * 230))),
  e("sticker-scientists", T.scientists + 0.4, "sticker '+ scientists'", px(300)),
  e("sticker-engineers", T.engineers - 0.05, "sticker '+ engineers'", px(760)),
  e("qmark-cta3", T.questions2 - 0.1, "question mark sticker", px(880)),
  e("excited-sparkles", T.excited - 0.05, "little sparkles", px(880), 0.4),
  // end
  e("tile-end", HAND.endStart, "footage polaroid flies into the gold cube (whoosh)", 0, 1.2),
  e("cube-gulp", B.end.s + 0.85, "cube swallows the polaroid (soft gulp)", 0),
  e("unfold", B.end.s + 1.0, "cube unfolds into a flat net (paper folds opening)", 0, 0.3),
  e("end-card", B.end.s + 1.25, "net becomes the end card (paper settle), held to the end", 0, 0.4),
  e("follow-underline", OUTRO.t + 0.05, "red marker underlines Follow (pencil scribble)", -0.2, 0.45),
  e("handle-pop", OUTRO.t + 1.0, "@madhav_somani tape pops (tape stick)", 0),
];
