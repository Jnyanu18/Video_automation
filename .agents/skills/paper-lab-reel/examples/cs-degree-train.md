# Example: "If AI writes all the code, do you still need to learn CS?" (Paper Lab train set, v8)

43.1 s news Q&A Reel, October 2026, in the "Microsoft engineer answers your IG questions" series. Every word is
Madhav's own (one DJI take, sped up 1.1x and denoised). He reads two questions as if followers sent them, then answers.
Code: `../template-train/`. Storyboard: `../../../docs/paper-lab-reel/storyboard-train.jpg`. It's an opinion piece,
so there are no numbers on screen. Use it as the quality bar; don't reuse the content.

## Script (v8, after the tightening cuts)
| # | Q/A | Line |
|---|---|---|
| 1 | Q | If AI writes all the code, do you still need to learn computer science? |
| 2 | A | I would think CS degrees are still important. You still need to know how the product works, how the software works. |
| 3 | A | Imagine I want to make a hill train, right? |
| 4 | A | It needs engines which are heavy, have big, crazy throttle, crazy torque, |
| 5 | A | So I can't ask AI to build me a bullet train on Himalayan plateau. I can't. |
| 6 | A | Would customer go and buy it? I don't think so. |
| 7 | Q | So what does a CS degree actually give you? |
| 8 | A | Well, AI knows how to build a track, but the question still lies with you. |
| 9 | A | It knows how to build a train. It doesn't know what you want. |
| 10 | A | You can only understand what you want by understanding the CS, right? The computer science part, the architecture, the system design, |
| 11 | A | These questions are answered when you pursue a CS degree. |
| 12 | A | Would you still pick CS? Tell me in the comments. |

The end card is silent: "Follow for more AI news" is printed, not spoken.

**Frame-0 hook:** torn Anton headline "IF AI WRITES / ALL THE CODE, / DO YOU STILL NEED / TO LEARN CS?" with "CS?" on red
paper, under the series tag. It holds 2.0 s, then becomes the anonymous IG DM card with the exact question.

## Beat table (output seconds, every start = `cue()` on his words)
| id | start | picture (top band / right column) |
|---|---|---|
| q1 | 0.00 | hook headline -> IG DM card / the "AI" robot arm types a code sheet ("def build(): track = ai.lay() ..."), "?" on "learn" |
| still | 3.56 | "CS DEGREE" diploma unrolls + STILL IMPORTANT stamp on "important" / A · MY ANSWER tag, "how it works", a product gears card, a software code card |
| hill | 9.46 | IMAGINE: a green mountain, his hill train climbs the slope once / ticket "I WANT: a hill train" |
| engine | 12.07 | / HILL ENGINE spec card: heavy ✓, crazy throttle ✓, crazy torque ✓, each on its word |
| himal | 16.80 | a snowy Himalaya with a flat plateau; the AI arm carries a BULLET train in on "ask AI", sets it on the plateau on "bullet", then lets go and leaves; HIMALAYAN PLATEAU tag; WON'T WORK stamp on "I can't" |
| customer | 21.76 | (WON'T WORK stays) / paper CUSTOMER "would I buy it?" shrugs; NO SALE stamp on "I don't think so" |
| q2 | 24.22 | IG DM card "So what does a CS degree actually give you?" / CS DEGREE tag |
| track | 26.78 | "AI builds the track": the arm lays the track piece by piece, A · MY ANSWER, red "?"; on "It knows how to build a train" the hero train rolls onto the AI's track; WHERE TO? stamp on "doesn't know" / departures board DEPARTURES -> DESTINATION: ? -> YOUR CHOICE + ticket; YOU CHOOSE on "what you want" |
| want | 32.38 | ticket "YOUR TICKET what you want?" / paper student + CS stamp on "the CS" |
| cs | 34.91 | blue blueprint "the computer science part": app -> API -> DB / ARCHITECTURE and SYSTEM DESIGN books on their words |
| answer | 37.14 | diploma, "?" -> checks on "answered" / A · MY ANSWER + "Madhav's take" |
| comment | 39.62 | IG-style comment card "Would you still pick CS? / Tell me in the comments." + YES / NO chips (no usernames, no counts) / hero train |
| end | 41.80 | "ADMIT ONE" ticket with the headline question, "Follow for more AI news", @madhav_somani on red tape, the train |

17 sound events (about 24 per minute): card land, stamps (important, won't work, no sale, where to, you choose, CS),
train toots, check selects, pops on DM/comment cards.

## Lesson: don't repeat one analogy too often (v8)
After v7, Madhav said: **"we have said 'train' so many times"**. One analogy is fine, but say the word once or twice.
The rest should come from the picture, not the script.
- v8 cut, with their spoken words: the build beat ("AI can build a train" + HILL / BULLET / STEAM / ELECTRIC cards),
  the four-train cards (bullet / normal / hill / coal) and the choose beat, and "AI: BUILT IT" + FOR SALE. That took the
  film from 57.3 s to 43.1 s and tightened it.
- Rule for new films:
  - At the concept stop, count how often the analogy noun is spoken.
  - If it comes up more than about twice, offer EDL cuts of the repeats.
  - Let the props carry the metaphor silently: the track is drawn while he says "track", and the train just rolls on.
  - Don't add on-screen labels that repeat the word again.
- The same applies to the props. One hero train plus at most one gag (the bullet train on the Himalayan plateau) reads
  better than a catalogue of four train types.

## What Madhav liked and disliked (v1-v8)
- Liked: the train set as a tactile metaphor; the Himalayan-plateau gag (a bullet train is the wrong product for a
  mountain, so a customer won't buy it); the v6 bigger face; questions shown as anonymous IG DMs; "MY ANSWER" tags.
- Disliked:
  - Too much motion and zooming toward his face (v1).
  - A small face with blank screen around it (v5).
  - The same word said again and again (v7).
  - Clutter: v2 removed idle bobs, sways, perpetual smoke and spinning suns.
- v4 tried an original paper-cut **Dadaji** (grandfather) who asked the questions in a voice clone, with lip-flap from
  the voice level. v5 replaced him: Madhav reads the questions himself, which became the series format. The character is
  kept in `template-train/src/world/dadaji.tsx` for a future "family asks" format; it's original and not based on anyone.

## Honesty
It's an opinion piece: no numbers, no claims beyond the script. His answers carry "MY ANSWER" and "Madhav's take". The
v2 bandwidth-vs-security trade-off labels were removed when that line was cut from the spine, and the scale got "?"
weights instead.
