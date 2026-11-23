"""Studio-owned finished films available as portfolio items and edit references."""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import quote


MEDIA_DIR = Path(__file__).resolve().parents[2] / "media"
CATEGORY_LABELS = {
    "motion_graphics": "MOTION GRAPHICS",
    "hybrid": "AI EDITING + MOTION",
    "ai_editing": "AI EDITING",
}
CATEGORY_COLORS = {
    "motion_graphics": ("#2B1947", "#0F0A1D", "#A78BFA"),
    "hybrid": ("#132B2A", "#071413", "#34D399"),
    "ai_editing": ("#2C1B13", "#120904", "#FB923C"),
}


def _records(media_dir: Path = MEDIA_DIR) -> list[tuple[dict, Path]]:
    manifest = media_dir / "videos.json"
    if not manifest.is_file():
        return []
    try:
        data = json.loads(manifest.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    if not isinstance(data, list):
        return []
    out: list[tuple[dict, Path]] = []
    seen: set[str] = set()
    for record in data:
        if not isinstance(record, dict):
            continue
        film_id, name = record.get("id"), record.get("filename")
        if not isinstance(film_id, str) or not isinstance(name, str):
            continue
        if film_id in seen or Path(name).name != name or Path(name).suffix.lower() != ".mp4":
            continue
        path = media_dir / name
        if not path.is_file():
            continue
        seen.add(film_id)
        out.append((record, path))
    return out


def list_films(media_dir: Path = MEDIA_DIR) -> list[dict]:
    films = []
    for index, (record, path) in enumerate(_records(media_dir), 1):
        category = record.get("category")
        if category not in CATEGORY_LABELS:
            category = "hybrid"
        title = str(record.get("title") or path.stem)
        duration = float(record.get("duration_seconds") or 0)
        width = int(record.get("width") or 0)
        height = int(record.get("height") or 0)
        landscape = width > height
        start, end, accent = CATEGORY_COLORS[category]
        thumbnail = path.with_suffix(".jpg")
        films.append({
            "id": record["id"],
            "number": f"{index:02d} / {CATEGORY_LABELS[category]}",
            "graphicTitle": title.upper().replace(" — ", "\n").replace(" ", "\n", 1),
            "tagline": "ORIGINAL STUDIO FILM",
            "title": title,
            "category": category,
            "format": f"{'Landscape' if landscape else 'Vertical'} · {round(duration)}s",
            "status": "READY",
            "videoUrl": f"/media/{quote(path.name)}",
            "thumbnailUrl": f"/media/{quote(thumbnail.name)}" if thumbnail.is_file() else None,
            "duration": f"{round(duration)}s",
            "duration_seconds": duration,
            "width": width,
            "height": height,
            "gradientStart": start,
            "gradientEnd": end,
            "accentColor": accent,
            "isLandscape": landscape,
            "is_reference": bool(record.get("is_reference")),
            "reference_id": record["id"] if record.get("is_reference") else None,
        })
    return films


def reference_path(reference_id: str, media_dir: Path = MEDIA_DIR) -> Path | None:
    for record, path in _records(media_dir):
        if record["id"] == reference_id and record.get("is_reference"):
            return path
    return None
