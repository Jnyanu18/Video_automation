# Layout and staging (v6, the news-qa-reel default; this film is its reference implementation)

Design space 1080x1920 (rendered at 1440x2560 with `--scale=1.3333333333333333`).

## Presenter (shell, `src/presenter.tsx`)
- Always the still cut-out, every beat (END too). `SIDE_S = 0.88`, `SIDE_X = -80`, `SIDE_Y = 234`, `transformOrigin 0 0`.
- Mirrored (`scaleX(-1)`) so his gestures point into the frame and the camera-frame edge (where his sweater is cut) sits
  at the screen's left edge. Right-edge feather: `maskImage: linear-gradient(to right, #000 82%, transparent 100%)`.
- Footage = `public/matte/m0-1440.webm` (VP9 alpha, the whole clip), one `<Sequence>` per EDL segment; segments with
  `idle: true` play `matte/idle-m1440.webm`.
- `SIDE_FACE = { x: 0, y: 770, w: 680, h: 620 }` (head + hair union over the clip, measured on stills at several times).
  Re-measure for every new take: export stills at 5-6 times, find the head/hair bounding box after the transform.
- Cut-out glow (world): `drop-shadow(0 0 16px rgba(125,243,255,.45)) drop-shadow(0 0 3px rgba(255,122,217,.45))`.

## Zones
```
y  230 ┌ series tag (x 40 .. ~700) ───────────────────────────┐
y  280 ├ TOP BAND  x 40-940 ───────────────────────────────────┤  hook / IG DM / chips / monitor / pipeline / end title
y  760 ├──────────────────────────────┬ RIGHT COLUMN x 700-950 ┤  bubble (hook/Q/pipeline/end), answer chips, nodes,
       │  his head + hair             │                        │  "In plain words", follow card
       │  x 0-680, y 770-1390         │                        │
y 1300 │                              ├ CAPTIONS x 692-950 ────┤  3 lines max, 54 -> 42 px
y 1920 └──────────────────────────────┴────────────────────────┘
```
- Instagram UI: keep the top ~220 px and the bottom ~380 px free of key text; the right edge (x > 950) carries IG's buttons.
- The series tag and the IG question cards are the news-qa-reel format; reuse their components unchanged.
- Right-column chips: centre `RX = 826`, width `RW = 244`, wrap inside (`w` prop).

## Where the bubble sits per beat
Right column (`[830, 1010]`) when the top band holds text (hook, questions, pipeline, end); filling the top band
(`[540, 600]`, `[610, 520]`, `[720, 490]`) when it is the picture (money, touch, stay). The desk monitor fills the top
band for the job story; workflow nodes run down the right column with beams from under the monitor.

## Collision checklist (stills at every beat start + every landing)
- Nothing over `SIDE_FACE` (the shader mask fades glow; HTML has no mask: check chips manually).
- Chips do not touch the bubble's edge or each other (the "Everything" label touched the bubble in the source film).
- Coins, moon and stars stay inside the frame and below y 220.
- The outgoing top-band panel and an incoming IG card overlap at most ~0.2 s.
- Captions: a long word (e.g. "transportation,") shifts the block left; make sure it still clears his hair.
- Frame 0 is the cover: series tag + hook headline + bubble, nothing mid-animation.
