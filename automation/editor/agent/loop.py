"""Claude tool-calling loop for the video editor.

run_agent(project_id, user_message, plan, tools, client) -> {"plan", "reply", "events", ...}
iter_agent(...) is the same loop as a generator of events (for SSE); the last item is {"type": "done", ...}.
"""
from __future__ import annotations

import copy
import inspect
import json
import os
import tempfile
import time
from typing import Any, Callable, Dict, Iterator, List, Optional

from . import review as rv
from .prompts import SYSTEM_PROMPT
from .registry import load_toolspecs, to_anthropic_tools

MODEL = "claude-sonnet-5-5"
# USD per million tokens. ASSUMPTION (not verified against a price list); override via pricing=.
DEFAULT_PRICING = {"input": 3.0, "output": 15.0, "cache_read": 0.3, "cache_write": 3.75}
MAX_RESULT_CHARS = 12000

BUILTIN_TOOLS = [
    {
        "name": "inspect_frames",
        "description": "Extract still frames from a video at the given times (seconds) and show them to you. "
                       "Use to check how captions, reframing or overlays actually look. Max 8 times.",
        "input_schema": {"type": "object", "properties": {
            "video": {"type": "string", "description": "Video path (e.g. a preview render or the source)."},
            "times": {"type": "array", "items": {"type": "number"}}},
            "required": ["video", "times"]},
    },
    {
        "name": "review_plan",
        "description": "Render a low-res preview of the CURRENT plan, sample frames across it and have a QA "
                       "reviewer check them. Returns pass/fail with specific issues. Limited number of rounds.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_plan",
        "description": "Return the current EditPlan JSON and its version.",
        "input_schema": {"type": "object", "properties": {}},
    },
]


# ---------- small helpers for SDK objects vs dicts ----------
def _g(o, k, default=None):
    return o.get(k, default) if isinstance(o, dict) else getattr(o, k, default)


def _block_to_dict(b) -> dict:
    t = _g(b, "type")
    if t == "text":
        return {"type": "text", "text": _g(b, "text", "")}
    if t == "tool_use":
        out = {"type": "tool_use", "id": _g(b, "id"), "name": _g(b, "name"), "input": dict(_g(b, "input") or {})}
        if _g(b, "extra_content"):  # provider metadata (Gemini thought_signature) that must be echoed back
            out["extra_content"] = _g(b, "extra_content")
        return out
    d = b if isinstance(b, dict) else getattr(b, "model_dump", lambda: {"type": t})()
    return d


class Usage:
    def __init__(self, pricing=None):
        self.pricing = {**DEFAULT_PRICING, **(pricing or {})}
        self.input_tokens = self.output_tokens = self.cache_read = self.cache_write = 0
        self.calls = 0

    def add(self, resp):
        u = _g(resp, "usage")
        self.calls += 1
        if not u:
            return
        self.input_tokens += _g(u, "input_tokens", 0) or 0
        self.output_tokens += _g(u, "output_tokens", 0) or 0
        self.cache_read += _g(u, "cache_read_input_tokens", 0) or 0
        self.cache_write += _g(u, "cache_creation_input_tokens", 0) or 0

    @property
    def cost_usd(self) -> float:
        p = self.pricing
        return round((self.input_tokens * p["input"] + self.output_tokens * p["output"]
                      + self.cache_read * p["cache_read"] + self.cache_write * p["cache_write"]) / 1e6, 6)

    def as_dict(self):
        return {"input_tokens": self.input_tokens, "output_tokens": self.output_tokens,
                "cache_read_tokens": self.cache_read, "cache_write_tokens": self.cache_write,
                "api_calls": self.calls, "cost_usd": self.cost_usd}


