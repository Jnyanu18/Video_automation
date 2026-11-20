"""CLI subcommands for planning, human approval, and conform rendering.

Agent B owns this file.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import List, Optional

from footage.editplan import approve_plan, list_templates, load_template, read_edit_plan, write_edit_plan
from footage.index import read_index
from footage.plan import plan_rundown
from footage.render import PlanNotApprovedError, conform_render

logger = logging.getLogger("footage.cli_plan")


def cmd_plan(args: argparse.Namespace) -> int:
    """Execute film planning subcommand."""
    idx_path = Path(args.index_file).resolve()
    if not idx_path.is_file():
        print(f"Error: index file not found: {idx_path}", file=sys.stderr)
        return 1

    try:
        index = read_index(idx_path)
    except Exception as e:
        print(f"Error loading index: {e}", file=sys.stderr)
        return 1

    must_inc = [m.strip() for m in args.must_include.split(",")] if args.must_include else []
    never_inc = [m.strip() for m in args.never_include.split(",")] if args.never_include else []

    try:
        plan = plan_rundown(
            index=index,
            template=args.template,
            target_duration=args.duration,
            must_include=must_inc,
            never_include=never_inc,
            music_path=args.music,
            snap_beats=not args.no_snap_beats,
        )
    except Exception as e:
        logger.exception("Planning failed: %s", e)
        print(f"Error planning rundown: {e}", file=sys.stderr)
        return 1

    out_path = Path(args.out).resolve() if args.out else Path(f"{index.project_id}_{args.template}_plan.json").resolve()
    write_edit_plan(plan, out_path)

    if args.json:
        # Strictly valid JSON on stdout
        sys.stdout.write(plan.model_dump_json(indent=2))
        sys.stdout.flush()
    else:
        print(f"\n=== EditPlan v2 Generated ===", file=sys.stderr)
        print(f"Plan ID:         {plan.plan_id}", file=sys.stderr)
        print(f"Template:        {plan.template_name}", file=sys.stderr)
        print(f"Target Duration: {plan.target_duration:.1f}s", file=sys.stderr)
        print(f"Total Duration:  {plan.total_duration:.1f}s", file=sys.stderr)
        print(f"Entries:         {len(plan.entries)} shots", file=sys.stderr)
        print(f"Missing Beats:   {len(plan.missing_beats)}", file=sys.stderr)
        for mb in plan.missing_beats:
            print(f"  - [MISSING] {mb.beat_id}: {mb.reason}", file=sys.stderr)
        print(f"Approved:        {plan.approved}", file=sys.stderr)
        print(f"Written to:      {out_path}", file=sys.stderr)

    return 0


def cmd_render(args: argparse.Namespace) -> int:
    """Execute conform render subcommand."""
    plan_path = Path(args.plan_file).resolve()
    if not plan_path.is_file():
        print(f"Error: plan file not found: {plan_path}", file=sys.stderr)
        return 1

    try:
        plan = read_edit_plan(plan_path)
    except Exception as e:
        print(f"Error reading plan: {e}", file=sys.stderr)
        return 1

    index = None
    if args.index:
        idx_p = Path(args.index).resolve()
        if idx_p.is_file():
            index = read_index(idx_p)

    out_path = Path(args.out).resolve() if args.out else Path(f"{plan.project_id}_{args.deliverable}.mp4").resolve()

    try:
        res = conform_render(
            plan=plan,
            out_path=out_path,
            deliverable=args.deliverable,
            index=index,
            allow_unapproved=bool(getattr(args, "allow_unapproved", False)),
        )
    except PlanNotApprovedError as e:
        if args.json:
            sys.stdout.write(json.dumps({
                "error": "NOT_APPROVED",
                "status_code": 409,
                "detail": str(e),
            }, indent=2))
            sys.stdout.flush()
        else:
            print(f"409 NOT_APPROVED: {e}", file=sys.stderr)
        return 2
    except Exception as e:
        logger.exception("Conform render failed: %s", e)
        print(f"Render failed: {e}", file=sys.stderr)
        return 1

    if args.json:
        sys.stdout.write(json.dumps(res, indent=2))
        sys.stdout.flush()
    else:
        print(f"\n=== Conform Render Complete ===", file=sys.stderr)
        print(f"Deliverable: {res['deliverable']}", file=sys.stderr)
        print(f"Output:      {res['output_path']}", file=sys.stderr)
        print(f"Duration:    {res['duration']:.2f}s", file=sys.stderr)
        print(f"LUFS:        {res['lufs']:.2f} (target -14 ±1)", file=sys.stderr)
        print(f"True Peak:   {res['peak']:.2f} dBTP (target < -1.5)", file=sys.stderr)
        print(f"Chapters:    {res['chapters_count']}", file=sys.stderr)

    return 0


def cmd_approve(args: argparse.Namespace) -> int:
    """Approve an EditPlan."""
    plan_path = Path(args.plan_file).resolve()
    if not plan_path.is_file():
        print(f"Error: plan file not found: {plan_path}", file=sys.stderr)
        return 1

    plan = read_edit_plan(plan_path)
    approve_plan(plan)

    out_path = Path(args.out).resolve() if args.out else plan_path
    write_edit_plan(plan, out_path)

    if args.json:
        sys.stdout.write(plan.model_dump_json(indent=2))
        sys.stdout.flush()
    else:
        print(f"Plan '{plan.plan_id}' approved. Written to {out_path}", file=sys.stderr)
    return 0


def cmd_templates(args: argparse.Namespace) -> int:
    """List available rundown templates."""
    names = list_templates()
    if args.json:
        sys.stdout.write(json.dumps({"templates": names}, indent=2))
        sys.stdout.flush()
    else:
        print("Available rundown templates:", file=sys.stderr)
        for n in names:
            print(f"  - {n}", file=sys.stderr)
    return 0


def register(subparsers: argparse._SubParsersAction) -> None:
    """Register Phase 3 subcommands with the main footage CLI."""
    # plan
    p_plan = subparsers.add_parser("plan", help="Plan an event film edit from an index")
    p_plan.set_defaults(func=cmd_plan)
    p_plan.add_argument("index_file", help="Path to FootageIndex JSON")
    p_plan.add_argument("--template", "-t", required=True, help="Rundown template name or YAML path")
    p_plan.add_argument("--duration", "-d", type=float, help="Target duration in seconds")
    p_plan.add_argument("--music", "-m", help="Path to user-supplied music track")
    p_plan.add_argument("--out", "-o", help="Output path for EditPlan JSON")
    p_plan.add_argument("--must-include", help="Comma-separated moment IDs that must be included")
    p_plan.add_argument("--never-include", help="Comma-separated moment IDs to omit")
    p_plan.add_argument("--no-snap-beats", action="store_true", help="Disable music beat snapping")
    p_plan.add_argument("--json", action="store_true", help="Output only valid JSON to stdout")

    # render
    p_rnd = subparsers.add_parser("render", help="Conform render an MP4 deliverable from EditPlan")
    p_rnd.set_defaults(func=cmd_render)
    p_rnd.add_argument("plan_file", help="Path to EditPlan JSON")
    p_rnd.add_argument("--deliverable", choices=["highlight", "teaser", "full"], default="highlight", help="Deliverable to cut")
    p_rnd.add_argument("--out", "-o", help="Output MP4 path")
    p_rnd.add_argument("--index", "-i", help="Path to index JSON (to locate original media files)")
    p_rnd.add_argument("--allow-unapproved", "--force", action="store_true", help="Allow rendering without human approval")
    p_rnd.add_argument("--json", action="store_true", help="Output only valid JSON to stdout")

    # approve
    p_app = subparsers.add_parser("approve", help="Approve an EditPlan for conform rendering")
    p_app.set_defaults(func=cmd_approve)
    p_app.add_argument("plan_file", help="Path to EditPlan JSON")
    p_app.add_argument("--out", "-o", help="Output path (defaults to overwriting plan_file)")
    p_app.add_argument("--json", action="store_true", help="Output approved plan JSON")

    # templates
    p_tmpl = subparsers.add_parser("templates", help="List available event rundown templates")
    p_tmpl.set_defaults(func=cmd_templates)
    p_tmpl.add_argument("--json", action="store_true", help="Output templates list as JSON")
