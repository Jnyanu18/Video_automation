# Scene catalogue (source film, v6)

Every scene, prop and overlay, with its file and the cue that drives it. Times are from the source film's spine
(59.03 s, 1.15x); in a new film every one of these comes from `world/timing.ts` cues on the new words.

## Shell and world wiring
| Piece | File | Notes |
|---|---|---|
| `World: WorldDef` | `world/world.tsx` | `Back` (one ThreeCanvas inside `Finish`), `Front` (HTML `Overlays`), `Caption` (`BubbleCaption`), cut-out glow filter (cyan + pink drop shadows) |
| `BackScene` | `world/world.tsx` | per frame: pose (`poseAt`), bubble state (`bubbleAt`), face-mask uniforms, lights, then Studio / City / Coins / Objects / Desk / Bubble mounted only while needed |
| `covered(t)` | `world/world.tsx` | true when full-frame footage covers everything (unused in v6: he is always the cut-out) |

## 3D pieces (`world/scene.tsx`)
| Piece | Shows | Driven by |
|---|---|---|
| `Studio` | navy sky sphere following the camera, floor disc with iridescent pool, a deep blue halo | `st.money`, `st.hard` warm the floor/sky |
| `Bubble` | thin-film shell (+ `planetMaterial` when hardening), a cyan point light inside, a gold light while money pours | `bubbleAt(t)`: `R`, stretch `sx/sy`, `wob`, `ripple`, `crack`, `gold`, `hard`; `uInside` when the camera is inside |
| `City` | instanced data-centre blocks with lit windows, GPU racks with LEDs, core tower, 3 floating chips with gold pins, code glyph sprites (`</>`, `{ }`, `AI`, `01`, `fn()`, `=>`, `GPU`) | `cityK(t)` (1 except during the desk), grows with `growOf`; `glyphOut` can dissolve glyphs |
| `Coins` | 70 tumbling 3D coins pouring from above into the bubble, gold dust | each coin starts at `T.pouring - 0.45 + i*0.03 + jitter`, falls 1.15 s; mounted `T.pouring-0.6 .. B.touch.s+0.6` |
| `Objects` | robot, hospital, car, capsule + molecule, laptop (code screen texture), each on a light thread from the bubble | `OBJ_T0(i)` = its word - 0.3 (robotics / medical / transportation / drug discovery / everything); `threadK`, `objK`; hidden from `B.q2.s` |
| `Markets` | 46 glowing market nodes around the planet | **not mounted in v5/v6** (the labelled version read as a claim); kept as a pattern |
| `Desk` | desk top, monitor with the live editor texture, keyboard LEDs that flicker while he "types", mug, moon + stars on "every single night", the AI agent orb that moves to the line it is writing, then reviews; Guide / Design / Verify / Babysit nodes with flowing particle links | `deskK(t)` (1 from `B.msft.s` to `B.old.s`), `T.evolved`, `AGENT_T()`, `T.night`, `STEPS[i].t`, `T.babysit`, `T.output` |

## Textures (`world/tex.ts`)
| Piece | Notes |
|---|---|
| `glyphTex`, `moonTex`, `laptopScreenTex`, `phoneScreenTex` | canvas textures, built once (`once()` cache) |
| `drawEditor(g, t)` | the live code editor: file tab, line numbers, the human's lines typed until the agent takes over, `SPEC` lines on "guide"/"design", the agent's lines streamed from `AGENT_T()`, review marks on "verify", a fix mark until "output", then "✓ OUTPUT" |
| `editorLines(t)` | how many lines are on screen at t (used to place the agent orb and its chip) |

## Overlays (`world/overlay.tsx`, HTML over the canvas)
| Piece | Zone | Cue |
|---|---|---|
| `SeriesTag` (`SERIES`) | x 40, y 230 | frame 0 to end (format from news-qa-reel) |
| `HookTitle` | top band | frame 0 (cover) until `B.q1.s - 0.2`; exact spoken hook, gradient on the key phrase |
| `IGQuestion` x2 | top band | `B.q1.s`, `B.q2.s`; anonymous DM card, key words recolour on their word (`qWords` marks) |
| `ATag` "A · MY ANSWER" | top band (answer 1) / right column (answer 2) | start of each answer |
| `Chip` "Big Tech is pouring billions in" | top band | `T.pouring` |
| `Chip` "AI now touches everything" + per-icon labels projected from 3D (`anchor()`) | top band / around icons | `T.aiNow`, `OBJ_ARRIVE(i)` |
| `Chip`s Madhav works at Microsoft / How we work: completely evolved / Writing code -> the AI agent / Before: coded every night -> Now: I don't | right column (`RX 826`, `RW 244`) | `T.microsoft`, `T.evolved`, `T.dontCode`, `T.night`, `T.butNow` |
| `Chip` "AI agent" following the orb | top band | `T.evolved + 0.5` |
| `Chip` "Now: I orchestrate" + step chips (Guide / Design / Verify / Babysit the AI ✓) | right column, anchored to the 3D nodes | `T.orchestrate`, `STEPS[i].t`, `T.output` |
| `Beams` + "Me: the conductor" | from (478, 728) under the monitor to the nodes | `B.steps.s` .. `B.plain.s` |
| `Plain` "In plain words" bars (Managing AI agents ▲ / Writing code ▼) | right column | `T.manage`, `T.writing` |
| `Pipeline` 2 x 3 grid (Write code, Raise a PR, Review / Approve, QA, Deploy), header BEFORE -> NOW "AI at every step / Madhav's experience", magenta AI stamps | top band | rows light on `T.writeCode` ... `T.deploy1`; header flips at `B.ai.s`; stamps on `T.aiQA` ... `T.aiDeploy` (`lastStart("is AI", n)`) |
| `Chip` "Madhav's take: AI is gonna stay" | top band | `B.stay.s + 0.25` (bubble hardens on `T.stayW`) |
| `CommentPrompt` "Bubble or not?" -> "Comment your take" | top band, left of the planet | `B.comment.s`, `T.comment` |
| `EndCard` title "Is the AI boom a bubble?" + "Follow for more AI news" + `HANDLE` | top band + right column | `B.end.s`, `OUTRO.t`, `OUTRO.t + 0.7` |

## Captions (`world/caption.tsx`)
`BubbleCaption`: measured with a canvas (`measure()`), wraps to the right-column width, 54/50/46/42 px, max 3 lines,
emphasis words (`world/emph.ts`) in cyan/pink/gold by word index with a small pop. The shell hides captions in END.

## Sound events (`world/events.ts`)
21 events from the same constants (questions pop, crack, coins, icons, desk whoosh, agent typing, moon chime, orchestrate
card, OUTPUT stamp, plain card, pipeline whoosh, five AI stamps, harden bloom, comment pop, follow land).
