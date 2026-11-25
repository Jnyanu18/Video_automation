# FRAME / STUDIO — dynamic photo-studio reel

**15 seconds · 1080×1920 · 60 FPS.** Fictional studio concept built using Reference Motion Director v1.6. This is the editable source of the previously rendered v1.6 demo. No MP4 or output captures are bundled in this example; no new render or user approval is asserted.

This historical example retains its own v1.6 helper snapshot. Bundling it in a newer skill version does not implement newer techniques such as variable-weight type, beat swaps or SVG goo. Adapt and review its code explicitly before claiming new capabilities.

## What is implemented here

The main photo card stays mounted throughout the entire film. Its position, dimensions, border radius and rotation follow superposed spring responses, preserving position and velocity when targets change. It grows, joins a contact sheet, approaches the camera, physically flips to its product-photo reverse, then collapses into the closing viewfinder mark.

- **Depth:** actual CSS perspective/Z transforms and independently tilted photo planes; a separate camera matrix controls the whole stage. Supporting cards emerge behind the portrait rather than crossing its face.
- **Choreography:** varied glyph springs, line reveals, focus changes, a 3D card flip and the final identity collapse. The primary image remains the anchor.
- **Latest helpers wired into rendering:** `burstPosition`, `elevationShadows`, `focusLayer`, `areaPreservingScales`, `directionalBlurState`, `lineEntrance`, `textFocus`, `anchoredCamera`, `projectPoint` and `cameraRecoil` all feed actual rendered values.
- **Cursor:** a curved path reaches the target after card rotation, perspective and the complete camera transform. It shares the actual contact event with the shutter accent.
- **Velocity cues:** brief one/two-frame onion-skin samples use both the historical card pose and historical camera. These are authored trails, not a claim of physically exact motion blur.
- **Sound:** original 120 BPM instrumental, shutters/clicks and leading whooshes, with event frames checked against the edit plan.

These are flat photo planes in a perspective stage, not volumetric models or an optical camera simulation. Background focus is an authored blur treatment. No universal reference-quality rating is implied.

## Edit, preview and render

Requirements: Node 22+ (tested with Node 24), npm and a compatible Chromium/Chrome executable. Set `CHROME_PATH` when it is not `/usr/bin/chromium`.

```sh
npm ci
npm run check
npm test
node build-plan.mjs
npm run studio
npm run stills
npm run render
```

The output is `output/frame-photo-studio.mp4`. `REVIEW_FRAMES=6,132,282,432,719,762,899 npm run stills` requests specific review captures.

Edit `project.json` for the brand, all displayed copy, palette, image files, scene boundaries and named event frames. The custom `StudioSchema` is in `config.ts`; Remotion registers the composition as `FramePhotoStudio`. The major motion events are derived from that data; detailed pose destinations and phase offsets are art-directed in `motion.ts`/`PhotoStudio.tsx`. This is an editable source project, not a drag-and-drop timeline editor. It does not add unsupported fields to the skill's standard scene registry.

Layout is designed for portrait and this copy length. Longer copy, timing or aspect changes require reflow and review. If changing timings, also update/regenerate the score's cuts/accents in `make-audio.py`, run the shared-event checks, create a new revision and re-preview. `build-plan.mjs` validates a separate v1.6 production plan and writes its escaped text storyboard; the storyboard is not a rendered preview.

## Assets and verification

The three portfolio photos are original AI-generated demo images, bundled unchanged. They do not represent a real studio's clients or commissioned work. `asset-provenance.json` contains their origin, dimensions and hashes. Replace them with approved portfolio images for a real brand. No real offers, prices, contact details or booking URL are asserted.

All music and effects are original procedural synthesis; no voiceover or reference soundtrack is used. The already generated WAV is included. Regenerating it uses NumPy and optional installed FFmpeg/ffprobe; ordinary video rendering does not need Python. Font notices are `public/Inter-OFL.txt` and `public/Mono-LICENSE.txt`.

The source was copied from the prior standalone project; original composition, motion code, timing, fonts and media bytes are unchanged. `copy-manifest.json` records copy integrity and the two documentation/provenance adaptations. Historical MP4 render reports, random-frame results, captures, caches and installed dependencies are excluded. No build, render, full-speed playback or listening was performed while bundling this example. Install the pinned dependencies and run the checks above in your own worker before adapting it; mathematical tests do not establish visual quality or approval.
