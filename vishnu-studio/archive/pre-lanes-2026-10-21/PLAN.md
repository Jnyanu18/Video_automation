# Content plan

Written 2026-10-17 with Vishnu. One living plan: change it here, do not start a second one.

## 1. What this is for

Share what Vishnu knows (AI agents, building a SaaS, getting the first customers) in his own voice, so
that two brands build an audience: his personal brand (Verb, built in public) and Auralion Labs (the
agency). Content is not outreach and does not replace it. It is the slow channel: people find a video,
then a founder reads a profile, then a DM or a sign-up.

Day rule from the outreach work: the content block comes after the day's outreach is sent and every
reply is answered. 100 minutes a day, minimum.

How we will know it is working (check at Day 30, not before): replies and DMs that mention a video,
sign-ups whose "how did you hear" answer is a video, and follows from founders with live products.
Views alone do not count.

## 2. Brand style

- Voice: plain, warm, direct, "I". Real numbers including the zeros. Admit a mistake in one line, then
  the lesson. Never em dashes, never invented figures, never "free while we launch", never a docs
  chatbot as the opponent.
- Story shape for every video: the stuck point, what I tried, what happened, the lesson, one question.
- Look: the existing kit (ink, paper, one gold accent, Fraunces, DM Sans, IBM Plex Mono).
- Four lanes, all short and vertical first (9:16), 16:9 cut later. Variety is the point, and each lane
  is a Remotion template that any video can use:
  - **Talking head (edited):** Vishnu talks to the camera on a phone; Claude does the edit: cuts
    silences and fillers from the transcript, burned-in captions, zooms on key words, cutaway b-roll on
    chosen words, music under the voice, end card. For recaps, opinions and lessons.
  - **Animated explainer:** no camera. Motion graphics: kinetic type, UI mockups, charts, a funnel
    filling, an approval card. His voice (cloned) or a recorded one. For lessons and stories.
  - **Screen and b-roll:** his own screen recordings (the Verb dashboard, cal.askverb.com) and licensed
    stock clips, cut to the script with captions. For demos and how-tos, especially for Auralion Labs.
  - **Pixel story (parked):** the 8-bit avatar. Its quality is not good enough today. Either redo it
    properly in one sitting or drop it; do not publish it as it is.
  Weekly mix to start: 2 talking head, 1 animated explainer, 1 screen or b-roll, 1 agency (any lane).
  Keep the lanes that get replies after the first 10 videos. Do not decide on taste.

## 3. Formats, short form first

| Format | Length | Lane | Source of the story | Brand |
| --- | --- | --- | --- | --- |
| Day recap | 30 to 45s | face | docs/53 outreach log and the day's real numbers | Verb (personal) |
| Lesson | 45 to 60s | animated explainer or talking head | a symptom people search, from the blog (agent calls the same tool twice, confirming a destructive action, prompt injection) | Verb (personal) |
| Story | 45 to 60s | talking head or animated | a real incident: the missed call, the bot message called out in public, the 26 who never set up | Verb (personal) |
| Demo | 30 to 60s | screen and b-roll | a real task done in cal.askverb.com or the dashboard | Verb (personal) |
| Agency how-to | 45 to 60s | screen and b-roll, talking head or animated | something Auralion Labs actually did or knows; no client named without written permission | Auralion Labs |

Long form (5 to 8 minutes) comes after about 20 shorts: stitch the best lessons into one, same voice.

Target: 5 a week. Monday recap, Tuesday agency, Wednesday lesson, Thursday agency, Friday story.

## 4. The process and where a human must approve

The studio already works as five stages (see CONTEXT.md). Nothing publishes by itself. Vishnu approves:

| Stage | What Claude does | What Vishnu checks (must) |
| --- | --- | --- |
| 0 Brief | proposes the one point, hook, real numbers and their source | the point is true and the numbers are real |
| script | writes it in his voice | reads it aloud once; every word is his; no banned phrase |
| 1 Voice (pixel lane) | speaks it in his cloned voice | listens to the whole take; re-rolls any paragraph |
| record (face lane) | nothing | records one take from the approved script |
| 2 Words, 3 Cues | times every word, matches beats | skims the mismatches and the timed table |
| 4 Scene | draws the stills | the contact sheet, then the full preview with sound |
| 5 Render | both sizes, captions, three thumbnails, description | watches the final; picks the title and thumbnail |
| publish | nothing | posts it himself; description carries the cloned-voice line |

Do not skip these to save time. A wrong number or a banned phrase is what costs the brand, and every
past mistake in this project came from skipping a check.

## 5. The 100-minute day

