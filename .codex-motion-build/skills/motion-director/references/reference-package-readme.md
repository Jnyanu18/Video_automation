# Reference Motion Director

A Claude skill distilled from **11 supplied motion-graphics videos** (about 4m08s total), for a React/Supabase app using Claude through the API.

**v2.1 update — repeatable execution.** The [execution workflow](references/reusable-execution.md) makes directing, implementation and render critique/repair part of the skill. A brand-neutral [event-stage composition](examples/event-stage/README.md) carries the implemented pass-to-stage choreography, editable copy/events and original score. A [typed evidence checker](starter/src/execution-quality.ts) catches supplied contact gaps, late word beats, incomplete covers and insufficient holds; pending playback/assets remain visible. The API handoff carries the selected details and implementation workflow. These are tested mechanisms and agent instructions; arbitrary-prompt quality and a production worker remain separate evaluation/integration work. [Verification](v2.1-verification.md).

**v2.0 update — local skill.** An [automatic direction pass](references/automatic-direction.md) considers every [design card](references/design-catalog.json) for a one-line or detailed brief. It selects a primary design and up to two supporting techniques, then plans the frame budget and flow. Host-provided soundtrack markers can guide the main accents. New design cards join the same selection pass. [Verification](v2.0-verification.md).

**v1.9 update — local skill only.** The [choreography guide](references/choreography-and-sync.md) ties copy and sound to visible actions, and the [FRAME / STUDIO example](examples/frame-photo-studio/README.md) includes the editable source of the v1.6 reel. The standard API route uses selected references, while a separate custom route covers actions outside the starter. The optional sync review checks source audio markers against planned and observed frames. [Dental comparison and verification](v1.9-verification.md).

**v1.8 update — local skill only:** added [high-kinetic UI direction](references/high-kinetic-ui.md), validated variable-weight type mapping, measured-beat subdivision planning, unified word/palette state indices and goo-alpha calculations. Corrected the easing percentages, filter syntax, geometric merge claim and universal font/camera rules. No site publication, video, image or audio generation was performed. See [v1.8 verification](v1.8-verification.md).

**v1.7 update — skill only:** added [mixed-media, tactile UI and impact direction](references/mixed-media.md), plus tested utilities for frame/duration impact windows, helical coordinates, a slow-motion drag impulse and point-mapped ribbon-to-logo endpoints. The recipes cover all supplied techniques, with explicit mesh/shader/simulation and coverage requirements. No new renderer, video, image or audio was generated. See [v1.7 verification](v1.7-verification.md).

**v1.6 update — skill only:** added [typography, component and camera choreography](references/type-and-camera.md), absolute line-stagger timing, text-focus presets, staged internal reveal scheduling, anchored 2D zoom/projection helpers and bounded impact recoil. It reuses v1.5's radial burst system, preserves brand-led typography and quantizes real reading alignment to frames. No new video, image or audio was created. See [v1.6 verification](v1.6-verification.md).

**v1.5 update — skill only:** added optional [depth, parallax, burst and impact direction](references/depth-and-impact.md), plus tested frame-driven helpers for elevation shadows, focus, 3D spring positions, projected-velocity blur envelopes, traveling baseline ripples and reciprocal deformation. Radial delays are normalized and capped; 8/12-frame examples are interpreted at 60 FPS and preserve their time span at other FPS. No video, image or sound was generated or modified. See [v1.5 verification](v1.5-verification.md).

**v1.4 update — skill only:** integrated the useful planning ideas from the uploaded internet package: ending-first shot direction, explicit object/camera handovers, close-up asset checks, semantic audio events, transition review sampling and a validated text storyboard. Added original typed helpers, JSON Schema and an optional API planning stage. No uploaded renderer/mixer code was copied or executed, and no new video/audio was generated. See [integration decisions](references/internet-package-review.md) and [v1.4 verification](v1.4-verification.md).

