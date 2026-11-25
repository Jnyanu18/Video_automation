---
name: account-read
description: Read what is working on Vishnu's Instagram account (vishnubuilds.ai) from his screenshots, and say what to make more of, less of, and stop. Use every time 5 more reels have reached publish/posted since the last read in research/account/ledger.md (ask him for the screenshots then), when he sends a grid or Insights screenshot, or asks what is working. Also check every new reel idea against the Stop list before any script.
---

# Account read

Volume without a read dropped the account from 11-13K views a reel to 1.4K (2026-11-09): the topics drifted to news,
research and other people's projects while we polished. This skill keeps the feedback loop closed: real numbers from
his account decide what we make, never our taste or the look.

The one living file is `research/account/ledger.md`: the reel table, the formats, and the Focus / Less / Stop lists.
Update it in place. Never start a new dated file.

## 1. When to run

- **Every 5 reels.** Count the folders in `publish/posted/` newer than "Last read" in the ledger. At 5 or more, at the
  next natural pause (never mid-render), ask Vishnu:
  > 5 reels since the last account read. Send me the reels grid (scrolled to show them) and, if you can, Insights for
  > the best and worst one (average watch time, skip rate, shares, saves).
- When he sends a grid or Insights screenshot unasked.
- When he asks what is working, what to make next, or why a reel flopped.

## 2. Read the screenshots

- Zoom the screenshot before reading numbers (upscale a crop with PIL into the scratchpad, delete it after). Never
  guess a number: write "unreadable" instead.
- Match each tile to its reel by the frame text and order, checking `publish/posted/*/posts.md` titles. Mark any match
  you are unsure of with "?".
- Views come from the grid. Watch time, skip rate, shares and saves only from Insights screenshots. Never invent them.

## 3. Update the ledger

- Add or update one row per reel: number, slug, views, format tag, hook (first line of script.md), length in seconds.
- Format tags: `gap` (pros vs you), `free-x` (your own X for $0, replaces something paid), `free-tool` (a free tool
  for your problem), `list`, `news`, `research`, `fear`, `third-party` (someone else's achievement), `product`
  (AskVerb), `founder` (Vishnu's journey), `sequel`.
- Median views per tag, and how many reels sit behind each median. A tag with fewer than 3 reels is a hint, not a rule.

## 4. Say what to do

Report to Vishnu in chat, plainly, with the numbers:

- **Focus:** tags well above the account median, with the reels that prove it.
- **Less:** tags near the median.
- **Stop:** tags well below it, with at least 3 reels behind the claim.
- Anything that changed since the last read (a tag that moved, a new outlier) and what you think caused it.
- Caveats: small samples, one outlier, views without retention.

Then update the Focus / Less / Stop lists in the ledger, and "Last read" to today's date. **Change nothing else in the
studio**: no scripts, views, or plans. Vishnu decides what happens next.

## 5. Guard every new idea

Before any script, check the reel he brings (or any idea you would pitch) against the ledger's Stop and Less lists. If
it matches, warn him in one or two lines before doing anything else: which list, the reels and views behind it, and how
it could be reshaped into a Focus format. Then do what he decides. A warning is never a refusal.
