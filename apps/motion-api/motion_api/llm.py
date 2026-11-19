"""The model boundary.

Everything the agent loop needs from Claude goes through `LLMClient`, so the
loop can be driven by `FakeClient` in tests with no API key and no network.

API notes that are easy to get wrong (checked against the current API, not
from memory):
  * model is claude-opus-5-5
  * thinking is {"type": "adaptive"}; budget_tokens is REMOVED and 400s
  * effort must be set explicitly - this model defaults to "medium"
  * forced tool_choice ("any" / "tool") 400s on this model; use auto and steer
    from the prompt, keeping schemas honest with strict + additionalProperties
  * assistant prefill 400s
  * stop_reason can be "refusal"; check it before reading content
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Protocol

MODEL = "claude-opus-5-5"
MAX_TOKENS = 32000
EFFORT = "high"
FALLBACK_BETA = "server-side-fallback-2026-07-01"


@dataclass
class LLMResponse:
    content: list[Any]
    stop_reason: str | None = None
    stop_details: Any = None
    usage: Any = None

    def tool_uses(self) -> list[Any]:
        return [b for b in self.content if getattr(b, "type", None) == "tool_use"]

    def text(self) -> str:
        return "\n".join(b.text for b in self.content
                         if getattr(b, "type", None) == "text")


class LLMClient(Protocol):
    def create(self, *, system: list[dict], messages: list[dict],
               tools: list[dict]) -> LLMResponse: ...


class AnthropicClient:
    """The real client. Streams, because these responses are long."""

    def __init__(self, api_key: str | None = None) -> None:
        import anthropic  # imported lazily so tests need no SDK credentials
        self._anthropic = anthropic
        self._client = anthropic.Anthropic(api_key=api_key or os.environ.get("ANTHROPIC_API_KEY"))

    def create(self, *, system: list[dict], messages: list[dict],
               tools: list[dict]) -> LLMResponse:
        with self._client.beta.messages.stream(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=system,
            messages=messages,
            tools=tools,
            thinking={"type": "adaptive"},
            output_config={"effort": EFFORT},
            betas=[FALLBACK_BETA],
            fallbacks="default",
        ) as stream:
            msg = stream.get_final_message()
        return LLMResponse(
            content=list(msg.content),
            stop_reason=msg.stop_reason,
            stop_details=getattr(msg, "stop_details", None),
            usage=getattr(msg, "usage", None),
        )


# --------------------------------------------------------------------------
# Test double
# --------------------------------------------------------------------------

@dataclass
class FakeToolUse:
    name: str
    input: dict
    id: str = "tu_fake"
    type: str = "tool_use"


@dataclass
class FakeText:
    text: str
    type: str = "text"


@dataclass
class FakeClient:
    """Replays a scripted list of turns. Records what it was sent."""

    turns: list[LLMResponse] = field(default_factory=list)
    seen: list[dict] = field(default_factory=list)
    _i: int = 0

    def create(self, *, system: list[dict], messages: list[dict],
               tools: list[dict]) -> LLMResponse:
        self.seen.append({"system": system, "messages": [m for m in messages],
                          "tools": tools})
        if self._i >= len(self.turns):
            return LLMResponse(content=[FakeText("done")], stop_reason="end_turn")
        turn = self.turns[self._i]
        self._i += 1
        return turn


def tool_turn(name: str, payload: dict, tid: str = "tu_1") -> LLMResponse:
    return LLMResponse(content=[FakeToolUse(name=name, input=payload, id=tid)],
                       stop_reason="tool_use")


def final_turn(text: str = "finished") -> LLMResponse:
    return LLMResponse(content=[FakeText(text)], stop_reason="end_turn")
