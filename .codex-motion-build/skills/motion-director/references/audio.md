# Audio plan and evidence

## What was measured

Ten references contain stereo AAC audio; R04 has no audio stream. Decoded full-track RMS and sample peaks below are ffmpeg `astats` measurements, not integrated LUFS or true-peak loudness. No human listening pass, beat transcription, sound-source separation, or exact SFX classification was completed. A local speech-recognition pass found a plausible English plant explanation in R11; recognition on effects/music was unreliable and was not used as instruction text.

| Reference | RMS dBFS | Decoded sample peak dBFS |
| --- | ---: | ---: |
| R01 | -13.90 | -0.50 |
| R02 | -17.01 | -0.47 |
| R03 | -16.81 | -1.46 |
| R04 | no audio | no audio |
| R05 | -15.20 | -0.51 |
| R06 | -15.97 | -0.84 |
| R07 | -11.30 | +0.52 |
| R08 | -16.31 | -0.65 |
| R09 | -14.59 | -1.77 |
| R10 | -12.26 | -0.25 |
| R11 | -14.53 | -0.30 |

The positive decoded peak in R07 can arise from compressed-audio reconstruction; it is not an acceptable target. Audio-transient times in `reference-metadata.json` are energy-rise candidates only. They may be music hits, speech or effects; do not label them clicks without listening. Their role is to help a later detailed audio review.

## Production roles

- Claude: writes the script, chooses scene-level audio intent, emits cue timing and asset IDs.
- ElevenLabs: generates the actual voice recording, with character-level alignment where supported by the selected model/endpoint.
- Host: makes authenticated provider calls, probes duration, stores audio and alignment, stages assets and updates project revisions.
- Renderer/mixer: schedules recorded audio, fades it, ducks music, and produces the final mix.

The bundled `click.wav`, `pop.wav`, and `whoosh.wav` are newly synthesized starter sounds, not extracted from the uploaded videos. They are intentionally simple. Higher production quality can use a curated licensed sound library or an authorized sound-generation integration. No music asset or imitation of a reference soundtrack is bundled.

## Voiceover process

1. Use brand tone and language; take an authorized voice ID from the host. Do not invent a valid provider voice ID.
2. Draft a concise script alongside the edit plan, before picture lock. Plan phrase boundaries, breathing room and scene messages together. Rough speech estimates guide planning only.
3. Generate speech server-side via ElevenLabs. Store bytes and alignment separately; include the full script in project data.
4. Probe the actual media duration. Use `ceil(durationSeconds * projectFps)` for the audio frame span, allowing an audio sample tail to finish.
5. Map narration phrases/character alignment to scene entrances and optional captions. Character alignment arrays must have equal length, monotonic starts, and ends at or after starts.
6. Extend or redistribute scenes when speech exceeds the provisional cut. If duration is fixed by the user, shorten/regenerate the script; do not silently speed up speech or truncate it.
7. Validate again and show the newly timed preview. Voice changes create a new audio asset version and invalidate export approval.

`scripts/elevenlabs-voiceover.mjs` is a server-side reference script that generates speech/alignment and updates a pending project's asset entry. It does not retime scenes automatically and was not called against a paid API during package verification.

## SFX placement

| Event | Suggested sound | Timing intent |
| --- | --- | --- |
| Cursor click or command selection | Quiet short click | Transient at contact/click frame |
| Small card appears, checkmark resolves | Soft pop/tick | At perceptual arrival/settlement |
| Large fast travel or covering wipe | Short whoosh | Begins shortly before travel, strongest part near arrival |
| Important numeric result settles | One subtle impact | At final meaningful value, not on every digit |
| Draw-on illustration | Optional very light writing texture | Under the reveal; avoid competing with speech |
| CTA hold | Silence or music tail | Let the decision point breathe |

These are recommendations for reconstructed videos, not a claim that these exact sounds were identified in every reference. At 60 fps, a single frame is 16.7ms: place short effects within roughly 1–2 frames of the intended event after inspecting the waveform/transient. Do not align every event to a random music peak. If a track is supplied, establish its actual beat grid first.

## Semantic event plan

Keep a separate typed production plan alongside the schema-valid project. [production-plan.ts](../starter/src/production-plan.ts) handles planning metadata and cue-time arithmetic; it is not a mixer, a new renderer or permission to put unsupported fields into Project v1. Remotion remains the frame clock, and the existing ElevenLabs route remains the voice provider.

