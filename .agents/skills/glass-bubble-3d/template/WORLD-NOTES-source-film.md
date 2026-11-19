<!-- Sanitised copy of the source film's world notes (news batch, Oct 2026), kept as the worked example of the README each world should keep. front.tsx (mentioned below) is not shipped: nothing imports it. -->

# c2-bubble world notes: "Real 3D glass bubble"

Status: v5 DONE (REVISION-V5 applied; tsc passes; stills out/v5/sheet.png). Awaiting Madhav review. Latest world = the v5 section at the end.

## Concept
A huge iridescent soap/glass bubble (thin-film shader, fresnel rim, studio window highlights) floats in a
dark studio. Inside: a tiny glowing AI city (data-centre blocks with lit windows, GPU racks with LEDs,
floating chips with gold pins, code glyphs, a glowing core tower). Money (3D gold coins + gold dust + "$"
glyphs) pours in and the bubble inflates. Tension on "burning billions on the hype / think about it":
stretch, wobble, a hairline crack (never pops). "AI touches everything": light threads to a laptop,
phone, car, hospital, bank. Microsoft story: a 3D desk INSIDE the bubble (city sinks away): a code
editor whose lines get written by an AI agent orb; then Guide -> Design -> Delegate -> Review nodes
with light beams from Madhav (the conductor). "Penetrate that deep": camera flies out, threads re-light.
"A lot more market": threads to a field of new market nodes; the bubble hardens into a solid glass
planet and the crack seals in gold. End: planet + question + follow line.

