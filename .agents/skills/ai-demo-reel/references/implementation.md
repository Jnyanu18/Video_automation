# Implementation and cold-start handoff

## Portable capability check

This folder contains instructions, design tokens, React layer primitives, a contract example and local validation scripts. It does **not** contain a finished new video, private source media, voice/identity credentials, complete app-capture automation or an active review server. Another model needs file access, a local renderer and media tools; genuine capture also needs supported browser/screen controls. Discover those capabilities in the current harness rather than reusing tool IDs from a transcript.

Minimum for local reuse: Node with a compatible Remotion/React project; FFmpeg/FFprobe; Python3.10+ for QA; Pillow for alpha inspection only. The known project pins Remotion/@remotion/media4.0.506, React19.2.0, TypeScript5.9.3. Preserve an existing project's tested pins. For a new project resolve dependencies with the available engine skill, save a lockfile and record exact versions. No automatic install/upgrade into someone else's node_modules or protected junction.

If you have a HyperFrames router or an editorial skill such as video-use installed, use them. Otherwise follow this folder's editorial procedure; unavailable local skill paths are not a blocker if equivalent authorized tools exist. If an essential capability/media file is missing, state the exact gap, complete the plan/script/artifacts possible locally, and do not claim a render or capture happened.

## Author using reusable layers

Copy [DemoLayers.tsx](../assets/DemoLayers.tsx) and [preset.json](../assets/preset.json) together into an independent project's source folder. These export `Capture`, `Title`, `Hook`, `GroundedPresenter`, `Captions`, `CommentCTA`, `Page` and `Window`. They are reusable primitives, **not** a complete edit. Preserve accepted project components instead when a narrow revision is requested.

Create a normal Remotion composition at1080x1920/30fps, with total frames derived from narration. Wrap each scene/layer in a `Sequence` at its actual output start/duration. Each sequence gives its children LOCAL time; captions receive GLOBAL time and sit outside those sequences. Put narration once at root; all `Capture` video layers are muted. Add captions last/frontmost. Keep a single audio owner through final assembly.

Example usage (inside a composition; sources and real words must exist):

```tsx
<Sequence from={704} durationInFrames={165}>
  <GroundedPresenter directory="avatar-frames" packedStart={152} frames={165} mirror={true}/>
</Sequence>
<Captions pages={pages} presenterWindows={windows}/>
```

`Capture` uses source PIXEL coordinates for camera `{x,y,scale}` and sorted pointer events `{seconds,x,y,click?}`; scale is outputPixels/sourcePixels. Its cover minimum avoids letterboxing. Do not pass the old2320-plane camera numbers unchanged. Convert recorded pointer coordinates to source pixels first, and omit pointers if the native cursor is already recorded. Each click event must retain the actual click location/time. Video `sourceStartSeconds` and `playbackRate` also drive cursor time. `trimBefore` in the tested engine takes composition-frame units despite inconsistent prose in some docs; the kit converts seconds using composition fps.

`GroundedPresenter` expects zero-based, output-fps RGBA files `0000.png`, `0001.png`, ...; choose `mirror` from the pose, not a blanket identity assumption. Width/height are reference1080-canvas pixels and scale uniformly for another9:16 resolution. Its source frame is `packedStart + localFrame`. It does not provide avatar audio. Short opacity entrance/exit keeps edge contact.

`Captions` expects verbatim JSON pages with `startMs`, `endMs`, `tokens:[{text,startMs,endMs}]`. Preserve leading spaces in token text. It routes a whole page beside any intersecting presenter window. Suppression intervals are only for a genuinely duplicate hook/caption line, never to hide missing speech. Do not transplant the example's11.55s suppression into another script. Measure final DOM text bounds or inspect every rendered page, not only nominal font size.

`CommentCTA` needs the true promised resource and a reveal frame relative to its parent sequence, tied to the spoken “comment.” Add a restrained right-side contrast fade only in the closing scene if necessary. For the result, use real moving footage, not `Capture`'s website contrast treatment. `Hook` accepts text with newline breaks and the actual display duration. Give hooks at least3frames. Titles and hooks must not compete in the same top band: schedule the title after the re-hook or move the relevant duplicate.

The primitives preserve the key style, but camera framing, actual recorded steps, word-safe timing and claim evidence remain project decisions. Check resolved fonts, legitimate package versions, current platform safe zones and the rendered outcome.

## Prepare alpha correctly

