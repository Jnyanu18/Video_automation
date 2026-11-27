"""Claude as an editing step: one API call turns a transcript (plus silences, scenes, a scorecard and sampled frames) into the
director plan that the auto-edit flow validates and renders. Any failure falls back to the Gemini path, so a job never crashes here.

Environment:
    EDITOR_LLM=claude            (alias of anthropic) selects Claude as the editor's brain
    ANTHROPIC_API_KEY            the Claude key (read from the environment or the editor's .env; never printed)
    EDITOR_CLAUDE_MODEL          model id, default claude-sonnet-5-5
    GEMINI_API_KEY               the fallback when Claude has no key or a call fails

The output is the director plan (hook, speaker, beats, zooms, sfx, cta). `director.clean` repairs or drops anything invalid,
and the caller's recipe validation checks the steps before any render. The human approval and scorecard gates are unchanged.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Iterable, List, Optional, Sequence, Tuple

from studio import director

log = logging.getLogger("studio.claude_director")

DEFAULT_MODEL = "claude-sonnet-5-5"
CLAUDE_EDITOR_NAMES = ("claude", "anthropic")
MAX_FRAMES = 6
MAX_TOKENS = 2500
TIMEOUT_S = 120.0
MAX_SILENCES_SHOWN = 40
MAX_SCENES_SHOWN = 40
PLANNER_LABEL = {"claude": "Claude director", "llm": "LLM director"}

EXTRA_SYSTEM = """
You also receive the silences that were removed from the source, its scene boundaries, the scorecard of the previous cut
(when there is one), and a few sampled frames with their times. Use them to place beats on moments that are visible in the frames,
and never plan a beat over a removed silence. Frames show what is on screen; the transcript is still the only source of facts."""


class ClaudeDirectorError(RuntimeError):
    """Claude could not produce a usable plan. Callers fall back; this never reaches the job as a crash."""


# ------------------------------------------------------------------------------------------- configuration
def claude_selected(env: Optional[dict] = None) -> bool:
    e = os.environ if env is None else env
    return (e.get("EDITOR_LLM") or "").strip().lower() in CLAUDE_EDITOR_NAMES


def model_name(env: Optional[dict] = None) -> str:
    e = os.environ if env is None else env
    return ((e.get("EDITOR_CLAUDE_MODEL") or "").strip()
            or (e.get("EDITOR_AGENT_MODEL") or "").strip()
            or DEFAULT_MODEL)


def is_claude_client(client: Any) -> bool:
    return client is not None and type(client).__module__.startswith("anthropic")


def make_client(env: Optional[dict] = None) -> Any:
    """Anthropic client from ANTHROPIC_API_KEY, or None when there is no key or the SDK is missing."""
    e = os.environ if env is None else env
    key = (e.get("ANTHROPIC_API_KEY") or "").strip()
    if not key:
        return None
    try:
        import anthropic
    except ImportError as exc:
        log.warning("anthropic SDK not installed: %s", exc)
        return None
    client = anthropic.Anthropic(api_key=key, timeout=TIMEOUT_S, max_retries=2)
    client.model = model_name(e)
    return client


def gemini_fallback_client(env: Optional[dict] = None) -> Any:
    """The Gemini client used when Claude is missing or fails, or None when GEMINI_API_KEY is not set."""
    e = os.environ if env is None else env
    key = (e.get("GEMINI_API_KEY") or "").strip()
    if not key:
        return None
    try:
        from agent.openai_compat import PROVIDERS, OpenAICompatClient
    except ImportError as exc:
        log.warning("openai-compatible client unavailable: %s", exc)
        return None
    cfg = PROVIDERS["gemini"]
    return OpenAICompatClient(cfg["base_url"], key, cfg["model"], vision=bool(cfg.get("vision")))


# ------------------------------------------------------------------------------------------- inputs
def removed_gaps(keep: Sequence[dict]) -> List[Tuple[float, float]]:
    """Silences cut out of the source: the gaps between consecutive kept ranges."""
    ordered = sorted((float(k["start"]), float(k["end"])) for k in keep or [])
    return [(a[1], b[0]) for a, b in zip(ordered, ordered[1:]) if b[0] > a[1]]


def _scorecard_summary(scorecard: Optional[dict]) -> Optional[str]:
    if not scorecard:
        return None
    keep = {k: scorecard[k] for k in ("status", "score", "failed_checks", "warnings") if k in scorecard}
    return json.dumps(keep, ensure_ascii=False)


def build_context(sents: List[dict], duration: float, style: str, instruction: str, sfx_names: List[str], *,
                  silences: Optional[Iterable[Tuple[float, float]]] = None, scenes: Optional[Iterable[Tuple[float, float]]] = None,
                  scorecard: Optional[dict] = None) -> str:
    """The text part of the request: the director's transcript message plus whatever structure is known."""
    parts = [director.build_message(sents, duration, style, instruction, sfx_names)]
    sil = [(float(a), float(b)) for a, b in (silences or [])][:MAX_SILENCES_SHOWN]
    if sil:
        parts.append("Removed silences (start-end, seconds): " + ", ".join(f"{a:.2f}-{b:.2f}" for a, b in sil))
    sc = [(float(a), float(b)) for a, b in (scenes or [])][:MAX_SCENES_SHOWN]
    if sc:
        parts.append("Scene boundaries (start-end, seconds): " + ", ".join(f"{a:.2f}-{b:.2f}" for a, b in sc))
    summary = _scorecard_summary(scorecard)
    if summary:
        parts.append("Scorecard of the previous cut: " + summary)
    return "\n\n".join(parts)


