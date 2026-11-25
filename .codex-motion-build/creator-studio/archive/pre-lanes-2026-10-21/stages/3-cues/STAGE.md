# Stage 3: Cues (the Leica reel)

Reads: `storyboard.md`, `words.json`.
Makes: `cues.json` and `cues.md`, the whole video timed out before a frame is drawn.
Command: `python bin/cues.py <slug>`.

`storyboard.md` is one beat per picture change:

    ## beat-id | the exact words the beat starts on
    What is on screen, in one or two lines.

Each beat starts on the first spoken occurrence of its words after the previous beat. A beat whose
words are not found stops the command and names the beat.

Check (Vishnu): read `cues.md`. Fixing a beat here is cheaper than fixing a finished scene. Tick Stage 3.
