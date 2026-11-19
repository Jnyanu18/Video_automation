# Vishnu's studio

## What this is

A folder that turns an idea into a finished, on-brand video, narrated in Vishnu's own (cloned) voice,
with a pixel avatar of him that talks in sync. It exists to share what he knows, as content for two
brands: his personal brand (building AskVerb in public) and Auralion Labs (the agency).

It follows the way animation studios have worked since about 1930: voice first, then every word timed,
then a storyboard timed to the words, then a rough pass checked before anything is final, then the
render. Each stage is one command that makes one file, and Vishnu checks that file before the next
stage runs.

Built 2026-10-13. The first video, `videos/day-12-feature-trap`, ran end to end as a DRAFT (stand-in
voice): 61.6 seconds, 16:9 and 9:16, captions, three thumbnails and a description with chapters.

## Where to start

| Read | For |
| --- | --- |
| `CLAUDE.md` | the map, and the rules any AI follows here |
| `CONTEXT.md` | the five stages: command, file, check |
| `brand/BRAND.md` | voice, look, avatar, the two brands |
| `brand/VOICE-SETUP.md` | cloning your voice (one time) |
| `stages/*/STAGE.md` | each stage's contract |

Make a new video: `python bin/new.py <slug> "Working title"`, then write the brief and script with
Claude. Preview with sound: `pnpm studio` (run it yourself, in this folder).

## Next steps (in order)

1. **Watch the sample** in `videos/day-12-feature-trap/out/`. Note anything off: pacing, the avatar,
   the captions, the colours.
2. **Check Pixel Vishnu looks like you** (`remotion/src/kit/PixelVishnu.tsx`): hair, skin tone,
   glasses, blazer. Each is one line to change.
3. **Clone your voice**: record 2 to 5 minutes of yourself talking, make an Instant Voice Clone on
   ElevenLabs, set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` as user environment variables. Steps
   in `brand/VOICE-SETUP.md`. Never put the key in a file.
4. **Re-voice the sample** with your clone: `python bin/speak.py day-12-feature-trap`, then run
   transcribe, cues, stills and render again (tick each stage in CHECKS.md as you go). The DRAFT label
   disappears by itself.
5. **Pick music**: a royalty-free source you are licensed to use. Then the mix gets wired into render.
6. **Decide where it goes out** (YouTube, Shorts, Reels, TikTok, LinkedIn, X) and the scheduling tool,
   so the last stage can hand off to it.
7. **Make the first agency video**: brief with "Brand: agency (Auralion Labs)", an end card pointing
   to auralionlabs.com, no client named without written permission.
8. **Set a rhythm**: for example one Day-N recap a day from the AskVerb challenge logs, and one agency
   how-to a week.

## Known small issues

- Two words in a row can be highlighted gold for a moment (each highlight lingers ~0.08s).
- No background music or sound effects yet.
- `--force` exists to run a stage without the previous one ticked; it is for drafts only.
