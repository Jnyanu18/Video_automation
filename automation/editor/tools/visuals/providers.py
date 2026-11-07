"""Pluggable B-roll asset providers.

Interface: ``provider.search(query, limit) -> list[dict]`` where each hit is
``{"path": str, "title": str, "score": float, "duration": float|None, "source": str}``.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Protocol

VIDEO_EXT = {".mp4", ".mov", ".webm", ".mkv", ".m4v"}
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def _tokens(s: str) -> set[str]:
    return {t for t in re.split(r"[^a-z0-9]+", s.lower()) if len(t) > 1}


class AssetProvider(Protocol):
    def search(self, query: str, limit: int = 3) -> list[dict]: ...


class LocalFolderProvider:
    """Searches a local folder. A file matches by filename/folder tokens and by optional tags in
    a sidecar ``<name>.json`` ({"tags": [...], "duration": 4.2}) or a folder-level ``tags.json``
    mapping filename -> list of tags."""

    def __init__(self, folder: str | Path, include_images: bool = True):
        self.folder = Path(folder)
        self.exts = VIDEO_EXT | (IMAGE_EXT if include_images else set())

    def _index(self) -> list[dict]:
        if not self.folder.is_dir():
            return []
        folder_tags = {}
        tf = self.folder / "tags.json"
        if tf.exists():
            try:
                folder_tags = json.loads(tf.read_text())
            except ValueError:
                folder_tags = {}
        out = []
        for p in sorted(self.folder.rglob("*")):
            if p.suffix.lower() not in self.exts or not p.is_file():
                continue
            toks = _tokens(p.stem) | _tokens(p.parent.name if p.parent != self.folder else "")
            tags = list(folder_tags.get(p.name, []))
            duration = None
            side = p.with_suffix(".json")
            if side.exists():
                try:
                    meta = json.loads(side.read_text())
                    tags += meta.get("tags", [])
                    duration = meta.get("duration")
                except ValueError:
                    pass
            for t in tags:
                toks |= _tokens(str(t))
            out.append({"path": str(p), "title": p.stem, "tokens": toks, "duration": duration})
        return out

    def search(self, query: str, limit: int = 3) -> list[dict]:
        q = _tokens(query)
        if not q:
            return []
        hits = []
        for item in self._index():
            overlap = q & item["tokens"]
            if overlap:
                hits.append({"path": item["path"], "title": item["title"],
                             "score": round(len(overlap) / len(q), 3),
                             "duration": item["duration"], "source": "local"})
        hits.sort(key=lambda h: (-h["score"], h["path"]))
        return hits[:limit]


class StockAPIProvider:
    """STUB for a stock-footage API (e.g. Pexels Videos: GET https://api.pexels.com/videos/search
    ?query=..&per_page=..  with header ``Authorization: <API key>``; Pixabay and Coverr are similar).

    Not implemented: outbound network is blocked in the dev sandbox. To implement: perform the
    request in ``search``, map each result to the hit dict above (download the smallest HD mp4
    ``video_files`` entry into a cache dir and return its local path in ``path``), and respect the
    provider's attribution/licence terms. ``http_get`` is injectable so it can be tested offline.
    """

    def __init__(self, api_key: str | None = None, http_get=None):
        self.api_key = api_key
        self.http_get = http_get

    def search(self, query: str, limit: int = 3) -> list[dict]:
        raise NotImplementedError("StockAPIProvider is a documented stub; see class docstring.")


class ChainProvider:
    """Try providers in order, returning the first non-empty result."""

    def __init__(self, *providers: AssetProvider):
        self.providers = providers

    def search(self, query: str, limit: int = 3) -> list[dict]:
        for p in self.providers:
            try:
                hits = p.search(query, limit)
            except NotImplementedError:
                continue
            if hits:
                return hits
        return []
