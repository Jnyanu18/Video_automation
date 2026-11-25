# Check your Claude Code extension

<!-- One paragraph per thought; each becomes one voice file. No em dashes, no "not X, not Y" chains. -->
<!-- Source: thehackernews.com/2026/10/official-claude-code-vs-code-extension.html (read 2026-10-30), quoting Cursor
and OpenSourceMalware. Every line below is in that article, except "the VS Code Marketplace version was clean": OpenSourceMalware lists the Microsoft Marketplace build as not malicious (brandefense.io, stepsecurity.io). Loops: A+ L1 "check this now" / B+ L2 the poisoned update /
B- L3 what it did / A- L5 how to fix it. No call to action (Vishnu, 2026-10-30). -->

Do you use Claude Code inside Cursor? Check your extension right now.

On October 29, a poisoned update went out under the real Claude Code extension in Cursor's marketplace. Version 2.1.313.

It hid an SSH key called svc-telemetry, set itself to run again on startup, and sent out your username, your git email and the names of your API keys.

Up to 5,000 people installed it. The VS Code Marketplace version was clean.

Cursor or VS Code, update to 2.1.314 now, delete that key, and rotate your secrets.

