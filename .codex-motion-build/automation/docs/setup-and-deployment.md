# Setup and deployment

Components: seven n8n workflows (`n8n/`), the dashboard backend (`server/`, zero dependencies, Node 18+), Airtable, and the web frontend (`web/`, built by someone else against `docs/backend-api.md`; the backend serves `web/dist`).

```
Browser -> backend (/api, session cookie) -> n8n webhooks -> Apify / OpenAI / HeyGen / Blotato / Airtable (write)
                     \-> Airtable (read-only token)
```

Provider keys live only in n8n credentials. The backend holds the three webhook tokens and a read-only Airtable token. The browser gets neither.

> **Free-tier path (n8n self-hosted, Groq/Ollama/Claude, Postiz, uploaded videos instead of HeyGen):** see `free-stack-setup.md`. `npm run n8n:install`, `npm run setup:local` and `npm run start:all` set up and run everything locally. The sections below describe the general setup.

## 1. Airtable

Create the table per `docs/airtable-schema.md` (including the SourceType, Niche, BrandVoice, BrandVoiceNotes, AvatarID, VoiceID and Upload* fields). Create two personal access tokens: one with `data.records:read` + `data.records:write` for n8n, one with `data.records:read` only for the backend.

## 2. n8n

Follow `n8n/README.md` Setup: environment variables from `env.example`, credentials with the exact names, import all seven JSON files, activate them. Set `PUBLISH_ADAPTER=blotato` and `BLOTATO_ACCOUNT_ID` only when you are ready for real publishing (keep `mock` until then). `AUTO_PUBLISH=false` keeps publishing an explicit dashboard action. Check the result in the dashboard Settings page (backed by workflow 07), which probes every provider with the stored credentials.

## 3. Backend

```
cd automation
npm run hash-password -- "your password, 10+ characters"   # prints DASHBOARD_PASSWORD_HASH
cp server/env.example .env     # fill in; load it with your process manager or `node --env-file=.env server/index.cjs`
npm run server
```

With `NODE_ENV=production` the server refuses to start without a hashed password and a 32+ character `SESSION_SECRET`.

- Put it behind a TLS reverse proxy (Caddy, nginx) and set `PUBLIC_BASE_URL` to the public https origin. The session cookie becomes `Secure`. Set `TRUST_PROXY=true` only if the proxy sets `X-Forwarded-For` itself.
- **Video upload needs `PUBLIC_BASE_URL`.** Blotato downloads the uploaded file from `PUBLIC_BASE_URL/media/<id>.mp4`, so the server must be reachable from the internet over https. Staged files are private until the upload is submitted, and the media URL is an unguessable 128-bit id. Without it, uploads are disabled and Settings says so.
- Keep `UPLOAD_DIR` on persistent disk; unsubmitted files are removed after 24 hours.
- The webhook tokens must match the `Reels Intake/Internal/Approval Webhook Auth` credentials. A mismatch surfaces as `N8N_AUTH_FAILED` in the dashboard.
- Run one backend instance. The in-flight locks and the publish guard are per process.

## 4. Local development without any account

```
npm run dev:stack
```

Starts mock Airtable/Apify/OpenAI/HeyGen/Blotato, an HTTP wrapper around the simulated n8n runtime that executes the real generated workflows, and the backend on `http://127.0.0.1:8787` (password `dev-password`, override with `DEV_PASSWORD`). Nothing can reach a real service or Instagram. Frontend dev servers can proxy `/api` and `/media` to it.

## Testing status

`npm test` runs 203 tests. All use mocks. Separately, the seven workflows have been imported, published and started in a real local n8n 2.46, and the backend's Settings call ran workflow 07 there; it reached the real Apify and LLM endpoints and got real authentication errors because no keys were set. **No provider call has succeeded with a real key yet.**

| Area | Mock-tested | Real-tested |
|---|---|---|
| Workflows (intake, content, approval, video, publish, upload, status) | yes, through a simulator that runs the generated nodes | no (never imported into real n8n) |
| Backend over HTTP: auth, CSRF, throttling, submit, edit, approve, reject, regenerate, retry, resume, publish, uploads, settings/options, SSE, static files | yes (`test/server.test.cjs`) | no |
| Duplicate submit, duplicate upload, concurrent publish clicks, stale content | yes | no |
| Airtable, Apify, OpenAI, HeyGen, Blotato, Instagram | request shapes and mock behaviour only | no |
| Frontend | not built | no |

Run the first real tests with throwaway accounts: submit one reel, approve, check the HeyGen render, and publish once to a private test Instagram account.

## Known limits

- The duplicate-publish guard is layered (UI state, backend in-flight lock plus a 15 s window, workflow state check and locks) but best effort: Blotato has no idempotency key, so an ambiguous create outcome stops for a human check.
- No stuck-record sweep (workflow 08 is not built); the API flags `stuck` records and `retry`/`resume` recover them.
- HeyGen avatar and voice pickers show the first page only (`hasMoreAvatars/hasMoreVoices`); a chosen id outside it is still accepted.
- The history view is capped by `HISTORY_MAX_RECORDS` (default 2000, `truncated` is reported).
- Single shared dashboard password; the name given at login is self-asserted, not verified identity.
- Live updates come from a server-side Airtable poll (Airtable has no push), 5 s while work is in progress, 20 s when idle, and only while a dashboard is open.
