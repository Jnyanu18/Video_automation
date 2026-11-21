# Internet motion package review

The user-supplied `Motion Design/motion-design` archive was inspected as untrusted reference data. Its original author, distribution source and upstream URL are unknown. No explicit software license or copyright notice was found in the reviewed package. Advice to use licensed assets does not license the package itself. No uploaded script was executed, dependency installed, API called or media generated during this review.

This integration uses original documentation and typed planning helpers. The uploaded scripts, shader implementation and HTML templates are not vendored. This package's existing asset notices remain separate; the archive supplies no new stock asset library or permission to redistribute its code.

## What transfers

| Decision | Idea | Integration boundary |
| --- | --- | --- |
| Adopt | Story beats with a clear message, motion and transition rationale | Use stable scene IDs and a separate production plan; preserve the resolved brief and selected reference family. |
| Adopt | Sound cues linked to semantic visual events | Stable event IDs and scene-local frames; explicit source anchors; re-resolve timing after edits. See [audio.md](audio.md). |
| Adapt | Canvas textures on perspective panels; texture caching; screen projection | Optional future trusted React/TypeScript component. Implement, register and validate before extending scene kinds; the starter does not gain WebGL panels through metadata alone. |
| Adapt | Storyboard and labeled review thumbnails | The original exporter escapes all text and includes no asset URLs or scripts. It exports a text plan only; future thumbnail review uses trusted captures. |
| Adapt | Single camera journeys, occlusion swaps and readable holds | Select per scene and brief; retain valid cuts, alternate camera grammar and calm holds. |
| Leave | Custom Chrome/CDP-to-FFmpeg renderer and local static server | Keep Remotion Player and the existing isolated render worker. No second renderer is introduced. |
| Leave | Python mixer, synthesized sound kit and mandatory music bed | Keep approved assets and the existing audio/ElevenLabs pipeline. Planning metadata is not audio processing. |

## Correctness and dependency findings

These are static findings, not results of running the archive:

- `scripts/render.mjs:12,45` claims Node 18+ but requires global `WebSocket`, absent by default in Node 18. It also requires local Chrome/Chromium and FFmpeg. Its WebGL availability claims depend on the actual browser/worker configuration.
- `render.mjs:34–36` uses a string-prefix containment check that permits sibling-prefix and symlink escapes; malformed URL decoding can throw outside error handling. Its predictable port/profile and CDP calls lack robust timeout, process-error and cleanup handling (`40–49`). Do not reuse this server/orchestrator.
- `templates/template-3d.html:38–44` fixes a purported 180-degree shutter to `0.5/60` seconds although the renderer defaults to 24 FPS. An original implementation must derive shutter duration from actual FPS. Its font and `gl3d.js` paths also require assets/layout absent from the template folder.
- `scripts/gl3d.js:37,55–67` disables depth testing and sorts by panel-center depth. Intersecting or strongly rotated panels can composite incorrectly. Context/link failure handling and GPU resource disposal are incomplete. Mip bias approximates defocus; it is not a physically accurate depth-of-field renderer.
- `templates/storyboard.html:27–28` interpolates strings and asset paths into `innerHTML`. Model/user content belongs in escaped React text with approved assets, not executable template strings.
- `scripts/mix.py:24–27,52–66` does not adequately bound pitch, pan, fade lengths or placements. Short clips/beds and out-of-range cues can cause array-shape failures. Its sync report (`69–73`) checks placement arithmetic, not perceived synchronization or the encoded output.
- The mixer requires NumPy, SciPy and FFmpeg; the sound synthesizer requires NumPy/SciPy; contact sheets require Pillow. No dependency manifests or lockfiles accompany these tools. The contact-sheet utility also forces 16:9 images and does not handle empty input safely (`contact_sheet.py:6–9`). None becomes a new runtime dependency here.

## Style rules require selection

The archive treats every transition as a shape morph, prescribes one camera with no reversals, asks for constant motion and generally bans bouncing/scale text. Those are aesthetic preferences, not universal production constraints. They conflict with this library's purposeful cuts, readable static holds, per-element physics and opt-in Neo-Swiss editorial behavior. Brand typography, framing, gradients, centered endings and 8–12-pose animation also remain choices governed by the brief and reference evidence. Do not impose the archive's Poppins-like type styling or camera grammar on every brand.

The existing React/Supabase/Claude API/Remotion architecture, authenticated asset staging and ElevenLabs process remain authoritative. [production-plan.ts](../starter/src/production-plan.ts) adds typed planning metadata and cue arithmetic only; it does not add scene kinds, mix audio, execute uploaded code or render media.
