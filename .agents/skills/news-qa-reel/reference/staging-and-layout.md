# Staging and layout (v6, the default)

Madhav on v5: "my face is small compared to the screen... a lot of blank screen... my face could be bigger, it can
cross the 50% mark... the animation on the right side and on the top side... when we ask the question, make it like
someone is asking anonymously in my Instagram DM and I'm answering it... 'Microsoft engineer answers Instagram
questions'". The reference implementation was the AI-bubble clip; all five clips then used it.

## Presenter (`template/src/presenter.tsx`)
- The whole-clip matte `public/matte/m0-1440.webm` (VP9 alpha) played per EDL segment; composition 1080x1920.
- `STAGE = { scale 0.88, x -80, y 234 }` (transform-origin top-left): his far shoulder runs off the left edge, head
  top ~y 770-950, body to the bottom edge, figure ~x 0-760.
- **Mirrored** (`scaleX(-1)` inside the transform): hands point toward the graphics, and the camera frame's cut
  edge sits at the screen's left edge instead of mid-screen.
- **Feathered** right edge: mask `linear-gradient(to right, #000 82%, transparent 100%)`, so no hard frame edge.
- Always on, never moves, scales or fades; the end card plays over him. A world may add `cutoutFilter` (a soft
  glow, a sticker edge) but never a zoom.
- `SIDE_FACE = { x 0, y 770, w 680, h 620 }` = head + hair union over the clip. **Re-measure per take** from
  stills (the Oct 21 and Oct 23 takes differed by ~15% head size and 170 px height).

## Zones (`template/src/ig/zones.ts`)
| zone | box (1080x1920) | what goes there |
|---|---|---|
| IG UI | top 220, bottom 380, right 140 | nothing that must be read |
| series tag | x 40, y 230-276 | the persistent pill, frame 0 to the end |
| top band | x 40-940, y 280-760 | MAIN graphics: hook headline, DM cards, diagrams, comment card, end title |
| right column | x 700-950, y 770-1290 | SECONDARY: chips, nodes, labels, the follow card |
| captions | x 692-950, from y 1300 | 1-3 lines, 54 -> 42 px |
| his head | SIDE_FACE | never covered |

Full-bleed backgrounds behind him are fine and wanted: fill both zones and leave no big empty areas. Scale scenes
up to the zones rather than leaving small objects floating in a dark field.

## Captions (`src/captions.ts` + `src/ig/RightCaption.tsx`)
- Auto-chunked from words.json: break at sentence punctuation, a pause > 0.35 s, or ~4 words / 24 characters.
- Right column x 692-950 from y 1300, up to 3 lines at 54 -> 42 px; a word wider than the column at 42 px shifts
  the block left just enough to end at x 950. White, heavy (800), soft dark shadow; emphasis words (`world/emph.ts`,
  chosen for meaning) get a colour and a small pop when said. Hidden during the END beat.
- Captions are verbatim (after the `fix` list); outro words are excluded.

## Format components (`src/ig/`)
- **SeriesTag**: IG-gradient pill with a paper plane; text from `series.ts` (default
  "MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS").
- **HookCard**: frame 0 = the cover. His exact spoken hook, big (96 px headline + 60 px sub), in the top band
  until the first question (~3 s). This is what people see before pressing play.
- **IGQuestion / AutoQuestions**: every question as an anonymous DM ("Anonymous", "?" avatar, paper-plane
  "IG question", purple-blue gradient bubble, 62-72 px). In 0.15 s before he starts reading, out 0.1 s after his
  answer starts. Key words can turn a colour as he says them (`marks`). Never usernames, photos, times or counts.
- **AnswerTag**: "A / MY ANSWER", once or twice per video.
- **CommentCard**: the spoken comment ask as an IG comment box; "Add a comment..." becomes his words when he says
  them. No fake usernames or counts.
- **EndCard**: title question in the top band; "Follow for more AI news" + handle in the right column, synced to
  his spoken outro (`OUTRO.t`); settled and static for the last ~0.4 s.
- **Chip**: glass chip for fact chips and "Madhav's take" labels.

## Beats (`src/beats.ts`)
One beat = one new picture, `s = cue("phrase") - 0.1`. A new picture every ~2 s; every item gets its own beat.
Modes: `SIDE` for all, `END` from `OUTRO.t - 0.3`. Keep `events.ts` at <= 25 sound events per minute.

## Motion rules (any style)
- One primary motion at a time; quick settles; holds >= 1.2 s; comparisons hold >= 3 s.
- No perpetual wobble, drift or bob; no camera move toward his face.
- Questions, chips and diagrams pop in on their word (popS damping 13-14) and fade out over 0.2 s before the next.
- Rich, saturated, glowing worlds are welcome; motion should teach, not decorate.
