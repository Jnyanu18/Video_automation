# Animation skills test (2026-11-02)

Repo tested: https://github.com/artemnovitckii/claude-animation-skills (MIT, commit 5dbea55, 30 stars).
Six skills, each made a 10 s video on this Windows PC. The repo, its models and its browser were deleted afterwards
(downloads go when their job is done). Re-installing takes about 15 minutes.

## What was made

| File | Skill | How the 10 s was made |
| --- | --- | --- |
| 1-graph.mp4 | /graph | 4 s animation, last frame held 6 s. Made-up numbers, labelled "test data" |
| 2-minimalistic-graphics.mp4 | /minimalistic-graphics | 3.8 s animation, held 6.2 s |
| 3-map-route.mp4 | /map-route | 4 s animation, held 6 s |
| 4-breakdown.mp4 | /breakdown | 4.2 s animation, held 5.8 s |
| 5-stick-figure.mp4 | /stick-figure | New 4-line script, free Kokoro voice, 3 shots reused from the pirate example, sound re-cut |
| 6-3d-cartoon.mp4 | /zach-d-films | New 4-line script, free Kokoro voice, the example's archer and arrow shots re-timed, voice only |

The four quick skills are silent. Only the two engines make a voice (and the stick figure its own music and effects).

## Windows fixes needed (the repo says macOS and Linux only; none is in the repo)

1. `kit/anim.py`: `subprocess.run(['npx', ...])` fails on Windows; use `shutil.which('npx')`.
2. `skills/zach-d-films/engine/render.mjs`: `path.dirname(new URL(import.meta.url).pathname)` gives `/C:/...`; use `fileURLToPath(import.meta.url)`.
3. `skills/stick-figure/engine/tools/render.js`: `'file://' + process.cwd() + '/web/index.html'` breaks on `C:\`; use `pathToFileURL`.
4. The 3D project needs `node_modules` linked in (the skill says `ln -s`; on Windows use a junction: `New-Item -ItemType Junction`).
5. `make.sh` expects `kit/.venv/bin/python`; a Windows venv has `Scripts/python.exe` (a one-line bash shim at `.venv/bin/python` works).
6. `install.sh` symlinks into `~/.claude/skills/`; not run, the builders were run directly from the clone.
7. A concat list for ffmpeg needs paths relative to the list file when the shell gives MSYS paths.
8. Set `PLAYWRIGHT_BROWSERS_PATH` to a folder inside the clone so the 88 MB browser deletes with it.

## Timings on this PC (Intel HD 5500, no usable GPU)

Quick 2D skills about 50 s each; the two 3D quick skills about 2.5 to 3 min each; the 3D cartoon 0.65 s a frame
(about 3 min for 10 s; the first still in a session costs about 5 s of start-up); the stick-figure hook shot took about 30
minutes because it blurs the whole 1080x1920 background in software (`ctx.filter = 'blur(5px)'`); the other two shots took
about 1 minute each.

## Not checked

The videos were judged from contact sheets and single frames, not played with sound. The made-up graph numbers are
test data only.
