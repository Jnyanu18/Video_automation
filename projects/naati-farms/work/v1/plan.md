# NAATI FARMS — launch film plan

**Format:** 9:16, 1080×1920, 60 fps, 32 s (16 bars at 120 BPM). Built with `packages/motion-kit` (Remotion).
**Source:** the 15 clips in `testing/` (all used), iPhone HLG HDR → tone-mapped and graded to SDR in `work/prep.sh`.

## Brief → insight
- Brief (from the owner): Naati Farms, Bangalore. No antibiotics. The birds are let outside so they are lively and healthy. Launch video, motion graphics from our kit, varied but fitting fonts, music that is actually in sync. Contact +91 78495 34944.
- Insight: city buyers never see how their chicken lived. This farm can *show* it: the gate opens every morning and the birds run out.
- Remember: NAATI FARMS = native birds raised outside, no antibiotics, Bangalore. Do: call +91 78495 34944.

## Concepts
| Concept | Idea | Motion metaphor | Score /5 |
|---|---|---|---|
| **Open the Gate** (winner) | The film is one morning: ride out, open the gate, the birds run free | The brand is painted on the gate; the gate swings open in 3D and the flock pours out of the logo | 4.6 |
| Nothing Added | Subtraction: strike out cages, antibiotics, shortcuts | Type gets crossed out and removed | 3.4: any organic brand could say it |
| Born to Roam | Dotted paths trace the birds' routes across shots | Paths draw on and finally draw the logo | 3.8: pretty, but the footage doesn't track birds well |

The gate wins because it happens in this farm's own footage (IMG_1381: the gate opens and the flock runs out), so the claim "raised outside" is shown rather than said.

## Ending (designed first)
Green field, a yolk badge with live rooster footage inside, rotating ring text "NAATI FARMS · BANGALORE", wordmark NAATI (Anton) / FARMS (Fraunces italic), handwritten "raised outside · no antibiotics", and a yolk pill **CALL +91 78495 34944** with phone-ring pulses. All in place by 27.5 s, held 4.5 s.

## Identity (proposal, no kit supplied)
- Palette: field green `#1E3B2A`, egg yolk `#F4B223`, eggshell cream `#F6EEDD`, ink `#16140F`, comb red `#D23F27` (used only for the "no" strike).
- Type, one job each: **Anton** shouts (slams, wordmark), **Fraunces** speaks (narration, italic accents), **Caveat** is the farmer's handwriting (notes, labels), **Baloo Tamma 2** sets the Kannada word ನಾಟಿ.
- Persistent object: the yolk disc. Sun → map pin → NO stamp → gathering yolks → logo badge.

## Beat map and shot table (times in `timeline.json`, shared by film and score)
| Bars | Time | Section | Footage | Motion (kit technique) | Text (font) | Sound |
|---|---|---|---|---|---|---|
| 0 | 0–2 | DAWN | 1508 dawn ride | sun rises; masked letter rise (`letters`) | "Every morning," (Fraunces it.) | bowl (signature), pad, arpeggio |
| 1 | 2–4 | RIDE | 1376 ride | whip pan with velocity blur; sun docks top-right | "we ride out" (Fraunces) + "to the farm" (Caveat, written on) | whoosh, kick, pen scratch |
| 2 | 4–6 | ARRIVE | 1152 walk-in | sun morphs into a map pin (`radial` morph) and drops with a spring bounce + squash (`osc`, `kick`); chip pops (`pop`) | BANGALORE chip (Anton), "our farm" + arrow (Caveat) | impact + woodblock + boing on contact, ping |
| 3 | 6–8 | GATE | 1441 at the gate, slow push | yolk gate doors slide shut and slam; camera recoil (`cameraRecoil`) | "and open the gate." → gate reads "welcome to / NAATI / FARMS" | snare build, door whoosh, taiko slam ringing out under a riser |
| 4 | 8–10 | RELEASE (hero) | 1381 flock runs out | doors swing open in real 3D (CSS perspective) on a spring | "here they come!" + arrow (Caveat) | DROP: impact, crash, real flock audio |
| 5 | 10–12 | OUT IN THE OPEN | 1151, 1561, 1337, 1363 one per beat | `slam` with stretch + blur, punch-in cuts, `slices` glitch | OUT / IN / THE / OPEN. (Anton) | stab + kick per word, stutter |
| 6 | 12–14 | NAATI | cream card → 1564 | `pop` with overshoot, then NAATI as holes in the card and a camera push through the I | KANNADA, ನಾಟಿ (Baloo), naa·ti (Fraunces it.), "native · country-bred" (Caveat) | half-time, boing, plucks, riser into the push |
| 7 | 14–16 | LIVELY | 1564 → 1562 | bouncy spring pop vs steady rise (motion = meaning) | "Lively." / "Healthy." (Fraunces it.) | boing, chord plucks |
| 8 | 16–18 | REAL FOOD | 1593, 1336, 1570 stacked | three panels slide in from alternate sides | "Real food." + labels (Caveat) | ascending plucks, then tape-stop |
| 9 | 18–20 | NO ANTIBIOTICS (reversal) | none: cream | red strike draws; yolk NO stamp slams; 3 impact frames invert (`impactWindow`); recoil; glitch | ANTIBIOTICS (Anton), "We don't use any." | **silence** (only real farm clucks) → marker scratch → stamp hit, music returns |
| 10–11 | 20–24 | EVERY BIRD | 12 clips in a grid | radial burst from centre (`radialDelayFrames` + `burstPosition` springs), then all pulled into one yolk | "Every bird," / RAISED RIGHT HERE. | pluck per ring, stab, suck-in whoosh |
| 12 | 24–26 | NOW LAUNCHING | none: green | metaball yolks with inverted type (`gooInvert`) merge into the badge | NOW LAUNCHING (Anton) | impact, bubbly plucks, swell, riser |
| 13–15 | 26–32 | LOCKUP | 1564 inside the badge | badge settles, `ringText` turns, wordmark rises, CTA pops with ring pulses | wordmark, tagline, CTA | impact + bowl (bookend), ring tones on the pulses, resolve |

