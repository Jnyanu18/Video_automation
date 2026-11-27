"""givemotion rendering engine: an HTML composition in, an MP4 out, through the `givemotion` npm CLI (MIT).

An ADDITIONAL motion option next to studio/motion_reel.py (HyperFrames), studio/animator.py and apps/motion-api
(Remotion). None of those are replaced. This module is not yet wired to any HTTP route.

Isolation: every path comes from arguments. Nothing here reads the environment for paths; the only environment
lookup is the PATH search that finds npx.

Result shape for render_html and check_html: {"ok": bool, "output": str, "error": str, "result": dict | None}
  - render: "output" is the MP4 path; "result" is the CLI's --json object (frames, duration, encoder, ...)
  - check:  "output" is the raw stdout; "result" is the CLI's --json object (errors, warnings, issues, ...)
"""
from __future__ import annotations

import html
import json
import logging
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from brand import store as brand_store
from brand.store import BrandError

log = logging.getLogger("studio.givemotion")

PathLike = Union[str, Path]


# ---- brand kit (the real one: brand/store.py, work_dir/brand/kit.json) -----------------------------

FALLBACK_PALETTE = {"primary": "#0B1F3A", "accent": "#F5A623", "ink": "#FFFFFF"}
FALLBACK_FONT = "Inter"
_HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")
_FONT = re.compile(r"^[A-Za-z0-9 ]{1,40}$")


def load_account_kit(work_dir: PathLike, owner: str) -> Dict[str, Any]:
    """The account's brand kit as a plain dict, or {} when there is none, it belongs to someone else, or it is unreadable."""
    try:
        kit = brand_store.load_kit(Path(work_dir), owner)
    except BrandError as exc:
        log.warning("brand kit for %s cannot be used (%s); using built-in defaults", owner, exc)
        return {}
    return kit.model_dump(mode="json") if kit is not None else {}


def palette_tokens(kit: Dict[str, Any]) -> Dict[str, str]:
    """primary / accent / ink from the kit's palette roles. primary and accent come from roles of the same name;
    ink comes from the 'text' role. Anything missing or not a #RRGGBB colour falls back to the AILO palette."""
    out = dict(FALLBACK_PALETTE)
    swatches = ((kit or {}).get("visual") or {}).get("palette") or []
    by_role = {s.get("role"): s.get("hex") for s in swatches if isinstance(s, dict)}
    for token, role in (("primary", "primary"), ("accent", "accent"), ("ink", "text")):
        value = by_role.get(role)
        if isinstance(value, str) and _HEX.match(value):
            out[token] = value
    return out


def font_family(kit: Dict[str, Any]) -> str:
    """The kit's heading font. Only plain family names pass, because the name is written into CSS."""
    fonts = ((kit or {}).get("visual") or {}).get("fonts") or {}
    value = fonts.get("heading") if isinstance(fonts, dict) else None
    if isinstance(value, str) and _FONT.match(value.strip()):
        return value.strip()
    return FALLBACK_FONT


def logo_file(kit: Dict[str, Any]) -> Optional[Path]:
    """The kit's full logo when it names a local file that exists. Web URLs are not embedded."""
    value = (((kit or {}).get("visual") or {}).get("logo") or {}).get("full")
    if isinstance(value, str) and value and not re.match(r"^https?://", value, re.I) and Path(value).is_file():
        return Path(value)
    return None


def _npx() -> str:
    # On Windows npx is npx.cmd; shutil.which returns the full path so subprocess can run it without a shell.
    return shutil.which("npx") or "npx"


def cli() -> List[str]:
    """The command that runs givemotion: the installed binary when there is one (the engine image installs it
    globally, pinned), else npx, which uses the project's or npm's cached copy."""
    installed = shutil.which("givemotion")
    return [installed] if installed else [_npx(), "givemotion"]


def _run(args: List[str], timeout_s: int) -> Dict[str, Any]:
    cmd = [*cli(), *args, "--json"]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_s, check=False)
    except subprocess.TimeoutExpired:
        return {"ok": False, "output": "", "error": f"givemotion timed out after {timeout_s}s", "result": None}
    except OSError as exc:
        return {"ok": False, "output": "", "error": f"could not start npx: {exc}", "result": None}

    result: Optional[Dict[str, Any]] = None
    try:
        parsed = json.loads(proc.stdout or "")
        if isinstance(parsed, dict):
            result = parsed
    except json.JSONDecodeError:
        pass
    return {"proc": proc, "result": result}


