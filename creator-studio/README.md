# Vishnu's studio

**Start here if you are an AI agent that has never seen this folder.** This page is enough to make a video
on any topic Vishnu names. The rules every agent follows are in `CLAUDE.md` (read it next); each lane's steps
in detail are in `CONTEXT.md`.

## What this is

One folder that turns a topic into a finished, posted-ready short video: script, voice or footage, edit,
captions, thumbnails and the post text for every platform. Everything is code (Python commands, Remotion for
the picture, Whisper for word timing, ElevenLabs for narration), so an agent does the whole edit.

Who it is for: Vishnu (22, solo founder) posts for his personal brand (building AskVerb in public: an AI agent
inside a SaaS product that does tasks for its users), for Auralion Labs (his agency), and for tests like the
pink dolphin short. Each video says in its brief which brand it is.

## How Vishnu works with you

**Engine:** Remotion. HyperFrames is installed but used only when Vishnu asks (see "Which engine" in CLAUDE.md).

**Never render before he has approved the storyboard** (`work/storyboard.png` and `storyboard.md`: a still per beat, the words, what is on screen, the style, the music). See CLAUDE.md. Set 2026-10-23; never broken.

- **He never runs a command.** You run every step, show him the result, and wait for his "ok" before the next.
- **Every file you want him to open is a clickable link**, e.g. `[preview.mp4](D:/studio/videos/<slug>/work/preview.mp4)`.
- **You cannot hear audio.** Look at stills yourself; tell him which seconds to listen to.
- **Never invent a fact or a number.** Check claims with the `research` skill; AskVerb numbers come from
  `C:\AADS(VISHNU)\vishnu\verb\docs\53-OUTREACH-LOG.md` or from him.
- **Text he will paste holds only the words to publish**: no notes, counts or brackets inside or beside it.

## Pick the lane

| Lane | Use it when | He has to | Example to copy |
| --- | --- | --- | --- |
| `talking-head` | his opinion, his story, a build-in-public update; anything where his face earns trust | film himself on a phone (9:16, 1080p) | `videos/who-is-vishnu` |
| `animated` | an explainer, a fact story, anything without him on camera | approve the script and the voice | `videos/pink-dolphins` |
| `carousel` | a how-to or checklist worth saving, when he does not want to film | approve the slides | `videos/play-store-carousel` |

Talking-head effects (one line each in `edit.md`, see the `effects` skill): `glass` (liquid glass number
graph), `screen` (pixel monitor, one word per cut), `shoulder` (cards over each shoulder; needs him filmed a
step back). Test footage for effects: `videos/fx-test`. A format that fits neither lane gets a new lane (rules
in `CLAUDE.md`), never a new repo.

## From a topic to a finished video

1. **Agree the brief** (`videos/<slug>/brief.md`). Brand, who it is for, the one point, the hook, the length.
   Load the `purple-cow` and `story-loops` skills and use at least one. Research every claim first (`research`
   skill, note in `research/`). Show him; on "ok", tick `0 Brief` in `CHECKS.md`.
2. **Write the script** (`script.md`), one paragraph per thought, plain words, no em dashes. Personal brand
   speaks as "I"; narration for a non-brand video speaks as a narrator. Show him.
3. **Then the lane:**

   **Talking head**
   ```
   python lanes/talking-head/new.py <slug> "Title" --brand personal      # once (--like <slug> to repeat a format)
   # he records takes into videos/<slug>/raw/; read what each says and number them 01-, 02- ... in script order
   python lanes/talking-head/ingest.py <slug>    # joins takes        -> work/source.mp4, ingest.md
   python lanes/talking-head/words.py <slug>     # Whisper            -> transcript.md (fix names in fixes.txt)
   python lanes/talking-head/cut.py <slug>       # last take wins     -> cuts.md, work/cut.mp4
   # write edit.md with him: style, sfx, lower-third, end-card, beats (zoom, text, stat, broll, glass, screen, shoulder)
   python lanes/talking-head/plan.py <slug>      # preview + contact sheet, every run kept in work/versions/
   python lanes/talking-head/render.py <slug>    # out/<slug>-9x16.mp4, captions, thumbnails, description
   ```

   **Animated**
   ```
   python lanes/animated/new.py <slug> "Title"           # once
   # voice: save videos/<slug>/voice/settings.json {"voice_id": "...", "model": "eleven_v3"} (or use ELEVENLABS_VOICE_ID)
   python lanes/animated/speak.py <slug> --sample        # ask him: "The selected voice is X. Continue, or change it?"
   python lanes/animated/speak.py <slug>                 # after he says continue -> voice/voice.mp3
   python lanes/animated/transcribe.py <slug>            # -> words.json, words-check.md
   # write storyboard.md: one "## beat-id | words it starts on" per picture change
   python lanes/animated/cues.py <slug>                  # -> cues.json, cues.md
   # write remotion/src/lanes/animated/<slug>.tsx (pink-dolphins.tsx is the model: one SVG world drawn from time);
   # add a theme to remotion/src/kit/themes.ts if the video needs its own look
   python lanes/animated/stills.py <slug> --fmt 9x16     # contact sheet: look at it, fix, repeat
   python lanes/animated/render.py <slug> --only 9x16    # out/, captions, thumbnails, description
   ```
   **Carousel**: write `videos/<slug>/slides.md` (format at the top of `lanes/carousel/render.py`; 5 to 6
   slides, one idea each, a tip box for a lesson from real work), then `python lanes/carousel/render.py <slug>`
   -> `out/slide-01.png ...` (1080x1350) and `out/contact-sheet.png`. Look at every slide before showing him.

   Emotion cues like `[softly]` in `script.md` are read by the v3 voice model and ignored by every other step.

4. **Show him the final** and let him pick the title and thumbnail. Tick each step in `CHECKS.md` only on his ok.
5. **Write `posts.md`** with the `captions` skill (X, Instagram, YouTube, LinkedIn). After he posts, he fills
   the Posted table; the results go in `format.md` at 48 hours and 7 days.

## Where things are

| Path | What |
| --- | --- |
| `CLAUDE.md` | the rules and the folder map (read this second) |
| `CONTEXT.md` | each lane's steps: command, file, check |
| `PLAN.md` | the content plan and lessons from real footage |
| `brand/BRAND.md`, `brand/VOICE-SETUP.md` | the look and voice; ElevenLabs keys, key rotation, the voice pick |
| `.claude/skills/` | purple-cow, story-loops, research, broll, captions, effects, art-styles, music |
| `kit/`, `lanes/`, `remotion/src/` | the shared code, each lane's commands, the picture code |
| `videos/<slug>/` | everything one video makes; `videos/_sfx/` licensed sound effects |
| `agency/` | The agency's outreach audits: targets, evidence, finished videos ready to send (see `agency/README.md`) |
| `research/INDEX.md` | every research note, one line each |

Long-term memory across sessions lives in the brain: `D:\brain\projects\studio\`.
