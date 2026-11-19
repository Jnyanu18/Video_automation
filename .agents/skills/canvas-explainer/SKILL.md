---
name: canvas-explainer
description: Madhav's "infinite canvas" Reel formula. Live marker drawing on a black canvas, a camera that glides between regions and zooms into sketched frames holding his avatar, real artifacts annotated in red, a zoom-out map ending, and a spoken comment CTA. Use to rebuild or create a 30-60s tech/career Reel from an existing voice track plus a HeyGen avatar clip (or voice only), e.g. "make it like the resume canvas one", "canvas style". Also has a Remotion variant (his real footage as a cut-out beside the canvas, news/Q&A Reels, "make it like the drug-discovery one") in template-remotion/.
---

# Canvas explainer Reel

First built for a resume-advice Reel in October 2026, then saved as a repeatable formula.

- Working example: `template/example-08-resume.html` (the full HyperFrames composition of that Reel; its media assets are not included).
- Screenshots: `../../docs/canvas-explainer/`.

House rules that apply: keep the avatar on screen in short bursts (about 3-4 s each), and deliver the full-quality master only. Engine: HyperFrames (pin `hyperframes@0.8.137`). FFmpeg is for prep and QA only.

## The formula (keep all of it)
1. **One infinite black canvas.** Use `#world` at 2400x6400 with a subtle dot grid. The camera never cuts; it glides with `power3.inOut` and a short motion blur on big moves.
2. **Everything is drawn live, on the word it's spoken.**
   - Marker strokes are SVG paths with a rough `feDisplacementMap` filter.
   - Handwritten labels use Ink Free, typed on with `steps()`.
   - Colours: white #f4f4ef, yellow #ffd84a, blue #6f8cff, pink #ff6fae, green #7ee08a, red #ff4b3e.
   - Red arrows and circles point at the key thing.
3. **Real tech artifacts, never generic doodles alone.** A software-engineering audience wants real architecture, code, terminals, real screenshots and real documents (e.g. a redacted resume), annotated with boxes and handwriting.
4. **Avatar inside sketched frames on the canvas.**
   - Frames are 405x720 at 9:16. The camera zooms into a frame (`s = 1080/405`) so his footage goes full screen; that zoom *is* the transition. Annotate on top of the footage in handwriting.
   - Avatar total stays **under 40%** of runtime (aim for about 20%): one hook beat, one mid "personal" beat, the close.
5. **No empty screen.**
   - Each region fills view y 120-1500.
   - Red connector arrows draw between regions during camera moves.
   - A yellow header lands as the camera arrives.
   - Captions sit at y 1555-1720 in Ink Free 64px with yellow keywords. Wrap the joined caption HTML in an inner `<span>`, or flex drops the spaces.
6. **Ending.**
   - The camera zooms out to the whole drawn map (s ≈ 0.31) behind a dimmed (0.58) end card.
   - The CTA is **spoken** in his voice. Example: "Want my resume? Comment 'resume', and I'll send it to you as a template." Show the keyword big in yellow.
   - Never tell viewers not to copy the shared resource. The resource is theirs to use.
7. **Sound.**
   - A music bed under the voice, carved with `~/.claude/skills/hyperframes-audio/scripts/carve.mjs --comp index.html --core <dir with node_modules/@hyperframes/core>`. Point `--core` at any project folder that has `@hyperframes/core` installed.
   - Lift the music in voice gaps and on the zoom-out.
   - SFX: pen-click on ticks/labels, typing on code, page-turn/whoosh on camera moves, swish-thud on pops, chime at the end.
   - Music must be Instagram-safe (see Music below).

## Build steps
1. **Inputs.**
   - Voice WAV, normalized -16 LUFS: hook + narration, concatenated.
   - Word timings `word@seconds`: aligned JSON or `clips.json` captions, saved as `words.txt`.
   - Avatar MP4 whose media time = voice time minus the hook length.
   - Real artifact images.
2. **Storyboard regions.** For each beat, pick a world origin and list its draws with spoken-word times. Keep text inside the 1080px view (Ink Free ≈ 0.5 em per character).
3. **Copy `template/example-08-resume.html`** into a new project folder and replace the region blocks, frames (poster JPG under each `<video class="clip">`), `K` camera keyframes, overlays (`.ov`) and end card.
   - Assets: `assets/fonts/Inkfree.ttf` (the Windows system font), IBM Plex Mono, `gsap.min.js`, SFX, music, the poster frames, `package.json` and `hyperframes.json`.
