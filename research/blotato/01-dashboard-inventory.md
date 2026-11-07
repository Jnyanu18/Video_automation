# 01 - Blotato Dashboard Inventory (Phase 1, pass 1)

> **Update (pass 2):** the session is now authenticated. Every module statuses "Pending (auth)" / "Static-only" below was walked live for its page and empty state. Real routes, UI, and observed GET calls are in [05-authenticated-findings.md](05-authenticated-findings.md), which takes precedence over route guesses here.

Target: https://my.blotato.com | Mode: READ-ONLY, black-box
Session state: **unauthenticated**. The REA-observed Chrome (profile `rea-blotato-profile`, CDP 127.0.0.1:9222) stayed on `/login`, and the user chose to continue without login for this pass.

## How to read this file

- **Confidence labels.** CONFIRMED = observed by REA, or present in shipped client code. DOCUMENTED = stated in official Blotato docs or the marketing site. INFERRED = reasoned from the above. UNVERIFIED = plausible but unchecked. UNAVAILABLE = not reachable in this pass.
- **Status.** `Investigated` = page observed live. `Static-only` = known from bundle and docs, page not rendered. `Pending (auth)` = needs a logged-in session.
- **API Activity.** Paths are relative to `https://backend.blotato.com/v2`. All API activity listed here is **static** (contract entries in chunk `6332-*.js`), not observed traffic. The full table is in [network/internal-api-contract.md](network/internal-api-contract.md).
- **WS events.** Typed realtime events on `wss://backend.blotato.com/events`. S→C = server to client, C→S = client to server.

## Global shell

| Field | Value |
|---|---|
| Module | App shell / mode switch |
| Page/Route | Sidebar under "Blotato" name: **Switch to Content Studio / Switch to Developer Platform** (DOCUMENTED, help `navigation.md`) |
| Purpose | Two navigation modes over one account. Developer Platform is for monitoring API/MCP/automation activity. Content Studio is for the in-app AI Agent and visuals. |
| Features | Mode switch (changes nav only); support chat; global realtime connection; PostHog analytics + session recording |
| UI Components | Mantine-based components (CONFIRMED: Mantine signatures in 20 chunks); Next.js App Router layouts `(logged-out)` and presumably `(logged-in)` (INFERRED) |
| Inputs / Outputs | n/a |
| Actions | Switch mode (non-destructive per docs) |
| API Activity | `GET /users/me`, `GET /users/me/usage`, `GET /me/preferences` (static). WS S→C `userNotification`, `userQuotaError` |
| Status | Static-only |
| Evidence | help navigation.md; chunk `6332`; `main-app-*.js` PostHog init |

## Module inventory

### 1. Authentication

| Field | Value |
|---|---|
| Page/Route | `/login` (CONFIRMED, Next route group `app/(logged-out)/login`); `/signup?plan=starter-monthly&ref=...` (DOCUMENTED, marketing CTAs) |
| Purpose | Passwordless sign-in |
| Features | Email field + "Log in with one-time code" (CONFIRMED). No password field and no social login button were seen on the page. |
| UI Components | Card, heading "Sign In to Blotato.", logo image, `textbox` Email (required), primary `button` (CONFIRMED via accessibility tree) |
| Inputs | Email |
| Outputs | One-time code via email (INFERRED from button label) |
| Actions | Request code → verify code → session cookie (INFERRED; the API client uses `credentials:"include"`) |
| API Activity | `POST /auth/signup` (static). The OTP request/verify endpoints were **not** in the contract, so they may be served by a separate auth route (UNVERIFIED) |
| Status | **Investigated** (passively; no submit) |
| Evidence | `screenshots/01-login-page-unauthenticated.png`; `network/login-page-inspect.evidence.json` (ev_a0b39311…) |

### 2. Overview (Developer Platform home)

| Field | Value |
|---|---|
| Page/Route | `/overview` (DOCUMENTED) |
| Purpose | Weekly dashboard: current week's posts, upcoming posts, DM automations, platform performance |
| Features / UI | Week summary, upcoming list, automation tiles, platform performance (DOCUMENTED) |
| API Activity | INFERRED: `GET /posts`, `GET /analytics/summary`, `GET /analytics/platforms`, `GET /dm-automations` |
| Status | Pending (auth) |
| Evidence | help navigation.md |

### 3. AI Agent / Content Studio "Post editor"

