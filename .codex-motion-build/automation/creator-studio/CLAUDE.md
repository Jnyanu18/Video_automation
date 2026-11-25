# Vishnu's studio

One folder that turns an idea into a finished video, in any format. Each format is a **lane** with its
own steps; everything the lanes share lives in the **kit**. Every step makes one file, and a human check
comes before the next step runs.

## The rule that is never broken: storyboard before any render (Vishnu, 2026-10-23)

**Nothing is rendered until Vishnu has seen and approved its storyboard.** That means no preview, no final,
in any lane, by any AI. Rendering is heavy on the laptop and on tokens, and a render he would have rejected
from a still is wasted. The storyboard is one image, `work/storyboard.png` (`stills/` in the animated lane),
plus `work/storyboard.md`, which together show how the video goes, looks, feels and sounds:

- one still per beat, drawn with `renderStill` (single frames are cheap), in order, with its time;
- under each still: the words spoken there, what appears on screen (card, chip, effect, b-roll), the art style;
- the sound: music track and prompt, where it drops, and each sound effect;
- the cover options, and the length.

Show it as a clickable link and wait for his yes. Only then render. If he changes anything, make a new
storyboard, not a render. Carousels and covers are stills already: show those, they are the storyboard.

## Direction comes before the storyboard (Vishnu, 2026-11-06, a required step)

After the script is approved and before any storyboard, the reel is **directed** with the `direction` skill
(`.claude/skills/direction/SKILL.md`): a beat table in `brief.md` with one picture per spoken phrase, the hook moment
acted out in the first 2 seconds, the real mascots and logos, our own take on each real interface, the motion and the
sound. The standard is **34-three-agents**: Vishnu said it felt far less AI than anything before it and asked that our
reels do what it did. Every final then goes through `earshot critique` before he sees it.

Read in this order:

0. `README.md`: what this is, and how to take any topic to a finished video (start here if new).
1. `CONTEXT.md`: each lane's steps in one table (command, the file it makes, the check).
2. `brand/BRAND.md`: who is speaking, how they sound, colours, fonts, what never appears.
3. For the animated lane, the `STAGE.md` of the step you are on, under `lanes/animated/stages/`.

Where things live:

| Path | What |
| --- | --- |
| `kit/` | Shared by every lane: `common.py` (paths, the check gate), `captions.py`, `remotion.mjs` (the renderer) |
| `lanes/<lane>/` | One folder per format, with its own commands. Run from this folder: `python lanes/<lane>/<step>.py <slug>` |
| `lanes/talking-head/`, `remotion/src/lanes/talking-head/` | Vishnu films, Claude edits (see CONTEXT.md) |
| `lanes/carousel/`, `remotion/src/lanes/carousel/` | Instagram carousels: `slides.md` in, one 1080x1350 PNG per slide out |
| `lanes/animated/`, `remotion/src/lanes/animated/<slug>.tsx` | Narrated and animated, one scene file per video; `stages/` holds each step's contract |
| `remotion/src/kit/` | The shared look: captions, title cards, screens, colours, the avatar |
| `videos/<slug>/` | Everything one video produces, whatever its lane |
| `agency/` | The agency's outreach audits: targets, evidence, finished videos ready to send (see `agency/README.md`) |
| `videos/<slug>/CHECKS.md` | The sign-off log. A step does not run until the step before it is ticked |
| `archive/pre-lanes-2026-10-21/` | The layout before lanes (`bin/`, `stages/`), kept in case something was missed |
| `.claude/skills/purple-cow`, `.claude/skills/story-loops` | How to make a video impossible to scroll past, and how to keep it watched |
| `.claude/skills/broll` | Choosing, shooting, sourcing and placing b-roll and sound effects |
| `.claude/skills/research` | Studying what works before a brief, and checking every claim before it is said; notes go in `research/` |
| `.claude/skills/captions` | Post text for YouTube (Short and long), X, Instagram, LinkedIn; saved as `videos/<slug>/posts.md` |
| `.claude/skills/effects` | Talking-head effects as edit.md beats: `glass` (liquid glass graph), `screen` (pixel monitor), `shoulder` (over-the-shoulder zoom) |
| `.claude/skills/motion-graphics` | 81 Remotion motion graphics templates (charts, kinetic text, UI mocks, ambient backgrounds, cinematic effects, transitions, logo reveals, overlays, media galleries) in `remotion/src/kit/templates/` |
| `.claude/skills/art-styles` | The art styles: the brand set, the full library, each style's colours, type, shapes and motion |
| `.claude/skills/music` | Background music: making a track with ElevenLabs Music, mixing it under the voice (`kit/music.py`), the moments that make it work |
| `videos/_sfx/` | Sound effects, each with its licence in `LICENCES.md` |
| `videos/<slug>/work/versions/vNN/` | Every edit version (edit.md, preview, contact sheet), kept for before and after |
| `PLAN.md` | The content plan: lanes, the weekly mix, the 100-minute day, lessons from real footage |

