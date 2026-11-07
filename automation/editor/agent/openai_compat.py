"""Use any OpenAI-compatible chat API (Gemini's OpenAI endpoint, OpenRouter, Ollama) as the agent's model.

The agent loop talks to `client.messages.create(model=..., system=..., tools=..., messages=...)` in Anthropic's shape and expects
Anthropic-shaped replies. This client translates both ways, so nothing else in the project changes.

    client = OpenAICompatClient(base_url="https://generativelanguage.googleapis.com/v1beta/openai", api_key=KEY, model="gemini-3.5-flash")
    run_agent(pid, "cut the silences", plan, tools, client)

Env helper: make_client_from_env() reads EDITOR_LLM (gemini|openrouter|ollama|custom), the provider's key
(GEMINI_API_KEY, OPENROUTER_API_KEY), EDITOR_LLM_MODEL, EDITOR_LLM_BASE_URL, EDITOR_LLM_VISION (1 if the model
accepts images). Keys can live in a `.env` file at the repo root (never commit it).

Honest limits: free/small models call tools less reliably than Claude. Text-only models cannot look at frames: `supports_vision`
is False and the review gate then relies on the objective scorecard only.
"""
from __future__ import annotations

import itertools
import json
import os
import time
from pathlib import Path
from typing import Any, Optional

import httpx

PROVIDERS = {
    "gemini": {"base_url": "https://generativelanguage.googleapis.com/v1beta/openai", "key_env": "GEMINI_API_KEY",
               "model": "gemini-3.5-flash", "vision": True},
    "openrouter": {"base_url": "https://openrouter.ai/api/v1", "key_env": "OPENROUTER_API_KEY",
                   "model": "meta-llama/llama-3.3-70b-instruct:free"},
    "ollama": {"base_url": "http://localhost:11434/v1", "key_env": None, "model": "qwen2.5:7b"},
}
_ids = itertools.count(1)
FINISH_TO_STOP = {"stop": "end_turn", "tool_calls": "tool_use", "length": "max_tokens", "function_call": "tool_use"}


class LLMError(RuntimeError):
    pass


def load_dotenv(path: str | Path | None = None) -> dict:
    """Tiny .env reader (KEY=VALUE per line, # comments). Existing environment variables win. Returns what it set."""
    p = Path(path) if path else Path(__file__).resolve().parents[1] / ".env"
    set_: dict = {}
    if not p.is_file():
        return set_
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v
            set_[k] = "***"
    return set_


# ---------------------------------------------------------------- Anthropic -> OpenAI
def convert_tools(tools: list | None) -> list:
    return [{"type": "function", "function": {"name": t["name"], "description": t.get("description", "")[:1024],
                                              "parameters": t.get("input_schema") or {"type": "object", "properties": {}}}}
            for t in tools or []]


def _text_of(content) -> str:
    if isinstance(content, str):
        return content
    return "\n".join(b.get("text", "") for b in content or [] if isinstance(b, dict) and b.get("type") == "text")


def _image_part(b: dict) -> dict:
    s = b["source"]
    return {"type": "image_url", "image_url": {"url": f"data:{s['media_type']};base64,{s['data']}"}}


def convert_messages(system: Optional[str], messages: list, vision: bool) -> list:
    """Anthropic content blocks -> OpenAI chat messages. tool_result -> role:tool; images follow as a user message."""
    out: list = [{"role": "system", "content": system}] if system else []
    for m in messages:
        role, content = m["role"], m["content"]
        if isinstance(content, str):
            out.append({"role": role, "content": content})
            continue
        if role == "assistant":
            calls = []
            for b in content:
                if b.get("type") != "tool_use":
                    continue
                call = {"id": b["id"], "type": "function",
                        "function": {"name": b["name"], "arguments": json.dumps(b.get("input") or {})}}
                if b.get("extra_content"):  # Gemini 3: thought_signature must be echoed back with the tool call
                    call["extra_content"] = b["extra_content"]
                calls.append(call)
            msg: dict = {"role": "assistant", "content": _text_of(content) or None}
            if calls:
                msg["tool_calls"] = calls
            out.append(msg)
            continue
        # user turn: tool results first (they must directly follow the assistant's tool_calls), then plain content
        images: list = []
        for b in content:
            if b.get("type") == "tool_result":
                inner = b.get("content")
                text = _text_of(inner) if not isinstance(inner, str) else inner
                if isinstance(inner, list):
                    images += [x for x in inner if isinstance(x, dict) and x.get("type") == "image"]
                if b.get("is_error"):
                    text = "ERROR: " + text
                out.append({"role": "tool", "tool_call_id": b["tool_use_id"], "content": text or "(empty)"})
        parts: list = []
        for b in content:
            if b.get("type") == "text":
                parts.append({"type": "text", "text": b["text"]})
            elif b.get("type") == "image":
                images.append(b)
        if images:
            if vision:
                parts = [{"type": "text", "text": "Frames from the previous tool result:"}] + [_image_part(i) for i in images] + parts
            else:
                parts.append({"type": "text", "text": f"[{len(images)} image(s) omitted: this model cannot see images]"})
        if parts:
            out.append({"role": "user", "content": parts if len(parts) > 1 or parts[0]["type"] != "text" else parts[0]["text"]})
    return out