class PlanStore:
    """Holds the current plan and every version produced during the run."""

    def __init__(self, plan: dict):
        self.plan = copy.deepcopy(plan or {})
        # "version" is the EditPlan SCHEMA version (const 1, never touched here);
        # "revision" counts edits within a run. History entries use key "version" for the revision number.
        self.plan.setdefault("version", 1)
        self.plan.setdefault("revision", 1)
        self.versions = [{"version": self.plan["revision"], "tool": None, "plan": copy.deepcopy(self.plan)}]

    @property
    def version(self) -> int:
        return self.plan["revision"]

    def commit(self, new_plan: Optional[dict], tool: str) -> int:
        rev = self.version + 1
        nxt = copy.deepcopy(new_plan if isinstance(new_plan, dict) else self.plan)
        nxt.setdefault("version", 1)
        nxt["revision"] = rev
        self.plan = nxt
        self.versions.append({"version": rev, "tool": tool, "plan": copy.deepcopy(nxt)})
        return rev


def _call_tool(spec: dict, plan: dict, args: dict, workdir: str):
    fn = spec["fn"]
    args = dict(args or {})
    try:
        params = inspect.signature(fn).parameters
        takes_wd = "workdir" in params or any(p.kind == p.VAR_KEYWORD for p in params.values())
    except (TypeError, ValueError):
        takes_wd = False
    if takes_wd:
        args.setdefault("workdir", workdir)
    return fn(copy.deepcopy(plan), **args)


def _normalize(out) -> dict:
    """Accept the contract dict, or a bare path string (render_preview), or any other value."""
    if isinstance(out, dict) and ("plan" in out or "result" in out):
        return {"plan": out.get("plan"), "result": out.get("result", {}), "warnings": list(out.get("warnings") or [])}
    if isinstance(out, str):
        return {"plan": None, "result": {"path": out}, "warnings": []}
    return {"plan": None, "result": out if isinstance(out, dict) else {"value": out}, "warnings": []}


def _find_video(result) -> Optional[str]:
    if isinstance(result, dict):
        for k in ("path", "video", "output", "preview", "file", "mp4"):
            v = result.get(k)
            if isinstance(v, str) and os.path.exists(v):
                return v
    return None


def _clip(s: str, n: int = MAX_RESULT_CHARS) -> str:
    return s if len(s) <= n else s[:n] + f"... [truncated {len(s) - n} chars]"


