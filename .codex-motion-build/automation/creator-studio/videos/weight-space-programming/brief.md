# Brief: An AI fixed another AI by rewriting its weights, with no training

- **Funnel:** top (AI research news; reach)
- **Reference:** research/viral/DfSNyBMzUHs (64.8 s, 12 cuts, screen-recording explainer: the author's X post, MIT campus, the paper's
  charts, a bar chart 7.9 to 34.3 to 48.1, the car-and-ramp diagram; ends "what about when the same skill is pointed at its own weights?")
- **Our twist:** narrated, a story (one AI fixes another), the paper's own pictures on screen (the Breakout animation, the car-ramp
  diagram, the author's X post with its 9M views, the paper page, The Register, the Hugging Face model), our own dark-glass look with
  the picture-first layout; an honest "it is early" beat; no filming.
- **Facts and sources** (read 2026-11-04):
  - Paper blog, "Sparks of Weight-Space Programming", MIT CSAIL, 2026-11-02 (Rikiya Takehi, Jayden Teoh, Alex Zhang, Omar Khattab):
    weight-space programming = a general-purpose LLM reads and writes a network's weights directly, not through an optimizer, usually
    from a natural-language spec. Qwen3.5-0.8B: Astra found a looping direction in the MLPs of layers 15 and 19 and subtracted it
    from 64 output columns in each, 131,072 weights, 0.016 percent of the model. At 50 forward passes: MATH-500 7.9 to 48.1 percent,
    GSM8K 13.8 to 67.1, IFEval 21.0 to 62.3, answers hitting the 32,768-token limit 93 to 33.1 percent. Car and ramp (Kinetix, a PPO
    network of 171,664 weights, never succeeded in 256 episodes): given the weights, a scene description and one recorded episode,
    Astra made one no-tool edit of 3.5 percent of the weights, success 0 to 100 percent over 1,024 episodes. Limits from the authors:
    "exciting but still limited"; on Gemma 3 270M the edits did not improve math; the benefits for targeted fixes are a belief.
  - The Register, 2026-11-03 (Thomas Claburn): no outside experts; one small model and two benchmarks; no standard benchmark yet; the
    authors expect it could support recursive self-improvement, less sycophancy, interpretability. Not peer reviewed.
  - X post by Rikiya Takehi, 2026-11-02: 9M views, 55K likes, 12K reposts when captured on 2026-11-04.
  - Model: huggingface.co/RikiyaT/Qwen3.5-0.8B-weight-space-programming (Apache-2.0).
- **Not claimed, on purpose:** that this works on big models, that it is reproduced, that models will improve themselves (the voice says
  "they think it could"), the tweet's "up to 6x" wording, any independent replication (one informal report on X, unverified).
- **Name in the voice:** "GPT-6 Astra" is the paper's own name for the model; "Qwen" is spoken "kwen" (listen for it).
- **Media plan** (raw/): news pages captured 2026-11-04 at phone width (blog, register, hf, xpost), the blog's own breakout.gif and
  carjump_scene.svg (the page states no licence: credited in the captions, shown only as part of the paper's page).
- **Loops:** A+ L1 "fixed another AI by rewriting the numbers" / A- L4 "loops, one direction, 0.016 percent" / B+ L6 "then a car" /
  B- L7 "the car went from never to every time" / C+ C- L10 "it is early" / ending loop: "could one day help models improve themselves".
- **Music:** a library track.
