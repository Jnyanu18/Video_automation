"""Talking head, step 5, the edit: python bin/th_plan.py <slug> [--no-preview] [--force]

Reads edit.md, finds every beat's words on the cut timeline, writes work/edit.json, then renders a
half-size work/preview.mp4 and work/contact-sheet.png (a still from each beat) to check before the
final render.
"""
import argparse
import math
import re
import shutil
import subprocess
from common import ROOT, norm, read_json, require, video_dir, write_json

DEFAULT_DUR = {"zoom": 1.6, "text": 2.4, "stat": 2.2, "broll": 2.5, "sfx": 0.6}
# The sound each kind of beat makes when sfx is on; "sfx=name" or "sfx=off" on a beat overrides it.
DEFAULT_SFX = {"zoom": "whoosh", "text": "pop", "stat": "switch", "broll": "whip"}
BEAT = re.compile(r'^- (\w+) "([^"]+)"\s*(.*)$')
IMAGE = {".png", ".jpg", ".jpeg", ".webp"}


def settings_of(text):
    block = re.search(r"## Settings\n(.*?)(?=\n## |\Z)", text, re.S)
    out = {}
    for line in (block.group(1) if block else "").splitlines():
        k, sep, v = line.partition(":")
        if sep and not line.strip().startswith("<!--"):
            out[k.strip().lower()] = v.strip()
    return out


def find(tokens, anchor, frm):
    """Index of the word where `anchor` starts, searching from `frm` first. Compares letters only, so
    "2,500" matches "2" ",500" and "AskVerb" matches "Ask Verb"."""
    want = "".join(norm(t) for t in anchor.split())
    if not want:
        return None
    for start in list(range(frm, len(tokens))) + list(range(0, frm)):
        got, k = "", start
        while k < len(tokens) and len(got) < len(want):
            got += tokens[k]
            k += 1
        if got == want or (got.startswith(want) and want and k - start > 1):
            return start
    return None


