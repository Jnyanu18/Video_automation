# Vishnu's studio

One folder that turns an idea into a finished video in Vishnu's own voice, with his pixel avatar, in
his brand. Five stages, one file out of each, and a human check before the next stage runs.

Read in this order:

1. `CONTEXT.md`: the pipeline in one table (stage, command, the file it makes, the check).
2. `brand/BRAND.md`: who is speaking, how they sound, colours, fonts, the avatar, what never appears.
3. The `STAGE.md` of the stage you are working on, under `stages/`.

Where things live:

| Path | What |
| --- | --- |
| `bin/` | The commands. Python, run from this folder: `python bin/<command>.py <video-slug>` |
| `stages/<n>-<name>/STAGE.md` | Each stage's contract: what it reads, what it makes, who checks it |
| `remotion/src/kit/` | The reusable look: the avatar, captions, title cards, screens, colours |
| `remotion/src/videos/<slug>.tsx` | One scene file per video, built from the kit |
| `videos/<slug>/` | Everything one video produces: brief, script, voice, words, storyboard, cues, stills, out |
| `videos/<slug>/CHECKS.md` | The sign-off log. A stage does not run until the stage before it is ticked |
| `bin/th_*.py`, `remotion/src/talking/` | The talking-head lane: Vishnu films, Claude edits (see CONTEXT.md) |
| `.claude/skills/purple-cow`, `.claude/skills/story-loops` | How to make a video impossible to scroll past, and how to keep it watched |
| `.claude/skills/broll` | Choosing, shooting, sourcing and placing b-roll and sound effects |
| `.claude/skills/research` | Studying what works before a brief, and checking every claim before it is said; notes go in `research/` |
| `.claude/skills/captions` | Post text for YouTube (Short and long), X, Instagram, LinkedIn; saved as `videos/<slug>/posts.md` |
| `videos/_sfx/` | Sound effects, each with its licence in `LICENCES.md` |
| `videos/<slug>/work/versions/vNN/` | Every edit version (edit.md, preview, contact sheet), kept for before and after |
| `PLAN.md` | The content plan: lanes, the weekly mix, the 100-minute day, lessons from real footage |

## How Vishnu works with the talking-head lane (set 2026-10-19)

- **Vishnu never runs a command.** He records, drops the files in `videos/<slug>/raw/`, and approves.
  Claude runs every step, then shows him the result and waits for "ok" before ticking the next stage
  in `CHECKS.md` and moving on.
- **Every file he should open is given as a clickable link**, for example
  `[preview.mp4](D:/studio/videos/<slug>/work/preview.mp4)`, never as a bare path.
- **What Claude checks itself before showing him anything:** the contact sheet (looked at as an image),
  the transcript against the script, and every number against its source. Claude cannot hear audio, so
  sound is always his check: say exactly which seconds to listen to.
- **Keep every version.** Never overwrite a version he has seen without keeping it; the plan step saves
  each run to `work/versions/`.
- If the take differs from the script, the take wins where it is true. Ask him about any claim that
  changed, and any word Whisper may have misheard (names especially), before ticking the words step.
  Confirmed corrections go in `videos/<slug>/fixes.txt`.

Rules for any AI working here:

- **Paste-ready text holds only the words to publish.** No instruction, note, character count, "check this" or
  bracketed aside inside a caption, title, description, comment, reply or DM, and none beside it on the same
  line. Notes go in a separate section or above the code block. (Vishnu, 2026-10-21, after a title came with
  "(about 100 characters; check the count when pasting)" attached.)

- **After a video is approved, write `videos/<slug>/posts.md` with the `captions` skill** (X, Instagram, YouTube,
  LinkedIn) and give Vishnu the link. When a script contains a claim about someone else, or he asks to study
  a post, use the `research` skill and save the note in `research/`.
- **Every brief uses at least one of the skills `purple-cow` and `story-loops`.** Load them at the brief
  and script steps, and write in `brief.md` which one was used.
- **Never skip a check.** If the previous stage in `CHECKS.md` is not ticked by Vishnu, stop and ask.
- **Never invent facts or numbers in a script.** Numbers come from his logs (for AskVerb: the repo's
  `docs/53-OUTREACH-LOG.md`). If a figure is not there, leave it out.
- **The voice is his clone, and the video says so** in its description. A stand-in voice is marked
  DRAFT on screen and in the file name, and is never published.
- **No em dashes** anywhere a viewer reads or hears. First person singular ("I"), never "we".
- **Title and thumbnail are Vishnu's call.** Offer three; he picks.
- Secrets (the ElevenLabs key) live only in the environment variable `ELEVENLABS_API_KEY`. Never write
  a key into a file, a log or a message.
