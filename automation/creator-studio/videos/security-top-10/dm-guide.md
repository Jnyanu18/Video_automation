# 5 security repos for Claude Code, ranked by GitHub stars

Ranked by stars on 2026-11-03 among the security repos for Claude that I checked. Stars move, and I did not run any of them.

## 5. Claude Code Security Review

6,695 stars, MIT licence.

https://github.com/anthropics/claude-code-security-review

A GitHub Action that uses Claude to review every code change for security vulnerabilities.

## 4. Trail of Bits Skills

7,974 stars, CC-BY-SA-4.0 licence.

https://github.com/trailofbits/skills

Skills for security research, vulnerability detection and audit workflows.

## 3. SkillSpector by NVIDIA

24,090 stars, Apache-2.0 licence.

https://github.com/NVIDIA/SkillSpector

A security scanner for AI agent skills. It scans a skill for malicious code before you install it.

## 2. Anthropic-Cybersecurity-Skills

35,491 stars, Apache-2.0 licence.

https://github.com/mukul975/Anthropic-Cybersecurity-Skills

817 structured cybersecurity skills, mapped to MITRE ATT&CK, NIST CSF 2.0 and more. This is a third party's repo, not Anthropic's.

## 1. Cloudflare Security Audit Skill

57,735 stars, MIT licence.

https://github.com/cloudflare/security-audit-skill

Multi-phase security audits where every finding is independently verified and machine-readable.

## Before you install any skill

Read its files first, and scan it with SkillSpector if you can:

```
uv tool install git+https://github.com/NVIDIA/skillspector.git
```

Then scan the repo before you add it.

Made by Vishnu, building AskVerb: an AI agent that lives inside your product and does the work for your users. https://askverb.com
