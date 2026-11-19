# Pitfalls (from the source film's five revisions)

- **Stale cues throw at load.** Every spine change (pause trims, a re-record) moves or removes words;
  `cue()` throws on a missing or repeated phrase. Run `dump-beats` after every new spine and re-point
  beats and `times.ts`. Repeated words need `nth` (`cue("plane", 0)`).
- **Transcript artefacts.** One spine had a repeated sentence all stamped at the same time; its caption
  chunks got zero length. Clean `words.json` in the shell, not in the world.
- **Stages crossing the top band.** The tower's rockets fly 1900 px; clip the tower scene to the right
  column (`clipPath` x 740-1080, y 772-1302) so a booster never streaks through the headline.
- **The narrow right column (196 px).** Long chip lines overflow; condense with `fitW` / `textLength`,
  split into 2-5 short lines, or shorten the copy. Check every chip in stills.
- **His hair moves.** He leans in; the head box must be the union over the take (his hair reached
  x ~735 at one moment). Measure from several stills and keep right-column cards at x >= 744.
- **The sun behind the cards.** In the landscape set the sun sits behind right-column cards; it reads
  fine with hard-shadowed cards, but don't put cream text directly on the sun.
- **Too much motion (his explicit note).** Removed: landscape drift, rotating sun rays, twinkling stars,
  a spinning globe, a swinging price tag, staggered city-dot pops, strong snap shakes, a multi-flight
  reuse loop. One primary motion at a time.
- **Footage-dependent hand-offs.** Older versions flew his footage into a dial ("tile"). The v2+ presenter
  never moves his footage; worlds must not depend on it.
- **Facts.** Only his words plus the approved chips. His predictions need "MADHAV'S PREDICTION" or
  "MY TAKE"; product concepts that don't exist yet need a short "REALITY CHECK ... STILL A CONCEPT" chip.
  Don't add a fact you can't fit legibly (the Flight 14 date was dropped for room, not shoved in small).
- **Captions over the face.** Captions belong in the right column in v6; never put a label box over his
  face. Short lines can make item-start holds short: check that the question card stays up >= 1.5 s.
- **`dump-events` under Node** needs `run-dump.mjs` (DOM stub for the font and paper-texture modules).
- **Remotion `--scale`.** Use `1.3333333333333333`; fewer digits give 2559.99 px and Remotion refuses.
- **Audio.** He said the background was too loud: music ducks -15 dB under every phrase and effects stay
  >= 20 dB under his voice band. Keep events sparse (<= 25/min, only on real visual hits).
