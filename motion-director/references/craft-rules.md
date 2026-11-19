# Craft rules

## Time

- Store time in seconds as a float `t = frame / fps`, and derive everything from `t`. Section-local time is `u = t - start`.
- Beat grid: `B = 60 / BPM`, `BAR = 4B`, half-beat `HB = B / 2`. Cuts land on grid times. Rounding to frames stays within ½ frame.
- Starting durations at 60 fps:

| Event | Duration |
|---|---|
| UI or element entrance | 12–30 frames |
| Transition | 8–18 frames |
| Letter stagger | 1–3 frames per letter (0.012–0.04 s) |
| Burst card | 1 half-beat |
| Section | 1–2 bars |
| Final hold | ≥ 90 frames |

- Reading time: max(1.2 s, words ÷ 3.2) s after the reveal completes. One-word punctuation in a burst can be shorter.

## Easing and physics

Spring with overshoot, which the kit calls `osc(dt, w, z)`:

| Feel | w | z |
|---|---|---|
| Friendly, snappy | 18–26 | 0.40–0.55 |
| Soft, calm | 12–16 | 0.55–0.65 |
| Precise | 20 | 1.0, critically damped, no overshoot |

- Expo-out (`eo`) suits masked reveals and decisive arrivals. Use `eio` for breathing and loops.
- Linear motion only for truthful progress: timecode, progress bars, constant tracking.
- **Velocity blur.** Compute the velocity numerically: `v = (f(t+1/240) − f(t−1/240)) × 120` px/s. Then blur `σ = min(max, |v| × 0.004)`, along the axis of motion only (`blurF(σx, σy)`).
- **Camera motion blur** on the final render: 3 samples at a 180° shutter (kit `Film` with `blur`). Preview and still renders skip it, for speed.
- Squash and stretch preserve volume: `sx = 1/sy`. Squash on impact, stretch along velocity.
- A target change mid-motion must keep its momentum. Superpose springs; never restart from zero.

## Frame and composition

- Fill the frame. Display type spans 80–90 % of the frame width, using `fit()`. Hero objects take 40–70 % of the frame height.
- One focal point per moment. Secondary elements are ≤ 40 % of the focal element's visual weight.
- Margins: 84 px on 1080-wide frames and 120 px on 1920-wide, kept the same across sections. The HUD sits outside the margins.
- **9:16 safe zones** (Reels, TikTok, Shorts UI): keep key text out of the top 220 px, the bottom 380 px and the right 140 px. Decorative elements may live there.
- 16:9: keep titles within the central 90 %.
- Avoid the template look: if the content occupies under ~35 % of the frame and the background is flat and empty, enlarge it, add a full-bleed element, or crop in.

## Type

- Two families at most: a display grotesk or serif, plus a mono for system text. Load them through `FontFace` before the first capture.
- Display weights 800–900 with tracking −0.03 to −0.05 em. Mono at 500, tracked +0.1 to +0.3 em, uppercase.
- Hierarchy: 3 levels at most per frame (display / support / mono label).
- Measure text in the browser (canvas `measureText`) only after the fonts have loaded. Fit display type to a width; never guess sizes.
- **Outline type** uses a fat stroke under a background-coloured fill. A bare stroke on variable fonts shows the internal overlapping contours.
- Never break a word across lines in display type. Avoid an orphan word on a last line. Shorten the copy rather than shrink it below readable size.

## Colour

- Choose 3–5 colours and define the allowed foreground/background **pairs** up front. Only those pairs appear.
- Alternate light and dark sections to punctuate. Two consecutive sections in the same background need a reason.
- Small text needs ≥ 4.5:1 contrast; display type ≥ 3:1.
- The accent appears in at most ~15 % of the frame except on deliberate full-bleed accent cards.
- Optional texture: a seeded grain overlay at 4–7 % opacity in soft-light. The HUD and text stay crisp.

## HUD and graphic systems (optional)

- A viewfinder HUD (corner marks, timecode from the integer frame, section label, progress bar) adds editorial or technical character. It takes the section's foreground colour so it stays readable on every background, and stays subordinate (mono, about 20 px on a 1080-wide frame).
- Use it only if it fits the brand. Leave it off for luxury, food and kids' brands.

## Determinism

- No `Date.now()`, unseeded `Math.random()`, CSS animations, timers or live data. Seeded noise uses `rnd(i)`.
- SVG filter and clip IDs must be unique per motion-blur sample (the kit handles this).
