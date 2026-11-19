# Sound design

Sound is half the perceived quality. A film with weak sound reads as cheap even when the picture is good.

## Rules

1. **Design sound with picture.** Every cut, impact, arrival, tap and morph gets a sound event at the same time constant the animation uses. Not every letter or particle needs one.
2. **One score on the beat grid.** The tempo is the film's BPM, and section changes are the score's section changes.
3. **At least one silence or near-silence**, usually at the turn of the contrast arc. Silence before the key message makes it land.
4. **A signature sound as a bookend:** a bowl, chime, logo sting or riser that opens the resolution and closes the film.
5. **Loudness gate:** −14 LUFS integrated (±1), true peak ≤ −1.5 dBFS, **measured on the delivered .mp4** with `python kit/gate.py out/<name>.mp4`. Mix to TP −2.0 so the AAC encode still lands under −1.5. A film with only small sound effects (peaks around −20 dB) fails the gate.
6. **Voiceover**, when used: write the script to the beat map, generate it, measure its real duration, then retime the sections. Duck the music by about 8–10 dB under the voice.

## Event → sound

| Picture event | Sound |
|---|---|
| Hard cut / colour flip | Kick + short noise transient; a stab on bursts |
| Slam word | Kick + glitch stab or whoosh ending on the impact |
| Morph / shape change | A short whoosh into it + a pitched pluck (rising pitch for progress) |
| Object lands (spring) | Impact (low sine sweep + filtered noise) at contact |
| Tap / click | A tick (2–3 kHz, 30 ms) + a soft ping |
| Breath / calm turn | Bowl strike or soft pad swell + air noise |
| Burst cards | Ascending stab per card + clap roll into the payoff |
| Logo / CTA arrival | Impact + signature sound; chimes on the tagline and CTA |
| Pre-arrival tension | A 0.4–0.6 s riser ending on the cut |

## Building the score

- `kit/score.py` synthesizes an original score with numpy: kick, clap, hat, bass, pad, pluck, bowl, ping, whoosh, riser and impact, with `beat_bar()` for groove. Write one schedule block per section, mirroring `film.tsx`. Being original, it needs no licence.
- Pick the instruments from the emotion map: wellness gets pads, bowls and plucks; sport gets kicks, claps and impacts; tech gets ticks, stabs and risers.
- Harmony: choose one key and one chord colour for the whole film (for example Em9 for calm-modern, a major 7th for warm, minor with a flat 2 for tension) and keep the bass on the roots.
- Licensed music instead: fit the cut points to its measured downbeats, never the reverse. Never claim a track is licensed unless the client supplied it.