## Continuity
- Persistent object: the yolk disc (sun → pin → stamp → yolks → badge).
- Callback: the gate's "NAATI" returns as the window in bar 6 and the wordmark at the end.
- Bookend: a bowl strike opens the film on the rising sun and closes it on the badge.

## Kit additions made for this film
- `footage.tsx`: real video under the SVG layer (exact in-points and speed, cover-fit with focal point, box transforms).
- `film.tsx`: optional `back`/`media` layers per frame and `extraFonts` loading (old films unchanged).
- `core.tsx`: `withFont()` so every kit technique can run in any loaded family.

## Stand-ins and things to confirm
- Palette, type and the badge are my proposal; no brand kit was supplied.
- "BANGALORE" spelling (the brief said Bangalore; Bengaluru is the official name).
- ನಾಟಿ = naati (native / country-bred), as in naati koli. Worth a glance from a Kannada reader.
- Copy lines are my wording of the owner's claims: "We don't use any." (antibiotics), "raised outside".
- Clip audio used: 1381 (flock) and 1151 (clucks). Speech was detected in 1570 and possibly 1562, so their audio is unused.

## Delivery (measured on the delivered file)
- `out/NaatiFarms_Launch_32s.mp4`: H.264 1080×1920, 60 fps, 1920 frames, 32.000 s; AAC 48 kHz stereo; 103 MB.
- Loudness gate (`gate.py`): **−14.72 LUFS, true peak −1.51 dBTP: PASS** (spec −14 ±1, ≤ −1.5).
- Sync, measured from the delivered audio: the transient for the push, door slam, drop, each slam word, the stamp, the grid,
  the launch and the lockup lands at **0.000 s** offset from its picture event. The silence before the stamp is ~18 dB below the mix.
- Every clip in `testing/` appears (1573 in the grid; the rest as full shots, panels, grid cells or the end filmstrip).

## How it renders (and why)
- Footage is shown as JPEG sequences (`work/extract_frames.py` → `public/frames/`), not `<OffthreadVideo>`: on this machine the
  offthread extractor failed under parallel rendering ("No frame found at position", then dropped requests), while single
  frames were fine. Sequences are deterministic and faster. Change an in-point → add/extend its range in that script.
- `blurMedia:false`: 3-sample camera blur on the graphics only; footage keeps its own natural blur.
- Final: from `packages/motion-kit`, `node render.mjs --project ../../projects/naati-farms --final --chunks 16 --name NaatiFarms_Launch_32s.mp4`
  (~22 min; each 2 s chunk retries on failure; `RESUME=1` keeps finished chunks, e.g. to re-mux after a score change).
- Score: `python ../../projects/naati-farms/score.py` (mastered to TP −2.8 so the AAC encode stays under −1.5).
