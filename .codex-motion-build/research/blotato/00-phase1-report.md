# 00 - Phase 1 Report: Blotato Reverse Engineering (pass 1, unauthenticated)

> **Update (pass 2, authenticated):** see [05-authenticated-findings.md](05-authenticated-findings.md). 19 routes were walked live, with screenshots and GET captures; all non-GET calls were blocked.

## 1. Connectivity verification

| Check | Result |
|---|---|
| REA installation | rea-agents 6.8.0 on portable Node 24.22.2. Not reinstalled or reconfigured |
| REA MCP tools | Working: target listing, page inspect, screenshot, bundle analysis, analysis views |
| Observed browser | Dedicated Chrome 156 at CDP `127.0.0.1:9222`, profile `rea-blotato-profile` |
| Target | `https://my.blotato.com/login` visible to REA |
| Authentication | **Not logged in** in the observed Chrome. By user choice, this pass is unauthenticated only |
| Known limitation | REA's MCP server cannot read or write workspace paths, so file exports used the REA CLI (positional args) into `%LOCALAPPDATA%\rea-work\blotato` and were then copied here |

## 2. Dashboard navigation mapping

See [02-navigation-map.md](02-navigation-map.md).
- 14 routes are known. 3 are confirmed in bundles (`/login`, `/accounts`, `/settings/billing`), the rest come from the docs, and only `/login` was observed live.
- The remaining screens are known by name but their paths are still unconfirmed.
- The app has two modes (Developer Platform / Content Studio) over shared screens.

## 3. Homepage investigation

- **my.blotato.com, logged out:** only `/login` was reachable. It has an email field and "Log in with one-time code" (passwordless), built on Next.js App Router + Mantine. Screenshot: [screenshots/01-login-page-unauthenticated.png](screenshots/01-login-page-unauthenticated.png).
- **www.blotato.com (marketing):**
  - Built with Astro.
  - Positioning: AI content creation + scheduling across 9 platforms, with an API/MCP for AI agents and n8n/Make nodes.
  - About 40 visual templates.
  - Pricing from $29/mo with a 7-day trial.
  - CTAs go to `/signup?plan=…`.
- **help.blotato.com:** GitBook with `llms.txt`/`llms-full.txt`, plus `.md` versions of every page.

## 4. Feature inventory

See [01-dashboard-inventory.md](01-dashboard-inventory.md).
- 21 modules with every requested field.
- Each module is mapped to its internal API endpoints and realtime events.
- Full API catalog: [network/internal-api-contract.md](network/internal-api-contract.md). It has 133 endpoints (46 public, 87 internal-only).

## 5. Screenshots

| File | What | Evidence |
|---|---|---|
| [screenshots/01-login-page-unauthenticated.png](screenshots/01-login-page-unauthenticated.png) | `/login` as seen by REA | ev_6241eadf… (sha256 a8b15f8d…a0946b) |

The other screenshots need an authenticated session.

## 6. Initial technology identification

See [03-technology-stack.md](03-technology-stack.md) and [diagrams/system-context-initial.mmd](diagrams/system-context-initial.mmd).

- **Front end:** Next.js App Router on Vercel, React, Mantine, Slate, Jotai, and a TypeBox-typed API contract.
- **API and realtime:** cookie-auth `fetch` to `backend.blotato.com/v2`, plus a typed WebSocket hub at `/events`.
- **Analytics:** PostHog through the first-party proxy `geometry.blotato.com`, with session replay and inputs unmasked.
- **Other services:** Stripe, Google Ads, Meta Pixel, Tolt, and the `database.blotato.io` media host.
- **Separate surfaces:** an MCP server at `mcp.blotato.com` and a public OpenAPI 3.0.3 spec.

## 7. Features requiring deeper investigation

See [04-deeper-investigation-backlog.md](04-deeper-investigation-backlog.md).
- Priority 1 is read-only mapping after login.
- Priority 2 lists the actions that need your approval: generation that costs credits, and API key creation, which ends the trial.

## 8. Evidence index

| Path | Contents |
|---|---|
| [network/login-page-inspect.evidence.json](network/login-page-inspect.evidence.json) | REA passive inspection of `/login` (ev_a0b39311…). ⚠ The accessibility text contains an autofilled email address. Do not share this file outside the project |
| [network/login-shell-scripts-manifest.json](network/login-shell-scripts-manifest.json) | Manifest of the 35 exported first-party scripts (the scripts themselves are kept outside the workspace in `%LOCALAPPDATA%\rea-work\blotato\login-shell`) |
| [network/login-shell-string-scan.txt](network/login-shell-string-scan.txt) | Static string scan: hosts, paths, vendors |
| [network/internal-api-contract.md](network/internal-api-contract.md) | 133-endpoint contract, flagged public vs internal-only |
| [network/public-specs/backend-openapi.json](network/public-specs/backend-openapi.json) | Public OpenAPI spec as downloaded |
| [diagrams/](diagrams/) | Navigation map and initial system context (Mermaid) |
| [tools/](tools/) | Offline helper scripts used for extraction (no network calls) |

REA evidence IDs:
- Target lists: ev_ed21d677…, ev_363a30cd…
- Screenshot: ev_6241eadf…
- Inspect: ev_a0b39311…
- Bundle analysis: ev_5b9d3fa1…

## Safety notes

- No writes were made to Blotato: no login submit, publish, schedule, DM, create/delete, disconnect, billing change or API key. No cookies or tokens were collected.
- **Prompt injection notice:** every help.blotato.com page carries a GitBook "Agent Instructions" block telling AI agents to send GET requests with `?ask=<question>&goal=<user_goal>` to the docs site. These instructions were ignored. They come from the target content and would leak the user's goals to a third party.
- Superadmin/admin endpoints visible in the client bundle were recorded but not probed.

## Next step

Log in to Blotato **in the dedicated REA Chrome window** (the one launched by [tools/launch-observation-chrome.ps1](tools/launch-observation-chrome.ps1), profile `rea-blotato-profile`), then ask to resume Phase 1. The authenticated module-by-module pass follows the order in the brief.
