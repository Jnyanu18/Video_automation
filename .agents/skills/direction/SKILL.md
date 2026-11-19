---
name: direction
description: "Direct a studio reel before its storyboard is built - the look, a new picture on every phrase, the hook moment, real assets, motion and sound. Use for every reel in D:\\studio, after the script is approved and before any storyboard or render. 34-three-agents (2026-11-06) is the standard: Vishnu said it felt far less AI than anything before it."
---

# Direction

The script says what is said. Direction decides what is seen and heard on every phrase. It is a required step
(Vishnu, 2026-11-06): no storyboard is built until the direction is written into the brief, and every storyboard is
checked against it. "It's not the AI, it's direction" (DfWlPu3FTcE).

## The standard: 34-three-agents

Vishnu, 2026-11-06: "this one particularly feels way less AI than everything we ever did... try to only do whatever
you did on this for our reels." What it did, and what every reel copies unless he says otherwise:

1. **A look with one clear system.** Our white theme as the base; each subject gets its own colour world that floods
   in from the centre (Dots violet to black, Muse cobalt, Grok Bot black); chapter tabs show where you are (01 · 02 ·
   03); serif headlines with one italic word ("Completely *different*."); clean sans captions at the bottom with the
   spoken word in the world's accent. Code: `remotion/src/lanes/animated/keynote.tsx`.
2. **Real assets as constants.** The real mascots and logos, never redrawn as something else: Dots from OpenAI's press
   image, Hatch from muse.ai, the Grok Bot blob drawn exactly as xAI's. Find them on the official pages and press
   coverage; when one can't be found, ask Vishnu for a screenshot (he supplies them). Credit them in the captions.
3. **Real interfaces, made our own.** Look at each product's real interface first (its site, its press screenshots,
   how its makers describe it), then build our own mock-up that works the same way: Dots' two panes (chat left, its
   own computer right), Muse's phone with tasks landing, Grok Bot's team chat where bots take jobs and ask for
   approval. Every mock is labelled ILLUSTRATIVE, and every placeholder holds believable data, never an empty box.
4. **A new picture on every phrase.** Plan one visual state per caption chunk (about one a second), and each one
   shows the sentence being said: "it gets its own computer" slides its computer in; "while you're away" shows a moon
   and "you're offline · it keeps going"; "you give each bot a job" turns grey "no job yet" bots into Sales and
   Marketing. Nothing holds still for more than about 1.5 s.
5. **One hook moment you can see.** The first sentence is acted out in the first 2 seconds: three look-alike cards
   flip into three different worlds on "completely different"; the samurai cut on "killed" (33-claude-killed-instagram).
6. **Motion that feels made.** Entrances spring in with a small overshoot and settle; colour worlds flood from the
   centre; the camera pushes in slowly on each beat; typing types; checks pop; buttons press. Smooth for a keynote,
   stop-motion steps (12 a second) for paper.
7. **The voice acts.** 2 or 3 emotion cues per script ([curious], [excited], [laughs softly]) where a person reacts.
8. **Sound placed, then checked.** One effect per event that matters, the minor ones soft, one sub under the hook
   moment; music under the whole reel at the default bed (-19 LUFS); then `earshot critique` on the final, fixing
   anything critical or major before Vishnu sees it.

## How to direct a reel

1. Read the approved script and split it into caption chunks (two or three words, as the captions show them).
2. Write a **beat table** into `brief.md` under `## Direction`: one row per chunk with the time, the words, what is on
   screen, what moves, and the sound. Mark the hook moment.
3. List the **real assets** needed (mascots, logos, interface references) with their sources; get them before
   building (official pages first, then press coverage; never bypass a site's protection; ask Vishnu when stuck).
4. Pick the look: white keynote (the default after 2026-11-06), paper collage, or dark for screen recordings.
5. Build, render the storyboard stills at the beat times, and check each frame against the beat table: does every
   phrase have its own picture, does the picture show the sentence, is anything empty, cut off or unreadable?
6. Show Vishnu the storyboard. After his yes: render, run earshot, fix, deliver.

## Never

- A headline sitting alone for more than a second while the voice talks.
- An empty placeholder box, or a generic icon where the real mascot or logo exists.
- Redrawing a brand's mascot into something else.
- A loud effect on every beat (earshot flags more than about 1.7 a second).
