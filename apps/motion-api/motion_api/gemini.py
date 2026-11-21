"""Gemini behind the same `LLMClient` the director already speaks.

Gemini exposes an OpenAI-compatible surface, so this is a translation layer, not a
second agent loop. `director.py` is untouched: it keeps building Anthropic-style
blocks (`tool_use`, `tool_result`, base64 `image`) and this module converts them on
the way out and converts the reply back on the way in.

Three things here are easy to get wrong, and all three are load-bearing:

  * **Tool results cannot carry images.** In the OpenAI shape a `tool` message is
    text only. The director's whole method is looking at rendered frames, so the
    images inside a `tool_result` are lifted out and re-sent as a separate `user`
    message right after the tool messages. Drop that and the director goes blind
    while still believing it can see.
  * **Tool messages must directly follow the assistant turn that called them**,
    before any other user content, or the API rejects the exchange.
  * **The content blocks we hand back are read with `getattr`**, not `[]`
    (`LLMResponse.tool_uses`, and `use.id/.name/.input` in the director), so the
    reply is wrapped in small objects rather than returned as plain dicts.

Honest limits, since this is a downgrade from the model the skill was written for:
no prompt caching (the whole system prefix is re-sent every round), no thinking or
effort control, and the smaller Gemini models call tools less reliably and write
weaker long code. Prefer the largest model you have access to.
"""
from __future__ import annotations

import itertools
import json
import os
import time
from dataclasses import dataclass, field
from typing import Any

import httpx

from .llm import LLMResponse

BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"
DEFAULT_MODEL = "gemini-3.5-flash"
MAX_TOKENS = 32000
FINISH_TO_STOP = {
    "stop": "end_turn",
    "tool_calls": "tool_use",
    "function_call": "tool_use",
    "length": "max_tokens",
    "content_filter": "refusal",
}
_ids = itertools.count(1)


class GeminiError(RuntimeError):
    pass


# --------------------------------------------------------------- reply blocks
@dataclass
class ToolUseBlock:
    name: str
    input: dict
    id: str
    type: str = "tool_use"


@dataclass
class TextBlock:
    text: str
    type: str = "text"


# --------------------------------------------------------------- outbound
def _text_of(blocks: Any) -> str:
    if isinstance(blocks, str):
        return blocks
    if not isinstance(blocks, list):
        return ""
    return "\n".join(b.get("text", "") for b in blocks
                     if isinstance(b, dict) and b.get("type") == "text")


def _image_part(block: dict) -> dict:
    src = block.get("source") or {}
    return {"type": "image_url",
            "image_url": {"url": f"data:{src.get('media_type', 'image/jpeg')};base64,{src.get('data', '')}"}}


def _blocks_of(content: Any) -> list:
    """The director stores our own reply objects back as assistant content."""
    if isinstance(content, str):
        return [{"type": "text", "text": content}]
    out = []
    for b in content or []:
        if isinstance(b, dict):
            out.append(b)
        else:  # ToolUseBlock / TextBlock from a previous turn
            t = getattr(b, "type", None)
            if t == "tool_use":
                out.append({"type": "tool_use", "id": b.id, "name": b.name, "input": b.input})
            elif t == "text":
                out.append({"type": "text", "text": b.text})
    return out


def to_openai_messages(messages: list[dict]) -> list[dict]:
    out: list[dict] = []
    for m in messages:
        role, content = m.get("role"), m.get("content")
        blocks = _blocks_of(content)

        if role == "assistant":
            calls = []
            for b in blocks:
                if b.get("type") == "tool_use":
                    calls.append({
                        "id": b.get("id") or f"call_{next(_ids)}",
                        "type": "function",
                        "function": {"name": b.get("name", ""),
                                     "arguments": json.dumps(b.get("input") or {})},
                    })
            msg: dict = {"role": "assistant", "content": _text_of(blocks) or None}
            if calls:
                msg["tool_calls"] = calls
            out.append(msg)
            continue

        # A user turn. Tool results must come first and must directly follow the
        # assistant turn that asked for them.
        images: list = []
        for b in blocks:
            if b.get("type") != "tool_result":
                continue
            inner = b.get("content")
            text = inner if isinstance(inner, str) else _text_of(inner)
            if isinstance(inner, list):
                images += [x for x in inner
                           if isinstance(x, dict) and x.get("type") == "image"]
            if b.get("is_error"):
                text = "ERROR: " + text
            out.append({"role": "tool", "tool_call_id": b.get("tool_use_id", ""),
                        "content": text or "(empty)"})

        parts: list = []
        for b in blocks:
            if b.get("type") == "text":
                parts.append({"type": "text", "text": b["text"]})
            elif b.get("type") == "image":
                images.append(b)

        # The frames the director asked to see. A tool message cannot hold an
        # image, so they ride in their own user turn instead of being dropped.
        for img in images:
            parts.append(_image_part(img))
        if parts:
            out.append({"role": "user", "content": parts})
    return out


