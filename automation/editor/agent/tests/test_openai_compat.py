"""The free-LLM adapter, driven against a mocked OpenAI-compatible server (no network, no key)."""
import json

import httpx
import pytest

from agent import run_agent
from agent.openai_compat import (LLMError, OpenAICompatClient, convert_messages, convert_response, convert_tools,
                                 load_dotenv, make_client_from_env)

PLAN = {"version": 1, "source": {"path": "in.mp4", "duration": 10, "width": 1920, "height": 1080, "fps": 30},
        "keep": [{"id": "k1", "start": 0, "end": 10}], "captions": [], "overlays": []}


def chat(content=None, tool_calls=None, finish="stop", usage=(10, 5)):
    msg = {"role": "assistant", "content": content}
    if tool_calls:
        msg["tool_calls"] = tool_calls
    return {"choices": [{"message": msg, "finish_reason": finish}],
            "usage": {"prompt_tokens": usage[0], "completion_tokens": usage[1]}}


def call(name, args, id="call_1"):
    return {"id": id, "type": "function", "function": {"name": name, "arguments": json.dumps(args)}}


def mock_client(responses, vision=False, **kw):
    """responses: list of (status, json|dict-with-headers) consumed in order; requests recorded in .sent"""
    sent, queue = [], list(responses)

    def handler(request):
        sent.append(json.loads(request.content))
        status, body, *hdr = queue.pop(0)
        return httpx.Response(status, json=body, headers=hdr[0] if hdr else {})

    c = OpenAICompatClient("http://llm.test/v1", "KEY", "test-model", vision=vision, sleep=lambda s: sent.append({"slept": s}),
                           http=httpx.Client(transport=httpx.MockTransport(handler)), **kw)
    c.sent = sent
    return c


# ------------------------------------------------------------------ conversion
def test_tools_converted_to_openai_function_format():
    t = convert_tools([{"name": "cut", "description": "d", "input_schema": {"type": "object", "properties": {"a": {"type": "number"}}}}])
    assert t == [{"type": "function", "function": {"name": "cut", "description": "d",
                                                   "parameters": {"type": "object", "properties": {"a": {"type": "number"}}}}}]


def test_messages_roundtrip_with_tool_calls_and_results():
    msgs = [
        {"role": "user", "content": "cut it"},
        {"role": "assistant", "content": [{"type": "text", "text": "ok"},
                                          {"type": "tool_use", "id": "t1", "name": "cut", "input": {"a": 1}}]},
        {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "t1", "content": '{"kept": 3}'},
                                     {"type": "tool_result", "tool_use_id": "t2", "content": "boom", "is_error": True}]},
    ]
    out = convert_messages("SYS", msgs, vision=False)
    assert out[0] == {"role": "system", "content": "SYS"} and out[1] == {"role": "user", "content": "cut it"}
    a = out[2]
    assert a["content"] == "ok" and a["tool_calls"][0]["function"] == {"name": "cut", "arguments": '{"a": 1}'}
    assert out[3] == {"role": "tool", "tool_call_id": "t1", "content": '{"kept": 3}'}
    assert out[4] == {"role": "tool", "tool_call_id": "t2", "content": "ERROR: boom"}


