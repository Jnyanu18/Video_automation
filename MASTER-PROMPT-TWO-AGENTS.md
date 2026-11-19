# MASTER PROMPT — paste this into a new Claude Code chat

You are the **tech lead** on a one-day build. You will not write the feature code yourself.
You will spawn **two agents — Developer 1 and Developer 2** — give each the brief written below,
then integrate their work and run one test that decides whether this ships.

Read this whole prompt before your first tool call.

---

## 1. THE GOAL

Turn a working single-operator video tool into one that supports **real separate accounts with
real separate data**, for an invite-only pilot of a handful of known clients.

In scope today: multi-user login, per-user data isolation, the Motion Graphics lane, a dashboard
lane split.

**Explicitly NOT in scope today:** public self-serve sign-up, Google OAuth, credits or billing,
a sandboxed renderer, a durable job queue, row-level database tenancy. Do not let an agent drift
into these. If an agent proposes one, tell it no and point at this line.

---

## 2. THE CODEBASE — orient yourself before spawning anything

| Thing | Value |
|---|---|
| Workspace | `J:\ai editor` |
| **Git repo root** | `J:\ai editor\new project - marketing automatio\new project - marketing automatio` |
| Engine (FastAPI, port 8793) | `<repo>\automation\editor` |
| Dashboard server (Node, port 8787) | `<repo>\automation\server` |
| Dashboard app (Expo / React Native Web) | `<repo>\automation\app` |
| Branch / remote | `main` · `github.com/Jnyanu18/Video_automation.git` |
| OS / shell | Windows 11, PowerShell. Git Bash also available. |

**Four facts that will otherwise cost an hour each:**

1. `J:\ai editor\automation` is a **directory junction** into the repo, not a folder. Both paths
   are the same bytes. Python's `os.path.islink()` returns **False** for Windows junctions, so any
   script that walks the tree counts everything twice. Run all git commands from the repo root
   above, with `-c core.longpaths=true` — paths here are long enough that some tooling fails
   silently past 260 characters.
2. **Chrome is required** for the rich render path. Without it, captions silently fall back to
   FFmpeg and the better visuals just do not appear.
3. The **Python test suite takes about 2.5 minutes** and uses real FFmpeg. That is normal.
4. The project documentation is **partly aspirational** — one audit file describes a git repo at a
   path that has no `.git`. Trust the code, never the README.

