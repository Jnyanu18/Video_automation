# Brief: Check your Claude Code extension

- **Funnel:** top (news, for builders who use Claude Code)
- **Reference:** none; a news reel, built in the dev look of build-your-own-x (no Ava, thin lines, clean captions).
- **Skill used:** story-loops (A: "check this now", closed by the fix; B: the poisoned update, closed by what it did).
- **Our twist:** the article explains it; ours is the 30-second check, then the fix.
- **Facts and sources** (The Hacker News, 2026-10-30, quoting Cursor and OpenSourceMalware):
  - a trojanized update, version 2.1.313, went out under the legitimate extension ID anthropic.claude-code through
    Cursor's marketplace; Cursor: "This malicious version of the extension was not developed by Anthropic."
  - at most 5,000 users who installed it between about 2:27 a.m. and 1:35 p.m. PT on 2026-10-29 (Cursor).
  - it added an attacker SSH key labelled "svc-telemetry" to ~/.ssh/authorized_keys, set up persistence (scheduled
    task on Windows, crontab, LaunchAgent), opened a reverse tunnel, and sent the hostname, username, git email and the
    names (not values) of up to 40 environment variables containing KEY, TOKEN, SECRET, PASS, AWS or GCP.
  - Anthropic published 2.1.314; remediation: remove the key and the persistence, rotate credentials and sessions.
  - How the attackers pushed it is unclear (the article). Not said: whether VS Code Marketplace users were affected,
    so the script names Cursor only.
- **Keyword:** none; no call to action on this one (Vishnu, 2026-10-30).
- **Screenshots Vishnu takes:** the Extensions panel showing the Claude Code version (his own shows 2.1.314).
- **Music:** security-week track-6 (dark minimal electronic, suspense, 110 bpm), copied as music/track-1.mp3
