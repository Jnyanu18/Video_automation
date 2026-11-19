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
        sys.exit(f"No video folder videos/{slug}. Start one with: python lanes/<lane>/new.py {slug} \"Working title\"")
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


def script_paragraphs(slug: str, cues: bool = False) -> list[str]:
    """The spoken paragraphs of script.md: headings, comments and blank lines are not spoken.

    Emotion cues for the voice, like [softly], are kept only when `cues` is set (the voice step); every
    other step sees the words alone."""
    text = (video_dir(slug) / "script.md").read_text(encoding="utf-8")
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    if not cues:
        text = re.sub(r" ?\[[a-z -]+\] ?", " ", text)
    paras = []
    for block in re.split(r"\n\s*\n", text):
        lines = [l for l in block.strip().splitlines() if l.strip() and not l.lstrip().startswith("#")]
        if lines:
            paras.append(re.sub(r" +", " ", " ".join(l.strip() for l in lines)).strip())
    return paras


def whisper_model(name: str):
    """Whisper on half the CPU cores. On every core, back-to-back runs overheated the laptop into a thermal
    shutdown on 2026-10-22; half is a little slower and much cooler."""
    import os
    import torch
    import whisper
    torch.set_num_threads(max(1, (os.cpu_count() or 2) // 2))
    return whisper.load_model(name)


def thumbs_review(out: Path) -> Path:
    """All thumbnails side by side in out/thumbs-review.png, labelled. Always shown to Vishnu with the final
    (rule set 2026-10-22, after a final went out without it)."""
    from PIL import Image, ImageDraw, ImageFont
    thumbs = sorted(out.glob("thumb-*.png"))
    if not thumbs:
        return out / "thumbs-review.png"
    first = Image.open(thumbs[0])
    w = 540
    h = round(first.height * w / first.width)
    sheet = Image.new("RGB", (len(thumbs) * (w + 16) + 16, h + 76), "#e6e8ec")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("arialbd.ttf", 40)
    except OSError:
        font = ImageFont.load_default()
    for i, p in enumerate(thumbs):
        sheet.paste(Image.open(p).convert("RGB").resize((w, h)), (16 + i * (w + 16), 16))
        draw.text((26 + i * (w + 16), h + 24), p.stem, fill="#14151a", font=font)
    sheet.save(out / "thumbs-review.png")
    return out / "thumbs-review.png"
