# Pitfalls (from seven versions of the first film)

| Problem | Fix |
|---|---|
| v1 felt busy: idle bob, cloud drift, spinning burger/diamond, laundry wave, conveyor and smoke loops, orbiting sparkles, camera drift | Remove all idle loops. Motion only on words; camera moves only at sentence changes and holds. Vehicles drive ~2 s, then park. |
| Zooming / pushing toward his face ("I hate that") | His footage never scales or slides. Pushes are world-only, into tiles. |
| Small face, blank screen (v5) | v6 staging: presenter 0.88 bottom-left, world in the top band + upper right, scenes scaled up to fill. |
| Labels on 3D anchors land on his head | Clamp projected labels into the top band (`RC()`), skip small effects where `clr()` is false, re-check stills at every beat. |
| First frame of a three.js canvas captured empty | Use `kit/three-canvas.tsx` `ThreeCanvas` (holds `delayRender` until the scene is drawn). One canvas mounted at a time. |
| Transparent canvas looks dark-fringed over the CSS sky | `gl={{ alpha: true, premultipliedAlpha: true }}`. |
| `cue()` throws after a re-cut | That phrase is gone or now ambiguous: re-point the cue (pass `nth` for repeats like "voila" or "humanoid robot"). |
| Whisper splits "24/7" into "24" "-7." and "pattern-based" into "-based" | Display-only fix in `caption.tsx` `disp()`; never edit words.json by hand. |
| Pills cross-fade at half opacity during a 0.45 s camera move | Acceptable; or hold world-anchored pills until the move ends. |
| Hook island small under a 3-line headline | Keep the headline to 2 lines + one pill and push the overview zoom up. |
| Night tint lingering under the next card | End `NIGHT.off` before the next question card pops. |
| Remotion "No frame found at position" on a long VP9 alpha matte | Re-encode the matte with `-g 15` (the news-qa-reel matte script does). |
| Remotion caches filling the system disk (%TEMP%\remotion-v4*-assets*, webpack-bundle-*) | Delete `out/bundle-*` after stills; prune caches older than 30 min after each render. |
| An earlier film's idle footage under a cloned voice read as "not my face talking" | Every spoken word is his own take; questions are read by him and shown as DM cards. |
| A 20 dB-under-voice rule was not enough for busy SFX | `mix.py` keeps effects at least 20 dB under the voice band and uses FX -26 dB for this style. |