def render_html(html_path: PathLike, out_path: PathLike, timeout_s: int = 900) -> dict:
    """Render one composition to an MP4 at out_path. Never raises for a failed render; check the "ok" flag."""
    html_path, out_path = Path(html_path), Path(out_path)
    if not html_path.is_file():
        return {"ok": False, "output": "", "error": f"composition not found: {html_path}", "result": None}
    out_path.parent.mkdir(parents=True, exist_ok=True)

    got = _run(["render", str(html_path), "-o", str(out_path)], timeout_s)
    if "proc" not in got:
        return got
    proc, result = got["proc"], got["result"]
    if proc.returncode != 0 or result is None:
        error = (proc.stderr or proc.stdout or "givemotion render failed with no output").strip()
        return {"ok": False, "output": "", "error": error[-2000:], "result": result}
    if not out_path.is_file():
        return {"ok": False, "output": "", "error": "givemotion reported success but no file was written", "result": result}
    return {"ok": True, "output": str(out_path), "error": "", "result": result}


def check_html(html_path: PathLike, timeout_s: int = 300) -> dict:
    """Run the composition checker. "ok" is False when the checker reports errors (warnings do not fail)."""
    html_path = Path(html_path)
    if not html_path.is_file():
        return {"ok": False, "output": "", "error": f"composition not found: {html_path}", "result": None}

    got = _run(["check", str(html_path)], timeout_s)
    if "proc" not in got:
        return got
    proc, result = got["proc"], got["result"]
    if result is None:
        error = (proc.stderr or proc.stdout or "givemotion check produced no JSON").strip()
        return {"ok": False, "output": proc.stdout or "", "error": error[-2000:], "result": None}
    ok = bool(result.get("ok")) and proc.returncode == 0
    return {"ok": ok, "output": proc.stdout or "", "error": "" if ok else f"{result.get('errors', '?')} error(s)", "result": result}


def build_title_card_html(brand_kit_data: Dict[str, Any], headline: str, cta: str, logo_path: Optional[PathLike] = None) -> str:
    """A minimal 1920x1080 title card: headline, accent rule, call to action.

    Colours and font come from the brand kit; with an empty kit they fall back to the AILO palette
    (#0B1F3A background, #F5A623 accent, Inter). The logo is embedded only if the kit names a file that exists.
    """
    kit = brand_kit_data or {}
    palette = palette_tokens(kit)
    font = font_family(kit)
    chosen = Path(logo_path) if logo_path is not None else logo_file(kit)
    logo_src = chosen.resolve().as_uri() if chosen is not None and chosen.is_file() else None

    logo_html = f'<img class="logo" src="{html.escape(logo_src, quote=True)}" alt="">' if logo_src else ""
    return f"""<!doctype html>
<html data-width="1920" data-height="1080" data-fps="30" data-duration="4">
<head>
<style>
  :root {{ --primary: {palette["primary"]}; --accent: {palette["accent"]}; --ink: {palette["ink"]}; }}
  body {{ background: var(--primary); color: var(--ink); font-family: "{font}", sans-serif; }}
  .scene {{ display: grid; place-items: center; }}
  .logo {{ position: absolute; top: 90px; left: 50%; height: 120px; margin-left: -60px; }}
  h1 {{ font-size: 200px; letter-spacing: -0.03em; margin: 0; font-weight: 800; }}
  .rule {{ position: absolute; left: 50%; top: 60%; width: 420px; height: 8px; margin-left: -210px; background: var(--accent); }}
  .cta {{ position: absolute; top: 70%; left: 0; right: 0; text-align: center; font-size: 56px; margin: 0; color: var(--accent); }}
</style>
</head>
<body>
  <section class="scene">
    {logo_html}
    <h1 id="headline">{html.escape(headline, quote=False)}</h1>
    <div class="rule"></div>
    <p class="cta" id="cta">{html.escape(cta, quote=False)}</p>
  </section>
  <script>
    gm.timeline('.scene')
      .from('#headline', {{ y: 80, opacity: 0, duration: 0.8, ease: 'expo.out' }}, 0.2)
      .from('.rule', {{ scaleX: 0, duration: 0.6, ease: 'power3.out' }}, 0.9)
      .from('#cta', {{ opacity: 0, y: 30, duration: 0.6, ease: 'power2.out' }}, 1.4);
  </script>
</body>
</html>
"""
