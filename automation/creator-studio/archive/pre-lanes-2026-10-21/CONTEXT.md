# The pipeline

Borrowed from how animation studios worked from about 1930: voice first, then every word timed, then
a storyboard timed to the words, then rough animation screened before anything is final, then the
finished render. Here each step is a folder, a command and one file, and Vishnu checks that file
before the next step runs.

| # | Stage | Command | Reads | Makes | Vishnu checks |
| --- | --- | --- | --- | --- | --- |
| 0 | Brief | (a conversation) | the idea | `brief.md` | who it is for, the one point, the hook, the length |
| 1 | Voice | `python bin/speak.py <slug>` | `script.md` | `voice/voice.mp3` (+ one file per paragraph) | listens to the whole take; re-rolls any paragraph with `--only N` |
| 2 | Words | `python bin/transcribe.py <slug>` | `voice/voice.mp3`, `script.md` | `words.json`, `words-check.md` | skims the flagged mismatches, fixes names in `script.md` |
| 3 | Cues | `python bin/cues.py <slug>` | `storyboard.md`, `words.json` | `cues.json`, `cues.md` | reads the timed table: is every beat on the right words? |
| 4 | Scene | `python bin/stills.py <slug>` | `remotion/src/videos/<slug>.tsx`, `cues.json`, `words.json` | `stills/contact-sheet.png` | the contact sheet, then the full preview in Remotion Studio with sound |
| 5 | Render | `python bin/render.py <slug>` | everything above | `out/<slug>-16x9.mp4`, `out/<slug>-9x16.mp4`, `out/captions.srt`, `out/thumb-*.png` | watches the final; picks the title and thumbnail |

Status of each video lives in `videos/<slug>/CHECKS.md`. Start a new one with
`python bin/new.py <slug> "<working title>"`.

Preview while building: `pnpm studio` (Remotion Studio, opens a local page). Vishnu runs it himself.

## The talking-head lane (added 2026-10-19)

For videos where Vishnu talks to camera and Claude edits. Same idea: one command, one file, Vishnu
checks it, then the next step runs. Start one with `python bin/th_new.py <slug> "<title>" --brand
personal|agency` (add `--like <slug>` to repeat the format of a video that worked).

| # | Step | Command | Makes | Vishnu checks |
| --- | --- | --- | --- | --- |
| 0 | Brief | (a conversation, skills `purple-cow` and `story-loops`, at least one) | `brief.md` | the cow, the loops, every number has a source |
| 1 | Script | (a conversation) | `script.md` | reads it aloud once |
| 2 | Raw | records, drops takes in `raw/`, runs `python bin/th_ingest.py <slug>` | `work/source.mp4`, `ingest.md` | every take is there, the warnings |
| 3 | Words | `python bin/th_words.py <slug>` | `work/words.json`, `transcript.md` | the transcript, and the "Listen here" times |
| 4 | Cut | `python bin/th_cut.py <slug>` (edit `cuts.md`, run again) | `cuts.md`, `work/cut.mp4` | watches the whole cut with sound |
| 5 | Edit | write `edit.md` with Claude, then `python bin/th_plan.py <slug>` | `work/edit.json`, `work/preview.mp4`, `work/contact-sheet.png` | the half-size preview with sound |
| 6 | Render | `python bin/th_render.py <slug>` | `out/<slug>-9x16.mp4`, `captions.srt`, `thumb-1..3.png`, `description.md`, `format.md` | watches the final, picks title and thumbnail |

Each video's folder holds everything: brief, script, `raw/` (the phone takes), `broll/` (with
`LICENCES.md`), `cuts.md`, `edit.md`, `work/` (in-between files), `out/` (the final) and `format.md`
(what was done, plus a results table to fill in at 48 hours and 7 days). Shared music goes in
`videos/_music/`, with its licence next to it.

The cut keeps the last take of a repeated line, drops lines that are only "um", and cuts filler words
and long pauses inside kept lines. A word lasting over 1.2 seconds is flagged: it usually hides a false
start Whisper did not write down. Listen there before ticking the cut.

In `edit.md`: `style: light` (the default, white cards) or `dark`; `sfx: on 0.35` adds a sound to each
beat (whoosh on zoom, pop on text, switch on stat, whip on b-roll; see the `broll` skill), with
`sfx=name` or `sfx=off` on one beat to change it, and `- sfx "words" name` for a sound alone; `dur=1.2`
on any beat sets how long it stays; `lower-third-at: 6.5` times the name tag. Each run of the plan step
is saved to `work/versions/vNN/` so versions can be compared.

After the render is approved, `posts.md` (made empty by `th_new.py`) is filled with the `captions` skill: X,
Instagram, YouTube Short or long form, LinkedIn, plus a Posted table. Research notes live in `research/`
(skill `research`), one line each in `research/INDEX.md`.

Timing, measured on a 12-second test cut: the half-size preview takes about 3 minutes, the final about
2.5 minutes. Expect roughly 10 to 15 minutes each for a 60-second video.