def number(text):
    m = re.search(r"([^\d]*)([\d,]+(?:\.\d+)?)(.*)", text)
    if not m:
        return None, "", text
    return float(m.group(2).replace(",", "")), m.group(1).strip(), m.group(3).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--no-preview", action="store_true")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    require(a.slug, "4 Cut", a.force)
    d = video_dir(a.slug)
    work = d / "work"
    words = read_json(work / "cut-words.json")
    tokens = [norm(w["w"]) for w in words]
    seconds = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                    str(work / "cut.mp4")], capture_output=True, text=True, check=True).stdout.strip())
    text = re.sub(r"<!--.*?-->", "", (d / "edit.md").read_text(encoding="utf-8"), flags=re.S)
    st = settings_of(text)

    def pair(v):
        if not v or v.lower() == "off":
            return None
        left, _, right = v.partition("|")
        return left.strip(), right.strip()

    music = None
    if st.get("music") and st["music"].lower() != "off":
        parts = st["music"].split()
        music = {"src": parts[0], "volume": float(parts[1]) if len(parts) > 1 else 0.1}
        if not (d.parent / parts[0]).exists():
            raise SystemExit(f"Music file videos/{parts[0]} not found (shared music lives in videos/_music/).")
    beats, errors = [], []
    lt, ec = pair(st.get("lower-third")), pair(st.get("end-card"))
    sfx_set = (st.get("sfx") or "off").split()
    sfx_on = bool(sfx_set) and sfx_set[0].lower() == "on"
    sfx_volume = float(sfx_set[1]) if sfx_on and len(sfx_set) > 1 else 0.35
    sfx_dir = d.parent / "_sfx"

    def sound(name):
        if not name or name == "off":
            return None
        if not (sfx_dir / f"{name}.wav").exists():
            errors.append(f"sound _sfx/{name}.wav not found (see videos/_sfx/LICENCES.md)")
            return None
        return f"_sfx/{name}.wav"

    at_word = 0
    beats_block = re.search(r"## Beats\n(.*)", text, re.S)
    for raw in (beats_block.group(1) if beats_block else "").splitlines():
        m = BEAT.match(raw.strip())
        if not m:
            continue
        kind, anchor, rest = m.group(1).lower(), m.group(2), m.group(3).strip()
        dur_over = re.search(r"\bdur=([\d.]+)", rest)
        rest = re.sub(r"\s*\bdur=[\d.]+", "", rest).strip()
        override = re.search(r"\bsfx=([\w-]+)", rest)
        rest = re.sub(r"\s*\bsfx=[\w-]+", "", rest).strip()
        if kind not in DEFAULT_DUR:
            errors.append(f"unknown beat '{kind}' in: {raw.strip()}")
            continue
        i = find(tokens, anchor, at_word)
        if i is None:
            errors.append(f'"{anchor}" is not in the cut (check cut-words.json): {raw.strip()}')
            continue
        at_word = i + 1
        at = max(0.0, words[i]["start"] - 0.05)
        b = {"kind": kind, "at": round(at, 3)}
        if kind == "zoom":
            nums = [float(x) for x in rest.split()[:2]] if rest else []
            b["scale"] = nums[0] if nums else 1.12
            b["dur"] = nums[1] if len(nums) > 1 else DEFAULT_DUR[kind]
        elif kind == "text":
            parts = [p.strip() for p in rest.lstrip("|").split("|")]
            b["text"], b["mark"] = parts[0], (parts[1] if len(parts) > 1 else "")
            b["dur"] = DEFAULT_DUR[kind]
        elif kind == "stat":
            val, _, label = rest.partition("|")
            value, prefix, suffix = number(val.strip())
            if value is None:
                errors.append(f"stat needs a number: {raw.strip()}")
                continue
            b.update(value=value, prefix=prefix, suffix=suffix, label=label.strip(), dur=DEFAULT_DUR[kind])
        elif kind == "sfx":
            if not rest:
                errors.append(f"sfx needs a sound name: {raw.strip()}")
                continue
            b["dur"] = DEFAULT_DUR[kind]
            b["sound"] = sound(rest.split()[0])
        elif kind == "broll":
            parts = rest.split()
            if not parts:
                errors.append(f"broll needs a file: {raw.strip()}")
                continue
            src = d / parts[0]
            if not src.exists():
                errors.append(f"broll file {parts[0]} not found in videos/{a.slug}/: {raw.strip()}")
                continue
            b.update(src=f"{a.slug}/{parts[0]}", image=src.suffix.lower() in IMAGE, pip="pip" in parts[1:],
                     dur=float(parts[1]) if len(parts) > 1 and parts[1] != "pip" else DEFAULT_DUR[kind])
        if dur_over:
            b["dur"] = float(dur_over.group(1))
        b["dur"] = round(max(0.6, min(b["dur"], seconds - at)), 3)
        if kind != "sfx":
            b["sound"] = sound(override.group(1) if override else (DEFAULT_SFX[kind] if sfx_on else None))
        beats.append(b)
    if errors:
        raise SystemExit("edit.md has problems:\n- " + "\n- ".join(errors))
    # Cards share one spot on screen, so each text or number card ends when the next one starts.
    cards = sorted((b for b in beats if b["kind"] in ("text", "stat")), key=lambda b: b["at"])
    for cur, nxt in zip(cards, cards[1:]):
        cur["dur"] = round(max(0.6, min(cur["dur"], nxt["at"] - cur["at"] - 0.05)), 3)

    edit = {"brand": st.get("brand", "personal"), "style": st.get("style", "light").lower(),
            "sfxVolume": sfx_volume, "videoSeconds": round(seconds, 3), "endSeconds": 2.5,
            "captions": st.get("captions", "on").lower() != "off",
            "lowerThird": {"name": lt[0], "line": lt[1], "at": float(st.get("lower-third-at", 0.3))} if lt else None, "music": music,
            "endCard": {"question": ec[0], "url": ec[1]} if ec else None, "words": words, "beats": beats}
    write_json(work / "edit.json", edit)
    print(f"Wrote work/edit.json: {len(beats)} beats on a {seconds:.1f}s cut.")
    if a.no_preview:
        return

    node = ["node", str(ROOT / "bin" / "remotion.mjs")]
    subprocess.run(node + ["th-render", a.slug, str(work / "preview.mp4"), "0.5"], check=True, cwd=ROOT)
    times = [0.5] + [b["at"] + min(0.6, b["dur"] / 2) for b in beats] + [seconds * 0.5]
    if edit["lowerThird"]:
        times.append(edit["lowerThird"]["at"] + 1.2)
    if edit["endCard"]:
        times.append(seconds + 1.2)
    frames = sorted({int(t * 30) for t in times})[:16]
    stills = work / "stills"
    shutil.rmtree(stills, ignore_errors=True)
    stills.mkdir()
    subprocess.run(node + ["th-stills", a.slug, str(stills), ",".join(map(str, frames))], check=True, cwd=ROOT)
    shots = sorted(stills.glob("frame-*.png"))
    while len(shots) % 4:
        extra = stills / f"frame-zz{len(shots):02d}.png"
        shutil.copy(shots[-1], extra)
        shots.append(extra)
    for n, p in enumerate(shots, 1):
        p.replace(stills / f"s{n:02d}.png")
    rows = math.ceil(len(shots) / 4)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(stills / "s%02d.png"),
                    "-vf", f"scale=270:480,tile=4x{rows}:padding=6:color=0x14151a", "-frames:v", "1",
                    str(work / "contact-sheet.png")], check=True)
    # Keep every version, so before and after can be compared: work/versions/v01, v02, ...
    vroot = work / "versions"
    vroot.mkdir(exist_ok=True)
    n = 1 + max([int(p.name[1:]) for p in vroot.glob("v[0-9]*") if p.name[1:].isdigit()] or [0])
    vdir = vroot / f"v{n:02d}"
    vdir.mkdir()
    for f in (d / "edit.md", work / "edit.json", work / "preview.mp4", work / "contact-sheet.png"):
        shutil.copy(f, vdir / f.name)
    print(f"Saved this version as work/versions/v{n:02d}.")
    print("Wrote work/preview.mp4 (half size) and work/contact-sheet.png. Watch the preview with sound; change "
          f"edit.md and run again if needed; then tick '5 Edit' and run: python bin/th_render.py {a.slug}")


if __name__ == "__main__":
    main()
