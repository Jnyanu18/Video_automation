// Swap times and other world event times (shared by the scene, labels and sound events).
import { T } from "./timing";

// v5 supply chain: the squad streams out of the plaza on "everywhere"; on "put a humanoid robot on it" the five
// supply-chain tiles (mine -> factory -> warehouse -> road -> delivery) flip to robots one after another.
const P0 = T.putRobot + 0.1;
export const SW = {
  coal: P0,
  f1: P0 + 0.15,
  f2: P0 + 0.25,
  f3: P0 + 0.35,
  allRobot: P0 + 0.45,
  ware: P0 + 0.6,
  car: P0 + 0.8,
  food: P0 + 1.0,
};
export const CHAIN = [SW.coal, SW.allRobot, SW.ware, SW.car, SW.food];
// squad on the plaza from "humanoid robot"; streams out on "everywhere"
export const SQUAD = { in: T.supply - 0.05, stream: T.everywhere, gone: T.everywhere + 2.0 };
export const NIGHT = { on: T.runs, off: T.askDecide + 0.8 }; // "runs 24/7": the island goes to night with lit windows
// scale (human vs robot): rises on the decide question, tips toward the robot on "repetitive"
export const SCALE = { rise: T.askDecide + 0.9, human: T.askDecide + 1.1, robot: T.askDecide + 1.3, tip: T.repetitive + 0.1 };
// conveyor runs (the repeating pattern) from "pattern" for ~2.4 s, then stops
export const BELT = { a: T.pattern - 0.1, b: T.pattern + 2.3 };
export const GLOW = T.artistic + 0.3; // human tiles glow warm
export const SUNSET = T.outro - 0.6;
