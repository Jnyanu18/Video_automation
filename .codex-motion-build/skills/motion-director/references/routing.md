# Routing mixed prompts

Start from [choreography-and-sync.md](choreography-and-sync.md) when the brief asks for motion that feels like FRAME / STUDIO or when a previous render feels off beat. Choose one focal action, connected subject states and a readable text role per beat. A clinical explainer can be calm with precise contacts. A 2D service reel can be lively through changes in subject, gesture and pacing.

For every selected direction use [reusable-execution.md](reusable-execution.md), including its actual-state probes and render–critique–repair loop. The [event-stage example](../examples/event-stage/README.md) implements a fixed15-second portrait graphic journey; select or adapt it only within its declared support.

Use `custom-motion` when the requested action needs a component absent from the starter registry. This includes a persistent photo object across scenes or a specific illustrated or 3D assembly. The [FRAME / STUDIO example](../examples/frame-photo-studio/README.md) gives an implemented source reference for persistent geometry and shared cues. It requires adaptation to a different subject. Standard branded ads that fit the registered kinds keep the standard path.

For explicit variable-font weight pulses, beat-synchronized word/palette swaps or goo nodes, retrieve [high-kinetic-ui.md](high-kinetic-ui.md). Preserve actual font/brand assets, measured audio phase and output-frame limits. These are optional custom treatments, not a requirement to restyle every project or invent scene JSON fields.

For explicit 2D-to-3D mixed media, acrylic objects, helical notifications, comic impacts, halftone dissolves, inflated type or ribbon/logo morphs, retrieve [mixed-media.md](mixed-media.md). Use selected effects to connect the story; genuine mesh/material/simulation effects require a tested custom renderer or staged assets. Do not invent standard scene kinds for them.

For explicit split-line typography, hero-first compound UI, cursor-led zooms or camera recoil, retrieve [type-and-camera.md](type-and-camera.md). Respect the saved brand's typography and existing per-letter treatment. Advanced charts, odometers and 3D grids still require registered custom components; helper timing/transform data is not renderer support.

For explicit parallax, exploded cards, rack focus or elastic baselines, retrieve [depth-and-impact.md](depth-and-impact.md). Keep the existing brand and primary reference language. These helpers require explicit custom-component integration; the standard gallery does not gain 3D depth, directional blur or collision response through invented JSON fields. Inspect the host's registered capabilities before choosing the execution path.

For an explicitly continuous multi-state UI study/loop or an advanced SaaS-launch archetype, read [advanced-ui-motion.md](advanced-ui-motion.md). Use `shared-container-ui` or `saas-launch` execution profiles when the required mechanisms exceed the basic registry. Keep ordinary simple demos on `standard`; do not let these archetypes override an unrelated brand or brief.

For an explicit Neo-Swiss kinetic request, select the [Neo-Swiss profile](neo-swiss-kinetic.md) and custom-component execution. Preserve its profile across narrow revisions. The basic API route returns a custom-renderer handoff for this case; the reviewed gym example is supplied for worker/template integration.

## Technique retrieval

| Prompt intent / visible mechanism | Primary candidates | Optional borrowed behavior |
| --- | --- | --- |
| Clean interface, morphs, satisfying microinteractions | R08 | R02 persistent image; R06 input-to-result flow |
| Dark SaaS, growth, analytics, network | R01 | R04 milestone pacing; R08 interface clarity |
| Premium image-led experience, device/print journey | R02 | R05 selected destination cards |
| Energetic kinetic type and shape showreel | R03 or R07 | R09 concentric type; R10 warm particles |
| Technical particles, warm glow, ribbons | R10 | R03 glyph settlement; R07 terrain |
| Travel/service onboarding | R05 | R08 status feedback; R02 full-screen card expansion |
| Creator advertising workflow | R06 | R08 clear controls; R01 numerical payoff |
| Milestone story, gratitude, longer launch | R04 | R01 counter/chart; R06 audience-word swaps |
| Teaching, draw-on illustration, narration | R11 | R08 approval; restrained R07 accent |
| Multicolor experimental collage | R09 | R03 layout; R10 particle identities |

## Resolve competing instructions

- “Minimal but energetic”: keep sparse composition and one primary accent; put energy in entry timing and cut placement, not constant movement.
- “Luxury and playful”: preserve quiet typography and long holds; add one elastic detail, not a bouncing camera on every scene.
- “Particles + UI + voiceover”: use particles as a short hook or bridge; UI carries the explanation; retime both to real speech.
- “All ten styles”: explain in the preview plan that a coherent selection uses a primary language plus selected accents. Offer a separate longer reel only if the user actually wants a sampler.
- “Same as this reference”: use that reference as primary, preserve its structural rhythm, adapt copy/brand/assets. Do not claim exact fonts, timing curves, sound sources, or renderer without source data.

## Retrieval and generation efficiency

Keep the compact routing table and skill in cached system context. Retrieve 1–3 atlas entries and 2–5 recipes for a generation request. The eleven original videos do not need to be sent to Claude on every request. Only reanalyze an original when a new detail or native-frame timing matters. Use thumbnails for storyboard QA before a full video render.

The bundled standard API route loads the choreography and audio policies and the resolved primary and secondary atlas entries. Load extra technique recipes when building the corresponding custom component.

Use the strongest available configured Claude model for a first complex storyboard or custom component task; make the model ID a server setting. Use a cheaper configured model for narrow copy changes only when the same schema and validation gates apply. Never hardcode a claim that a specific dated model is universally “best.”

Reuse trusted components, scene IDs and assets. Cache assets by content hash and render bundles by source hash. Reuse unchanged previews; an MP4 render still requires the full approved composition unless the renderer has a tested chunk cache.

## Internal edit plan format

```text
Goal: ...
Primary: R08 — spacious UI and continuous shape logic
Secondary: R03 — two-second kinetic hook; R01 — verified metric payoff
Brand: existing kit revision ...; project override ...
Format: 1920×1080, 60 fps, 15s (or stated user choice)
Scenes: [id, start frame, frames, purpose, technique, hold, cut, cue]
Assets: [resolved IDs, missing/stand-in IDs]
Voice: [script, voice ID, pending/ready, measured duration]
Changes for this revision: ...
```

The app need not expose internal reference names or renderer details in its consumer UI.
