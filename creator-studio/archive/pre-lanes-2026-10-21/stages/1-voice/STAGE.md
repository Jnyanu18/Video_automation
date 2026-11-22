# Stage 1: Voice

Reads: `videos/<slug>/brief.md` (signed off), `videos/<slug>/script.md`.
Makes: `videos/<slug>/voice/voice.mp3`, plus `voice/part-NN.mp3`, one per paragraph of the script.
Command: `python bin/speak.py <slug>` (all), `python bin/speak.py <slug> --only 3` (re-roll one paragraph).

With `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` set, it uses Vishnu's cloned voice. Without them it
uses a stand-in voice and writes `voice/DRAFT-VOICE.txt`; nothing made from a draft voice is published.

Check (Vishnu): listen to the whole take start to finish. Re-roll any paragraph that sounds off.
Then tick Stage 1 in CHECKS.md.
