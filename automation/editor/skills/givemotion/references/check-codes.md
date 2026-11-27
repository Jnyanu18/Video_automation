# Check codes

Purpose: what each `check` code means and how to fix it, how `check` decides, and how to mark intentional cases with `data-check`. (Every issue in the `check` output already prints a message and a fix; read this when one is unclear.)

Three levels: ✖ error (broken: must fix), ⚠ warning (a real fault such as cut-off, overlapping or unreadable text: fix it unless it is on purpose), ℹ style note (`straight-move`, `camera-stop`, `fast-no-blur`, `same-ease`, `empty-frame`, `stepped-move`: a hint about taste; look at the frames and ignore it when the move is what you meant).

Contents
- Layout and readability codes
- Pacing and framing codes
- Attribute, script and asset codes
- How check decides; data-check

## Layout and readability codes

| Code | Meaning / fix |
|---|---|
| `text-offscreen` | Text runs past the frame edge for 0.2 s or more (✖). Smaller font, `max-width`, or move it. Inside a camera world it is a ⚠ when a label is cut by the frame edge while the shot holds (even if most of it is out: "st works" of a title reads as a mistake); frame the shot so labels are fully in or fully out. The same for a hand-made camera (a big layer zoomed or panned with a transform: a timeline push-in, `data-camera`): no report while it moves fast, a ⚠ when the crop lasts 0.3 s+ through a hold, and ✖ only when the text would be off the frame without that transform too (stuck off screen). |
| `text-clipped` | Text cut by an `overflow:hidden` box. Make it fit or let it wrap. Rows that end in an ellipsis (`text-overflow: ellipsis`, `line-clamp`) are cut on purpose and not reported. |
| `text-overflows-box` | Text spills out of its card/background. Add padding/width or shorten. |
| `text-overlap` | Two texts on top of each other while settled. Move one or change timing. |
| `moving-overlap` | Two readable texts (both above half opacity) on top of each other for 0.2 s+ while one of them moves: an exit and the next entrance at the same time ("Your" still under "Copy."). Let the old text leave (or fade below half) before the new one arrives. Crossfades, morph pairs and the letters of one split word are not reported. |
| `text-covered` | Part of a settled label is hidden behind something drawn on top of it. Move one, or raise the label (z-index / later in the HTML). Text of a camera world under a layer outside the world (a caption band, a title card) is reported even when fully hidden: frame the shot so its labels clear the overlay. |
| `text-over-line` | A visible stroke (an arrow, a line, the edge of a box) runs through the letters. Move the label or the line, or give the label a backing. Anything opaque painted above the line where the letters are counts as a backing: the label's own card (background alpha 0.85+), a `::before` scrim, an SVG or `data-sketch` fill riding the line. |
| `tiny-text` | Under 22px on screen (at 1080p, after camera zoom): hard to read in a video. Use ≥ 24px, ≥ 32px for secondary text. A wide shot of a whole UI on purpose: camera shot option `overview: true`. |
| `orphan-word` | A headline (40 px+ on screen) wraps onto two or more lines and leaves one short word alone on the last line. Add `text-wrap: balance`, a `max-width` that breaks it into even lines, or a `<br>` where the phrase breaks. Meant: `data-check="orphan-ok"`. |
| `text-carried-over` | A big readable text stays put, unchanged, while almost the whole picture changes around it (a new beat, a camera rush), and is still there half a second later: it reads as left behind. Judges flagged it in every tool. Let it leave with its beat; if it then has too little time to be read, bring it in sooner instead of holding it into the next beat. Carry it on purpose with `gm.fly` or a morph. A logo bug or chapter label that is meant to stay: `data-check="carry-ok"`. |
| `expect-failed` | A promise written in `data-expect` does not hold: `in-by 2.5` (visible by then), `gone-by 15` (gone by then and stays gone a moment), `hold 1.5` (once in, stays in that long), `in-frame` (never cut by the frame while visible). Visible = opacity ≥ 0.5 with its parents and at least half its box in the frame. Times are video seconds. Fix the timeline (the promise is the brief's timing). |
| `expect-bad` | A `data-expect` item that is not one of `in-by <s>`, `gone-by <s>`, `hold <s>`, `in-frame`. |
| `no-expect` | The shot list comment has timed beats, but no element carries `data-expect`, so nothing checks that beats land on time. Put the brief's times on each beat's main element. |
| `stray-mark` | A small solid mark (a dot, a tick) shows inside big text or just under its baseline, where it reads as a typo or a decimal point. Move it out, or hide it while the text is up. `data-check="overlap-ok"` if meant. |
| `missing-glyph` | The text's font has no such character (a subscript `₂`, an arrow `→`, a rare symbol): the browser draws it from another font, in another face, weight and width. Use characters the font has (a smaller, lowered `2`; `->` or an SVG arrow), add a font file that covers them (the `latin-ext` file of the same font), or pick a font that has them. Emoji are not reported (they come from the system's emoji font). |
| `upside-down-text` | Readable text turned more than ~100° on screen for 0.3 s or more, also while it moves (letters riding a path that loops, a word that spins and stops late). Keep letters within about ±90° of upright: ride only the left-to-right part of the path, flip the ones on the return, or use a gentler curve. Meant: `data-check="upside-ok"`. |
| `mirrored-text` | Readable text (half opacity or more) faces away from the camera: it, or a card it sits on, is turned past 90° or flipped, so it reads backwards (a card flip that ends showing the front's text through the back). Give the front face `backface-visibility: hidden` and put the back's content on its own face turned 180°, or swap the content when the card is edge-on. A meant mirror: `data-check="mirror-ok"`. |
| `low-contrast` | Text blends into what is behind it. Targets (WCAG): 4.5:1 normal text, 3:1 large text (≥ 24px, or bold ≥ 18.66px, on screen at 1080p after camera zoom), 1.6:1 for text with a `text-shadow` or outline. ✖ below two thirds of the target. Texts with the same color on the same flat backing get the same verdict, even if only one was measured. The fix names a passing color in the same hue (`suggest` in `--json`); use it, or add a backing or shadow. |
| `unsafe-zone` | Text where the app's buttons and titles cover vertical video (with `data-safe-zone` or `check --safe-zone shorts`; also `reels`, `tiktok`, or `"top,right,bottom,left"` px). Move it inward, or `data-check="safe-ok"`. |
| `ghost-overlap` | During a scene change, text of both scenes is half visible on top of each other (a smudge). Use push/whip/cover/wipe/iris, move one text, or let the old one leave first. |

## Pacing and framing codes

| Code | Meaning / fix |
|---|---|
| `still` | Little changes on screen for 2.5 s or more (1.9 s at the very end: a dead end card): nothing enters, leaves or moves, and a slow float or a faint glow does not count. Small things do not count either: what enters, leaves or moves in half a second must cover ~1% of the frame together (about a short headline), so a small label fading in in a corner every couple of seconds leaves the picture still. Viewers read it as the video stalling. Cut the hold, start the next beat sooner, give the beat something bigger (a camera move, a card, a highlight across a line), or end earlier. Captions (the captions block) and anything in `data-check="pace-ignore"` are left out of this measure. |
| `empty-frame` | Almost nothing on screen for a second or more in the middle of the video (a camera crossing empty space between parts, a gap between scenes, a zoom so far out that everything is a speck). |
| `empty-start` | The first half second shows only the background. The first frame is often the thumbnail and the hook: show something from frame 0. |
| `camera-stop` | A camera world brakes to a halt and sets off again within 0.45 s: start the next shot as the previous one arrives (they then blend into one move) or hold it ≥ 0.5 s on purpose. A move that turns straight around (zoom in, then back out) without dwelling is not a stop. |
| `fast-no-blur` | Something moves 40+ px per frame (at 1080p) with motion blur off (the default): it may strobe. Slow or shorten the move; or render with `--motion-blur auto` and check the motion strips in `review`. |
| `straight-move` | A long dead-straight diagonal move of an element (25%+ of the frame width), measured in its camera world (a camera move is not the element moving). Leave `arc` at its default, or travel along a curved path. |
| `css-scale-vs-tween` | An element has a CSS `scale` (e.g. `scale: 0`) and a `gm.timeline` tween on `scale`: the timeline writes `transform`, and the browser multiplies the two, so `scale: 0` stays 0. Give the start value to the timeline (`fromTo`, `from`, `gm.set`) instead. |
| `layout-shift` | A text goes up and down by a few px again and again (three or more abrupt jumps back and forth by the same amount, each less than 1.2 s after the last) with no tween on it: something next to it or inside it changes its line's height, like a caret or icon that is added and removed or a swap between one line and two. A camera, a transform tween, a smooth bob, a reflow that happens once and a swap every couple of seconds are not reported. Toggle with `opacity`/`visibility` instead of `display` or adding the element, and give the parts that change the same height and `vertical-align`. |
| `font-unavailable` | The first font of a text's `font-family` is neither loaded (an `@font-face` whose file loaded, a bundled font) nor installed on this computer, so the text is drawn in the next font in the list: a different look on every computer. Use Inter, JetBrains Mono, Playfair Display, Space Grotesk, Bebas Neue or Caveat (bundled), or `@font-face` a font file next to your HTML. A font name from Google Fonts (Poppins, Montserrat, Roboto) is the usual cause; so is a boilerplate stack that starts with `SF Pro Display`. Reported once per font. |
| `short-hold` | A text or a mark (an icon, a picture, 40 px+ square) is readable for less time than it takes to read it: from fully in (landed, settled, not covered) until it starts to leave, is covered, is cut away, or its scene or the video ends. It needs ~1 s + 0.25 s per word (1 s for an icon); it is reported under ~70% of that. Hold it longer (start its exit, the cover or the scene change later; bring it in sooner) or cut words. Never solve it by keeping the text on screen into the next beat (`text-carried-over`): the hold fits inside its beat. Not judged: text under 24 px (see `tiny-text`), text that changes on screen (counters, typing, scramble), small things riding an endless loop (a floating label, a particle), texts that take turns in one place (captions, a word-by-word kinetic line: three or more, each replaced within ~0.4 s), and `data-check="quick-ok"`. A line that builds word by word counts from its first word; a copy that carries the same text on (a morph, a ghost flying off) counts as one hold. |
| `cut-exit` | Something was fully on screen and then vanished in one frame (its clip ended, or it was set to opacity 0) while its scene goes on: nothing to transition out of, it just blinks off. Give it a `data-exit` or an exit tween (0.2–0.4 s), carry it into the next scene (`data-morph`, `gm.fly`), or hold it to the end of its scene. Not reported: a scene change or transition carrying the whole scene out, a layer as big as the frame going away (a cut of the whole picture), the end of the video, something covered, and a swap where something new appears in the same place (a button label changing). |
| `sliver-start` | An element with a `clip-path` start state (`inset(45% 0)`) shows a thin sliver from its first frame until its entrance opens it: it reads as a glitch. Start fully hidden: `inset(50%)` (`inset(50% 0)` / `inset(0 50%)` to open from the middle), `opacity: 0` or `scale: 0`. |
| `stepped-move` | ℹ A `steps()` ease on something bigger than ~15% of the frame (a window, a card, the camera) that moves, resizes or clips: at video frame rates it reads as dropped frames. Keep `steps()` for small things (a counter, a blinking caret, text typing); see-through textures (grain) are not reported. |
| `same-ease` | 8+ animations and more than 90% use the same bezier curve: drop the explicit eases (the natural defaults vary by role) or vary them (springs for arrivals, `in-*` for exits, `in-out-sine` for long moves). |
| `camera-late` | A camera shot arrives (its time + duration) after its scene starts its exit transition, so it is never seen at rest. Start it earlier or shorten it. |
| `camera-no-target`, `camera-padding` | A shot's target matched nothing in the world; a `padding` too big for the frame was clamped. |

Inside a `gm.camera` world, text sliding past the frame edge while the camera moves is fine, but a label cut by the frame edge for 0.3 s or more while the shot holds is a warning: frame each shot so the labels it shows fit, and neighbours are fully out.

## Attribute, script and asset codes

| Code | Meaning / fix |
|---|---|
| `image-broken`, `image-failed`, `http-404`, `video-frame`, `video-no-src` | A file path is wrong (paths are relative to the HTML file). |
| `bad-time`, `bad-enter`, `bad-exit`, `bad-transition`, `bad-camera`, `bad-count`, `sequence-missing-duration`, `no-duration`, `cuts-short` | Fix the attribute as the message says. |
| `odd-size` | Width or height is odd; video codecs need even sizes (1920x1080). |
| `non-seekable-animation` | A CSS animation started inside `onFrame`; use `data-start` or set styles from `t`. |
| `onframe-global-time` | `gm.onFrame(fn)` / `gm.onLayout(fn)` without an element, in a `<script>` inside a clip that starts after 0: `fn` gets the video's time, not the scene's. Pass the scene: `gm.onFrame('#scene', (local, info, el) => …)`. |
| `bind-missing` / `bind-unsafe` | A `data-bind*` path that the data does not have, or a bound value that would be an event handler (`data-bind-onclick`) or a `javascript:` URL: data is only text, so it was not set. |
| `onframe-no-target` | `gm.onFrame('#sel', fn)` matched nothing (check the selector; put the script after the element), so `fn` got the video's time. |
| `contents-no-box` | A tween or style gives opacity, transform, filter or clip-path to an element with `display: contents` (a `<gm-include>` without class or style is one): it draws no box, so nothing happens. Give the include a class or a style (`style="display:block"`), or animate the elements inside it. |
| `timeline-no-target`, `cursor-target`, `fly-no-from`, `connect-no-target`, `burst-no-target` | A selector matched nothing. |
| `morph-no-pairs` | `morph` transition without matching `data-morph` names in both scenes. |
| `audio-not-found`, `audio-no-beats`, `audio-late` | `gm.audio()` found no file/element, found no steady beat, or was called after the video started. |
| `camera-no-world`, `travel-no-element`, `anchor-no-target`, `chart-no-element`, `loop-no-target` | A selector given to `gm.camera` / `gm.path.travel` / `data-anchor` / `gm.chart.line` / `gm.sketch.loop` matched nothing. |
| `travel-inline`, `travel-bad-side` | `gm.path.travel` on an inline element (a `<span>`: give it `display: inline-block`), or a `side` that is not `above` `below` `left` `right`. |
| `chart-no-values`, `chart-no-size`, `chart-bad-point` | `gm.chart.line` got fewer than 2 numbers, its element has no width/height, or a point name is not an index, label, `last` or `max`. |
| `data-missing` | A `{{data.…}}` came out empty: pass `--data`, add `data.json`, or give a default `{{data.x|default}}`. |
| `camera-zoom-high` | A camera `fit` zooms past 4x on a small target (text huge, pictures soft). Fit a bigger area, add padding, or give `maxZoom` (also to say a close-up is meant). |
| `include-not-found` | A `<gm-include src>` file does not exist. |
| `word-repeated` | A bare `@word` is said more than once; the first is used. The fix lists `@word#2 (21.4 s)` …; write `#1` to keep the first. |
| `word-not-found`, `words-missing`, `words-file` | A time names a word (`@pricing`) that the transcript does not have (the fix lists near spellings; a phrase joins words with `_`, a repeat is `#2`), or there is no `<html data-words>` transcript, or its file is missing or not a list of `{word, start, end}`. |
| `load-timeout` | Something given to `gm.wait()` never finished. |
| `script-error`, `console-error` | Your JS threw; the message has the stack, file and line. Fix it first: a failed script also causes misleading `still`/`empty-start` warnings. |

## How check decides; data-check

- It compares frames, so anything moving or fading (CSS, timeline, React, onFrame, a camera follow) is skipped by the layout checks while it moves, and a problem must last ~0.2-0.3 s to count. "Moving" means: an entrance/exit/short animation is running on it or a parent, it moves more than ~40 px/s (at 1080p) inside the biggest moving layer around it, or it moves faster than ~600 px/s on screen whatever carries it (a full-frame panel pushed in, a fast camera move). A slow camera drift does not make text "moving". Only `moving-overlap` and `ghost-overlap` look at moving text.
- `short-hold` and `cut-exit` follow each reading unit (a line with its inline parts or its word spans, a split headline, an SVG label) over the whole pass: it is readable while what is on screen of it is above 40% opacity, not fading, not covered, mostly in frame and slower than ~600 px/s (at 1080p) in its layer, so a camera drift, a slow travel or a small emphasis pop does not end its hold (breaks under 0.5 s while it stays on screen are bridged). Something that keeps moving on screen (a cursor, a ball) is not leaving.
- Text that is fully hidden (outside the frame, behind a mask or clip-path, waiting to slide in, under the clear part of a gradient `mask-image` such as a world that fades out at its top or a vignette) or covered by something solid is not judged (except camera-world text under an overlay, see `text-covered`). Overlap tests use each text's visible part (its own and its parents' `clip-path`: inset, polygon, circle, ellipse).
- `data-check` takes one or more space-separated values, on the element or any parent (its whole subtree):

