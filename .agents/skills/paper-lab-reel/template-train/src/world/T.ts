// v8 cues (cut lines removed); v5 header: v5 cues (output seconds) from the v5 spine: every word is his. No kit imports (events.ts uses it).
import { OUTRO, TOTAL, FPS, cue, cueEnd } from "../lib";
import { B } from "../beats";
export { B };

export const T = {
  // q1 (hook question)
  writes: cue("writes"), code: cue("the code,"), learn: cue("learn computer"), q1End: cueEnd("learn computer science?"),
  // still
  csStill: cue("CS degrees are still"), important: cue("important."), know: cue("know how the product"),
  product: cue("product"), software: cue("software"),
  // hill train + engine spec
  imagine: cue("Imagine"), hill1: cue("make a hill"), needs: cue("It needs engines"), heavy: cue("heavy,"), throttle: cue("throttle,"), torque: cue("torque,"),
  // Himalayan plateau gag
  ask: cue("ask AI"), bulletH: cue("bullet train on Himalayan"), himalayan: cue("Himalayan"), cant: cue("I can't.", 1),
  would: cue("would customer"), buy: cue("buy it?"), dont: cue("I don't think so."),
  // q2
  so2: cue("So what does"), q2End: cueEnd("actually give you?"),
  // track + trains + choose
  well: cue("Well AI knows"), track: cue("track,"), question1: cue("question still lies"),
  knowsTrain: cue("It knows how to build a train."), doesnt: cue("doesn't know"), whatYouWant: cue("what you want", 0),
  // want + cs
  youCan: cue("You can only"), understanding: cue("understanding"), theCS: cue("the CS,"), csPart: cue("The computer science part"),
  architecture: cue("architecture,"), system: cue("system design,"),
  // answer
  these: cue("These questions"), answered: cue("answered"), pursue: cue("pursue"),
  // comment prompt
  pick: cue("Would you still pick"), tell: cue("Tell me in"), comments: cue("comments."),
  outro: OUTRO.t, end: TOTAL / FPS,
};
