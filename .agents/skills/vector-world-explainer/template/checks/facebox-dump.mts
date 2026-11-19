// Per-frame face box on screen (1080x1920 comp px), exactly as kit/avatar.tsx places him. Used by presenter/faceqa.py.
import { faceBox, winAt } from "../src/kit/avatar";
import { TOTAL } from "../src/beats";
const o: Record<number, number[]> = {};
for (let fr = 0; fr < TOTAL; fr++) { const b = faceBox(fr); if (b && winAt(fr)) o[fr] = [b.x, b.y, b.w, b.h]; }
console.log(JSON.stringify(o));
