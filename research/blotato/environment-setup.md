# Environment setup record

Date: 2026-11-03

## Workspace (Phase 0)
- Workspace was empty and is not a Git repository. There is no existing application code, README or dependency set.
- Research materials are stored only under `research/blotato/`.

## Runtime
- System Node: v24.12.0 (`C:\Program Files\nodejs`). This version is below REA's engine range `^22.23.4 || ^24.22.1 || >=26.12.1`. It was left untouched.
- REA runtime: portable official Node **v24.22.2 LTS**, SHA-256 verified against nodejs.org `SHASUMS256.txt`, at
  `%LOCALAPPDATA%\rea-node\node-v24.22.2-win-x64`. It is not on the system PATH.

## REA
- Package: `rea-agents@6.8.0` (npm latest), installed globally in the portable Node prefix.
- Frida install script skipped by npm `allow-scripts` policy (only needed for native process instrumentation).
- MCP registration: `%APPDATA%\Code\User\mcp.json` → server `rea` (stdio, absolute node + `rea.mjs mcp`). No prior file existed.
- Skill: `%USERPROFILE%\.agents\skills\reverse-engineer-anything`.
- `rea doctor --client vscode --skill --json` → healthy (node, registration, skill identity aligned).
- Direct MCP `tools/list` probe: server `rea` 6.8.0, **229 tools**. Web-relevant tools include `list_browser_targets`, `inspect_web_page`,
  `analyze_web_bundle`, `observe_web_session`, `observe_web_execution`, `capture_browser_scenario`, `capture_web_screenshot`,
  `compare_web_captures`, `export_web_scripts`, `trace_web_module_imports`, `trace_web_source_location`,
  `inspect_web_event_listeners`, `inspect_web_network_capture`, `discover_webmcp_tools`, `export_evidence_bundle`.

## Browser observation
- Chrome 156.0.8078.80 (also Edge 156 available).
- Dedicated profile: `%LOCALAPPDATA%\rea-blotato-profile`, kept outside OneDrive so session data isn't synced.
- CDP endpoint: `http://127.0.0.1:9222` (loopback only). Launcher: `tools/launch-observation-chrome.ps1`.
- `allowed_origins` is a per-call input (exact `scheme://host[:port]`, no wildcards/paths). Initial scope: `https://my.blotato.com`.
- Verified: `rea list-browser-targets ... --allowed-origins https://my.blotato.com` returned the `/login` page; 6 non-page targets excluded.

## Other tools
| Tool | Status | Decision |
|---|---|---|
| Playwright | `playwright-core` bundled in REA (used by `capture_browser_scenario`) | No separate install for now |
| Chrome DevTools | Built into Chrome 156 | Use in the dedicated profile |
| Java | On PATH (Oracle javapath) | Only relevant if Ghidra is ever needed |
| Ghidra / Hopper / IDA | Not installed | Not needed (browser-based SaaS) |
| Fiddler Everywhere | Not installed | Install only if HAR/CDP evidence is insufficient |
| Postman | Not installed | Defer; API key generation may end the Blotato free trial |
| Wappalyzer / React DevTools | Not installed in profile | Optional browser extensions; REA `analyze_web_bundle` vendor fingerprints cover most of this |