**v1.3 update — skill only:** selectively adopted the advanced motion/UI specification, added [measured motion presets and capability guidance](references/advanced-ui-motion.md), curved-path/bounded-stagger/frame-timing utilities, advanced UI/SaaS routing, and the existing shared-container source example. No new video or audio was generated. See [v1.3 verification](v1.3-verification.md).

**v1.1 update:** prompt interpretation and brand resolution now happen before scene generation. Read [Brand and brief](references/brand-and-brief.md) for the two-stage pipeline, richer brand-kit contract, explicit overrides, saved kit snapshots and field checks. See [v1.1 verification](v1.1-verification.md) for the new tests.

**v1.2 update:** added an opt-in [Neo-Swiss kinetic profile](references/neo-swiss-kinetic.md), a working [15-second gym ad template](examples/neo-swiss-gym/README.md), and custom-renderer routing. The standard JSON route remains available for ordinary projects. See [v1.2 verification](v1.2-verification.md).

Workflow: **brief + brand kit → editable project → preview/revisions → approved MP4**. Remotion provides the shared React preview/render engine. Claude plans the visuals and sound cues; ElevenLabs supplies actual voice recordings.

## Start here

- **The skill:** [SKILL.md](SKILL.md).
- **The video analysis:** [Reference atlas](references/reference-atlas.md), with filenames, approximate scene timelines, reusable techniques and limits.
- **Visual evidence:** [Reference review](reference-review.html), a local HTML report with embedded overview contact sheets.
- **Your app integration:** [React/Supabase/API guide](references/app-integration.md).
- **Editable examples:** [Landscape project](examples/mixed-launch.json), [portrait project](examples/mixed-launch-portrait.json), [pending narration](examples/voiceover-pending.json).
- **What was tested:** [Verification](verification.md).

## Run the editable starter

Requirements: Node 22 or newer, npm, Chromium/Chrome or Remotion's downloadable headless browser. `ffprobe` is needed by the ElevenLabs adapter for measured audio durations.

```sh
cd reference-motion-director/starter
npm ci
npm run check
npm test
npm run studio
```

Remotion Studio opens the fictional Flux example. Edit `examples/mixed-launch.json` for content, colors, scene timings, cards, metrics and sound cues. This is a source/project editing workflow; it is not a full timeline editor. The React app can expose these properties through its own controls; see `integration/EditablePreview.tsx`.

```sh
npm run validate -- ../examples/mixed-launch.json --final
npm run render -- ../examples/mixed-launch.json preview.mp4 --preview
```

If using an existing browser, add `--browser /absolute/path/to/chromium`. The provided preview is half resolution; final export uses the full project dimensions.

After the user approves revision 1 of that exact preview:

```sh
npm run render -- ../examples/mixed-launch.json final.mp4 --approved-revision 1
```

The CLI flag prevents an accidental local export of another revision. Your published app must enforce authenticated approval of the immutable project/source/assets server-side; this flag is not an authorization system.

## Use through your Claude API backend

The route first requests a schema-guided `interpret_prompt` result, resolves it against the saved kit, then requests `propose_project`. A deterministic check compares the generated project with the resolved brand/brief before storage. A sidecar `.brief.json` records decisions and missing details. Ordinary Messages requests do not automatically discover local skill folders.

For the included development example, configure `ANTHROPIC_API_KEY` and `CLAUDE_MODEL` in your server environment, then run from the package root:

```sh
node integration/generate-project.mjs examples/generation-request.json proposed-project.json
```

Install `starter/` dependencies first. The script validates the result before writing the project. It makes two real provider calls for a complete first generation when run with credentials; missing blocking details stop it after interpretation. It uses tool choice `auto` by default; `CLAUDE_FORCE_TOOL=1` is optional only for models supporting forced tools. Only touched UI values belong in `formOverrides`; a previous brief/project can be supplied for narrow revisions. Model availability, output budgets and costs are controlled by your server.

