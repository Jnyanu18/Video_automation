# 3 free GitHub repos for Claude Code: the links and one-line installs

Three free, open-source (MIT) projects, with 187,000 stars between them. Each one installs in a line.

> Everything below is from each project's own README, read on 2026-11-08. Projects change quickly, so check the repo if a step looks different.

## 1. Hallmark: websites that don't look AI-made

A design skill for Claude Code, Codex, Cursor and OpenCode, made by Together AI. It deals you three themes out of fifty, builds the page, then checks it in a real browser for the tells that read as machine-made.

Repo: https://github.com/Nutlope/hallmark

```
npx skills add nutlope/hallmark -g
```

Needs Node 18 or later. Then ask Claude Code to build a page, or say "use hallmark to build..." if it doesn't start on its own. To redesign a site you already have: `/hallmark redesign ./src/app`.

## 2. Cloudflare security-audit: your agent as a security auditor

Turns your coding agent into a security auditor. Every possible bug goes to a fresh agent that tries to prove it wrong, so the agent that checks a finding is never the one that found it. It's the skill Cloudflare's own vulnerability-hunting system grew from.

Repo: https://github.com/cloudflare/security-audit-skill

```
npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit
```

Then open your project in Claude Code and type: `security audit this codebase`. You get a report of confirmed issues, issues that need checking, and false alarms it ruled out.

## 3. AI Job Search: Claude Code as your job application assistant

Fill in your profile once. It searches job boards, ranks postings by fit, and writes a tailored CV and cover letter for each one, with a second agent reviewing the drafts. It never invents skills you don't have. Its creator used it for 69 applications, got 20 interviews, and now works as an AI engineer.

Repo: https://github.com/ai-job-search-dev/ai-job-search

Setup takes a few steps (Claude Code, Python 3.10+, Bun and LaTeX); the README walks through them. Then inside Claude Code run `/setup`, then `/scrape` and `/apply`.

- **Use a private copy:** your profile holds personal details, and a GitHub fork is always public. The README shows how to make a private copy instead.
- **Job boards:** the built-in searches are for Danish job sites. Ask Claude Code to add the job boards you use.
