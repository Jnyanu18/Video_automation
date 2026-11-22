import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";

// The brand tokens from brand/BRAND.md. Change them there first, then here.
export const C = {
  ink: "#14151a",
  paper: "#ffffff",
  parchment: "#f8f9fb",
  gold: "#ffc400",
  goldDeep: "#a97a00",
  goldWash: "#fff6d9",
  graphite: "#5c6472",
  rule: "#e6e8ec",
  done: "#2f7a43",
};

export const F = {
  display: loadFraunces("normal", { weights: ["600"], subsets: ["latin"] }).fontFamily,
  body: loadDMSans("normal", { weights: ["400", "600"], subsets: ["latin"] }).fontFamily,
  mono: loadPlexMono("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily,
};

export const FPS = 30;

export type Word = { w: string; start: number; end: number };
export type Cue = { id: string; start: number; end: number; words: string; desc: string; chapter?: string };
