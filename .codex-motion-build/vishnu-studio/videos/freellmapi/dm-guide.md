# Use Claude Code on free AI models: the FreeLLMAPI setup guide

FreeLLMAPI is a free, open-source tool (MIT) that puts the free tiers of 34 AI providers behind one address on your own computer, and Claude Code can run against it. When one model hits its limit, it switches to the next and passes along a short note so your chat keeps going.

Repo: https://github.com/tashfeenahmed/freellmapi

> Everything below is from the project's own README and docs, read on 2026-11-07. Free tiers change, so check the repo if a step looks different.

## What you need

- **Claude Code** installed.
- **Docker** for the one-line install, or the desktop app instead (macOS menu-bar app, or a Windows installer, both on the repo's releases).
- **Free API keys** from the providers you want to use, such as Google, Groq, Cerebras, Mistral, OpenRouter, Cohere, Cloudflare and NVIDIA. Each provider has its own sign-up page; FreeLLMAPI links to them.

## Step 1: install FreeLLMAPI

On Mac or Linux, with Docker running:

```
curl -fsSL https://freellmapi.co/install.sh | bash
```

It creates a `freellmapi` folder in your home folder, makes an encryption key and starts it. Prefer not to pipe a script into bash? Open the link in a browser and read it first, or use the desktop app.

## Step 2: add your free keys

1. Open http://localhost:3001 in your browser.
2. Go to the **Keys** page and paste in the free keys you created. They stay on your computer, encrypted.
3. Optional: reorder the **Fallback Chain** to choose which models it tries first.
4. Copy your **unified key**. This one key is what Claude Code will use.

## Step 3: point Claude Code at it

See what it will change first:

```
npx freellmapi setup-claude --url http://localhost:3001 --dry-run
```

Then run it for real:

```
npx freellmapi setup-claude --url http://localhost:3001 --api-key YOUR-UNIFIED-KEY
```

It backs up your Claude Code settings and adds FreeLLMAPI. Use the address exactly as shown: Claude Code takes the server address without `/v1` on the end.

Then start Claude Code as usual.

## It works with more than Claude Code

The same setup command exists for Codex, Cursor, Cline, Aider, OpenCode, Continue and more: `setup-codex`, `setup-cline`, `setup-cursor` and so on. Any app that speaks the OpenAI format can use `http://localhost:3001/v1`.

## What to expect

- **The answers come from the free models**, which is what makes it free. Speed and quality vary by model and time of day; daily limits reset at midnight UTC.
- **Your prompts go to whichever provider answers.** Keep private code and secrets out of it, and read each provider's terms, since some free tiers are for personal or trial use.
- **It's built for your own use and experiments**, one person, on your own computer.

## If something doesn't work

- **Claude Code can't connect:** check that http://localhost:3001 opens in your browser, and that the address in your settings has no `/v1`.
- **Every model says it's out of quota:** add more providers' keys on the Keys page, or wait for the daily reset.
- **Still stuck:** paste the error into Claude Code and ask it to fix the FreeLLMAPI setup.
