"""Claude-side steps for a `givemotion` job in the agent queue (studio/agent_bridge.py).

The queue hands Claude a brief. Claude writes the composition as <job folder>/video.html (following the givemotion
skill), then runs this module, then finishes the job with the worker's existing `done` command:

    python -m studio.givemotion_job kit    <job_id>     # the job owner's brand kit (palette, fonts, CTAs, logo) as JSON
    python -m studio.givemotion_job check  <job_id>     # givemotion check; must be ok before rendering
    python -m studio.givemotion_job render <job_id>     # check again, then render to <job folder>/givemotion.mp4
    python scripts/agent_worker.py done <job_id> <job folder>/givemotion.mp4 --note "..."

Every path is derived from the job id under the queue folder. Nothing here reads the environment for paths.
Run from the automation/editor folder.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
import re
from typing import Any, Dict

if __package__ in (None, ""):  # allow `python studio/givemotion_job.py ...` as well as `python -m studio.givemotion_job ...`
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from studio import agent_bridge as ab  # noqa: E402
from studio import givemotion  # noqa: E402

COMPOSITION = "video.html"
RENDERED = "givemotion.mp4"


class JobError(ValueError):
    pass


def _job_folder(job_id: str) -> Path:
    if not ab.JOB_ID_RE.match(job_id or ""):
        raise JobError(f"not a job id: {job_id!r}")
    folder = ab.job_dir(job_id)
    if not folder.is_dir():
        raise JobError(f"no job folder for {job_id}")
    return folder


def account_work_dir(owner: str) -> Path:
    """The account's own folder, where the Brand routes keep brand/kit.json. Derived from this code's location."""
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", owner or ""):
        raise JobError("the job has no valid owner")
    from studio.tenancy import users_base  # honours EDITOR_USERS_DIR (/data/users in the container)
    return users_base(ab.EDITOR_ROOT.parent) / owner


def kit_for_job(job_id: str) -> Dict[str, Any]:
    """The brand facts a composition must follow: palette by role, heading font, CTAs, aspect ratios, local logo."""
    job = ab.read_job(job_id)
    if not job or not ab.JOB_ID_RE.match(job_id or ""):
        raise JobError(f"no such job: {job_id!r}")
    owner = job.get("user_id") or ""
    kit = givemotion.load_account_kit(account_work_dir(owner), owner)
    if not kit:
        return {"ok": True, "has_kit": False, "note": "No brand kit for this account. Use the built-in AILO palette and say so in the note."}
    logo = givemotion.logo_file(kit)
    return {
        "ok": True, "has_kit": True, "name": (kit.get("brand") or {}).get("name"),
        "palette": givemotion.palette_tokens(kit), "heading_font": givemotion.font_family(kit),
        "ctas": kit.get("ctas") or [], "aspect_ratios": kit.get("aspect_ratios") or [],
        "logo_file": str(logo) if logo else None,
        "status": kit.get("status") or {},
        "note": "Check status: 'draft' sections are not approved; treat their values as provisional.",
    }


def composition_path(job_id: str) -> Path:
    path = _job_folder(job_id) / COMPOSITION
    if not path.is_file():
        raise JobError(f"write the composition first: {path}")
    return path


def check_job(job_id: str) -> Dict[str, Any]:
    """Run the givemotion checker on the job's composition. Returns the adapter result unchanged."""
    result = givemotion.check_html(composition_path(job_id))
    _note(job_id, "Composition checked: " + ("ok" if result["ok"] else result["error"] or "failed"))
    return result


def render_job(job_id: str) -> Dict[str, Any]:
    """Check, then render. Refuses to render a composition with errors. The MP4 is written beside the composition."""
    html_path = composition_path(job_id)
    checked = givemotion.check_html(html_path)
    if not checked["ok"]:
        return {"ok": False, "output": "", "error": f"check failed: {checked['error']}", "result": checked.get("result")}
    out = html_path.parent / RENDERED
    rendered = givemotion.render_html(html_path, out)
    _note(job_id, "Rendered with givemotion." if rendered["ok"] else f"Render failed: {rendered['error'][:200]}")
    return rendered


def _note(job_id: str, text: str) -> None:
    try:
        ab.update_job(job_id, note=text)
    except Exception:  # a note is a nicety; never fail the step because the job file could not be written
        pass


def _main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[0] not in ("kit", "check", "render"):
        print("usage: python -m studio.givemotion_job kit|check|render <job_id>", file=sys.stderr)
        return 2
    command, job_id = argv
    try:
        if command == "kit":
            result = kit_for_job(job_id)
        else:
            result = check_job(job_id) if command == "check" else render_job(job_id)
    except JobError as exc:
        result = {"ok": False, "output": "", "error": str(exc), "result": None}
    print(json.dumps(result, ensure_ascii=False, indent=1))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv[1:]))
