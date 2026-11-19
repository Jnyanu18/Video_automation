# Layout and staging (v6)

Design space 1080x1920 (rendered at 1440x2560 with `--scale=1.3333333333333333`).

```
y   0 ┌──────────────────────────────────────────┐
      │ (IG top UI)                              │
y 230 │ [series tag pill  x40 .. ~600]           │
y 300 │┌──────────── TOP BAND ───────────┐       │  BAND_TF: v5 x50-1030,y235-635 -> x40-942,y300-668 (0.92)
      ││ main document of the beat        │       │  IG DM question cards: left 40, top 306, width 900
y 668 │└──────────────────────────────────┘       │
      │      (~100 px unused strip)               │
y 770 │   head + hair             ┌─ COLUMN ─┐   │  COL_TF: v5 x575-935,y655-1180 -> x678-944,y770-1159 (0.74)
      │   SIDE_FACE x0-580        │ secondary │   │
      │   y 840-1520              │ card      │   │
y1159 │                           └──────────┘   │
y1290 │                           [A MY ANSWER]  │  ATag at (692,1290)
y1300 │   (body to bottom edge)   captions x692  │  regionFor("SIDE") = {x 692, y 1300, w 258}
      │                           w258, <=3 lines│
y1920 └──────────────────────────────────────────┘
```

## Presenter (shell, `src/presenter.tsx`)
- Always the SIDE cut-out (whole-clip matte `public/matte/m0-1440.webm`, one `<Sequence>` per EDL segment),
  `SIDE_S = 0.88`, `SIDE_X = -80`, `SIDE_Y = 234`, mirrored (`scaleX(-1)`: his hands point to the middle and
  the camera-frame edge sits off the left edge), right-edge feather `#000 82% -> transparent 100%`.
- `cutoutFilter` from the world: a 0-px memo-coloured drop-shadow (sticker edge) + a soft desk shadow.
- `SIDE_FACE` = head + hair union for this take (`{x 0, y 840, w 580, h 680}` in the source film). **Re-measure
  it on stills of the new take** (several times across the clip) before laying anything out.
- Beats are all `SIDE`; `END` only changes the world (and hides captions). FULL/FWD/OUT exist in the shell for
  other worlds but are not used: the presenter never moves.

## The `Slot` mapper (`scenes.tsx`)
`<Slot t s e delay rot cx cy raw>` shows its children from `s` to `e`:
- default -> band: `BAND_TF`, slides in from x +1150 over 0.35 s (starts 0.12 s early), out to the left over 0.3 s.
- `cx={755}` -> column: `COL_TF`, slides in from the right, **exits by fading while drifting right** (never across
  his face). Use `delay={0.1}` so the column lands just after the band.
- `raw` -> screen space (no transform), for things that link the two zones (the Enigma hidden wire).
- `rot` = a small paper tilt around (`cx`, `cy`).

New films can keep authoring in v5 coordinates and let `Slot` map them, or (better) author at v6 size and change
`BAND_TF` / `COL_TF` to identity-like transforms to use the full band height and the strip below it.

## Collision checklist (stills)
- Nothing over `SIDE_FACE`; the column's left edge (x 678) stays right of his hair at every beat.
- Column content ends above y 1159 when the MY ANSWER tag shows (tag top ~1228 after scale).
- Captions: 3 lines max; a too-long word shifts the block left only enough to end at x 950; never into his hair.
- Band content stays under the series tag (y >= 300) and inside x 40-942 (keep clear of the IG right-side buttons).
- IG DM card (y 306) replaces the band panel: the outgoing panel must be gone by the time the card pops (~0.2 s overlap in the source film).
- Bottom ~250 px and the right ~120 px are under IG UI: no text there.
