# Output: render options, re-rendering, overlays, embed, React

Purpose: everything about producing files: render flags and formats, the parts cache, render speed, transparent overlays, standalone pages and the `<gm-player>` embed, and React/JSX compositions.

Contents
- Render options
- Re-rendering is fast (the parts cache)
- Render cost and speed
- Overlays with transparency
- Share and embed

## Render options

`npx givemotion render video.html -o out/video.mp4 [options]`

`-o out.mp4|.webm|.mov|.gif|out.mp3|folder/` (format from the extension; a folder gives PNG frames; `--format mp4|webm|mov|gif|png`) · `--quality draft|standard|high|max` · `--crf <n>` · `--fps 60` · `--width` / `--height` · `--scale 2` (4K from a 1080p layout; `4/3` → 1440p) · `--frames 0-90` or `2s-5s` (only that part, as a new file) · `--redo 4s-7s` · `--no-cache` · `--cache-dir <dir>` · `--transparent` (with `.mov` ProRes 4444 or `.webm`) · `--muted` · `--motion-blur off|auto|8` (default `off`; `--shutter 0.5` = 180°) · `--codec h265|av1` · `--hardware` (GPU encoder; on a Mac on by default once it checks out, `--no-hardware` to turn off) · `--workers N` · `--data f.json` · `--props '{…}'` · `--seed 7` (seed for `Math.random`, default 1) · `--force` (render even with errors) · `--json` · `--progress json`.

- `still video.html -t 3.2 -o f.png` (or `--frame <n>`) renders one exact frame; `--transparent` for a PNG with alpha.
- `render v.html -o sound.mp3` (or .wav/.m4a) exports only the soundtrack.
- Motion blur is off by default: every frame is sharp, which reads cleanest for type and graphics. `--motion-blur auto` adds a smear along fast moves (capped so text and small shapes stay readable; 0-3% render time; the render log says how many frames). Use it for fast camera moves or a cinematic look, and look at the motion strips in `review` after. A number forces that many sub-frames on every frame (smooth, but each frame renders n times). The automatic smear follows elements that move (transforms, timelines, travels, cameras); what your own `gm.onFrame` code draws gets none.
- **`--scale`** takes a number or a fraction. A whole scale (2, 3) always works. A fractional one must turn the layout into whole pixels, even ones for a video file: `--scale 4/3` makes 1920x1080 into 2560x1440 (also `1.5` → 2880x1620, `1.25` → 2400x1350). `1.333` would give 2559.36x1439.64, which the browser rounds to an odd, slightly stretched 2559x1440, so the render stops before it starts and names the scale that works (`--scale 4/3`). Layout, `var(--px)` and `gm.px` stay those of the composition's own size; text and SVG are drawn sharp at the bigger size, images at their own resolution. 1 worker == N workers holds at any scale.
- `npx givemotion doctor` checks Chrome, ffmpeg and which encoder is used; `npx givemotion install` downloads the Chrome build used for rendering; `npx givemotion clean` deletes cached frames.

## Re-rendering is fast (the parts cache)

A render keeps the video in 1-2 s parts (in `.gm-parts/` next to the output) with a fingerprint of what each part shows. Render again after a fix and only the parts that changed are redone:
- Edit one scene and only that scene's parts (plus the transitions into it) are rendered.
- Inside one long scene (a whiteboard, a camera world), editing something that appears later keeps the parts before it, when it is a nested clip (`data-start`), or is held hidden by a delayed `data-enter` and is `position:absolute` or an SVG shape, and no script, camera shot or arrow names it (the log says what changed).
- Change its length and the scenes after it move, so they are redone too; change shared CSS, a script, a file or the data and everything is redone.
- The joined video is byte-identical to a full render. `--redo 4s-7s` forces a part to be redone (e.g. when a script reads something the fingerprint cannot see); `--no-cache` keeps nothing.
- `--cache-dir <dir>` (API: `cacheDir`) keeps the parts in `<dir>/<output file name>/` instead of `.gm-parts/` next to the output: for an app that writes the video to a temporary path and moves it, or keeps caches in one place. By default the parts are keyed by the output's file name, so render to the same name to reuse them. An app that names each version's output differently (`render-v1.mov`, `render-v2.mov`) would redo everything and leave a full set of parts per name: pass `--cache-key <name>` (API: `cacheKey`), one stable name per job, so every version shares one folder. A render that keeps more than 0.5 GB of parts says so in the log; `parts.bytes` in the summary gives the size.

## For apps: progress and the API

