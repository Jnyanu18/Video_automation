# Paste this into Antigravity as the first message

Open the workspace `J:\ai editor`.

Read `docs/ANTIGRAVITY-BUILD-LONGFORM-EDITOR.md` in full before you write any code. It is a build
spec with three phases and a hard acceptance gate at the end of each phase. Follow it exactly.

Your task: build **Phase 1** only — `packages/footage/`, the proxy pass, the triage ladder, the
multi-camera sync, the FootageIndex v2 writer, the CLI, and the `/api/editor/longform/index` routes in
`automation/editor/api_server.py`.

Before you start, read the seven files listed in section 2 of the spec. In particular understand
`agentic-video-editor/src/tools/analyze.py` and why sending whole clips to a video model cannot scale
to eight hours of footage — replacing that approach is the point of Phase 1.

Phase 1 uses **zero AI model calls**. If you find yourself adding one, you have misread the spec.

Constraints that will fail your work if you break them, so check them first:
- Do not modify `apps/motion-api/`, `packages/motion-kit/`, `projects/`, or `skills/motion-director/`.
- Do not modify or move anything inside `agentic-video-editor/` — read it, reuse it by importing or
  copying, but it is installed as an editable package and moving its files breaks other code.
- Do not touch `.env` or any API key.
- `J:\ai editor\automation` is a Windows junction, not a symlink. Any directory walker must handle it.
- The engine's Python suite passed 433 tests with 1 skipped when measured on 2026-11-20 (another session adds tests, so treat that as a floor, not an exact target). It must still pass when you are
  done. Run it from `automation/editor` with `python -m pytest` — it takes about 9 minutes, so run it
  in the background.

Work on a branch named `longform/phase-1`. Commit as you go. Do not merge to master.

When Phase 1 is done, run every command in the Phase 1 gate (section 3.9) against real footage in
`raw footage/cuts`, write the measured numbers into `docs/longform-phase1-results.md` using the
reporting format in section 7, and stop. Another agent tests and deploys; it will rerun those exact
commands. If you cannot hit a gate number, write down the number you actually got and why — do not
loosen the gate and do not estimate.

Then report: what you built, the measured numbers, what you could not do, and any dependency you
added with a one-line justification for each.