| Field | Value |
|---|---|
| Page/Route | `/agent` (DOCUMENTED); legacy `/remix` (DOCUMENTED, "View old remix screen") |
| Purpose | Chat-style in-app AI agent that drafts multi-platform posts from a topic and context |
| Features | Brand selection; Context (source material); "Write posts about..." prompt; per-platform drafts with variations; media per draft part; prompt library; move to drafts |
| Inputs | Prompt text, brand, sources, target platforms |
| Outputs | Post drafts → parts → variations → media |
| Actions | Generate, regenerate variation, attach/generate media, clone draft, schedule/publish (write: avoid) |
| API Activity | `post-drafts` (list/create/clone/removeAll/remove), `post-drafts/:postDraftId/parts`, `post-drafts/parts/variations/:id`, `post-drafts/parts/:partId/media/{upload,image-gen}`, `prompts` CRUD + clone, `remix-agent/state`, `users/me/onboard-remix`. WS C→S `chatMessageSend`, `chatMessageSendPrompt`, `postDraftWizardCreate`, `postDraftCreate`, `postDraftCreateMultiple`, `remixAgentClientAction`. WS S→C `chatMessageSendIntent`, `chatMessageSendPartial` (streaming tokens), `postDraftCreate`, `postDraftPartVariationCreate/Update`, `postDraftMediaVariationUpdate/Error`, `remixAgentServerAction` |
| Status | Static-only → Pending (auth) |
| Evidence | chunk `6332` contract and `ServerToClient`/`ClientToServer` maps; help navigation.md |

### 4. Content sources ("Context")

| Field | Value |
|---|---|
| Page/Route | Inside Post editor → Context; saved Sources (DOCUMENTED, `web-app-getting-started/sources.md`) |
| Purpose | Ingest external material and extract text for repurposing |
| Features | Source types: youtube, article, twitter, tiktok, text, audio, pdf, perplexity-query (DOCUMENTED via MCP tools); custom extraction instructions |
| API Activity | `sources` CRUD, `POST /sources/search`, `POST /source-resolutions-v2`, `POST/GET /source-resolutions-v3[/:id]` (v3 public). WS S→C `sourceResolve` |
| Status | Static-only |

### 5. Remixing

| Field | Value |
|---|---|
| Page/Route | `/remix` (legacy, DOCUMENTED); Inspiration → Remix Posts (DOCUMENTED) |
| API Activity | `GET /remix-agent/state`; WS `remixAgentClientAction` / `remixAgentServerAction` |
| Status | Static-only |

### 6. Brand Kit ("My Brand")

| Field | Value |
|---|---|
| Page/Route | Settings → My Brand (DOCUMENTED; route UNVERIFIED, likely `/settings/brand`) |
| Purpose | Brand context used during generation; multiple brands supported (contract has list/create/update/delete) |
| API Activity | `GET/POST /brands`, `PATCH/DELETE /brands/:brandId` |
| Status | Pending (auth) |

### 7. Videos / Visuals (AI video, images, carousels, slideshows, infographics)

| Field | Value |
|---|---|
| Page/Route | Videos (list) → Create New Video = `/videos/new` (DOCUMENTED, help `web-app-features/videos.md`); list route INFERRED `/videos` |
| Purpose | Template-driven visuals: images, carousels, slideshows, videos (DOCUMENTED). Marketing site claims about 40 visual templates incl. infographics and AI avatar video (DOCUMENTED, marketing) |
| Features | "Choose a Template" screen (e.g. "AI Agent Visual Generator", "AI Video with AI Voice", "Instagram Carousel Slideshow"); prompt; "advanced options"; "Generate Video"; edit, mute, export; credit use (DOCUMENTED). The in-app AI Agent makes text + images only; videos/carousels/slideshows go through this template screen (DOCUMENTED) |
| API Activity | Public: `GET /videos/templates`, `POST /videos/from-templates`, `GET /videos/creations/:id`, `DELETE /videos/:id`. Internal: `videos-v2` (list/create/find/update), `videos-v2/:id/media`, `videos-v2/:id/renders`, `videos-v2/templates`, `POST /videos/creations`, `GET /videos/captions/voices`, `POST /scripts`. WS C→S `videoAgentMessage`, `videoAgentRender`. WS S→C `videoV2ScriptReady`, `videoV2OverlayStateUpdate`, `videoV2OverlayUpdate`, `videoV2StateUpdate`, `videoV2RenderUpdate`, `videoAgentStatus/Partial/Done/RenderProgress` |
| Status | Pending (auth) |

### 8. AI Images

| Field | Value |
|---|---|
| Page/Route | Content Studio workflow + templates (DOCUMENTED `web-app-features/ai-images.md`) |
| API Activity | `POST /generations/images`, `POST /post-drafts/parts/:partId/media/image-gen` |
| Status | Static-only |

### 9. Social accounts

