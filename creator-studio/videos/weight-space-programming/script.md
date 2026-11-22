# An AI fixed another AI by rewriting its weights, with no training

<!-- One paragraph per thought; each becomes one voice file. No em dashes, no "not X, not Y" chains. -->
<!-- Remade from research/viral/DfSNyBMzUHs (a 65 s screen-recording explainer, 2026-11-02/04). Every claim was checked against the
paper's own blog post (rikiyat.github.io/blog/weight-space-programming, MIT CSAIL, 2026-11-02) and The Register (2026-11-03). The
numbers are the authors' own, from one small model; the script says so. Left out on purpose: the reel's closing "what about its own
weights?" as a fact (The Register only says the authors expect it could support recursive self-improvement; the voice attributes it)
and the "6x on math" tweet wording (the blog's own figures are 7.9 percent to 48.1 percent on MATH-500).
Story loops: A = how can an AI fix an AI without training, B = a second, harder test, C = how far to trust it. -->

<!-- A+ -->
An AI just fixed another AI by rewriting the numbers inside it.

MIT researchers handed GPT-6 Astra the raw weights of a tiny model called Qwen and asked for better math, with no training allowed.

Astra found the problem on its own.

<!-- A- -->
Qwen kept getting stuck in loops. Astra traced them to one direction and edited 0.016 percent of the weights.

The math score jumped from 7.9 percent to 48.1.

<!-- B+ -->
Then a car kept driving straight at a ramp and stalling, because it never learned to reverse first.

<!-- B- -->
Astra fixed it in one reply, no tools, by editing 3.5 percent of the weights.

The car went from never clearing the jump to every time.

They call it weight space programming.

<!-- C+ C- -->
It is early. These are the researchers' own numbers, from one small model.

<!-- ending loop -->
They think it could one day help models improve themselves.

Follow for the next one.
