# Brief: Someone just made a free tool that runs Claude Code on free AI models

- **Funnel:** top ("someone made a free tool", Vishnu's hook, the format of 32-floorplan-map)
- **Reference:** instagram.com/p/DfPmz4TR5v8 (40 s, a two-character dialogue over game footage, logo cards for every
  provider, "Explore - Free LLM Repo" at the end), studied in research/viral/DfPmz4TR5v8/card.md. Our own pictures.
- **Which tool:** the reference never says; it is **FreeLLMAPI** (github.com/tashfeenahmed/freellmapi), found from
  Eric Tech's Short description (youtu.be/exkQTYOm47c). Not the "awesome-free-llm-apis" list, which is a different repo
  with no router and no Claude Code mention.
- **What the reference gets wrong, and we do not repeat:** "over 600 free models" (the README says 474 model families
  and 635 free endpoints, 584 of them chat); "7 billion tokens every month" (the README's 7.4 billion is the sum of
  listed free-tier capacity, not what one person gets); "free Claude Code with almost unlimited usage" (the models
  answering are not Claude, and the project says no frontier models, variable latency, no SLA, personal experimentation
  only).
- **Facts and sources (README of github.com/tashfeenahmed/freellmapi, read 2026-11-07):** MIT, about 48.5k stars; one
  OpenAI-compatible endpoint over 34 free providers; routes each request to an available model and fails over on
  429/5xx with cooldowns and key rotation; an optional compact handoff note keeps the context if a session switches
  model; `/v1/messages` speaks Anthropic's format so Claude Code can run against it
  (`npx freellmapi setup-claude --url http://localhost:3001 --api-key <key>`); you add your own provider keys; the
  one-liner install needs Docker; "about 7.4 billion tokens per month" of listed free-tier capacity; prompts still go
  to whichever provider answers; its Disclaimer and per-provider terms were not read (the page was cut).
- **To do before the guide:** read docs/en/clients/01-agent-clients.md and the disclaimer for the exact Claude Code
  steps and the terms; the README does not say which model answers when Claude Code asks for a Claude model.
- **Music:** quick, light, upbeat (a track we own)
- **Ask:** comment FREE, the DM sends the repo link and, if Vishnu agrees, a setup .docx (Docker install, add free
  provider keys, point Claude Code at it, what to expect). Open question for Vishnu.

## Direction plan (full beat table after the script is approved)

- **Look:** white keynote (the 34 standard); each beat a colour world; the real FreeLLMAPI name on screen; the real
  provider marks only if they can be found unchanged, otherwise names in type.
- **Hook (0 to 2 s):** a Claude Code prompt box with a red "usage limit reached" bar that flips to a green "free" as the
  words land.
- **Every phrase a picture:** a router hub with 34 lanes fanning out; a monthly counter climbing to 7.4B labelled "listed
  capacity"; a model hitting its limit and a note card handed to the next model; a "not Claude" stamp over the free
  models with slow and weak labels.
