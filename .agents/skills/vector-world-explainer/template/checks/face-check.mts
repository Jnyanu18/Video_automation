// Face-bounds check of the presenter staging (run by presenter/rebuild.sh). For every frame where he
// is fully in, his face box must stay inside the safe area: right edge <= 1075, hair top >= 230
// (Instagram top bar), face bottom <= 1700. Prints offending windows with sample times; silent = clean.
import { faceBox, winAt } from "../src/kit/avatar";
import { TOTAL } from "../src/beats";
const bad: Record<string, string[]> = {};
for (let fr = 0; fr < TOTAL; fr++) {
  const r = winAt(fr); const b = faceBox(fr);
  if (!r || !b || r.k < 0.98) continue;
  const issues = [];
  if (b.x + b.w > 1075) issues.push(`R${Math.round(b.x + b.w)}`);
  if (b.top < 230) issues.push(`T${Math.round(b.top)}`);
  if (b.y + b.h > 1700) issues.push(`B${Math.round(b.y + b.h)}`);
  if (issues.length) (bad[`w${r.i + 1}`] ??= []).push(`${(fr / 30).toFixed(2)}:${issues.join(",")}`);
}
for (const k in bad) console.log(k, bad[k].length, bad[k].filter((_, i) => i % 6 === 0).join(" "));
