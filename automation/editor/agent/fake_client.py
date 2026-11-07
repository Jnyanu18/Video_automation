"""Scripted stand-in for anthropic.Anthropic, for tests and local demos (no API key needed)."""
from __future__ import annotations

import copy
import itertools
from types import SimpleNamespace
from typing import Callable, List, Union

_ids = itertools.count(1)


def text(s: str) -> dict:
    return {"type": "text", "text": s}


def tool_use(name: str, input: dict | None = None, id: str | None = None) -> dict:
    return {"type": "tool_use", "id": id or f"toolu_fake_{next(_ids)}", "name": name, "input": input or {}}


def response(*blocks, input_tokens: int = 100, output_tokens: int = 50, stop_reason: str | None = None) -> dict:
    blocks = [text(b) if isinstance(b, str) else b for b in blocks]
    if stop_reason is None:
        stop_reason = "tool_use" if any(b["type"] == "tool_use" for b in blocks) else "end_turn"
    return {"content": blocks, "stop_reason": stop_reason,
            "usage": {"input_tokens": input_tokens, "output_tokens": output_tokens}}


class _Messages:
    def __init__(self, owner):
        self._o = owner

    def create(self, **kwargs):
        return self._o._next(kwargs)


class FakeClient:
    """FakeClient([resp1, resp2, ...]). Each item is a response() dict, or a callable(request_kwargs)->response.
    Every request is recorded (deep-copied) in .calls. Running out of script raises AssertionError."""

    def __init__(self, script: List[Union[dict, Callable]]):
        self.script = list(script)
        self.calls: list = []
        self.messages = _Messages(self)

    def _next(self, kwargs):
        self.calls.append(copy.deepcopy(kwargs))
        if not self.script:
            raise AssertionError("FakeClient script exhausted (agent made more calls than scripted)")
        item = self.script.pop(0)
        return item(kwargs) if callable(item) else item
