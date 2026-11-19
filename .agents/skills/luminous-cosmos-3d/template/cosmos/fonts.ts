import { useEffect, useState } from "react";
import { delayRender } from "remotion";
import { loadFont } from "@remotion/google-fonts/InterTight";
import { settle } from "../kit/three-canvas";

const f = loadFont("normal", { weights: ["600", "800"], subsets: ["latin", "latin-ext", "greek"] });
export const SANS = f.fontFamily;
// for canvas text: Inter Tight first, then fonts that carry maths symbols (∇ ∂ → −)
export const CFONT = (weight: number, px: number) => `${weight} ${px}px "${SANS}", "Segoe UI Symbol", "Cambria Math", "Segoe UI", sans-serif`;

let ready = false;
const done = f.waitUntilDone().then(() => document.fonts.ready).then(() => { ready = true; });

// true once Inter Tight is usable in canvas textures; holds the frame until then
export const useFontsReady = () => {
  const [r, setR] = useState(ready);
  useEffect(() => {
    if (r) return;
    const h = delayRender("cosmos: fonts for canvas textures");
    done.then(() => { setR(true); settle(h); });
  }, [r]);
  return r;
};
