---
name: declassified-dossier
description: >-
  Madhav's "Declassified Dossier" animation world: a manila case file / evidence look on a dark
  charcoal desk under a warm lamp (memo-paper sheets, Courier typewriter text typed on the word,
  worn rubber stamps that slam on the word, red-pencil arrows and ticks, highlighter swipes,
  redaction bars, paper clips, map pins), with a dated news calendar card, a paper map with
  pinned countries, "OR -> AND" take cards, a "WHAT IF?" analogy diorama (Enigma), factory /
  market and non-graphic strategy-table panels, a comment card and a case-file end card,
  drawn in SVG in Remotion around his real cut-out. Use when asked for "the dossier style",
  "case file / classified / evidence-file look", "make it like the DeepSeek one", or a
  policy / ban / geopolitics / security / "is it X or Y" news-answer Reel in the news-qa-reel
  format. Plugs into the news-qa-reel shell (this skill only supplies the world) and runs inside
  animated-video's stages and approval stops. Not for the LEMMiNO documentary evidence room with
  white clay dioramas (case-file-explainer), paper collage over footage (paper-lab-reel) or 3D
  worlds (glass-bubble-3d, luminous-cosmos-3d).
---

# Declassified Dossier (a typewritten case file around a real presenter)

The news is a case file being worked on a dark desk. Every line he says becomes a document that
slides onto the desk and gets marked up on his exact words: a headline sheet with a highlighter
swipe, a calendar page circled in red pencil, a BANNED stamp slamming onto a photo, a map getting
pins, two take cards with "OR" crossed out and "AND" popping in, an analogy diorama tagged
"WHAT IF?", a verdict list ticked line by line, and finally the case file closing with
FOLLOW / AI NEWS stamps. The presenter stays a big still cut-out bottom-left the whole time.

First film: the "The US just banned a Chinese AI. Was that fair?" DeepSeek news Reel (Oct 2026,
93.6 s at 1.18x, 1440x2560; frames in `../../docs/declassified-dossier/`). Madhav kept this world
through every revision (v1 -> v7) and asked to extend it with more examples (employment,
security, war) rather than restyle it. No explicit "loved it" was recorded: treat it as a proven,
working base, and still get a style-frame approval for each new film.

## Where this fits

- **Stages and approval stops come from cstack `animated-video`** (concept + beat sheet, style
  frame, key-frame board, final review). Never skip a stop because this playbook exists.
- **The format comes from `news-qa-reel`**: the spine (EDL, `vo.wav`, `words.json`, `cue()`),
  the v6 staging (big mirrored cut-out bottom-left), the series tag, the anonymous IG-DM question
  cards, captions in the right column, the comment card and the end-card rules. That skill owns the
  shell (`Film.tsx`, `lib.ts`, `presenter.tsx`, `captions.ts`, `beats.ts` conventions,
  `render_ig.sh`, `qa.sh`). **This skill only supplies the world** (`src/world/**`) plus the
  `dossier` audio style. The template ships a copy of the shell only so it compiles on its own; if
  news-qa-reel's shell is newer, use that one. (The IG DM card + series tag live in
  `src/world/ig.tsx` here; the c2-bubble film is the reference implementation of the format.)
- **Spine conventions come from `paper-lab-reel`** (raw read-only, every time from his words via
  `cue("phrase")`, never rewrite his voice, faster-whisper on CPU, full-quality delivery).
- Sibling: `case-file-explainer` is the cinematic LEMMiNO evidence room (charcoal, glowing photo
  cards, clay dioramas, narrator). This one is flatter, faster and typewritten, built for a 60-95 s
  Q&A Reel with his face on screen throughout.

