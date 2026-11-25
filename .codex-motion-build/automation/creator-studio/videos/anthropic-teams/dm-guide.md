# How Anthropic's own teams use Claude Code: every prompt

These come from Anthropic's own write-up, "How Anthropic teams use Claude Code" (claude.com/blog/how-anthropic-teams-use-claude-code, 24 July 2025). What each team does is from the post. The prompts are mine, written to copy that way of working.

## 1. Plan before code (Security Engineering)

Their old routine was "design doc → janky code → refactor → give up on tests". Now they ask Claude for pseudocode first, then build it test by test.

```
Before writing any code, write pseudocode for [the feature]. Wait for my OK.
Then build it one piece at a time: write a failing test for each piece first, then make it pass.
```

## 2. Learn a codebase on day one (Infrastructure)

New data scientists give Claude Code the whole codebase. It reads the CLAUDE.md files, explains how the data pipelines depend on each other and shows which sources feed which dashboards.

```
Read this repo, including any CLAUDE.md files. Explain it like it's my first day:
what the main parts are, what feeds what, and where I'd start to change [the thing I need].
```

## 3. Ask where to look before asking for a fix (Product Engineering)

They treat Claude Code as their "first stop" and ask it which files to examine before a bug fix or a feature.

```
I need to fix [the bug]. Which files should I read first, and why? Don't change anything yet.
```

## 4. Let it loop, review at the end (Product Design)

They give it a design, then let it write the code, run the tests and keep going on its own. They review before the final touches.

```
Build [the feature] from this design. Run the tests after each change and keep going until they all pass.
Then show me a summary of everything you changed.
```

## 5. Send screenshots when you're stuck (Data Infrastructure)

When a Kubernetes cluster stopped scheduling pods, they sent Claude dashboard screenshots. It walked them through Google Cloud's console menu by menu to the cause, then gave the commands to fix it.

```
Here are screenshots of [the dashboard or error]. Walk me through finding the cause step by step,
one screen at a time, then give me the exact commands to fix it.
```

## 6. Build small tools for your own work (Growth Marketing, Legal)

Growth marketing built a workflow that reads a CSV of hundreds of ads, finds the weak ones and writes new versions within the character limits. The legal team prototyped a phone tree to help staff reach the right lawyer.

```
Here's a CSV of [my data]. Write a small script that finds [the weak ones] and drafts [a better version]
for each, keeping to [the limits]. Show me 5 examples before running it on everything.
```

## The one idea behind all six

Anthropic's own conclusion: the teams that get the most from it treat it "as a thought partner rather than a code generator."
