# Paper Lab world (FilmPaper, style B)

Entry: `world.tsx` exports `PaperWorld`; `events.ts` exports `EVENTS` (~118 events, ~45/min).
Timing: every time comes from `T.ts` (cue() phrases + B beats) and `HAND` (presenter tile hand-offs).
Textures: `public/paper/{board,cork,navy}.jpg`, generated once by `make_textures.py` (`py -3.13`).

Files: `kit.tsx` (palette, fonts, filters, scrap/card/tape/pin/stamp/polaroid/clipping primitives),
`cube.tsx` (gold origami cube, real 3D projection, can squash and unfold into a net), `caption.tsx`
(paper-strip captions + the hook), `cork.tsx`, `lab.tsx`, `books.tsx`, `notebook.tsx`, `recall.tsx`,
`cosmos.tsx`, `path.tsx`, `cta2.tsx`, `end.tsx` (Back scenes), `front.tsx` (FULL/FWD overlays + end card),
`dressing.tsx` (pencil, clip, coffee ring, sticky note, loose scraps at board edges).

## Beats
- hook: torn-paper Anton words revealed on each word's start; "COMPRESSION?" on red paper arrives wide, squashes past its width, settles with a shake. Scraps flutter in the top band. First word is on frame 0 (cover).
- think: words + scraps crumple into a paper cloud top-right; the cloud is pulled to (540,760) as the tile leaves.
- internet: polaroid slot at (540,760) on a corkboard; pull-back through three nested scales of clippings (web pages, news clippings with halftone photos, polaroids, code printouts, video thumbnails, scraps), pins drop on "online data", red string links pins on "spread", yellow ruler gauge "internet: zettabytes" circled on "internet".
- slice: steel ruler + craft knife cut a thin strip; board dims; strip lifts; tags "Real training sets: a filtered slice" and "~15T tokens of text (Llama 3)"; gauge circle slides to "training ~60 TB".
- network: the corkboard falls away; pencil network draws on graph paper; the strip is consumed from the right into fluttering scraps; layers fill red on trained/neural/pattern/recognize.
- rules: scraps stream through the network onto an inked curve on the index card "one pattern"; card holds ~3 s; red arrow on "express".
- sizes: tied paper stack "training text ~60 TB" drops in, folds down in 4 stop-motion steps into the gold cube "weights ~0.8 TB" at (740,1060), edge ratio 4.2:1 with the dashed ghost of the stack kept for the comparison (held ~3.5 s); tag "Llama 3.1 405B · 16-bit · illustrative"; footage polaroid grows out of the cube.
- beautiful: cube floats beside him (right column), squashes on "so small", sparkles on "came out".
- maybe: sticky note "a hypothesis" top band on "Maybe"; cube rises beside it; red "?" marks on "questions".
- books: book pile drops and fans into ten cloth books; open book flips pages on twos; photocopier "copy every page" spits copies, red X on "mug up"; red threads lift off the pages and knot into "a pattern".
- algebra: a notebook page turns over the frame; x + y = z inked word by word, x and z circled "given", y ringed blue, "y = ?".
- practice: practice cards pile up (2+y=5→y=3, 7+y=10→y=3, 4+y=9→y=5) and a flurry on "read so much data"; equation card: y hops left on "move the Y", the rest slides into y = z − x on "Z on the left side", underline + stamp WORKS on "it just works".
- nn: the five symbols peel off into paper nodes, more nodes pop in, threads join them, signal fires on "works"; the network collapses toward the cube spot as the page is pulled away (covers the 73.63 cut).
- recall: cube centre-right; three question cards pinned left with red thread to the cube, copies fly into the cube; answers "2 Oct 1869", "~150 million km" (+ small note), "Beijing" stack on the right and stay; smudged card + stamp "LOSSY: models can misremember" on "everything".
- amazing: cube pops beside him and bursts sparkles on "pops out".
- question: single cut-paper red "?" in the top band; shrinks on "so small".
- cosmos: polaroid lands at (540,820) in a navy construction-paper cosmos (paper stars, ringed planet, earth, moon, galaxy spiral of scraps); gold rays on "holy grail"; stamp "Open question - not proven" on "AGI"; push-in on "Something so small"; F = ma, Maxwell's equations, E = mc², DNA strip each enter on their words, hold 1.25 s, spiral into the cube; flare on "find". The navy paper is torn off upward to reveal the path board; the cube travels to its next spot.
- path: dotted pencil path from him to the cube, ring on "think about"; paper robot arm (tagged "AI") picks scraps from a pile and folds them into the cube 4 times; cube grows; paper stars on "reality itself".
- agi: cube by his shoulder + tag "open question".
- cta1: masking tape "Random thoughts with Madhav" in the top band, red underline on "curiosity".
- cta2: science board (atom, spiral galaxy photo, leaf, telescope); sticker "Follow @madhav_somani" on "following me"; paper-doll chain on "more and more people"; flask, chip, gear, π pin up on "STEM".
- cta3: stickers "+ scientists", "+ engineers", "?" on "questions", sparkles on "excited".
- end: gold cube at (540,900) on the cream board with callbacks; the polaroid flies in, cube gulps, unfolds into a cross net, which grows into the end card "Is intelligence just compression?" + "Follow for more random thoughts · @madhav_somani". Static from ~157.3 s to the last frame.

## Known weaknesses
- Hook: torn-paper words sit over the trees/hair zone y 250-750; they clear his face in stills but sit close to the top of his hair at 3.3-4.3 s.
- Corkboard pull-back passes through a moment (~6.4 s) where the clippings are a small cluster on plain cork before the far clippings pin in on "online data".
- 25.3 s: brief overlap where the lab drops away while the caption strip sits over the network card.
- The robot hand is a simple jointed cardboard arm; it reads as a robot gripper more than a hand.
- Maxwell's equations use the system maths font (Cambria Math) fallback; correct but a different face from the handwritten F = ma / E = mc² cards.
- The end card's small follow line is ~31 px; readable on a phone but small.
- Typical still render: ~3-4.3 s per frame.

## Shared-file changes needed
None.
