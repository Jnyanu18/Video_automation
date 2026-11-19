# Art direction: Retro Space Poster

The reference is a 1960s/70s screen-printed travel or airline poster (think "Rocket Mail", "Space
Travel" era posters): a few flat inks printed on cream stock, coarse halftone shading, slightly
misaligned plates, huge condensed type, sunbursts and badges. It should look printed, not rendered.

## Palette (only these inks)

| Ink | Hex | Use |
|---|---|---|
| Cream | `#f2e6cf` | paper, card faces, caption labels |
| Paper shades | `#e3d1b0`, `#efe0c4` | secondary paper |
| Navy | `#1b2a49` | key-line ink, text, hard shadows, night ground |
| Burnt orange | `#e0632b` | sun, accents, emphasis words, mis-registration ghost |
| Teal | `#1f6f78` | hills, globe sea, secondary headlines, pass headers |
| Mustard | `#e8b13a` | chopstick arms, land masses, stars/bursts, chip heads |

No soft gradients, no glow, no blur shadows (the IG chips in `ig.tsx` are the only exception: they are
deliberately "real app UI" so the question reads as a real DM).

## Type

- **Anton** (`COND`): every headline, label, number and badge. Letter-spacing 1-4 for small labels.
  Use `textLength` + `lengthAdjust="spacingAndGlyphs"` to fit a line (`fitW()`, `Ink width=`).
- **Archivo Black** (`BLACK`): captions and the handle.
- Headline hierarchy: one dominant line (128-176 px), a second in teal, the key word in orange with a
  navy ghost. Labels >= 32 px, key numbers big.

## Print techniques (all in `src/world/kit.tsx`)

- **Halftone:** SVG patterns rotated 30 deg, 11 px cell, three dot sizes per ink (`ht("navy-s")`,
  `ht("teal-m")`, `ht("orange-l")` ...). Use them as shading layers over a flat fill (hills, booster
  shade side, land masses, the night side of the globe), not as the only fill.
- **Mis-registration:** `filter="url(#misreg)"` prints an orange ghost 6/4 px under the shape;
  `#misreg-t` a teal ghost -5/4 px. `<Ink>` does the same for text with a second `<text>` (ghost
  colour and offset configurable). Use it on hero objects and headlines, not on everything.
- **Hard shadows:** a navy (or orange) copy of the card offset 6-10 px, never blurred.
- **Paper finish:** `PaperFinish` = a seeded grain/fibre texture (multiply, 22%) + a warm vignette over
  the whole frame, jittered 0-3 px per frame like a print under a lens. Keep it in `Back`.
- **Era objects:** `Badge` (double-ring pill), `Stamp` (double-bordered rotated stamp), `Burst`
  (18-point starburst), boarding passes with notches and a dashed tear line, tear-off calendars.

## Sets

- **Landscape poster** (`Back5`, first half): cream sky with mustard/orange halftone bands, the striped
  sun (orange disc, mustard offset, cream stripes clipped inside), teal hills with a navy halftone
  layer and mis-registration, a navy ground with teal halftone and mustard runway dashes. Horizon
  at y 1200 so the sun and hills sit behind his shoulders and the right column.
- **Night board** (second half, from the "if they can do that" beat): cream top with a mustard
  halftone sun disc and orange rays (static), navy ground from y 1200 with an orange rule. A set
  change marks the turn from explanation to prediction.

## Motion

Calm and physical. See SKILL.md motion rules. Springs (`popS`, damping 10-14) for entrances, 0.2 s
fades for exits, stamps drop from 1.6x. One primary motion at a time. The tower catch is the one
"big" action and it is short. Never move toward his face.

## Layout zones (v6, 1080x1920 coordinates)

```
y 0-220      Instagram UI: nothing important
y 230-276    series tag (x 40 ->)
y 290-760    TOP BAND  x 40-940: hook headline, panels, globe, end-card question
y 776-1294   RIGHT COLUMN x 744-940: tower, chips, pass, calendar, follow/AI NEWS
y 1300-~1500 captions, right column x 692-950
x 0-760      the presenter (head box SIDE_FACE; source film {x 200, y 830, w 540, h 600})
right 140 px, bottom 380 px: Instagram UI
```

The right column is narrow (196 px): condense chip text (`fitW`), stack 2-5 short lines, or scale a
prop down (the tower is drawn at 0.46 and clipped to the column).
