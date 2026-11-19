# Audio: the `dossier` style

`py audio/mix.py dossier` reads `out/beats.json` (dump-beats), `out/events.json` (dump-events),
`src/edl.json`, `src/words.json` and `public/vo.wav`, and writes `public/bed-dossier.wav`
(music + SFX; the voice stays a separate `vo.wav` track in Remotion), `out/music-dossier.wav`,
`out/mix-dossier-preview.wav` and `out/cue-sheet-dossier.json`. It prints the VO-to-bed ratio in
the 1-4 kHz band during speech (the source film measured a ~41 dB median at v2).

## Score (SYNTHETIC)
- `STYLES["dossier"]`: C minor "intelligence briefing": Cm7 -> Abmaj7 -> Fm(add) -> G, 2.0 s per chord,
  darker pad (brightness 0.8), short muted mallet plucks (decay 0.12), small room reverb (2.2 s, 0.2 wet).
- `ARR` per beat id: (gain, cutoff, arp density 0-2, high tone, pulse). Unknown ids fall back to a medium
  setting; add the film's beat ids (e.g. hook quiet, verdict brighter, end with the high tone).
- The tonic resolves on his last word and rings to the final frame.
- Phrase duck -15 dB under his voice (words < 0.4 s apart merged, 0.2 s ramps), also under the outro.
- `MUSIC_DB` default -7.5 (paper family). Override with the env var.

## SFX (paper family)
`sound_for()` maps each event's `id + what` keywords:
| Keyword | Sound | Source |
|---|---|---|
| stamp | rubber-stamp.flac (-4 dB) | CC0 (video-edit skill library, `SFX_DIR`) |
| type / typewriter / key | paper tap + snip | SYNTHETIC |
| marker / draw / pencil / arrow / circle / underline / thread | marker scratch | SYNTHETIC |
| flip / page | page flip | SYNTHETIC |
| whoosh / fly / pan / pull | short-whoosh.wav (-9 dB) | CC0 |
| fold / crumple / squeeze | crinkle | SYNTHETIC |
| shuffle / pile / stack | card-riffle.flac | CC0 |
| node / light / pulse | soft mallet | SYNTHETIC |
| (other) | paper tap | SYNTHETIC |

Write the `what` text of each event with these words ("stamp BANNED on the photo", "marker slash X over OR",
"whoosh car rolls in", "typewriter clatter, cipher strip").

## Budget and levels
- <= 25 events per minute, only on real visual hits (source film: 35 in 93.6 s). Madhav v2: "the background
  sounds are too loud, I can't even hear my own voice."
- Each effect lands 0.03 s before its visual; any effect under speech is pulled down until it sits >= 20 dB
  under the voice band. `FX_DB` default -14.
- `render_ig.sh` mixes VO + bed (3:1 compressor), sets the gain to about -13.3 LUFS pre-limit, limits at
  192 kHz, encodes AAC 128k: about -14 LUFS integrated, TP <= -1.5 dBTP.
- Voice clean-up (source film v7): if his take has audible hiss/static, run a denoiser (e.g. DeepFilterNet,
  limited to ~20 dB of reduction) on `public/vo.wav`, keep the noisy original as a backup, and re-check the
  transcript (Whisper) still matches.
- Always report the music and SFX as SYNTHETIC / CC0 and not auditioned by a human.
