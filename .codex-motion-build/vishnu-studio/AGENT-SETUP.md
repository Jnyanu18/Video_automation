# Agent setup: read this first on a fresh install

You are an AI agent opening this studio on a machine where it was just unzipped. This page gets the install verified and tells you what to read next. After that, `README.md` (how to make a video) and `CLAUDE.md` (the rules) take over.

## 1. Verify the install

Run from the studio root. Report each result to the user plainly; fix or ask about anything that fails.

| Check | Command | Expect |
| --- | --- | --- |
| Python packages | `python -c "import PIL, numpy, docx, whisper; print('ok')"` | `ok` |
| Remotion | `node -e "require('remotion'); console.log('ok')"` | `ok` |
| Typecheck | `npx tsc --noEmit -p .` | Only the 5 known errors: `ClayBuddy.tsx`, `mascots.tsx`, and three in `faceless.tsx` near the hits list |
| FFmpeg | `ffmpeg -version` | a version line |
| earshot | `tools\earshot\.venv\Scripts\python.exe -m earshot doctor` | no errors |
| Humanizer | `python -I -X utf8 tools/instagram-agent-skill/skills/ig-human/detect.py videos/open-inbox/script.md` | a HUMAN SCORE line |
| Voice key | `python -c "import os; print('ELEVENLABS_API_KEY set' if os.environ.get('ELEVENLABS_API_KEY') else 'not set')"` | `set` |

If `tools\` is empty, the install script did not run: ask the user to run `install.ps1` (START-HERE.md), or run its steps yourself with their permission.

Check that a key is set. **Never print, echo or read a key's value.**

## 2. Read, in this order

1. `README.md`: the lanes and the commands, from a topic to a finished video.
2. `CLAUDE.md`: the studio's rules. They override your defaults.
3. `research/account/ledger.md`: what works on the account right now (the Focus, Less and Stop lists). Check every new idea against it before writing a script.
4. `.claude/skills/`: load a skill when the task matches its description (account-read, scout, research, direction, captions, music, effects and others).

## 3. The workflow, short

Each step waits for the user's yes before the next:

1. **Study and research.** `python kit/study.py <instagram url>` writes `research/viral/<id>/card.md` with a transcript. Check every claim at the primary source (the repo, the company's own docs).
2. **Script.** Make the folder with `python lanes/animated/fast.py new <slug> "Title"`. Write `videos/<slug>/script.md`: one paragraph per thought, an emotion cue like `[excited]` on each, plain words, no em dashes. Run the humanizer until it says PASS. Show the user the **whole** script.
3. **Voice.** After the yes, tick Script in `CHECKS.md` with their words, then `python lanes/animated/fast.py voice <slug>`. Read `words-check.md`: a misheard name means the voice said it wrong, so re-roll that paragraph (`python lanes/animated/speak.py <slug> --only N --force`, then `python lanes/animated/transcribe.py <slug> --force`).
4. **View and storyboard.** Write the scene view in `remotion/src/lanes/animated/<name>.tsx` (beats keyed to `parts` phrases in `videos/<slug>/scenes.json`), register it in `faceless.tsx` SCENES under a key that isn't already used, then `python lanes/animated/fast.py board <slug>`. Look at `stills/contact-sheet.png` yourself and fix what's wrong before you show it.
5. **Render.** After the yes, copy a music track the studio already has into `videos/<slug>/music/track-1.mp3` with a `SOURCE.txt`, then `python lanes/animated/fast.py final <slug>`. It publishes to `publish/NN-<slug>/`.
6. **Check.** Run `tools\earshot\.venv\Scripts\python.exe -m earshot critique <mp4>` and look at frames from the final file. Then write `posts.md` and `dm-guide.md` (made into a .docx by `python kit/guide_docx.py <slug>`).

## 4. Hard rules

- Never render before the user approves the storyboard. Never voice before they approve the whole script.
- Never invent a fact, a number or a customer. Label anything made up for the animation as illustrative in the post.
- Never read, print or write an API key or a `.env` file.
- After any re-voice, check every `parts` phrase in `scenes.json` still matches the new `words.json`. A phrase that no longer matches makes its beat start at 0 s and cover the whole video.
- Generate no new music. Reuse a track the studio already has.
- Delete downloads and temp files once their job is done.
