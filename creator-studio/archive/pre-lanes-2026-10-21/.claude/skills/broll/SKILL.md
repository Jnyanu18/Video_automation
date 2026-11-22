---
name: broll
description: Choose, shoot, source and place b-roll and sound effects for a video in this studio so it looks real, not AI-made. Use at the edit step (edit.md) and when asking Vishnu for footage.
---

# B-roll and sound

B-roll is anything on screen that is not Vishnu talking. Good b-roll shows the real thing he is talking
about. Bad b-roll decorates. Viewers read generic stock and AI images as slop within a second.

## What to use, best first

1. **His own screen recordings** of the real thing: the AskVerb dashboard, the agent doing a task on
   cal.askverb.com, the outreach log, an inbox, a terminal, a Reddit thread he is answering. Licence:
   "own recording".
2. **His own phone shots:** hands on the keyboard, the desk, a whiteboard, a notebook with the numbers,
   the phone showing a notification. 3 to 5 seconds, steady, vertical, same light as the talking shot.
3. **Screenshots** of real public things (a post, a tweet, a page), cropped to the part that matters.
   Never anyone's private message without their permission. Blur names unless they are public posts.
4. **Licensed stock, last.** Pexels or Pixabay clips (both free to use; still write the clip's page in
   `broll/LICENCES.md`). Only concrete things (a phone ringing, a busy office), never "abstract tech".
5. **Never:** AI-generated people or faces, fake screenshots, logos of companies he does not have a
   relationship with, a client's data without written permission.

## Where to put it

- On a **concrete noun**: when he says "inbox", show the inbox. When he says "2,500 users", show the
  real dashboard number or a stat beat, not a crowd.
- **Over a jump cut** between takes, to hide it.
- Every **3 to 5 seconds** something on screen should change (b-roll, zoom, a stat, a text beat), but
  never two at once.
- **Full screen** for a real screen recording he needs to read; **pip** (picture in picture) when his
  face carries the emotion and the b-roll is evidence.
- Keep the **first second** on his face and voice. The hook is him, not a graphic.

## How to ask Vishnu for b-roll

In the edit step, list exactly what to record, one line each, with length:

```
broll/01-dashboard.mp4   5s   AskVerb dashboard, scroll the sites list
broll/02-cal-agent.mp4   8s   cal.askverb.com: ask the agent to move a booking, approve the card
```

Record on the computer with Windows' Snipping Tool (video) or the phone. Vertical crops happen in the
edit; for a phone recording keep it vertical.

## Sound effects

Files live in `videos/_sfx/`, each listed in `videos/_sfx/LICENCES.md`. Turn them on in edit.md with
`sfx: on 0.35` (the number is the volume). Each beat then gets a default sound:

| Beat | Sound | Why |
| --- | --- | --- |
| zoom | whoosh | movement |
| text | pop | something appears |
| stat | switch | a number lands |
| broll | whip | a cut to something new |

Override on one beat with `sfx=ding` (any file name in `_sfx`) or `sfx=off`, or add a sound alone with
`- sfx "words" mouse-click`. Rules: subtle, under the voice, never on every beat of a busy stretch,
never meme sounds (vine boom, bruh), and never a sound whose licence is not written down.

## Checklist before the edit is approved

- [ ] Every b-roll clip is real and has a line in `broll/LICENCES.md`.
- [ ] B-roll lands on the word it shows.
- [ ] The first second is Vishnu, not a graphic.
- [ ] Sounds are subtle when watched with sound on, and each one has a licence row.
