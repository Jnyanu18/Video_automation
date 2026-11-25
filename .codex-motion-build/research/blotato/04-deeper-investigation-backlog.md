# 04 - Features Requiring Deeper Investigation and Open Unknowns

> **Update (pass 2):** Priority 1 items 1, 3, 5 (partly), 6, 7 (list only), 8, 9, 10 are done for page and empty-state level. Open unknown #2 is resolved (mode toggle is client-side). Remaining work is listed at the end of [05-authenticated-findings.md](05-authenticated-findings.md). Priority 2 items still need explicit user approval.

Blocker for most items: **an authenticated session is required in the REA-observed Chrome** (profile `rea-blotato-profile`, CDP port 9222). All items stay READ-ONLY. Anything marked ⚠ needs explicit user approval because it could change data.

## Priority 1 - authenticated read-only mapping

| # | Item | Method | Unknowns it resolves |
|---|---|---|---|
| 1 | Render every nav item in both modes; screenshot + passive DOM inspect | REA inspect/screenshot per route | Real routes for Calendar, Inbox, Tools, My Brand, Profile, video list/editor |
| 2 | Capture logged-in JS bundles (route chunks) | REA export scripts + bundle analysis | Full route list, feature flags, plan gating, legacy routes |
| 3 | Passive network observation while navigating (GET only) | REA observe session | Real request/response shapes, pagination, polling cadence, which endpoints each page calls |
| 4 | WebSocket observation on `/events` | REA observe session | Handshake/auth, message envelope, heartbeat, reconnection |
| 5 | `/agent` UI (no generation) | screenshot + DOM | Brand/Context pickers, platform toggles, draft/variation UI, Slate usage |
| 6 | `/videos/new` template catalog (no generation) | screenshot + `GET /videos/templates` observation | Template list, input schemas, credit costs |
| 7 | `/dm-automations` list + open an existing flow in view mode | screenshot | Flow editor layout and sub-routes |
| 8 | `/logs` filters and a row detail | screenshot | Log schema, request-ID format, API debugger agent UI |
| 9 | `/analytics`, `/posts`, Calendar | screenshot | Chart components, filters, slot editor UI |
| 10 | Settings: My Brand, API page (**view only, do not create keys**), Profile, Billing (view only) | screenshot | Brand-kit fields, MCP client setup UI, plan/credit model |

## Priority 2 - needs user approval (writes or costs) ⚠

| Item | Why it's gated |
|---|---|
| Generate a draft in `/agent` | Consumes credits and creates data; would reveal the streaming WS flow (`chatMessageSendPartial`) |
| Resolve a source (e.g. a YouTube URL) | Creates a source record and may consume credits |
| Generate a visual/video | Consumes credits |
| Create a DM automation draft | Creates data (draft only, never publish) |
| Generate an API key | **Ends the trial and starts billing** (DOCUMENTED). Do not do this without explicit confirmation |
| Connect an MCP client | Requires an API key or OAuth approval |
| Any publish/schedule/DM/disconnect/billing action | Out of scope under the read-only rules |

## Open unknowns (cannot be resolved statically)

1. OTP login endpoints and session cookie attributes. Not in the `/v2` contract, possibly a Next.js route handler.
2. Whether the mode (Developer Platform / Content Studio) is persisted server-side.
3. LLM / media providers behind the agents (text, image, voice, video). None are named in the logged-out bundles.
4. Queueing/scheduling infrastructure behind publishing and analytics snapshots.
5. Team access model (roles, seats) and whether brands are per-team.
6. Exact credit costs per operation and the active-contacts accounting.
7. How `automation-accounts` (n8n baseUrl + apiKey) is used in the UI.
8. Viral AI Coach and Inspiration data sources.
9. Rate limits on internal endpoints compared with the documented public limits.

## Remaining public-doc reading (no auth needed)

Help pages not yet read in detail:
- `web-app-getting-started/posts.md`, `sources.md`, `calendar.md`
- `web-app-features/ai-images.md`, `inbox.md`, `viral-ai-coach.md`, video sub-pages
- `settings/brand-kit.md`, `team-access.md`, `billing-and-credits.md`
- `n8n-blotato-node.md`, `make.com.md`
- `rest-api-reference/*`
