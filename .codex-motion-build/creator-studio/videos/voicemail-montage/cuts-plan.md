# Cut plan: the voicemail montage (draft for Vishnu's ok)

Made 2026-10-23 from Whisper transcripts of the 7 clips in `raw/calls/` (full text in `work/calls/*.txt`).
Times are seconds into each clip. Whisper times can be off by a fraction of a second, so every bleep
is padded by 0.15 s on each side, and Vishnu listens to each one before the cut is ticked.

## Everything that gets bleeped

| Clip | Time | What is said | Why |
| --- | --- | --- | --- |
| 232618 | 62.25 to 63.0 | "Marcus" | a customer's name, read from a review |
| 232901 | 38.3 to 39.0 | "Tyler" | the owner's name |
| 232901 | 69.9 to 71.4 | "Valerie says" | a customer's name |
| 232901 | 77.35 to 77.95, 79.9 to 81.05 | "Tyler" (twice) | the owner's name |
| 233040 | 0.0 to 3.1 | "Dunnellon Septic Tank Services" | business name |
| 233040 | 15.2 to 16.1 | "septic tank" | part of the business name |
| 233040 | 26.0 to 27.2 | "Dunnellon Septic" | business name |
| 233927 | 43.8 to 46.1 | "TNT septic service" | business name |
| 233927 | 48.35 to 49.1 | "TNT" | business name |
| 235930 | 16.0 to 18.25 | "Cherie Lashley with Viking Tree Experts" | a person's name and the business |
| 000040 | 8.45 to 9.3, 11.25 to 12.3 | "Pramod, it's Monkey Tree", "Monkey Tree service" | someone's name in the room, and the business |
| 000600 | 2.25 to 3.9 | "Prime Time Septic Pumping" | business name |
| 000600 | 19.6 to 23.8 | "469-733-2530" | their after-hours phone number |

**Listen before ticking:** clip 232901 from 2 s to 37 s. Whisper heard almost nothing there, so it may hold a
greeting with a name in it that this table misses.

## The story (about 45 to 60 seconds before the demo)

1. **Hook, 0 to 3 s.** A voicemail greeting, cold open, no intro:
   "If you reach this message, [we're] up a tree or running a saw." (235930, 18.7 to 21.9; Whisper wrote
   "read it up a tree", so listen for the exact words)
2. **The montage, about 20 s.** Fast cuts, each a few seconds, the business name bleeped:
   - "Please record your message." (232618, 22.0 to 23.4)
   - "We are either on another line or assisting with a customer. Please leave a message." (000600, 8.7 to 16.6)
   - "Please leave us a detailed message or send us a text." (235930, 24.2 to 28.0)
   - Vishnu, deadpan: "Another voicemail." (232618, 84.0 to 84.9), "I think we have another voicemail." (232901, 20.2 to 23.0)
3. **The turn, about 5 s.** Vishnu: "...the exact problem I'm facing right now." (000600, 32.1 to 37.4,
   or 235930, 40 to 42; pick the cleaner take)
4. **The demo.** Not recorded yet: a call to a made-up roofing company, the AI answers, explains, and books.
5. **End card.** auralionlabs.com.

## Needs a decision: the people who picked up

Three calls were answered by a real person: Dunnellon Septic (Florida, "No, thank you"), TNT Septic
(North Carolina, "we're not interested"), and Monkey Tree (Texas, hung up).

Florida is an all-party consent state for recording calls, and publishing a recording of someone who did
not agree to it is a real risk. This is not legal advice. The safe default is to **leave out the voices of
the people who answered** and keep only Vishnu's side, with an on-screen line such as "They said no."
Voicemail greetings are recordings made to be played to callers, so they carry less risk, and every name
in them is bleeped.

## Not used

- Clip 000040 (Monkey Tree): very short, a hang-up, and other audio at the start ("Let me kiss you, my love").
- The longer voicemail pitches Vishnu left: too long for a montage. One line from them is the turn (step 3).
- Clip 235930's picture is shot from below at an angle. Its audio is the best greeting, so it plays over a
  usable frame from another clip, or over a "voicemail" card.

## The demo call (raw/demo/VID_20261024_002056.mp4, 2:12, 4K 60fps portrait)

Recorded 2026-10-24 as a web call to "Lanternfield Roofing - Ava (DEMO)" (Retell call
call_e2e9925c600045a184b39652af4; Retell's clean recording is kept as a backup for the audio). Video times
are about 3.5 s later than Retell's call times. Whisper transcript: work/demo/demo-words.json.

| Keep | Video time | What is said |
| --- | --- | --- |
| A | 4.0 to 8.7 | Ava: "Hi, thanks for calling Lanternfield Roofing, this is Ava. How can I help?" |
| B | 9.4 to 15.5 | "I think my roof is leaking. I've got a stain after the storm." |
| C | 17.8 to 25.8 | Ava: "Oh no, a stain after the storm, that's never fun. Is it actively dripping, or just a spot...?" |
| D | 25.7 to 28.4 | "It's just a spot right now." |
| E | 31.2 to 38.1 | Ava: "Okay, good that it's not actively dripping yet. Let's get a roofer out... What day works?" |
| F | 38.8 to 40.1 | "I'm free on Thursday." |
| G | 42.7 to 51.3 | Ava: "Let me see... Thursday at 8 in the morning, 10:30, 1, or 3:30 in the afternoon." |
| H | 53.6 to 56.4 | "10:30 works fine for me." |
| I | 58.2 to 63.6 | Ava: "Got it, 10:30 on Thursday. What's the address of the house?" |
| J | 64.8 to 70.2 | "It's 112 Oak Street, Round Rock." |
| K | 73.0 to 76.0 | Ava: "Perfect, that's right in our area." |
| (cut) | 76.0 to 100.0 | Name and phone number, and Ava reading the number back. **Vishnu said his real phone number.** Never in the video |
| L | 100.0 to 118.4 | Ava: "Alright, you're all set, Thursday the 29th at 10:30... The roofer will give you a quick call... Anything else?" |
| M | 118.4 to 120.5 | "Nope, nothing. That sounds good." |
| N | 124.7 to 129.1 | Ava: "Sounds good, Vishnu. You're all set, talk soon!" |

Kept: about 86 s. At 1.15x about 75 s, at 1.25x about 69 s (pitch kept). With the 27 s montage: about 1:36 to 1:42.
