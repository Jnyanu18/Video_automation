"""The agent loop: Claude directs a film, looks at its own frames, iterates.

A manual loop rather than the SDK tool runner, for one concrete reason: tool
results here carry IMAGE blocks so the model can see the frames it rendered,
and the runner's tool functions return plain strings.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from . import sandbox
from .kit import MAX_STILLS_PER_CALL, Renderer, Scorecard
from .llm import LLMClient, LLMResponse

MAX_ROUNDS = 12
MAX_FIX_ROUNDS = 1


def tool_schemas() -> list[dict]:
    """strict + additionalProperties:false, so tool inputs are schema-guaranteed."""
    return [
        {
            "name": "write_file",
            "description": (
                "Write one file in the film project. Allowed: src/film.tsx, score.py, "
                "plan.md, or a new file directly under src/kit/. Returns ok, or the errors."
            ),
            "strict": True,
            "input_schema": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "content": {"type": "string"},
                },
                "required": ["path", "content"],
                "additionalProperties": False,
            },
        },
        {
            "name": "build_audio",
            "description": "Run score.py to build the soundtrack. Returns measured LUFS and true peak.",
            "strict": True,
            "input_schema": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False,
            },
        },
        {
            "name": "render_stills",
            "description": (
                "Render up to 16 frames and return them as images for you to look at. "
                "Give the times in seconds."
            ),
            "strict": True,
            "input_schema": {
                "type": "object",
                "properties": {
                    "times": {
                        "type": "array",
                        "items": {"type": "number"},
                        "maxItems": MAX_STILLS_PER_CALL,
                    },
                },
                "required": ["times"],
                "additionalProperties": False,
            },
        },
        {
            "name": "render_final",
            "description": "Render the finished film at full resolution and return its scorecard.",
            "strict": True,
            "input_schema": {
                "type": "object",
                "properties": {"name": {"type": "string"}},
                "required": ["name"],
                "additionalProperties": False,
            },
        },
    ]


@dataclass
class Transcript:
    rounds: int = 0
    stills: list[float] = field(default_factory=list)
    scorecard: Scorecard | None = None
    final_path: str | None = None
    errors: list[str] = field(default_factory=list)
    stopped: str = ""


class Director:
    def __init__(
        self,
        client: LLMClient,
        renderer: Renderer,
        job_dir: Path,
        system_blocks: list[dict],
        on_event: Callable[[str, dict], None] | None = None,
    ) -> None:
        self.client = client
        self.renderer = renderer
        self.job_dir = Path(job_dir)
        self.system_blocks = system_blocks
        self.on_event = on_event or (lambda kind, data: None)

    # -- tool implementations -------------------------------------------
    def _write_file(self, args: dict) -> list[dict]:
        path = sandbox.write(self.job_dir, args["path"], args["content"])
        return [{"type": "text", "text": "ok: wrote " + path.name}]

    def _build_audio(self, args: dict) -> list[dict]:
        return [{"type": "text", "text": self.renderer.build_audio(self.job_dir)}]

    def _render_stills(self, args: dict) -> list[dict]:
        times = [float(t) for t in args["times"]]
        if len(times) > MAX_STILLS_PER_CALL:
            raise ValueError("at most %d stills per call" % MAX_STILLS_PER_CALL)
        blocks: list[dict] = []
        for still in self.renderer.render_stills(self.job_dir, times):
            blocks.extend(still.to_blocks())
        return blocks

    def _render_final(self, args: dict, t: Transcript) -> list[dict]:
        card = self.renderer.render_final(self.job_dir, args["name"])
        t.scorecard = card
        t.final_path = card.path
        body = {
            "path": card.path,
            "duration": card.duration,
            "fps": card.fps,
            "lufs": card.lufs,
            "peak": card.peak,
            "passes": card.ok,
        }
        if not card.ok:
            body["failures"] = card.failures()
        return [{"type": "text", "text": json.dumps(body)}]

    def _dispatch(self, use, t: Transcript) -> list[dict]:
        if use.name == "write_file":
            return self._write_file(use.input)
        if use.name == "build_audio":
            return self._build_audio(use.input)
        if use.name == "render_stills":
            blocks = self._render_stills(use.input)
            t.stills.extend(float(x) for x in use.input["times"])
            return blocks
        if use.name == "render_final":
            return self._render_final(use.input, t)
        raise ValueError("unknown tool " + repr(use.name))

    # -- the loop ---------------------------------------------------------
    def run(self, brief: str) -> Transcript:
        t = Transcript()
        messages: list[dict] = [{"role": "user", "content": brief}]
        tools = tool_schemas()
        fixes_used = 0

        while t.rounds < MAX_ROUNDS:
            t.rounds += 1
            resp: LLMResponse = self.client.create(
                system=self.system_blocks, messages=messages, tools=tools
            )

            # Check stop_reason before trusting content.
            if resp.stop_reason == "refusal":
                category = getattr(resp.stop_details, "category", None)
                t.stopped = "refusal"
                t.errors.append("model refused: " + str(category))
                return t
            if resp.stop_reason == "max_tokens":
                t.stopped = "max_tokens"
                t.errors.append("response hit max_tokens")
                return t

            uses = resp.tool_uses()
            if not uses:
                t.stopped = resp.stop_reason or "end_turn"
                failing = t.scorecard is not None and not t.scorecard.ok
                if failing and fixes_used < MAX_FIX_ROUNDS:
                    # One chance to fix a failing scorecard before giving up.
                    fixes_used += 1
                    messages.append({"role": "assistant", "content": resp.content})
                    messages.append(
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "The scorecard failed: "
                                    + "; ".join(t.scorecard.failures())
                                    + ". Fix it and render the final again.",
                                }
                            ],
                        }
                    )
                    t.stopped = ""
                    continue
                return t

            messages.append({"role": "assistant", "content": resp.content})

            # Every parallel tool_use gets a result, all in ONE user message.
            results: list[dict] = []
            for use in uses:
                try:
                    content = self._dispatch(use, t)
                    results.append(
                        {"type": "tool_result", "tool_use_id": use.id, "content": content}
                    )
                except Exception as exc:
                    # A tool failure is information for the model, not a crash.
                    t.errors.append(use.name + ": " + str(exc))
                    results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": use.id,
                            "content": [{"type": "text", "text": "Error: " + str(exc)}],
                            "is_error": True,
                        }
                    )
                self.on_event("tool", {"name": use.name})

            messages.append({"role": "user", "content": results})

        t.stopped = "max_rounds"
        return t
