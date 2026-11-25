# Five reels about making videos with Claude (studied 2026-10-26)

Vishnu shared five reels while setting the studio's next goal: faceless, animated videos with a look anyone
recognises as his. Each was downloaded, cut into one frame a second and transcribed, then deleted. Sizes and
likes were not read: Instagram rate-limited the profile read (HTTP 429), and the toolbox rule is to stop there.

## The five

| Reel | Length | What it is |
| --- | --- | --- |
| De8yh94R0SZ (adilet.fndr) | 48 s, 9:16 | "I grew this account to 42,500 followers in 5 weeks", selling his 221-file Claude video system for $17 |
| De7Hwu-yA0O | 29 s, 9:16 | The same motion, first silent, then with frame-placed sound: "Motion is half the video. Sound is the other half." |
| De70StgyIZZ | 91 s, 16:9 | "How to make motion graphics with Claude Code in 6 steps", an orange voxel mascot on every shot |
| De7O1knyumF | 57 s, 9:16 | Talking head listing three GitHub repos of Claude-made videos, comment "OPUS" for links |
| De7uDsNzA2d | 78 s, 16:9 | "This video was made by Claude using my skill file", then a pitch for a website copier |

## What makes the adilet.fndr reel work (the one Vishnu liked most)

- **One look, held for 48 seconds:** warm off-white paper, black grotesk type, the key word of each line in a red
  italic serif, a tiny mono tag at the top left (`// 03 · the market`), isometric illustrated objects in the middle,
  a condensed bold stamp word under them (THE SYSTEM, SLOP, JUST ASK). Two colours and three fonts, never more.
- **The caption is the layout.** The spoken line types itself at the top, word by word; the picture below acts it
  out. There is no separate subtitle track.
- **A new picture about every second**, and a halftone-dot wipe between sections, so the section change is felt.
- **Shape:** proof (a real number on a real profile) in the first second, then urgency (the market fills in 3
  months), an enemy (most AI reels are slop), the mechanism (221 files built from reels with millions of views),
  how easy it is (drop the folder into Claude Code, ask for a reel), then a comment-keyword CTA.
- **The voice** sounds generated; nothing in it is filmed.

## What the others add

- **Sound is half of it** (De7Hwu): the same picture plays twice, silent and then with sound placed on every frame,
  and the second one is the whole argument. The studio already does this (`kit/sfx.py`, 2026-10-26).
- **A mascot makes it recognisable** (De70Stgy): the same orange voxel character sits in every shot, whatever the
  scene. Real numbers on screen: "empty folder to MP4, 8 minutes 41 seconds", "a sixth of the tokens the second
  time". The point that counts for us: **a saved skill turns four prompts into one sentence**, which is the token saving.
- **Free reference libraries** (De7O1kn) named on screen: `pdoom-video`, `awesome-opus5-5-videos` (viral videos with
  their prompts) and `lemo-opuscar` (59 code-made film styles). Worth reading for technique; names read off the
  frames, so check the exact repo paths before using them.
- **The phrasing to avoid** (De7uDs): "Your AI isn't the problem. It just has nothing real to learn from." This is
  the negative-turn pattern Vishnu banned the same day.

## Borrow, and leave

| Borrow (structure) | Leave (theirs) |
| --- | --- |
| The caption-as-layout: the line on top, its picture below | Off-white plus red plus serif italic: adilet's look |
| A picture change every second, a felt wipe between sections | The orange voxel mascot |
| Proof number first, then urgency, enemy, mechanism, ease, CTA | Their wording, their numbers, their claims |
| One mascot in every shot | The "comment SKILL" sales mechanic, unless Vishnu wants it |
| Silent-then-sound as a format | |

## Is the $17 system worth buying?

It is 221 files tuned to produce **his** look, and the look is the part we must not reuse. Everything it does
(script, voice, scenes, word-timed captions, render) the studio already does in its own way. What the studio lacks
is a fixed signature and a library of ready scenes, and that is the plan in `lanes/animated/PLAN.md`.