## The first two seconds (Vishnu, 2026-10-26)

A platform's forecast flagged one of his shorts for one thing: "the video remains on the same static shot from 0s to
3.7s; trim the first 1-2 seconds to start closer to the first word". So in every video: the first word is spoken
within about 0.3 s of frame 0 (trim any lead-in), something visibly changes by 1 s (a card, a punch-in, a cut,
motion), and no shot holds still for more than about 1.5 s in the first 5 s. Check it on the storyboard's first
stills before any render.

## The 30-minute lane: start from a viral video (Vishnu, 2026-10-26)

The goal is 4 to 6 reels a day across the funnel (top, middle, bottom), each **idea to finished video with audio in
about 30 minutes**. Every video starts from a reel that already went viral: Vishnu shares it, Claude studies how it
moves, sounds and is structured, and we remake it with our own twist in the storyboard (our look, Ava, our facts,
a changed detail like the drone's colour). Borrowing the structure and the motion is the point; the twist is what
makes it ours. Facts still need sources and the word rules still apply.

Finding the reel was the slowest part, so since 2026-11-06 Claude finds them: the `scout` skill runs
`kit/scout.py`, then offers 3 to 5 ideas against `research/scout/taste.md`, and every yes, no and change Vishnu
gives (on ideas, scripts, storyboards, voice, renders) is logged there so the taste file keeps getting closer to his.

| Step | Command | Who | Target |
| --- | --- | --- | --- |
| Find the reel | `python kit/scout.py`, then 3 to 5 ideas (the `scout` skill) | machine, Claude, then Vishnu's pick | 5 min |
| Study the reference | `python kit/study.py <url>` then read `research/viral/<id>/` sheets | Claude | 3 min |
| Brief and script | `python lanes/animated/fast.py new <slug> "Title" --funnel top` | Claude, then Vishnu's yes | 5 min |
| Voice and words | `fast.py voice <slug>` | machine | 3 min |
| Scenes | Claude writes `scenes.json` from the views in `faceless.tsx` | Claude | 5 min |
| Storyboard and music | `fast.py board <slug>` (one music take is made meanwhile) | machine, then Vishnu's yes | 3 min |
| Final | `fast.py final <slug>`: render, mix, -14 LUFS, into `publish/NN-<slug>/` | machine | 9 min |
| Posts | the `captions` skill, into `posts.md` | Claude | 2 min |

`timings.json` in each video folder records every machine step. One render at a time, and nothing else heavy runs
beside it (a stills run once wiped a live render's files). Finished personal videos are numbered in `publish/`,
lowest number uploads first; agency finals go to `agency/videos/`.

## Delete what was used (Vishnu, 2026-10-26, a hard rule)

**Every download and temp file is deleted the moment its job is done**, in the same session: studied reels and
their frames (`research/_study/`), scratch scripts, transcode proxies nobody will use, Remotion and ffmpeg temp
(`.cache/tmp/`), test renders that were superseded. Keep only what a later step reads: the note, the final, the
files a video's next step needs. The laptop's disk filled once with 24 GB of forgotten Remotion temp; nothing
gets left "for later".

## How the words sound (Vishnu, 2026-10-26, a hard rule)

Negative words are fine, and they grab attention. What is banned is the repeated negative, the tell of AI writing:

- No "not X, not Y, not Z" chains: "not an editor, not a videographer, not a..." Say it once, or say the positive
  version ("I edit, shoot and post it myself").
- No sentence, or the same sentence shape, more than twice in one video.

Vishnu first set this on 2026-10-26 and corrected it the same day: "I did not say you cannot use negative words
ever... I don't want repeating negative words." Check every script line by line before the voice is made.

## No click at a voice join, ever (Vishnu, 2026-10-28, a hard rule)

ElevenLabs cuts some parts off mid-sound, and joining them to silence put a short "boop" at every paragraph of the
Jarvis voice. Vishnu: "That makes really bad impression while seeing the video." `speak.py` fades every part's
edges (8 ms in, 25 ms out); never remove that. Before sending him any voice, measure the 5 ms on each side of every
pause: a loud edge is a click, and it is fixed before he hears it. The same goes for any audio joined from pieces
(his takes, music sections, sound effects).

## Nothing that reads as AI (Vishnu, 2026-10-29, hard rules)

From a reel on un-slopping AI video edits (`research/viral/DfBBG0xPioN/card.md`); Vishnu: "I agree with this".

- **Captions are TikTok style, never italic serif.** Two or three words at a time, heavy white sans with a black
  outline, the word being said in gold (`Line` in `single.tsx`). No serif anywhere a viewer reads a caption or a
  call to action.
- **On-screen hook text sits on no background, plain white or plain black.** No highlighter strips, no gradients.
- **Real screenshots and screen recordings only, and Vishnu takes them.** Never scrape or automate a capture. When a
  video needs one, say exactly what to capture and he drops it in `videos/<slug>/raw/`.
- **Images go in upright and square-cornered, with no white outline**, never tilted or stickered (`Shot` in
  `faceless.tsx`).
- **No dead space and plain cuts.** Every silence in the voice is cut to 0.1 s (`speak.py`); scenes change on a hard
  cut with no fade, blur, slide, flood or whoosh (`single.tsx`).
- **Motion now and then, never the kinetic-type style.** Objects move (parts popping in on their words); text does
  not fly, type itself or bounce. For objects and structures, use the `anatomy` skill (`.claude/skills/anatomy`,
  wheresryan22/anatomy, MIT): real isometric machines that come apart to explain an idea.

## No ElevenLabs music, ever (Vishnu, 2026-10-29, a hard rule)

Music ate about 36,000 of the Starter plan's 40,000 credits in one week (40 takes, 46 minutes, about 780 credits a
minute, two thirds of them takes nobody used), while voices took 3,374, and he was never told. ElevenLabs is for
voices only. Music is a track we already have (40 tracks in `videos/*/music/`): offer him a few that fit by style
and length, he picks, and it is copied in as `music/track-1.mp3`. `kit/music.py make` and `plan` refuse. MusicGen
(free, local) was tried on 2026-10-29 and rejected ("that music is really shit"); do not offer it again. Before any
call that spends credits, say what it costs and what is left.

## Guides are documents (Vishnu, 2026-11-02, a hard rule)

Every guide a video promises in a comment keyword (LINK, GUIDE, BUILD) is delivered as a document, a `.docx` he uploads
to Google Drive and opens with Google Docs. Never as markdown and never as text to copy: copying from a preview
carries the preview's pale text colour into the doc (it came out grey on 2026-11-01, twice), and bullets and numbers
vanish. Write `videos/<slug>/dm-guide.md`, then `python kit/guide_docx.py <slug>`; `fast.py final` does this and
publishes `dm-guide.docx` (not the .md) in `publish/NN-<slug>/`. One guide per video, one document, never split
messages. Check it with the word-for-word comparison (every word of the .md appears in the .docx, in order) before
handing it over, and say you could not open it in Google Docs.

## Graph and line-art scenes; no 3D for now (Vishnu, 2026-11-02)

After testing six third-party animation skills (artemnovitckii/claude-animation-skills, MIT; results in
`videos/skills-test/NOTES.md`), Vishnu chose to keep two as our own scenes and to skip the 3D ones and the engines for
now. `graph` (a line that draws itself while one number counts up) and `lineart` (hairline steps, a dot that hops up them,
an orbit at the top) are views in `faceless.tsx`, timed to the voice, in a dark and a light theme; how to use each is in
`.claude/skills/graph` and `.claude/skills/line-art`. Real numbers only in a graph. No 3D scenes (map route, exploded
view, three.js) until he asks again.

## Dark liquid glass is the default look (Vishnu, 2026-11-02)

Every new video is a black background (`bg` `#0d0e12`) with smoked liquid-glass cards over the drifting gold, blue and
amber glows, white captions with the spoken word in gold, and gold as the accent: `GLASS_DARK`, `JV_DARK` and
`GlassGlow` in `faceless.tsx`, as in the OpenJarvis reel and `videos/harvey`. He said "we'll only be using black bg and
things without me particularly asking": do not ask which look, and do not offer a light version. A light theme stays in the
code (`theme: "light"` on `graph`, `lineart`, `jarvis`) for when he asks for it by name. Each AskVerb reel still gets its
own visual idea (DEC-2026-014), now in dark glass.

## The visuals tell the story (Vishnu, 2026-11-02, a hard rule)

How the visuals tell the story matters more than the content itself. A screen that illustrates a line (a terminal, a list, a
card with a label) does not hold a viewer; a screen where the line happens does. The first Harvey storyboard was a terminal
with no Ava and Vishnu sent it back: "it doesn't get the viewer engaged, look at how that video does it, and no Ava, why?".
Before building any scene, study the reference's frames (`research/viral/<id>/sheet-*.png`, kept until `kit/study.py --clean`)
and write `storyboard.md` with, for every beat: what happens, to whom, and what changes. Use these devices:

- **A character who does things.** Ava big at the bottom, a pose on every key line (twelve in the Harvey reel), never
  hidden unless he says so. Do not copy Jarvis's `look: "dev"` setup without asking: it hides her.
- **A banner naming each section**, so a viewer who joins late knows where they are.
- **A counter that moves** from the first second, and a crowd or list that grows with it.
- **Props that play the line:** a thing arrives, is checked, is marked, is stamped, is sent.
- **Cause and effect drawn:** a line from the finding to what it produced (the missing booking button to the sentence).
- **A through-line object or person** across stations (Maple Dental: pinned, emailed, replied).
- **Tension then release:** waiting, then approved, then a stamp.
- **A new mood per beat** (glow colour, set), always inside the dark glass default.

A terminal or code screen is a prop for one beat at most, never the whole video. Never invent a result: a counter or a
dashboard of numbers is labelled EXAMPLE or SAMPLE DATA.

## Which engine: Remotion (Vishnu, 2026-10-25)

**Remotion draws every video.** HyperFrames was made the default on 2026-10-25 and switched back the same day at
Vishnu's word ("I was wrong about the hyper frames, let's switch back to remotion"). It stays installed, with its
talking-head builder (`lanes/talking-head/hf.py`, clay and split screen only), but is used only when Vishnu asks for
it: then `engine: hyperframes` goes in `edit.md`, and `storyboard.py` and `render.py` follow it. Without that line,
everything is Remotion, as before. Its anonymous telemetry is off (`hyperframes telemetry disable`); keep it off.

## How Vishnu works with the talking-head lane (set 2026-10-19)

- **Vishnu never runs a command.** He records, drops the files in `videos/<slug>/raw/`, and approves.
  Claude runs every step, then shows him the result and waits for "ok" before ticking the next stage
  in `CHECKS.md` and moving on.
- **Every file he should open is given as a clickable link**, for example
  `[preview.mp4](D:/studio/videos/<slug>/work/preview.mp4)`, never as a bare path.
- **What Claude checks itself before showing him anything:** the contact sheet (looked at as an image),
  the transcript against the script, and every number against its source. Claude cannot hear audio, so
  sound is always his check: say exactly which seconds to listen to.
- **Hard rule: check every take before joining them** (set 2026-10-22, after a CTA take was joined first). Read
  what each take says (the join step lists its opening words), number the files `01-`, `02-` ... in the script's
  order, and only then join. Never trust file names; `ingest.py` refuses unnumbered takes.
- **Every final is shown with `out/thumbs-review.png`** (all thumbnails side by side, made by the render step)
  next to the video link, so he picks the cover at a glance. Set 2026-10-22, after a final went out without it.
- **Keep every version.** Never overwrite a version he has seen without keeping it; the plan step saves
  each run to `work/versions/`.
- If the take differs from the script, the take wins where it is true. Ask him about any claim that
  changed, and any word Whisper may have misheard (names especially), before ticking the words step.
  Confirmed corrections go in `videos/<slug>/fixes.txt`.

## How the lanes grow (set 2026-10-21)

- **One studio, one lane per format.** A new format gets `lanes/<name>/` and `remotion/src/lanes/<name>/`,
  never a new repo, so fixes to the shared parts reach every format.
- **A lane is made only when a real video needs it**, and one lane is finished before the next starts.
- **Code moves into `kit/` only once two lanes use it.** Until then it stays in its lane.
- **Colours and fonts are a theme, not code.** A video picks its theme by name; a new look is a new theme.

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
- **The description says whose voice it is** (an AI voice, or his clone). A stand-in voice is marked
  DRAFT on screen and in the file name, and is never published.
- **Vishnu picks the voice before any narration** (set 2026-10-21). Run `speak.py <slug> --sample`, give him
  the sample link and say "The selected voice is <name>. Continue with it, or change it?", and wait. Tick
  `0b Voice pick` only on his yes. Setup and key rotation: `brand/VOICE-SETUP.md`.
- **No em dashes** anywhere a viewer reads or hears. First person singular ("I"), never "we".
- **Title and thumbnail are Vishnu's call.** Offer three; he picks.
- Secrets (the ElevenLabs key) live only in the environment variable `ELEVENLABS_API_KEY`. Never write
  a key into a file, a log or a message.
