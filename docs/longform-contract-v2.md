# The contract between Agent A (Phase 2) and Agent B (Phase 3)

Two agents build in parallel on top of `packages/footage` (Phase 1, already built and verified
— see `docs/longform-phase1-verification.md`). This file is the only thing that keeps them from
colliding or inventing incompatible interfaces. **Neither agent may change anything in this
file.** If something here is wrong or impossible, stop and say so rather than working around it.

---

## 1. File ownership — exclusive, no exceptions

A file has exactly one owner. Editing a file you do not own is the one unrecoverable mistake
here, because both agents' work is merged by a third party afterwards.

**Agent A owns** (Phase 2 — understanding the footage):
```
packages/footage/footage/schema.py        (append-only, see section 3)
packages/footage/footage/index.py
packages/footage/footage/proxy.py
packages/footage/footage/metrics.py
packages/footage/footage/triage.py
packages/footage/footage/faces.py
packages/footage/footage/speech.py
packages/footage/footage/describe.py      (new)
packages/footage/footage/search.py        (new)
packages/footage/footage/score.py         (new)
packages/footage/footage/cli_describe.py  (new)
packages/footage/tests/test_describe*.py  test_faces*.py  test_search*.py
packages/footage/tests/test_score*.py     test_proxy*.py  test_speech*.py
```

**Agent B owns** (Phase 3 — turning an index into a film):
```
packages/footage/footage/plan_schema.py   (new -- B never touches schema.py)
packages/footage/footage/templates/*.yaml (new)
packages/footage/footage/plan.py          (new)
packages/footage/footage/beats.py         (new)
packages/footage/footage/editplan.py      (new)
packages/footage/footage/render.py        (new)
packages/footage/footage/cli_plan.py      (new)
packages/footage/tests/test_plan*.py      test_beats*.py  test_render*.py
packages/footage/tests/test_templates*.py
automation/editor/studio/longform.py       (plan/render methods only)
automation/editor/api_server.py            (the new plan/render/approve routes only)
automation/editor/studio/tests/test_longform_plan.py
```

**Shared, append-only, one line each** — `footage/cli.py` and `footage/__init__.py`. See
section 4. Nothing else is shared.

Everything not listed is owned by neither: `probe.py`, `shots.py`, `sync.py`, `moments.py`,
`cli.py` bodies, and all Phase 1 tests are **frozen**. If you believe one must change, say so in
your results doc and leave it alone.

---

## 2. The interface B depends on — A delivers these FIRST

Agent B cannot start planning without scoring and search. So **Agent A's first commit, before
any model work, is these two functions with deterministic, model-free implementations:**

```python
# packages/footage/footage/score.py
def highlight_score(moment: Moment, index: FootageIndex,
                    cfg: "ScoreConfig | None" = None) -> float:
    """0.0-1.0. Deterministic. Must work with no API key and no descriptions."""

# packages/footage/footage/search.py
def find_moments(query: str, index: FootageIndex, *, limit: int = 20,
                 min_relevance: float = 0.0) -> list[tuple[Moment, float]]:
    """Ranked (moment, relevance) pairs, highest first. Keyword path only at first:
    match query tokens against moment.description, moment.tags and moment.speech.text.
    Deterministic: equal scores break ties by moment_id, never by dict order."""
```

A then improves what is *inside* them. **The signatures are frozen from that first commit.**
B writes against them from the start and never stubs or copies them.

Agent A: commit these within your first working hour and say so, so B is unblocked.

---

## 3. Schema changes

The Phase 1 models are in `packages/footage/footage/schema.py`: `MediaFile`, `SyncGroup`,
`Shot`, `MomentAngle`, `MomentSpeech`, `Moment`, `WordTimestamp`, `SpeechSegment`,
`IndexStats`, `RejectReason`, `FootageIndex`.

**Agent A may only append.** Existing field names, types and defaults do not change — a rename
silently breaks every index already written, and `index_version` stays 2. A adds exactly:

```python
# on Moment
energy: int = 0                       # 1-5, 0 = unset
people: List[str] = []                # person_id values, see Person
highlight_score: float = 0.0
novelty: float = 0.0                  # 1.0 = unlike anything else kept
describe_source: str = "local"        # "local" | "model"

# new model
class Person(BaseModel):
    person_id: str
    name: Optional[str] = None        # set by a human, never guessed
    moment_ids: List[str] = []
    thumb_path: Optional[str] = None
    cluster_size: int = 0

# on FootageIndex
people: List[Person] = []
```

Every added field needs a default, so an index written by Phase 1 still loads unchanged.

**Agent B adds no fields to `schema.py`.** All plan-side models go in the new
`footage/plan_schema.py`, importing from `schema.py` read-only.

---

## 4. The two shared files

`footage/cli.py` — each agent adds **one import and one call**, nothing else:

```python
from footage import cli_describe          # A
from footage import cli_plan              # B
...
cli_describe.register(subparsers)         # A
cli_plan.register(subparsers)             # B
```

Each agent's own `cli_<name>.py` exposes `def register(subparsers) -> None`. A git conflict here
is then two adjacent lines, trivially resolved.

`footage/__init__.py` — append your exports to `__all__`; do not reorder or remove.

---

## 5. Rules that bind both agents

- **Everything works with no API key.** Every model call is optional, cached, and has a
  deterministic fallback that produces valid output. The tester runs every command with no key
  set and expects success, not a crash and not an empty result.
- **Timebases.** Three exist and mixing them is the most likely way this project fails:
  `t_proxy` (540p proxy seconds), `t_src` (original file seconds), `t_wall` (synced wall-clock,
  after applying `SyncGroup.offsets`). Every function taking a time documents which it is and
  names the variable accordingly. **Rendering cuts from originals, so the final conversion is
  `t_wall -> t_src`.**
- **Determinism.** Same index plus same config gives the same output. No wall-clock seeds, no
  reliance on dict ordering, ties broken by id.
- **Config in one dataclass per module**, with documented defaults. No magic numbers inline.
- **Do not touch:** `apps/motion-api/`, `packages/motion-kit/`, `projects/`,
  `skills/motion-director/`, `.env` or any key, and anything inside `agentic-video-editor/`
  (it is an editable install; moving its files breaks imports elsewhere).
- **Windows:** `J:\ai editor\automation` is a junction, not a symlink — `os.path.islink()` is
  `False` for it. Write files containing Windows paths with Python, never `printf`. In Git Bash,
  `pwd` yields `/j/...` which Windows ffmpeg reads as `C:/j/...` — use `J:/...` when passing
  paths to ffmpeg.
- **Test floors, measured 2026-11-20:** engine suite **433 passed / 1 skipped**, Node **224
  passed**, `packages/footage` **34 passed**. These are floors, not targets — another session
  adds tests. Your work must not reduce them.
- **Branches:** A works on `longform/phase-2`, B on `longform/phase-3`, both branched from
  `longform/phase-1`. Commit as you go. **Neither agent merges anything.**
- **Report honestly.** If you cannot hit a gate, write the number you did hit and why. Do not
  loosen a gate, do not estimate a measurement, and do not call a phase passing when it is not.
  The tester reruns every command.
