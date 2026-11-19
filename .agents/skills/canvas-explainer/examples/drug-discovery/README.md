# Example: "OpenAI just bought Orchestra Bio" (drug-discovery news Reel, Remotion canvas, v3)

48.5 s, 1440x2560, October 2026 news batch. Madhav's own take (one real DJI talking-head take, cut-out bottom-left
for the whole film) plus four short lines in his ElevenLabs voice clone that add the news hook, context, an analogy and
a comment prompt. Code: `../../template-remotion/src/world-drug/`. Use it as the quality bar, never as content to reuse.

## Script (in order; EL = voice clone, HIS = his real take)
| # | Who | Line |
|---|---|---|
| 1 | EL | OpenAI just bought Orchestra Bio, a startup building AI agents that keep drug development on track. |
| 2 | EL | Getting a new medicine approved takes ten to fifteen years. AI could change that. |
| 3 | HIS | Could AI help scientists discover life-saving medicine even faster? I would think yes. |
| 4 | HIS | AI is really good at pattern recognition. And finding medicines are nothing but finding the right pattern which fits your protein, right? It's just like a brute force attack you have to make on all the protein structures. So the medicine sticks well with your human body. AI does that really well. |
| 5 | EL | Think of it like trying millions of keys to find the one that fits the lock. |
| 6 | HIS | I think AI will have the highest penetration in a drug discovery market. A lot of medicine will be cheaper. |
| 7 | HIS | Humans will live longer. We'll have a lot more to celebrate. |
| 8 | EL | Would you trust a medicine designed by AI? Comment below. |
| 9 | EL (outro) | Follow for more AI news. |

Under EL lines the cut-out plays his silent "listening" footage (idle matte), so his lips never move under the clone.

**On-screen hook (frame 0 to ~3 s, exact):** "OpenAI just bought a drug-development startup. Your medicine could get
cheaper." Picked with a hook scorer and honesty-checked: only claims the video supports. "X just did Y" plus a concrete
noun is the pattern that was working for AI-news Reels at the time.

## Beat table (output seconds; every start = a cue on the spoken words)
| id | start | cue | page picture (top band / right column) |
|---|---|---|---|
| hook | 0.00 | frame 0 | Ink headline (cover) + pill doodle "$$$ → $ ?"; from 3 s an outlet-style card "NEWS · OCT 20, 2026 · AI / OpenAI just bought / Orchestra Bio", "San Francisco startup, founded 2022", "joins OpenAI's Rosalind unit" / "AI agents that keep drug development on track:" + chips monitor studies, track finances, trial schedules |
| years | 5.22 | "Getting" | pill on a timeline "a new medicine → approved", 15 yellow ticks on "takes", stamp "10-15 YEARS" / hourglass, "AI could change that" underlined green |
| q | 9.77 | "could AI help" | "Could AI find life-saving medicine FASTER?" with speed lines / "YES" circled green + MADHAV'S TAKE |
| patt | 14.39 | "AI is really good" | "AI is really good at…", 8x3 dot grid, a lens sweeps, the zigzag pattern lights cyan / "PATTERN RECOGNITION" circled red |
| protein | 16.39 | "And finding" | "finding a medicine = the pattern that FITS", protein ribbon + helices, pocket circled on "fits" / "BRUTE FORCE" + illustrative "tries:" counter; four molecules try the pocket and get red X's; the fifth arcs in and fits on "sticks" (green ring, tick, "FITS!"); then the fact chip + MADHAV'S TAKE |
| keys | 29.60 | "Think of it" | a lock (= the protein), 21 grey keys "MILLIONS OF KEYS", the green key flies in and the shackle opens / "key = molecule", "lock = protein", "find the ONE that fits" |
| market | 33.34 | "I think AI will" | MADHAV'S TAKE, "where AI hits hardest: DRUG DISCOVERY" / gauge, needle swings to the green zone, "AI penetration HIGHEST" |
| cheaper | 37.91 | "A lot of medicine" | "a lot of medicine will be CHEAPER" / Rx bottle, red "$$$" tag crossed out, green "$" tag |
| live | 39.67 | "Humans" | heartbeat line rising into an arrow, "humans will LIVE LONGER" / heart, "a lot more to CELEBRATE", one confetti burst |
| comment | 42.97 | "Would you trust" | "Would you trust a medicine designed by AI?" + a capsule with a circuit trace / IG-style comment sheet with the question and YES / NO chips (no usernames, no counts) |
| end | 45.75 | OUTRO.t - 0.3 | 0.9 s zoom-out to the whole map (zoom 0.235, dimmed to 32%); "WILL AI MAKE MEDICINE CHEAPER?" + "Follow for more AI NEWS" written as the outro says it + "@madhav_somani"; static for the last ~0.4 s |

Page grid (world origins): row 1 hook (0,0) · years (1300,0) · q (2600,0); row 2 patt (0,2100) · protein (1300,2100) ·
keys (2600,2100); row 3 market (0,4200) · cheaper (1300,4200) · live (2600,4200); row 4 comment (1300,6300).
Same-row moves are 0.35 s pans; row changes are cuts.

20 sound events (~25/min): card, chips pop, years stamp, marker, YES stamp, pattern bloom, protein marker draw, brute
pop, fit click + check, fact-chip card, gauge rise, cross scribble, keys pop, unlock click, lifeline pulse, confetti pop,
comment pop, zoom-out whoosh, follow marker.

## Fact chips and honesty treatments
| Spoken claim | Status | Treatment on screen |
|---|---|---|
| OpenAI acquired Orchestra Bio (Oct 20, 2026), SF startup founded 2022, agents that monitor studies / track finances / trial schedules, joins the Rosalind unit, terms not disclosed | reported news | faithful news card with the date; no logos |
| New drugs take ~10-15 years to U.S. approval | accurate (OpenAI's own framing) | "10-15 YEARS" on the timeline |
| "finding medicines are nothing but finding the right pattern which fits your protein… a brute force attack" | simplification | chip "Simplified: new drugs still take 10-15 years to approval"; the page is tagged MADHAV'S TAKE (the research side) |
| "tries" counter | illustrative | counter only, no claim attached |
| "AI will have the highest penetration in drug discovery" | opinion | MADHAV'S TAKE tag |
| "A lot of medicine will be cheaper" | opinion / prediction | `$` symbols only: no drug names, no prices |
| v1 line "medicine made in America sold with a big markup overseas / India" and "copy the material or the protein structure" | could not be supported | **cut from the spine in v2** with his approval; the USA→India map was deleted |

## Revision history (what Madhav asked for)
- v1 (72 s): avatar-style sketched frames, camera locked to the footage tile and zooming into it, ink boil every 4
  frames, a USA→India markup map.
- v2: "background sounds are too loud... too much motion... when we zoom in and zoom out on my face, it goes in the
  middle, I hate that... fact-check me". Footage never moves; boil off; no loops; cuts on row changes; markup claims cut;
  news headline at frame 0; music ducked -15 dB.
- v3 (48.5 s): "remove ums... fast-paced... add ElevenLabs voice... keep my face for longer on the left... always
  there till the end". Always-on cut-out (mirrored), voice-clone lines for hook/context/analogy/comment prompt, a
  new picture every ~2 s with one motion each.
- The batch later moved to v6 staging (bigger 0.88 cut-out, top band + right column, IG DM question cards, series
  tag). This film stayed at v3; new canvas films start at v6 (`STAGING = "v6"`).
