# Known pitfalls and fixes

From the first Paper Lab film's checkpoint, error log and world README. Check this list before
each stage.

## Source and spine

| Pitfall | Fix |
|---|---|
| 10-bit HEVC (DJI/phone) footage fails or stutters in Remotion | Make the H.264 crf-14 intermediate first; never render from the raw |
| Source 29.97 fps vs delivery CFR 30 | Footage frames are resampled (an occasional repeated frame); audio is never time-stretched. `trimBefore` is in 30 fps frames of output time |
| Source true peak above 0 dBTP | Check for clipped transients before mastering; the limiter catches peaks but cannot restore clipped audio |
| Whisper gives a zero-length word ("All") | In the spine: `if e <= s: e = s + 0.12`; keep fixes in the script |
| Mishearings ("mark up" vs "mug up", "part" vs "path") | Re-transcribe with medium.en; fix in a kept correction step; captions must match what he actually says |
| Cutting inside a word or breath | Snap cuts to 1/30 s inside a measured quiet gap; 12 ms fades at both ends |
| A phrase is said twice -> `cue()` throws | Pass `nth` explicitly; this is intended, it prevents silent mis-timing |
| Changing the EDL leaves stale timings | Re-run the spine, `dump-beats`, `dump-events`, `mix.py`; never patch seconds by hand |

## Picture

| Pitfall | Fix |
|---|---|
| **Empty top third** in style frames (the still caught a stream of points too late) | Spread per-element timing phases so any frame shows the source, the stream and the result together; check that no still is more than ~1/4 flat paper |
| Hook words sit near his hair (y 250-750) at the end of the hook | Check stills at every hook word; shrink or raise lines; keep at least ~40 px above the hairline |
| A sparse moment in a pull-back (a small cluster on plain cork) | Pin the far content in before the camera reveals it, not on a later word |
| A caption strip sits over a card during an overlapping scene transition | Check the cuts sheet at every boundary; end the outgoing scene's text before the new caption |
| Wide card edges read as stray bars at the frame edge | Reframe: move the camera back or the card inward; no partial cards cut by the frame edge unless clearly intentional |
| Board clipped at the right edge | Move the camera back; check stills at the extremes of each camera move |
| Labels too small to read on a phone (typewriter labels, a 31 px end-card follow line) | Minimum ~28-30 px for labels, at least 36 px for the end-card follow line |
| Maths font mismatch (system Cambria Math fallback beside handwritten cards) | One face for all equations; draw special glyphs or use Caveat |
| A "hand" drawn as a robot gripper | If the line says hand, draw a hand (animated-video finish bar: show the hand doing it) |
| Duplicate SVG ids (`clipPath`, masks) across components | Give every `Polaroid`/`Dotted` a unique id |
| Background box lingering half-transparent while the presenter moves | Fade the background only in the first/last 45% of a move (presenter `mix`) |
| Matte flicker at range edges | Ranges with ~0.6 s margins; use a matte only inside `[o0+0.02, o1-0.04]`; never straddle an EDL cut |
| Unstable last frame | Freeze the end scene (`tf = min(t, end + 1.4)`) so the last ~0.3 s is static |
| Frame 0 blank | The first hook word is visible at frame 0 (`at = -0.4` for word 0) |

## Captions

| Pitfall | Fix |
|---|---|
| **Spaces lost around emphasis words** (styled inline spans swallowed the whitespace) | Put an explicit `{" "}` text node or margin between word spans; check a still of every chunk with emphasis |
| Caption over the face in SIDE | Region x 555-930, y 1215-1500 beside the cut-out, left-aligned, 48-56 px |
| Caption text differs from the audio after a re-cut | `captions.ts` throws on mismatch; update `LINES`, never disable the check |
| Black box behind captions (looks cheap; avoid) | Paper strip per line (box-decoration-break), not a block background |

## Audio

| Pitfall | Fix |
|---|---|
| **Music far too low** (first pass -53 LUFS, inaudible) | Raise `MUSIC_DB`; measure the music stem; target ~18 LU under the voice |
| **Shape broadcasting errors** when summing SFX (`operands could not be broadcast together`) | Sum with `mixl()` (pads to the longest); never `a + b` on generated arrays |
| `dsp.hz()` has no sharps (`F#3` fails) | Use `f0()` in mix.py, or flats |
| `ARR` KeyError for new beat ids | Rewrite the arrangement table per film |
| SFX on top of key words | Effects start a frame before the hit and are pulled at least 12 dB under the voice band during speech |
| **Loudness short of target** (render loudnorm gave -15.9 LUFS) | Use `finalize.sh` (compress, measured gain, oversampled limiter): -14.5 LUFS / -1.7 dBTP |

