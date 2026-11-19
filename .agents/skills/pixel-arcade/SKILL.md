---
name: pixel-arcade
description: >-
  Madhav's "Pixel Arcade" world for news / take Reels: everything is 8-bit pixel art on a 9 px
  grid (crisp SVG rects, a hand-made 5x7 bitmap font, no web fonts), CRT scanlines, vignette and
  a soft neon bloom, a starfield over a synthwave perspective floor, the presenter's real cut-out
  framed as "P1 MADHAV" (PLAYER 1), and every idea as a game screen: patch notes, a CHOOSE YOUR
  PATH menu, a VS / ROUND 1 / FIGHT! screen with health bars, crowds of pixel players, ? blocks
  and cartridges, a territory map, GAME OVER? -> CONTINUE end card, all timed to his exact words.
  Use when asked for a "pixel", "8-bit", "arcade", "retro game", "video-game style" or "make it
  like the Xbox one" Reel, especially gaming, rivalry (X vs Y), console or tech-company news.
  A Remotion world that plugs into the news-qa-reel shell and runs inside cstack animated-video's
  stages and approval stops. Not for 3D worlds (iso-diorama-3d, luminous-cosmos-3d) or paper
  collage (paper-lab-reel).
---

# Pixel Arcade (8-bit game-screen world over the real presenter)

The whole Reel is an arcade cabinet. The presenter stays real (his own footage, cut out with a
local matte) and becomes PLAYER 1 inside a green "P1 MADHAV" frame; every sentence he says turns
into a game screen around him. It was built for "Is Xbox losing to PlayStation? Here's my take."
(the c6 clip of the Oct 2026 news batch, 39.7 s). This skill is the method and the kit, not that
film's content: design new screens for every topic.

Run it **inside** the cstack `animated-video` skill (Remotion; read it first) and on top of the
**`news-qa-reel`** shell skill, which owns the spine (EDL, words, ElevenLabs lines, vo.wav), the
presenter cut-out, captions placement, the series tag, the IG-DM question cards and delivery. This
skill only supplies the *world*: `World: WorldDef = { Back, Front, Caption, cutoutFilter }` plus
its beats, timing, events and audio style. The approval stops, full-quality delivery, four separate
QA states and "no publishing without approval" always apply.

Reference files (read when you reach that stage):
- [reference/art-direction.md](reference/art-direction.md): grid, palette, bitmap font, sprites, panels, CRT, type sizes, motion rules.
- [reference/scene-catalogue.md](reference/scene-catalogue.md): every screen, sprite and prop with its file and what it is good for.
- [reference/pitfalls.md](reference/pitfalls.md): what went wrong in v1-v3 and the fixes.
- [reference/commands.md](reference/commands.md): typecheck, dumps, stills, mix, Instagram-max render, QA.
- [template/README.md](template/README.md): the code, what is kit vs video-specific, the spine schema.
- `examples/`: the real film's beat table, script, fact-check notes and hook choices.
- `../../docs/pixel-arcade/style.jpg`, `storyboard.jpg`: real frames from the v3 render (the quality bar; never reuse the content).

## IMPORTANT: the template is on the v3 staging; new films use v6

The template is the shipped v3 film: the presenter cut-out is **small** (scale 0.66, box
x 0-713 / y 653-1920, face about x 270-530 / y 940-1240 after the mirror), graphics in a top band
(y 228-630) and a right column (x 561-939, y 640-1180), captions at x 555, y 1215, w 375.

After that film Madhav asked for a bigger face ("my face could be bigger, it can cross the 50%
mark... the animation on the right side and on the top side... make it like someone is asking
anonymously in my Instagram DM"). **Every new Pixel Arcade film must apply the news-qa-reel v6
staging** (take the shell's v6 `presenter.tsx`, `Film.tsx` and IG components; don't patch v3):
1. **Presenter:** scale **0.88**, x -80, y 234, bottom-left, **mirrored** (`scaleX(-1)`), soft
   right-edge feather 82% -> 100%. Head top at about y 780-950, body to the bottom edge, figure about
   x 0-760. `SIDE_FACE = { x: 0, y: 770, w: 680, h: 620 }`.
2. **Layout:** main screens in the **top band** (y ~220-760, full width minus the right 140 px);
   secondary sprites/chips in the **right column** (x ~720-940, y ~760-1300). Nothing covers his
   head. Rescale the v3 screens: `COL` in `scenes.tsx` becomes about `{x: 720, y: 770, w: 220, h: 520}`
   (fewer, bigger sprites; drop the 7x9 map to 4x6 or move it into the top band) and top-band
   panels grow to y 280-760.
3. **P1 frame:** redraw `P1Frame` around the bigger cut-out (label "P1 MADHAV" just above his
   hair, about y 700-770), or drop the frame and keep only the label tab if it crowds the head.
4. **Captions:** right column under the graphics, `regionFor("SIDE") = { x: 692, y: 1300, w: 258 }`,
   up to 3 lines. In pixel type that is scale 5 (35 px glyphs, ~7 characters per line at w 258): drop
   the caption scale from 6 to 5 and let long words shift the block left so it ends at x 950.
5. **Series tag** "MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS" from frame 0 to the end (y ~230-276)
   and every question he reads as an **anonymous IG DM card** ("Anonymous", "?" avatar,
   paper-plane "IG question" label, the exact question; no usernames, photos, times or counts).
   Use the shell's components; in this world you may render them in pixel type (`PxPanel` +
   `PxText`) as long as the content and anonymity rules are identical. Push the frame-0 hook
   headline below the tag (y >= 290).
