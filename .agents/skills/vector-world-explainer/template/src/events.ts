// The director's event list: every act's visible events, in film order. Bundled by dump-events.mts.
import { ACTS, B, ev } from "./beats";
import { WINS } from "./avatar-config";
import { EVENTS as hook } from "./scenes-example/hook-events";
import { EVENTS as bits } from "./scenes-example/bits-events";
import { EVENTS as qubit } from "./scenes-example/qubit-events";
import { EVENTS as myth } from "./scenes-example/myth-events";
import { EVENTS as interference } from "./scenes-example/interference-events";
import { EVENTS as pool } from "./scenes-example/pool-events";
import { EVENTS as scale } from "./scenes-example/scale-events";
import { EVENTS as uses } from "./scenes-example/uses-events";
import { EVENTS as problems } from "./scenes-example/problems-events";
import { EVENTS as ending } from "./scenes-example/ending-events";
import { EVENTS as aiwave } from "./scenes-example/aiwave-events";
import { EVENTS as cta } from "./scenes-example/cta-events";
// v6 presenter windows (his real cut-out): a quick swish as he pops in and as he leaves (window 1 is on the cover already)
const avatar = WINS.flatMap((w, i) => [...(w.from === "none" ? [] : [ev("avatar-in", w.film[0], `Madhav pops in (window ${i + 1})`, 0.6, 0.2)]), ev("avatar-out", w.film[1] - 0.2, `Madhav leaves (window ${i + 1})`, 0.7, 0.2)]);
export const EVENTS = [...avatar, ...hook, ...bits, ...qubit, ...myth, ...interference, ...pool, ...scale, ...uses, ...problems, ...ending, ...aiwave, ...cta].sort((a, b) => a.fr - b.fr);
export { ACTS, WINS, B };
