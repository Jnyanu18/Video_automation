# Reverse engineer any app with Claude: the REA setup guide

REA (Reverse Engineer Anything) is a free, open-source tool (MIT) that gives Claude Code the tools to look inside an app without its source code, explain how a feature works, show the evidence, and build a similar feature for your own project. It runs on your own computer.

Repo: https://github.com/morluto/rea
Website: https://rea.tools

> Everything below is from the project's own README and setup docs, read on 2026-11-08. REA changes quickly, so check the repo if a step looks different. Get it only from the repo, rea.tools or the rea-agents npm package: copies with similar names are not official.

## What you need

- **Claude Code** (or Codex, Cursor, Gemini CLI and other agents that support MCP).
- **Node.js 22 or newer, with npm.**
- For desktop apps built with JavaScript or Electron, and for .NET apps, nothing else.
- For native apps (compiled programs), an analysis engine: Hopper, Ghidra, IDA or Kuna. Setup can install Hopper for you if you approve it.

## Step 1: install REA

In a terminal, from a folder you trust (not inside the app you want to study):

```
npx rea-agents setup
```

Pick Claude Code from the list, read the changes it proposes, and approve them. It adds REA to Claude Code and installs its skill, and it backs up your settings first.

## Step 2: restart Claude Code

Close Claude Code and open it again so it picks up REA.

## Step 3: ask for a feature

Open your own project in Claude Code and ask in plain words, for example:

```
Understand how search works in the Notes app, show me the evidence, and build a similar feature for my project.
```

Swap in the app and the feature you want. Claude uses REA to inspect the app, explains what it found and the limits of what it could see, then writes and tests the feature in your project.

## Good to know

- **It runs locally.** REA analyses the app on your computer. What Claude sends to its model follows Claude's own data policy.
- **Use it on apps you're allowed to study.** Many paid apps' licences limit reverse engineering or copying, so read the terms, and build your own version of a feature rather than copying someone's code.
- **Keep it updated:** run `npx rea-agents@latest setup` again to update.

## If something doesn't work

- **Claude Code doesn't see REA:** restart it fully, then run `npx rea-agents setup` again.
- **Something else is off:** run `npx rea-agents@latest doctor` to check what's missing.
- **Still stuck:** paste the error into Claude Code and ask it to fix the REA setup.
