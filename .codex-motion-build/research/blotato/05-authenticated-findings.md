# 05 - Authenticated Walkthrough Findings (Phase 1, pass 2)

Session: logged in via email one-time code (user-supplied). Account is **new, TRIALING, 500 AI credits, 0 connected accounts**, so every page shows an empty state. Method: GET-only navigation through a CDP script (`tools/cdp-crawl.cjs`, `tools/cdp-click.cjs`). Every non-GET/HEAD/OPTIONS call to `backend.blotato.com` is blocked and logged. Confidence labels: CONFIRMED = observed live in this pass.

Raw per-page data: [network/authenticated/](network/authenticated/) (`10-NN-*.json`, `30-NN-*.json`, `_api-by-page.json`). Screenshots: [screenshots/](screenshots/) (`10-NN-*.png`, `20-*`, `21-*`, `30-NN-*.png`). Personal name and email were redacted from the saved JSON.

API paths are relative to `https://backend.blotato.com/v2` and are CONFIRMED live GETs unless stated otherwise.

## Corrections to pass 1

| Pass 1 | Now |
|---|---|
| Calendar, Inbox, Tools routes "unknown/INFERRED" | `/calendar`, `/inbox`, `/inspiration`, `/prompts`, `/labs/viral-coach` CONFIRMED |
| `/videos` list path INFERRED | `/videos` **redirects** to `/videos/new` |
| Settings location unknown | Link is `/settings/profile`; tabs My Brand `/settings/brand`, API `/settings/api`, Profile, Billing `/settings/billing` |
| Mode switch "may persist server-side" | Toggling made **no backend request** (zero blocked writes, zero GETs): CONFIRMED client-side only (resolves open unknown #2) |
| Intercom, PostHog replay "from bundles" | CONFIRMED live (Intercom `wss://nexus-websocket-a.intercom.io`, PostHog `/s/` session snapshots, `/i/v0/e/` events) |

## Navigation by mode (CONFIRMED)

| Developer Platform | Content Studio |
|---|---|
| Overview `/overview` | Calendar `/calendar` |
| Calendar `/calendar` | Posts `/posts` |
| Analytics `/analytics` | Post editor `/agent` |
| Posts `/posts` | Videos `/videos` |
| Logs `/logs` | Analytics `/analytics` |
| Videos `/videos` | Inbox `/inbox` |
| Inbox `/inbox` | DM automations `/dm-automations` |
| DM automations `/dm-automations` | Accounts `/accounts` |
| Accounts `/accounts` | Tools: Inspiration, Prompts, Viral AI Coach |
| Tools: Inspiration `/inspiration`, Prompts `/prompts`, Viral AI Coach `/labs/viral-coach` | Settings `/settings/profile` |
| Settings `/settings/profile` | |

Content Studio drops Overview and Logs and adds the Post editor. `/agent` also exposes "View old remix screen" (`/remix`, renders an almost empty shell).

## Per-page findings

| Route | Purpose and UI (empty state) | Live API GETs |
|---|---|---|
| `/overview` | "0 accounts, last 7 days"; "This week" grid; Upcoming posts; DM automations card; Performance by platform (cumulative since publish) | `/posts?since&until` (x2), `/dm-automations`, `/analytics/platforms`, `/accounts` |
| `/calendar` | Week view, Today, "New post" (links to `/agent`), "Weekly posting schedule" with "Add slot" and Sun-Sat lists; "0 posts across 0 time slots" | `/schedule/slots`, `/accounts`, `/posts` |
| `/analytics` | Range 7/30/All. KPIs: Posts published, Views, Comments, Likes, Publishing success rate, API requests, Failed posts, Time saved (posts x 15 min). Top posts, Performance by platform, Latest posts, chart by platform, Failed posts, DM card | `/analytics/summary` (current and previous period), `/api-requests/stats?windowHours=720&bucket=day`, `/analytics`, `/analytics/platforms`, `/posts`, `/dm-automations` |
| `/posts` | Filters: Platform, Time window, status radios All/Scheduled/Published/Failed; "New post". Query params e.g. `?status=failed&days=30` | `/posts?since&until` (until = +1 year) |
| `/logs` | "0 actions run through the API and MCP in the last 24 hours". Type radios All/Posts/Videos/Media/Accounts/DM; status radios All/Processing/Failed/Success; CTA "Set up API / MCP" | `/api-requests?limit=50&offset=0`, `/api-requests/stats`, `/accounts`, `/automation-accounts` |
| `/videos` -> `/videos/new` | "Choose a Template"; "Create Everything with AI Agent" / "AI Agent Visual Generator". Templates with usage counts: AI Avatar with B-roll, AI Selfie Talking Video (NEW), AI Video with AI Voice (TRENDING), Combine Clips, Image Slideshow variants, When X then Y, Quote/Tutorial/Tweet/Instagram carousels, many "... Infographic" styles | `/videos-v2?limit=20&offset=0`; preview MP4s on `database.blotato.io/storage/v1/object/public/video_template_previews/` |
| `/inbox` | Comments and DMs from Instagram and Facebook; tabs Posts/Chats; "No Instagram or Facebook posts yet" | `/posts?status=published&source=all&platform=instagram&platform=facebook`, `/accounts` |
| `/dm-automations` | "0 automations, 0 runs in last 24 hours, 0 failed"; "New automation" | `/dm-automations`, `/accounts`, `/users/me/usage` |
| `/accounts` | "0 connected accounts"; "Connect account"; columns ACCOUNT, ACCOUNT ID, PAGE ID, CONNECTED, STATUS; warning that accounts should be warmed up first | `/users/me`, `/accounts` |
| `/settings/profile` | First/Last name, Email + "Update Email", Default language, "Disable markdown", Save; "Reset settings" (clears **local** drafts and sources), Log Out | `/me/preferences` |
| `/settings/brand` | "Primary brand is used by default in content generation". Basics (language, name, website), Your Business (products, ideal customers, locations), Content topics, Brand Visuals (png/gif/jpeg/jpg/svg/webp/avif, 10 MB), Brand Documents (pdf/pptx/ppt/docx/doc, 25 MB) | `/brands` |
| `/settings/api` | Key creation: "Upgrade & Generate API Key" (**ends the trial and charges**, not clicked). Tabs API Quickstart / Automation Templates. One-click sign-in: Claude.ai Web, Claude Cowork, Claude Code, Replit. Copy-key: ChatGPT/Codex, Cursor, Antigravity, Hermes, OpenClaw, other MCP client, n8n, Make, own app. MCP URL `https://mcp.blotato.com/mcp`. "External API Keys": ElevenLabs (custom voices) | `/users/me` |
| `/settings/billing` | "AI Credits and Usage": 500 credits remaining, "Buy 1000 More Credits", status TRIALING, Activate / Billing Portal / Cancel Subscription (none clicked). Credits cover AI images, video, voice and refresh every 30 days | none captured |
| `/agent` | Header "Discard drafts", "View old remix screen"; BRAND selector (placeholder "No brand voice"), CONTEXT, textarea "Write posts about...", "What are we making today?" with starters Blank Post / Single Post / Week of Posts / Visual Post | `/brands` |
| `/inspiration` | Filters panel: Sort By, Media Type, Likes/Comments/Shares/Followers ranges, Exclude Keywords, Creator, Reset, Shuffle, search "Search posts...". Shows "Failed to load posts" because the data call is a POST that was blocked by the safety filter | `POST /viral-posts` (**blocked, not executed**; almost certainly a read-style search query with filter body, UNVERIFIED) |
| `/prompts` | "My Prompts", "New Prompt" and search "Search by any field". Table Title / Description / Content / Type, prebuilt prompts "Created by Blotato" (e.g. "3 Limiting Beliefs") with a Duplicate action. Prompts are written as `# CONTEXT` + `# WRITING STYLE` blocks | no backend call captured (data likely preloaded or served from the contract's `prompts` endpoints) |
| `/labs/viral-coach` | "Viral AI Coach": upload a TikTok/Reel/Short (max 100 MB) to get viral tips; file input only | none on load |

## Realtime and third parties (CONFIRMED live on every page)

- `wss://backend.blotato.com/events` (app realtime).
- `wss://nexus-websocket-a.intercom.io/pubsub/...` (Intercom support chat).
- PostHog through `geometry.blotato.com`: config, surveys, `/flags/`, `/i/v0/e/` events and `/s/` session replay. Replay means the user's interactions in this research session were recorded by Blotato.

## Safety log

- No non-GET call to `backend.blotato.com` succeeded in any crawl or click. The only blocked call was `POST /v2/viral-posts` on `/inspiration`.
- Buttons deliberately not clicked: Upgrade & Generate API Key, Buy credits, Activate/Cancel Subscription, Connect account, Update Email, Reset, Log Out, Save, Discard drafts, any generate or post-creation button.
- The login one-time code the user supplied was used once and is spent.

## Pass 3: free-trial feature checks (no charges, credits still 500)

Tool: `tools/cdp-explore.cjs`. It blocks backend writes by default. `--writes` allows only non-billing writes (billing, Stripe, API key, accounts, delete, email, logout paths stay blocked). No write was actually sent to the backend in this pass.

| Area | Finding |
|---|---|
| Calendar "Add slot" | Click opens nothing visible while no accounts are connected (slots need an account) |
| DM automations "New automation" | Opens a flow wizard (connected account, flow name). Not completable without a connected Instagram/Facebook account |
| Prompts "New Prompt" | URL `/prompts?mode=new`; dialog with Title, Description, Type (default "Text"), Prompt (textarea), Create. Not submitted |
| `/agent` Context | "Add context source" dialog "Edit Source" with tabs Text, Article, YouTube, TikTok, Perplexity, Audio, PDF, Rule; "Save Source?" checkbox, "Advanced settings", Add |
| `/agent` Brand | Pre-filled with an "Unnamed brand"; "BRAND +" and "CONTEXT +" in the left rail |
| `/agent` starter "Single Post" | Becomes a chat: the agent asked "What does your brand do, and who are you trying to reach?" (client-to-agent over the realtime WebSocket, no REST call). After a test answer there was no reply within ~60 s (cause unknown) |
| `/agent` "create a blank draft" | Creates a draft **locally** (no REST call; matches the "Reset settings" text about local drafts). Editor: breadcrumb "Drafts (1) / title", character counter, Text Post / Photo-Video, Chat panel and Schedule panel on the right |
| Editor "Photo / Video" | "Add Media" dialog: upload only; jpeg, png, gif, webp, heic, mp4, quicktime, max 500 MB |
| Editor "Schedule" | `GET /accounts`; shows "No accounts found. Connect an account to start scheduling posts"; options: Facebook, LinkedIn, Pinterest need extra target fields |
| Video template detail | Example "AI Video with AI Voice": Prompt, "Use brand kit" toggle, Generate Video, advanced options (Scenes with Add Scene, AI Voiceover toggle, ElevenLabs "AI Voice" picker). Not generated |
| First-visit dialog | "Welcome to Blotato!" onboarding (templates, AI, schedule, API); button "Get started" |
| Billing after tests | Still 500 AI credits, TRIALING |

Not generated on purpose: videos, images, the draft agent beyond one answer (credit use unknown).

## API/MCP access without paying (verified against docs and live endpoints)

- Docs state that the Free Trial has **no API and no MCP access**. A key can only be created from Settings > API, which ends the trial and starts the paid Starter plan. Subscription failures on tool calls return `403`. Official OAuth sign-in is subject to the same plan check, so it is not a free route, and no attempt was made to bypass it.
- MCP auth discovery (public GETs, no credentials):
  - `GET https://mcp.blotato.com/.well-known/oauth-protected-resource` returns `resource=https://mcp.blotato.com/mcp`, `authorization_servers=[https://<project>.supabase.co/auth/v1]`, bearer in header only.
  - The authorization server is **Supabase Auth** with OAuth 2.1 (authorization code and refresh token, PKCE `S256`, dynamic client registration endpoint, scopes openid/profile/email/phone/offline_access).
  - Unauthenticated `POST /mcp` initialize returns `401` with `WWW-Authenticate: Bearer realm="mcp" ... "Missing API key or OAuth2.1 token." scope="email"`. A `GET` returns `405` (Streamable HTTP, POST only).
  - Accepted credentials: `blotato-api-key` header, `Authorization: Bearer <API key>`, or an OAuth token.
- This confirms the backend stack uses Supabase (auth and storage at `database.blotato.io`), so the API gate is application-level plan checking rather than a separate auth system.
- Free ways to study the API: the public OpenAPI at `network/public-specs/backend-openapi.json` (46 operations), the documented MCP tools (35), the `/v2` internal contract in `network/internal-api-contract.md`, and the docs index `https://help.blotato.com/llms.txt`.

## Still not investigated

- Why the draft agent did not reply after the first answer (needs a retry or WebSocket frame capture).
- Anything that requires data: published posts, analytics values, logs rows, DM flows, connected accounts, generated media.
- The `POST /v2/viral-posts` request and response shape.
- Logged-in JS route chunks (full route list and plan gating).