def build_content(context: str, frames: Optional[Sequence[Tuple[float, str]]] = None) -> List[dict]:
    """User message blocks: the context text, then up to MAX_FRAMES sampled frames, each labelled with its time."""
    from agent.review import image_block

    blocks: List[dict] = [{"type": "text", "text": context}]
    for t, path in list(frames or [])[:MAX_FRAMES]:
        if not path or not os.path.isfile(path):
            continue
        blocks.append({"type": "text", "text": f"Frame at {float(t):.2f} s:"})
        blocks.append(image_block(path))
    return blocks


# ------------------------------------------------------------------------------------------- the call
def _text_of(resp: Any) -> str:
    blocks = resp.get("content", []) if isinstance(resp, dict) else (getattr(resp, "content", None) or [])
    return "".join((b.get("text", "") if isinstance(b, dict) else (getattr(b, "text", "") or "")) for b in blocks).strip()


def _ask(client: Any, messages: List[dict], model: str) -> str:
    try:
        resp = client.messages.create(model=model, system=director.SYSTEM + EXTRA_SYSTEM, messages=messages, max_tokens=MAX_TOKENS)
    except Exception as exc:
        raise ClaudeDirectorError(f"Claude call failed: {type(exc).__name__}: {str(exc)[:200]}") from exc
    return _text_of(resp)


RUBRIC = """You judge candidate edit plans for one short vertical reel, against the transcript. Score each candidate from 0 to 10 for
how well it will keep a viewer watching:
- the hook lands in the first 3 seconds and opens a curiosity gap;
- the rehook around 25-40% gives a reason to keep watching;
- the diagrams show what is said, spread across the video, not clumped;
- every claim and number in the plan appears in the transcript (a made-up number scores 0 for the plan);
- the closing call to action is one clear next step.
Reply with ONLY JSON: {"scores": [{"candidate": 1, "score": 0}, ...]}"""


def candidate_count(env: Optional[dict] = None) -> int:
    """How many plans Claude drafts before picking the best. EDITOR_PLAN_CANDIDATES, 1 (off) to 3. Each extra candidate costs a model call."""
    e = os.environ if env is None else env
    try:
        n = int(str(e.get("EDITOR_PLAN_CANDIDATES") or "1").strip())
    except ValueError:
        n = 1
    return max(1, min(3, n))


def pick_best(client: Any, plans: List[dict], sents: List[dict], model: Optional[str] = None) -> Tuple[int, str]:
    """(index of the best plan, note). Falls back to the first plan when the judge cannot answer clearly."""
    model = model or getattr(client, "model", None) or model_name()
    transcript = "\n".join(f"[{s['start']:.1f}] {s['text']}" for s in sents)[:4000]
    body = "Transcript:\n" + transcript + "\n\n" + "\n\n".join(
        f"Candidate {i + 1}:\n{json.dumps(p, default=str)[:4000]}" for i, p in enumerate(plans))
    try:
        resp = client.messages.create(model=model, system=RUBRIC, messages=[{"role": "user", "content": body}], max_tokens=400)
        text = _text_of(resp)
    except Exception as exc:
        return 0, f"judge unavailable ({type(exc).__name__})"
    d = director._json(text) or {}
    try:
        scores = {int(s["candidate"]): float(s["score"]) for s in d.get("scores", [])}
    except (TypeError, KeyError, ValueError):
        return 0, "judge reply unreadable"
    if not scores:
        return 0, "judge gave no scores"
    best = max(range(len(plans)), key=lambda i: scores.get(i + 1, -1.0))
    return best, f"judge score {scores.get(best + 1)}/10"