Set `productionPlan: true` in the development request to add a third model call after a standard project proposal. It writes `.plan.json`, `.plan-report.json` and `.storyboard.html` sidecars tied to that exact revision. It verifies that planned cues match the project's actual cues; it does not alter audio, render frames or add unsupported effects. Advanced profiles still require their custom-component handoff. If planning fails, the validated project/brief may already exist; do not treat the failed job as preview-ready.

To check an existing structured plan without model calls or media generation:

```sh
cd starter
npm run plan -- ../examples/mixed-launch.json ../examples/production-plan.json /tmp/motion-plan
```

The command writes a text planning board and metadata report. Optionally supply a fourth argument with host-probed asset records (`assetId`, `format: raster|vector`, raster `width`/`height`). Resolution checks assess declared usages only. A valid storyboard is not a playable preview. See [production direction](references/production-direction.md) for the intended review workflow.

Anthropic's managed custom Skills route is also described in the integration guide. Neither upload nor live invocation was performed for this delivery.

## Add ElevenLabs narration

Configure `ELEVENLABS_API_KEY` and an authorized `ELEVENLABS_VOICE_ID` server-side. Optionally set `ELEVENLABS_MODEL_ID`. From the package root:

```sh
node scripts/elevenlabs-voiceover.mjs examples/voiceover-pending.json project-with-voice.json
```

This makes a real paid/quota-consuming call when run. The adapter stores generated audio/alignment, measures duration and creates a new revision. It deliberately leaves scene retiming to the host/agent. Retime to the actual voice, validate, then show a fresh preview before approving export. Never put provider keys in the React bundle or Supabase public tables.

The delivered sample MP4 uses newly synthesized click/pop/whoosh effects. It has **no ElevenLabs voiceover** and is a starter demonstration, not a finished production matching every reference effect.

## What the starter supports

The standard JSON registry has seven scene kinds: kinetic type, UI panel, animated metric, card gallery, particle orbit, simple SVG illustration and CTA. Four transitions: cut, wipe, iris and push. Editable scene/brand data, local image/video/font/audio assets, basic audio fades and music ducking, integer-frame validation, and the same composition for preview/render.

The recipes also explain particle-to-text morphs, cylindrical/ring type, 3D carousels, line terrain, liquid forms and richer illustrated explainers. These advanced effects require custom registered components and testing; they are not secretly implemented by naming them in JSON. No HyperFrames adapter, full product-specific UI recreation, caption renderer or production audio mastering is bundled.

The skill transfers patterns from the references. It does not fine-tune Claude, identify the references' original software, or guarantee identical production quality. Consistent quality will need live prompt evaluation, curated assets, template expansion and real audio/visual review in your app.

## Check execution evidence

```sh
cd starter
npm run review -- path/to/execution-evidence.json path/to/execution-report.json
```

Supply measurements from the actual registered component or renderer and current source hash. Planned numbers remain `review-pending`. CLI exit codes:4 needs repairs,5 needs assets,6 needs review,0 declared checks complete. Pending checks still allow a labeled draft preview in the host; these codes are not user-approval records. `checks-complete` is not an artistic score or user approval.

## Package layout

```text
SKILL.md                     Agent instructions and workflow
references/                  Atlas, routing, recipes, audio, integration, QA
references/contact-sheets/    Inspected visual evidence from supplied videos
schemas/project.schema.json  Generated JSON Schema
examples/                    Brand kit, API request, editable projects
starter/                     Tested React/Remotion source and lockfile
scripts/                     Validation, export, smoke checks, voice adapter
integration/                 API proposal example and React Player component
verification.md              Actual checks and untested integrations
THIRD_PARTY_NOTICES.md        Bundled demo font notice
```

No original reference MP4s, `node_modules`, browser download, API keys or production account data are included. The font and starter SFX are bundled for local reproducibility. Respect the applicable Remotion terms for your published video-generation app; see the official licensing link in the integration guide.
