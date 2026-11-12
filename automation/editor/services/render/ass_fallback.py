"""Caption burn-in with FFmpeg + libass, used when the HyperFrames (browser) render cannot run or times out.

It keeps the captions on screen (word-by-word highlight for karaoke) so a failed browser render never silently drops them.
Title / lower-third / b-roll overlays need the browser composition and are NOT drawn here; the caller reports that.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

GOLD_BGR = "&H0000D4FF"   # #FFD400 in ASS (BGR)
WHITE = "&H00FFFFFF"
BLACK = "&H00000000"
UPPER_STYLES = {"bold-pop", "karaoke"}


def _ts(t: float) -> str:
    t = max(0.0, float(t))
    cs = int(round(t * 100))
    h, rem = divmod(cs, 360000)
    m, rem = divmod(rem, 6000)
    s, c = divmod(rem, 100)
    return f"{h}:{m:02d}:{s:02d}.{c:02d}"


def _esc(text: str) -> str:
    return str(text).replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", " ")


def build_ass(captions: list[dict], w: int, h: int) -> str:
    size = max(14, round(64 * min(w, h) / 1080))
    margin_v = round(h * 0.12)
    margin_lr = round(110 * min(w, h) / 1080)
    outline = max(2, round(size / 14))
    head = (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {w}\nPlayResY: {h}\nScaledBorderAndShadow: yes\nWrapStyle: 0\n\n"
        "[V4+ Styles]\n"
        "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,"
        "StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\n"
        f"Style: Default,Arial,{size},{WHITE},{WHITE},{BLACK},&H80000000,-1,0,0,0,100,100,0,0,1,{outline},1,2,"
        f"{margin_lr},{margin_lr},{margin_v},1\n"
        f"Style: Karaoke,Arial,{size},{GOLD_BGR},{WHITE},{BLACK},&H80000000,-1,0,0,0,100,100,0,0,1,{outline},1,2,"
        f"{margin_lr},{margin_lr},{margin_v},1\n\n"
        "[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n"
    )
    lines = []
    for c in sorted(captions, key=lambda x: (x["start"], x["end"])):
        start, end = float(c["start"]), float(c["end"])
        if end - start < 0.04:
            continue
        style_name = c.get("style") or "bold-pop"
        up = style_name in UPPER_STYLES
        words = [wd for wd in (c.get("words") or []) if str(wd.get("word", "")).strip()]
        if style_name == "karaoke" and words:
            parts, cursor = [], start
            for wd in words:
                ws, we = max(float(wd["start"]), start), min(float(wd["end"]), end)
                gap_cs = max(0, round((ws - cursor) * 100))
                dur_cs = max(1, round((we - ws) * 100))
                token = _esc(str(wd["word"]).strip())
                token = token.upper() if up else token
                parts.append((f"{{\\k{gap_cs}}}" if gap_cs else "") + f"{{\\k{dur_cs}}}{token}")
                cursor = we
            text, style = " ".join(parts), "Karaoke"
        else:
            text = _esc(c.get("text", ""))
            text, style = (text.upper() if up else text), "Default"
        lines.append(f"Dialogue: 0,{_ts(start)},{_ts(end)},{style},,0,0,0,,{text}")
    return head + "\n".join(lines) + "\n"


def burn_captions(cut_video: Path, captions: list[dict], w: int, h: int, out: Path, workdir: Path,
                  preset: str = "veryfast", crf: int = 20) -> Path:
    """Burn `captions` (OUTPUT-time) into `cut_video`. Runs ffmpeg with cwd=workdir so the filter path needs no escaping."""
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    (workdir / "captions.ass").write_text(build_ass(captions, w, h), encoding="utf-8")
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(Path(cut_video).resolve()), "-vf", "ass=captions.ass",
           "-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-pix_fmt", "yuv420p", "-c:a", "copy",
           "-movflags", "+faststart", str(Path(out).resolve())]
    r = subprocess.run(cmd, cwd=str(workdir), capture_output=True, text=True)
    if r.returncode != 0 or not Path(out).exists():
        raise RuntimeError(f"ffmpeg ass burn-in failed ({r.returncode}): {r.stderr[-800:]}")
    return Path(out)
