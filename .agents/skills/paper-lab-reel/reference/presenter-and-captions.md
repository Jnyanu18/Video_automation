# Presenter, matting, safe zones and captions

Frame 1080x1920, 30 fps. All numbers below are screen pixels in that frame. They come from the
first film's ART-BIBLE and code; re-measure the face box for each new take (he may sit differently).

## Presenter modes (beat table `mode`)

| Mode | What the viewer sees | Use for |
|---|---|---|
| FULL | real footage, full frame, his real background | personal lines, reactions, "that's beautiful", CTA |
| FWD | footage with a slow push-in (scale 1.10 -> 1.20 across the beat, anchored on his face, ~(430,720) in the first take) | the hook, big questions, his real lean-ins |
| SIDE | local cut-out, scale 0.66, anchored bottom-left, standing in the paper world | teaching with him present |
| OUT | the world full frame; presenter off-frame left (or gone after a tile hand-off) | dense teaching, comparisons, equations |
| END | the held end card after the footage runs out | the deliberate ending |

Target him on screen (FULL/FWD/SIDE) about 55-60% of the runtime. Use his natural lean-ins as FWD beats.
Beat starts are `cue("first words of the beat") - 0.05..0.5` so the change lands just before the word.

## The state machine (`presenter.tsx`)

State per frame: `{s, x, y, garden, tile, vis}` (scale, translate, background opacity, tile-ness, visible).
- **Transitions** run from `boundary - 0.25 s` to `boundary + 0.4 s` (`T0`, `T1`), eased
  (`easeInOut(smooth(k))`). Mode changes move one layer; nothing pops.
- **Background fade:** when moving from footage (garden 1) to a cut-out (garden 0), the background
  fades out in the **first 45%** of the move; coming back, it fades in during the **last 45%**. The
  person stays solid throughout, so a half-transparent box of background never travels across the frame.
- **Tile hand-off out** (FULL/FWD -> OUT/END with a `tile` point): the whole frame shrinks to a
  rounded tile (scale 0.22) at the hand-off point, then keeps shrinking to 0.02 over 1.1 s, into the
  world object that sits there. The world must place its object exactly at that point and time.
- **Tile hand-off in** (OUT -> FULL/FWD with `tile`): the tile emerges from the point at 0.02, grows to
  0.22 over the 1.0 s before the transition, then expands to full frame.
- **SIDE <-> OUT:** the cut-out slides off/on to the left (x -820, y +260).
- `needsMatte(st)`: use the matte pair only when the background is not fully opaque and he is not a tile;
  otherwise draw the plain footage (cheaper and exact).
- The world exports matching hand-off times (`HAND` in `T.ts`): start = boundary-0.25, tile =
  boundary+0.4, gone = boundary+1.5. Put a sound event on each (whoosh, pin press, gulp).

Hand-off points that worked: into the world at screen centre-high (540, 760-900); emerging from the
hero object at its resting spot (740, 1060). The tile must fly *into something* (a polaroid slot, the
hero object) and emerge *from something*.

## Footage placement

- Footage plays from the working intermediate, one `<Sequence>` per EDL segment with
  `trimBefore = round(seg.src * 30)` frames, muted (the voice comes from `vo.wav`).
- Each SIDE stretch replaces it with its aligned pair: `cN.mp4` (person + background, opacity =
  garden) under `mN.webm` (transparent). `matteAt(t)` uses a matte only inside
  `[o0 + 0.02, o1 - 0.04]` of its output window, so ranges need margins of ~0.6 s beyond the transitions.
- With N EDL segments, a matte range must not straddle a cut. Split it per segment.

## Matting details

- Tool: `npx --no-install hyperframes remove-background in.mp4 -o out.webm --device cpu --quality best`
  (u2net_human_seg, Apache-2.0, local; ~0.7 fps on CPU, so 15 s of footage takes ~10 min). Run the
  ranges in the background; they are independent.
- Input: 720x1280 crf 12 cut from the intermediate (enough for a 0.66-scale cut-out; it renders
  at ~713x1267).
- First test 3-5 s and inspect: hair edge, glasses, hands, the cropped body edge, and that face pixels
  are unchanged (compare a face crop against the source).
- Thin objects behind him (mic booms, chair edges) may be excluded or half-kept; check a sheet of the cut-out.
- `scripts/matte_ranges.sh` in the source project is the reference implementation (skip-if-exists,
  logs to `analysis/matte-logs/`, writes `analysis/mattes.json`; copy it to `film/src/mattes.json`).

## Safe zones

- Instagram covers the **top 220 px**, the **bottom 420 px (y > 1500)**, and a **right rail (x > 930
  for y > 1100)**. Text and key props stay out; the picture continues behind, calmer.
- **FULL/FWD:** his face sits roughly x 180-640, y 500-1300 (it moves). Front overlays go in the **top band
  (y 230-480)** or the **right column (x 700-1000, y 480-1150)**. Never cover the face, lips or eyes.
- **SIDE:** face box about **x 90-370, y 940-1240** (`SIDE_FACE`). The world's action area is
  **y 240-1180 full width**, plus **x > 420** lower down. Keep props off his head at every frame of a move.
- **OUT:** the world is full frame; keep the caption band (y 1300-1500) calm behind captions.
- Hook words are the riskiest element: they sit in y 250-750 over his hair. Check the stills at every hook word.

## Captions (`captions.ts` + the world's `Caption`)

- `LINES`: hand-chunked sense units (1-6 words), verbatim, including "maybe"s and his grammar. The
  loader checks every chunk against `words.json` and that all words are covered; it throws on mismatch,
  so a re-cut or re-transcription that changes words fails loudly.
- Chunk timing: `s = first word - 0.05`, `e = min(next chunk - 0.05, last word end + 0.6)`.
- **Regions by mode** (`regionFor` in Film.tsx):
  - SIDE: `x 555, y 1215, w 375`, left-aligned (beside him, never over him).
  - OUT: `x 90, y 1300, w 900`, centred.
  - FULL/FWD: `x 90, y 1260, w 900`, centred (below his chin).
  - END: no captions over the end card.
- Paper caption look: Fraunces 800 ink on a white paper strip (`box-decoration-break: clone`, warm
  shadow), slight seeded rotation that settles, pops in on twos with overshoot. 56-64 px, at most 2 lines,
  `text-wrap: balance`. In SIDE use 48-56 px.
- **Emphasis per word, chosen for meaning:** `EMPH` words in red; a smaller `STRONG` set also gets a red
  marker underline that draws on as the word is spoken. Not every keyword.
- Put real whitespace between word spans (`{" "}` or explicit margins). Spaces next to styled
  inline spans have gone missing before; check a still of a chunk with emphasis.

## The hook (first 2 chunks, its own composition)

- Big condensed (Anton) words, each on its own torn paper piece, revealed on each word's start.
  The key word arrives on red paper, wide, squashes past its width, settles with a shake.
- **The first word is already up on frame 0**: frame 0 is the cover.
- A few typewriter scraps flutter in the top band; on the next line the words and scraps crumple
  into a paper cloud, which then gets pulled into the first tile hand-off. The hook hands off to the world
  through content.
- Keep it inside y 250-750 and clear of his face; check stills at every word.
