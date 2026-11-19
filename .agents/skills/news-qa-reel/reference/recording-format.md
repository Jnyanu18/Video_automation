# Recording format and script template

## The take
One reel = one short section of a single recording session (he records 5-7 reels in ~12-15 min):

1. **HOOK, 0-3 s.** To the lens, punchy, about 8 words. Record it 2-3 times with different energy; pick the best.
   It becomes the frame-0 headline word for word, so it must be honest (no claim the reel doesn't support).
2. **Q1.** He reads the question out loud as if a follower asked it (glancing at the phone is fine), pauses 1 s,
   then answers from talking points **in his own words** (never read answers: that is what makes it feel natural).
3. **Q2** (and an optional short Q3). Same again.
4. **ASK.** A comment question to viewers, then "Follow for more AI news."

Length after the spine: 35-60 s typical (a dense news one ran 94 s and he was fine with "+30 s" there).

## Recording setup to send him
- Same camera, framing and spot for the whole session (waist-up, centred). Plain wall or garden is fine; we cut
  him out. Same top across sessions if a HeyGen twin of this look is wanted later.
- Say the reel number before each one ("Reel 3"), wait 2 s. Leave ~1 s of silence between hook, Q1, Q2, ask.
- Talk to the lens. Hands welcome: the cut-out is mirrored, so his hands point toward the graphics.
- Separate mic (DJI mic WAV) recommended; the spine uses it when present.

## Hook rules (from the batch)
- News first, in one breath, with the specific thing ("The US just banned a Chinese AI. Was that fair?").
- Personal beats generic: "I barely write code anymore. Here's what I do instead." outperformed "Is AI a bubble?".
- Score options with the ig-reel hook scorer but weight it only 25% (it did not track his real results); see
  `examples/virality-scores.md` for the weighted card (hook, timeliness, broad stake, authority, comment trigger,
  length fit, pacing).
- Post time-sensitive news first; news decays within days.

## Script template (copy per reel)

```markdown
# <batch name>: recording script (<n> reels, "I read the question, then I answer")

**Format for every reel (45-60 s):**
1. **HOOK, 0-3 s.** Say it to the camera, punchy, about 8 words. Pick one; ⭐ = my pick.
2. **Q1.** Read the question out loud as if someone asked you. Pause 1 s, then answer from the talking points in
   your own words. Don't read the answers.
3. **Q2.** Same again.
4. **ASK.** Put the question to viewers (it drives comments), then "Follow for more AI news."

**Why some words are bold:** the animations trigger on them. Say each **bold** word somewhere in that section and
the visuals line up with your take automatically. Everything around them is up to you.

## Recording setup
- <framing / spot / clothing / reel number / 1 s silences / 2-3 hook takes / talk to the lens>
- Total: <n> reels x ~1 min, plus retakes ≈ <m> min.

---

## <k>. <Reel title>
**HOOK** (pick one)
- ⭐ "<hook A>"
- "<hook B>"
- "<hook C>"

**Q1 (read):** "<question with **trigger** words>"
- <verified fact, with **bold** trigger words>
- <verified fact>

**Q2 (read):** "<question>"
- Your take: <one-line stance>
- **For example**, <a concrete example or analogy (one analogy per reel; don't repeat it)>
- <closing thought>

**ASK:** "<comment question>? Tell me in the **comments**." → "Follow for more AI news."

Facts: <which facts are verified, with source>. Don't say "<claim>": <why it is cut>.

---

## After you record
Drop the files anywhere and tell me. I'll transcribe, pick the best hooks, cut the ums and long pauses, re-time
the animations to your words, mix, render at 1440x2560 and QA, and send them back. Nothing is posted until you
approve.
```

The real batch script is `examples/recording-script-news-batch.md`.
