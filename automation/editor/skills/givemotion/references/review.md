# Review: looking at your video, and learning from a reference

Purpose: recipes for `snapshot`, `still`, `inspect` and `check` that show you the right frames with few images, how to read a sheet, and `analyze` for reference videos and your own render.

Contents
- review: the whole video as a viewer sees it
- Snapshot recipes
- Inspect: where things are, frame by frame
- Check: fast re-checks
- Reading a sheet: what to look for
- Learning from a reference video (and reviewing your render)

## review: the whole video as a viewer sees it

`npx givemotion review video.html` (about 30 s) writes `review/` next to the page:
- `overview.png`: frames evenly spread over the whole video. Read it like a storyboard: every beat, in order, on time?
- `holds.png`: the middle of every calm stretch, large. These are the frames people read: judge each as a poster.
- `motion-N.png`: one second at 10 fps around each scene hand-over and the busiest moments. Easing, smears, the old
  thing still there when the new one lands, unreadable moving text.
- `beats.png` (with `brief.md` next to the page, or `--brief f.md`): every beat the brief times, a frame in its middle
  and one just before it ends, plus each "at 4.2 s" moment it names. Check each beat word by word: on time, complete,
  the stated numbers and states, nothing extra, nothing left from the last beat.
- `REVIEW.md`: the check report, what to look for in each image, and a scoring table. Score harshly, list the five
  worst problems with their times, fix them, run it again (two passes). A sub-agent given only the brief and this
  folder is a better critic than you are of your own page: it sees the frames, not the intent.

## Snapshot recipes

- `npx givemotion snapshot video.html` writes `snapshots/sheet.png` next to the HTML file: the key moment of every scene (one per camera shot in long camera scenes, plus frame 0). **Open it and look.** `-o review2` writes to another folder so you can compare before and after.
- **After a one-scene fix, look only at that scene:** `snapshot --times 12,13.5` (seconds, or frames like `45f`; e.g. `snapshot --times 2,5.5,9`) shows exactly the moments you choose. Use `inspect` to find the scene's start. This costs one small image instead of a whole sheet.
- `snapshot --transitions`: the start, middle and end of every scene change (ghosted text, empty middle frames). It knows only the engine's own transitions (`data-transition`); a scene change you built yourself (overlapping clips, a band or wipe in `gm.onFrame`) is not in the automatic sheet either, so look at it with `snapshot --times 2.05,2.13,2.2` around its cut.
- `snapshot --from 3.2 --to 3.8 --every 1f`: a frame-by-frame strip of one move (easing, overshoot, a flicker). `--every 0.5` for one frame every half second, like the judges' sheets.
- `snapshot --from 3 --to 4 --every 0.1 --trail` also writes `trail.png`: the frames layered into one picture, earlier ones as fading ghosts under the last. One image shows a move's path, arc and spacing (bunched ghosts = slow, spread = fast), so you can judge its easing without opening a strip.
- `snapshot --grid`: thirds, the center and the safe zone (`data-safe-zone` / `--safe-zone`) drawn over the pictures, for balance and margins.
- `--max 12` (automatic moments, default 12), `--cols 2` (fewer columns = bigger pictures, to read small text), `--sheet-only` (only `sheet.png`), `--transparent` (checkerboard behind; auto-detected), `--data f.json` / `--props '{…}'`.
- `npx givemotion still video.html -t 3.2 -o f.png` renders one exact moment at full size (to read small text or check a detail).

## Inspect: where things are, frame by frame

- `npx givemotion inspect video.html` prints JSON: size, fps, duration, frames, every clip's real start/end (selector, start, end), transitions, media, camera shots with what each shows (`shows`: world area x, y, w, h and zoom), issues.
- `inspect video.html --at 4.5 --el "#logo"` prints where an element is on screen at that moment (screen box, opacity, transform, visible), and which clips are on screen with their local time (the clock that `data-enter` delays and `at` options count in), plus any `gm.log` output at that time.
- `inspect --at 2 --to 3 --el "#logo"` (`--every 1f`) prints its position, size and opacity frame by frame: check easing and speed without watching.

## Check: fast re-checks

**Write the brief's times on the elements** and let `check` hold you to them: `data-expect="in-by 4.2; hold 1.5; gone-by 9"` on a label (visible by 4.2 s, readable 1.5 s, gone by the hand-over at 9 s), `in-frame` on anything that must never be cut. Every `check` then reports a broken promise as an error (`expect-failed`), so a later edit that pushes a label into the next beat cannot slip through.

- `check --at 7.5` re-checks one moment fast after a fix; `--from 6 --to 9` part of the video; `--fast` uses fewer samples (quicker, may miss short problems); `--samples 10`; `--safe-zone shorts`.
- Problems list every time range they happen in; times also say how far into the scene the problem is. How check decides and what each code means: `references/check-codes.md`.

## Reading a sheet: what to look for

Go through this list on every sheet (these are the things blind judges named most):
1. Frame 0: is something there, and does it hook?
2. Any cell where text is cut by the frame edge, or a neighbour's label half in frame?
3. Any cell that is nearly empty, or where everything sits in one corner or the top half?
4. Secondary text (subtitles, axis labels, code, labels in wide shots): would it read on a phone?
5. Two neighbouring cells that look the same (a hold): is something still moving?
6. Transition cells: ghosted double text, or a muddy half-and-half frame?
7. The end: does it land with a payoff and stay alive, or sit still for 2 s?
8. Variety: do several scenes use the same layout?
9. Is the look consistent (palette, fonts, motion) from start to end?
Remember the motion strip at the top of `check`: long flat runs (`▁▁▁▁`) are stalls.

## Learning from a reference video (and reviewing your render)

`npx givemotion analyze reference.mp4` turns any video into a report you can read: every shot with its length and camera move, the scene changes and their type (`cut` `fade` `dip` `wipe-*` `push-*` `zoom-in/out` `iris` `clock`, best guesses; a whip reads as `push-*`), a pacing strip, the palette (background, accents), where the detail sits, and how many cuts land on the beat. It ends with a style recipe in givemotion terms, and writes `analysis/<name>/sheet.png` (the whole video at even steps) and `shots.png` (start, middle, end of every shot): **open both**.

- Options: `-o <dir>`, `--every 0.5` (seconds between pictures on sheet.png), `--no-sheets` (only the report, faster), `--no-audio` (skip the music analysis), `--json`.
- To match a reference, analyze it first, build, render, then `npx givemotion analyze out/video.mp4 --compare reference.mp4`, which lists the differences ("yours: median shot 2.4 s, reference 0.9 s").
- Transition types are guesses from the pixels; trust the shot times and the sheets more.
- On your own render, `analyze` is a good last pass: the share of the picture that changes per half second (judges' favourites changed 26-40%, slide-like videos 12-22%) and the median shot length.

## Is the motion natural?

- `npx givemotion analyze out/video.mp4 --motion` adds a smoothness report: camera dead stops between moves, stop-and-go, sudden velocity changes (full-speed starts/stops, sharp turns), jerk, the share of fast frames that have motion blur (strobing), and a 0–10 naturalness score. Works on any MP4, also a reference video.
- `--strips [n]` also writes `strip-1.png` … (default 4): the busiest 1 s moments at 10 frames per second, each frame labelled with its time. Open them to see the spacing of a move: even gaps = constant speed, gaps shrinking into the landing = a good ease-out, a jump between two frames = strobing.
- `check` already warns about the usual causes: `camera-stop`, `fast-no-blur`, `straight-move`, `same-ease` (`references/check-codes.md`).
