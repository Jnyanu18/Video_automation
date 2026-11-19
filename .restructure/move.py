"""Reversible moves for the restructure. Every move is logged; nothing is ever copied.

Lessons baked in from the 2026-11-18 cleanup incident:
  * second-resolution stamps, and a log file is never reused or overwritten
  * os.rename (same volume) is atomic and instant, and preserves junctions as junctions
    -- shutil.move would walk a junction and duplicate the whole engine
  * refuses to overwrite an existing destination, always
  * dry run is the default; --go is required to touch the disk

    python .restructure/move.py plan.csv          # dry run (plan.csv: src,dst relative to root)
    python .restructure/move.py plan.csv --go
    python .restructure/move.py --undo .restructure/moves-<stamp>.csv --go
"""
import argparse
import csv
import os
import sys
import time

ROOT = r"J:\ai editor"
LOGDIR = os.path.join(ROOT, ".restructure")


def resolve(p):
    return p if os.path.isabs(p) else os.path.join(ROOT, p)


def do_moves(pairs, go, tag):
    """Each move is appended to the log and flushed BEFORE the next one starts.

    Writing the log only at the end loses every completed move if one later move
    raises (hit for real on 2026-11-19: reel-studio-stack moved, then a
    PermissionError killed the run and left no record of it).
    """
    done, skipped = [], []
    fh = w = log = None
    if go:
        os.makedirs(LOGDIR, exist_ok=True)
        log = os.path.join(LOGDIR, f"moves-{tag}-{time.strftime('%Y%m%d-%H%M%S')}.csv")
        if os.path.exists(log):
            sys.exit(f"refusing to overwrite an existing log: {log}")
        fh = open(log, "w", newline="", encoding="utf-8")
        w = csv.writer(fh)
        w.writerow(["src", "dst"])
        fh.flush()
    try:
        for src, dst in pairs:
            s, d = resolve(src), resolve(dst)
            if not os.path.exists(s):
                skipped.append((src, dst, "source missing"))
                continue
            if os.path.exists(d):
                skipped.append((src, dst, "destination exists"))
                continue
            if go:
                os.makedirs(os.path.dirname(d), exist_ok=True)
                os.rename(s, d)
                w.writerow([src, dst])
                fh.flush()
                os.fsync(fh.fileno())
            done.append((src, dst))
    finally:
        if fh:
            fh.close()
            print(f"log        : {log}")

    print(f"{'MOVED' if go else 'WOULD MOVE'}: {len(done)}")
    for s, d in done[:40]:
        print(f"  {s}  ->  {d}")
    if skipped:
        print(f"skipped    : {len(skipped)}")
        for s, d, why in skipped[:20]:
            print(f"  {s}: {why}")
    if not go:
        print("\nDry run. Add --go.")


ap = argparse.ArgumentParser()
ap.add_argument("plan", nargs="?", help="CSV with src,dst columns")
ap.add_argument("--undo", help="a moves-*.csv to reverse")
ap.add_argument("--tag", default="move")
ap.add_argument("--go", action="store_true")
a = ap.parse_args()

if a.undo:
    rows = list(csv.DictReader(open(a.undo, encoding="utf-8")))
    do_moves([(r["dst"], r["src"]) for r in reversed(rows)], a.go, "undo")
elif a.plan:
    rows = list(csv.DictReader(open(resolve(a.plan), encoding="utf-8")))
    do_moves([(r["src"], r["dst"]) for r in rows], a.go, a.tag)
else:
    ap.error("give a plan CSV or --undo")
