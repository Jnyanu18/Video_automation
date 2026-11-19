# Known pitfalls and fixes

Every gotcha from the quantum film (PROGRESS.md, ISSUES.md #1-#88, agent reports, v2-v6). Check this
list before each stage.

## Machine and tools

| Pitfall | Fix |
|---|---|
| `python3` is the Windows Store alias (opens the Store / does nothing) | Use `py -3.13` or `$PY` from `config.sh`; `py -3.11` for OpenCV YuNet; `$CUDA_PY` for torch |
| faster-whisper on the GPU (workspace rule: force it to CPU on this Windows machine) | `device="cpu", compute_type="int8"` everywhere (medium.en for words, large-v3 for doubt checks, small.en for the CTA) |
| **System disk nearly full** (0.7-2.6 GB free, moving while renders run): two full renders died mid-way with FFmpeg pipe failures / timeouts | Remotion temp, ProRes intermediates and matte masters in `<HEAVY_TEMP_DIR>/<slug>` (`config.sh` exports TMP/TEMP/TMPDIR); `df -h /c /d` before heavy steps; delete `out/bundle-*` after stills; lower concurrency if memory is tight |
| A full re-render to fix 2 s | Re-render only the frame range and splice it with `finalize.py` (one encode); check splice frames; v3 did this |
| `board.py` from the animated-video template asked for a macOS font (`/System/Library/Fonts/...`) and fell back to PIL's tiny bitmap font | Template `board.py` tries Windows `arial.ttf` first |
| The animated-video template `render.sh` skipped faststart and Remotion wrote **full-range yuvj420p BT.601** | `--color-space=bt709` on render, then an x264 encode with `scale=out_range=tv:out_color_matrix=bt709`, `-color_range tv`, bt709 tags, `+faststart` (render_ig.sh / render.sh); `qa.sh` checks color_range=tv and moov before mdat |
| Fonts fetched ad hoc from a free CDN (a sub-agent did this) | Load fonts with `@remotion/google-fonts` `loadFont` + explicit weights in `kit/palette.tsx`; the render machine needs network for them, or ship .woff2 in `public/` with `@remotion/fonts` |
| `--scale=1.3333333` -> "height must be an integer, but is 2559.999936" | Use `--scale=1.3333333333333333` exactly (render the 1080x1920 comp natively at 1440x2560) |
| `npx tsc` in a folder without the project's node_modules installs a fake `tsc` package | `npx --no-install tsc -p .` |
| `git init` inside the workspace | Never (workspace rule overrides animated-video step 8) |

## Voice and spine

| Pitfall | Fix |
|---|---|
| **"won't" -> "would"**: an energy-threshold silence cut clipped "n't" and inverted his claim | Cut only in gaps between Whisper words (> 0.30 s), keep 60 ms pad each side (<= 0.24 s kept); re-transcribe the result and diff the word list (`spine/gapcut.py` exits on any change) |
| **"waving your hands, your hands"**: a take's in-point (Whisper's word start) included the end of the previous word | Large-v3 Whisper over the whole finished spine; measure the trough on a 5 ms envelope and set an exact in-point (`IN_AT`) |
| Whisper hears the master's short "hit follow" as **"head follow"** | Check the raw take and the envelope; it is a Whisper mishearing of a 0.11 s "hit". Re-time the word in `fix_words.py` relative to the piece (not by hand), caption reads "hit follow." |
| Whisper mishearings ("booth" for "pool", "we'll" for "you'll", "tens of pillion") | Compare with the take's own transcript and large-v3; keep fixes in `fix_words.py` |
| Whisper starts a piece's first word inside the 0.12 s lead-in | Clamp it to the measured voice onset (`fix_words.py`) |
| DJI mic vs the PC recording sound different at window edges | Same clean-up chain, 1/3-octave EQ match, per-take loudness match, seam levelling; still listen at every window edge and say so |
| A seam cannot be levelled both ways (v6 window 2: the voice-over rises 3.5 LU across the window) | Report the residual step (~+-1.4 LU) instead of over-correcting |
| He said "in 60 seconds" in a ~2-min film (v5 #81) | Script the length honestly; v6 retake says "in the next 2 minutes" |
| `cue()` throws on a missing or repeated phrase | Intended. Pass `nth`; after any word change grep beats.ts, events files and captions for the old words |

## Presenter

| Pitfall | Fix |
|---|---|
| HeyGen clips are **25 fps** inside a 30 fps film | Map by time: `startFrom = (offset + t - window start) x 30`; never by frame number |
| VP9 alpha decoded with the default decoder loses alpha | Decode with `-c:v libvpx-vp9` (ffmpeg) and encode with `libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0`; Remotion `OffthreadVideo transparent` |
| The HeyGen webm has an **Opus audio track** | `OffthreadVideo muted`; the VO is `public/vo.wav` only |
| HeyGen job finished but nobody downloaded it: **3-hour wait** (v5) | Poll and download immediately on completion; verify alpha, fps, duration, audio sync |
| Long avatar holds read as AI (12-15 s holds looked weird) | 3-4 s bursts by default; the approved look; longer only when he asks |
| Every take looks off-lens (script screen to his left) | Script notes: read from a prompter near the lens; measure gaze and pick the most lens-facing sentence; report it |
| Hand over mouth/face on the best sentence | `facestrip.py` at 0.2 s; take another take's sentence |
| Presenter popped in already ~64% on screen / vanished mid-exit (v5 #64) | First frame fully off, last frame fully off (IN_FR 9, OUT_FR 10) |
| Jump cuts inside a window | Hard zoom cut (`cut: true`) on the exact cut frame (`ceil(t*30)`) |
| The matte keeps keyboard/chair scraps at the bottom | Body fade above `CLIP.cutY`; never show the bottom rows |
| Captions touched his moving head | `faceSpan` over the caption's whole span, column ends 36 px before it |
| The caption shade's hard bottom edge lay across his body (v5 #80) | Fade the shade out at its bottom |
| 10-bit HEVC takes in Remotion | Never; Remotion only reads the VP9-alpha mattes |

## Picture and layout

| Pitfall | Fix |
|---|---|
| One-frame camera snaps, things teleporting (coin through maze walls at 80-130 px/frame) | Ease every move (22-frame push); re-route impossible moves (an arc through the air at ~15 px/frame) |
| Text under the IG top bar during pushes ("EXIT = ANSWER", "codes", FOLLOW) | Hide tags before pushes; check stills at the extremes of every camera move |
| Captions on bright objects (gold tiles, the chip during a dive) | Dim the object under the caption band or move the beat after the line |
| Captions running to 3 lines into the bottom band | Split the sense unit; max 2 lines; centre captions top 1362 |
| A comparison too short to read, or waves slowed to near-stop | Hold >= 3 s; slow to ~35%, not 10% |
| Cover lacked the claim and the hook object's name (v2) | Frame 0 = headline + named hook object + the race numbers + him |
| Odometer rolling through fake digits | Show the exact number and freeze once its digits land |
| A hook composed around an avatar that later left | Recompose: fill the lower frame (reflections, floor pools, dust) |

## Process

| Pitfall | Fix |
|---|---|
| **Sub-agent died with API 409** mid-build | Each agent owns disjoint files; shared files read-only; checkpoint (PROGRESS/ISSUES) after every step; be ready to finish an act yourself |
| **Judges stalled** and returned nothing (v2 round 2 motion/story) | Spot-check that lens yourself on stills and dense strips; say in the report which lenses had no independent judge |
| Fixers introduce regressions | Spot-check every fix on stills before the next render |
| A full render used to find layout bugs | Stills, board and dense strips first; render after |
| Effects masked the voice (median 12.7 dB, 47% of speech < 12 dB in 1-4 kHz) | FX bus -3 dB, -10 dB 1-4 kHz duck under phrases, 16 dB cap, cues off key words; measure again |
| Music swells in short speech gaps | Hold a partial duck through gaps < 1.3 s |
| Over 300 MB at 24 Mbps for a 115 s film (349.7 MB) | maxrate = min(24M, 0.95 x 300 MB x 8 / duration) with crf 14 kept; never reduce resolution |
| Nobody has watched or heard it | Say so in every report; music/SFX are SYNTHETIC + CC0 and unauditioned |
