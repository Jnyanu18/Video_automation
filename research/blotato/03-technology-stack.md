# 03 - Initial Technology Identification

> **Update (pass 2):** confirmed live while logged in: `wss://backend.blotato.com/events`, Intercom WebSockets, and PostHog (via `geometry.blotato.com`) with session replay. Mode switch is client-side only. See [05-authenticated-findings.md](05-authenticated-findings.md).

Scope: static analysis of the 35 first-party scripts served on `https://my.blotato.com/login`, plus public pages. No authenticated traffic.
Evidence:
- REA bundle analysis ev_5b9d3fa1…, inspect ev_a0b39311…
- Exported scripts manifest: [network/login-shell-scripts-manifest.json](network/login-shell-scripts-manifest.json)
- String scan: [network/login-shell-string-scan.txt](network/login-shell-string-scan.txt)

## Web app (my.blotato.com)

| Layer | Finding | Confidence | Evidence |
|---|---|---|---|
| Framework | Next.js **App Router** (route groups `app/(logged-out)/layout`, `app/(logged-out)/login/page`; `_next/static/chunks/*`, `main-app-*.js`, `webpack-*.js`) | CONFIRMED | chunk paths, RSC route group names |
| Hosting | Vercel (`vercel.live` feedback/toolbar script referenced) | CONFIRMED (reference) / INFERRED (host) | script origins |
| UI library | React + **Mantine** (Mantine signatures in 20 chunks) | CONFIRMED | bundle scan |
| Rich text | **Slate** editor (8 chunks); probably the post/draft editor | CONFIRMED (presence) | bundle scan |
| State | **Jotai** atoms | CONFIRMED (presence) | bundle scan |
| API schema | **TypeBox** schemas (`a.ZU.Object(...)`) define a typed contract shared with the client: 133 endpoints, 38 namespaces | CONFIRMED | chunk `6332-6ea21540daee7d92.js` |
| HTTP client | Custom builder: `fetch(base + "/v2" + path, {mode:"cors", credentials:"include", method})`, `:param` substitution, URLSearchParams query | CONFIRMED | module 76824 in chunk `6332` |
| Auth (web) | Cookie session (`credentials:"include"`); passwordless email one-time code | CONFIRMED (client side) / INFERRED (cookie attributes) | login page + client code |
| Realtime | Native `WebSocket("wss://backend.blotato.com/events")` ("realtime hub"), typed ServerToClient (23) / ClientToServer (9) events | CONFIRMED | chunk `6332` |
| Product analytics | **PostHog**, reverse-proxied via `https://geometry.blotato.com`, ui_host us.posthog.com; **session recording with `maskAllInputs:false`** (only password inputs masked) | CONFIRMED | `main-app` init config |
| Marketing/attribution | Google Tag / Ads (`_gcl_ls`), Meta Pixel, Tolt affiliate (`window.tolt_referral`), `lastExternalReferrer` in localStorage | CONFIRMED (code refs) | bundle scan |
| Payments | Stripe Checkout (credits / subscriptions) | CONFIRMED (code refs) | bundle + contract `credits`, `subscriptions` |
| Error monitoring | Sentry-like references | UNVERIFIED (may be inside vendor code) | string scan |
| Support chat | Intercom/Crisp strings appear inside PostHog vendor code only; the actual chat vendor is unknown | UNVERIFIED | string scan |
| Media | `database.blotato.io` media host; presigned uploads (`POST /media/uploads`) | CONFIRMED (host string + contract) | bundle |

## Backend (black-box view)

| Item | Finding | Confidence |
|---|---|---|
| API host | `https://backend.blotato.com`, version prefix `/v2` | CONFIRMED |
| Public spec | `/openapi.json`, OpenAPI 3.0.3 "Blotato API 2.0.0", 46 ops, header `blotato-api-key` | CONFIRMED (downloaded) |
| Internal surface | 87 additional internal-only endpoints sharing the same host/prefix (drafts, prompts, brands, sources, schedule slots, videos-v2, viral coach, remix agent, api-requests logs, inbox, subscriptions, admin) | CONFIRMED (client contract) |
| Dual auth | The same `/v2` routes accept a cookie session (web) and `blotato-api-key` (public). One backend serves both | INFERRED |
| Async jobs | Generation (visuals, sources, drafts, renders) is async, with status polling (public API) or WS push (web) | CONFIRMED (contract + docs) |
| AI agents | Server-side agents: chat/post-draft agent, remix agent, video agent, API debugger agent (each has WS action events) | CONFIRMED (event names) / INFERRED (agent nature) |
| Analytics collection | Scheduled metric snapshots per post (plan-based checkpoints) | DOCUMENTED |
| Webhooks | Outbound webhooks with private-IP blocking, 15 s timeout, no redirects, header redaction | DOCUMENTED |

## Other surfaces

| Surface | Tech | Confidence |
|---|---|---|
| www.blotato.com | **Astro** (`/_astro/` assets) | CONFIRMED (asset paths) |
| help.blotato.com | **GitBook** (llms.txt, `.md` page variants, "Agent Instructions" block) | CONFIRMED |
| mcp.blotato.com/mcp | MCP Streamable HTTP; OAuth or API key; 35 tools | DOCUMENTED |
| n8n / Make | Official community node / Make app over the public REST API | DOCUMENTED |

## Realtime event catalog (CONFIRMED in client code)

| Direction | Events |
|---|---|
| Server → Client | `apiDebuggerAgentAction`, `chatMessageSendIntent`, `chatMessageSendPartial`, `postDraftCreate`, `postDraftPartVariationCreate`, `postDraftPartVariationUpdate`, `postDraftMediaVariationUpdate`, `postDraftMediaVariationError`, `remixAgentServerAction`, `sourceResolve`, `userNotification`, `messagingMessageUpdate`, `commentsCommentUpdate`, `videoV2ScriptReady`, `videoV2OverlayStateUpdate`, `videoV2OverlayUpdate`, `videoV2StateUpdate`, `videoV2RenderUpdate`, `userQuotaError`, `videoAgentStatus`, `videoAgentPartial`, `videoAgentDone`, `videoAgentRenderProgress` |
| Client → Server | `apiDebuggerAgentAction`, `chatMessageSend`, `chatMessageSendPrompt`, `postDraftWizardCreate`, `postDraftCreate`, `postDraftCreateMultiple`, `remixAgentClientAction`, `videoAgentMessage`, `videoAgentRender` |

## Client-side storage observed (logged-out)

- localStorage: `lastExternalReferrer`, `lastExternalReferrerTime`, `_gcl_ls`, `ph_<key>_posthog`
- sessionStorage: PostHog window/session keys
- Cookie names and values were deliberately **not** collected.

## Architecture observations (for later phases)

1. **The admin contract ships to every client.** Superadmin impersonation and admin quicklink endpoint definitions are in the public bundle. Server-side authorization is presumably enforced. Not probed.
2. **PostHog replay with unmasked inputs.** Text typed into the app (including prompts) is likely captured in session replays.
3. **The public API is a strict subset of the internal API.** All 46 public operations also appear in the web contract, so the web app and the public API share one backend.
