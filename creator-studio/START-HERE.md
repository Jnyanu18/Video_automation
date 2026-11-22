# Vishnu's studio: start here

This folder turns a topic into a finished short video for Instagram, YouTube Shorts and X: the script, the voice, the animation, the captions, the music, the thumbnails and the post text. An AI agent (Claude Code) does the work. You give it a reference reel or a topic and say yes or no at each step.

## What you need

- A Windows PC with about 15 GB free (the AI models the studio uses are large).
- An internet connection for the install.
- An ElevenLabs account and API key, for the narration voice.
- Claude Code.

## Install it

1. Unzip this folder. The best place is `D:\studio`: some guides inside mention that path. Anywhere else works too.
2. Open PowerShell in the folder (in File Explorer, click the address bar, type `powershell` and press Enter).
3. Run:
   ```
   powershell -ExecutionPolicy Bypass -File .\install.ps1
   ```
   If it says a tool is missing (Python, Node.js, Git or FFmpeg), it prints the exact command to install it. Run that, open a new PowerShell window, and run the install again. It picks up where it stopped.
4. Add your ElevenLabs key. In the Start menu, search "Edit environment variables for your account", click New, and add:
   - Name: `ELEVENLABS_API_KEY`
   - Value: your key

   A second key with credits can go in `ELEVENLABS_API_KEY_2`; the studio moves to it when the first runs out.

The first time the sound checker runs, it downloads about 1.1 GB of models. That happens once.

## Use it

Open the folder in Claude Code and say:

> Read AGENT-SETUP.md, then README.md.

Then give it work, for example:

> Here's our next video: (an Instagram link). Study it and write me a script.

How each video goes:

1. It studies the reel and checks every fact at the original source.
2. It writes the script and shows you the whole thing. Nothing is recorded until you say yes.
3. It records the voice, then makes a storyboard: a sheet of stills, one per moment. Nothing is rendered until you say yes.
4. It renders the video, checks the sound, and writes the post text and the DM guide.

Finished videos land in `publish\`, one folder each, with the video, three thumbnails, `posts.md` and the guide. When you've posted one, tell it, and it moves the folder to `publish\posted\`.

## What's in here

| Folder | What it holds |
| --- | --- |
| `videos\` | One folder per video: brief, script, scenes, word timings, checks |
| `remotion\` | The animation code: every look and every scene |
| `kit\`, `lanes\` | The commands that voice, time, render and publish a video |
| `.claude\skills\` | Know-how the AI loads: research, direction, captions, music, effects |
| `research\` | Notes on reels studied, the scout, and the account ledger (what works on your account) |
| `brand\` | Brand notes and characters |
| `tools\` | Added by the install: earshot (sound checker) and the humanizer |

## Not included

- Rendered videos, voice recordings, music, footage and each video's raw assets (screenshots, logos, photos). They're large. New videos work fully; to re-render an old one, copy its voice and raw folders over from the original studio.
- Frame grabs of other people's reels in `research\viral\`. The notes on each reel are kept.
- Any API key. Keys live in your Windows environment, never in files.