Reference files (read at the matching stage):
- [reference/art-direction.md](reference/art-direction.md): palette, type, textures, kit primitives, motion vocabulary.
- [reference/scene-catalogue.md](reference/scene-catalogue.md): every scene, prop and overlay with its component and cue.
- [reference/layout-and-staging.md](reference/layout-and-staging.md): v6 zones in pixels, `Slot` mapping, collision checks.
- [reference/audio.md](reference/audio.md): the `dossier` score style, SFX mapping, event budget, levels.
- [reference/pitfalls.md](reference/pitfalls.md): known failures and fixes.
- [reference/pipeline-commands.md](reference/pipeline-commands.md): every command in order.
- [template/README.md](template/README.md): starting code, reusable kit vs film-specific files, how to instantiate.
- `examples/`: the source film's beat table, script, fact-check notes and hook choices.

## Non-negotiables

1. **His real self is the anchor.** Real face, lips and voice from the take; the cut-out is a local
   matte of the same pixels. Never regenerate, retouch, relight or lip-sync him.
2. **Calm presenter.** A still cut-out: no scaling, sliding or zooming of his footage, ever; no
   camera move toward his face; panels never cross his head. Madhav: "zoom in and zoom out on my
   face, it goes in the middle. I hate that."
3. **Facts are only what he says**, plus short sourced fact chips the brief approves (the film's
   "US tariff on Chinese EVs: 100%+"). Opinions are labelled as his ("MADHAV'S TAKE", "MADHAV'S
   VERDICT", "- Madhav's take"). Hypotheticals and analogies get a **WHAT IF?** / **IF THERE IS A
   WAR** stamp, never a claim. A dated news card shows the real date and an accurate paraphrase,
   no outlet logos, no invented quotes (the v5 build dropped the quoted DHS order text for a plain
   "THEIR WORRY: DATA -> CHINA"). **No disclaimers** or "not endorsed" lines.
4. **Non-graphic.** Conflict is shown as unit blocks on a strategy map, a pulled plug, ACCESS
   DENIED, a cracked screen; no weapons, injuries or flags of real armies in action. Countries are
   labelled shapes and pins, not caricatures. Real seals and logos are replaced by plain badges
   (the "DHS" shield is a generic shape) and a drawn whale stands in for the brand mark.
5. **Every time comes from his words** (`cue()`, `cueEnd()`, `wAt()` in `world/T.ts`). No
   hard-coded seconds except small offsets from a cue.
6. **Deterministic**: everything is f(t); seeded `random()` via `rnd("key")`, never `Math.random()`.
7. **Delivery**: the approved full-quality 1440x2560 master only; no upload, scheduling, sharing or
   paid generation without his explicit approval for that action.

## Stages (inside animated-video)

0. **Intake + spine** via news-qa-reel (raw hash, transcript, items with `q` flags, `edl.json`,
   `words.json`, `vo.wav`, `proxy-1440.mp4`, whole-clip matte `m0-1440.webm` re-encoded with `-g 15`).
   Run `py src/world/make_textures.py` once (desk, manila, memo textures; deterministic).
1. **Fact pass** (`NOTES.md`): every checkable claim, status, real source, treatment (fact chip,
   WHAT IF? tag, "Madhav's take" label, or an approved cut). See `examples/fact-check-notes.md`.
2. **Concept + beat sheet -> STOP 1.** One document per idea; a new picture every ~2 s; holds
   >= 1.2 s (comparisons >= 3 s). For each line decide: which document (sheet / card / photo /
   map / diorama), which mark lands on which word (stamp, tick, cross, circle, highlight, typed
   line), and which zone it lives in (top band or right column).
3. **Style frame -> STOP 2.** One information-heavy beat at 1080x1920 with his cut-out, the series
   tag, a band sheet + column card and a caption. Check his head box against every graphic.
4. **Timing + skeleton + key-frame board -> STOP 3.** `world/T.ts` (all cues), `beats.ts` (all
   SIDE, END last at `OUTRO.t - 0.3`), stub `Slot`s per beat; stills of every beat start.
5. **Build the world** scene by scene (`reference/scene-catalogue.md`); `events.ts` from the same constants.
6. **Audio**: `py audio/mix.py dossier` (synthetic score + paper SFX family; <= 25 events/min).
7. **Render + QA**: `npx tsc`, stills sheet, `render_ig.sh Film <name> public/bed-dossier.wav`,
   `qa.sh`, Whisper on the final audio.
8. **Final review -> STOP 4.** Report the four QA states separately (technical receipts, factual,
   creative = what you looked at and what you could not, user acceptance = none until he says so).
   Music/SFX are synthetic or CC0 and unauditioned: say so.

## Look

- **Desk**: near-black charcoal wood (`#141210` base, `tex/desk.jpg`), a warm lamp pool over the
  top band (`#ffcf7a` screen gradient) and a dark vignette. Nothing else moves in the Back layer.
- **Paper**: memo `#f3ead6` (`tex/memo.jpg`) for sheets and captions, manila `#d8c08a`
  (`tex/manila.jpg`) for cards, folders and take cards. Every sheet has a soft drop shadow
  (`#dsh`), small cards a tighter one (`#dsh2`), and a slight rotation (-0.6 to +1.5 deg).
- **Ink**: `#16130f` text, stamp red `#c0282d` (stamps, emphasis, red pencil), highlighter
  `#f5e34a` (multiply), blue `#2c4f9e` / `#3d6fd1` for "our side" shapes, brass gradient for
  scales and padlocks, steel gradient for paper clips.
- **Type**: Anton (heavy condensed) for headlines, stamps and labels; Courier Prime 700 for typed
  lines, captions and small print (both via `@remotion/google-fonts`). The IG DM card and series
  tag use Segoe UI / Arial (system UI font) so they read as Instagram, not as paper.
- **Marks**: worn rubber-stamp ink (`#dink` noise filter), pencil grain (`#dpencil`), hand loops
  (`loopPath`), ticks, X crosses and arrows drawn along their length on the word.

## Motion rules (his v2 note: "too much motion")

- One primary motion at a time. Panels slide in from the right on the beat (0.35 s, eased) and
  out to the left (0.3 s); right-column panels **fade out while drifting right** so nothing ever
  slides across his face. Then they hold still.
- Marks land on their word: stamps fall from 1.9x to flat in 0.14 s with a tiny settle; typed lines
  run at 30-45 chars/s from the word; ticks/crosses draw in 0.18-0.25 s; highlighter swipes 0.3 s.
- Small objects may act (a car rolls in, a barrier arm drops, a padlock snaps, data packets travel
  a pencil arrow, a scale settles level) but only one at a time, and they stop.
- No desk drift, zoom, camera shake or perpetual wobble; no footage tiles flying into photos.
- The end card ends static (stamps done ~1.3 s before the last frame).

## Layout (v6 staging, 1080x1920 design space)

| Zone | Pixels | What goes there |
|---|---|---|
| Series tag | x 40, y ~230-276 | "MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS" pill (`SERIES` in `world/kit.tsx`), frame 0 to the end |
| Top band | x 40-942, y 300-668 (`BAND_TF`) | the main document per beat: headline sheet, news card, diorama, map, take cards, scenes, verdict, comment card, end title; IG DM question cards (y 306) |
| Right column | x 678-944, y 770-1159 (`COL_TF`) | the secondary card: photo, monitor, badge, machine, list, Venn, chip stack, terminal, follow stamps |
| Captions | x 692, y 1300, w 258 (`regionFor("SIDE")`) | memo strips, one per line, up to 3 lines, Courier 46 -> 34 px; "A / MY ANSWER" tag sits at (692, 1290) |
| Presenter | `SIDE_S 0.88`, `SIDE_X -80`, `SIDE_Y 234`, mirrored, right-edge feather 82% -> 100% | `SIDE_FACE = {x 0, y 840, w 580, h 680}` (head + hair, this take); nothing may cover it. Re-measure for every new take |

Scenes are authored in the older v5 coordinates (band x 50-1030, y 235-635; column x 575-935,
y 655-1180) and mapped by `Slot` (`cx === 755` = column). Details: [layout-and-staging.md](reference/layout-and-staging.md).

## Audio

`audio/mix.py dossier`: C-minor "intelligence briefing" (dark pad, muted mallet plucks, a soft
ticking pulse on busy beats), paper SFX family (CC0 rubber stamp, synthetic paper taps, typewriter
taps, marker/pencil scratches, page flips, short whooshes). Phrase duck -15 dB under his voice,
effects kept >= 20 dB under the voice band, `MUSIC_DB` -7.5, `FX_DB` -14. Source film: 35 events in
93.6 s (~22/min). `render_ig.sh` mixes `vo.wav` + bed, 3:1 compression, about -14 LUFS, TP <= -1.5 dBTP.

## QA

- `npx tsc -p .` clean; stills of every beat start, every stamp/tick landing, the analogy steps,
  the end card and the last frame (`snap.sh`), read as a sheet before any full render.
- Look for: anything over his head box; panels mid-slide across his face; stamp or tick touching
  text; typed lines running past the sheet edge; the outgoing band panel overlapping the incoming IG
  DM card; text smaller than ~24 px after the 0.74 column scale; anything under the IG UI.
- `qa.sh`: streams, 0 decode errors, no black, loudness/true peak, contact sheet, cuts sheet, frame 0,
  last second; faststart check; Whisper on the final audio vs `words.json`.

## Delivery spec

1440x2560 (render the 1080x1920 composition with `--scale=1.3333333333333333`), H.264 High, CFR 30,
yuv420p limited range, bt709, <= 25 Mbps and <= 300 MB, AAC-LC 48 kHz 128 kbps, faststart, about
-14 LUFS, TP <= -1.5 dBTP, frame 0 = designed cover (hook headline up), static last second.

## What worked (keep)

- **A document for every sentence, marked on the word.** Stamps, ticks, typed lines and highlighter
  swipes landing on his exact words make a long opinion piece feel like evidence being worked.
- **The dated news card** (red calendar page "OCT 20", typed "U.S. GOVERNMENT:", the paraphrase in
  Anton, BANNED stamp on "banning"): instantly credible, no logos needed.
- **Honesty built into the art**: WHAT IF? on the Enigma analogy, IF THERE IS A WAR on the
  hypothetical, "Madhav's take/verdict" labels, one sourced fact chip, no disclaimers.
- **The analogy panels**: Enigma diorama with a hidden red wire from the machine (column) to the
  German bunker (band) and data packets travelling it; the factory/cheap-car/jobs-lost sequence;
  the strategy table with a borrowed AI terminal that goes ACCESS DENIED when the plug is pulled.
  Concrete, recognisable, readable in a second.
- **Simple binary graphics for the question**: SECURITY THREAT? / OR / POWER STRUGGLE? cards, then
  both ticked, OR crossed, AND popping; a Venn "IT'S BOTH" in the column.
- **v6 staging** (big presenter, band + column, right-column captions, series tag, IG DM cards):
  the face is the hook, the documents carry the facts.
- Calm, sparse motion and soft SFX (Madhav's v2 notes) with a rich, warm, tactile palette.

## What to improve next time

- The band is scaled to 0.92 only, leaving a ~100 px empty strip between the band (ends y 668) and the
  column (starts y 770): author new scenes directly at v6 size and use that strip.
- Column text at 0.74 scale gets small (24-30 px source sizes): author column cards for their real size.
- Item starts catch panels mid-slide (0.35 s); the outgoing band panel and an incoming IG DM card overlap
  ~0.2 s at question starts; ticks touch the last letter of SECURITY / POWER; a cable runs under the
  plug-scene speech bubble. Check these on the stills sheet.
- At 93 s the desk + paper palette gets repetitive: vary the document type per act (photo, map, form,
  diorama, terminal, ledger) and keep acts short.

## Done when

The four approval stops are recorded; tsc is clean; the stills sheet shows no collisions with his head
box or the IG UI; the master passes every technical receipt; the four QA states are reported
separately with evidence paths; and nothing has been uploaded, scheduled or shared without his explicit
approval.
