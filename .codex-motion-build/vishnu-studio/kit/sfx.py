"""Sound effects: real CC0 sounds from Openverse, placed so each one's loudest moment lands on its motion's frame.

    python kit/sfx.py fetch <name> "<search>" [--max-ms 1500] [--skip N]   find and download one CC0 sound
    python kit/sfx.py library                                             fetch the studio's standard set
    python kit/sfx.py place <in.mp4> <hits.json> <out.mp4> [--gain 0.5]   mix the hits into a finished video

fetch asks the Openverse API for CC0 audio only (license=cc0), keeps sounds shorter than --max-ms, downloads the
first match to videos/_sfx/cc0/<name>.wav, measures where it is loudest (videos/_sfx/cc0/peaks.json) and adds its
source, creator and licence to videos/_sfx/LICENCES.md. CC0 needs no credit; the row is kept so the source is known.

place reads hits.json, a list of {"t": seconds, "sound": name, "gain": 0.0-1.0 (optional)}: t is the frame of the
motion (a card landing, a cut, a stamp). Each sound starts at t minus its peak, so the hit is heard on that frame,
not a beat after. The picture is copied untouched; run kit/music.py mix after it for the music.
"""
import argparse
import json
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "videos" / "_sfx" / "cc0"
PEAKS = DIR / "peaks.json"
LIC = ROOT / "videos" / "_sfx" / "LICENCES.md"
API = "https://api.openverse.org/v1/audio/"
UA = {"User-Agent": "vishnu-studio/1.0 (sound effects for videos)"}

# The standard set: one sound per kind of move in the studio's edits.
LIBRARY = {
    "whoosh": ("swoosh whoosh", 900),
    "swish": ("swish short", 700),
    "pop": ("pop bubble", 500),
    "click": ("ui click", 400),
    "tick": ("clock tick", 500),
    "ding": ("ding bell", 1800),
    "chime": ("success chime", 2500),
    "thud": ("soft thud", 900),
    "impact": ("impact hit", 1500),
    "stamp": ("rubber stamp", 1000),
    "paper": ("paper slide", 1200),
    "tape": ("tape rip", 1500),
    "boing": ("cartoon boing", 1200),
    "sparkle": ("sparkle magic", 2000),
    "riser": ("riser swell", 3500),
}


def peak_of(path: Path) -> float:
    """Seconds from the start of the file to its loudest 10 ms."""
    import numpy as np
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, dtype=np.int16).astype(float)
    n = 160
    if len(a) < n:
        return 0.0
    rms = np.sqrt((a[: len(a) // n * n].reshape(-1, n) ** 2).mean(axis=1))
    return round(float(rms.argmax()) * n / 16000, 3)


def fetch(name: str, query: str, max_ms: int, skip: int = 0) -> None:
    DIR.mkdir(parents=True, exist_ok=True)
    url = API + "?" + urllib.parse.urlencode({"q": query, "license": "cc0", "page_size": 20})
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        results = json.load(r)["results"]
    pick = [x for x in results if x.get("license") == "cc0" and x.get("url") and (x.get("duration") or 10 ** 9) <= max_ms]
    if len(pick) <= skip:
        raise SystemExit(f"No CC0 sound under {max_ms} ms for '{query}' (got {len(results)} results). Try another search.")
    x = pick[skip]
    tmp = DIR / f"{name}.download"
    with urllib.request.urlopen(urllib.request.Request(x["url"], headers=UA), timeout=120) as r:
        tmp.write_bytes(r.read())
    out = DIR / f"{name}.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(tmp), "-ac", "2", "-ar", "48000", str(out)], check=True)
    tmp.unlink()
    peaks = json.loads(PEAKS.read_text(encoding="utf-8")) if PEAKS.exists() else {}
    peaks[name] = peak_of(out)
    PEAKS.write_text(json.dumps(peaks, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    row = (f"| cc0/{name}.wav | \"{x.get('title', '')}\" by {x.get('creator') or 'unknown'}, "
           f"{x.get('foreign_landing_url') or x['url']} (Openverse {x['id']}) | CC0 {x.get('license_version') or '1.0'} |")
    text = LIC.read_text(encoding="utf-8") if LIC.exists() else "# Sound effects\n"
    lines = [l for l in text.splitlines() if not l.startswith(f"| cc0/{name}.wav |")]
    LIC.write_text("\n".join(lines).rstrip() + "\n" + row + "\n", encoding="utf-8")
    print(f"{name}: \"{x.get('title')}\" by {x.get('creator')}, {x.get('duration')} ms, loudest at {peaks[name]} s")


def place(src: Path, hits_file: Path, dst: Path, gain: float) -> None:
    peaks = json.loads(PEAKS.read_text(encoding="utf-8"))
    hits = json.loads(hits_file.read_text(encoding="utf-8"))
    inputs, chains = ["-i", str(src)], []
    for k, h in enumerate(hits, 1):
        name = h["sound"]
        if name not in peaks:
            raise SystemExit(f"No sound '{name}' in videos/_sfx/cc0/. Fetch it first: python kit/sfx.py fetch {name} \"...\"")
        start = max(0.0, h["t"] - peaks[name])
        inputs += ["-i", str(DIR / f"{name}.wav")]
        ms = int(round(start * 1000))
        chains.append(f"[{k}:a]volume={h.get('gain', gain)},adelay={ms}|{ms}[s{k}]")
    mix = "".join(f"[s{k}]" for k in range(1, len(hits) + 1))
    graph = ";".join(chains) + f";[0:a]{mix}amix=inputs={len(hits) + 1}:duration=first:normalize=0[a]"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *inputs, "-filter_complex", graph, "-map", "0:v", "-map", "[a]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", str(dst)], check=True)
    print(f"{dst}: {len(hits)} sounds placed on their frames")


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("fetch")
    f.add_argument("name")
    f.add_argument("query")
    f.add_argument("--max-ms", type=int, default=1500)
    f.add_argument("--skip", type=int, default=0, help="take the Nth match instead of the first")
    sub.add_parser("library")
    p = sub.add_parser("place")
    p.add_argument("src", type=Path)
    p.add_argument("hits", type=Path)
    p.add_argument("dst", type=Path)
    p.add_argument("--gain", type=float, default=0.5)
    a = ap.parse_args()
    if a.cmd == "fetch":
        fetch(a.name, a.query, a.max_ms, a.skip)
    elif a.cmd == "library":
        for name, (q, ms) in LIBRARY.items():
            try:
                fetch(name, q, ms)
            except SystemExit as e:
                print(f"{name}: {e}")
    else:
        place(a.src, a.hits, a.dst, a.gain)


if __name__ == "__main__":
    main()