**Never run anything in `J:\ai editor\cleanup\`.** Those are disk-cleanup scripts. One of them
previously moved 1,624 files of live engine source into quarantine. Everything was recovered, but
nothing in this task needs them.

---

## 3. WHAT ALREADY EXISTS (do not rebuild any of it)

Verified by reading the source, not the docs:

- **61 working endpoints**, all defined in one 1,631-line `automation/editor/api_server.py`.
- **An enforced approval gate.** A final render is refused until a person approves the storyboard.
  Both lanes must keep using this; do not invent a second flow.
- **Auth that is nearly right.** `automation/server/auth.cjs` already does scrypt password hashing,
  a signed HttpOnly session cookie, CSRF tokens and login throttling. It checks *one* password
  because it was written for one operator — not because it cannot carry a user id.
- **An application factory partly parameterised by its data locations:**
  `create_app(state_file, renders_dir, work_dir, start_scheduler)` in `api_server.py`. The store
  and the render lock genuinely derive from those arguments, which is what makes per-user
  workspaces cheap. **But three data locations do not**, and calling
  `create_app(work_dir=...)` alone will pass a casual look and still leak between accounts. The
  exact sites are named in Developer 1's task D1-3. Read that before assuming isolation is one
  argument.
- **A dashboard that already aggregates**: `studio/analytics.py` → `overview(store)` computes the
  pipeline (analyzing, awaiting approval, approved, rendering, rendered, scheduled, published).
  Because it takes the store as an argument, it becomes per-user for free once D1-3 lands.
- **A complete, tested, unconnected motion-graphics builder**: `studio/motion_reel.py`, 496 lines,
  with `validate()` and `build()` and a passing test file — imported by nothing but its own tests.
  Developer 2 connects it. Do not write a new one.

---

## 4. BEFORE YOU SPAWN ANYTHING

Do these yourself, in order, and paste the real output of each:

```powershell
cd "J:\ai editor\new project - marketing automatio\new project - marketing automatio"
git -c core.longpaths=true status --porcelain
git -c core.longpaths=true checkout -b pilot-accounts
```

Then confirm the baseline is green before anyone changes it:

```powershell
cd "J:\ai editor\automation\editor"
python -m pytest
```

**If the suite is already failing, stop and report.** Do not start a build on a red baseline.

---

## 5. SPAWN THE TWO AGENTS

Spawn both **in parallel**, as general-purpose agents, passing each the brief below **verbatim**
plus section 2 (the codebase facts) and section 3 (what exists).

The briefs are written so the two agents touch **disjoint files**. That rule is what keeps them
from overwriting each other, so repeat it to them and enforce it at integration.

---

### DEVELOPER 1 — accounts and data isolation

> You own identity and isolation. When you are done, two different people can log in and neither
> can see any trace of the other's work.
>
> **Files you may change:** `automation/server/auth.cjs`, `automation/server/config.cjs`,
> `automation/server/index.cjs`, `automation/server/editor-proxy.cjs`, the API's `schema.sql`, the
> app-factory and startup section of `automation/editor/api_server.py`, plus any new files you
> create under `automation/editor/studio/` that are named `tenancy*.py`.
> **Files you must NOT touch:** anything under `automation/app/`, `studio/motion_reel.py`, or any
> new router file — Developer 2 owns those.
>
> **D1-1 · User records.** There is **no database to put a users table in.** The only `schema.sql`
> belongs to a separate Supabase/Postgres service the dashboard never calls, and the Node server
> has zero npm dependencies. Do **not** install Postgres or add a database driver — that is out of
> scope and would not survive the day. Instead store users as a small JSON file under
> `automation/server/storage/`, written atomically, each record holding id, email, the scrypt hash
> that `auth.cjs` already computes, and created_at. *Done when:* two users exist in that file, the
> file survives a restart, and a partial write cannot corrupt it.
>
> **D1-2 · Multi-user login.** Keep the existing cookie machinery in `auth.cjs` exactly as it is —
> scrypt, the signed HttpOnly cookie, CSRF, login throttling. Change only the password check, from
> comparing one configured password to looking a user up by email, and put the user's id into the
> session cookie. **Do not introduce JWT** — you would be re-earning CSRF and throttling you
> already have. Also write a small terminal script that creates an account, because an invited
> pilot needs no sign-up page. *Done when:* two accounts can be logged in from two browsers at the
> same time, each with its own session, and a wrong password is still throttled.
>
> **D1-3 · Per-user workspace — the core task, and it is five fixes, not one.** Build a lazy cache
> keyed by user id that calls `create_app(work_dir=<base>/users/<user_id>, start_scheduler=False)`
> and routes each request to the caller's own instance, keeping `start_scheduler=True` for exactly
> one instance. Node authenticates and passes the user id to the engine as a trusted header.
>
> That alone is **not** isolation. These five places still reach shared storage, and each one was
> read from the source — fix every one:
>
> | Where | What leaks |
> |---|---|
> | `api_server.py:340` | `renders_dir` defaults to `REPO_ROOT/runtime/renders`, ignoring `work_dir`. Pass it per user. |
> | `api_server.py:73-80` | `media_roots()` always appends `server/storage`, `ROOT/work` and the global `raw footage`, so one account can pass a `video_path` pointing into another's uploads and validation accepts it. |
> | `api_server.py:347` | `ingest_dir` becomes the global `raw footage/ingested` whenever that folder exists — and it does — so every download pools in one place. |
> | `api_server.py:687` | The media listing does `renders_dir.glob("*.mp4")`, returning **every** account's renders. |
> | `server/uploads.cjs:114-124` | `serve()` and `serveRender()` stream any id with no ownership check. The code's own comment calls the id "unguessable", which is not an access control. |
>
> *Done when:* two accounts each have their own directory **and** each of the five sites above is
> scoped, proven by trying to reach the other account's upload, render and media listing.
>
> **D1-4 · Lock the engine down.** Bind the engine to `127.0.0.1` so its trusted user-id header
> can never arrive from outside. Set `NODE_ENV=production`, a real 32-character `SESSION_SECRET`,
> `COOKIE_SECURE` and `TRUST_PROXY`. Generate the password hash with `npm run hash-password`.
> *Done when:* a direct request to the engine's port from another machine is refused, and the
> server starts cleanly in production mode.
>
> **Report:** what you changed, the exact commands to create an account and start the stack, and
> anything you could not finish. Never claim something works that you did not run.

---

### DEVELOPER 2 — the motion lane, the dashboard split, the screens

> You own what the client sees. Work only in **new files** wherever you can, so you never collide
> with Developer 1.
>
> **Files you may change:** anything under `automation/app/`, `automation/editor/studio/motion_reel.py`,
> `automation/editor/studio/analytics.py`, and new files you create such as
> `automation/editor/studio/motion_api.py`.
> **Files you must NOT touch:** `automation/server/*`, `schema.sql`, or the app-factory and startup
> section of `api_server.py` — Developer 1 owns those. If you need a route mounted, write it in
> your own new file and **tell the lead the single line to add**; do not add it yourself.
>
> **D2-1 · Connect the orphan.** `studio/motion_reel.py` is 496 tested lines that nothing imports.
> Expose it as a motion-graphics lane — a prompt in, a storyboard out — from a **new** router file.
> Use the user id the lead tells you the request carries; never read or write a path by hand.
> *Done when:* a written prompt produces a storyboard through the API.
>
> **D2-2 · Reuse the approval gate.** Motion jobs approve and render through the **existing**
> storyboard path. Do not write a second approval flow. *Done when:* a final render is refused
> until the storyboard is approved, proven by a test.
>
> **D2-3 · Dashboard lane split.** Storyboards currently carry no lane. Tag each one `footage` or
> `motion` at creation, and count by lane in `analytics.overview()`. Leave every existing figure
> alone. *Done when:* the overview returns a correct split and the existing numbers are unchanged.
>
> **D2-4 · Login screen.** Replace the single-password prompt with an email-and-password sign-in
> against Developer 1's endpoint. *Done when:* two accounts can sign in and land in the dashboard.
>
> **D2-5 · Motion Graphics screen.** The plainest version that works: prompt in, storyboard shown,
> approve, render. *Done when:* a person completes a motion video without leaving the screen.
>
> **Report:** what you built, what you ran, the one line the lead must add to mount your router,
> and anything unfinished. Never claim something works that you did not run.

---

## 6. WHEN BOTH AGENTS REPORT BACK

1. Add the single mount line Developer 2 gives you.
2. Run the full Python suite again. It must be as green as your baseline.
3. Start the stack and confirm the dashboard loads.

---

## 7. THE GATE — this decides whether it ships

Do this yourself. Do not delegate it, and do not take an agent's word for it.

1. Create **two real accounts** with Developer 1's script.
2. Log in as each and generate something in both — upload footage in one, run a motion prompt in
   the other.
3. Logged in as the first account, try to reach the second's storyboards, media and renders: by
   URL, by guessing ids, and through the media endpoints.

**If anything crosses over, it does not ship.** Report exactly what leaked and stop. A pilot that
shows one client another client's footage is worse than a pilot that slips a day.

Also confirm, by running them:

- A final render is still refused until the storyboard is approved, in **both** lanes.
- The dashboard shows the footage / motion split.
- The server starts in production mode with a hashed password and a real session secret.

---

## 8. IF YOU RUN OUT OF TIME

Cut in this order. Decide early, not at the deadline:

1. The Motion Graphics screen — expose motion through the existing storyboard screen instead.
2. The motion lane entirely — accounts and isolation alone is still a real milestone.
3. **Never cut** per-user isolation or the gate test in section 7. Without them there is no pilot.

---

## 9. HARD RULES

1. **Never delete anything.** No `Remove-Item`, `rm`, `git clean`, no emptying folders.
2. **Commit as you go**, on the `pilot-accounts` branch, so any step can be undone.
3. **Never commit secrets.** No real password hash, session secret or API key in a tracked file.
4. **Never claim a thing works unless you ran it** and can paste the output. "I did not run this"
   is always an acceptable answer; a fabricated pass is not.
5. **Report honestly at the end**: what works, what does not, what you skipped, and what you
   changed that this prompt did not ask for.

Close with a short table of every task (D1-1 … D1-4, D2-1 … D2-5), each marked done, partial or
not started, with the evidence for each — then state plainly whether the gate in section 7 passed.
