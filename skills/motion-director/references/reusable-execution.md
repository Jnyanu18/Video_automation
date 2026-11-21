# Repeatable direction and execution

The skill must carry the process that produced the stronger examples. The agent supplies creative judgment while following this process; that judgment is part of executing the skill. A one-line prompt must not depend on an operator adding a private storyboard, special code or a separate repair brief.

## Choose an executable direction

Resolve the brief and compare the complete catalog, then consider two concise approaches internally: the clearest subject-led journey and the most expressive brand-appropriate journey. Select the stronger fit to the actual message, assets, duration and registered renderer. Record one primary family, up to two secondary jobs, the focal object and the ending. Do not expose a menu of effects to the consumer or ask them to direct every cut.

Sparse wording such as “dynamic reel for our event brand” can justify inferred kinetic typography and connected stage geometry. It does not require the user to name spring math, a camera or a persistent object. It also does not establish facts about the business. Invent creative staging, not customers, services, offers, proof or a contact destination.

Use real implementation evidence when selecting a renderer. The standard registry supports seven basic scene kinds; it cannot render a persistent event pass or photo object merely because a plan requests one. The [event-stage example](../examples/event-stage/README.md) implements a particular 15-second portrait graphic journey. [FRAME / STUDIO](../examples/frame-photo-studio/README.md) implements an image-led journey. Adapt the relevant implemented source, or build and test a custom component. A request outside a template's dimensions, duration, language, asset or motion support needs real adaptation and revalidation; never relabel the fixed template as a universal engine.

## Persist the directing decisions

Before coding, write a compact execution brief alongside the resolved brand:

1. **Message and ending:** one main thought, exact identity/CTA, and the first fully readable final frame.
2. **Beat ledger:** named launch, contact/arrival, first-readable and settlement events on one integer frame clock. Choose actual recording markers early, or author an original score against this ledger. A target BPM alone is provisional.
3. **Shot jobs:** focal subject/action, type role, composition, camera destination and an explicit outgoing handover.
4. **Motion assignments:** character/line/whole-word treatment, shell deformation, object mass and camera response. Use different mechanisms where the story benefits; do not give every headline the same stagger.
5. **Implementation and assets:** registered component or source adapter, exact approved files, unsupported mechanisms and labeled preview stand-ins.

Keep all visible brand, copy, event timing and approved assets in editable data. Geometry and authored action logic may live in reviewed source. Export a custom schema for a custom component instead of inventing fields in Project v1. Revisions bind the plan, source, asset hashes and preview together.

## Make type and physics express the same event

- A word intended to strike on a beat must be recognizable on that beat. Use a whole-word state change with a short impact response, or launch a stagger early enough that its last essential glyph is readable at the event. Do not start a long letter entrance on a 30-frame word-swap beat and replace the word before it settles.
- A bounce/contact sound needs the visible boundary on the receiving surface at the contact frame. Derive the boundary, baseline and ripple from the actual pose and the same event. Check the transformed coordinate space, not just two unrelated Y constants.
- Preserve live velocity during target changes. Squash/stretch and global resizing are separate; a landing usually compresses along the contact normal and expands perpendicular to it. Check the rendered result rather than trusting a spring preset name.
- Let scale change the composition. A stage/card can become an environment, a macro view can pull back into an asymmetric group, and a group can collapse to identity. Keep the subject continuous without leaving the same centered sticker beneath a new headline in every shot. Repeated instructional framing can be intentional; record why.
- A covering transition must cover all outgoing layers or make them yield before coverage. Include text, HUD and shadows in the inspection. Sample immediately before, at and after the hidden cut. A large rectangle's bounding box does not prove opaque pixel coverage.

Implement semantic timing functions and pose evaluators shared by visuals, cues and tests. Do not let animation use hardcoded270/300/330 while music reads differently editable events from JSON. Test at least one actual retime and confirm both the visual state and cue target move together. Author or stage the final score from the current ledger; never use an old WAV after changing the ledger without regenerating/re-resolving it.

## Preserve real assets

Stage the supplied logo as an actual local approved file. Keep its exact geometry and aspect ratio. Center visible artwork bounds and inspect at maximum enlargement. Do not redraw or image-generate a replacement logo unless the user requests a redesign or reconstruction. An inline picture that cannot be retrieved as bytes is an unresolved asset: use a clearly labeled preview fallback and request the original file. A convincing reconstruction is still a derivative, not an exact uploaded logo.

Treat imagery and music the same way: use approved files, authorized generation or original procedural/synthesized assets with provenance. Generated event imagery must not masquerade as the brand's real portfolio. Check actual voice alignment when narration is required; no authorized voice means pending narration, not a fabricated voice ID.

## Render, critique, repair

After implementation, run this loop autonomously within the authorized draft scope:

1. Type-check, validate the custom/standard project, and test meaningful state/geometry behavior. Probe actual component functions for contacts, word readability, foreground yield, near-plane safety and retiming.
2. Render the opening, every contact/cut, three intermediate states of large transforms, each first-readable frame, and the ending. Inspect the images at delivery and phone size. Write concrete findings with frame numbers; do not substitute “premium” or a numerical self-rating.
3. Repair observed failures in framing, contrast, overlap, timing, asset fidelity or continuity. Regenerate the affected captures and invalidate prior evidence when source/assets change. A code check alone cannot close a visual finding.
4. Render/play the full draft with its actual mix. Review pacing, continuous motion, message comprehension, cue feel, final hold and audio tail. Record whether playback and listening actually happened. If tools cannot support them, leave those checks pending rather than calling a contact sheet a playback review.
5. Save `execution-review.json` with the revision/source hashes, observations, repairs, evidence and remaining limits. Use the [execution evidence checker](../starter/src/execution-quality.ts) for supplied numeric probes and declared review states. It does not render, measure pixels, listen, verify asset provenance or award artistic quality.

Retain a brief finding log: frame/range → observed problem → code/data repair → new evidence → resolved/pending. Stop when the requested behaviors and relevant checks are satisfied. Do not render indefinitely to pursue a self-assigned9/10. Report genuine unavailable tools/assets and deliver a labeled draft when appropriate; user approval remains separate from a model's quality review.

## App execution boundary

An ordinary Claude Messages request returning project JSON is a planner. It cannot run Remotion, generate audio, inspect frames or repair TypeScript by itself. The React/Supabase host needs an isolated worker/agent loop with trusted templates, rendering, inspection and bounded repair jobs. The API adapter includes this execution policy in generation and custom handoffs, but does not silently execute model-authored code. “Needs custom renderer” is an implementation task, not a completed video.

Evaluate repeatability on real prompts and brand kits with the configured model and worker. Use several seeds/runs and different subjects; inspect actual outputs and compare observed failures before/after the update. Local tests and bundled examples demonstrate their tested mechanisms. They do not establish consistent reference-level quality across arbitrary prompts. Keep this distinction in release notes without withholding an authorized draft merely because broad quality evaluation is still pending.
