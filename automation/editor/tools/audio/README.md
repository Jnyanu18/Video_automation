# tools/audio

`add_music`, `duck_music_under_speech`, `normalize_loudness`, `mute_segments`: edit `plan["audio"]`; `services/render/audio.py` does the mixing.
`add_music(generate=...)` makes a simple synthesized pad (calm/ambient/upbeat) with ffmpeg: royalty-free by construction but plain.
It is NOT a Hyperframes/MusicGen track (those need torch, not installed). Pass a licensed file as `path` for real music.

Run: `python -m pytest tools/audio -q`; render-level checks live in `services/render/tests/test_effects_render.py`.
Verified with measurements: ducking depth (12 dB requested -> 8-16 dB measured), mute (< -80 dB, follows speed changes and cuts), loudness
within 1 LU of the target (-16 and -23 tested), music start offset and fades.
Not verified: real music files, stereo/5.1 sources, very long videos (the mix goes through a temporary wav).
