# Event Stage — executable15-second recipe

Reference Motion Director v2.1.0. EVENT STUDIO is a fictional demo brand. This is a reusable, editable React/Remotion composition, not an arbitrary-duration motion-generation engine or a guarantee of reference-level artistic quality.

The supported profile is **1080×1920 portrait,60FPS,900frames/15seconds,120BPM**, six stable scene roles and the bundled Inter variable/monospace fonts. The original score, font files/licenses and seeded grain are local. No real brand logo, event photography, client claim or reference music is bundled.

## Run

Node22+ and Python3 are required for the checks. Tests use only Python's standard library; NumPy and FFmpeg/ffprobe are needed only to regenerate audio. The already-generated WAV can be used directly.

```sh
npm ci
npm run check
npm test
npm run studio
REVIEW_FRAMES=30,300,360,480,749,780,899 npm run stills
npm run evidence
```

`npm run evidence` samples actual component functions, executes the typecheck and writes source-hash-bound `execution-evidence.json` / `execution-review.json`. It checks projected ball/floor contact, full-word beat availability, outgoing foreground yield, opaque cover geometry and the final identity hold. The result remains **review-pending** until rendered-frame inspection, repeat-frame rendering, full-speed playback and listening are actually reviewed. Supplied asset provenance must also be verified by the host. The report does not inspect pixels, automatically measure text, listen, approve or score artistic quality.

For a repeat-frame render check, run `npm run verify`. It rebuilds the bundle from current source, compares repeated random-access frames and records the matching source hash. Run `npm run evidence` afterward to include a matching successful pixel-repeat report; stale reports remain pending. After review, `npm run render` writes a review MP4 to `output/event-stage.mp4`. Use the same component, props, assets and immutable revision for preview/export; any production approval belongs to the host app. Set `CHROME_PATH` when an installed compatible Chromium is elsewhere. The renderer otherwise uses `/usr/bin/chromium` when available or Remotion's supported browser acquisition.

## Edit within the recipe

`project.json` supplies all visible words/brand names, palette, staged asset paths, scene boundaries, geometry and named event frames. `config.ts` is the strict Zod schema; `project.schema.json` is its generated JSON Schema snapshot. Cross-field timeline rules additionally require `validateEventStage()`. `index.tsx` registers `EventStageReel`; `EventStage.tsx` and `motion.ts` implement the actual composition.

- Update the brand, tagline, category, headlines, footer/status copy and CTA together. These fields are explicit editable copy, rather than hidden text in JSX.
- The three short accent words use one event ledger: `lights`, `energy`, `action`. Each whole word is visible on its marker. Other headlines deliberately use line or letter animation. A test moves `energy` from300 to312 and proves both actual component state and the actual audio cue resolver move together.
- `geometry.floorY`, `ballDiameter` and `spark-contact` feed the ball and floor together. Contact is tested after the complete camera/projection transform. The landing response expandsX/compressesY with reciprocal local area; it is authored deformation, not a soft-body simulator.
- The same hero remains mounted as a dot, event pass, wide stage, macro view, asymmetric detail anchor and covering plane. Type/chrome yields before the cover grows. The cover must be fully opaque at the handover, with safe projected corner coverage.
- Changes to event/scene timing require `npm test`, audio regeneration, evidence refresh and affected frame/playback review. Scene-linked events must stay on their matching boundaries. Tests reject unsupported timeline changes; they do not automatically retime all creative choreography.

**Text-fit and adaptation limits:** the demonstrated copy fits this specific composition. The schema's maximum character counts are input bounds, not a font-fit guarantee. New wording, longer words, another language, new fonts, a different duration/FPS/aspect ratio or a new scene archetype requires measuring actual loaded font bounds, reflowing/adapting source, updating the schema and choreography, and inspecting the result. Do not claim these are supported merely by changing JSON or adding a catalog card.

## Exact logo handling

`assets.logo` is intentionally `null`: the preview shows the editable typeset brand name. This fallback is not an approved logo. To use an actual brand logo, stage its original PNG/WebP/SVG file under `public/` and set the relative filename. The component uses Remotion `Img` with `object-fit:contain`; it does not generate, redraw, alpha-key, recolor or reconstruct artwork. Choose an approved light/dark variant or change the layout/background to suit the source. Preserve provenance/source bytes and review the visible artwork bounds. A filename does not establish approval.

## Original audio

```sh
python -m pip install -r requirements.txt
python make-audio.py
```

`audio_timing.py` is the pure event-cue resolver used by both the real synthesis script and retiming tests. `make-audio.py` derives musical section boundaries from the scene list and accents from the shared event ledger, then synthesizes and measures a new deterministic WAV. No provider account or API key is used. Run from this folder; output is `public/event-stage-score.wav`, with `audio-report.json` recording timing/probe/level evidence. There is no narration.

The bundled generated score measures15.0seconds,48kHz stereoPCM24,−14.5 integratedLUFS and−3.9dBTP. These are measurements of the local WAV, not a listening judgment or verification of a future encoded export. See `AUDIO-NOTE.md` and the font licenses.

## Recorded verification

Typecheck and11 tests passed. Seven selected frames were rendered at half delivery scale and visually inspected for contact, complete word display, varied framing, detail staging, opaque final coverage and readable typeset identity. No MP4 was rendered for this example, no full-speed playback/listening review was performed, and repeated random-access pixel rendering passed after a fresh bundle rebuild. Current machine evidence records that passed check while frame-review declarations, full-speed playback and listening remain pending until the host supplies its actual review.

Exclude `node_modules/`, `.bundle/`, `output/` and `__pycache__/` when packaging. Install dependencies with `npm ci` in a fresh standalone copy.