| Field | Value |
|---|---|
| Page/Route | `/accounts` (CONFIRMED nav target in bundle + DOCUMENTED) |
| Purpose | Connect, reconnect and inspect social destinations; copy account/Page IDs |
| Features | Accounts → Connect account → select platform; copy account/Page IDs; per-account actions menu; reconnect to refresh permissions (DOCUMENTED). 9 platforms: X, LinkedIn, Facebook Pages, Instagram, TikTok, YouTube, Threads, Bluesky, Pinterest (DOCUMENTED, marketing). Subaccounts for FB Pages / LinkedIn pages and Pinterest boards (CONFIRMED contract) |
| API Activity | `GET/DELETE /accounts`, `DELETE /accounts/subaccounts`, `GET /users/me/accounts`, `GET /users/me/accounts/:accountId/subaccounts`, `GET/PUT /integrations/oauth2/linkedin/pages`, `GET /social/pinterest/boards` |
| Status | Pending (auth). Do NOT disconnect anything. |

### 10. Posts (post creation, publishing outcomes)

| Field | Value |
|---|---|
| Page/Route | `/posts`, with status as a query param e.g. `/posts?status=published` (DOCUMENTED). Filters All / Scheduled / Published / Failed, by platform and time window |
| API Activity | `GET/POST /posts`, `GET /posts/:postSubmissionId`, `GET /published-posts[/:id]`, `GET/DELETE /failed-posts[/:id]`, `POST /media`, `POST /media/uploads` (presigned → `database.blotato.io`) |
| Status | Pending (auth). Do NOT publish. |

### 11. Calendar & scheduling

| Field | Value |
|---|---|
| Page/Route | Calendar (DOCUMENTED; route UNVERIFIED, likely `/calendar`); "Weekly posting schedule" section |
| Features | Posts by week; recurring slots under "Weekly posting schedule"; old "Weekly schedule" page and "Calendar (BETA)" merged here (DOCUMENTED); next-available-slot lookup (CONFIRMED contract) |
| API Activity | `schedules` list/find/update/delete + bulk delete; `schedule/slots` list/create/update, `DELETE /schedules/slots/:id`, `POST /schedule/slots/next-available` |
| Status | Pending (auth) |

### 12. Developer Platform: Logs

| Field | Value |
|---|---|
| Page/Route | `/logs` (DOCUMENTED) |
| Purpose | API/MCP/automation activity log: activity-type + result filters, search, platform/account filter, row detail with outcome/destination/endpoint/time, raw request and response, "Copy request ID" (DOCUMENTED); DM filter for failed automation runs (DOCUMENTED) |
| API Activity | `GET /api-requests`, `GET /api-requests/:id`, `GET /api-requests/stats`, `POST /api-requests/retry` (internal-only). WS `apiDebuggerAgentAction` (both directions), which suggests an AI "API debugger agent" in Logs (INFERRED) |
| Status | Pending (auth) |

### 13. Settings → API / MCP / API setup wizard

| Field | Value |
|---|---|
| Page/Route | `/settings/api` (DOCUMENTED); `/api-setup?start` wizard (DOCUMENTED) |
| Features | API credentials and client-specific setup instructions (DOCUMENTED). Docs name ChatGPT, Claude, Codex, Hermes and OpenClaw as MCP clients (DOCUMENTED) |
| API Activity | `POST /users/me/api-keys`; `users/me/api-setup` (+ `/start`, `/skip`, `/complete`, `/account`, `/tool`); onboarding flags |
| Status | Pending (auth). Do NOT generate API keys: during a trial this ends the trial and starts billing (DOCUMENTED). |

### 14. MCP (external surface)

| Field | Value |
|---|---|
| Endpoint | `https://mcp.blotato.com/mcp`, Streamable HTTP; OAuth (browser session approval) or `blotato-api-key` header (DOCUMENTED) |
| Tools | 35 tools (DOCUMENTED), e.g. `blotato_get_user`, `blotato_list_accounts`, `blotato_create_post`, `blotato_list_posts`, `blotato_list_top_posts`, comments/messages/automations/schedules/sources/designs/presigned-upload |
| Status | Documented only (no MCP connection made) |

### 15. n8n / Make integrations

| Field | Value |
|---|---|
| Surfaces | Official n8n node and Make modules (DOCUMENTED); automation templates |
| In-app | `automation-accounts` contract stores `{accountType:"n8n", baseUrl, apiKey}` (CONFIRMED schema). The app can link a user's own n8n instance (INFERRED purpose) |
| API Activity | `GET/POST /automation-accounts`, `DELETE /automation-accounts/:accountId` |
| Status | Static-only |