Probe the actual native source. For VP9 alpha, put `-c:v libvpx-vp9` BEFORE `-i` when needed; otherwise alpha can disappear. Inspect union alpha over all frames before any crop. The historical source1080x1920 could safely remove its top600 transparent rows; another source may not. An explicit transparent border in the new preparation is not a larger person.

Historical preparation example ONLY after confirming that exact crop/source:

```text
ffmpeg -c:v libvpx-vp9 -i avatar.webm -an -vf "fps=30,crop=1080:1320:0:600,scale=828:1012:flags=lanczos,format=rgba" -frames:v 488 -start_number 0 avatar-frames/%04d.png
```

For a new packed source derive frame count/durations from the actual audio. Never reuse488 frames or old speech windows blindly. `-an` ignores the source audio during image preparation; keep final narration elsewhere. Source25fps -> output30fps legitimately repeats some pictures; do not speed up the lips to avoid duplicates. Preserve high-resolution native source and prepared frame mapping.

## Machine checks

Copy [contract.example.json](../assets/contract.example.json) into the project's `edit/contract.json`, then replace every media path, measured duration, scene/window and caption page. Paths are relative to that contract; absolute paths work for local-only inputs. Split the walkthrough into actual narrated steps, not one placeholder range. Empty expected captions intentionally fail the check. Protected files are entries `{path,sha256}`. `presenter.enabled=false` requires no presenter windows. No visual preset is a release approval.

Use an output receipt path in the project, never under the installed skill:

```text
python SKILL/scripts/qa.py contract edit/contract.json --assets --out edit/verify/contract.json
python SKILL/scripts/qa.py alpha edit/avatar-frames --width 828 --height 1012 --count 488 --mirror --rect 620 712 1010 892 --out edit/verify/alpha.json
python SKILL/scripts/qa.py master edit/final.mp4 --frames 1500 --fps 30 --approved-audio edit/approved.mp4 --out edit/verify/master.json
```

`SKILL` means this extracted skill directory, not a literal path. Substitute actual project values. `--rect` may repeat and uses pixel rectangles relative to the displayed PREPARED presenter image, after mirror (x,y are canvas coordinates minus presenter left/top). For v6, top=908; caption y1620 becomes712. For windows with different texts, use their actual rectangles and relevant frame subsets when necessary. Outside-image portions are transparent. The alpha command conservatively checks all given frames and every rectangle; it fails visible floating gaps and collision, not just a misconfigured box. It also reports opaque bounds/coverage and duplicate runs. Inspect the final encoded output for orientation, hair/hands and edge contact separately.

`contract` checks contiguous picture ranges, valid half-open windows, source bounds, complete caption timing and grounding fields. With `--assets`, it also checks real files, measured media durations, exact prepared frame filenames/count and protected hashes. A structural-only pass explicitly does not prove media or visuals. `master` checks complete decode, frames/CFR, matched A/V durations, codec/color/pixel format/fast-start, black intervals and measured loudness; if `--approved-audio` is supplied, AAC packet equality is required. Do not supply it for intentionally changed audio. Missing dependencies, malformed contracts or failed checks return nonzero. No automatic fixes or provider calls occur.

Run the kit's regression tests with `python -m unittest discover -s SKILL/scripts -p "test_*.py"`. Pillow is needed for alpha tests. These tests are not a new video's QA and do not substitute for visual/audio review.

## Final assembly and review

Use the chosen composition engine for the edit. FFmpeg is for preparation/encoding/mux/QA. If the renderer returns full-range or unexpected color metadata, correctly convert the actual range/matrix; do not merely relabel. Preserve approved AAC packets when only picture changed. Measure loudness without overwriting accepted audio; roughly-15.5LUFS/-1.5dBTP is a new-mix starting point, not an inherited normalization command.

Render and inspect a hook, dense teaching/presenter frame and CTA first. Then run the full render, machine checks, all affected caption/gesture/cut reviews and full playback. Save actual failed/passed command receipts and manual observations separately. If listening or lip-sync review is unavailable, say so. User acceptance is pending until the user accepts the exact version.

Hand off `final.mp4`, editable source/pins, source hashes/provenance, transcript/EDL/contract, review page with useful jump points, QA observations and final SHA256. Serve only the intended review directory on loopback; reuse a verified task service where possible. Check the real current media, not only HTTP200 or a queued open request. Keep credentials/private inputs out of portable archives. This skill bundle itself contains no private media; historical identifiers are not authorization for another generation.
