# Pitfalls (from the source film, v1 -> v7)

| Symptom | Cause | Fix |
|---|---|---|
| `cue not found` / `is said N times; pass nth` at bundle time | the spine changed (new take, pause trims) or a word repeats | re-point the cue in `world/timing.ts`; use `cue(p, nth)` or `lastStart(p, n)` (start of the last word of a phrase, e.g. the "AI" in "is AI") |
| Stamps/highlights drift off their word after a speed change | hard-coded offsets from a beat start | anchor every action on a word (`lastStart`, `cue`), never `B.x.s + 1.3` |
| Madhav: "too much motion", "I hate the zoom on my face" | punch-ins, push-ins, footage tiles flying into the bubble, drifting camera, perpetual wobble | still cut-out; one camera pose per beat; wobble only in the tension window |
| Glow sits on his face | additive points/halos in the head box | keep `SIDE_FACE` current; the shader `faceKeep()` mask uses it; HTML chips need manual checks |
| Captions overlap his hair | caption box widened leftwards for a long word | right-column captions shrink 54 -> 42 px first; only then shift left to end at x 950 |
| Viewer reads illustrative labels as facts | "Education / Retail / Farming / Energy" market labels | removed; nodes only, or his words only; label experience as "Madhav's experience" |
| Empty first frame of a set or after a worker joins | stock ThreeCanvas captured before the scene drew | always `kit/three-canvas.tsx` |
| "No frame found at position" on the matte | long single-segment VP9 alpha with sparse keyframes | re-encode the matte with `-g 15 -keyint_min 15` (news-qa-reel's matte script does) |
| System disk fills during renders | Remotion asset caches and webpack bundles in `%TEMP%` (tens of GB) | delete `out/bundle-*` after stills; prune `%TEMP%/remotion-*assets*` and `remotion-webpack-bundle-*` older than 30 min after each render; point `TEMP` at a roomier disk if needed |
| Coins / moon poke out of the frame top or the IG band | world placed for an older layout | check stills at the coin pour and the moon window; pull them inside y 220-760 |
| Remotion refuses the 1440 render (2559.99 px) | scale with too few digits | `--scale=1.3333333333333333` exactly |
| True peak above 0 dBTP after encode | limiter at 48 kHz | `render_ig.sh` limits at 192 kHz then resamples; re-check with `ebur128=peak=true` |
| `python3` opens the Microsoft Store | Windows alias | set `PY` to a real Python 3.13 |
| Font widths differ on another OS | `Segoe UI` / `Consolas` are Windows system fonts | swap `UI_FONT` / `CODE_FONT` in `world/tex.ts` and re-check every chip and caption |
| A "Front" 3D canvas doubles GPU memory | two live WebGL canvases | one canvas at a time; v6 uses only the Back canvas (the old `front.tsx` small bubble was dropped) |