6. Re-snap stills at 0, every item start, every big visual, the end card and the last frame; fix
   any collision with the new head box.

## When to use

- Gaming, consoles, esports, app/platform rivalry (X vs Y), "who wins" questions, game-industry
  news, or any take that reads naturally as levels, power-ups, fights, high scores and GAME OVER.
- A news / IG-question Reel in the news-qa-reel format where a playful, high-contrast look fits.
- Not for serious or sensitive stories (layoffs, health, tragedies): use case-file-explainer.
  Not for a 3D world (iso-diorama-3d, luminous-cosmos-3d) or a paper look (paper-lab-reel).

## Non-negotiables

1. **His real self is the anchor.** Real face, lips and voice. The cut-out is a local matte of the
   same pixels; never regenerate, pixelate or retouch him. Under ElevenLabs lines the shell plays
   his silent "listening" footage, so his lips never move under the cloned voice.
2. **Calm motion** (Madhav, v2: "too much motion... when we zoom in and zoom out on my face, it goes
   in the middle. I hate that"): his footage never scales, slides, flies or zooms; one primary motion
   at a time; no perpetual bob, blink, scroll or twinkle; pops settle in ~0.3 s; readable states
   hold >= 1.2 s; comparisons hold >= 2.5 s; never zoom toward his face.
3. **Every time comes from the words** via `cue("phrase", nth?)` / `cueEnd` / `OUTRO` in
   `src/world/timing.ts`. No absolute seconds except small offsets from a cue.
4. **Facts only what is said.** On-screen text says only what he or the verified ElevenLabs lines
   say. His opinions get a "MADHAV'S TAKE" tag. A needed correction is a short pixel FACT CHECK chip
   ("AAA BUDGETS ARE STILL RISING ↑"), never a disclaimer. No "not endorsed", no "views are my own".
5. **No official logos or trade dress.** Brand names in pixel letters plus team colours only; both
   sides drawn as equals (same sprite, swapped palette). No invented rankings or numbers ("x99
   titles" was removed for this reason).
6. **No fake social proof.** IG-style comment/DM cards have no usernames, photos, times or counts.
7. **Delivery quality:** the approved full-quality master only (1440x2560); no upload, scheduling,
   sharing or paid generation without explicit approval for that action.

## Stages and approval stops

Keep the project `CHECKPOINT.md` current. The shell (news-qa-reel) owns intake, transcript,
fact-check, script with ElevenLabs lines, spine and matte; this skill starts at the world.

1. **Concept + beat table -> APPROVAL STOP 1.** One game screen per sentence/item: line -> mode ->
   screen -> what changes on which word. Pick the hero motif (the c6 film: two mirrored pixel
   fighters, green vs blue). Include the hook headline (exact text, chosen with the ig-reel hook
   scorer), the fact chips and the comment-prompt screen. Stop and wait.
2. **Style frame -> APPROVAL STOP 2.** One information-heavy beat at v6 staging, with the cut-out,
   the P1 label, a caption and the series tag. If he already asked for "pixel / arcade", confirm in
   one line and show that frame. Check: nothing over his head, nothing in the IG UI zones (top 220,
   bottom 380, right 140), text >= scale 5.
3. **Build + key-frame board -> APPROVAL STOP 3.** Write `WORLD-NOTES.md` (concept, palette,
   hero, beat table, status) and keep it as the checkpoint. Build `beats.ts` + `world/timing.ts`
   first, stub each screen, snap the whole timeline, then fill screens beat by beat. Export
   `EVENTS` as you go. Board = one still per beat with its line (`snap.sh` + `sheet.py`).
4. **Audio** (`audio/mix.py arcade`): see below.
5. **Render + QA -> APPROVAL STOP 4 (final review).** Instagram-max render, `qa.sh`, Whisper on
   the final audio, and the four QA states reported separately (technical, factual, creative, user
   acceptance). Say the music/SFX are synthetic and unauditioned.

## Look (summary; details in art-direction.md)

- **Grid:** 1080x1920 comp = 120 x 213 cells of **9 px**; snap positions with `snap(v, 9)`;
  `shapeRendering="crispEdges"` everywhere (`PxLayer`).
- **Palette:** black `#05060a`, panels `#0b0d1a` / `#141834`, neon green `#39ff6a`, team green
  `#107c10`, electric blue `#2fa8ff`, team blue `#0070d1`, magenta `#ff2bd6`, yellow `#ffe14a`,
  red `#ff3b3b` (FIGHT!, RETIRED, GAME OVER), white `#f4f4ff`, grey `#6b7090`.
- **Type:** the 5x7 bitmap font in `px.tsx` (A-Z, 0-9, punctuation, arrows ↑↓▶◀, ♥ ★ @ % _ ·).
  `s` = px per font pixel: labels >= 5 (35 px tall), body 6-7, titles 8-13, VS/FIGHT! 15-16.
  Black drop shadow by default, 8-way black outline over busy backgrounds, `glow` = bloom.
- **Surfaces:** `PxPanel` (double neon border, notched corners), `PxBar` (segmented health/progress),
  sprites from char-rows (`Sprite`), `Backdrop` (static starfield + neon perspective floor tinted
  per beat), `SplitBg` (stepped diagonal green/blue split for a VS beat), `CRT` (scanlines + RGB
  mask + vignette; k 0.8 on Back, 0.25 on Front).
- **Captions:** bitmap font, no box, black pixel outline, words light from 45% to full as spoken,
  emphasis words yellow with bloom, team words in team colours.

## Motion rules

- New picture every ~1.5-2.5 s, landing on the word (a pop with `popS(t, cue, 10-14)`, a 1.3-1.6x
  scale-in for big words, a short 40 px slide for column items). Screens fade out in their last 0.12 s;
  the next pops in on its own cue.
- Game verbs on the word: ROUND 1 on "gonna", FIGHT! on "fight", CHEAPER ↓ + draining bar on
  "cheaper", ? block bump + cartridge arc on "lot more", territory spreads on "capture", rival
  flag on "PlayStation guys", strike-through GAME OVER? -> NO - CONTINUE on the end card.
- Sprites hold poses (no idle bob). Hits are a 0.3 s punch pose + 8-square spark.
- The last ~0.4 s is a static end card.

## Audio

`py audio/mix.py arcade` builds the bed from `out/beats.json` + `out/events.json`: an E-minor
chiptune score (band-limited square plucks, 1.6 s chords, short echo) ducked -15 dB per phrase,
plus SFX from event keywords (coin -> blip, hit/impact/vs -> thud + glitch, select/click/beep ->
square beep, others fall back to the glass/cosmos set). **Approved levels: music -11 dB, FX
-19 dB** (defaults in `STYLE_DB`; override with `MUSIC_DB` / `FX_DB`). Effects are pushed >= 20 dB
under his voice band. Keep **<= 25 events per minute**, only on real visual hits (the film: 16
over 39.7 s). The mixer prints the VO-to-bed ratio; aim for a median >= 30 dB in 1-4 kHz.

## Layout zones (1080x1920 comp, v6)

| Zone | Box | Use |
|---|---|---|
| IG UI (keep clear) | top 0-220, bottom 1540-1920, right 940-1080 | nothing important |
| Series tag | y 230-276 | "MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS" |
| Top band | x 40-940, y 280-760 | hook headline, DM question card, main screen |
| Right column | x 720-940, y 760-1300 | sprites, chips, FACT CHECK, follow card |
| Captions | x 692-950, y 1300+ | 3 lines max |
| Presenter | x 0-760, y ~780-1920 | his cut-out; head box x 0-680, y 770-1390 |

## Delivery spec

1440x2560 (render the 1080x1920 comp at `--scale=1.3333333333333333`), H.264 High, CFR 30/1,
yuv420p limited range, bt709, <= 25 Mbps and <= 300 MB, AAC-LC 48 kHz 128 kbps, faststart, about
-14 LUFS integrated, true peak <= -1.5 dBTP, 0 decode errors, no black frames, frame 0 = the cover
with the hook headline up, static last 0.4 s. Pixel art survives the scale cleanly because every
rect is drawn natively at the render scale.

## What Madhav liked / disliked

- Liked: the bold pixel headline cover, PLAYER 1 framing, VS / FIGHT! energy, "MADHAV'S TAKE"
  tags, the honest FACT CHECK chip, GAME OVER? -> CONTINUE ending, him always on the left "till at
  last", fast pacing (new picture every ~2 s), ElevenLabs lines that add the news.
- Disliked: motion on or around his face (zooms, flying footage tiles), busy perpetual animation,
  blinking text, loud music/SFX over his voice, a small face with blank screen around it (fixed by
  v6), anything not backed by what is said.

## Done when

The four approval stops are recorded; the world follows the v6 staging; the master passes every
technical receipt; the four QA states are reported separately with evidence paths; open issues
are listed by time range; nothing was uploaded, scheduled or shared without his explicit approval.