def to_openai_tools(tools: list[dict]) -> list[dict]:
    return [{"type": "function",
             "function": {"name": t["name"],
                          "description": t.get("description", ""),
                          "parameters": t.get("input_schema") or {"type": "object", "properties": {}}}}
            for t in tools]


# --------------------------------------------------------------- inbound
def from_openai(payload: dict) -> LLMResponse:
    choices = payload.get("choices") or []
    if not choices:
        raise GeminiError("the model returned no choices: " + json.dumps(payload)[:300])
    choice = choices[0]
    msg = choice.get("message") or {}
    blocks: list = []

    text = msg.get("content")
    if isinstance(text, list):  # some gateways return parts
        text = _text_of([p for p in text if isinstance(p, dict)])
    if text:
        blocks.append(TextBlock(text=text))

    for tc in msg.get("tool_calls") or []:
        fn = tc.get("function") or {}
        raw = fn.get("arguments") or "{}"
        try:
            args = json.loads(raw) if isinstance(raw, str) else dict(raw)
        except json.JSONDecodeError:
            args = {"_unparsed": raw}
        blocks.append(ToolUseBlock(name=fn.get("name", ""), input=args,
                                   id=tc.get("id") or f"call_{next(_ids)}"))

    stop = FINISH_TO_STOP.get(choice.get("finish_reason") or "", "end_turn")
    if any(getattr(b, "type", None) == "tool_use" for b in blocks):
        stop = "tool_use"
    return LLMResponse(content=blocks, stop_reason=stop,
                       usage=payload.get("usage"))


# --------------------------------------------------------------- the client
@dataclass
class GeminiClient:
    """Implements the same `create(...)` the director calls on the Anthropic client."""

    api_key: str | None = None
    model: str = field(default_factory=lambda: os.environ.get("MOTION_LLM_MODEL") or DEFAULT_MODEL)
    base_url: str = field(default_factory=lambda: (os.environ.get("MOTION_LLM_BASE_URL") or BASE_URL).rstrip("/"))
    timeout: float = 300.0
    max_retries: int = 3
    http: httpx.Client | None = None
    sleep: Any = time.sleep

    def __post_init__(self) -> None:
        self.api_key = self.api_key or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise GeminiError("GEMINI_API_KEY is not set")
        self._http = self.http or httpx.Client(timeout=self.timeout)

    def create(self, *, system: list[dict], messages: list[dict],
               tools: list[dict]) -> LLMResponse:
        body = {
            "model": self.model,
            "max_tokens": MAX_TOKENS,
            "messages": ([{"role": "system", "content": _text_of(system)}]
                         + to_openai_messages(messages)),
            "tools": to_openai_tools(tools),
            "tool_choice": "auto",
        }
        headers = {"authorization": f"Bearer {self.api_key}",
                   "content-type": "application/json"}
        last = ""
        for attempt in range(self.max_retries + 1):
            try:
                r = self._http.post(f"{self.base_url}/chat/completions",
                                    json=body, headers=headers)
            except httpx.TransportError as e:
                last = f"cannot reach {self.base_url}: {e}"
                if attempt == self.max_retries:
                    raise GeminiError(last) from e
                self.sleep(min(2 ** attempt, 20))
                continue
            if r.status_code == 200:
                return from_openai(r.json())
            last = f"{r.status_code}: {r.text[:300]}"
            if r.status_code in (408, 429, 500, 502, 503, 504) and attempt < self.max_retries:
                self.sleep(min(2 ** attempt, 20))
                continue
            raise GeminiError(last)
        raise GeminiError(last or "no response")
