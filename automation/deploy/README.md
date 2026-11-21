# Deploying the AI Video Editor

Target: one always-on Linux box running three containers behind Caddy. Verified shape for
**Oracle Cloud Always Free** (Ampere A1, 4 OCPU / 24 GB / 200 GB, arm64, ₹0/month), and
identical on any x86 VPS.

Everything is one origin: Caddy serves the SPA and the API from the same hostname. That is
deliberate — the session cookie is `SameSite=Strict`, so splitting the frontend onto a
different domain (Vercel, for example) would stop the browser sending it and break sign-in.

```
internet ──443──> caddy ──> dashboard :8787 ──> engine :8793
                            (auth boundary)     (no auth of its own)
```

**The engine is never published to the host.** It has no authentication: it trusts the
`X-Studio-User` header that `server/editor-proxy.cjs` sets after authenticating the browser.
Anything that can reach port 8793 can read every account. The compose file has no `ports:`
entry for it, which is load-bearing, not an omission.

---

## 0. The quickest way to see it on a real URL (no server, no money)

Before the box exists, you can put the app on a public HTTPS address from this Windows machine
in about two minutes. Use it for a demo or to open the dashboard on your phone - not for clients:
the URL dies when you close the terminal, and the machine must stay awake.

`cloudflared` is already installed here (`cloudflared --version` -> 2025.8.1), so nothing to fetch.

```bash
cd automation
npm run server                     # reads server/.env; serves the SPA and the API on :8787
cloudflared tunnel --url http://127.0.0.1:8787    # prints a https://<random>.trycloudflare.com URL
```

Verified on 2026-11-20 against a local start on 127.0.0.1:
- `GET /` serves `web/dist/index.html`; `/api/*` is the same origin, so the `SameSite=Strict`
  cookie works and there is nothing to configure.
- `/api/health` without a session -> 401. A wrong password -> 401.
- The CSRF check compares the `Origin` header's host against the `Host` header, so a tunnel
  hostname passes with no allowlist to maintain.

Two things to set in `server/.env` before you share the link:
- `COOKIE_SECURE=true` - the tunnel is HTTPS, so the cookie should refuse to travel over HTTP.
- `PUBLIC_BASE_URL=https://<the tunnel host>` - video upload to Blotato refuses to run without
  an https base URL, because the platform has to fetch the file back from this server.

Both are per-tunnel values (the hostname is random each run), which is the main reason this is a
demo path and not a deployment.

---

## 1. The box

Create an Ampere A1 instance, Ubuntu 24.04 **arm64**, 4 OCPU / 24 GB, 200 GB boot volume.

Two things that reliably cost people hours:

- **"Out of host capacity"** on Always Free ARM is routine. Retry across availability
  domains, or retry periodically — it clears.
- **Ports must be opened twice.** Oracle's Ubuntu images ship iptables rules that drop
  everything, *on top of* the cloud security list. Open 80 and 443 in the VCN security
  list **and** on the instance:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80  -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

Then Docker:

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git
sudo usermod -aG docker "$USER" && newgrp docker
```

## 2. A hostname with TLS

A certificate cannot be issued for a bare IP address, and without HTTPS the `Secure`
session cookie is dropped and sign-in fails silently. A free
[DuckDNS](https://www.duckdns.org) subdomain pointed at the instance's public IP is enough;
Caddy then gets and renews a Let's Encrypt certificate on its own.

Verify DNS resolves to the instance **before** starting the stack, or Caddy's first
certificate attempt fails and backs off.

## 3. Deploy

```bash
git clone <this repo> && cd automation
cp deploy/env.production.example deploy/.env
# fill in SITE_HOST, PUBLIC_BASE_URL, SESSION_SECRET (openssl rand -base64 48), GEMINI_API_KEY
docker compose -f deploy/docker-compose.yml up -d --build
```

First build takes a while: it compiles nothing, but it downloads ffmpeg,
chrome-headless-shell, the HyperFrames CLI and the whisper weights, all baked in so that
no client's first job waits on a download.

Create the pilot accounts:

```bash
docker compose -f deploy/docker-compose.yml exec dashboard \
  node server/create-user.cjs "client@example.com" "<password, 10+ chars>"
