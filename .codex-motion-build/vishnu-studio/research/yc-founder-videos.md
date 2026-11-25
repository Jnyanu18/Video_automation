# What 93 real YC founder videos show (2026-10-27)

Source: the 102 videos in ycarena.com's Partner Simulator (`assets/js/applications.js`, each marked accepted or
rejected), YouTube auto-captions fetched with yt-dlp, 93 usable (23 accepted, 70 rejected). Keyword counts on the
captions, then the captions were deleted. Stats only are kept here; no transcripts.

| Signal | Accepted | Rejected |
| --- | --- | --- |
| Mentions money traction: $, revenue, paying, MRR, ARR | 61% (14/23) | 16% (11/70) |
| Says any number | 91% (21/23) | 57% (40/70) |
| Any traction word: users, customers, growing, waitlist, pilot | 70% | 50% |
| Over 75 seconds | 43% | 30% |
| Median length | 73 s | 64.5 s |
| Hype words: revolutionary, disrupt, passion, dream, game-changing | 9% | 14% |
| Founder background: worked at, ex-, PhD, built, sold, exited | 83% | 86% |
| Says what it does in the first ~40 words | 39% | 31% |
| Market size talk: TAM, billion-dollar market | 9% | 3% |
| Asks to be accepted ("please accept us") | 17% | 13% |
| Solo founder on screen | 13% | 14% |
| Speaking pace, median words a second | 2.98 | 3.04 |

## Written answers and one-liners (yc-oss dataset and YC company pages)

- 61 companies made their application answers public. Median answer: 6 words for the 50-character description,
  76 words for "what are you making" (75% under 130), 23 words for "how long have you worked on this".
- 6,341 YC companies; one-liners median 47 characters; "AI" in 25% of them.
- 103 companies have a public application video on their YC page (accepted only). Analyzed 2026-10-28 (audio only,
  faster-whisper base.en, audio deleted after): with them the set is 118 accepted vs 70 rejected. Money 44% vs 16%,
  any number 79% vs 57%, traction 68% vs 50%, background 77% vs 84%, hype 12% vs 14%, median length 64 s vs 64.5 s.
  The small-set findings on length and hype did not hold; money and numbers did.

## What it means (on the full 188, 2026-10-28)

- The biggest gap is money: accepted founders talk about revenue or paying customers almost three times as often.
- Numbers of any kind: four in five accepted videos have one.
- A founder's background shows up just as much in rejected videos: it's expected, not what wins.
- Length and hype words don't separate the groups; both sit around one minute.
- The first table above is the 93-video set only; where it disagrees with the 188, trust the 188.

## Limits, said plainly

- Small: 23 accepted. A difference of one or two videos moves a percentage a lot.
- The set is curated (many accepted ones are famous companies), so it isn't a random sample of applicants.
- Auto-captions mishear words, and keyword matching misses phrasing. Treat these as signals, not a study.
- Many videos are years old; YC's process has changed since.

Related: the "Up next" idea in `lanes/animated/PLAN.md`, the skill in `videos/yc-video-skill/`.
