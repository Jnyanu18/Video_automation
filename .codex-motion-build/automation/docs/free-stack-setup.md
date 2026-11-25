# Free-stack setup (self-hosted n8n, Airtable free, Apify free credit, Groq/Ollama, Postiz)

This is the zero-cost path to a first real run. HeyGen is replaced by **MoneyPrinterTurbo** (faceless vertical videos: voiceover, stock footage, captions; no GPU needed). Uploaded videos (workflow 06) still work too. There is no AI presenter; that would need a GPU-based avatar model.

```
Browser -> backend :8787 -> n8n :5678 -> Apify (scrape) / Groq or Ollama or Claude (script + Whisper) / Airtable (state)
                                      |-> MPT adapter :8791 -> MoneyPrinterTurbo :8080 (video) -> backend /render/<id>.mp4
                                      \-> Postiz adapter :8790 -> Postiz -> Instagram
```

Status when this was written: all of it is tested against mocks only. The first real run is yours.

## 0. One command for the local half

```
cd automation
npm run n8n:install      # one time, downloads n8n (large)
npm run setup:local      # writes .env.local with generated secrets, imports credentials + the 7 workflows into n8n
npm run start:all        # n8n + (Postiz adapter) + dashboard
```

`setup:local` prints the dashboard password once (set `DASHBOARD_PASSWORD` first to choose your own, 10+ characters). It stores everything in `.env.local` (git-ignored, mode 600). Fill in the blanks you get from the accounts below, then run `npm run setup:local` again: it keeps your values and re-imports the credentials. Restart `start:all` afterwards.

## 1. Accounts to create (free)

| Service | What to create | Goes into `.env.local` |
|---|---|---|
| **Airtable** | A base with one table `Reels` using `docs/airtable-schema.md`. Two personal access tokens: read+write (for n8n), read-only (for the dashboard), both scoped to this base | `AIRTABLE_BASE_ID`, `AIRTABLE_WRITE_TOKEN`, `AIRTABLE_READ_TOKEN` |
| **Apify** | Account (monthly free credit), API token | `APIFY_TOKEN` |
| **Groq** | Account at console.groq.com, API key. Defaults already target it: an open GPT-OSS model for scripts, `whisper-large-v3-turbo` for speech-to-text. Check Groq's model list if a model name is rejected | `LLM_API_KEY` |
| **Postiz** | See section 3 | `POSTIZ_API_URL`, `POSTIZ_API_KEY`, `POSTIZ_INTEGRATION_ID` |

## 2. Choosing the LLM

All three use the same workflow; only `.env.local` changes.

| Provider | `OPENAI_BASE_URL` | `OPENAI_MODEL` | `LLM_JSON_MODE` | Speech-to-text |
|---|---|---|---|---|
| Groq (default) | `https://api.groq.com/openai` | `openai/gpt-oss-120b` | `json_schema` | yes (`OPENAI_STT_MODEL=whisper-large-v3-turbo`) |
| Ollama (local) | `http://127.0.0.1:11434` | a model you pulled | `json_object` | no |
| Claude | `https://api.anthropic.com` | `claude-sonnet-5-5` | `none` | no |
| OpenAI | unset | `gpt-4o-mini` | `json_schema` | yes |

Claude is reached through Anthropic's OpenAI-compatible endpoint, which Anthropic describes as a compatibility layer rather than the primary API. If it misbehaves, a native Anthropic node is the next step.

Open models follow the JSON instructions less reliably than hosted strict mode. The workflow validates every reply (length, hashtags, originality against the source) and retries up to `MAX_CONTENT_ATTEMPTS`, feeding the problems back to the model. Raise that value if a small model keeps failing.

Speech-to-text only runs when Apify returns no transcript. With Ollama or Claude it fails for those reels (reels with captions of 40+ characters still work from the caption).

## 2b. Faceless video with MoneyPrinterTurbo

Workflow 04 is unchanged: it makes the same calls it made to HeyGen, and `adapters/mpt` translates them to MoneyPrinterTurbo (MPT). The approved script is used as the voiceover; footage search terms are the script's most frequent words.