## Machine and process

| Pitfall | Fix |
|---|---|
| **System disk full** (1.8 GB free killed a render mid-mux, "No space left on device") | Before rendering, check free space; delete only this project's regenerable `out/bundle-*` (~3.7 GB for two); render with `TEMP/TMP/TMPDIR` on D:; remove the temp folder after |
| Large intermediates pile up (mix previews 30 MB each, masters 300-470 MB) | Delete superseded renders (keep the delivered master and its QA); never delete the raw or earlier projects |
| Background animator agents died with API 409 mid-build | Keep shared files read-only, have each agent own its files, checkpoint often, be ready to finish the world yourself |
| A Python patch script aborts halfway on an assertion | Re-read the file after any scripted patch; prefer the Edit tool for multi-line changes |
| 3D/WebGL comps need `--gl=angle` on Windows | Already in render.sh/snap.sh; keep one WebGL canvas mounted at a time |
| A full render used to discover layout bugs | Stills and the board first; render only after the stills pass |

## Revisions and delivery (v2/v3, 2026-10-14/15)

| Pitfall | Fix |
|---|---|
| Whisper merged a repeated phrase ("it can, it can" -> one "It can" spanning both) | Re-transcribe a 4-6 s clip of the source with word timestamps; patch that word's source times in `build_spine.py` before mapping |
| Captions dropped a word after pause trimming ("are" vanished) because Whisper put its start inside the trimmed silence | Map word starts to the next kept frame and ends to the previous one; drop a word only if <25% of it survives |
| Visible jump cuts in full-frame shots after pause trims | Zoom cut: `punch` flips 1.0/1.07 per EDL segment in FULL/FWD |
| Two cuts 0.6 s apart (word cut + pause cut) = a double jump | `plan_cuts.py` skips pause cuts within 1.2 s of any word cut |
| A cut removed a cue word, so `cue()` throws (or worse, silently resolves to another occurrence: `cue("beautiful", 0)` became "how beautiful") | After every word cut grep beats.ts, T.ts, timing.ts and captions.ts for the cut words; re-point to the next phrase |
| Matte layer drifted across a cut inside a SIDE stretch | MatteLayer renders one Sequence per EDL segment the window spans |
| `--scale=1.3333333` -> "height must be an integer, but is 2559.999936" | Use `--scale=1.3333333333333333` |
| Bash `read` of Python output kept `\r` -> ffmpeg "Expected number for frames:v" | Python writes `\n` only (`sys.stdout.buffer.write(...encode())`); avoid escaping `\r` through nested heredocs |
| End-card tape placed with a manual translate sat off-centre | `torn()` paths are already centred on 0,0; place text at y +16 for an 84 px strip |
| 1440 delivery over 300 MB at 24 Mbps for a 2.5 min film | maxrate = min(24M, 0.95*300MB*8/duration); say so in the report |
| An image-generator download via Playwright `waitForEvent('download')` times out | The click still downloads to `~/Downloads`; copy it from there |
| Long Bash/Python heredocs with mixed quotes failed to parse | Write the patch script to a file with the Write tool, run it, delete it |

## Train-set news Reel (CS degree, v1-v8, 2026-10-20/25)

| Pitfall | Fix |
|---|---|
| **One analogy said too often** ("we have said 'train' so many times") | At the concept stop, count the analogy noun in the script. Say it once or twice, and offer EDL cuts of the repeats. Let the props carry the metaphor silently. v8 cut the build beat, the four-train cards and the choose beat (57.3 s -> 43.1 s) |
| A catalogue of variants (four train types) dilutes the gag | Keep one hero object plus one sharp gag (the bullet train on a Himalayan plateau: right tech, wrong customer) |
| His face small with blank board around it (v5) | v6 staging: cut-out at 0.88, graphics in the top band + right column, captions in the right column |
| Re-encoded alpha WebM malformed ("Element ... exceeds containing master element", header duration longer than the clip): wall chunks inside the cut-out, face partly cut away in Remotion stills | Cause (Oct 2026): two build/matte jobs ran at once and wrote the same file. Run ONE build chain at a time, delete the old matte before matting, and check `ffprobe` frame count = edl frames before any stills or render (a clean rebuild fixed it) |
