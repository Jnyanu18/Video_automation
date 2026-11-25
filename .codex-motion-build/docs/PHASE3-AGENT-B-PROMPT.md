# Paste this to Agent B

Open the workspace `J:\ai editor`. You are **Agent B**. Another agent is working in parallel on
Phase 2 in the same repository.

Read these three files in full before writing any code:
1. `docs/longform-contract-v2.md` — file ownership, the frozen interface you code against,
   schema rules. Binding.
2. `docs/longform-phase1-verification.md` — what the index really contains, and which parts are
   proven versus merely present.
3. `docs/ANTIGRAVITY-BUILD-LONGFORM-EDITOR.md` section 5 — the original Phase 3 brief.

Then read what you build on: `packages/footage/footage/schema.py` (read-only for you),
`index.py`, `moments.py`, and `agentic-video-editor/src/agents/reviewer.py` for the
review-and-retry gate you are extending.

**You own turning an index into a film.** You do not touch `schema.py`, `describe.py`,
`search.py`, `score.py`, `faces.py`, `proxy.py`, `triage.py` or `speech.py` — Agent A owns
those. Editing a file you do not own is the one unrecoverable mistake here.

---

## What you depend on, and what you must not do about it

Agent A delivers, in their first hour:

```python
from footage.score  import highlight_score   # (moment, index, cfg=None) -> float 0..1
from footage.search import find_moments      # (query, index, *, limit, min_relevance)
                                             #   -> list[(Moment, score)], best first
```

Those signatures are frozen. **Import and use them. Do not stub them, do not copy them, do not
write your own ranking.** If they are not committed yet, build the template loader and the
timebase conversion first — neither needs them.

Also note two things about the index as it stands today, from the verification run:
- **`speech` is currently empty** and the speech path is unproven. Agent A is fixing that. Your
  `prefer: speech_whole` logic depends on it, so write it against the schema and test it with
  hand-written `SpeechSegment` fixtures rather than waiting.
- `keep_ratio` has not been validated on long-take footage. Do not tune anything to it.

---

## Task 1 — rundown templates, the commercial core

`packages/footage/footage/templates/*.yaml`, one per vertical: `wedding-highlight`,
`wedding-full`, `school-annual-day`, `corporate-event`, `birthday`. An ordered list of beats:

```yaml
name: wedding-highlight
target_duration: 210
beats:
  - id: arrival
    must_have: [exterior, guests]
    duration: [10, 20]
    search: ["arrival", "entrance", "guests arriving"]
  - id: vows
    must_have: [speech, two_people]
    duration: [25, 45]
    search: ["vows", "ceremony", "ring"]
    prefer: speech_whole      # never cut mid-sentence
```

**A template is data, not code. Adding a new event type must require no code change** — the
tester will prove this by adding `birthday` from YAML alone.

## Task 2 — the planner

`plan.py` fills a rundown from an index: per beat, search candidates via `find_moments`, rank
with `highlight_score`, pick the best non-duplicate, respect the duration budget.

**Missing beats are a first-class output, not a silent gap.** "No usable arrival footage found"
must reach the client. A wedding film that quietly omits the vows is worse than one that says it
could not find them.

The model's job here is selection and ordering *within* the template's constraints, never
free-form authorship. Deterministic fallback: highest `highlight_score` per beat, so planning
works with no API key at all.

Honour `must_include` and `never_include` moment lists absolutely. When a client says "my
grandmother must be in it", that is a constraint, not a hint.

## Task 3 — cut to music, not to a transcript

`beats.py`. Accept a **user-supplied** music track only — do not generate or fetch music.
Detect the beat grid, snap cut points to beats, and ramp cut density with the energy curve: slow
open, dense montage, slow close. Moments marked `speech_whole` stay **off** the beat grid — never
chop a vow or a speech to fit a beat.

## Task 4 — EditPlan v2 and the conform render

`plan_schema.py` (new file — not `schema.py`) and `editplan.py`. Extend AVE's `EditPlan` idea
with what long-form needs: `media_id` and `camera_id` per entry, source in/out **in original-file
timebase**, the angle chosen, transition, speed, music bed with gain automation, chapter markers,
and a title/lower-third slot.

**The timebase conversion is the highest-risk code in this phase.** Analysis ran on 540p proxies
and in synced wall-clock time; the render cuts from the originals. `t_wall -> t_src` must apply
`SyncGroup.offsets` correctly, per camera. An off-by-one here ruins every cut while the code
reads perfectly. Test it hard, with a fixture where the two cameras have different offsets.

`render.py` conforms from the **originals** with ffmpeg: cut, crossfade, duck music under
speech, master to −14 LUFS and under −1.5 dBTP, write chapter metadata. Produce all three
deliverables from one plan: teaser, highlight, full film.

Reuse the reviewer gate from `agentic-video-editor/src/agents/reviewer.py`, extended with hard
mechanical checks that need no model: no shot under 0.4s, no two adjacent shots from the same
angle of the same moment, no repeated moment, audio continuity across cuts, total duration
inside the template budget.

## Task 5 — the engine routes and the approval gate

Nobody ships a wedding film unreviewed. Follow the existing conventions exactly — `202` to
start, `GET .../{jid}` to poll, as in the `longform/index` routes already in `api_server.py`:

```
POST /api/editor/longform/{project_id}/plan              -> 202, then the plan
GET  /api/editor/longform/{project_id}/plan/{plan_id}     -> plan + missing-beat report
POST /api/editor/longform/{project_id}/plan/{plan_id}/approve
POST /api/editor/longform/{project_id}/render             -> 202; 409 NOT_APPROVED when unapproved
GET  /api/editor/longform/{project_id}/render/{jid}       -> progress, then outputs + scorecard
```

Degrade gracefully when `packages/footage` is absent, exactly as `is_footage_available()` does
today — never a 500 at import time.

---

## When you are done

`pytest` in `packages/footage` green with **at least 60 tests** total, covering: template
loading, beat filling, missing-beat reporting, duplicate-angle rejection, **proxy→original
timebase conversion**, `must_include` enforcement, beat snapping, speech-whole protection, and
the no-model fallback. Engine suite still at least 433 passed / 1 skipped; Node still 224.

Then prove it end to end and record the numbers:
- `python -m footage plan idx.json --template wedding-highlight --duration 180 --json` — duration
  within ±5% of target, zero duplicate moments, explicit missing-beat list
- `python -m footage render plan.json --deliverable highlight --json` — a real MP4 cut from the
  originals, with measured `lufs` −14 ±1 and `peak` under −1.5 dBTP in the JSON
- `409 NOT_APPROVED` for an unapproved render, proven by a test

Write `docs/longform-phase3-results.md` using the reporting format in section 7 of the build
spec. Work on branch `longform/phase-3`. Commit as you go. **Do not merge.**

The tester will watch the output video. It must not contain a repeated moment, a sub-0.4s flash,
a cut mid-word in a vow or speech, or an out-of-focus shot that triage should have rejected.