1. Install MPT (MIT): `git clone https://github.com/harry0703/MoneyPrinterTurbo C:\tools\mpt`, then `uv sync --frozen` in that folder (Python 3.11+, ffmpeg). Keep the path free of spaces.
2. In `C:\tools\mpt\config.toml` set `listen_host = "127.0.0.1"`, an `api_key` under `[app]`, and `subtitle_provider = "edge"` (default; no Whisper download). For footage get a free key at pexels.com/api and put it in `pexels_api_keys = ["..."]`.
3. In `.env.local` set `MPT_DIR=C:\tools\mpt`, `MPT_API_KEY` (same value as the config's `api_key`), `MPT_VIDEO_SOURCE=pexels`. `HEYGEN_BASE_URL`, `HEYGEN_AVATAR_ID=mpt` and `HEYGEN_VOICE_ID` (an Edge voice such as `en-US-AriaNeural`) are pre-filled; the "avatar" is only a label.
4. The finished video must have a **public https address**: the adapter copies it to `runtime/renders` and the backend serves it at `PUBLIC_BASE_URL/render/<id>.mp4`. Workflow 04 rejects non-https URLs, so set `PUBLIC_BASE_URL` to your tunnel's https origin.

`MPT_VIDEO_SOURCE=local` uses clips from `MPT_DIR\storage\local_videos` (names in `MPT_LOCAL_MATERIALS`); MPT refuses paths outside that folder. It is for testing without a Pexels key.

Tested here (real MoneyPrinterTurbo 1.3.9, local clips, Edge voice): the adapter produced a 1080x1920 H.264/AAC video with captions and the backend served it with range support. Not tested: Pexels footage, the full URL-to-video run through n8n and Airtable, and Postiz posting it.

## 3. Publishing with Postiz

The workflow publishes through a small adapter (`adapters/postiz`) that exposes the three calls workflow 05 already makes and translates them to Postiz's public API. Set `PUBLISH_ADAPTER=postiz` (the default in `.env.local`).

1. Run Postiz. Self-hosting is free but uses Docker, which is **not installed on this machine**; install Docker Desktop and follow docs.postiz.com. Postiz Cloud is the no-Docker alternative and is paid (check for a trial).
2. In Postiz connect your **test** Instagram account (a business or creator account linked to a Facebook page; Postiz's Instagram page explains the two connection types). Create a Public API key in its settings.
3. `POSTIZ_INTEGRATION_ID`: the channel id. The dashboard Settings page lists the connected Instagram accounts and ids once the adapter is running.
4. Instagram fetches the video from a public URL, so the **dashboard backend needs a public https origin** for uploads: set `PUBLIC_BASE_URL` (a free Cloudflare Tunnel to port 8787 works). Postiz itself must also be reachable by Instagram for uploads it hosts.

Limits that matter: Postiz allows 30 `GET /posts` calls per hour and 90 creates per hour on self-hosted. The adapter caches status polls for 60 s (`POSTIZ_STATUS_CACHE_SECONDS`), so a reel may show "in progress" up to a minute after it is actually live.

Unverified against a live Postiz: the `/upload` response shape (the adapter expects `{id, path}`), and the exact self-hosted API base path (`/api/public/v1` per the docs). If the first publish fails, the adapter's `ADAPTER_ERROR`/`POSTIZ_*` codes appear in the record's error log.

## 4. First real run (checklist)

1. `npm run start:all`, open http://127.0.0.1:8787, sign in, open **Settings**. Fix every red integration (HeyGen shows "Disabled" by design).
2. **New reel > From reel URL** with a public reel you are allowed to use. Watch it reach "Awaiting approval", read the script, edit if needed.
3. For a full publish test use **Upload video** with a short mp4 and a caption, approve it, then **Publish** to the test Instagram account.
4. A reel submitted by URL becomes a faceless video after approval (section 2b). Check the video plays on the reel's page before publishing.

## 5. If something fails

- The record's page shows the error log. `PUBLISH_OUTCOME_UNKNOWN` means the create call's result is unknown: check Postiz for a post around the logged time before retrying (see `n8n/README.md`).
- n8n editor: http://127.0.0.1:5678 (create the owner account on first open). Executions there show the exact node that failed.
- `npm test` must stay green after any change to `lib/core.js` or the generator; run `npm run build` first.
