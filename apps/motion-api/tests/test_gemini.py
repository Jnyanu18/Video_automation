"""The Gemini translation layer. No network: a fake transport answers every call."""
import base64
import json

import httpx
import pytest

from motion_api.gemini import (
    GeminiClient,
    GeminiError,
    from_openai,
    to_openai_messages,
    to_openai_tools,
)

IMG = {"type": "image",
       "source": {"type": "base64", "media_type": "image/jpeg",
                  "data": base64.b64encode(b"jpeg-bytes").decode()}}


def reply(content=None, tool_calls=None, finish="stop"):
    msg = {"content": content}
    if tool_calls:
        msg["tool_calls"] = tool_calls
    return {"choices": [{"message": msg, "finish_reason": finish}]}


def client_with(payloads, status=200):
    seen = []
    it = iter(payloads)

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(json.loads(request.content))
        return httpx.Response(status, json=next(it))

    c = GeminiClient(api_key="k", http=httpx.Client(transport=httpx.MockTransport(handler)),
                     sleep=lambda *_: None)
    return c, seen


# ----------------------------------------------------------------- outbound
def test_a_plain_brief_becomes_a_user_message():
    out = to_openai_messages([{"role": "user", "content": "make a film"}])
    assert out == [{"role": "user", "content": [{"type": "text", "text": "make a film"}]}]


def test_a_tool_call_becomes_openai_tool_calls():
    msgs = [{"role": "assistant",
             "content": [{"type": "tool_use", "id": "tu_1", "name": "write_file",
                          "input": {"path": "src/film.tsx", "content": "x"}}]}]
    out = to_openai_messages(msgs)
    call = out[0]["tool_calls"][0]
    assert call["id"] == "tu_1" and call["function"]["name"] == "write_file"
    assert json.loads(call["function"]["arguments"])["path"] == "src/film.tsx"


def test_a_tool_result_becomes_a_tool_message_before_any_user_content():
    msgs = [{"role": "user",
             "content": [{"type": "tool_result", "tool_use_id": "tu_1",
                          "content": [{"type": "text", "text": "ok"}]},
                         {"type": "text", "text": "now look"}]}]
    out = to_openai_messages(msgs)
    assert out[0]["role"] == "tool" and out[0]["tool_call_id"] == "tu_1"
    assert out[1]["role"] == "user"


def test_frames_inside_a_tool_result_are_re_sent_as_images():
    """The director's method is looking at frames. A `tool` message is text only,
    so the images must be lifted out rather than silently dropped."""
    msgs = [{"role": "user",
             "content": [{"type": "tool_result", "tool_use_id": "tu_1",
                          "content": [{"type": "text", "text": "t=1.00s"}, IMG]}]}]
    out = to_openai_messages(msgs)
    assert out[0]["role"] == "tool"
    imgs = [p for p in out[1]["content"] if p["type"] == "image_url"]
    assert len(imgs) == 1
    assert imgs[0]["image_url"]["url"].startswith("data:image/jpeg;base64,")


def test_an_error_result_is_marked_for_the_model():
    msgs = [{"role": "user",
             "content": [{"type": "tool_result", "tool_use_id": "tu_1", "is_error": True,
                          "content": [{"type": "text", "text": "bundle failed"}]}]}]
    assert to_openai_messages(msgs)[0]["content"].startswith("ERROR: ")


def test_tools_keep_their_schema():
    t = to_openai_tools([{"name": "render_stills", "description": "d",
                          "input_schema": {"type": "object", "properties": {"times": {"type": "array"}}}}])
    assert t[0]["function"]["name"] == "render_stills"
    assert t[0]["function"]["parameters"]["properties"]["times"]["type"] == "array"


# ----------------------------------------------------------------- inbound
def test_a_text_reply_reads_as_text():
    r = from_openai(reply(content="all done"))
    assert r.text() == "all done" and r.stop_reason == "end_turn"


def test_a_tool_call_reply_is_readable_with_getattr():
    """LLMResponse.tool_uses and the director read blocks with getattr, not [...]."""
    r = from_openai(reply(tool_calls=[{"id": "c1", "function": {
        "name": "render_final", "arguments": '{"name": "film.mp4"}'}}], finish="tool_calls"))
    use = r.tool_uses()[0]
    assert use.name == "render_final" and use.input == {"name": "film.mp4"} and use.id == "c1"
    assert r.stop_reason == "tool_use"


def test_unparsable_arguments_do_not_crash_the_loop():
    r = from_openai(reply(tool_calls=[{"id": "c1", "function": {"name": "x", "arguments": "{oops"}}]))
    assert r.tool_uses()[0].input["_unparsed"] == "{oops"


def test_a_reply_with_no_choices_is_an_error():
    with pytest.raises(GeminiError):
        from_openai({"choices": []})


# ----------------------------------------------------------------- the client
def test_create_sends_the_system_prefix_and_returns_blocks():
    c, seen = client_with([reply(content="hi")])
    r = c.create(system=[{"type": "text", "text": "you are a director"}],
                 messages=[{"role": "user", "content": "a film"}],
                 tools=[{"name": "t", "input_schema": {}}])
    assert r.text() == "hi"
    body = seen[0]
    assert body["messages"][0] == {"role": "system", "content": "you are a director"}
    assert body["tool_choice"] == "auto"


def test_a_round_trip_keeps_our_own_blocks_usable_as_history():
    """The director appends our reply straight back as assistant content."""
    c, seen = client_with([reply(tool_calls=[{"id": "c1", "function": {
        "name": "write_file", "arguments": "{}"}}], finish="tool_calls"),
        reply(content="done")])
    first = c.create(system=[], messages=[{"role": "user", "content": "go"}], tools=[])
    c.create(system=[], tools=[], messages=[
        {"role": "user", "content": "go"},
        {"role": "assistant", "content": first.content},
        {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "c1",
                                      "content": [{"type": "text", "text": "ok"}]}]},
    ])
    second = seen[1]["messages"]
    assert second[2]["role"] == "assistant" and second[2]["tool_calls"][0]["id"] == "c1"
    assert second[3]["role"] == "tool"


def test_a_server_error_is_retried_then_raised():
    calls = {"n": 0}

    def handler(request):
        calls["n"] += 1
        return httpx.Response(503, json={"error": "busy"})

    c = GeminiClient(api_key="k", max_retries=2,
                     http=httpx.Client(transport=httpx.MockTransport(handler)),
                     sleep=lambda *_: None)
    with pytest.raises(GeminiError):
        c.create(system=[], messages=[], tools=[])
    assert calls["n"] == 3


def test_a_missing_key_is_refused_at_construction(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(GeminiError):
        GeminiClient()
