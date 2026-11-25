---
name: story-loops
description: Structure a short video as nested open and closed loops so the viewer always has one question left unanswered, and it still flows like a story. Use when writing or revising any script in this studio.
---

# Story loops

An open loop is a question the viewer now needs answered. A closed loop is the answer. People keep
watching while at least one loop is open. A video that closes its only loop at second 10 loses them at
second 11.

## The shape for a 30 to 60 second short

| When | Move |
| --- | --- |
| 0 to 3s | Open **loop A**, the big question (usually the purple cow). |
| about 25% | Open **loop B**, a smaller question inside the story. |
| about 50% | Close **loop B**. A small payoff earns trust that A will be paid off too. |
| about 60% | Open **loop C**: the twist, the "but", the higher stakes. |
| about 85% | Close **loop A**. |
| end | Close **C**, or leave exactly one loop open on purpose: the comment question or the next video. |

Never more than three loops open at once. Every loop opened is closed in the same video, except the one
deliberate ending loop.

## Kinds of loop

- **Question:** "So why did none of them use it?"
- **Promise:** "The third one is the one that cost me the most."
- **Mystery:** a number or object shown and not yet explained.
- **Conflict:** "And then it went wrong."
- **Countdown:** "Three things. The last one surprised me."

## Make it flow, not feel like a trick

- Join beats with **but** or **therefore**, never **and then**. "I built it, but nobody used it,
  therefore I asked them."
- Each close should open the next loop in the same breath.
- Short sentences, Vishnu's voice, "I", no em dashes.
- A loop with no payoff is bait. Cut it rather than leave it hanging.

## Mark the loops in the script

Markers are HTML comments, so they are never spoken and never reach the voice or captions:

```
<!-- A+ --> 26 people signed up last week. None of them used it.
<!-- B+ --> I thought it was the setup. <!-- B- --> It wasn't only that.
```

`+` opens, `-` closes. Then list them in `brief.md`:

```
Loops: A+ L1 "none of them used it" / B+ L3 / B- L4 / C+ L5 "but one of them replied" / A- L6 / C- L7
```

## Give each loop a moment in the edit

In `edit.md`, an opening line usually gets a `zoom` or a `text` beat; a closing line usually gets a
`stat` or `text` beat with the answer. That way the eye sees the loop open and close too.

## Checklist before the script is approved

- [ ] Loop A opens in the first three seconds.
- [ ] No more than three loops open at any point.
- [ ] Every loop closes, except one deliberate ending loop.
- [ ] Beats are joined by but or therefore.
- [ ] Read aloud, it sounds like Vishnu talking, not like a formula.