def plan_best_of(client: Any, sents: List[dict], duration: float, style: str, instruction: str, sfx_names: List[str], n: int, **kw) -> Tuple[dict, List[str]]:
    """Draft n plans with Claude, let Claude judge them, return the best. Failed drafts are skipped with a warning."""
    plans: List[dict] = []
    warn: List[str] = []
    for _ in range(n):
        try:
            p, w = plan_with_claude(client, sents, duration, style, instruction, sfx_names, **kw)
            plans.append(p)
            warn += w
        except ClaudeDirectorError as exc:
            warn.append(f"a candidate plan failed: {exc}")
    if not plans:
        raise ClaudeDirectorError("no candidate plan could be drafted")
    if len(plans) == 1:
        return plans[0], warn
    idx, note = pick_best(client, plans, sents)
    return plans[idx], warn + [f"best of {len(plans)} drafted plans: #{idx + 1} ({note})"]


def plan_with_claude(client: Any, sents: List[dict], duration: float, style: str, instruction: str, sfx_names: List[str], *,
                     frames: Optional[Sequence[Tuple[float, str]]] = None, silences: Optional[Iterable[Tuple[float, float]]] = None,
                     scenes: Optional[Iterable[Tuple[float, float]]] = None, scorecard: Optional[dict] = None,
                     model: Optional[str] = None) -> Tuple[dict, List[str]]:
    """(plan, warnings) from Claude. One retry when the reply is not a JSON object. Raises ClaudeDirectorError otherwise."""
    if not sents:
        raise ClaudeDirectorError("the transcript has no speech")
    model = model or getattr(client, "model", None) or model_name()
    context = build_context(sents, duration, style, instruction, sfx_names, silences=silences, scenes=scenes, scorecard=scorecard)
    messages: List[dict] = [{"role": "user", "content": build_content(context, frames)}]
    for _attempt in range(2):
        text = _ask(client, messages, model)
        raw = director._json(text)
        if raw is None:
            messages += [{"role": "assistant", "content": text or "(empty)"},
                         {"role": "user", "content": "That was not a single valid JSON object. Reply with ONLY the JSON object."}]
            continue
        plan, warn = director.clean(raw, duration, sents, sfx_names)
        if plan["hook"] and (plan["beats"] or len(sents) < 4):
            return plan, warn
        raise ClaudeDirectorError("the plan had no hook or no usable diagram beats")
    raise ClaudeDirectorError("Claude did not return a JSON plan")


def plan_edit(client: Any, transcript: dict, duration: float, style: str, instruction: str, sfx_names: List[str], *,
              frames: Optional[Sequence[Tuple[float, str]]] = None, silences: Optional[Iterable[Tuple[float, float]]] = None,
              scenes: Optional[Iterable[Tuple[float, float]]] = None, scorecard: Optional[dict] = None,
              fallback: Any = None) -> Tuple[dict, str, List[str]]:
    """(plan, source, warnings). source is 'claude', 'llm' (Gemini) or 'heuristic'.

    With a Claude client, Claude plans first. If Claude fails, the Gemini client (`fallback`, or GEMINI_API_KEY) plans, and
    then the heuristic planner. With any other client, this is exactly director.make_plan.
    """
    sents = director.sentences(transcript)
    if not sents:
        raise ValueError("the transcript has no speech, so there is nothing to direct (silent footage needs a hand-written recipe)")
    warn: List[str] = []
    if is_claude_client(client):
        try:
            kw = dict(frames=frames, silences=silences, scenes=scenes, scorecard=scorecard)
            n = candidate_count()
            if n > 1:
                plan, w = plan_best_of(client, sents, duration, style, instruction, sfx_names, n, **kw)
            else:
                plan, w = plan_with_claude(client, sents, duration, style, instruction, sfx_names, **kw)
            return plan, "claude", w
        except ClaudeDirectorError as exc:
            log.warning("Claude planning failed, falling back: %s", exc)
            warn.append(f"Claude could not plan this edit ({exc}); used the fallback planner")
            client = fallback if fallback is not None else gemini_fallback_client()
    plan, source, w = director.make_plan(client, transcript, duration, style, instruction, sfx_names)
    return plan, source, warn + w
