# Art direction: Declassified Dossier

## The idea
A case file being worked on a dark desk at night. The desk never moves; documents are dealt onto it
(slide in from the right), marked up on his words (stamps, ticks, crosses, typed lines, highlighter,
red pencil), and cleared off (slide out left / fade right) when the next idea starts. The viewer
should feel "this is evidence", not "this is a slide deck".

## Palette (all in `src/world/kit.tsx`)
| Name | Hex | Use |
|---|---|---|
| desk | `#141210` + `tex/desk.jpg` (base `#221e1b` grain) | Back layer only |
| lamp | `#ffcf7a` | warm radial pool over the top band (`mixBlendMode: screen`, ~18%) |
| MEMO | `#f3ead6` + `tex/memo.jpg` | sheets, caption strips, small notes |
| MANILA / MANILA_D | `#d8c08a` / `#b99d62` + `tex/manila.jpg` | cards, folders, take cards, end-card folder |
| INK | `#16130f` | text, outlines |
| RED | `#c0282d` | stamps, emphasis, red pencil, headline bands |
| HI | `#f5e34a` | highlighter (multiply, 72%), data packets, sticky chips |
| BLUE | `#3d6fd1` (whale), `#2c4f9e` (badges, "our side", units) | the protagonist side |
| STEEL / brass | `url(#gsteel)` / `url(#gbrass)` | paper clips, scale, padlock |
| map | sea `#c9d6d6`, land = MANILA with `#8a6f3c` outline, China `#e07a6a`, USA `#7e9bd6` | paper maps |

Keep it to paper + ink + one red + one yellow. Extra colours only for meaning (blue = one side, salmon = the other).

## Type
- **Anton** (`COND`): headlines (80-92 px in the band), stamps, card labels, end title.
- **Courier Prime 700** (`MONO`): typed lines (`Type`), small print, captions (46 -> 34 px).
- **Segoe UI / Arial** only for things that imitate Instagram (series tag, IG DM card, comment card).
- Headline hierarchy in the band: red strip label (52 px, white) -> 84 px INK lines -> 80 px RED question.

## Textures
`src/world/make_textures.py` (numpy + Pillow, seeded) writes `tex/desk.jpg` (1240x2200, dark horizontal
wood grain, warm), `tex/manila.jpg` and `tex/memo.jpg` (1024 tiles with fibres and faint coffee rings).
They are SVG patterns `#pmanila` / `#pmemo` (`Defs`). Regenerate rather than committing them.

## Kit primitives (`src/world/kit.tsx`)
| Component / helper | What it does |
|---|---|
| `Defs` | shadows `#dsh` / `#dsh2`, worn-ink `#dink`, pencil grain `#dpencil`, paper patterns, steel/brass gradients. Mount once inside the SVG |
| `Sheet` | a textured sheet with shadow |
| `Type` | typewriter text revealed from `at` at `cps` chars/s (`at <= -99` = already typed) |
| `Stamp` | double-border rubber stamp that slams in at `at` (1.9x -> 1x in 0.14 s, small settle), worn ink, optional sub-line |
| `Redact` | black redaction bar that slides over a line at `on` and rips away in two torn halves at `off` |
| `Hi` | highlighter swipe left -> right |
| `Clip` | steel paper clip |
| `Pencil` | red-pencil stroke drawn along its length (`p` 0..1), pencil grain |
| `loopPath`, `arrowHead` | hand-drawn loop around a point; pencil arrow head |
| `StringLine`, `Pin` | red string between pins (sags), map/cork pin |
| `torn` | torn-edge rectangle path |
| `Whale` | the drawn stand-in for the brand mark (replace per film with a neutral drawn emblem, never a real logo) |
| `dealt` | a document dealt in with a spin and out (older motion; v6 uses `Slot`) |
| `pS`, `pB`, `back`, `sm`, `boil`, `rnd`, `lerp` | eased progress, back-overshoot pop, smoothstep, 2-frame pencil boil, seeded random |
| `HANDLE`, `SERIES` | the creator handle on the end card and the series-tag text |

Scene-level helpers in `scenes.tsx`: `Slot` (zone mapping + slide/fade), `TopSheet`, `ColSheet`,
`Tick`, `WhalePhoto` (polaroid + clip + optional BANNED stamp), `ATag` (A / MY ANSWER), `QCard`,
`CarSide`, `Person` (faceless paper person), `Bunker`, `WarMap`.

## Motion vocabulary (what happens on a word)
- **Stamp** on the verdict word: BANNED, RESTRICTING, RECEIVED, CLOSED, JOBS LOST, STUCK, BROKEN
  HARDWARE, POWER STRUGGLE, FOLLOW, AI NEWS, WHAT IF?, IF THERE IS A WAR, STAYS HOME.
- **Typed line** from the word: "U.S. GOVERNMENT:", "HOMELAND SECURITY SAYS:", "US: 100% tariff on BYD cars".
- **Pencil**: circle the date, draw the data arrow, tick a card, cross out OR / SECURITY RISK?, an arrow
  "MAKE AI -> BUY AI", a down arrow to the comment box.
- **Highlighter** on the strongest words of a headline or verdict.
- **Small acts**: car rolls in, barrier drops on "tariff", padlock snaps on "outside", workers pop on
  "employs" and walk off on "losing people job", factory lights go out on "losing factories", a paper
  hand pulls the plug on "I'm not gonna", server LEDs go off, a crack draws on "broken hardware",
  the brass scale settles level on "healthy".

## Hero object
The **case file** itself: the hook is a headline sheet with a red strip, and the END card is the closed
manila folder with "CASE FILE: <TOPIC>", a CLASSIFIED stamp, the hook headline and the question. A photo
of the subject (here the drawn whale on a polaroid) recurs: hook photo, federal monitor, Venn, market,
scale pan.
