# TASK: Clean the AI-editor workspace down to the software, safely

You are a careful build engineer doing a disk cleanup on someone else's working project folder.
The goal: keep the **tools and source code**, clear out **regenerable build artefacts, rendered
videos, duplicated trees and collected reference footage**.

The tooling is already written and tested. **You are driving it, not designing it.** Your value
here is accuracy and honesty, not cleverness.

---

## THE SINGLE MOST IMPORTANT RULE

**You must never delete anything. Not once, not for any reason.**

- Never run `Remove-Item`, `del`, `rmdir`, `rm`, `rd`, `Clear-RecycleBin`, or `git clean`.
- Never empty, prune or "tidy" the quarantine folder.
- The only program allowed to touch files is `cleanup\apply.py`, which **moves** them to a
  quarantine folder and writes an undo log.

Deleting is the owner's decision, taken by hand, after they have looked. If you think something
should be deleted, **say so in your report** and leave it alone. A cleanup that frees less space
than hoped is a success. A cleanup that loses one irreplaceable file is a disaster.

---

## ENVIRONMENT

| Thing | Value |
|---|---|
| OS / shell | Windows 11, PowerShell |
| Project root | `J:\ai editor` |
| Cleanup tooling (already exists, tested) | `J:\ai editor\cleanup\scan.py`, `J:\ai editor\cleanup\apply.py` |
| Quarantine destination | `J:\_cleanup_quarantine\<timestamp>\` — same drive, so moves are instant |
| Python | on PATH |

Paths contain spaces. **Quote every path.** Run Python as `python -I` so nothing is imported
from the current directory.

---

## WHAT THE SCAN ALREADY FOUND

A scan has been run. The headline, for scale:

| Category | Size | What it is | Default |
|---|---|---|---|
| `BUILD` | **8.06 GB** | `node_modules`, `.bundle`, `__pycache__`, `dist`, `.cache` | MOVE |
| `RENDER` | 0.83 GB | videos in `out/`, `work/`, `.data/`, `stills/` — re-render from code | MOVE |
| `REFERENCE` | 0.10 GB | video in folders named `reference`/`refs`/`inspiration` | MOVE |
| `LINK` | — | junctions such as `automation` — aliases, never moved | KEEP |
| `VENDOR` | 0.54 GB | test fixtures inside cloned third-party repos (`opencv__opencv` etc.) | REVIEW |
| `DELIVERABLE` | 0.16 GB | 10 named films (CALMIND, AILO, Ramayana…) in output folders | REVIEW |
| `UNSORTED` | 0.14 GB | media matching no rule | REVIEW |
| `SOURCE` | 0.80 GB | `raw footage/`, `uploads/`, `clients/`, `assets/` | **KEEP — never moved** |

**The videos were never the problem.** Build artefacts are 8.06 GB of the ~9 GB. Keep that in
proportion: you are mostly moving `node_modules`, which `npm install` rebuilds.

### Read this before you touch anything

`J:\ai editor\automation` is a **directory junction** pointing at
`new project - marketing automatio\new project - marketing automatio\automation`. The two paths
are the *same bytes*, not a copy.

An earlier version of this tooling did not know that. It walked through the junction, counted
everything twice, concluded the nested tree was a "duplicate", and moved 1,624 files of live
FastAPI engine source into quarantine. Nothing was lost — the quarantine and a relative-path
restore brought it all back — but the engine was non-functional until it did.

The scanner now detects reparse points and refuses to descend into them, and the duplicate rule
is gone for good. **Never re-add a rule that infers "duplicate" from how a path looks.** If a
`DUPLICATE` category ever appears in your manifest, stop and report it: you are running old code.

---

## STEP 1 — Re-scan (read-only, safe)

```powershell
cd "J:\ai editor"
python -I cleanup\scan.py
```

This writes `cleanup\manifest.csv` and `cleanup\summary.txt` and **changes nothing**. Paste the
summary table it prints.

If your totals differ a lot from the table above, say so — the folder may have changed.

---

## STEP 2 — Dry run, with the live project protected

The owner is **actively working on `motion-director`**. Moving its `node_modules` would stop it
rendering until a reinstall, so it is excluded.

```powershell
python -I cleanup\apply.py --exclude-path motion-director
```

This is a dry run; it moves nothing. Expected: about **7.21 GB** selected, with roughly 1.78 GB
protected by the exclusion. Paste the output.

---

## STEP 3 — STOP. Get approval.

**Do not proceed to Step 4 on your own initiative.**

Present to the owner, in your own words and in a short list:

1. The totals from Step 2.
2. The 10 `DELIVERABLE` films, by name and size, from `cleanup\manifest.csv`. Ask plainly:
   *keep these finished cuts, or quarantine them too?* These are finished client-facing work.
3. The note that `VENDOR` (0.54 GB) is test data inside cloned repos — quarantining it may break
   those repos' own test suites, and re-cloning restores it.
4. That the space is **not** freed until they delete the quarantine folder themselves.

Then wait for an answer. If you are running unattended and cannot ask, **stop at Step 3** and
report that you stopped there deliberately. That is the correct outcome, not a failure.

---

## STEP 4 — Move, in stages (only after approval)

Do these one at a time, pasting the output of each. Staging means a surprise costs one category,
not all of them.

```powershell
# 4a - the big safe win: regenerable build output
python -I cleanup\apply.py --go --only BUILD --exclude-path motion-director