## Palette / type
Deep navy/black studio (#02040c..#0a1030); iridescent cyan #5ee7ff / magenta #ff5fd2 / gold #ffc94a;
coin gold #ffb627. Type: Segoe UI Bold (local system font, no network), HTML overlays projected from 3D
anchors. Code: Consolas on canvas textures.

## Beat table (times are cues from words.json)
| id | start | mode | picture |
|---|---|---|---|
| hook | 0 | FULL | him + small bubble top-right (Front canvas) + title "IS THE AI BOOM A BUBBLE?" |
| money | "Well" | OUT, tile [540,860] | tile flies into bubble; coins pour, inflate; FUTURE? / HYPE? chips; stretch+wobble+crack on "hype"/"think about it" |
| (touch inside money) | "AI right now" | OUT | pull back, threads to laptop/phone/car/hospital/bank |
| msft | "I'm working" | FULL, tile from laptop | chip "Madhav - works at Microsoft" |
| desk | "I've seen" | SIDE | desk inside bubble, editor written by AI agent; "used to code every single night" moon |
| now | "But now" | FULL | chip "Now: orchestration" |
| steps | "where I guide" | SIDE | Guide -> Design -> Delegate -> Review nodes, conductor beams, Approved check on "my leaders like" |
| deep | "So if" | OUT | fly out of the bubble, threads penetrate into objects, code glyphs dissolve on "not even coding" |
| fwd | "I don't even know" | FWD, tile from bubble | small bubble top-right, chip "In 10 years?" |
| market | "I think it can" | OUT, tile into bubble | threads to many market nodes, bubble hardens into a glass planet |
| end | OUTRO.t-0.5 | END | planet + question + Follow for more AI news + @madhav_somani |

## Files
src/world: timing.ts (cues + hand-off points), rig.ts (camera keys, bubble state, object/desk layout),
cam.ts/mats.ts/parts.tsx (from luminous-cosmos-3d template), bubble-mats.ts (shell, planet, studio, floor
shaders), scene.tsx (Bubble, City, Coins, Objects+threads, Markets, Desk), tex.ts (canvas textures, live
editor), overlay.tsx (hook title, chips, conductor beams, end card), caption.tsx, front.tsx, world.tsx,
emph.ts, events.ts. src/beats.ts imports cues from world/timing.ts.

## What was built
- Back canvas: dark studio (navy sky shader, iridescent floor pool), thin-film soap shell (fresnel, two
  window highlights, wobble/ripple/stretch, hairline crack on "Think about it", sealed in gold when it
  hardens), glass planet (navy glass, gold meridians, market dots), AI city (instanced data-centre blocks
  with lit windows, GPU racks with blinking LEDs, core tower, floating chips with gold pins, code-glyph
  sprites that dissolve on "not even coding"), 70 tumbling 3D coins + gold dust + "$" sprites (radius
  inflates 3.0 -> 4.2), threads + 3D laptop/phone/car/hospital/bank, 46 market nodes, a desk inside the
  bubble with a live canvas code editor (he types -> AI agent orb streams the code; spec lines, review
  marks, APPROVED stamp), a moon on "every single night", Guide -> Design -> Delegate -> Review nodes
  with conductor beams.
- Front canvas (hook + FWD): a small bubble with its city, top-right of his head.
- HTML: hook title (frame 0 cover), chips (Future?/Hype?, AI touches everything, object labels, works
  at Microsoft, How we work: evolved, Lines of code -> AI agent, Before: coded every night, Now:
  orchestration, step chips, Me: the conductor, Not even coding anymore, In 10 years?, market labels,
  Madhav's take: a lot more markets), end card (question, Follow for more AI news, @madhav_somani).
- Captions: Segoe UI bold, iridescent emphasis words; hidden while the hook title is up.
- events.ts: 36 events (~46/min).

## Stills
out/dev, out/r2a, out/r2b, out/r3a, out/r3b, out/r4 (latest fixes): each has sheet.png.

## Known issues / notes
- src/mattes.json was still empty at review time, so the SIDE stills show the footage as a rectangle in the
  bottom-left. Recheck the desk/steps stills (12.5, 19.8, 25.5 and 30.0 s) once the mattes land. Conductor beams
  start at (575,1062), right of the cut-out face box.
- Fonts are local system fonts (Segoe UI / Consolas); no network loading.
- The moon (19.3-20.3 s) sits partly in the top IG band; decorative only.
- Market labels (Education, Retail, Farming, Energy) illustrate his "a lot more markets" take; they are
  not claims. No numbers appear on screen.
- No bed is set (world.bed undefined); mixing is out of scope.
- A custom snapshot temp folder could not be deleted by the agent (safety check); delete it manually.

## v2 (REVISION-V2.md, 2026-10-21)
- New spine (47.7 s, 1430 frames): every cue still resolves (no words of his lines were cut).
- Hook: exact headline "Is the AI boom a bubble? A Microsoft engineer's take" over his still full frame,
  held 0-3.4 s (hook FULL now runs to "investing"); captions hidden under it. Small bubble top-right, no bob.
- Beats: hook FULL -> money OUT ("investing") -> touch OUT ("AI right now") -> msft FULL -> desk SIDE ->
  now FULL -> steps SIDE -> deep OUT -> fwd FWD -> market OUT -> end. All `tile` hand-offs removed (no
  footage into the bubble or out of the laptop).
- Calm: one fixed camera pose per beat; scene changes are cuts hidden under his full-frame beats or a
  single 0.6 s move (money -> touch, end). No drift, sway, orbiting end camera or motes. The bubble wobbles
  only in the tension window ("on the hype" -> "Think about it"); film shimmer slowed. City windows,
  chips, glyphs and objects are static; the building-to-building arcs were removed; thread pulses slowed.
  The desk/city swap and the bubble resize happen on cuts. Captions and text no longer shimmer; emphasis
  words use solid cyan, pink and gold.
- Honesty: market labels removed (nodes only). The "not even coding" chip now reads "People not even coding
  anymore" with the sub-line "Madhav's experience".
- events.ts: 20 soft events (~25/min).
- Stills: out/v2a (0-12.5 s), out/v2b (20-47.6 s), out/v2c, out/v2d (caption/moon fixes). The mattes are in;
  the SIDE cut-out reads cleanly, with beams starting right of his head.
- Known: the moon (19.3-20.7 s) still touches the top IG band; it's decorative. The snapshot temp folder needs a
  manual delete (the agent's rm was blocked).

## v3 (REVISION-V3.md, 2026-10-23): fast pacing, ElevenLabs lines, Madhav always the cut-out at the left
- Spine: 46.27 s, 1388 frames. Words include ElevenLabs lines. The "In plain words" line now follows "...my
  leaders like." (coordinator spine update); beats were re-cued against the final words.json.
- Beats (all SIDE, END last), one new picture each: hook (0) / future / pop / think / touch / msft / desk /
  code / night / now / orch / steps / babysit / leaders / plain / deep / fwd / market / comment / end
  (OUTRO.t - 0.3).
- Layout: graphics stay in the top band (y 220-640) and right column (x 560-1040); captions sit in the SIDE box.
  The face mask keeps glow points off his face box. The Front canvas is no longer used (the world is always
  behind him).
- Hook: exact headline "Is the AI boom a bubble? Here's what I see at Microsoft." as a glass card in the top
  band, 0-2.9 s, with coins already pouring into the bubble in the right column at frame 0. Then the
  "Future?" vs "Bubble?" chips, and the crack lands on "pop".
- Camera: one pose per beat (P_HOOK, P_TOUCH, P_DESK, P_STEPS, P_TEN, P_END), with cuts or single 0.6 s moves.
- Desk: the monitor is in the top band; chips in the right column (works at Microsoft, How we work: completely
  evolved, Writing code -> the AI agent, Before: coded every night). Workflow nodes run in a vertical column
  (Guide/Design/Delegate/Review), with "Now: orchestration" above them, "Me: the conductor" above his head and
  beams from beside his head. The Review node gets a check and the editor shows APPROVED on "my leaders like".
- EL "In plain words": a comparison card (Managing AI agents, long cyan bar / Writing code, short pink bar),
  bars on the words, over the desk.
- Deep: bubble + 5 objects. "People not even coding anymore" chip with "Madhav's experience". Then "In 10
  years?", "Madhav's take: a lot more markets" (threads to market nodes, bubble hardens to a glass planet).
- EL comment prompt: an Instagram-style comment card ("Bubble or not?" / "Add a comment..." -> "Comment your
  take"), with no username and no counts.
- End: title in the top band, small planet, "Follow for more AI news" + @madhav_somani in the right column,
  static for the last ~0.45 s.
- events.ts: 19 soft events (~25/min).
- Known: front.tsx is unused (kept). The snapshot temp folder needs a manual delete. The bank label sits near (not on) the
  caption box at 34-36 s.

## v5 (REVISION-V5.md, 2026-10-23): his re-recorded take (DJI 0161), he reads the questions, then answers
- Spine: 68.73 s, 2062 frames, all his real voice. OUTRO.t 65.93 ("follow for more AI news"); end beat from 65.63.
- Head box re-measured from proxy stills (3/10/20/35/50/60 s): `SIDE_FACE = { x: 96, y: 1060, w: 464, h: 580 }` (head + hair
  union, mirrored). The 3D face mask uses it too. Captions no longer widen leftwards (they shrink to 50/46/42 px instead).
- Beats (all SIDE, END last): hook 0 / q1 3.35 / money 7.10 / touch 9.40 / q2 16.40 / msft 18.69 / code 24.63 /
  night 26.22 / orch 29.13 / steps 32.64 / plain 38.50 / old 44.41 / ai 52.85 / stay 61.92 / comment 63.98 / end 65.63.
- Hook (0-3.15 s): glass card, exactly "I barely write code anymore. / Here's what I do instead.", bubble + city in the
  right column (coins no longer pour at frame 0).
- Questions: a white speech bubble in the top band with a "Q" tile, tail pointing down-left to him. Q1 "Is the AI boom the
  future, or a bubble about to pop?" (future cyan, bubble/pop magenta on their words; the bubble stretches + cracks on "pop").
  Q2 "What's actually changed in your job?" (camera cuts back to the hook pose so the band is clear). A gold "A / MY ANSWER"
  tag opens both answers ("Big Tech is pouring billions in" chip with coins; "Madhav works at Microsoft").
- "AI now touches everything": 3D icons pop on their words: robot (Robotics), hospital (Medical), car (Transportation),
  capsule + molecule (Drug discovery), laptop (Everything), with light threads from the bubble. Phone/bank removed.
- Desk: as v3 (editor typed by him, then the AI agent; moon on "every single night"; "Before: coded every night" gains
  "Now: I don't" on "but now"). "Now: I orchestrate"; nodes Guide / Design / Verify / Babysit the AI light on their words;
  review marks on "verify", a fix mark until "output", "✓ OUTPUT" stamp + Babysit ✓ on "output". "Me: the conductor" sits
  above his hair (262, 968) with beams from (452, 968).
- "In plain words" card (Managing AI agents / Writing code bars) on "manage" / "writing".
- Pipeline (new, HTML): city bubble top-left (P_PIPE), header top-right "BEFORE / How a feature shipped / a person at every
  step"; six rows in the right column (Write code, Raise a PR, Review, Approve, QA, Deploy) light on the old-way words. From
  "So my QA is AI" the header flips to "NOW / AI at every step / Madhav's experience" and each row gets a magenta "AI" stamp
  (and its person badge becomes "AI") on the word "AI": QA, Review, Write code + Raise a PR ("the guy building the
  feature"), Approve, Deploy.
- "I think it's gonna stay": chip "Madhav's take: AI is gonna stay"; the bubble hardens into the glass planet on "stay".
  Market nodes are no longer drawn. Then the comment card "Bubble or not? / Comment your take", then the end card.
- events.ts: 21 soft events (18.3/min).
- Stills: out/v5 (36 stills + sheet.png). Bundle deleted.
- Known: his hair edge sometimes reaches x ~560 next to the caption box (caption box position is fixed by the brief);
  the "In plain words" card holds ~2.4 s before its first bar (he pauses after "In"); front.tsx unused (kept, compiles).

## v5b (2026-10-24): faster pacing, 1.15x spine
- New spine: one segment, speed 1.15, tighter pauses: 59.03 s, 1771 frames; OUTRO.t 56.60; matte m0-1440 rebuilt (1771 frames).
- All beats re-resolve from cue(). Hard-coded offsets removed: the AI stamps now land on the start of each "AI" word
  (lastStart("is AI", n)), and the Q2 word highlights use cue("changed") / cue("job").
- Shortest holds: code 1.34 s, comment 1.38 s, stay 1.79 s (all >= 1.2 s). events.ts: 21 events = 21.3/min.
- Head box unchanged (rechecked on the sped proxy at 3/9/20/30/45/52 s). Stills: out/v5b/sheet.png (36 stills), no collisions found.

## v6 (2026-10-24): bigger Madhav, graphics top + right, Instagram-question format
- Presenter: SIDE_S 0.88, x -80, y 234 (mirror kept; feather now 82%->100% of the frame width). His head top sits at
  ~y 780-950, body to the bottom edge, figure ~x 0-760. SIDE_FACE = { x: 0, y: 770, w: 680, h: 620 } (head + hair union).
- Captions: right column x 692-950 from y 1300 (Film.tsx regionFor SIDE), up to 3 lines at 54 -> 42 px; a word wider than
  the column (e.g. "transportation,") shifts the block left just enough to end at x 950.
- Series tag (frame 0 to the end, y ~230-276, IG gradient pill + paper plane): "MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS".
- Questions are anonymous IG DMs in the top band: "Anonymous" with a "?" avatar, a paper-plane "IG question" label and a
  purple-blue DM bubble with the exact question (no usernames, photos, times or counts).
- Layout: hook headline, questions, money/touch chips, the desk monitor, the pipeline (now a 2 x 3 grid under a one-line
  header), the stay chip, the comment card and the end title all live in the top band (y 280-760). Bubble sits in the right
  column for hook / questions / pipeline / end and fills the top band for money / touch / stay. Desk answer chips, the
  workflow nodes (Guide / Design / Verify / Babysit the AI), "In plain words" and the follow card are in the right column.
  "Me: the conductor" sits under the monitor (300, 728) with beams down to the nodes.
- Beats, timing and events unchanged (1.15x spine, 59.03 s). Stills: out/v6/sheet.png (37 stills). Bundles deleted.
- Known: the touch-beat icons are dense in the top band (robot/hospital left of the bubble, laptop right, car + capsule in
  the right column); the "Everything" label touches the bubble's edge. Top band is empty below the end-card title.