| Value | What it does |
|---|---|
| `ignore` | Skip every check for that subtree (decorative copies: echoes, ghosts, outlines). `aria-hidden="true"` does the same. |
| `crop-ok` | Being cut by the frame edge is meant: no `text-offscreen`, `text-clipped`, `unsafe-zone` (a film strip, a ticker, a big word bleeding off, zoomed into one line of code). |
| `overlap-ok` | Overlapping is the point (a pile of cards, a collage): no `text-covered`, `text-overlap`, `moving-overlap`, `ghost-overlap` or `text-over-line` for text inside it, or for things inside it covering other text. Every other check still runs. |
| `safe-ok` | Text meant to sit in a vertical-video safe zone: no `unsafe-zone`. |
| `quick-ok` | Meant to flash by (a rapid word montage, a subliminal frame): no `short-hold` or `cut-exit`. |
| `pace-ignore` | Changes in there do not count as the picture moving for `still` (captions that change with every word, a ticking clock in a corner): the rest of the frame is measured. The captions block has it. Every other check still runs. |

- A long video is checked on several browsers at once (what the computer can spare; `--workers 2` sets it). The report is the same for any number.
- Re-check one moment fast with `check --at 7.5`, or part of the video with `--from 6 --to 9`. Problems list every time range they happen in, and times also say how far into the scene the problem is. (`snapshot --times` with `--from/--to` keeps only the times inside that range.)
- Exit code 1 when there are errors; warnings do not fail.