```

Check it:

```bash
docker compose -f deploy/docker-compose.yml ps          # all three healthy
curl -fsS https://$SITE_HOST/api/session                 # {"ok":true,"authenticated":false}
docker compose -f deploy/docker-compose.yml exec engine curl -fsS localhost:8793/healthz
curl -sI http://<instance-ip>:8793                       # MUST fail/timeout
```

That last check matters: if the engine answers from outside, stop and fix it before anyone
signs in.

## 4. Backups

`app_data` holds every account's state, uploads and renders, and `users.json` holds the only
copy of their password hashes. Nightly, to Oracle Object Storage (10 GB free):

```bash
docker run --rm -v ai-editor_app_data:/data -v "$PWD":/out alpine \
  tar czf /out/app_data-$(date +%F).tar.gz -C /data .
```

Restoring an untested backup is not a backup — restore one into a throwaway volume once.

## 5. Updating

```bash
git pull
docker compose -f deploy/docker-compose.yml up -d --build
```

**Jobs in flight do not survive this.** Background work runs in daemon threads inside the
engine process, so a restart loses them; the job row stays "running" forever and the UI
keeps waiting. Deploy when nothing is rendering, or accept the loss. A durable job queue is
the next real piece of work — see the gaps below.

Rollback is `git checkout <previous tag>` and the same command; the volume is untouched.

## 6. Known gaps — read before putting clients on this

- **No durable job queue.** Covered above. Affects every deploy and every crash.
- **One engine process only.** The per-account store is a JSON file guarded by an
  in-process lock. Do not add uvicorn workers or a second engine replica: writes would be
  lost silently.
- **Publishing is STANDBY.** Postiz is unconfigured and n8n is not installed, so the
  publish connectors do nothing. Leave the env vars empty and the features degrade
  honestly rather than failing. Do not advertise publishing yet.
- **Long-form footage is not supported.** This deploys the short-form lane: a few minutes
  of footage per job. The 1–8 hour multi-camera event pipeline does not exist yet
  (`docs/ANTIGRAVITY-BUILD-LONGFORM-EDITOR.md`).
- **`MAX_UPLOAD_MB=100`** is the real ceiling, with no resumable upload. A dropped upload
  starts over.
- **ARM64 note.** `ctranslate2` and `opencv-python-headless` need `linux/aarch64` wheels at
  the pinned versions, and `chrome-headless-shell` must start. All three are checked during
  the image build, so a failure is loud and at build time — not at a client's first render.
- **Idle reclamation.** Oracle reclaims idle Always Free compute. Keep the box doing
  something, or risk losing the instance.

## 6a. What has been checked without a Docker daemon

Docker Desktop is installed on the Windows dev machine but its daemon has never come up, so no
image has been built yet. These were verified statically instead, on 2026-11-20:

- **The dashboard image was missing `lib/`.** `server/config.cjs` does `require('../lib/core.js')`,
  and the Dockerfile copied only `package.json`, `server/` and `adapters/`. Reproduced by
  assembling the image's file set in a temp directory and starting the server: it died with
  `MODULE_NOT_FOUND` before logging anything. `COPY lib ./lib` added; the same simulation then
  boots, serves `/` and answers the healthcheck's `/api/session` with 200.
- **The HyperFrames CLI was installed in the wrong directory.** `render.py` computes
  `APP = parents[2]/"app"`, which from `/app/editor/services/render/` is `/app/editor/app`, but
  the build installed into `/app/app`. Every render would have fallen back to `npx hyperframes`
  and a live npm fetch - the exact failure the vendoring was meant to prevent. The install
  directory is corrected and the build now asks `render.py` itself where it looks and fails if
  the CLI is not there.
- **`studio/workflows.py` reads `<automation>/n8n`,** which no stage copied, so the automation
  hub would have listed zero workflows (a missing dir makes `Path.glob` yield nothing rather than
  raise). The 7 JSON files are now copied in.

Still unverified and only a real build will settle it: arm64 wheels, the chrome-headless-shell
install, layer ordering, and total image size.

## 7. Logs

```bash
docker compose -f deploy/docker-compose.yml logs -f --tail=100 engine
docker compose -f deploy/docker-compose.yml logs -f --tail=100 dashboard
```

Caddy's access log is inside the `caddy_data` volume at `/data/access.log`.
