---
name: music
description: Background music and sound for a finished video: when to use music, making a track with ElevenLabs Music, mixing it under the voice with ducking, and the moments (hook, drop, end) that make it lift the video. Use after the render step of any lane, or when Vishnu asks for music.
---

# Music

Until 2026-10-23 no video had music, only the voice and a few sound effects. Vishnu asked for music that
"goes with the flow" and makes the video more engaging. This is how.

## Where the music comes from

1. **Made for the video with ElevenLabs Music** (`kit/music.py make`). The default. Commercial use is allowed on
   paid plans (Eleven Music terms; film, TV and big games need Enterprise). Same rotating keys as narration.
   Each track costs credits: say how many takes before making them.
2. **Instagram's in-app sounds**, added by Vishnu when posting. Some guides say a trending sound helps a Reel reach
   people outside his followers; that is a creator claim, not something Instagram has published. If he wants it,
   post the video with our mix and add the in-app sound at a very low volume.
3. **Never** a song ripped from YouTube or a track without a licence. Every file in `videos/_music/` or a
   video's `music/` folder has its source written next to it.

## The prompt

Instrumental only, the length of the video, one mood that matches the energy of the talk (a calm talk under a
loud track feels wrong). A template that works:

```
Instrumental only, no vocals. <mood: confident and hopeful / tense then resolving / playful>. <genre: minimal
lo-fi hip hop / modern electronic pulse / light acoustic>. <tempo> BPM. Sparse, leaves room for a voice:
soft drums, no lead melody in the vocal range. Builds slightly in the last third. <seconds> seconds.
```

Make three takes and show them to Vishnu to pick by ear. The pick is a check, like the voice: never pick for him.

## The mix (`kit/music.py mix`)

- **Bed:** the music levelled to about -26 LUFS before ducking, so it sits well under a -14 LUFS voice (a listening
  study found listeners want at least 10 LU between speech and music; non-experts wanted more).
- **Ducking:** sidechain off the voice, attack about 40 ms and release about 450 ms, so the music dips when he
  speaks and breathes back between lines (guides suggest a 6 to 12 dB dip).
- **End:** a 1.5 second fade. The final is then brought to -14 LUFS like every other video.

## Moments that make it engaging

- **Music from frame one.** The hook lands on sound, not silence.
- **A drop before the punchline** (`--drop a-b`): half a second of no music right before the line the video is
  about. Silence is the loudest beat.
- **Cards and chips on the beat** where it is easy: text that lands with the music feels edited, not pasted.
- **Match the energy.** A talking head is not a dance clip; keep the track under him, never over him.

## Check

Listen to the whole final on a phone speaker and on earphones. Every word clear over the music, no pumping you
can hear, the drop where it was meant to be. Then show him, with the track name and its prompt.

## Sources (researched 2026-10-23)

- Ducking settings: CapCut, https://www.capcut.com/create/audio-ducking-for-clear-dialogue-in-video
- Speech-to-music gap: University of Salford study, https://salford-repository.worktribe.com/OutputFile/1489990
- Music under voiceover: https://www.overseeros.com/blog/background-music-volume-under-voiceover
- Eleven Music API: https://elevenlabs.io/blog/eleven-music-now-available-in-the-api and https://elevenlabs.io/music-api
- Trending audio claims (unofficial): https://socialk.it/en/blog/instagram-trending-audio-strategy
- Text on the beat: https://social.colostate.edu/strategy/how-to-create-a-feed-worthy-instagram-reel/

## Sound effects on the frame (kit/sfx.py, 2026-10-26)

Real CC0 sounds from Openverse (`license=cc0` only), in `videos/_sfx/cc0/`, each with its source in
`videos/_sfx/LICENCES.md`: whoosh, swish, pop, click, tick, ding, chime, thud, impact, stamp, paper, tape, boing,
sparkle, riser. A new one: `python kit/sfx.py fetch <name> "<search>" --max-ms 1500` (anonymous Openverse calls allow
at most 20 results a page).

**The loudest moment lands on the motion's frame, not the start of the file.** `peaks.json` holds each sound's peak;
a sound starts at its frame minus its peak. A riser peaks at its end, so it swells into the cut.

- Talking head: `plan.py` writes `soundAt` for every beat's sound and the edit plays it there; nothing to do.
- Any finished video: list the moves in `work/hits.json` (`{"t": seconds, "sound": name, "gain": 0.3-0.8}`), then
  `python kit/sfx.py place <picture.mp4> work/hits.json <with-sfx.mp4>`, then `kit/music.py mix` as usual. No
  re-render. `videos/cohort-pitch-day/sfx_hits.py` is the example: hits computed from the same cue and word times
  the scene uses, a pop placed 0.2 s after a clay card starts (where its bounce peaks).
- Mood: a whoosh on every cut (quiet, 0.3), a pop on every card, one heavier hit (stamp, thud, ding) on the line
  the video turns on. Never two loud hits within 0.15 s.
- Check: place the hits on a silent copy and measure each peak against its target; a frame (0.033 s) is the limit.
