# CALMIND — app launch reel (15 s, 9:16)

**Status: rendered and unapproved.** The output is `out/CALMIND_App_Launch_Reel.mp4`: 1080×1920, 60 fps, H.264 + AAC.

## Brief

| | |
|---|---|
| Brand | CALMIND, a yoga company |
| Goal | A fast, beat-driven reel that announces the CALMIND app launch |
| Story | Modern noise, then one breath, then movement (poses), then flow, then the app in your pocket, then the daily practice, then "The app is here" |
| Ending (planned first) | Enso mark + CALMIND wordmark + "THE APP IS HERE." + "DOWNLOAD CALMIND". The ending is readable for about 1.5 s. |
| Format | 9:16 because it's a reel; 15 s at 60 fps; 128 BPM, so one bar is 1.875 s and a half beat is 0.234 s |

**Route:** the reference-motion-director skill's **Neo-Swiss kinetic profile** (custom component). The basic 7-template JSON route was not used.

**Quality bar:** `ailo-15s` (AILO AI Editor motion reel). Techniques carried over from it:
- motion blur that tracks each element's speed, plus a 3-sample 180° camera shutter (`@remotion/motion-blur`)
- masked line rises
- half-beat word bursts
- full-bleed colour flips
- a persistent HUD (viewfinder overlay)
- a beat-locked synthesized score at −14 LUFS

## Cut list (cuts land on the 128 BPM grid)

| # | Section | Time | Technique | Sound |
|---|---|---|---|---|
| 1 | NOISE | 0.00–1.88 | Four half-beat slam words (PINGS. / DEADLINES. / SCROLL. / NOISE.) with notification chips piling up and a glitch on NOISE. A hard stop at 0.94 s leads to a saffron dot, an expanding ring and "BREATHE." | Glitch stabs, pings, singing bowl and a breath swell |
| 2 | BREATHE | 1.88–3.75 | Concentric rings inhale for 2 beats and exhale for 2. Two opposing ring-type tracks. IN./OUT. swap and a beat counter. | Pad chord swells with the breath; soft kick |
| 3 | MOVE | 3.75–5.63 | Radial morph with spring overshoot: circle → MOUNTAIN → TREE → LOTUS → SUN, one per beat. Guide handles and an orbit. | One pluck per pose, plus whooshes |
| 4 | FLOW | 5.63–7.50 | Lavender metaballs; "FIND YOUR FLOW." inverts where the liquid crosses it, and FLOW. waves | Sixteenth-note liquid arpeggio |
| 5 | THE APP | 7.50–9.38 | "NOW IN YOUR POCKET." The phone springs up with motion blur; the home screen staggers in; tap ripple | Riser, impact, UI ticks, tap ping |
| 6 | INSIDE | 9.38–11.25 | Match cut: the same phone stays, and each beat brings a new background and screen (Breathe / Flow / Focus / Rest). The Flow screen reuses the four pose shapes from section 3. | Whoosh and blip on each swap |
| 7 | DAILY | 11.25–12.66 | Six half-beat cards; each word acts out its meaning: STRETCH stretches, FLOW waves, FOCUS gets brackets, REST holds still, REPEAT echoes | Rising stab per card, clap roll |
| 8 | LAUNCH | 12.66–15.00 | The enso ring draws on, the saffron dot pops, CALMIND rises, the tagline types, the CTA springs in, then a hold | Impact, bowl, chord rings out, chimes on the tagline and CTA |

## Brand: a proposal (no CALMIND brand kit was supplied)

- Palette: ink `#121016`, sand `#F1EBE1`, lavender `#B4A2FF` (signature "calm mind" colour) and saffron `#FF6F2C` (energy). Text is always ink on light backgrounds and sand on dark.
- Type: Geist and Geist Mono, under the SIL Open Font License; see `public/Geist-OFL.txt`.
- **Logo:** a stand-in enso ring with a saffron dot, plus a typographic wordmark. **Replace it with CALMIND's real logo.**

## Claims and stand-ins

- No ratings, user counts, prices, store badges, platforms, launch date or URL appear anywhere. The CTA is a plain "DOWNLOAD CALMIND". Add the real store links or URL once known.
- The app screens are **illustrative stand-ins**, not CALMIND's real UI. That covers the greeting, the tiles, box breathing, the "10:00" focus timer and the sleep screen. Replace them with real screens if the app has a different design.
- The notification chips ("37 UNREAD" and the others) are fictional phone noise, not data.
- No narration. The score is original and synthesized from code (`make-audio.py`), so there is nothing to license.

## Rebuild

```sh
npm install
python make-audio.py              # soundtrack.wav (−14 LUFS) + grain.png
npm run check                     # TypeScript
node render.mjs --stills 4.5 13.5 # half-res QA frames into out/
node render.mjs --final           # full-res, 3-sample motion blur
```