| Minutes | What |
| --- | --- |
| 0 to 10 | capture: what actually happened today, with numbers (from the log) |
| 10 to 35 | brief and script with Claude, then read aloud and approve |
| 35 to 55 | record (face) or listen and re-roll the voice (pixel) |
| 55 to 80 | render and check: contact sheet, preview with sound, final |
| 80 to 90 | title, thumbnail, captions file, description |
| 90 to 100 | post, then answer every comment |

First week will be slower. If a day runs out, cut the render, not the approval. Once a week (Sunday,
100 minutes) plan the next five from the real log.

## 6. Tools and cost

- Voice: an ElevenLabs Instant Voice Clone (a paid plan; check the current price before buying). The
  key and voice ID live only in user environment variables. See brand/VOICE-SETUP.md.
- Remotion for the pixel lane, Whisper (local, free) for word timing, ffmpeg (free). Check Remotion's
  current licence terms for a solo founder before the first public video.
- Music: only a source we are licensed to use. Not chosen yet.
- Talking-head edit needs new templates in the studio: transcript-based cut (Whisper words, remove
  silences and fillers, Vishnu approves the cut list before render), captions with word highlight,
  zoom on key words, b-roll cutaways on named words, music ducking, loudness normalised with ffmpeg.
  Not built yet.
- Animated explainer needs a small library of scenes: kinetic text, UI mockup, chart, funnel, approval
  card. Part of this exists in the kit (Headline, Stat, Screen, Tag).
- B-roll sources: Vishnu's own screen recordings, and licensed stock (check the licence of every clip,
  keep a note of source and licence in the video's folder). Claude cannot generate video; it can edit,
  animate and caption.
- Filming for the edit: vertical 1080p, a quiet room, the phone at eye level, window light in front,
  and a cheap clip-on mic if the room echoes. Good audio matters more than good picture.
- No other paid tool is needed.

## 7. Honesty and platform rules

- Every pixel-lane description says: narrated by my cloned voice, reading a script I wrote and
  approved. Check each platform's label for synthetic voice and use it.
- Agency videos never show a client, a client's data or their name without written permission.
- Numbers come from the outreach log, the admin or the brain, never from memory.
- A DRAFT-voice render is never published.

## 8. Build list, in order

1. Voice clone (you, about 30 minutes, once).
2. Finish and publish video one (see section 9). It is already partly made.
3. Talking-head template (cut, captions, zoom, b-roll, music, end card). **Built 2026-10-19 and run
   end to end on a test clip; see CONTEXT.md.** Not yet tried on real footage.
4. Screen and b-roll template, then animated explainer scenes, then decide on the pixel avatar.
5. Pick licensed music.
5. Auralion Labs end card and a short brand note.
6. A one-line-per-video metrics sheet (date, format, lane, views, replies, sign-ups from video).

## 9. First week

- Day 1: voice clone. Fix the what-is-verb script (see below), re-record the changed lines, finish
  stages 4 and 5, publish. Then a face-lane recap.
- Day 2: first Auralion how-to, face lane, from something real.
- Day 3: first lesson, pixel lane: why an agent calls the same tool twice (a symptom a PM said he
  would search for; your blog post "stop-ai-agent-retrying-failed-tool-calls" is the source).
- Day 4: second Auralion how-to.
- Day 5: first story, pixel lane: the bot message that got called out.
- Weekend: review replies and the metrics sheet; keep or drop a lane.

## 10. Known problems and risks

- The existing `videos/what-is-verb` script and cues break three standing rules: it says "free right
  now while I launch" (never say this; the offer is a free 30-day pilot and a price from measured
  value), the example is one click ("move my Friday meeting to Monday", demos must include an
  exception), and the brief lists a "150 actions per site" number. Fix the script and re-record those
  lines before stage 4.
- Video will not fix activation or the first-run problem. It is a slow channel; judge it at Day 30.
- Pixel Vishnu may not land with founders. The test in section 2 is for that.
- 100 minutes is tight for five videos a week. If it fails, drop to three a week and keep the approvals.

## 11. Lessons from real footage

- 2026-10-19, first talking-head cut (who-is-vishnu): a full-sentence text panel at the start ("6 apps
  this year. 1 makes money.") read as templated and "AI". Vishnu's rule from it: on-screen text is two to
  four words at most, never a full sentence, and the first second is just his face and his voice.
  Numbers on screen (2,500+, 0 of 10) were fine. He will re-record the opening; the pipeline stays.
- Takes: several takes can be dropped into raw/ (01.mp4, 02.mp4 ...) and are joined in name order; the cut
  keeps the last take of any repeated line. A pickup of only one line can be added at the end.
