---
name: scout
description: Find the next reel to make - run kit/scout.py, read the ranked report against Vishnu's taste file, and offer him 3 to 5 ideas with the source's numbers and full script. Use when Vishnu asks for the next reel, what to make next, what is working, or to find ideas; and log every yes, no and change he gives on any step into research/scout/taste.md.
---

# Scout

Finding a good reel was the slowest part of every video (Vishnu, 2026-11-06). This skill does it, and keeps him in
the loop on every decision. It is the first step of the studio's flow:

**scout → his pick → study → script loop → direction → voice → storyboard loop → render → earshot → publish**

## 1. Run it

```
python kit/scout.py            # all queries in research/scout/config.json, about 3 min (less once cached)
python kit/scout.py --only claude --days 10
```

What it does (read-only, at human volume, once a day at most):

- searches YouTube Shorts for each query, and reads the latest Shorts of every channel on the watchlist;
- reads each one's views, likes, comments, posting time, length and channel size;
- takes each channel's median over its last 30 Shorts (its normal day) and ranks by **views over that median**;
- adds any channel that beat itself 3x to the watchlist (search ignores its date filter for Shorts, so freshness comes
  from the watchlist);
- pulls the full spoken script of the top 8 from YouTube's auto-captions; nothing is downloaded;
- writes `research/scout/<date>.md` and `.json`, skipping everything in `research/viral/` and `seen.json`.

Instagram is not read by the script: it rate-limits automated reading (HTTP 429, 2026-11-06), and the Instagram
skill's own rule is reading at human speed, never a crawler. Reels Vishnu sends still go through `kit/study.py`.

## 2. Offer 3 to 5 ideas

Read the report and `research/scout/taste.md`, then reply with 3 to 5 ideas, best first. Each one:

- **Our title** (the hook in his kind of wording, "you"-first or a gap, never the source's words);
- **Inspired by**: the link, channel and size, posted date and time, views, x normal, likes, comments, length;
- **Why it worked**: the structure in one or two lines (hook shape, payoff, the comment ask);
- **Our twist**: what only we can add, and the fact that has to be checked;
- **The source's full script** is in the report: link to it rather than pasting all of them.

Say which trend appears twice (two channels, same topic), and which picks are off-niche outliers. Rank against the
taste file, not by the biggest number. Then record every offered id in `research/scout/seen.json` (id → "offered
<date>") and a row in the taste log.

## 3. Every answer goes in the taste file

The loop only gets better if his answers are kept. On **every** step (idea, script, direction, storyboard, voice,
render), when he says yes, no or changes something, add a row to the log in `research/scout/taste.md` the same turn:
date, step, what was shown, what he said, why. Update `seen.json` with his verdict on an idea. When the same kind of
note appears twice, promote it to a rule in the Rules section (date and his words), and replace a rule he reverses.
Read the taste file before writing any script or direction.

## 4. Then the usual flow

His pick → `python kit/study.py <url>` (frames and transcript) → script (his yes) → the `direction` skill → voice →
storyboard (his yes) → render → earshot → publish. Studio checks stay his to tick.

## Tuning

- The niche lives in `research/scout/config.json` (queries, seed channels, max age, max length, min views), never
  in the code. To prune the watchlist, delete a channel from `watch` in `cache.json`.
- After a reel is posted, add its real numbers to "What works for us" in the taste file. Our own results are the
  best evidence there is.