4. **SFX.** Inject the `<audio>` tags with greedy track packing so no two overlap on one track (one `<audio>` per cue; a new track index whenever cues would overlap). Then run carve.
5. **Check.** Run `npx --yes hyperframes@0.8.137 check` until it passes. Contrast flags on intentionally grey text are acceptable.
6. **Render.** `npx --yes hyperframes@0.8.137 render -o renders/<name>.mp4`.
7. **QA.**
   - Contact sheet at the camera-move moments.
   - Full decode, 1080x1920, CFR30, yuv420p.
   - Loudness around -14 to -16 LUFS.
   - Avatar seconds counted.
   - Look at each frame for empty or overflowing text.
8. **Delivery.** Deliver the full-quality master (for Instagram, 1440x2560 H.264 at up to ~24 Mbps and under 300 MB). Never shrink resolution or bitrate just to fit an uploader's file-size limit; find a route that takes the real master. Upload, scheduling and publishing need the owner's explicit yes.

## Music (Instagram-safe)
Instagram's in-app music library can't be attached to posts scheduled through a third-party scheduler or the API; it can only be added in the Instagram app when posting manually. For scheduled posts, bake in royalty-free beds instead: the HeyGen audio catalog (`search_audio_sounds`, a free search/download, not generation) or another licensed library. Keep the music quiet under speech. If you want a trending Instagram sound, deliver a version with music muted or low so you can add the sound in-app when publishing manually.

## Remotion variant (real footage cut-out, news / Q&A Reels)

Built in October 2026 for the drug-discovery news Reel ("OpenAI just bought Orchestra Bio"). It is the same black canvas
with live marker drawing, rebuilt as a Remotion world beside Madhav's **real** footage. Use it when the Reel is built
from his own talking-head take (plus optional ElevenLabs voice-clone lines), when the project is already in Remotion
(for example the news-qa-reel shell), or when he says "make it like the drug-discovery one". The HyperFrames
formula above stays the route for avatar/voice-only canvas Reels.

- Code: [template-remotion/](template-remotion/README.md): world, marker kit, camera, presenter, captions, audio bed,
  render and QA scripts, a spine sample and its schema. No media.
- Notes: [reference/remotion-variant.md](reference/remotion-variant.md): look, staging zones, camera rules, calm rules,
  honesty, audio and pitfalls.
- Example: [examples/drug-discovery/](examples/drug-discovery/README.md): script, beat table, fact chips, revisions.
- Frame: `../../docs/canvas-explainer/style-remotion.jpg`.

Run it inside the cstack `animated-video` stages and approval stops (concept, style frame, key-frame board, final
review), like paper-lab-reel. What changes from the HyperFrames formula:
1. **Ink.** SVG strokes reveal with `pathLength=1` dash offset. A `feTurbulence` + `feDisplacementMap` rough filter
   sits over the whole canvas. Labels write on letter by letter in Ink Free. The palette is the same six colours, each
   with one meaning. The v1 ink "boil" (noise seed every 4 frames) is available as `boil={4}` but is **off by default**:
   Madhav found v1 too busy.
2. **World camera.** Pages are 1080x1920 regions of one world (`PG`). There is one page per beat, and the camera
   holds still inside a beat. Use a 0.35 s pan between pages on the same row and a cut on a row change. Each page's
   first drawing is complete 1.5 s before the camera arrives. The ending is a 0.9 s zoom-out to the whole map, dimmed
   behind the end card. Red connector arrows link the pages.
3. **Presenter.** He is the still, mirrored cut-out bottom-left for the whole film, end card included. Use the
   **v6 staging** by default: scale 0.88, graphics in the top band (y 220-760) and right column (x 720-940,
   y 760-1300), captions in the right column from y 1300, the series tag, and anonymous IG DM question cards.
   - Under voice-clone lines, play his silent "listening" footage, so his lips never move under the clone.
   - The v1 "footage inside sketched frames, camera zooms into the frame" hand-off is retired. Madhav said: "when we
     zoom in and zoom out on my face, it goes in the middle. I hate that." Never zoom toward his face.
4. **Honesty.** Draw only what is said. A simplification gets a short fact chip in the art, opinions get a
   MADHAV'S TAKE tag, and illustrative numbers are labelled as illustrative. Use no disclaimers.
5. **Sound.** Run `audio/mix.py canvas`: a D-minor piano-pluck bed ducked -15 dB under speech, plus sparse marker,
   stamp and whoosh SFX (25 per minute or fewer). His voice comes first.
6. **Delivery.** Run `render_ig.sh` (1440x2560, under 24 Mbps, under 300 MB, faststart), then `qa.sh`. Full-quality
   master only. Upload, scheduling and publishing each need Madhav's explicit yes.
