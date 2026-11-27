# Media: video, audio, beats, captions, fonts and images

Purpose: `<video>` and `<audio>` elements, mixing, cutting and pulsing on the beat, reacting to sound, captions, fonts and image files.

Contents
- Video and audio elements
- Plan cuts on the beat
- Pulse on the beat without code
- React to sound (gm.audio)
- Captions
- Fonts, images, paths

## Video and audio elements

```html
<video src="clip.mp4" data-start="2" data-duration="4" data-from="1.5" data-rate="1" data-volume="0.8" muted loop></video>
<audio id="music" src="music.mp3" data-volume="0.4" data-fade-in="1" data-fade-out="2" data-duck="0.25" loop></audio>
<audio src="voice.mp3" data-start="1.5"></audio>
```
- Video is decoded frame-exact by ffmpeg (any codec); style the `<video>` element with CSS as usual. `data-from` = where to start in the source. `muted` drops its audio.
- Audio is mixed by ffmpeg: `data-start`, `data-duration`, `data-from`, `data-rate`, `data-volume`, `data-fade-in`, `data-fade-out`, `loop`. Volume curve: `data-volume="0:0 1:0.8 9:0.8 10:0"` (seconds in the clip : volume). `data-duck="0.25"` lowers music to 25% while any other sound plays (voice-over, video with sound).
- Where the fades sit: `data-fade-in` starts when the audio's clip starts, and `data-fade-out` **ends when the audio's clip ends**. An `<audio>` with no `data-start`/`data-duration` of its own (and not inside a timed scene) lasts the whole video, so `data-fade-out="2"` fades the last 2 s of the video, whatever the file's length (a 32 s song in an 18 s video fades over 16-18 s). Inside a scene, or with `data-duration`, it ends at that clip's end. The file's own length is not used: if the file is shorter than its clip, add `loop` or set `data-duration` to the file's length, or the fade happens after the sound has already stopped.
- `render v.html -o sound.mp3` (or .wav/.m4a) exports only the soundtrack; `--muted` renders without audio.
- Sounds that add up past full scale are limited to just under it (a peak limiter on the mix), so voice plus music never crackles; anything quieter is left as it is. Still mix with ears: music around 0.2-0.4 under a voice, ducked while it speaks, so the voice is clear.
- **Time things to the words.** Give the page the voice-over's word-timed transcript once, `<html data-words="voice.json">` (`[{"word":"Hi","start":0.2,"end":0.5}, …]`, the captions format; Whisper-style `{segments:[{words}]}` works too), then any time can name a word: `data-cuts="0 @spring_pricing @three_plans"` on a sequence (each scene starts when its words are said), `data-start="@pricing"`, `@pricing#2` (the second time), `@pricing.end`, `@pricing+0.3` (a bit after), `@pricing-0.2` (a bit before: lands as the word starts), and `gm.word('pricing')` in scripts (video time: use it with `gm.timeline(scope, { global: true })`). A word is a moment of the whole video wherever you write it, also on an element inside a scene (`data-start="@waters"`) and in an entrance: `data-enter="rise 0.5 @thirsty"` comes in when "thirsty" is said (`data-exit="fade 0.3 @bye"` leaves on it). Matching ignores case and punctuation (`@needs` finds "needs."). Re-record the voice and the cuts follow. A word that is not in the transcript is the error `word-not-found`, with near spellings.
- **Find the token before you write it:** `npx givemotion words index.html` (or `voice.json`) lists every word in the order first said, with each time it is said and the exact token that names that time (`engine  2.20 @engine  3.40 @engine#2  5.80 @engine#3`); `--near 145` lists the words said around 145 s, in order, each with its token; `--json` for scripts. Copy the token; do not count occurrences by hand.
- **Words said before the page starts.** A video split into several pages, each with the whole transcript on its own clock, has words at negative times on later pages. An element timed to such a word (`data-start`, `data-enter="… @word"`, `data-sketch-mark-at`) is simply already there at frame 0, its entrance finished (one that started just before 0 shows its last part). Nothing to work around.
- A voice-over sets the length: make scenes follow its sentences (place clips at the times the words are spoken), and fade the music under it with `data-duck`.

## Plan cuts on the beat

