"""Pure helpers that turn effect settings into ffmpeg filter text. Shared by the tools (validation) and services/render."""
from __future__ import annotations

from pathlib import Path

# user-facing transition name -> ffmpeg xfade `transition=` value
XFADE = {
    "crossfade": "fade", "fade-black": "fadeblack", "fade-white": "fadewhite", "dissolve": "dissolve",
    "wipe-left": "wipeleft", "wipe-right": "wiperight", "wipe-up": "wipeup", "wipe-down": "wipedown",
    "slide-left": "slideleft", "slide-right": "slideright", "slide-up": "slideup", "slide-down": "slidedown",
    "smooth-left": "smoothleft", "smooth-right": "smoothright", "circle-open": "circleopen",
    "circle-close": "circleclose", "radial": "radial", "pixelize": "pixelize", "zoom-in": "zoomin",
}

# preset -> list of ffmpeg video filters (applied before the manual exposure/contrast/saturation adjustments)
GRADE_PRESETS = {
    "neutral": [],
    "warm": ["colorbalance=rs=0.08:gs=0.02:bs=-0.08:rm=0.06:bm=-0.06:rh=0.04:bh=-0.05", "eq=saturation=1.08"],
    "cool": ["colorbalance=rs=-0.06:bs=0.08:rm=-0.05:bm=0.06:rh=-0.03:bh=0.05", "eq=saturation=1.03"],
    "cinematic": ["colorbalance=rs=-0.08:bs=0.1:rh=0.1:bh=-0.08", "eq=contrast=1.12:saturation=0.92:gamma=0.97"],
    "vintage": ["curves=preset=vintage", "eq=saturation=0.85"],
    "bw": ["hue=s=0", "eq=contrast=1.1"],
    "vivid": ["eq=saturation=1.35:contrast=1.08"],
    "punchy": ["eq=contrast=1.18:saturation=1.2:gamma=0.96"],
    "faded": ["eq=contrast=0.88:saturation=0.85:brightness=0.04"],
}

LIMITS = {"exposure": (-3.0, 3.0), "contrast": (0.5, 2.0), "saturation": (0.0, 3.0), "brightness": (-0.5, 0.5)}
LUT_EXT = {".cube", ".3dl"}


def esc_path(path: str | Path) -> str:
    """Escape a file path for use as a filter option value (Windows drive colons, backslashes, quotes)."""
    p = str(Path(path).resolve()).replace("\\", "/")
    return p.replace(":", r"\:").replace("'", r"\'")


def grade_filters(grade: dict | None) -> list[str]:
    """Filter chain pieces for plan['color_grade'] (empty list when nothing to do)."""
    if not grade:
        return []
    chain: list[str] = []
    if grade.get("lut"):
        chain.append(f"lut3d=file='{esc_path(grade['lut'])}'")
    chain += GRADE_PRESETS.get(grade.get("preset") or "neutral", [])
    if grade.get("exposure"):
        chain.append(f"exposure=exposure={float(grade['exposure']):.3f}")
    eq = []
    for key in ("contrast", "saturation"):
        if grade.get(key) is not None and abs(float(grade[key]) - 1.0) > 1e-6:
            eq.append(f"{key}={float(grade[key]):.3f}")
    if grade.get("brightness"):
        eq.append(f"brightness={float(grade['brightness']):.3f}")
    if eq:
        chain.append("eq=" + ":".join(eq))
    return chain


def _env(x: str, ease: str) -> str:
    """0..1 envelope expression of `x` (already an expression for progress, may be <0 or >1)."""
    c = f"clip({x},0,1)"
    return f"(pow({c},2)*(3-2*{c}))" if ease == "smooth" else c


def zoom_expr(zooms: list[dict], seg_start: float) -> str:
    """ffmpeg expression for the zoom factor at piece-local time `t` (>= 1). Zoom times are SOURCE seconds."""
    terms = []
    for z in zooms:
        a, b = float(z["start"]) - seg_start, float(z["end"]) - seg_start
        r = max(min(float(z.get("ramp", 0.4)), (b - a) / 2), 1e-3)
        s = float(z.get("scale", 1.25))
        e = _env(f"min((t-{a:.4f})/{r:.4f},({b:.4f}-t)/{r:.4f})", z.get("ease", "smooth"))
        terms.append(f"({s - 1:.4f})*{e}")
    return "1+" + "+".join(terms) if terms else "1"


def zoom_filters(zooms: list[dict], seg_start: float, seg_end: float, out_w: int, out_h: int) -> list[str]:
    """Punch-in: scale up per frame (eval=frame), then crop back to the output size around (cx, cy).

    Only zooms overlapping [seg_start, seg_end] are used. cx/cy of the zoom with the largest overlap are used for
    the whole piece (zoom centre does not move within one zoom).
    """
    zs = [z for z in zooms or [] if float(z["end"]) > seg_start and float(z["start"]) < seg_end]
    if not zs:
        return []
    cx = sum(float(z.get("cx", 0.5)) for z in zs) / len(zs)
    cy = sum(float(z.get("cy", 0.5)) for z in zs) / len(zs)
    zx = zoom_expr(zs, seg_start)
    # NB: crop's iw/ih keep the size from filter init, not the per-frame scaled size, so the zoomed size is
    # recomputed from the same expression instead of using iw/ih (iw/ih would pin the crop to the top-left corner).
    zw, zh = f"({out_w}*({zx}))", f"({out_h}*({zx}))"
    return [
        f"scale=w='trunc({zw}/2)*2':h='trunc({zh}/2)*2':eval=frame:flags=bicubic",
        f"crop={out_w}:{out_h}:x='max(0,min({zw}-{out_w},{cx:.4f}*{zw}-{out_w}/2))':"
        f"y='max(0,min({zh}-{out_h},{cy:.4f}*{zh}-{out_h}/2))'",
    ]


def atempo_chain(factor: float) -> str:
    """Pitch-preserving audio speed: atempo only accepts 0.5..100 per instance, so chain for slower speeds."""
    f = float(factor)
    parts: list[str] = []
    while f < 0.5:
        parts.append("atempo=0.5")
        f /= 0.5
    while f > 100:
        parts.append("atempo=100")
        f /= 100
    parts.append(f"atempo={f:.5f}")
    return ",".join(parts)