Give each meaningful visual event a stable ID, a stable scene ID and a nonnegative integer scene-local frame. For example, `demo-submit-contact` identifies cursor contact in scene `demo`, while `result-settled` identifies its final meaningful state. Share the event constants with the trusted animation component, rather than duplicating visual and sound timestamps. Retiming resolves the global event frame from the current scene start plus that local frame. If local choreography changes, update its shared constants too; an unchanged local frame does not follow an arbitrary time stretch automatically. If animation uses held poses, resolve the first visible pose with the same frame-quantization function used by the visual component.

For each cue, name the target event, approved asset ID, alignment intent and source-anchor offset. Distinguish these anchors explicitly:

| Anchor | Meaning of the offset from source start |
| --- | --- |
| Onset | First intended audible attack, excluding leading silence |
| Perceptual peak | The accent heard as the main hit; not necessarily the largest sample |
| Riser end | The intended culmination of the build, excluding a reverb tail |

Record the measured offset in frames at the project FPS, its evidence and any signed creative offset from the visual event. Resolve `cueStart = sceneStart + eventLocalFrame + creativeOffset - sourceAnchorOffset`. A cue targeting a visual event can therefore begin before it. Recompute from the event plan after edits; do not repeatedly shift already resolved cue starts. Converting an anchor measured in seconds to frames must use the current FPS. Changing FPS requires resolving the plan again, not relabeling existing frame numbers.

Validate unique event/cue IDs, scene and asset references, finite integer frame values, source bounds and the resulting timeline span. Report a cue that starts before frame zero or overruns the film. Do not silently clamp it and move the accent. Project v1 cannot express a source-in trim; if preserving the accent needs one, revise the plan or stage a separately approved trimmed asset through the host. The helper does not create that asset. Resolve supported placements into the existing `audio.cues` fields only after these checks.

`resolveCueTiming()` returns proposed cue data without changing the project. To bind a sidecar to a playable project, `validatePlanForProject()` requires its complete resolved cue set to equal `project.audio.cues`. The CLI and optional API plan stage enforce this check. Intended sound edits must first become an explicitly updated draft revision; validate the project and plan together before previewing it. The example's source anchors are illustrative mappings of the old cue schedule, with evidence labels; they are not waveform measurements.

An arithmetic check can prove that the chosen source anchor lands on the named event to frame precision. It cannot prove that the anchor was measured correctly, the hit feels synchronized, the sound is audible, or the exported audio survived encoding. Keep arithmetic validation, waveform inspection, perceptual listening and final export checks separate, and record which actually occurred. A computed zero-frame offset is not a listening pass.

## Mixing and export

Keep voice foregrounded. Start music under speech at a conservative gain and adjust by listening; the starter applies a simple 0.3 music gain multiplier while voice is active. That multiplier is not a loudness normalization algorithm. Production mixing should use smooth attack/release or an offline sidechain envelope, not an abrupt gain jump.

Short SFX should not click at trim boundaries. Use source assets with clean starts/tails and tiny fades where appropriate. Avoid overlapping multiple loud transients at one cut. The starter limits cue duration to a resolved source duration; it does not implicitly loop music.

For a typical web/social delivery, -16 to -14 integrated LUFS with a ceiling near -1 dBTP is a reasonable **proposed** target, adjusted for the actual delivery platform. Measure using a loudness meter and listen to the mix. Never equate RMS values above with LUFS. Store any final mixed audio as a new immutable asset and check preview/export parity if normalizing outside Remotion.

Approve the exact final mix with its project revision, source assets and mix settings. Replacing a voice, moving an event, changing a source anchor, gain, fade, ducking, normalization or tail creates a new revision and invalidates the affected export approval. An earlier approval of picture alone does not approve a subsequently changed soundtrack.

When requested, plan an additional silent picture master and separate voice, music and SFX stems. These are optional delivery artifacts with the same start, duration, FPS and revision manifest; stems retain their intended timing and tails. A silent master does not satisfy an ordinary narrated final delivery. The current helper does not mix, render or export masters/stems, and the starter does not claim an automated stem-delivery path.

Verify voice is present when requested, no sentence is cut, SFX are audible without overpowering narration, and the final audio tail fits inside the film. The example MP4 intentionally demonstrates SFX only; it contains no generated ElevenLabs voice.
