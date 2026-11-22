How to build your own Jarvis (the 10 steps from the reel)

Jarvis here is Hermes Agent by Nous Research: free, open source (MIT), and it runs on your own server. Docs: https://hermes-agent.nousresearch.com/docs/

1. A home. Get a small server that stays on all the time. Their README says a $5 VPS is enough; a spare computer that never sleeps works too.

2. A harness. Install Hermes Agent on that server:
Linux, macOS or WSL2: curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
Windows (PowerShell): iex (irm https://hermes-agent.nousresearch.com/install.ps1)
Then run: hermes setup
Code and README: https://github.com/NousResearch/hermes-agent

3. A brain. In setup, pick a model provider: OpenRouter (Claude, ChatGPT and open source models in one place), OpenAI, Nous Portal, or your own endpoint. You can switch models later in the config: https://hermes-agent.nousresearch.com/docs/user-guide/configuration

4. Let it interview you. In your first chats, tell it about your business, your clients and your goals, or ask it to interview you. It builds a picture of you across sessions, so it actually knows your work.

5. Memory. Hermes keeps its own memory and searches past sessions, so you stop repeating yourself. Ask it to remember the things that matter: your offers, your clients, how you like things done.

6. Skills. One per job: your inbox, your content, your sales. Hermes writes new skills after complex tasks and improves them as you use them. Browse ready ones: https://hermes-agent.nousresearch.com/docs/skills

7. Connect your tools. Email, calendar and tasks connect through MCP servers: https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp

8. Talk to it from your phone. Connect Telegram or WhatsApp (Signal, Slack and Discord work too): https://hermes-agent.nousresearch.com/docs/user-guide/messaging/

9. A dashboard. Hermes doesn't ship a web dashboard. Use the Hermes Desktop app (Windows or macOS) from https://hermes-agent.nousresearch.com/, or ask your Jarvis to keep a daily log of everything it did.

10. The one everyone skips: make it ask first. Turn on command approval in the security settings (https://hermes-agent.nousresearch.com/docs/user-guide/security), and add one line to its instructions: anything that sends, deletes or spends money waits for my yes. An agent that can do everything should still check with you.

Made by Vishnu, building AskVerb: an AI agent that lives inside your product, does the work for your users, and asks before anything risky. https://askverb.com
