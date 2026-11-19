# Paper Lab train set: Remotion template (v6 staging)

Working code of the second Paper Lab film: the CS-degree news Q&A Reel ("If AI writes all the code, do you still need to
learn CS?", October 2026, final pass **v8**, 43.1 s). It's the newer layout of the same Paper Lab look: he is a big
still cut-out bottom-left for the whole film, the paper world fills the top band and the right column, and his
questions appear as anonymous IG DM cards. Copy this folder to `<project>/film/`; never edit it in place.

It typechecks as shipped (`npx tsc --noEmit -p .`, tested against Remotion 4.0.535 + React 19 + @remotion/google-fonts).
`src/words.json` / `edl.json` are that film's spine timings (no audio or footage), kept so the example world resolves its
cues; replace them with the new film's spine.

Compared with `../template/` (the first film, intelligence compression), use this one when:
- the Reel is a **Q&A / news take** in the "Microsoft engineer answers your IG questions" series (v6 staging); or
- you want the **train set** props (track, trains, robot arm, departures board, ticket, diploma, blueprint) or the
  **Dadaji** paper-cut character.
`../template/` stays the reference for the full-frame / SIDE / OUT state machine, polaroid hand-offs and the cube.

## Not included (generate per project)
- `node_modules/`, `out/`.
- `public/`: `vo.wav`, `proxy-1440.mp4`, `matte/m0-1440.webm` (VP9 alpha; remux it cleanly, see pitfalls),
  `idle-1440.mp4` + `matte/idle-m1440.webm` (only if voice-clone lines need a "listening" presenter), `bed-paper.wav`
  (`py -3.13 audio/mix.py paper`), and `paper/{board,cork,navy}.jpg` (`py -3.13 src/world/make_textures.py`).
  `IMG.still` (`public/madhav-still.png`) must be a frame of the **current** take if you use it.

## Files
### Reusable kit and shell
| File | What it is |
|---|---|
| `src/world/kit.tsx` | Paper Lab kit (same as `../template/src/paper/kit.tsx`): fonts (Special Elite, Caveat, Fraunces, Anton-style condensed), palette, `Defs` (paper shadows `psh`/`psh2`, grain), `torn`, `Scrap`, `Card`, `Tape`, `Pin`, `Draw`, `Stamp`, `Polaroid`, `CodeSheet`, `BgImage`, motion helpers `twos`, `back`, `pS`, `boil` |
| `src/world/props.tsx` | **train-set props**: `HeroTrain` (red/gold locomotive + carriage), `TrainCut` (`bullet`/`normal`/`hill`/`coal` paper trains), `Track` (sleepers laid piece by piece), `Smoke`, `RobotArm` (two-segment "AI" paper arm with a gripper; pose by hand target), `Student`, `Ticket` ("ADMIT ONE"), `Diploma` (unrolls), `Magnifier`, `Gear`, `Departures` (board flips DEPARTURES -> DESTINATION: ? -> YOUR CHOICE), `QMark`, `Tag`, `checkPath`, `HandText` |
| `src/world/dadaji.tsx` | **Dadaji**, the original paper-cut grandfather (v4, archived from the film): jaw/moustache lip-flap on twos from `vo_env` only while a `spk: "ch"` word plays. Not used by the v8 world |
| `src/world/front.tsx` | HTML front layer: persistent series tag "MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS" and the anonymous IG DM question cards (`"?"` avatar, "Anonymous", paper-plane "IG question", purple-blue bubble, the exact question) |
| `src/world/caption.tsx` | `PaperCaption`: captions as paper strips in the right column (x 692-950 from y 1300, 54 -> 42 px, up to 3 lines; a too-wide word shifts the block left) |
| `src/world/dressing.tsx` | desk dressing (pencil, clip, coffee ring) at board edges |
| `src/presenter.tsx` | v6 presenter: `SIDE_S 0.88`, x -80, y 234, mirrored, right-edge feather; `SIDE_FACE = {x 10, y 840, w 610, h 550}` (re-measure per take) |
| `src/Film.tsx`, `src/lib.ts`, `src/captions.ts`, `src/kit/*` | shell (same as the canvas Remotion template): `cue()`, `EDL`, caption chunking, camera, finish |
| `audio/*`, `render_ig.sh`, `qa.sh`, `snap.sh`, `sheet.py`, `dump-*.mts`, `run-dump.mjs` | bed (`mix.py paper`, `SFX_LIB` env var), Instagram-max render, QA receipts, stills. Set `PY` to the real Python 3.13 |

### The example world (rewrite per film)
| File | Contents |
|---|---|
| `src/beats.ts` | 13 beats, all SIDE + a silent END: q1, still, hill, engine, himal, customer, q2, track, want, cs, answer, comment, end |
| `src/world/T.ts` | every cue (`cue("phrase", nth?)`); repeated phrases need `nth` |
| `src/world/v6.tsx` | `V6Back`: the scenes. v5 coordinates mapped into v6 zones by `<Top>` (top band -> x 40-940, y 316-693, scale 0.918) and `<Col>` (right column -> x 689-948, y 790-1172, scale 0.72). `win(t, a, b)` = pop in on twos, lift + fade out |
| `src/world/world.tsx` | `World` = V6Back + V6Front + PaperCaption, white sticker edge + warm shadow on the cut-out |
| `src/world/events.ts`, `emph.ts` | 17 sound events (~24/min); caption emphasis words |

`archive/` holds two earlier worlds as `.txt` (outside the build, for reference only):
- `v4-dadaji-world.tsx.txt`: "Dadaji asks, Madhav answers" (Dadaji big in the right column while he speaks, a torn-card corner portrait while Madhav answers, exact-word speech bubbles, the IG comment card with a mini Dadaji avatar).
- `v7-world-with-four-trains.tsx.txt`: the v6/v7 world before the v8 cut (build beat with HILL / BULLET / STEAM / ELECTRIC cards, the four-train sequence, YOU CHOOSE). It's there to show what was cut.

## New film
1. Copy; `npm install`; textures; media into `public/`; the new spine into `src/edl.json`, `words.json`, `vo_env.json`, `mattes.json`.
2. Re-measure `SIDE_FACE` on 4-5 stills. Rewrite `beats.ts`, `T.ts` and the DM card questions in `front.tsx`.
3. Replace the `V6Back` scenes beat by beat (keep the `Top`/`Col` zone mappers and `win`); `events.ts` as you go.
4. Stills (`COMP=Film ./snap.sh out/dev 0 ...`), then `audio/mix.py paper`, `render_ig.sh Film <name> public/bed-paper.wav`, `qa.sh`.
