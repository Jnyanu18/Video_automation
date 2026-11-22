# Run your Instagram with Claude: the setup guide

The Instagram agent skill is 13 free Claude skills that write your reels, captions and replies, plan your week and score your profile. It is open source (MIT) and made by Jake Schincariol: https://github.com/Jakeschincariol/instagram-agent-skill

Setup takes about 15 minutes: 5 to install, 10 to teach it your voice. Nothing gets posted until you post it yourself.

## What you need

- **Claude Code** (recommended). The skills install there, and the Python tools that score hooks and clean captions run there.
- **Python 3** on your computer, for those tools. On a Mac it is usually already there; on Windows, install it from python.org.
- No Instagram login, no API key and no account to connect. The skills write; you post.

No Claude Code? You can paste any single skill's `SKILL.md` at the top of a normal Claude chat and it works as a mode. You lose the Python tools (hook scoring, the caption checker and the humanizer), but the rest works.

## Step 1: install the skills

**The easy way.** Open Claude Code and paste this:

```
https://github.com/Jakeschincariol/instagram-agent-skill

Install this skill, then confirm /ig-reel works.
```

Claude downloads it, copies the 13 skills into place and tests one.

**By hand, on a Mac or Linux:**

```
git clone https://github.com/Jakeschincariol/instagram-agent-skill.git
cp -r instagram-agent-skill/skills/ig-* ~/.claude/skills/
```

**By hand, on Windows (PowerShell):**

```
git clone https://github.com/Jakeschincariol/instagram-agent-skill.git
Copy-Item -Recurse instagram-agent-skill\skills\ig-* $HOME\.claude\skills\
```

**As a Claude Code plugin:**

```
/plugin marketplace add Jakeschincariol/instagram-agent-skill
/plugin install instagram-agent
```

To keep the skills inside one project instead of everywhere, copy the same `ig-*` folders into that project's `.claude/skills/` folder.

## Step 2: teach it your voice (do not skip this)

Every skill reads one file, `voice.md`, so everything it writes sounds like you. It matters more on Instagram than anywhere else, because you have to say the words out loud.

The quick way: in Claude Code, paste the scripts or captions of three of your own reels and say:

```
Write my voice.md from these, and save it to ~/.claude/instagram/voice.md
```

Or by hand: copy `templates/voice.md` from the repo to `~/.claude/instagram/voice.md` and fill it in.

## Step 3: your first week

Type these in Claude Code, in this order:

1. **`/ig-profile`:** scores your profile out of 100 on a 12-part rubric and rewrites what lost points. Fix your bio before anything else.
2. **`/ig-plan`:** the week: what to post, which format, when, and the 10 accounts to engage with.
3. **`/ig-viral`:** finds the reels working in your niche and ranks them by how far each beat its own account's usual views, then names the hook each one used. You browse in your own browser while it reads; it never logs in as you.
4. **`/ig-reel`:** give it one idea. It writes three hooks from 26 formulas, scores them, then writes the script, the on-screen text and a timed beat sheet.
5. **`/ig-caption`:** writes the caption and shows exactly what the feed shows before "... more" (about 125 characters). It also enforces Instagram's current cap of five hashtags.
6. **`/ig-human`:** run every caption through this. It strips em dashes, stock AI phrases and invisible characters, then scores the result.
7. **`/ig-reply`** and **`/ig-comment`:** replies to your comments, sorted by type, and comments for other people's posts.
8. **`/ig-dm`:** the keyword reply, first messages and collab pitches.
9. **`/ig-audit`:** after a few posts, a post-mortem that ranks what worked by reach and sends.

There are also `/ig-carousel`, `/ig-story` and `/ig-repurpose` (one long video into a week of posts).

## Good to know

- **It never posts for you, on purpose.** Automating posts, comments or follows breaks Instagram's terms and gets accounts blocked, so every skill ends with a copy-ready block and you post it.
- **The hook scorer is a filter, not a crystal ball.** The author tested it himself: it catches weak hooks well, but it cannot tell you which of two good hooks will go viral. Use it to cut the bad ones, then trust your own numbers.
- **Write your voice file first.** Without it, everything sounds generic.

## If something doesn't work

- **"python3 is not found" on Windows:** use `python` instead of `python3`, or reinstall Python with "Add to PATH" ticked.
- **The `/ig-` commands don't show up:** check that the `ig-*` folders are in `~/.claude/skills/` (or your project's `.claude/skills/`), then restart Claude Code.
- **Still stuck:** paste the error into Claude Code and ask it to fix the install.
