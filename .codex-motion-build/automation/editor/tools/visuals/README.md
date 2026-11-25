# tools/visuals (agent F)

Tools (`TOOLS` in `__init__.py`, contract ToolSpec format): `suggest_broll_slots`, `add_overlay`, `add_title`, `add_lower_third`.

- `broll.py`: transcript (`{words:[{word,start,end}]}` or `{segments:[{text,start,end}]}`) -> scored slots. Pluggable `scorer(text)->score|(score,reason)`; default `heuristic_scorer` (no LLM); `make_llm_scorer(client)` takes an injectable Anthropic-shaped client and falls back to the heuristic on any error. Respects `keep` (skips cut-away speech), existing overlays, min gap, max slots. Suggestions only; the plan is returned unchanged.
- `providers.py`: `LocalFolderProvider` (filename/folder tokens, sidecar `<file>.json` {tags,duration}, folder `tags.json`), `ChainProvider`, `StockAPIProvider` (documented STUB, raises NotImplementedError; Pexels outline in docstring). Pass `provider=` to `suggest_broll_slots` to attach `candidates`.
- `overlays.py`: pure plan transforms; ids `oN`; validates kind/time range, clamps to source duration, warns on same-kind overlap / missing asset. With `workdir`, title/lower-third/graphic write `workdir/overlays/<id>.html` and return `html_path`.
- `snippets.py`: `title_html`, `lower_third_html`, `graphic_html` (variants `stat`, `callout`), `overlay_html(overlay)`, `write_project(dir, html)` (copies local `assets/gsap.min.js` into `vendor/`). Registry patterns reused: yt-lower-third (`.clip` + data attrs, paused timeline in `window.__timelines`). All text is HTML-escaped. Styles: clean|light|bold.

Run: `python -m pytest tools/visuals -q` from repo root (needs python 3, pytest).

Verified: 9 pytest tests pass, including a real `npx hyperframes render -q draft` of a lower-third; title, lower-third and graphic were also rendered manually and frames inspected.
Not verified: stock API, LLM scorer against a real model, compositing over real footage.
Note: Hyperframes mp4 output is opaque (transparent CSS renders white), so overlays must be composited by the render service (e.g. render over the video frame or use a keyed/alpha format).
