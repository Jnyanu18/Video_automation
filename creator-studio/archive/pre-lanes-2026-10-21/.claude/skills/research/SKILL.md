---
name: research
description: Research what works before a video is briefed, and check every claim before it is said. Use at the start of a new video idea, when studying a post or video Vishnu likes, and whenever a script contains a fact, number or claim about someone else.
---

# Research

Two jobs: find out what works (so the video is built on evidence, not taste), and check what is true
(so nothing false is ever said in his voice). Both end in a short note saved in the studio, never in
Claude's memory only.

## Job 1: study what works

**Input:** a post, video or account Vishnu likes, or a topic. Posts arrive as pasted text or a link.

**Tools that work here, and ones that do not.** The X reader can read a profile and recent posts by
handle (search is broken), web pages and YouTube pages can be fetched, Reddit cannot be fetched (he
pastes it). Claude cannot hear or watch video; for a video it uses the transcript, the title, the
description and what Vishnu says about it. Say what was not seen.

**For each example, write down:**

| Field | What to note |
| --- | --- |
| Hook | the exact first line, and what is on screen in the first second |
| Purple cow | what makes it remarkable (use the `purple-cow` skill's two tests) |
| Loops | where it opens and closes a question (the `story-loops` skill) |
| Shape | length, number of beats, where the payoff is |
| Proof | a real number, a real screen, a real person, or none |
| Reaction | likes and replies, and what the replies argue about (replies are the signal) |
| Size check | the account's size: 1,000 likes from a 5K account is a signal, from a 500K account it is not |

**Then answer three questions:** What is the structure worth borrowing? What is theirs and must not be
copied (wording, visuals, identity)? What would the same structure look like with Vishnu's real facts?

**Rules**

- Copy structure, never wording, never visuals, never a person's private details.
- Use only numbers and facts from Vishnu's own sources (outreach log, admin, brain). A good structure
  with no true material is dropped, not filled with invented material.
- Prefer posts in his niche (founders, AI agents, building in public, getting the first customers) and
  at his size or one step above.
- Replies beat likes as evidence. A post people argue with is more useful than one they only liked.

## Job 2: check a claim

For any fact about a person, company or product in a script, or any claim Vishnu is unsure of:

1. Say what the claim is, in one sentence.
2. Find a primary source (the company's own page, a filing, the person's own post). Fetch it.
3. Record: claim, source link, what the source actually says, date, and a verdict: confirmed, partly,
   not found, or contradicted.
4. If it cannot be confirmed, the script does not say it. Offer a weaker true version.
5. Never state a number about someone else's business as fact from a search snippet.

Web search results are leads, not proof. When two sources disagree, say so.

## Where it is saved

`D:\studio\research\<date>-<topic>.md`, one file per study, with the table above and the answers to the
three questions. Keep `D:\studio\research\INDEX.md` as one line per file (date, topic, the structure
worth borrowing). A brief that is based on research names the file.

## Checklist

- [ ] Every example has its hook, shape and reaction written down, and what was not seen is said.
- [ ] The borrowed part is a structure, not wording.
- [ ] Every claim that will be spoken has a source in the note.
- [ ] The note is saved and the index line added.
