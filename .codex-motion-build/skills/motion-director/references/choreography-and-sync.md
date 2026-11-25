# Choreography and synchronization

Use this guide with [production-direction.md](production-direction.md), [audio.md](audio.md) and the selected motion recipes. Coordinate attention, meaning and timing before adding effects. Preserve brand choices, approved facts and readable copy.

## What the reviewed examples establish

The sampled 2D dental reel pairs large action words with illustrations of brushing, flossing and a marked calendar. Its bold headline and italic supporting line have distinct roles, while the repeated layout gives each action similar pacing. The 3D reel shows a tooth, separated implant components with labels, an assembled object and a smile and identity ending. Review observations come from the exported videos. Use the [v1.9 review notes](../v1.9-verification.md) for the timing evidence and its limits. Use approved anatomical assets and terminology.

The [photo-studio source](../examples/frame-photo-studio/README.md) evaluates one hero card across scene changes. It projects a cursor target, and its score has an authored shutter at the named selection frame. Check the encoded playback separately from the authored cue schedule.

## One focal action per beat

For each stable scene ID, record the main message, focal object, trigger, movement, type role, settlement and outgoing handover. One dominant action can include supporting motion: a brush stroke is the focus while small sparkles reinforce it. Avoid giving a headline entrance, camera move, unrelated orbit and background burst equal emphasis at once.

Assign type a job: emotional hook, action instruction, object label, supporting context or CTA. A useful sequence is headline establishes intent → object performs the action → supporting copy completes the thought. Simultaneous arrivals remain appropriate when they read as one event. For technical callouts, make the labeled part distinguishable before revealing its leader and name.

## Persistent hero or meaningful handover

Keep the hero's logical identity, visible anchor and spatial orientation across related states. A tooth-to-assembly sequence should explain the relationship; matching white shapes alone is insufficient. An illustrated brush can hand attention to floss through a shared target or purposeful cut without pretending the two objects are literally one mesh.

Specify what becomes what, where the viewer should look next and when outgoing content yields. In the photo-studio pattern, selection causes the same card to become the macro view; its physical flip reveals the product image. Recompute projected cursor contact after camera transforms. Preserve front/back orientation and prevent supporting objects from crossing the hero's important detail.

## Audio markers and intentional offsets

Derive visual events and cue placement from the same timing ledger. Give each event a stable ID and output frame. For a cue, record its approved asset, source marker, alignment intent and intentional offset. Convert the source marker to output-frame units before calculating:

`cueStartFrame = eventFrame + offsetFrames - sourceMarkerFrame`

Choose onset for contact, a perceptual peak for an impact or an ending marker for a riser. A whoosh can lead its arrival; a nonzero offset is not automatically a bug. Handle negative starts explicitly rather than silently truncating the intended marker. Retiming the event should retime its linked cues. Verify the encoded result by listening and frame review; metadata alone cannot prove perceptual synchronization.

When a production plan and confirmed source marker are available, run `npm run plan -- project.json plan.json report --sync-review markers.json` from `starter/`. The [marker schema](../schemas/sync-review.schema.json) binds each check to the project revision and FPS. Each check names the visual `eventId`, the played audio `cueId`, its marker in `sourceSeconds`, and the measurement evidence. A positive `audioOffsetFrames` places the sound after the action. Supply an `observedVisualFrame` after inspecting the render. The report gives planned and observed signed offsets and nearby frames to inspect. The default tolerance is one output frame. Choose it for the actual event and FPS. The check uses the source marker, so confirm the audible transient in the encoded mix during review.

## Settlement and reading checks

Inspect frames before, at and after contact, reveal, handover and settlement, then watch full playback. Check residual motion, late glyphs, callout collisions and whether the supporting copy arrives while its subject is still visible. Budget reading time after the last meaningful reveal, not merely from scene start. Keep the complete CTA settled through its planned final hold and preserve the audio tail.

Report what was sampled, source-inspected, measured and played. A contact sheet demonstrates composition at selected times; it cannot certify fluid motion or audio quality. These checks refine the existing preview process and add no approval stages or renderer capabilities.