IMG = {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": "QUJD"}}


def test_images_are_dropped_for_text_models_and_kept_for_vision_models():
    msgs = [{"role": "user", "content": [{"type": "tool_result", "tool_use_id": "t1",
                                         "content": [{"type": "text", "text": "frames"}, IMG, IMG]}]}]
    text_only = convert_messages(None, msgs, vision=False)
    assert text_only[0]["role"] == "tool" and text_only[0]["content"] == "frames"
    assert "2 image(s) omitted" in text_only[1]["content"]
    vis = convert_messages(None, msgs, vision=True)
    assert vis[1]["content"][1] == {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,QUJD"}}
    assert [p["type"] for p in vis[1]["content"]].count("image_url") == 2


def test_response_conversion_text_tools_usage_and_finish_reasons():
    r = convert_response(chat("hello", [call("cut", {"a": 1})], finish="tool_calls", usage=(7, 3)))
    assert r["stop_reason"] == "tool_use" and r["usage"] == {"input_tokens": 7, "output_tokens": 3}
    assert r["content"][0] == {"type": "text", "text": "hello"}
    assert r["content"][1] == {"type": "tool_use", "id": "call_1", "name": "cut", "input": {"a": 1}}
    assert convert_response(chat("x", finish="length"))["stop_reason"] == "max_tokens"
    assert convert_response(chat("x"))["stop_reason"] == "end_turn"
    assert convert_response({"choices": [{"message": {"content": None}, "finish_reason": "stop"}]})["content"][0]["text"] == ""


def test_malformed_tool_arguments_become_a_readable_error_not_a_crash():
    bad = {"id": "c", "type": "function", "function": {"name": "cut", "arguments": "{not json"}}
    block = convert_response(chat(None, [bad], finish="tool_calls"))["content"][0]
    assert block["input"] == {"__invalid_arguments__": "{not json"}


# ------------------------------------------------------------------ transport behaviour
def test_request_body_and_auth():
    c = mock_client([(200, chat("hi"))])
    c.messages.create(model="claude-ignored", system="S", max_tokens=99999, tools=[{"name": "t", "input_schema": {}}],
                      messages=[{"role": "user", "content": "yo"}])
    body = c.sent[0]
    assert body["model"] == "test-model"                          # the configured model wins over the loop's claude id
    assert body["max_tokens"] == 8192 and body["tool_choice"] == "auto" and body["tools"][0]["function"]["name"] == "t"


def test_retries_rate_limits_honours_retry_after_and_malformed_tool_call():
    c = mock_client([(429, {"error": "slow down"}, {"retry-after": "7"}),
                     (400, {"error": {"code": "tool_use_failed"}}),
                     (200, chat("finally"))])
    r = c.messages.create(messages=[{"role": "user", "content": "x"}])
    assert r["content"][0]["text"] == "finally"
    assert {"slept": 7.0} in c.sent and c.requests == 3


def test_gives_up_after_max_retries_and_reports_bad_keys_clearly():
    c = mock_client([(503, {"e": 1})] * 3, max_retries=2)
    with pytest.raises(LLMError, match="503"):
        c.messages.create(messages=[{"role": "user", "content": "x"}])
    c = mock_client([(401, {"error": "invalid api key"})])
    with pytest.raises(LLMError, match="API key was rejected"):
        c.messages.create(messages=[{"role": "user", "content": "x"}])
    assert c.requests == 1                                          # auth errors are not retried


# ------------------------------------------------------------------ the whole agent loop on top of it
def cut_segments(plan, remove=None, **kw):
    p = dict(plan)
    p["keep"] = [{"id": "k1", "start": 0, "end": 4}, {"id": "k2", "start": 6, "end": 10}]
    return {"plan": p, "result": {"removed": remove}, "warnings": []}


TOOLS = {"cut_segments": {"fn": cut_segments, "description": "cut", "input_schema": {"type": "object", "properties": {}}}}


def test_full_agent_run_through_the_adapter(tmp_path):
    c = mock_client([
        (200, chat("Cutting the pause.", [call("cut_segments", {"remove": [{"start": 4, "end": 6}]}, "call_a")], finish="tool_calls")),
        (200, chat("Removed 2 seconds.")),
    ])
    r = run_agent("p", "remove the pause", PLAN, TOOLS, c, workdir=str(tmp_path))
    assert [(k["start"], k["end"]) for k in r["plan"]["keep"]] == [(0, 4), (6, 10)]
    assert r["reply"] == "Removed 2 seconds." and r["stop_reason"] == "end_turn"
    second = c.sent[1]["messages"]                                  # the tool result went back as a role:tool message
    assert second[-1]["role"] == "tool" and second[-1]["tool_call_id"] == "call_a" and '"removed"' in second[-1]["content"]
    assert second[-2]["tool_calls"][0]["function"]["name"] == "cut_segments"
    assert r["usage"]["api_calls"] == 2


def test_agent_survives_a_model_that_sends_bad_arguments_then_recovers(tmp_path):
    bad = {"id": "c1", "type": "function", "function": {"name": "cut_segments", "arguments": "oops"}}
    c = mock_client([(200, chat(None, [bad], finish="tool_calls")),
                     (200, chat(None, [call("cut_segments", {"remove": []}, "c2")], finish="tool_calls")),
                     (200, chat("done"))])
    r = run_agent("p", "go", PLAN, TOOLS, c, workdir=str(tmp_path))
    errs = [e for e in r["events"] if e["type"] == "tool_finished" and not e["ok"]]
    assert len(errs) == 1 and r["reply"] == "done" and len(r["plan"]["keep"]) == 2


def test_text_only_model_skips_visual_review_but_keeps_the_scorecard(tmp_path):
    from agent.review import review_once
    c = mock_client([], vision=False)
    v = review_once(client=c, model="x", plan=PLAN, video="whatever.mp4", workdir=str(tmp_path), round_no=1)
    assert v["pass"] is True and v["visual_skipped"] and "cannot see images" in v["issues"][0] and c.requests == 0


# ------------------------------------------------------------------ configuration
def test_make_client_from_env_providers_and_errors(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert make_client_from_env({}) is None
    with pytest.raises(LLMError, match="GEMINI_API_KEY"):
        make_client_from_env({"EDITOR_LLM": "gemini"})
    g = make_client_from_env({"EDITOR_LLM": "gemini", "GEMINI_API_KEY": "k"})
    assert g.base_url == "https://generativelanguage.googleapis.com/v1beta/openai" and g.supports_vision is True
    v = make_client_from_env({"EDITOR_LLM": "gemini", "GEMINI_API_KEY": "k", "EDITOR_LLM_MODEL": "some-model", "EDITOR_LLM_VISION": "0"})
    assert v.model == "some-model" and v.supports_vision is False
    assert make_client_from_env({"EDITOR_LLM": "gemini", "GEMINI_API_KEY": "k"}).supports_vision is True
    assert make_client_from_env({"EDITOR_LLM": "ollama"}).api_key is None                       # local: no key needed
    with pytest.raises(LLMError, match="unknown EDITOR_LLM"):
        make_client_from_env({"EDITOR_LLM": "skynet"})
    with pytest.raises(LLMError, match="BASE_URL"):
        make_client_from_env({"EDITOR_LLM": "custom", "EDITOR_LLM_API_KEY": "k"})


def test_dotenv_loader_does_not_override_and_never_echoes_values(tmp_path, monkeypatch):
    f = tmp_path / ".env"
    f.write_text('# comment\nGEMINI_API_KEY="gsk_secret"\nOTHER=1\n\nBAD LINE\nKEEP=from_file\n')
    monkeypatch.setenv("KEEP", "from_env")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OTHER", raising=False)
    got = load_dotenv(f)
    assert got == {"GEMINI_API_KEY": "***", "OTHER": "***"}              # values are masked in the return value
    import os
    assert os.environ["GEMINI_API_KEY"] == "gsk_secret" and os.environ["KEEP"] == "from_env"
    monkeypatch.delenv("GEMINI_API_KEY"), monkeypatch.delenv("OTHER")


def test_gemini_thought_signature_round_trips():
    sig = {"google": {"thought_signature": "abc"}}
    resp = convert_response({"choices": [{"finish_reason": "tool_calls", "message": {"content": None, "tool_calls": [
        {"id": "c1", "type": "function", "extra_content": sig, "function": {"name": "t", "arguments": "{}"}}]}}]})
    block = resp["content"][0]
    assert block["extra_content"] == sig
    msgs = convert_messages(None, [{"role": "assistant", "content": [block]}], False)
    assert msgs[0]["tool_calls"][0]["extra_content"] == sig
