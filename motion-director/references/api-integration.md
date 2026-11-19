# Running the Motion Director from a backend (Claude API)

The skill works only when Claude can **build, render and look at** its work. Plan the backend around that loop.

## Recommended: your backend hosts the loop (Messages API + tool use)

```
client brief ──► /motion/jobs (FastAPI) ──► agent loop (Claude) ◄──► tools ──► render worker (sandbox)
                                                   │                                  │
                                                   └── stills come back as IMAGES ◄───┘
```

**Model and settings**
- `claude-opus-5-5`, adaptive thinking, `output_config.effort` = `high` for directing and code.
- Streaming, since the code and plan outputs are long.
- Enable server-side refusal fallbacks (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`).

**System prompt**
- `SKILL.md`, then all of `references/*.md`, then the kit API from `build-guide.md`, followed by brand-kit rules.
- Put a `cache_control` breakpoint at the end of this stable block. It's the same for every job, so it's paid at the cache-read rate after the first request.
- Per-job content (the brief, the brand kit, asset list) goes in the first user message, after the cached prefix.

**Tools** (define with `strict: true`; run them in the worker):

| Tool | Input | Returns |
|---|---|---|
| `write_file` | path (restricted to `src/film.tsx`, `score.py`, new files under `src/kit/`), content | ok / type-check errors |
| `build_audio` | — | measured LUFS and peak, or the error |
| `render_stills` | times (seconds, ≤ 16 per call) | **image blocks** (half-res PNG or JPEG) + any render error text |
| `render_final` | name | path + the measured scorecard (duration, fps, LUFS, peak) |
| `fetch_brand` (optional) | url | colours, fonts, logo URL, CTA text extracted server-side |

Return rendered frames as image content inside the `tool_result`, so Claude reviews them visually:

```python
{"type": "tool_result", "tool_use_id": id, "content": [
    {"type": "text", "text": "t=1.40s"},
    {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}},
    ...
]}
```

Send JPEG at about 540×960 per still, to keep tokens low. Return all results of parallel tool calls in one user message.

**Worker sandbox** (Claude writes code, so isolate it):
- A separate container per job with Node, the kit, headless Chromium, ffmpeg and Python (numpy, scipy).
- No network, no secrets, CPU and memory limits, a wall-clock timeout per tool call, and a read-only kit except the allowed files.
- Reuse `node_modules` from the image; copy the kit per job.

**Job flow**
1. Plan: Claude writes `plan.md` (insight, three concepts, scores, winner, beat map, shot table). Optionally show it to the client for a quick yes/no before the build.
2. Build: `write_file`, `build_audio`, `render_stills`, then the review rounds (cap at about 4 rounds).
3. Final: `render_final`. If the scorecard fails, Claude gets one fix round.
4. Store the MP4, the plan, stills and the scorecard against the job. Approval invalidates on any edit.

**Cost control**
- Prompt caching on the skill prefix.
- Cap stills per round and the number of rounds.
- Lower effort only for narrow revisions ("change the CTA text").
- Measure cost per finished film, not per request.

## Alternative: Managed Agents (beta)

Anthropic hosts the agent loop. Your render box runs as a **self-hosted sandbox** worker (it polls for work; nothing dials in). Upload this skill through the Skills API and attach it to the agent. The built-in `read` tool views PNG stills. The **outcomes** feature runs a separate grader against a rubric (use `critic-rubric.md` §4) until the film passes.

The trade-offs: it's beta, it bills session runtime on top of tokens, and it isn't eligible for zero data retention. Choose it if you'd rather not maintain the loop yourself.

## Improving the skill over time (no reference videos)

- **Taste lessons:** after each client approval or rejection, record the *reason* as a principle in `references/lessons.md` (for example, "small UI floating in empty frames reads as cheap"). The model reads it with the rest of the skill.
- **Kit growth:** each new technique that works gets promoted into `core.tsx` and the vocabulary.
- **Blind eval:** run `evals/briefs.md` after every skill change, score with the rubric, and keep a score history. Ship skill changes only when the average holds or rises.
