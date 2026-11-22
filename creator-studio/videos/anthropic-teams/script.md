# How Anthropic's own teams use Claude Code

<!-- Script v1, 2026-11-09, the format of research/viral/Deuk3a2vxB6: a 3 to 4 s looping reel with no voice and a long
caption that does the talking; every loop while they read counts as watch time. Topic in the gap format (our best,
35 anthropic-gap, 40.9K). Every claim from Anthropic's own post "How Anthropic teams use Claude Code"
(claude.com/blog/how-anthropic-teams-use-claude-code, 2025-07-24). -->

## On screen (4.17 s = 2 bars, loops, music only: music/loop.wav)

Here's how top devs at Anthropic use Claude


## Caption

There's a gap between how Anthropic's own teams use Claude Code and how most of us do.

Most people open it, type "build me X", then spend an hour fixing what comes back.

Anthropic wrote up how their own teams use it. Here's what they do, and a prompt to copy for each.

1. They don't start with code. Their security engineers used to go design doc, janky code, refactor, give up on tests. Now they ask Claude for pseudocode first, then build it test by test.
Copy: "Write pseudocode for this first. Then write a failing test before each piece."

2. They use it to learn a codebase. New data scientists give it the whole codebase and ask how the data pipelines connect.
Copy: "Read this repo and explain what feeds what, like it's my first day."

3. They ask where to look before they ask for a fix. Product engineers have it name the files to read first.
Copy: "Which files should I read to fix this bug? Don't change anything yet."

4. They let it loop. Product designers hand it a Figma design, then let it write the code, run the tests and try again on its own. They review at the end.
Copy: "Build this, run the tests, and keep going until they pass. Then show me what changed."

5. They send screenshots. When a Kubernetes cluster stopped scheduling pods, the data infrastructure team sent Claude dashboard screenshots and it walked them to the fix, menu by menu.

6. They build tools for themselves. Growth marketing built a workflow that reads a CSV of hundreds of ads, finds the weak ones and writes new versions. The legal team prototyped a phone tree to reach the right lawyer.

Their own conclusion: the teams that get the most from it treat it "as a thought partner rather than a code generator."

Comment GAP and I'll send you every prompt in one doc.
