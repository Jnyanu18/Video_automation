"""Talking head, step 5, the edit: python lanes/talking-head/plan.py <slug> [--no-preview] [--force]

Reads edit.md, finds every beat's words on the cut timeline, writes work/edit.json, then renders a
half-size work/preview.mp4 and work/contact-sheet.png (a still from each beat) to check before the
final render.
"""
import argparse
import math
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "kit"))  # common.py, captions.py
from common import ROOT, norm, read_json, require, video_dir, write_json

DEFAULT_DUR = {"zoom": 1.6, "text": 2.4, "stat": 2.2, "broll": 2.5, "sfx": 0.6, "glass": 3.2, "screen": 2.0, "shoulder": 4.6, "chips": 2.0, "panel": 3.2}
# The sound each kind of beat makes when sfx is on; "sfx=name" or "sfx=off" on a beat overrides it.
DEFAULT_SFX = {"zoom": "whoosh", "text": "pop", "stat": "switch", "broll": "whip", "glass": "whoosh", "screen": "switch", "shoulder": "whoosh", "chips": "pop", "panel": "switch"}
# Colour names a beat may use; anything else must be a hex code.
COLOURS = {"gold": "#FFC400", "green": "#22C55E", "white": "#FFFFFF", "amber": "#FFC46B", "red": "#FF6B6B",
           "blue": "#7CC4FF", "pink": "#FF8FB3", "mint": "#7CFFA0"}
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


