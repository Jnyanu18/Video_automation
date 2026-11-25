"""Shared paths and the check gate. Every command imports this."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIDEOS = ROOT / "videos"

STAGES = ["0 Brief", "1 Voice", "2 Words", "3 Cues", "4 Scene", "5 Render"]


def video_dir(slug: str) -> Path:
    d = VIDEOS / slug
    if not d.is_dir():
        sys.exit(f"No video folder videos/{slug}. Start one with: python bin/new.py {slug} \"Working title\"")
    return d


def ticked(slug: str, stage: str) -> bool:
    text = (video_dir(slug) / "CHECKS.md").read_text(encoding="utf-8")
    return re.search(rf"^- \[x\] {re.escape(stage)}\b", text, re.M | re.I) is not None


def require(slug: str, stage: str, force: bool) -> None:
    """Stop unless the previous stage was signed off. --force exists for drafts, and says so."""
    if ticked(slug, stage):
        return
    if force:
        print(f"!! '{stage}' is not ticked in CHECKS.md; running anyway because of --force (draft only).")
        return
    sys.exit(f"Stage '{stage}' is not signed off in videos/{slug}/CHECKS.md. Check it, tick it, then run this again.")


def read_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def write_json(p: Path, data) -> None:
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def norm(word: str) -> str:
    return re.sub(r"[^a-z0-9']", "", word.lower().replace("’", "'"))


def script_paragraphs(slug: str) -> list[str]:
    """The spoken paragraphs of script.md: headings, comments and blank lines are not spoken."""
    text = (video_dir(slug) / "script.md").read_text(encoding="utf-8")
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    paras = []
    for block in re.split(r"\n\s*\n", text):
        lines = [l for l in block.strip().splitlines() if l.strip() and not l.lstrip().startswith("#")]
        if lines:
            paras.append(" ".join(l.strip() for l in lines))
    return paras
