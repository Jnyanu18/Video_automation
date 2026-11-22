"""captions.srt from words.json, in short groups, for uploads that want a caption file."""
from pathlib import Path


def _t(sec: float) -> str:
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt(words: list, path: Path, max_words: int = 6) -> None:
    groups, cur = [], []
    for i, w in enumerate(words):
        prev = words[i - 1] if i else None
        if cur and (len(cur) >= max_words or (prev and w["start"] - prev["end"] > 0.35)):
            groups.append(cur)
            cur = []
        cur.append(w)
    if cur:
        groups.append(cur)
    out = []
    for n, g in enumerate(groups, 1):
        out += [str(n), f"{_t(g[0]['start'])} --> {_t(g[-1]['end'])}", " ".join(w["w"] for w in g), ""]
    path.write_text("\n".join(out), encoding="utf-8")
