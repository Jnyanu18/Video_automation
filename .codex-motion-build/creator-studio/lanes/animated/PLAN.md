# The animated lane, rebuilt: faceless videos with a signature (plan, 2026-10-26)

**Goal (Vishnu, 2026-10-26):** really good animated videos that need no filming. Sound and animation good
enough to stand next to the best Claude-made reels, a signature so anyone seeing one thinks "that's Vishnu's",
cheap in tokens, and able to take any well-performing reel he shares and remake its structure in our look with our
facts. The research behind it is `research/2026-10-26-claude-video-reels.md`.

## Where we are (about 60%)

| Have | Missing |
| --- | --- |
| Remotion rendering, the storyboard gate, CHECKS.md | **A fixed signature**: every video so far picked its own look |
| ElevenLabs voice (rotating keys) and music composed to sections | **A scene library**: each video needed its own scene file, 106 to 953 lines (qr-warships 953, pink-dolphins 633, cohort 224). That is the token cost |
| Whisper word times, cues from words | **Hits written by hand**: `sfx_hits.py` was 60 lines for one video |
| CC0 sounds placed by their peak (`kit/sfx.py`) | **A script check**: the new word rules, the first two seconds, a beat every second |
| Clay kit, ClayBuddy (5 moods), purple-cow and story-loops skills | **A study tool**: turning a shared reel into a structure card took a dozen manual steps today |

## The idea in one line

**A video becomes a script plus a short list of scenes in JSON**, and every scene is a ready-made, timed, sounded
component in one signature look. Claude writes about 40 lines of JSON per video, not 400 lines of code. That is
where quality becomes consistent and tokens drop.

## Phase 1: the signature (one session, his pick)

The signature is five things, fixed for every video:

1. **The character:** ClayBuddy grows into the mascot. He is in every shot, reacting (wow, think, sad, wave), the way
   the orange voxel is in every shot of the six-steps reel. Clay is already ours; the buddy makes it a face.
2. **The palette and type:** the brand's ink, paper and one gold accent, Fraunces for the stamp word, DM Sans for the
   line, Plex Mono for the small tags. A key word of each line lands in gold.
3. **Caption as the layout:** the spoken line builds itself at the top, the picture below acts it out.
4. **One signature transition** between sections (a gold clay squash-wipe, or a paper fold), always the same.
5. **A sonic logo:** a 0.6 s sound at the first frame and on the end card, the same every time, so it is heard as his
   before it is seen.

Delivered as three still directions on one sheet (frame 1, a middle beat, the end card each). **He picks one.** It
is then written into `brand/BRAND.md` and locked; changing it later is his call only.

## Phase 2: the scene library (the main build)

About 15 scenes in `remotion/src/lanes/animated/scenes/`, each a component that takes props, animates its parts on
the word times it is given, and **declares its own hit points** (a card lands: pop; a stamp: stamp; a cut: whoosh):

| Scene | What it shows |
| --- | --- |
| `hook-number` | one big real number that counts up, the line above it |
| `stamp` | one word slammed in (THE SYSTEM) |
| `phone` | a phone with a screen: a profile, a chat, a notification |
| `terminal` | a Claude Code window typing a prompt and ticking steps |
| `browser` | a site or dashboard, a cursor clicking |
| `chat` | message bubbles arriving |
| `chart` | a line or bars rising to a labelled point |
| `versus` | two sides, one wins |
| `list` | three to five items stacking in |
| `steps` | Step 1 of 4, a progress bar |
| `clock` | time passing, a deadline |
| `map` | a route between two places |
| `crowd` | a grid of faces filling up (a market filling) |
| `quote` | a line someone said, attributed |
| `end` | the end card with the sonic logo and one ask |

A new video's `scenes.json` is a list of `{scene, from_word, props}`. The renderer turns it into a video, the hits
come out of the scenes automatically, and `sfx.py place` and `music.py mix` run as today. A scene a video needs and
the library lacks gets built once, into the library, never into the video.

## Phase 3: the script check (`kit/lint_script.py`)

Runs on every script before the voice is made, and blocks on any of:

- a "not X, not Y, not Z" chain;
- the same sentence or the same shape more than twice;
- an em dash, or a stock AI phrase (a short banned list, kept in the file);
- a first spoken word later than 0.3 s, or more than about 12 words before the first scene change;
- a number that is not in Vishnu's sources (it asks where the number came from).

## Phase 4: study and remake (`kit/study.py <url>`)

One command for "here's a reel that did well, make ours":

1. downloads it, pulls frames and the transcript, measures the cuts a second and the words a second;
2. writes a **structure card**: the hook, each section and its job (proof, urgency, enemy, mechanism, ease, ask),
   the payoff time, the CTA, what is theirs and must be left;
3. **deletes the download and frames** (the hard rule);
4. maps the card onto our scenes with Vishnu's real facts, and that becomes the storyboard.

Tokens: Claude reads one small card instead of 90 frames.

## Phase 5: make, post, measure

Three videos from the new lane, each through the storyboard gate. After a week, compare them with the earlier ones
by what PLAN.md counts (replies, DMs, founder follows), then fix the weakest scene or rule. One change at a time,
each committed with its reason.

## What stays

The storyboard before any render, every check waiting for his yes, Remotion as the engine, the first two seconds,
real numbers only, and the word rules in `CLAUDE.md`.

## Up next (ideas he named)

- **A free Claude skill that builds your YC founder video** (named 2026-10-27): the accepted-vs-rejected analysis of
  the ycarena.com Partner Simulator videos (re-fetch captions with yt-dlp; the corpus was deleted after use), plus any
  existing similar tool, packaged as a skill that structures a one-minute pitch from that data. Then a reel about it.

## Decisions waiting on Vishnu

1. **The voice:** a clone of his own voice (ElevenLabs, his paid plan; the most "his" signature there is), or a
   stock voice like Christopher.
2. **The signature:** one of the three directions in Phase 1.
3. **The first video's topic**, to build the library against a real script.