### 16. Inbox (comments + DMs)

| Field | Value |
|---|---|
| Page/Route | Inbox, tabs Posts (comments) and Chats (DOCUMENTED; route UNVERIFIED, likely `/inbox`) |
| Platforms | Instagram and Facebook Pages (DOCUMENTED) |
| API Activity | `GET /inbox/chats`, `GET /inbox/chats/:chatId/items` (internal); `comments`, `conversations`, `messages` (public). WS S→C `messagingMessageUpdate`, `commentsCommentUpdate` |
| Status | Pending (auth). Do NOT send messages or replies. |

### 17. DM automations

| Field | Value |
|---|---|
| Page/Route | `/dm-automations` (DOCUMENTED, help `dm-automations.md`) |
| Purpose | Comment-to-DM / DM-to-DM auto replies on Instagram and Facebook Pages only (DOCUMENTED) |
| Features | "New automation" dialog (account + flow name, account locked after creation); up to 2 triggers (comment, DM); shared case-insensitive substring keywords; specific-post picker (Blotato-published posts, 20 newest + search) or any post; message ≤640 chars + up to 3 link buttons; optional follow gate (IG only, 30-day window), email gate (72 h), public comment reply (3–6 rotating variants, `{{mention}}`), webhook (GET/POST/PUT/PATCH/DELETE, 15 s timeout, SSRF-blocked private addresses, headers redacted in logs); Draft/Live states; per-trigger pause switch; Duplicate to same-platform account; list columns Automation, Account, Runs 24h, Success, Failed, Last run, State (all DOCUMENTED) |
| Inputs | Account, name, triggers, keywords, post, message, buttons, gate messages, reply variants, webhook method/URL/headers |
| Outputs | Runs, logs, totals `triggered`/`completed`/`failed` (DOCUMENTED) |
| API Activity | `dm-automations` CRUD, `/:id/runs`, `/:id/logs`, `/:id/analytics`, `PATCH /:flowId/triggers/:triggerId` |
| Status | Pending (auth) |

### 18. Analytics

| Field | Value |
|---|---|
| Page/Route | `/analytics` (DOCUMENTED, help `analytics.md`) |
| Features | Range 7 days / 30 days / All time; KPIs Posts published, Views, Comments, Likes, Publishing success rate, API requests, Failed posts, Time saved; Top posts with ranking selector; Performance by platform with metric selector; Latest posts; publishing health; "Analytics pending" state. Snapshot cadence per plan: Starter 4 over 30 d, Creator 18 over 30 d, Agency 20 over 90 d. Platforms: X, IG, FB, Threads, Bluesky, TikTok, YouTube, Pinterest; **no LinkedIn** (all DOCUMENTED) |
| API Activity | `GET /analytics`, `/analytics/platforms`, `/analytics/summary`, `/posts/:id/analytics` |
| Status | Pending (auth) |

### 19. Tools: Inspiration, Prompts, Viral AI Coach

| Field | Value |
|---|---|
| Page/Route | Tools menu (DOCUMENTED; routes UNVERIFIED) |
| API Activity | Inspiration: `POST /viral-posts` (search). Prompts: `prompts` CRUD + clone. Viral AI Coach: `GET /labs/viral-coach[/:id]`, `POST /labs/viral-coach/analyze` |
| Status | Pending (auth) |

### 20. Settings: Profile, Billing, Team, Affiliates

| Field | Value |
|---|---|
| Page/Route | `/settings/billing` (CONFIRMED nav target + DOCUMENTED); Profile, Team access, Affiliates (DOCUMENTED; routes UNVERIFIED) |
| Features | Plan/subscription, credits purchase via Stripe Checkout, active-contacts limits, email change, preferences, Tolt affiliate referral |
| API Activity | `GET/POST /credits`, `POST/PATCH /subscriptions`, `PATCH /users/me/email`, `POST /users/me/email-change/confirm`, `GET/PATCH /me/preferences` |
| Status | Pending (auth). Do NOT touch billing. |

### 21. Internal/admin (observed in client contract; out of scope)

| Field | Value |
|---|---|
| API Activity | `POST /superadmin/:userId/impersonations`, `GET /admin/quicklinks/:userId/api-logs`, `POST /admin/quicklinks/duplicate-video` |
| Note | Admin contract shipped in the public client bundle (CONFIRMED). Recorded only as an architecture observation. **Not to be probed.** |

## Summary counts

- UI modules identified: 21 (1 investigated live, 20 static/documented).
- Contract endpoints: 133 (46 public, 87 internal-only).
- Realtime events: 23 S→C, 9 C→S.
