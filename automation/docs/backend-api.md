# Dashboard backend API

Base URL is the backend origin (default `http://127.0.0.1:8787`; `npm run dev:stack` starts it with mock providers, password `dev-password`). The browser never talks to n8n, Airtable or any provider. All JSON. Errors have the shape `{ ok:false, error:"CODE", message:"...", errors?:[...] }`.

## Session and security

- `POST /api/login` `{ password, name? }` -> `{ ok, user:{name}, csrfToken }` and an `HttpOnly; SameSite=Strict` cookie `reels_session`. `401 INVALID_CREDENTIALS`, `429 TOO_MANY_ATTEMPTS` (5 failures, growing lockout).
- `GET /api/session` -> `{ authenticated:false }` or `{ authenticated:true, user, csrfToken }`. Call on page load to restore the CSRF token.
- `POST /api/logout`.
- Every non-GET request needs header `X-CSRF-Token: <csrfToken>` (else `403 CSRF_FAILED`) and a same-origin `Origin`. Any other route without a session returns `401 UNAUTHENTICATED`.

## Reads

| Route | Result |
|---|---|
| `GET /api/summary` | `{ totals:{submitted,awaitingApproval,generating,readyToPublish,published,failed,rejected}, byStatus, stuck, recent:[{id,title,sourceType,status,at,error}], truncated, fetchedAt }`. `submitted` is the total ever submitted |
| `GET /api/reels?status=A,B&source=reel\|upload&q=text&page=1&pageSize=20` | `{ items:[row], total, page, pages, pageSize, counts:{STATUS:n}, truncated }`. Row: `id,key,status,sourceType,title,reelUrl,niche,brandVoice,caption,createdAt,updatedAt,submittedBy,publishedUrl,publishedAt,error,retryCount,failedFrom,busy,stuck,retryable` |
| `GET /api/reels/:id` | `{ reel }` = row plus `fingerprint, source{caption,transcript,transcriptSource,owner,duration}, content{script,caption,overlay,hashtags[]}, avatarId, voiceId, upload, approval, video{status,url,previewUrl,thumbnailUrl,duration,attempt,pollAttempts,...}, publish{adapter,status,postSubmissionId,publishedUrl,publishedAt,...}, errors[], lastAction, progress[{key,label,state}], actions` |
| `GET /api/settings?refresh=1` | `{ workflows:{ ok, integrations:{n8n,airtable,apify,openai,heygen,blotato}, settings }, backend:{airtableRead, webhooks, uploads, liveUpdates} }`. Each integration is `{status:'connected'\|'error'\|'unconfigured', code?, message, missing[]}`. Blotato includes the connected Instagram `account`. `workflows.ok=false` carries `error` (`N8N_UNREACHABLE`, `N8N_AUTH_FAILED`, `N8N_WORKFLOW_NOT_ACTIVE`, `N8N_NOT_CONFIGURED`, ...). Never contains a key or token |
| `GET /api/options?refresh=1` | `{ ok, avatars[{id,name,previewImageUrl,previewVideoUrl}], voices[{id,name,language,scope}], hasMoreAvatars, hasMoreVoices, defaults, warnings, presets:{niches,brandVoices} }` |

`progress[].state` is `done | active | waiting | failed | rejected | pending`. `actions` is `{ edit, approve, reject, regenerate, publish, retry, resume }`, each `{ allowed:true }` or `{ allowed:false, reason }`. Render buttons from this; do not re-derive the rules.

Use `fingerprint` as `expectedFingerprint` for edit, approve, reject, regenerate and publish.

## Writes

| Route | Body | Notes |
|---|---|---|
| `POST /api/reels` | `{ url, niche?, brandVoice?, brandVoiceNotes?, avatarId?, voiceId? }` | `202 { recordId, status:'SUBMITTED' }`; duplicate: `200 { duplicate:true, recordId }`. `400 INVALID_URL / INVALID_OPTIONS / AVATAR_REQUIRED / VOICE_REQUIRED / AVATAR_NOT_FOUND / VOICE_NOT_FOUND` |
| `POST /api/uploads` | raw video bytes; headers `Content-Type: video/mp4\|video/quicktime`, `X-File-Name: <urlencoded name>` | `201 { upload:{uploadId,fileName,sizeBytes,durationSeconds,mimeType,previewUrl} }`. `413 FILE_TOO_LARGE`, `415`, `422 FILE_NOT_A_VALID_VIDEO / VIDEO_DURATION_OUT_OF_RANGE`, `503 UPLOADS_NOT_CONFIGURED`. Use XHR for upload progress. The file stays private until submitted |
| `POST /api/reels/upload` | `{ uploadId, caption, overlay?, hashtags?[], niche?, brandVoice?, brandVoiceNotes? }` | `201 { recordId, status:'AWAITING_APPROVAL' }` or `200 { duplicate:true }`. `400 INVALID_UPLOAD { errors }` |
| `POST /api/reels/:id/edit` | `{ expectedFingerprint, script?, caption?, overlay?, hashtags? }` | `200 { fingerprint }` (use the new one). `422 CONTENT_INVALID { errors }` |
| `POST /api/reels/:id/approve` | `{ expectedFingerprint }` | `202` and HeyGen starts (reel) or `200` (upload, ready to publish) |
| `POST /api/reels/:id/reject` | `{ expectedFingerprint, reason }` | reason 3-500 characters |
| `POST /api/reels/:id/regenerate` | `{ expectedFingerprint, note? }` | `202`; not for uploads; limit `approval.maxRegenerations` |
| `POST /api/reels/:id/publish` | `{ expectedFingerprint }` | only from `VIDEO_COMPLETED`. `202` once; later clicks give `200 duplicate` or `409 PUBLISH_ALREADY_REQUESTED / ACTION_IN_PROGRESS` |
| `POST /api/reels/:id/retry` | `{}` | `FAILED` records only; resumes the failed stage |
| `POST /api/reels/:id/resume` | `{}` | an `APPROVED` record that stalled for over a minute |

Common action errors: `409 STALE_CONTENT` (reload the reel; the body has the current `fingerprint`), `409 INVALID_STATE` (`currentStatus`), `409 ACTION_IN_PROGRESS`, `423 RECORD_BUSY`, `404 NOT_FOUND`, `502 N8N_*` (the workflow layer is unreachable or misconfigured).

## Live updates

`GET /api/events` is a server-sent-event stream (`EventSource`, cookie sent automatically). Events: `hello`, `reel {id,kind:'new'|'changed'|'removed',status}`, `summary {changed}`, `connection {ok}` (Airtable reachable). Refetch the affected data when `reel` or `summary` arrives, and once on every `hello` (also fired on reconnect). The server polls Airtable only while at least one stream is open; browsers should not poll.

## Media

`/api/uploads/:uploadId/preview` (signed in) previews a staged file. `reel.video.previewUrl` is a same-origin `/media/<id>.mp4` for uploaded videos, or the provider's https URL for HeyGen videos. Only https URLs are ever returned.
