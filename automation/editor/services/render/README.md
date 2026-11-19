# services/render (agent C)

`render_preview(plan, workdir) -> mp4 path` and `render_final(plan, workdir) -> mp4 path`
(`render_*_info` return a dict with duration, size, stage, warnings, seconds).

Pipeline: validate -> FFmpeg per-keep-segment re-encode (frame accurate), reframe (`face-follow` interpolated crop
from `reframe.track`, `center` crop, `none` = letterbox fit), scale to output size/fps, concat ->
remap captions/overlays to output time -> Hyperframes composition (local GSAP) -> render.
If there are no captions/overlays the browser stage is skipped. Preview: short side 360px, <=24fps, `-q draft`,
x264 ultrafast crf28. Final: plan output size/fps, `-q looks`. Outputs: `workdir/preview.mp4`, `workdir/final.mp4`.

Overlay kinds: `broll` (asset = video/image path, muted), `title` (params.text/subtitle), `lower-third`
(params.name/title), `graphic` (asset = image path, or params.text). Block ids are NOT supported (warning).
Caption styles: bold-pop, clean, boxed, highlight (unknown -> bold-pop + warning).

Timeline: `timeline.remap_to_output` lazily imports `tools.edit.timeline.remap_to_output` (owner E) and falls back to
a local clip-aware version on ImportError/any error/odd return shape. Expected: returns a plan dict whose
captions/overlays are in output time.

Env: `HYPERFRAMES_BROWSER_PATH` (default: chrome-headless-shell if found, else /usr/bin/google-chrome).
Hyperframes CLI is taken from `app/node_modules/.bin`. GSAP: `services/render/vendor/gsap.min.js` (copied per render).

## Docker
`Dockerfile` installs chrome-headless-shell for the BeginFrame fast path. UNBUILT and UNTESTED here (no docker).
Locally, system Chrome is used, which Hyperframes runs in slower screenshot mode.

## Tests
`HYPERFRAMES_BROWSER_PATH=/usr/bin/google-chrome python3 -m pytest services/render/tests -q`
Verified (8 pass, ~26s, 2 cores): remap, filter generation, composition lint-ish checks, real preview/final renders of
a synthetic ffmpeg clip incl. frame-count accuracy (1.0s -> exactly 30 frames) and burned-in captions.
Not verified: chrome-headless-shell path, HDR/long clips, source without audio through Hyperframes, other-owner timeline module.
