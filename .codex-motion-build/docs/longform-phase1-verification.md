# Phase 1 — independent verification (2026-11-20)

Tester: Claude Code. Every number below comes from rerunning the commands, not from
`docs/longform-phase1-results.md`.

## Verdict: one gate fails. Everything else passes, including two things the original run
## could not test at all.

The submitted run was measured on `raw footage/cuts`, which is **ten clips of ~2.5s with no
audio stream — 29.87 seconds in total**. At that size per-process overhead dominates the
timing, nothing can be grouped across cameras, and the sync and speech paths never execute.
So the gate numbers in the results doc describe the harness, not the product.

To its credit, the results doc said so itself rather than hiding it.

## The corpus I built instead

Two cameras from the same clips, concatenated and muxed with one shared room-audio track:

| | |
|---|---|
| `CAM_A/cam_a.mp4` | 896.00s, 1080x1920, h264, AAC |
| `CAM_B/cam_b.mp4` | 883.50s — started 12.5s later, same audio |
| total source | 1779.5s (29.7 min), **60x the original test** |
| ground truth | 2 cameras, true sync offset **12.5s** |

Rebuild it with ffmpeg: concat the ten clips 30 times for the video, mux a
`anoisesrc`+`sine` bed for audio, then cut CAM_B with `-ss 12.5` on both inputs.

## Results

| gate | target | measured | |
|---|---|---|---|
| `realtime_factor` | >= 6.0 | **3.64** | **FAIL** |
| `keep_ratio` | 0.05–0.25 | 0.194 | pass (but see note) |
| `model_calls` | 0 | 0 | pass |
| reject vocabulary | fixed set only | `too_short`, `out_of_focus` only | pass |
| audio sync | recover 12.5s | **-12.5s, `audio_xcorr`, confidence 0.77** | pass |
| cross-camera moments | group angles | 1570 shots -> 658 moments, **526 with >1 angle** | pass |
| package isolation | no FastAPI/engine import | clean under `python -I` | pass |
| unit tests | >= 25 | 34 passed | pass |
| engine suite | still green | 433 passed / 1 skipped | pass |

**The tool's self-reported `realtime_factor` of 3.64 matched my independent stopwatch of
3.63.** The instrumentation is honest; it was simply pointed at the wrong size of input.

### The failure, in product terms
At 3.64x, eight hours of footage indexes in **~2h12m**, against the ~80 minute target. And
this was 1080x1920 h264 transcoded from tiny source clips — real event footage is 4K at a much
higher bitrate, which pushes the number down further.

**Where the time goes: `proxy_seconds` is 297s of the 488s total — 61% is proxy transcoding.**

One caveat in the other direction, which must be checked before optimising the wrong thing:
the proxy pass parallelises *across files*, and this corpus has only **two** files, so it could
only ever use two cores of the machine. A real multi-camera shoot arrives as dozens of card
files, where the existing parallelism would do much better. So 3.64x is the worst case for file
count and the best case for resolution.

Next step for whoever picks this up: re-measure with ~20 files of 4K footage before changing
any code. If it is still under 6x, parallelise *within* a file by segment (split, transcode
segments concurrently, concat) rather than tuning ffmpeg flags.

## Two results that are artifacts of my corpus, not product findings

- **`too_short` rejected 1189 of 1570 shots.** My corpus is 2.5-second clips concatenated, so
  almost every detected shot is ~2.5s. Real footage has long takes. The `keep_ratio` of 0.194
  therefore landed inside the gate by luck and should not be treated as validated.
- **`speech` returned 0 segments** despite both files carrying a full audio track. My audio is
  pink noise plus a sine tone, so classifying none of it as speech is arguably *correct*. The
  speech and diarization path is therefore still **untested, not broken**. It needs a corpus
  with real spoken audio — a recorded speech or a vows-like passage.

## What this means for Phase 2

Phase 2 is safe to start: the index it consumes is structurally sound, the schema round-trips,
sync works, and moment grouping works. The throughput problem is contained in the proxy pass
and does not change the index format. Do not start Phase 3 planning work until the speech path
has run against real spoken audio, since `prefer: speech_whole` beats in the rundown templates
depend on it entirely.
