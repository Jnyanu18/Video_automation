# YC founder video skill

A free Claude skill for your Y Combinator founder video, built from 188 real founder videos with known outcomes
(118 accepted, 70 rejected).

What it does:

1. **Writes your founder video with you.** It interviews you one question at a time and writes the bullet points
   you speak from.
2. **Grades your takes.** Paste the words of a take and get a checklist of what passes and what to change first.
3. **Finds the YC companies in your space.** It searches all 6,341 YC companies and compares your one-liner with
   theirs.
4. **Lets you rerun the analysis yourself**, from public data.

What the data showed: accepted founders talked about money (revenue, paying customers) almost three times as often
as rejected ones, 44% against 16%, and four in five accepted videos had a real number in them. Details and limits are
in `yc-founder-video/SKILL.md`.

## Install

**Claude.ai:** download this repo as a ZIP (Code > Download ZIP), unzip it, zip only the `yc-founder-video` folder,
then upload it in Settings > Capabilities > Skills.

**Claude Code:** copy the `yc-founder-video` folder into `~/.claude/skills/`.

**Any other AI:** open `yc-founder-video/SKILL.md`, copy everything in it, and paste it as your first message.

Then say: "Help me with my YC founder video."

The scripts need Python 3.9+; `analyze_videos.py` also needs `pip install yt-dlp`.

Made by Vishnu, building AskVerb, an AI agent that lives inside your product and does the work for your users:
https://askverb.com