def colour(v, default):
    v = (v or "").strip()
    if not v:
        return default
    if v.lower() in COLOURS:
        return COLOURS[v.lower()]
    return v if v.startswith("#") else "#" + v


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
        top_over = re.search(r"\btop=(\d+)", rest)
        rest = re.sub(r"\s*\btop=\d+", "", rest).strip()
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
            if top_over:  # top=<px>: a smaller card near the top of the frame, for footage where the face sits low
                b["top"] = int(top_over.group(1))
        elif kind == "stat":
            val, _, label = rest.partition("|")
            value, prefix, suffix = number(val.strip())
            if value is None:
                errors.append(f"stat needs a number: {raw.strip()}")
                continue
            b.update(value=value, prefix=prefix, suffix=suffix, label=label.strip(), dur=DEFAULT_DUR[kind])
        elif kind == "glass":
            # - glass "words" TITLE | END NUMBER | colour
            parts = [p.strip() for p in rest.split("|")]
            value, prefix, suffix = number(parts[1]) if len(parts) > 1 else (None, "", "")
            if value is None:
                errors.append(f"glass needs TITLE | END NUMBER, like REVENUE | $10K: {raw.strip()}")
                continue
            dec = re.search(r"\.(\d+)", parts[1])
            decimals = len(dec.group(1)) if dec else 0
            b.update(title=parts[0].upper(), startValue=round(value / 5, decimals), endValue=value, prefix=prefix,
                     suffix=suffix, decimals=decimals, colour=colour(parts[2] if len(parts) > 2 else "", COLOURS["gold"]),
                     top=int(top_over.group(1)) if top_over else 860, dur=DEFAULT_DUR[kind])
        elif kind == "screen":
            # - screen "words" [TEXT ON SCREEN] [| colour]. Each word cuts in as it is said; text that is not said
            # is spread evenly over dur.
            shown, _, col = rest.partition("|")
            shown = (shown.strip() or anchor).split()
            run = [norm(x) for x in shown]
            if [tok for tok in tokens[i:i + len(run)]] == run:
                starts = [max(0.0, words[i + n]["start"] - 0.05) for n in range(len(run))]
                end = max(words[i + len(run) - 1]["end"] + 0.3, starts[-1] + 0.9)
            else:
                span = float(dur_over.group(1)) if dur_over else DEFAULT_DUR[kind]
                starts = [at + n * span / len(shown) for n in range(len(shown))]
                end = at + span
            b["at"] = round(starts[0], 3)
            b.update(words=[{"text": w, "start": round(s, 3)} for w, s in zip(shown, starts)],
                     colour=colour(col, COLOURS["white"]), dur=round(end - starts[0], 3))
            dur_over = None
        elif kind == "shoulder":
            # - shoulder "words" LABEL | BIG | small >> LABEL | BIG | small [style=transition] [colour=gold]
            opts = dict(re.findall(r"\b(style|colour)=(#?[\w]+)", rest))
            rest = re.sub(r"\s*\b(style|colour)=#?[\w]+", "", rest).strip()
            first, sep, second = rest.partition(">>")
            if not sep:
                errors.append(f"shoulder needs two cards split by >>: {raw.strip()}")
                continue

            def card(s):
                parts = [p.strip() for p in s.split("|")]
                return {"label": "", "big": parts[0], "small": ""} if len(parts) == 1 else \
                    dict(zip(("label", "big", "small"), (parts + ["", ""])[:3]))

            fx, fw, fe = [float(v) for v in (st.get("face") or "0.5 0.32 0.255").split()]
            b.update(style="transition" if opts.get("style") == "transition" else "normal", start=card(first),
                     end=card(second), accent=colour(opts.get("colour"), "#A97A00"),
                     face={"x": fx, "width": fw, "eye": fe}, dur=DEFAULT_DUR[kind])
        elif kind == "chips":
            # - chips "words" Pricing | FAQ | About us: each label pops in when its first word is said (or right after
            # the one before, if it is not said); it stays until the last one has been up for 1.6 s.
            items, k = [], i
            for label in [x.strip() for x in rest.split("|") if x.strip()]:
                j = find(tokens, label.split()[0], k)
                when = words[j]["start"] - 0.05 if j is not None and j >= k else (items[-1]["at"] + 0.4 if items else at)
                k = (j + 1) if j is not None and j >= k else k
                items.append({"text": label, "at": round(max(at, when), 3)})
            if not items:
                errors.append(f"chips needs labels split by |: {raw.strip()}")
                continue
            b.update(items=items, itemSound=sound("pop") if sfx_on else None, dur=round(items[-1]["at"] - at + 1.6, 3))
        elif kind == "panel":
            # - panel "words" look | part | part ...: a scene in the top half of a split layout (layout: split).
            # The look is one of the art styles in split.tsx; a "shot" panel's first part is an image file.
            parts = [p.strip() for p in rest.split("|")]
            look, parts = parts[0], parts[1:]
            if look == "shot":
                if not parts or not (d / parts[0]).exists():
                    errors.append(f"shot panel needs an image in videos/{a.slug}/: {raw.strip()}")
                    continue
                parts[0] = f"{a.slug}/{parts[0]}"
            b.update(look=look, parts=parts, dur=DEFAULT_DUR[kind])
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
    # Each sound starts early by the time to its loudest moment, so the hit lands on the beat's frame, not after it
    # (kit/sfx.py, 2026-10-26).
    from sfx import peak_of
    peaks = {}
    for b in beats:
        if b.get("sound"):
            if b["sound"] not in peaks:
                peaks[b["sound"]] = peak_of(d.parent / b["sound"])
            b["soundAt"] = round(max(0.0, b["at"] - peaks[b["sound"]]), 3)
    # Panels share the top half, so each one lasts until the next begins.
    panels = sorted((b for b in beats if b["kind"] == "panel"), key=lambda b: b["at"])
    for cur, nxt in zip(panels, panels[1:]):
        cur["dur"] = round(nxt["at"] - cur["at"], 3)
    if panels:
        panels[-1]["dur"] = round(seconds - panels[-1]["at"], 3)
    # Cards share one spot on screen, so each text or number card ends when the next one starts.
    cards = sorted((b for b in beats if b["kind"] in ("text", "stat", "chips")), key=lambda b: b["at"])
    for cur, nxt in zip(cards, cards[1:]):
        cur["dur"] = round(max(0.6, min(cur["dur"], nxt["at"] - cur["at"] - 0.05)), 3)

    edit = {"brand": st.get("brand", "personal"), "style": st.get("style", "light").lower(),
            "layout": st.get("layout", "full").lower(),
            # Remotion draws the video; engine: hyperframes in edit.md only when Vishnu asks for it (CLAUDE.md "Which engine").
            "engine": st.get("engine", "remotion").lower(),
            "sfxVolume": sfx_volume, "videoSeconds": round(seconds, 3), "endSeconds": float(st.get("end-seconds", 2.5)),
            "captions": st.get("captions", "on").lower() != "off",
            "lowerThird": {"name": lt[0], "line": lt[1], "at": float(st.get("lower-third-at", 0.3))} if lt else None, "music": music,
            "endCard": {"question": ec[0], "url": ec[1]} if ec else None, "words": words, "beats": beats}
    write_json(work / "edit.json", edit)
    print(f"Wrote work/edit.json: {len(beats)} beats on a {seconds:.1f}s cut.")
    if a.no_preview:
        return

    node = ["node", str(ROOT / "kit" / "remotion.mjs")]
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
          f"edit.md and run again if needed; then tick '5 Edit' and run: python lanes/talking-head/render.py {a.slug}")


if __name__ == "__main__":
    main()
