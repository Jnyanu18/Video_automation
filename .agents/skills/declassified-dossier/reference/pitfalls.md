# Pitfalls (from the source film, v1 -> v7)

| Symptom | Cause | Fix |
|---|---|---|
| `cue not found` / `is said N times; pass nth` at bundle time | the spine changed (new take, speed-up, pause trims) or a word repeats | re-point the cue in `world/T.ts`; use `cue(p, nth)`; for a single repeated word use `wAt(phrase, k)` (start of the k-th word of a unique phrase, e.g. `wAt("cars, no.", 1)`) |
| Marks drift off their word after a speed change | hard-coded offsets from a beat start | anchor every mark on a word in `T.ts`; offsets only of a few tenths from a cue |
| Madhav: "too much motion", "I hate the zoom on my face" | desk drift, camera shake, footage tiles flying into photos/booth windows, punch-ins | still cut-out; still desk; one small act at a time; v2 removed every footage hand-off |
| A column panel slides across his face on exit | band-style exit (slide left) used in the column | `Slot` with `cx={755}` fades right instead; keep that rule for any new column element |
| Text over his head | `SIDE_FACE` from an older take or scale | re-measure on stills of the current take after any staging change (v5 at 0.66 scale vs v6 at 0.88 moved the head ~270 px) |
| Panels look small, a strip sits empty under the band | v5 scenes mapped to v6 by `BAND_TF` 0.92 / `COL_TF` 0.74 | author new scenes for the v6 zones directly; use the strip y 668-770 |
| Ticks touch the last letter, stamps cover a label | fixed tick/stamp positions vs Anton widths | check the stills at each landing; move the mark, not the text |
| Captions hit his hair | caption block widened leftwards for one long word | shrink 46 -> 34 px first; only then shift left to end at x 950 |
| A hypothetical reads as news | analogy or "if there is a war" drawn like a fact | stamp it WHAT IF? / IF THERE IS A WAR; non-graphic units, no weapons |
| An official text is misquoted | paraphrase drawn as a quote | quote only exact text from the source; otherwise a plain paraphrase with the date |
| "No frame found at position" on the matte | long single-segment VP9 alpha with sparse keyframes | re-encode the matte with `-g 15 -keyint_min 15` (news-qa-reel's matte script does) |
| System disk fills (ENOSPC) during stills/renders | Remotion asset caches and webpack bundles in `%TEMP%` (tens of GB) | delete `out/bundle-*` after stills; prune `%TEMP%/remotion-*assets*` and `remotion-webpack-bundle-*` older than 30 min; point `TEMP` at a roomier disk |
| Missing textures at render (`tex/*.jpg` 404) | textures are not committed | `py src/world/make_textures.py` once per film |
| Fonts flash or differ | Google fonts not loaded / system UI font differs per OS | Anton + Courier Prime load via `@remotion/google-fonts`; the IG card uses Segoe UI -> Arial fallback, check widths on non-Windows |
| Remotion refuses the 1440 render (2559.99 px) | scale with too few digits | `--scale=1.3333333333333333` exactly |
| True peak above 0 dBTP after encode | limiter at 48 kHz | `render_ig.sh` limits at 192 kHz then resamples; re-check with `ebur128=peak=true` |
| Background static/hiss in his voice | room noise in the take | denoise `vo.wav` (DeepFilterNet, ~20 dB limit), keep the original, re-run Whisper to confirm the words |
| `python3` opens the Microsoft Store | Windows alias | set `PY` to a real Python 3.13 |
