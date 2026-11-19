# Pitfalls and fixes (from v1-v3 of the source film)

| Problem | Fix |
|---|---|
| v1 moved his footage: the tile flew into a game screen and popped back out, FWD push-ins on his face. He hated it. | Footage never moves. Hand-offs happen in the world only; mode changes are a 0.15 s fade (v2), and since v3 he is always the still cut-out. |
| Busy screens: scrolling stars, bobbing fighters, blinking PRESS START / INSERT COIN / P1 SELECTED, 54 random crowd pops, CONTINUE countdown. | Static starfield and floor, held poses, items fade in once, crowd in two waves on two words, no countdown. |
| Green full-frame flash around 20 s: the green `drop-shadow` rim on the cut-out lit matte holes (hands) and a faded background rectangle. | Soft dark shadow (`rgba(0,0,0,0.55)`) for `cutoutFilter`; check transitions frame by frame. |
| Fake specifics ("x99 titles" counter, an Xbox-over-PlayStation high-score ranking). | Replaced with MORE TITLES + (MADHAV'S TAKE) and "1ST @MADHAV_SOMANI / 2ND YOU?" style tables. Never invent numbers or rankings. |
| A spoken claim that is shaky ("making games is now even more cheaper"). | Keep his voice; show it as MADHAV'S TAKE plus a FACT CHECK chip "AAA BUDGETS ARE STILL RISING ↑". |
| Studio names on screen that the script never says. | Unnamed pixel buildings; only show names that are spoken. |
| Headline pop overflowed the frame; carts covered TITLES +; race bars sat on the caption. | Measure with `textW`; keep top-band text inside x 81-999; stills at every pop. |
| `cue()` throws at module load after a spine re-cut ("cue not found" / "said N times; pass nth"). | Re-point to the next phrase or pass `nth`. Run `dump-beats` (or bundle a still) right after every spine change. |
| A glyph missing from the font renders as `?`. | Add a 7-row string to `G` in px.tsx. |
| Long words overflow the narrow v6 caption column at scale 6. | Scale 5 and shift the line left to end at x 950. |
| Empty `mattes.json` at stills time shows the rectangular footage at SIDE scale. | Wait for the shell's matte (news-qa-reel), then re-snap SIDE beats. |
| Small face with empty screen around it (v3 staging). | Use the v6 staging (scale 0.88) for all new films. |
| Text in the IG UI zones (top 220, bottom 380, right 140). | Keep all screens in the top band / right column boxes. |
| Remotion refuses a 2559.99 px render. | `--scale=1.3333333333333333` (full digits). |
