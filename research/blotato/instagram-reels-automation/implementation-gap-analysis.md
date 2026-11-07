# Implementation Gap Analysis

Status legend: BLOCKED = cannot be exercised without credentials or paid access. Nothing here has been tested against a real provider.

| Gap | What is missing | Why | Where to get it | Can proceed? |
|---|---|---|---|---|
| n8n runtime | n8n is not installed and Docker is not running | Local environment | `npx n8n` or Docker `n8nio/n8n` | Yes. Workflows are delivered as importable JSON and checked with a structural validator and a simulated runtime, not real n8n. |
| Blotato publishing | API key and active subscription | API/MCP access is paywalled and generating a key ends the trial | Blotato paid plan, Settings > API | Blocked. Workflow 05 (`automation/n8n/05-instagram-publishing.json`) implements the documented `POST /v2/media`, `POST /v2/posts`, `GET /v2/posts/{id}` sequence against a mock (`PUBLISH_ADAPTER=mock`). Switching to `PUBLISH_ADAPTER=blotato` plus the `Blotato API Key` credential and `BLOTATO_ACCOUNT_ID` is the only change needed; it has never been run against the real API. |
| Blotato account ID | `accountId` from `GET /v2/users/me/accounts` | Requires a connected IG account on a paid plan | Blotato dashboard / API | Blocked (mock adapter defaults to `acc_mock_1`; the real adapter requires `BLOTATO_ACCOUNT_ID`). |
| Blotato unverified details | Real media host, error body shapes, `errorMessage` on failed posts, `GET /v2/posts` item shape, dashboard location of submissions | Not in the OpenAPI or not observable without access | A first test with a throwaway paid account | Open. Handled conservatively: unknown create outcomes stop for a human (`PUBLISH_OUTCOME_UNKNOWN`) and `BLOTATO_MEDIA_HOSTS` is configurable. No reconciliation via `GET /v2/posts` is built. |
| HeyGen | API key, paid API plan, avatar look ID, voice ID | Video generation is paid | developers.heygen.com; `GET /v3/avatars/looks`, `GET /v3/models/audio/voices` | Blocked. Request/response shapes verified from the v3 OpenAPI. Webhook event names and signature scheme are unverified, so the pipeline polls instead. |
| Apify | API token; transcript add-on cost | Pay-per-event pricing | console.apify.com | Blocked. The transcript field name is unverified; the code reads `transcript` and `transcriptText` and falls back to speech-to-text. |
| OpenAI | API key | Script generation and speech-to-text fallback | platform.openai.com | Blocked (mocked). |
| Airtable | Base ID, table, PAT (`data.records:read/write`, `schema.bases:read`) | State store | airtable.com | Blocked (mocked). Schema is in `automation/docs/airtable-schema.md`. |
| Meta Graph (optional) | App, `instagram_content_publish` permission, long-lived token, IG user ID | App review required | developers.facebook.com | Blocked. Optional adapter, mocked. |
| Media re-hosting | HeyGen `video_url` is presigned and expires | Blotato accepts only its own media URLs | Handled: the video ID is stored, a fresh URL is fetched at publish time and sent to `POST /v2/media` | Yes (design). |
| Reel spec compliance | HeyGen output not inspected against Meta specs | No real render | Duration/URL checks are implemented. Codec, bitrate and fps checks need a real file | Partially. |

## Decisions
- The video ID, not its URL, is the source of truth.
- All stage transitions are guarded by status, with an optimistic lock (`LockedBy`) because Airtable has no compare-and-swap.
- Nothing publishes unless a human approves through a signed link.
- Publishing after video generation is opt-in (`AUTO_PUBLISH`, default false). Blotato's create-post call has no idempotency key, so it is never auto-retried: a persisted publish intent plus a stored `postSubmissionId` prevent duplicates, and ambiguous outcomes require a human check.