# 4b - rendered intermediates
python -I cleanup\apply.py --go --only RENDER --exclude-path motion-director

# 4c - collected reference footage
python -I cleanup\apply.py --go --only REFERENCE
```

**Let each one finish and print its undo-log path before starting the next.** Runs are stamped to
the second and refuse to reuse an existing quarantine folder, so a collision stops the run rather
than silently overwriting an undo log — which is how a previous incident orphaned its files.

If anything goes wrong at any point, the whole quarantine can be put back with:

```powershell
python -I cleanup\restore.py          # dry run
python -I cleanup\restore.py --go     # restore everything
```

That works by relative path and does not depend on the undo logs.

Each run prints an **undo log path**. **Record every one of them in your report.** They are the
only way back.

Do **not** pass `--include-review` unless the owner explicitly approved that category in Step 3.

---

## STEP 5 — Prove you broke nothing

### 5a. The live project still builds

`motion-director` was excluded, so its toolchain must be intact:

```powershell
cd "J:\ai editor\motion-director\kit"
npx tsc --noEmit
echo "exit=$LASTEXITCODE"
```
**Pass:** `exit=0`. If this fails, something was moved that should not have been — **restore
immediately** with the undo log and report it.

### 5b. Source material is untouched

```powershell
cd "J:\ai editor"
Get-ChildItem "raw footage" -Recurse -File | Measure-Object -Property Length -Sum | Select-Object Count, Sum
Get-ChildItem "clients" -Recurse -File | Measure-Object -Property Length -Sum | Select-Object Count, Sum
```
**Pass:** both still contain files. These are irreplaceable; the scanner classifies them KEEP and
`apply.py` never selects them. Confirm that held.

### 5c. No source code left the project

```powershell
Get-ChildItem "J:\_cleanup_quarantine" -Recurse -File -Include *.py,*.tsx,*.ts,*.md |
  Where-Object { $_.FullName -notmatch "node_modules|__pycache__|dist|\.bundle" } |
  Select-Object -First 40 FullName
```
**Expected:** nothing at all, apart from files inside `node_modules`/`__pycache__` (which the
filter already excludes). **Any `.py`, `.ts` or `.tsx` from a project's own source tree appearing
here means something is badly wrong — stop immediately and run `cleanup\restore.py --go`.**

Pay particular attention to anything under `automation\` or
`new project - marketing automatio\`: that is the live engine, and it is the exact thing a
previous run swept up by mistake.

### 5d. Report the space

```powershell
"{0:N2} GB in quarantine" -f ((Get-ChildItem "J:\_cleanup_quarantine" -Recurse -File |
  Measure-Object -Property Length -Sum).Sum / 1GB)
```

---

## STEP 6 — Report

```
| Step | Action                          | Result | Evidence |
|------|---------------------------------|--------|----------|
| 1    | Scan                            |        | GB by category |
| 2    | Dry run                         |        | GB selected / protected |
| 3    | Approval obtained?              |        | from whom, or "stopped, unattended" |
| 4a   | BUILD moved                     |        | GB, undo log path |
| 4b   | RENDER moved                    |        | GB, undo log path |
| 4c   | REFERENCE moved                 |        | GB, undo log path |
| 5a   | motion-director tsc             |        | exit= |
| 5b   | raw footage + clients intact    |        | file counts |
| 5c   | no stray source in quarantine   |        |          |
| 5d   | total quarantined               |        | GB |
```

Then, in plain prose:

- **Every undo-log path**, listed together in one place.
- **Anything you skipped or could not move**, and the error.
- **Anything that looked wrong but was out of scope** — note it, do not act on it.
- The closing line must state, in your own words: nothing has been deleted, the space is freed
  only when the owner deletes `J:\_cleanup_quarantine` themselves, and after a `BUILD` sweep any
  project they return to needs `npm install` before it will build again.

Do not claim the project is "clean" or "optimised". You moved files into a holding pen and showed
that the live toolchain still compiles. That is the whole claim.
