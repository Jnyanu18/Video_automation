# Pitfalls actually hit (Film3D, Oct 2026) and their fixes

Sources: the project checkpoint notes, code comments and the build's error log.

## Look and composition

**Black boxes around every glow (Front canvas over footage).**
Symptom: each particle, halo and the hero's motes drew an opaque dark square over his footage.
Cause: additive shaders wrote alpha ~1 over each sprite's quad on a transparent, premultiplied canvas.
Tried: screen-blending the canvas (boxes gone, hero too faint). Fix: premultiplied output with
`alpha = max(r,g,b)` in every glow fragment shader, `premultipliedAlpha: true` on the materials and
`gl={{ alpha: true, premultipliedAlpha: true }}` on the canvas. See shaders.md section 1.

**Wide glass card edges read as stray bars (the "one pattern" rule shot).**
Symptom: the glowing edge band of the large backing card behind the ribbon (10.2 x 8.4) read as stray
bright bars in the frame instead of as a card. Fix: reframed the shot (network/ribbon camera keys) so the
card reads as a whole panel with its frame inside the shot. Rule: never let wide glass go near edge-on; if a
camera must swing past it, fade the card.

**Hero glow washing out frames.**
Symptom: the seed's halo plus its point light (and the Finish bloom on top) washed the frame out toward
flat amber. Fix: lower halo intensity (0.15-0.55), larger `pow` (2.6-3.4 = tighter core), `glow` capped
(`Math.min(1.25, ...)`), `light` 0.35-0.5 in big sets and 0 on the Front canvas. Keep large surfaces
under ~55% brightness so the Finish bloom acts only on true light.

**Law cards tiny and clipped.**
Symptom: the F = ma / Maxwell / E = mc² / DNA cards were too small on a phone and clipped at the frame edge.
Fix: bigger cards (3.4-5.2 wide), homes moved inward (`[-2.6, 2.0]`, `[0.4, 4.5]`, ...), camera keys pulled
back for the gathering. Texture drawn at ~300 px per unit with 112-290 px type.

**Board clipped at the right edge.**
Symptom: the glass board and the right-hand practice cards left the frame. Fix: camera moved back for
the wide moments (keys at 31-33 units) and `c` adjusted. Check the widest key, not just the first.

**End-card text unreadable over the bloom.**
Symptom: white headline over the hero's bloom and rays had no contrast. Fix: dark glass backings
(`rgba(10,6,40,.62)`, amber border, big dark shadow) behind the headline (92 px, top 300) and the
follow line (42 px, own box, lower), reduced end-set halo. Text shadows alone are not enough over bloom.

**STEM cards hidden behind his head (SIDE).**
Symptom: orbiting STEM cards passed behind the cut-out's head. Fix: orbit radius 1.75, cards 1.4 x 1.55,
camera distance 17.5 -> 15.5, `c = [620, 540]` (up/right of his head). Check orbits at several phases.

**Lossy card clipped and its glitch unreadable.**
Fix: wider card (3.9 x 0.64), texture 1400 px wide with 72 px type, glitch = low base (0.06) + short
spikes instead of a constant strong glitch.

**Cube comparison clipped.**
Symptom: the big ~60 TB cube and its label cut at the frame edge during the held comparison. Fix: a
dedicated orbit camera (az -14 -> 0, el 9 -> 6, distance 33 -> 29 then 21.5 into the hand-off) with `c`
sliding from `[640, 1030]` to the tile's emerge point `[740, 1060]`.

**Small labels.**
Fix: minimum 34 px on a 1080-wide canvas; the cube labels went to 40/42 px; tags 34-38 px; gauge text 29 px
was the smallest used and only for a secondary line.

**Style frame with an empty top third.**
Fix: spread particle timing phases so the top band fills; the finish bar forbids more than about a quarter
of the frame as flat colour.

**Caption spaces lost around emphasised words.**
Fix: inline-block word spans with `marginLeft: "0.26em"` instead of relying on literal spaces.

## Pipeline and environment

**A full system disk killed the 3D render.**
Symptom: render died with ~1.8 GB free on the system drive. Fix: deleted only this project's regenerable bundles
(`out/bundle-*`, ~3.7 GB total), rendered with `TEMP`, `TMP`, `TMPDIR` on a roomier disk
(`<HEAVY_TEMP_DIR>-<project>`), then removed that folder. Check free space before every full render
and snapshot round; never delete media or deliverables to make space.

**Background animator agents died with API 409** ("Tool continuation history prefix changed").
Two parallel animator agents building 3D sets died mid-task (galaxy, network and cubes survived). Fix:
build the 3D world in the main session; do not hand long 3D builds to background agents. If you split
work, keep pieces small, give each its own files, and verify on disk what was actually written.

**Empty first frame after a canvas mounts.**
Prevention: always the kit `ThreeCanvas` (holds the frame until drawn) and `useFontsReady()` before
canvas text; release holds with `settle()`.

**Fonts missing in canvas textures.**
Canvas text drawn before Inter Tight loads silently uses a fallback and stays wrong (the texture is
cached). Gate texture creation on `useFontsReady()`; list maths-capable fallbacks in `CFONT`
("Segoe UI Symbol", "Cambria Math") for ∇ ∂ → −.

**Loudness came out at -15.9 LUFS after render.sh.**
Fix: `finalize.sh` (VO + bed amix, 3:1 gentle compression, gain to target, oversampled limiter) ->
-14.5 LUFS, TP -1.6 dBTP.

**Music bed far too quiet (-53 LUFS) / shape errors summing effects.**
Fixes in the mixer: raise `MUSIC_DB`; sum effects of different lengths with a `mixl` helper; pass note
frequencies through `f0()` (no sharps in the DSP helper).

## Review traps

- Self-review by contact sheets is Creative QA by the builder, not approval. Report Technical, Factual,
  Creative and User-acceptance separately; synthetic music/SFX are unauditioned.
- After each fix round, re-snap the same seconds and look at regressions elsewhere (a camera pulled back
  for one label can push another subject under the captions).
