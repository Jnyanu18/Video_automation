"""Recipes: a fixed list of editor tool calls, run in order with no LLM deciding anything.

A prompt asks a model to find the right steps; a recipe IS the steps. Same input video + same recipe = same edit, so the
best-working prompt for a kind of video can be frozen into a recipe and reused. Steps look like:

    {"tool": "cut_silences", "input": {"silences": "$silences", "min_silence": 0.25}}

`"$silences"` is replaced by the silences the previous `detect_silences` step wrote to the work folder.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

RECIPES_DIR = Path(__file__).resolve().parents[1] / "recipes"


class RecipeError(Exception):
    pass


def _resolve(value: Any, workdir: Path) -> Any:
    if value == "$silences":
        f = workdir / "silences.json"
        if not f.is_file():
            raise RecipeError("'$silences' used before a detect_silences step")
        return json.loads(f.read_text(encoding="utf-8")).get("silences", [])
    if isinstance(value, dict):
        return {k: _resolve(v, workdir) for k, v in value.items()}
    if isinstance(value, list):
        return [_resolve(v, workdir) for v in value]
    return value


def validate(steps: Any, tools: Dict[str, dict]) -> List[dict]:
    if not isinstance(steps, list) or not steps:
        raise RecipeError("a recipe is a non-empty list of steps")
    if len(steps) > 120:
        raise RecipeError("a recipe may have at most 120 steps")
    for i, st in enumerate(steps, 1):
        if not isinstance(st, dict) or "tool" not in st:
            raise RecipeError(f"step {i}: needs a 'tool'")
        if st["tool"] not in tools:
            raise RecipeError(f"step {i}: unknown tool {st['tool']!r}")
        if st["tool"] in ("render_final", "render_preview"):
            raise RecipeError(f"step {i}: rendering is not a recipe step (approval comes first)")
        if not isinstance(st.get("input", {}), dict):
            raise RecipeError(f"step {i}: 'input' must be an object")
    return steps


def run(plan: dict, steps: List[dict], tools: Dict[str, dict], workdir: str,
        call: Callable, normalize: Callable, on_step: Optional[Callable[[dict], None]] = None) -> Tuple[dict, List[dict]]:
    """Run the steps on `plan`. `call(spec, plan, args, workdir)` and `normalize(out)` are the agent loop's own helpers, so a
    recipe step behaves exactly like the same tool call made by the agent. Stops at the first failing step."""
    wd = Path(workdir)
    log: List[dict] = []
    for i, st in enumerate(steps, 1):
        entry = {"step": i, "tool": st["tool"], "ok": True, "warnings": []}
        try:
            out = normalize(call(tools[st["tool"]], plan, _resolve(st.get("input") or {}, wd), workdir))
            if out["plan"] is not None:
                plan = out["plan"]
            entry["warnings"] = list(out.get("warnings") or [])
            res = out.get("result")
            entry["summary"] = json.dumps(res, default=str)[:240] if res else ""
        except Exception as e:  # report which step broke; the earlier steps' plan is kept
            entry.update(ok=False, error=f"{type(e).__name__}: {e}")
            log.append(entry)
            if on_step:
                on_step(entry)
            raise RecipeError(f"step {i} ({st['tool']}) failed: {e}") from e
        log.append(entry)
        if on_step:
            on_step(entry)
    return plan, log


def list_saved() -> List[dict]:
    out = []
    for f in sorted(RECIPES_DIR.glob("*.json")) if RECIPES_DIR.is_dir() else []:
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
            out.append({"name": f.stem, "title": d.get("title", f.stem), "description": d.get("description", ""), "steps": len(d.get("steps", []))})
        except (OSError, ValueError):
            continue
    return out


def load_saved(name: str) -> dict:
    safe = "".join(c for c in name if c.isalnum() or c in "_-")
    f = RECIPES_DIR / f"{safe}.json"
    if not safe or not f.is_file():
        raise RecipeError(f"unknown recipe {name!r}")
    return json.loads(f.read_text(encoding="utf-8"))