`--progress json` turns stderr into a stream of JSON lines (one object per line, nothing else on stderr; stdout still gets the `--json` summary if you ask for it):
```
{"event":"progress","phase":"open"}
{"event":"progress","phase":"frames","done":0,"total":450,"fps":0,"eta":null,"frames":450,"reusedParts":3}
{"event":"progress","phase":"frames","done":120,"total":450,"fps":38.2,"eta":8.6,"frames":450,"reusedParts":3}
{"event":"progress","phase":"encode"}
{"event":"progress","phase":"done","output":"/abs/out/video.mp4","seconds":14.2,"frames":450}
{"event":"warning","code":"text-clipped","message":"…","selector":"#title","fix":"…"}
```
Phases: `open` (Chrome and the page load), `frames` (about once a second: `done`/`total` are the frames this render draws, after reused parts; `frames` is the whole video; `fps` is the capture speed; `eta` seconds), `encode` (joining the parts and mixing audio), `done`. Other lines are `{"event":"log","message"}`, `{"event":"warning",…}` (after the render) and `{"event":"error","message","issues"}` (exit code 1).

From Node: `render(file, { output, scale: '4/3', cacheDir, onProgress: (p) => … })`: `onProgress` gets the same objects without `event` (`{ phase, done, total, fps, eta, … }`), and `render` resolves to the summary (`width`, `height`, `frames`, `seconds`, `parts`, `warnings` …).

## Render cost and speed

Without a GPU, every big element that moves on its own, every `<canvas>`, and everything drawn on top of them is redrawn on each frame, and a `filter` on a big element doubles that. A big blurred glow that stays put is almost free. `npx givemotion bench video.html` prints how much of the frame these layers cover and the biggest ones. Use `--quality draft` while iterating if you must render, and `snapshot`/`still` instead of full renders to review.

Which Chrome: `--chrome <path>` or `GIVEMOTION_CHROME`, else a chrome-headless-shell found on the machine (givemotion's own, Puppeteer's or Playwright's), else `CHROME_PATH`, else an installed Chrome. On Linux and Windows the headless shell renders about 2x faster (frame-exact BeginFrame capture; a full Chrome falls back to screenshots), and `npx givemotion install` downloads it. `npx givemotion doctor` says which one a render will use.

Memory: Chrome draws each layer in tiles, and a 4K frame with many big layers (crossfading full-frame sections, opacity or filter animations, large `overflow` boxes) needs a lot of tile memory. The engine gives each render browser up to 4 GB for tiles (more above `--scale 2`), so no tile of a frame is left out; a page that needs less uses less. If you override Chrome's flags with `GIVEMOTION_CHROME_ARGS`, do not lower `--force-gpu-mem-available-mb`: past that limit frames come out with blank rectangles or pieces of an earlier frame.

Several renders at once (other projects, other agents): all givemotion processes on the computer share one budget, so do not lower `--workers` for that. A render alone uses up to one browser per performance core (8 on a 12-core M4 Pro), within half the memory. Renders running together split that evenly: one that starts takes workers from the others between parts, and one that finishes gives them back. Bytes do not depend on the split. `--workers N` takes N regardless, and `GIVEMOTION_MAX_BROWSERS=N` sets the computer's total.

## Overlays with transparency

Leave `<html>` and `<body>` without a background, then `npx givemotion render overlay.html -o out/overlay.mov --transparent` (ProRes 4444) or `-o out/overlay.webm --transparent` (VP9 with alpha). `check` and `snapshot` detect a transparent page automatically: contrast is not judged against nothing, and the sheet shows a checkerboard. Pass `--transparent` to `still` for a PNG with alpha. Good for lower thirds, captions and logo bugs placed over footage in an editor.

## Share and embed

`npx givemotion bundle video.html -o dist/` writes a standalone page (runtime inlined, blocks expanded, assets copied; plays in any browser, served by any static web server, not opened as `file://`), `gm-player.js` and a demo `player.html`. Embed in a site or app: `<script src="gm-player.js"></script><gm-player src="video.html" controls autoplay loop muted></gm-player>` (methods `play()`, `pause()`, `seekTo(s)`; events `ready`, `timeupdate`, `ended`; `data='{"name":"Ana"}'` feeds `gm.data`).

## Colour

Videos are tagged with what Chrome draws: BT.709 matrix and primaries, limited range, and the sRGB transfer curve (`iec61966-2-1`), the same in mp4, webm and mov. A player that reads the tags shows the colours of your page; one that ignores them shows the raw values, which is also right for sRGB.