`npx givemotion audio music.mp3` prints the tempo, every beat, bar starts (downbeats), the biggest hits (best moments for a logo or a big cut) and quiet gaps. Beats sit on the kick drum. Copy the printed `data-bpm data-beat-offset data-bar-offset` onto `<html>`; then:
- `data-cuts="beats: 0 4 8 14"` / `"bars: 0 1 2 4"` on a `data-sequence` cuts on the grid, `data-cut-align="middle"` puts the middle of each transition on the cut (see `references/timeline.md` for where a scene's time 0 then sits).
- `gm.beat(8)`, `gm.bar(2)` give the video time of beat 8 / bar 2 from `<html data-bpm data-beat-offset data-bar-offset>` (also `data-beats-per-bar`); ready at once, so you can build timelines on the beat: `tl.to(..., gm.beat(8))` in a `{ global: true }` timeline.
- A camera shot that should land on a beat starts at `beat - duration`. The cursor block takes `times="beats: 16 18"`.

## Pulse on the beat without code

`data-pulse` on any element scales it up on every beat of the `<html data-bpm data-beat-offset>` grid and lets it fall back: `data-pulse="beat 0.06 0.25"` (amount, decay in s; these are the defaults), `"bar 0.1"`, `"half 0.04"`, `"2 0.08 0.3"` (every 2 beats). It also sets `--beat` (1 on the beat → 0) on the element for your own CSS: `filter: brightness(calc(1 + var(--beat) * .4))`, or `data-pulse="beat 0"` for only the variable. It uses the CSS `scale` property, so it adds to timeline transforms; put it on a wrapper if the element has a scale `data-enter`. A pulse plus a camera push can push big type off screen: leave margin.

## React to sound (gm.audio)

`const music = gm.audio('#music')` (or a file path like `'music.mp3'`; call it once at the top of your script, or `check` warns `audio-late`). In `onFrame(t => …)`:
- `music.level(t)` (0..1 loudness), `music.bass(t)` `music.mid(t)` `music.treble(t)`, `music.bands(t, 16)` (spectrum), `music.wave(t, 128)` (waveform), `music.beat(t, 0.25)` (1 on each beat, fading to 0: great for pulses).
- All `music.*` take **video time**: in `gm.onFrame('#scene', (t, info) => …)` pass `info.time` (`t` there is the scene's local time).
- `music.beats` (`gm.audio(...).beats`) / `music.downbeats` / `music.onsets` (times in the video, to cut on the beat), `music.bpm`. To build a timeline from beats at load time: `gm.wait(music.ready.then(() => { const b = music.beats; gm.timeline().to('#logo', { scale: 1.2, duration: 0.2 }, b[4]); }))`. Beat lists only cover the part of the song that plays in the video.
- `check` codes: `audio-not-found` (no file/element), `audio-no-beats` (no steady beat), `audio-late` (called after the video started).

## Captions

- The `captions` block shows word-by-word captions (TikTok/Reels style) from a word-timed JSON file (`[{"word":"Hello","start":0.2,"end":0.5}, …]`, times relative to the block's start) or an `.srt`: `<gm-include src="blocks/captions.html" file="captions.json"></gm-include>`. Params: `words` (max words per line, default 5), `accent`, `position` (bottom|center|top), `offset` (420 px on vertical video by default, above the app buttons), `size` (default 64), `weight`, `upper`, `hold` (seconds the last line stays; 0 = gone with the word, so it does not run into the next scene).
- Preview how captions will page: `npx givemotion captions captions.json --words 3`.
- Captions must not cover the subject: judges marked down captions over the UI being shown. Put them in a band the layout leaves free, or move the content up. Keep them on for the whole video if the brief asks for captions.

## Fonts, images, paths

- Paths are relative to the HTML file (`image-broken`, `http-404`, `video-frame` mean a wrong path).
- Use local fonts (`@font-face` with a file next to the HTML) for identical results on every machine; built in (no file needed): `Inter`, `JetBrains Mono`, `Playfair Display`, `Space Grotesk`, `Bebas Neue`, `Caveat`. Web fonts (a Google Fonts `<link>`) also load and the render waits for them, but they need the network on every render.
- Animated GIF / WebP / APNG in `<img>` play frame-exact on clip time (`data-loop="false"`, `data-rate`).
