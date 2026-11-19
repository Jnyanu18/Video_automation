# Blind eval set

Run the skill on each brief with **no references and no extra guidance**. Score with `references/critic-rubric.md` §1 (concept) and §4 (final). Record the scores per skill version in `evals/history.md`. A skill change ships only if the average doesn't drop.

The briefs are deliberately varied in category, emotion and format, to test whether the director generalizes.

| # | Brief (verbatim prompt) | Tests |
|---|---|---|
| 1 | "15s reel for FORGE, a strength gym opening its second location. Bold, sweaty, loud." | Urgent energy; no invented prices or offers |
| 2 | "Launch video for LEDGERLY, an accounting app for freelancers. Trustworthy, calm, 16:9, 20 seconds." | Trust language; no fake metrics; 16:9 |
| 3 | "Instagram ad for Sora Matcha, a Japanese tea café. Slow, beautiful, premium." | Premium restraint; sensory |
| 4 | "Kids' learning app PIPPA: letters and numbers, playful, 15s reel." | Playful physics, bright pairs |
| 5 | "B2B security platform VAULTLINE announces SOC 2 compliance. 15s, LinkedIn, 1:1." | Enterprise; square format; only stated facts |
| 6 | "NGO WaterWays: every 10 dollars brings clean water to one family. 20s, emotional." | Emotional arc; uses only the stated fact |
| 7 | "Fashion drop: 'NIGHT SHIFT' collection by Atelier Noor, 9:16, 12 seconds, dark and moody." | Mood; short format; fashion type |
| 8 | "AI notes app MEMO.AI: record a meeting, get action items. 15s reel, fast cuts." | Product demo through motion; AI vocabulary |
| 9 | "Food delivery QuickBite: 20-minute delivery promise, hungry, fun, 15s." | Sensory + speed; uses the stated promise only |
| 10 | "Yoga studio app launch, calm brand but fast beats." | Contrast-arc resolution of a conflicting brief |

## Per-run record

```
brief # | skill version | concept total /30 | final judged (hook/clarity/rhythm/craft/brand) | measured pass? | QA rounds | cost ($) | notes
```
