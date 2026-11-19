# Posts: An AI fixed another AI by rewriting its weights, with no training

Brand: personal
Series line: none (remade from research/viral/DfSNyBMzUHs, with the claims checked against the paper).
Facts used (read 2026-11-04): the paper's own blog post, "Sparks of Weight-Space Programming" (Rikiya Takehi, Jayden Teoh, Alex Zhang,
Omar Khattab, MIT CSAIL, 2026-11-02, rikiyat.github.io/blog/weight-space-programming): weight-space programming = a general-purpose
LLM reads and writes a network's weights directly, not through an optimizer; GPT-6 Astra edited Qwen3.5-0.8B (131,072 weights, 0.016
percent) and MATH-500 went from 7.9 to 48.1 percent (50 forward passes allowed), loops traced to one direction in layers 15 and 19;
the car-and-ramp task: a PPO network that never succeeded in 256 episodes, one no-tool edit of 3.5 percent of the weights, success
0 to 100 percent over 1,024 episodes. The authors call their results "exciting but still limited"; the Gemma 3 270M experiment did
not improve math. The Register, 2026-11-03: no outside experts, one small model, not yet reproduced. All numbers are the authors' own
and the video says so. The video claims no replication and does not say models will improve themselves: "They think it could one day".
Pictures: the paper's own car animation (recoloured dark and re-rendered), the author's post on X (9M views when captured on 2026-11-04),
the weights drawn from the paper's own description (illustration). The paper's page states no licence. Narrated with an ElevenLabs
voice (Christopher), not Vishnu's own. No comment keyword, no guide document.

## Instagram

An AI just fixed another AI by rewriting the numbers inside it.

MIT researchers gave GPT-6 Astra the raw weights of a tiny model, Qwen3.5-0.8B, and asked for better math, with no training allowed. Astra found the loops Qwen kept getting stuck in, traced them to one direction, and edited 0.016 percent of the weights. The math score went from 7.9 percent to 48.1.

Then a trained car that kept stalling on a ramp went from clearing the jump 0 percent of the time to 100 percent, after one reply from Astra that edited 3.5 percent of its weights.

They call it weight-space programming. It is early: these are the authors' own numbers, from one small model, and they describe the results as exciting but still limited.

Source: "Sparks of Weight-Space Programming" by Rikiya Takehi, Jayden Teoh, Alex Zhang and Omar Khattab, MIT CSAIL, 2 November 2026 (rikiyat.github.io/blog/weight-space-programming). Car animation and numbers from the paper, recoloured. Post by Rikiya Takehi on X.

AI research, MIT CSAIL, weight-space programming, Qwen, LLMs, machine learning

#AI #machinelearning #research

Cover text: An AI rewrote another AI's weights

## X

An AI just fixed another AI by rewriting the numbers inside it.

MIT researchers gave GPT-6 Astra the raw weights of Qwen3.5-0.8B and asked for better math, no training allowed. It edited 0.016% of the weights: MATH-500 went from 7.9% to 48.1%. A car that never cleared a ramp went from 0% to 100% after one reply, 3.5% of weights edited.

Early: the authors' own numbers, one small model.

Paper: https://rikiyat.github.io/blog/weight-space-programming/

## YouTube Short

Title: An AI rewrote another AI's weights and its math score went from 7.9% to 48.1%

Description: MIT CSAIL researchers asked GPT-6 Astra to make the small model Qwen3.5-0.8B better at math by editing its weights directly, with no training. It changed 0.016 percent of the weights and the MATH-500 score went from 7.9 percent to 48.1 percent. In a second test a car that never cleared a ramp went from 0 percent to 100 percent after one edit of 3.5 percent of the weights. These are the authors' own results from one small model; they call them exciting but still limited. Paper: https://rikiyat.github.io/blog/weight-space-programming/ . Car animation from the paper, recoloured. Narrated with an AI voice.
