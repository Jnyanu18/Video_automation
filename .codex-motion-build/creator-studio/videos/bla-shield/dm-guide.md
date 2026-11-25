# Protect your app from AI reverse engineering: the BLA setup guide

BLA (Blind LLM Agents) is a free, open-source tool (MIT) that hardens the app you ship against AI reverse-engineering agents like REA. It plants decoys and traps in your build files and pushes them past the limits those agents can handle, while your users get exactly the same app.

Repo: https://github.com/qybaihe/bla
Website: https://bla.tools

> Everything below is from the project's own README and docs, read on 2026-11-08. BLA is new and changes quickly, so check the repo if a step looks different. Get it only from the repo or the bla-agents npm package.

## What you need

- **Claude Code** (or Cursor, Codex, Gemini CLI, Windsurf and other coding agents).
- **Node.js 22.23.4 or newer, or Node.js 24.**
- **A build of your own app**, such as a `dist/` or `build/` folder, an Electron `.asar`, a `.wasm` file or a Python app. Use BLA only on software you own.

## Step 1: install BLA

In a terminal:

```
npx bla-agents setup
```

This adds BLA to your coding agent with its skill. Restart your agent afterwards.

## Step 2: harden your app

Open your project in Claude Code and type:

```
Harden my software against REA
```

Or run it yourself from your project folder:

```
npx bla-agents harden .
```

It finds your build files on its own, checks what an AI agent could pull out of them, adds the protection and then verifies the result.

## Step 3: check your app still works

Before you ship, run your app and your tests on the hardened build. BLA checks that the protected files behave the same, and the project asks you to confirm it on your own app too.

## Optional: see what it does

```
npx bla-agents benchmark
```

This runs the project's own showcase on 14 sample apps. Its token and cost numbers are the project's estimates.

## Good to know

- **It slows AI tools down; it doesn't make you invisible.** The project says no client-side protection can stop a determined human with unlimited time. Keep real secrets, such as API keys and signing keys, on your server.
- **Tested coverage:** the project ran the real REA against 12 file types. Native apps decompiled with Ghidra, Android apps and firmware aren't tested yet.
- **Keep it updated:** run `npx bla-agents@latest setup` again to update.

## If something doesn't work

- **Your agent doesn't see BLA:** restart it, then run `npx bla-agents setup` again.
- **An error about Node:** update Node.js to 22.23.4 or newer, or 24.
- **Still stuck:** paste the error into Claude Code and ask it to fix the BLA setup.