# ---------------------------------------------------------------- OpenAI -> Anthropic
def convert_response(data: dict) -> dict:
    choice = (data.get("choices") or [{}])[0]
    msg = choice.get("message") or {}
    blocks: list = []
    if msg.get("content"):
        blocks.append({"type": "text", "text": msg["content"]})
    for tc in msg.get("tool_calls") or []:
        fn = tc.get("function") or {}
        raw = fn.get("arguments")
        try:
            args = json.loads(raw) if isinstance(raw, str) and raw.strip() else (raw or {})
            if not isinstance(args, dict):
                raise ValueError("arguments are not an object")
        except Exception:
            # malformed arguments: surface it as a tool error the model can read and retry, never crash the loop
            args = {"__invalid_arguments__": str(raw)[:300]}
        block = {"type": "tool_use", "id": tc.get("id") or f"call_{next(_ids)}", "name": fn.get("name", ""), "input": args}
        if tc.get("extra_content"):
            block["extra_content"] = tc["extra_content"]
        blocks.append(block)
    stop = FINISH_TO_STOP.get(choice.get("finish_reason") or "stop", "end_turn")
    if any(b["type"] == "tool_use" for b in blocks):
        stop = "tool_use"
    u = data.get("usage") or {}
    return {"content": blocks or [{"type": "text", "text": ""}], "stop_reason": stop,
            "usage": {"input_tokens": u.get("prompt_tokens", 0), "output_tokens": u.get("completion_tokens", 0)}}


class _Messages:
    def __init__(self, owner: "OpenAICompatClient"):
        self._o = owner

    def create(self, **kw):
        return self._o._create(**kw)


class OpenAICompatClient:
    def __init__(self, base_url: str, api_key: Optional[str], model: str, vision: bool = False, timeout: float = 120.0,
                 max_retries: int = 4, http: Optional[httpx.Client] = None, sleep=time.sleep):
        self.base_url, self.api_key, self.model = base_url.rstrip("/"), api_key, model
        self.supports_vision = bool(vision)
        self.max_retries = max_retries
        self._sleep = sleep
        self._http = http or httpx.Client(timeout=timeout)
        self.messages = _Messages(self)
        self.requests = 0

    def _post(self, body: dict) -> dict:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        for attempt in range(self.max_retries + 1):
            self.requests += 1
            try:
                r = self._http.post(f"{self.base_url}/chat/completions", json=body, headers=headers)
            except httpx.TransportError as e:
                if attempt == self.max_retries:
                    raise LLMError(f"cannot reach {self.base_url}: {e}") from e
                self._sleep(min(2 ** attempt, 20))
                continue
            if r.status_code == 200:
                return r.json()
            detail = r.text[:400]
            if r.status_code in (429, 500, 502, 503, 504) and attempt < self.max_retries:
                wait = r.headers.get("retry-after")
                self._sleep(min(float(wait), 60.0) if wait and wait.replace(".", "", 1).isdigit() else min(2 ** attempt * 2, 30))
                continue
            if r.status_code == 400 and "tool_use_failed" in detail and attempt < self.max_retries:
                self._sleep(0.5)  # the model emitted a malformed tool call; sampling again usually fixes it
                continue
            if r.status_code in (401, 403):
                raise LLMError(f"{r.status_code} from {self.base_url}: the API key was rejected. {detail}")
            raise LLMError(f"{r.status_code} from {self.base_url}: {detail}")
        raise LLMError("no response")

    def _create(self, *, model: Any = None, max_tokens: int = 2048, system: Optional[str] = None, tools: Optional[list] = None,
                messages: Optional[list] = None, **_) -> dict:
        body: dict = {"model": self.model, "messages": convert_messages(system, messages or [], self.supports_vision),
                      "max_tokens": min(int(max_tokens), 8192), "temperature": 0.2}
        if tools:
            body["tools"] = convert_tools(tools)
            body["tool_choice"] = "auto"
        return convert_response(self._post(body))

    def list_models(self) -> list[str]:
        r = self._http.get(f"{self.base_url}/models", headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else {})
        r.raise_for_status()
        return sorted(m["id"] for m in r.json().get("data", []))


def make_client_from_env(env=None) -> Optional[OpenAICompatClient]:
    """Client for EDITOR_LLM=<provider>, or None when EDITOR_LLM is unset. Raises LLMError for missing keys."""
    load_dotenv()
    e = env if env is not None else os.environ
    name = (e.get("EDITOR_LLM") or "").lower()
    if not name:
        return None
    cfg = PROVIDERS.get(name) or ({"base_url": e.get("EDITOR_LLM_BASE_URL", ""), "key_env": "EDITOR_LLM_API_KEY", "model": ""}
                                  if name == "custom" else None)
    if cfg is None:
        raise LLMError(f"unknown EDITOR_LLM={name!r}. Use one of: {', '.join(PROVIDERS)}, custom")
    key = e.get(cfg["key_env"]) if cfg["key_env"] else None
    if cfg["key_env"] and not key:
        raise LLMError(f"EDITOR_LLM={name} needs {cfg['key_env']} (put it in the environment or a .env file at the repo root)")
    base = e.get("EDITOR_LLM_BASE_URL") or cfg["base_url"]
    model = e.get("EDITOR_LLM_MODEL") or cfg["model"]
    if not base or not model:
        raise LLMError("custom provider needs EDITOR_LLM_BASE_URL and EDITOR_LLM_MODEL")
    vision = (e.get("EDITOR_LLM_VISION") or ("1" if cfg.get("vision") else "0")) in ("1", "true", "yes")
    return OpenAICompatClient(base, key, model, vision=vision)
