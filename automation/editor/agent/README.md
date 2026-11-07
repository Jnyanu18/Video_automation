# agent/ (Agent G): Claude tool-calling loop

    from agent import run_agent, iter_agent, FakeClient
    r = run_agent(project_id, user_message, plan, tools=None, client=None,
                  on_event=sse_push, workdir="...", history=[...])
    # r = {"plan", "reply", "events", "versions", "reviews", "usage", "stop_reason", "messages"}

- `tools=None` lazily imports `TOOLS` from tools.analysis, tools.edit, tools.visuals, services.render (missing modules skipped). Pass a dict to override.
- `client=None` builds `anthropic.Anthropic()` (needs ANTHROPIC_API_KEY); tests inject `FakeClient`. Model `claude-sonnet-5-5`.
- Builtin tools: `inspect_frames(video, times)` (ffmpeg frames -> image blocks in the tool_result), `review_plan()` (render_preview -> 4 sample frames -> reviewer Claude call -> {passed, issues}; max_review_rounds=3), `get_plan()`. A same-named tool in TOOLS overrides the builtin.
- Plan versioning: every plan-tool call bumps `plan["version"]` and records a snapshot in `versions` (inspect/review/get_plan do not).
- Events (dicts with seq, ts): message, tool_started, tool_finished, plan_version, usage. `iter_agent` is the generator for SSE; `on_event` is the callback form.
- Guards: max_iterations (15), max_cost_usd, max_review_rounds, result truncation; tool exceptions return `is_error` tool_results.
- Tools get `workdir` injected if their signature accepts it. `render_preview` may return a path string or a contract dict.
- Cost uses ASSUMED prices ($3/$15 per MTok in/out), override with `pricing=`.

## Tests
`python -m pytest agent -q` : 13 pass (FakeClient, real ffmpeg frame extraction). NOT verified: real Anthropic API calls, real tools.* / services.render modules (not present yet), non-streaming create only (no token-level streaming).
