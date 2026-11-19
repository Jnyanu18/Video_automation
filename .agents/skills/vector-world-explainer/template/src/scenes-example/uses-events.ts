// Sound events for this act (pure module: no React). The scene draws from the same constants.
import { ACTS, B, ev, type SoundEvent } from "../beats";

// Uses (81.34-85.94): pull back out of the study window to the desk; the Photogram phone shrugs on
// "Instagram"; its pixels lift off and snap into a drug molecule on "designing ... medicine"; a gold
// padlock pops up and cracks on "cracking codes"; the camera pulls back as the molecule and the
// padlock glide to their places in the problems gallery (problems carries the same motion on).
export const USES = {
  start: ACTS.uses[0], // framed on the window (matched from the space dive), pulls back to the desk
  pulled: ACTS.uses[0] + 0.53,
  scroll: B.instagram - 0.2, // a thumb-flick scroll on the feed
  squash: B.instagram + 0.13, // anticipation: the phone squashes down
  shrug: B.instagram + 0.3, // shrug up with overshoot, little hands up, head tilt; spinner
  settle: B.instagram + 0.78, // drops back and settles
  droop: B.built + 0.1, // the phone droops, still loading
  dissolve: B.designing, // its pixels lift off ...
  molecule: B.medicines, // ... and snap into a drug molecule
  aside: B.codes - 0.13, // the molecule glides up-left toward its gallery place
  padlock: B.codes - 0.07, // a gold padlock pops up
  crack: B.codes + 0.24, // glowing cracks run across it, the shackle strains
  gather: B.codes + 0.36, // camera pulls back; the padlock glides to its gallery place
  end: ACTS.uses[1],
};

export const EVENTS: SoundEvent[] = [
  ev("pull-out-window", USES.start, "camera pulls back out of the window down to the desk", 0, USES.pulled - USES.start),
  ev("scroll", USES.scroll, "the feed scrolls on the phone", -0.1),
  ev("phone-squash", USES.squash, "the phone squashes down (anticipation)", 0),
  ev("phone-shrug", USES.shrug, "the phone shrugs: hands up, head tilt, a spinner that goes nowhere", 0),
  ev("phone-settle", USES.settle, "the phone drops back and settles, hands follow through", 0),
  ev("phone-droop", USES.droop, "the phone droops, still loading", 0),
  ev("pixels", USES.dissolve, "the phone breaks into pixels that fly up", 0, USES.molecule - USES.dissolve),
  ev("molecule", USES.molecule, "the pixels snap into a drug molecule", 0),
  ev("molecule-aside", USES.aside, "the molecule glides up and away to the upper left", -0.5, 1.1),
  ev("padlock-up", USES.padlock, "a gold padlock pops up on the table", 0.2),
  ev("padlock-crack", USES.crack, "glowing cracks run across the padlock, the shackle strains", 0.2),
  ev("gather", USES.gather, "camera pulls back; the padlock slides right to its gallery place", 0.4, 0.7),
];
