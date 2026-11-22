---
name: captions
description: Write the post text for a finished video on YouTube (Shorts and long form), X, Instagram and LinkedIn, and save it as posts.md in the video's folder. Use right after a video is rendered and approved.
---

# Captions and post text

One file per video, `videos/<slug>/posts.md`, with a section for every platform. Written after the render
is approved, from what the video actually says, never from the plan.

## Inputs

- `script.md` (as recorded), `out/description.md`, `out/captions.srt`, `format.md`, the brand (personal or
  agency) from `edit.md`, and the real numbers named in `brief.md`.
- The series line: "Day N of 30" for the AskVerb daily posts, if the video belongs to it.

## The strict rule: paste-ready text is only the text

Anything Vishnu will copy and paste (a caption, a title, a description, a comment, a reply, a DM) contains
**only the words to publish**. Never put an instruction, a note, a character count, a "check this", a
"(about 100 characters)", a "[your name]" or any other bracketed or parenthetical aside inside it, and
never directly after it on the same line. If a title must fit a limit, make it fit and do not mention the
limit next to it. Notes, counts and warnings go in a separate "Notes (never pasted)" section at the end of
`posts.md`, or in the chat reply above the code block. If a fact is missing, ask for it and do not leave a
blank for him to fill. Before saving, read each paste-ready block and delete any aside.

## Rules for every platform

- First person, Vishnu's voice, plain words, short sentences. No em dashes. No hype words ("game
  changer", "revolutionary", "insane"). No emojis unless Vishnu asks.
- The first line is the hook and must work alone, because it is all that shows before "more".
- Say only what the video says or what is true in his own records. No new numbers.
- End on one real question or one clear next step. Never both.
- Never "free while we launch", never a call ask, never a price. The offer, when mentioned, is a free
  30-day pilot with a price agreed afterwards from what it handled.
- AskVerb is an agent inside a product that does things for the user. Never a support bot, never a
  chatbot opponent, never a security headline.
- If the voice is cloned, say so in the description. For talking head with his own voice, nothing to say.
- Agency videos: no client named without written permission.
- Platform limits change; if a limit matters, check it, do not rely on memory.

## X

- One post, ideally under 240 characters, hook in the first line, one question at the end.
- At most one hashtag, usually none. The video is attached natively, no link in the post (put it in a
  reply if needed).
- Also write a one-line reply to pin or post under it, for the link or the series line.

## Instagram (Reels)

- Hook in the first 125 characters, then a short body with line breaks, then three hashtags.
- Personal brand tags: `#AskVerb #buildinpublic #foundersjourney`. Agency: `#AuralionLabs` plus two that
  describe the video. Never more than three.
- Also write the text for the cover if it has any (two to four words).

## YouTube Short

- Title: the hook, up to 100 characters (Vishnu's limit; the platform's own maximum is also 100). Use the room
  for the real promise and a keyword, but no clickbait the video does not pay off.
- Description: can be long. Start with two lines that work alone (the point, then the series line), then the
  story in a few short paragraphs, what AskVerb is in one line with the link, the cloned-voice line if it
  applies, and up to three hashtags at the end.
- Pinned comment: the one question.
- Tags (from 2026-10-29, Vishnu): one line, comma separated, for the Tags box in YouTube Studio. 10 to 15
  lowercase tags, under 500 characters in all: the topic and tools named in the video first, then broader
  searches, then askverb. No # and no quotes.

## YouTube long form

- Title: under 60 characters, the main keyword in the first 40, the honest promise.
- Description: first two lines are the hook and the point (they show before "more"), then chapters from
  the cue times (`m:ss Title`, the first at 0:00), then what AskVerb is in one line with the link, then
  the cloned-voice line if it applies, then up to three hashtags.
- Pinned comment: one question.
- Thumbnail text: two to four words, written here, made from a frame of him.
- Chapter list is copied from `out/description.md`; check the times.

## LinkedIn (when asked)

- Hook line, a blank line, three to five short lines, one question. No hashtags except at most three at
  the end. Plain, no corporate voice.

## posts.md layout

```
# Posts: <title>
Brand: personal | agency      Series line: Day N of 30 (or none)
Facts used (each with its source): ...

## X
<text>
Reply: <text>

## Instagram
<caption with three hashtags>
Cover text: <two to four words, or none>

## YouTube Short
Title: <...>
Description: <...>
Pinned comment: <...>
Tags: <tag, tag, tag>

## YouTube long form
(not applicable for a short; the sections above for a long video)

## LinkedIn
<text, or "not written">

## Posted
| Platform | Date | Link |
```

## Checklist

- [ ] Every paste-ready block holds only the words to publish: no asides, counts or instructions.
- [ ] Every number and claim is in the video or in a named source.
- [ ] Each hook works alone. Each post ends on one question or one step.
- [ ] No em dash, no emoji, no banned phrase, no price, no "free while we launch".
- [ ] Three hashtags at most, #AskVerb first for the personal brand.
- [ ] The Posted table is filled in after posting, then the results table in `format.md` at 48 hours.
