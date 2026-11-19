# Stage 2: Words (the exposure sheet)

Reads: `voice/voice.mp3`, `script.md`.
Makes: `words.json` (every spoken word with start and end in seconds) and `words-check.md` (every
place the transcript disagrees with the script, so a slurred name shows up).
Command: `python bin/transcribe.py <slug>` (Whisper, runs locally).

Check (Vishnu): skim `words-check.md`. A real slur means re-rolling that paragraph in Stage 1; a
spelling difference in the transcript only is fine. Tick Stage 2.
