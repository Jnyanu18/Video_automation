# Visual contract: large grounded demo

This is the default for reproducing the Canvas Orbit look (our first demo built with this recipe) in a NEW matching demo: the moving website style, the grounded corner presenter and the enlarged v6 sizing. That history is not release approval. A current user-specified size/layout or protected version overrides this preset.

## Fixed identity of the recipe

Moving result first; curiosity bridge; real cursor-led software teaching; recorded voice; restrained hierarchy; optional large bottom-left cutout; complete CTA. No split-screen lecture, tiny centered website, floating talking-head sticker, neon glow, stacked glass cards or unrelated stock B-roll.

## 1080x1920 reference geometry

All coordinates are output pixels. Scale every coordinate/type size uniformly with output width/1080 for another 9:16 resolution. Another aspect ratio needs a fresh layout, not independent x/y stretching.

| Element | Reference settings | Reason / adaptation |
|---|---|---|
| Canvas | 1080x1920, CFR30 | H.264/AAC, yuv420p, limited BT.709, fast-start |
| Base | #0d0d0d; text #f7f8fa | Footage fills the scene; no decorative empty background |
| Accent | #bed3da; active word #b5d4df | One muted source-relevant accent; no rainbow highlighting |
| Font | Bahnschrift, Arial, sans-serif | Record resolved font; if unavailable choose a licensed close sans and recheck wraps |
| Step eyebrow | x68, y95, right88; 27px/500, tracking2 | One short category, not multiple badges |
| Step heading | same container; 64px/650, line1.08, tracking-1.7 | One idea, usually 1-2 lines; wraps never cover controls |
| Step detail | 32px, line1.3, gap16 | Only when it adds teaching value |
| Opening hook | x66, right95, y154; 94px/700, line1.04 | Two short lines over moving result, removed for payoff |
| Re-hook | x68, right88, y114; 74px/650, line1.07 | Show once; avoid duplicate captions for those same words |
| Large presenter | x0, bottom0, w828, h1012 | 1080:1320 prepared-source ratio; mirrored only for reference pose |
| Regular captions | x74, right105, y1620; 51px/600, line1.22 | Verbatim output-timed words, frontmost |
| Beside-presenter captions | x620, right70, y1620; 47px/600, line1.22 | Whole page routes beside; check actual alpha and final text height |
| CTA block | x620, right60, y690 | “Comment”45px, keyword86px, explanation36px/1.3; adapt keyword width |
| CTA label | x620, bottom440; 29px | Optional, not a second sales claim |

Captions: white #f9fbfc, active word #b5d4df, shadow `0 2px 10px black, 0 1px 4px black`, z100. Presenter z20. In reference v6, all opaque presenter pixels cleared the x620/y1620-1800 caption band by at least69px; **that is a measured property of that source**, not a universal safe zone. More than three lines or y>1800 requires layout review/rechunking at word boundaries. Do not silently shrink captions to illegible type.

Neutral contrast support: top fade is solid #0d0d0d to y280, transparent by y355; bottom support starts near y1440 and reaches black at .90 opacity by y1750. This shields text but should not bury the active UI. The closing uses an additional right-side dark fade from transparent38% to .96 black56%; do not apply that blanket fade to normal teaching.

## What “40%” means

828*1012/(1080*1920) = 40.4097% rectangular footprint. It is 39.394% taller AND wider than the former594x726 cutout. This is not opaque body-area coverage and does not mean40% width or40% height. The prepared asset adds no padding.

For another alpha source:
1. Inspect all moving frames, find the union of meaningful alpha, and remove only safe transparent padding. Preserve hair, chin, body cut and hands.
2. For prepared aspect `r = width/height`, start with `height = sqrt(0.4041 * canvasWidth * canvasHeight / r)` and `width = r * height`. Fit without stretching. Do not claim match just because the box has that size: compare apparent face/body scale at phone size.
3. Ground visible cut edges, not merely CSS bounds. Choose orientation so the source-cut edge meets the canvas edge and the pose faces into the content; never mirror UI/text. If another pose cannot satisfy that without clipping, adjust the layout and record why instead of distorting the person.
4. Test text/control intersections against the actual alpha over every affected window. Preserve meaningful active UI above/beside the presenter. Adjust caption band or camera framing first; do not lift the body off the bottom or reduce the requested presenter to a tiny inset.

## Motion tokens

Stored in [preset.json](../assets/preset.json). Timings are seconds for portability; round to output frames once.

| Motion | Reference behavior |
|---|---|
| Camera | ease-in/out cubic-bezier(.35,0,.2,1), pan between deliberate control-centered crops; hold after landing |
| Step title | opacity0->1 in8frames; y16->0 in12frames, cubic-bezier(.22,1,.36,1) |
| Opening hook | scale.95->1 over12frames; visible immediately, fade78->90frames for the3s example |
| Re-hook | y15->0 over9frames; fade0->1 over8frames; fade last13frames |
| Cursor | white52x66 glyph, dark3px stroke, small shadow; stays constant output size |
| Click ring |70px circle, muted blue3px; lasts.48s, scale1+age*1.7, opacity1-age/.48; ONLY real recorded clicks |
| Presenter | fade7frames in, fade8frames out; no x/y/scale entrance; body remains grounded |
| CTA | text reveal aligned to spoken “comment”;12frame opacity +16frame y20->0 easing |

Camera zoom values1.8-2.65 were relative to a2320-wide coordinate plane in the original project, not source-pixel zoom constants for every recording. Use the component kit's pixel-coordinate mapping or preserve the existing camera implementation; do not mix conventions. Avoid easing a pointer away from recorded click timing.

## Similarity check before delivery

Render the opening, one dense prompt/presenter beat and CTA first. At about360px wide: can you identify the tool/control, read the short label, follow the clicked change, see the presenter's expression, and read captions without blocking mouth/hands? Inspect both gesture extremes and entrances/exits. The full motion must teach something; a technically valid static sequence fails the intended recipe.

Expected repairs: floating body -> correct alpha crop/edge anchoring; tiny website -> crop/pan real capture; unreadable prompt -> hold/highlight key clause; caption over face -> route whole page beside; dull/static repair -> restore motivated source motion; duplicated hook text -> suppress only the duplicate caption interval; missing CTA -> restore word-safe speech and settled tail. Preserve all unrelated accepted work.