def iter_agent(
    project_id: str,
    user_message: str,
    plan: dict,
    tools: Optional[Dict[str, dict]] = None,
    client: Any = None,
    *,
    workdir: Optional[str] = None,
    history: Optional[List[dict]] = None,
    model: str = MODEL,
    max_iterations: int = 15,
    max_review_rounds: int = 3,
    max_claim_checks: int = 2,
    max_tokens: int = 4096,
    max_cost_usd: Optional[float] = None,
    pricing: Optional[dict] = None,
    render: Optional[Callable] = None,
    system_prompt: str = SYSTEM_PROMPT,
) -> Iterator[dict]:
    """Generator version of the loop. Yields event dicts; final item has type 'done' and the result."""
    if client is None:
        import anthropic  # real client only when nothing injected (needs ANTHROPIC_API_KEY)
        client = anthropic.Anthropic()
    specs = dict(tools) if tools is not None else load_toolspecs()
    workdir = workdir or tempfile.mkdtemp(prefix=f"agent_{project_id}_")
    os.makedirs(workdir, exist_ok=True)
    store = PlanStore(plan)
    usage = Usage(pricing)
    tool_list = to_anthropic_tools(specs) + [t for t in BUILTIN_TOOLS if t["name"] not in specs]
    messages: List[dict] = list(history or []) + [{"role": "user", "content": user_message}]
    review_rounds = 0
    claim_checks = 0
    reviews: List[dict] = []
    reply_parts: List[str] = []
    stop_reason = "end_turn"
    seq = [0]

    def ev(type_, **kw):
        seq[0] += 1
        return {"type": type_, "seq": seq[0], "ts": round(time.time(), 3), "project_id": project_id, **kw}

    def render_preview(p):
        fn = render
        if fn is None and "render_preview" in specs:
            spec = specs["render_preview"]
            fn = lambda pl, wd: _normalize(_call_tool(spec, pl, {}, wd))["result"]  # noqa: E731
        if fn is None:
            raise RuntimeError("no render_preview tool available")
        out = fn(copy.deepcopy(p), workdir)
        out = out if isinstance(out, dict) else {"path": out}
        v = _find_video(out)
        if not v:
            raise RuntimeError(f"render_preview did not produce a video file: {out!r}")
        return v

    system = system_prompt + "\n\nProject id: %s. Current plan version: %d." % (project_id, store.version)
    system += "\nCurrent EditPlan:\n" + _clip(json.dumps(rv.plan_digest(store.plan), default=str), 5000)

    for it in range(max_iterations):
        if max_cost_usd is not None and usage.cost_usd >= max_cost_usd:
            stop_reason = "cost_limit"
            break
        resp = client.messages.create(model=model, max_tokens=max_tokens, system=system,
                                      tools=tool_list, messages=messages)
        usage.add(resp)
        blocks = [_block_to_dict(b) for b in _g(resp, "content", [])]
        messages.append({"role": "assistant", "content": blocks})
        turn_text = "\n".join(b["text"] for b in blocks if b["type"] == "text" and b["text"].strip())
        if turn_text:
            reply_parts.append(turn_text)
            yield ev("message", text=turn_text, role="assistant")
        uses = [b for b in blocks if b["type"] == "tool_use"]
        if not uses:
            # claims check: the reply must not say something was done that the plan does not contain (weaker models do this)
            wrong = rv.verify_claims(turn_text, store.plan) if claim_checks < max_claim_checks else []
            if wrong:
                claim_checks += 1
                if reply_parts and reply_parts[-1] == turn_text:
                    reply_parts.pop()  # the unverified reply is replaced by the corrected one
                yield ev("claim_check", problems=wrong, attempt=claim_checks)
                messages.append({"role": "user", "content": (
                    "Automatic check before answering: your reply says you did " + ", ".join(wrong) + ", but the current plan "
                    "does not contain it (nothing in the tool results confirms it). Either call the right tool(s) now to really "
                    "do it, or correct your reply to say it was NOT done. Only report what the plan contains.")})
                continue
            stop_reason = _g(resp, "stop_reason", "end_turn") or "end_turn"
            break

        results = []
        for u in uses:
            name, args, uid = u["name"], u["input"], u["id"]
            yield ev("tool_started", id=uid, name=name, input=args)
            ok, warnings, version, images = True, [], None, []
            try:
                if isinstance(args, dict) and "__invalid_arguments__" in args:
                    # the model's arguments were not valid JSON (adapter marker). Never run the tool with guessed defaults:
                    # most tools ignore unknown keys, so this would silently apply an edit nobody asked for.
                    raise ValueError("the arguments of this tool call were not valid JSON "
                                     f"({str(args['__invalid_arguments__'])[:120]!r}). Call the tool again with a valid JSON object.")
                if name == "get_plan":
                    payload = {"plan": store.plan, "version": store.version}
                elif name == "inspect_frames" and "inspect_frames" not in specs:
                    r = rv.inspect_frames(args.get("video"), args.get("times"), workdir)
                    images = r["images"]
                    payload = {"result": {k: v for k, v in r.items() if k != "images"}, "frames": len(images)}
                elif name == "review_plan" and "review_plan" not in specs:
                    if review_rounds >= max_review_rounds:
                        payload = {"passed": False, "limit_reached": True, "rounds_used": review_rounds,
                                   "message": "Review limit reached. Stop reviewing; tell the user what is still unresolved."}
                    else:
                        review_rounds += 1
                        video = render_preview(store.plan)
                        card = rv.run_scorecard(store.plan, workdir)
                        verdict = rv.review_once(client=client, model=model, plan=store.plan, video=video,
                                                 workdir=workdir, round_no=review_rounds, on_usage=usage.add,
                                                 scorecard=card)
                        images = verdict.pop("frames", [])
                        # the gate needs BOTH: the visual reviewer passes and the objective scorecard has no FAIL
                        card_ok = not card.get("available") or card["overall"] != "FAIL"
                        verdict["pass"] = bool(verdict["pass"]) and card_ok
                        verdict["issues"] = rv.scorecard_issues(card) + verdict["issues"]
                        reviews.append({"round": review_rounds, "pass": verdict["pass"], "issues": verdict["issues"],
                                        "scorecard": card})
                        payload = {"passed": verdict["pass"], "issues": verdict["issues"], "round": review_rounds,
                                   "rounds_left": max_review_rounds - review_rounds, "preview": verdict.get("preview"),
                                   "scorecard": card}
                        yield ev("scorecard", round=review_rounds, **{k: v for k, v in card.items() if k != "skipped"})
                        if not verdict["pass"] and review_rounds < max_review_rounds:
                            payload["next"] = "Fix the issues with tools, then call review_plan again."
                        elif not verdict["pass"]:
                            payload["next"] = "Review limit reached; summarise remaining issues to the user."
                        images = []  # the reviewer already saw them; keep the main context small
                elif name in specs:
                    out = _normalize(_call_tool(specs[name], store.plan, args, workdir))
                    version = store.commit(out["plan"], name)
                    warnings = out["warnings"]
                    res = out["result"]
                    if isinstance(res, dict) and isinstance(res.get("images"), list):
                        images = [p for p in res["images"] if isinstance(p, str) and os.path.exists(p)][:8]
                    payload = {"result": res, "warnings": warnings, "plan_version": version}
                else:
                    raise KeyError(f"unknown tool '{name}'. Available: {sorted(s['name'] for s in tool_list)}")
            except Exception as e:  # tool failures go back to Claude, never crash the loop
                ok = False
                payload = {"error": f"{type(e).__name__}: {e}"}
            text_out = _clip(json.dumps(payload, default=str))
            content: Any = text_out
            if images:
                try:
                    content = [{"type": "text", "text": text_out}] + [rv.image_block(p) for p in images]
                except OSError as e:
                    content = text_out + f"\n(could not attach images: {e})"
            results.append({"type": "tool_result", "tool_use_id": uid, "content": content, **({} if ok else {"is_error": True})})
            yield ev("tool_finished", id=uid, name=name, ok=ok, plan_version=version if version else store.version,
                     plan_changed=version is not None, warnings=warnings, summary=_clip(text_out, 300))
            if version is not None:
                yield ev("plan_version", version=version, tool=name)
        messages.append({"role": "user", "content": results})
    else:
        stop_reason = "max_iterations"

    reply = reply_parts[-1] if stop_reason in ("end_turn", "stop_sequence") and reply_parts else "\n\n".join(reply_parts)
    if stop_reason == "max_iterations":
        reply = (reply + "\n\n" if reply else "") + (
            f"(I stopped after {max_iterations} steps. The plan is at version {store.version}; "
            "tell me to continue if you want me to keep going.)")
    elif stop_reason == "cost_limit":
        reply = (reply + "\n\n" if reply else "") + "(Stopped: cost limit reached.)"
    elif stop_reason == "max_tokens" and not reply:
        reply = "(The response was cut off; please try again.)"
    final = {"plan": store.plan, "reply": reply, "stop_reason": stop_reason, "usage": usage.as_dict(),
             "versions": store.versions, "reviews": reviews, "messages": messages}
    yield ev("usage", **usage.as_dict())
    yield {"type": "done", "result": final}


def run_agent(project_id: str, user_message: str, plan: dict, tools: Optional[Dict[str, dict]] = None,
              client: Any = None, *, on_event: Optional[Callable[[dict], None]] = None, **kw) -> dict:
    """Blocking entry point per CONTRACT: returns {"plan", "reply", "events", ...extras}.
    on_event(event) is called live for every event (hook it to SSE). tools=None loads from tools.*/services.render."""
    events: List[dict] = []
    final = None
    for e in iter_agent(project_id, user_message, plan, tools, client, **kw):
        if e["type"] == "done":
            final = e["result"]
            break
        events.append(e)
        if on_event:
            try:
                on_event(e)
            except Exception:
                pass  # a broken SSE consumer must not kill the edit
    final = dict(final)
    final["events"] = events
    return final
