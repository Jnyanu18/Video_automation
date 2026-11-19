"""CLI:  python -m evals score VIDEO PLAN.json [--transcript T.json] [--style S.json]
        python -m evals golden FOLDER [--style S.json] [--strict]
Run from the repo root."""
import argparse
import json
import sys

from .checks import evaluate, render_scorecard
from .golden import run_golden


def main(argv=None):
    ap = argparse.ArgumentParser(prog="evals")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("score")
    s.add_argument("video"); s.add_argument("plan")
    s.add_argument("--transcript"); s.add_argument("--style"); s.add_argument("--json", action="store_true")
    g = sub.add_parser("golden")
    g.add_argument("folder"); g.add_argument("--style"); g.add_argument("--strict", action="store_true")
    a = ap.parse_args(argv)
    style = json.load(open(a.style)) if a.style else None
    if a.cmd == "score":
        rep = evaluate(a.video, json.load(open(a.plan)), json.load(open(a.transcript)) if a.transcript else None, style)
        print(json.dumps(rep, indent=2) if a.json else render_scorecard(rep))
        return 1 if rep["overall"] == "FAIL" else 0
    summ = run_golden(a.folder, style=style)
    return 1 if a.strict and summ["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
