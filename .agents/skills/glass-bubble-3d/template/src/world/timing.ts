// Every action time in the bubble film (v5 spine: his own re-recorded take, he reads the questions out),
// from the spoken words. Pure module.
import { cue, cueEnd, FPS, OUTRO, TOTAL, WORDS } from "../lib";

// start time of the LAST word of a phrase (e.g. the "AI" in "is AI"), independent of pace
const lastStart = (p: string, n?: number) => { const i = WORDS.findIndex((w) => w.s === cue(p, n)); return WORDS[i + p.split(" ").length - 1].s; };

export const T = {
  // hook: "I barely write code anymore. And here is what I do instead."
  q1: cue("is the AI boom"),                 // Q: Is the AI boom the future, or a bubble about to pop?
  future: cue("future"),
  bubble1: cue("bubble", 0),
  pop: cue("pop"),
  bigTech: cue("big tech"),                  // A: Big tech is pouring billions into it
  pouring: cue("pouring"),
  billions: cue("billions"),
  think: cue("think about it", 0),
  aiNow: cue("AI now"),
  touches: cue("touches", 0),
  everything: cue("everything", 0),
  robotics: cue("robotics"),
  medical: cue("medical"),
  transport: cue("transportation"),
  drug: cue("drug discovery"),
  everything2: cue("everything", 1),
  q2: cue("what's actually changed"),        // Q: What's actually changed in your job?
  q2End: cueEnd("job"),
  changed: cue("changed"),
  job: cue("job"),
  working: cue("I'm working"),
  microsoft: cue("microsoft"),
  evolved: cue("evolved"),
  dontCode: cue("I don't code", 0),
  night: cue("every single night"),
  butNow: cue("but now"),
  nowIf: cue("now if I think"),
  orchestrate: cue("orchestrate"),
  guide: cue("guide"),
  design: cue("design"),
  verify: cue("verify"),
  babysit: cue("babysit"),
  output: cue("output"),
  plain: cue("in plain words"),
  manage: cue("manage AI agents"),
  writing: cue("writing"),
  // the old pipeline
  usedTo: cue("we used to write code"),
  writeCode: cue("write code", 1),
  raisePR: cue("raise a PR"),
  approve: cue("approve"),
  reviewing: cue("reviewing"),
  qa1: cue("QA", 0),
  deploy1: cue("deploy"),
  // ...and now, every stage is AI (Madhav's experience)
  myQA: cue("so my QA"),
  aiQA: lastStart("is AI", 0) + 0.04,     // stamps land on the word "AI"
  aiReview: lastStart("is AI", 1) + 0.04,
  aiBuild: lastStart("is AI", 2) + 0.04,
  aiApprove: lastStart("is AI", 3) + 0.04,
  aiDeploy: lastStart("is AI", 4) + 0.04,
  stay: cue("and I think it's gonna"),
  stayW: cue("stay"),
  bubbleOrNot: cue("bubble or not"),
  comment: cue("comment your take"),
  follow: OUTRO.t,
};
export const END_T = TOTAL / FPS;
export const FREEZE = END_T - 0.45; // everything holds still after this (static last frames)
export const tw = (t: number) => Math.min(t, FREEZE);

// v6 layout (Madhav 2026-10-24): he is a big cut-out bottom-left (head box = SIDE_FACE, ~x 0-680, y 770-1390). Main
// graphics live in the top band (y 280-760, x 40-940; the series tag sits at y ~232-276), secondary ones in the right column
// (x 700-950, y 770-1290); captions under it (x 692-950, y 1300+). Screen points for 3D placements:
export const HOOK_BUBBLE: [number, number] = [830, 1010];
export const MONEY_BUBBLE: [number, number] = [540, 600];
export const TOUCH_BUBBLE: [number, number] = [610, 520];
export const LAPTOP_XY: [number, number] = [880, 430];
export const CORE_XY: [number, number] = [720, 490];
export const PIPE_BUBBLE: [number, number] = [830, 1010];
