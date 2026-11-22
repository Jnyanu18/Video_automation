# Brand

## Why this studio exists

To share what Vishnu knows, in his own voice, as content for two brands from one pipeline:

| Channel | For | Content |
| --- | --- | --- |
| Personal brand (Vishnu) | founders and builders | building AskVerb in public, real numbers, lessons, how he uses AI to build |
| Auralion Labs (the agency) | business owners who might hire it | what the agency builds, client results (only with permission), how-tos that show expertise |

Every brief names which one it is for. The look and the avatar are shared; the end card and the call
to action differ (personal: follow and ask a question; agency: a link to auralionlabs.com). Agency
videos never name a client or show client data without written permission.

## Who is speaking

Vishnu Prasad S, a solo founder in Bangalore, building AskVerb in public and running Auralion Labs.
The channel is a founder's honest log: real numbers, including the zeros, what failed and what he is
changing. Not a guru, not hype.

## How he sounds

- Plain, warm, direct. Short sentences. Says "I", never "we".
- Leads with the outcome or the honest number, then the story behind it.
- Admits mistakes in one line and moves on to the lesson.
- Never: em dashes, "game changer", "revolutionary", "in today's fast-paced world", invented figures.
- Ends with one real question for the viewer.

## The look

| Token | Hex | Use |
| --- | --- | --- |
| ink | `#14151a` | backgrounds for dark scenes, all text on light |
| paper | `#ffffff` | light scenes |
| parchment | `#f8f9fb` | panels |
| gold | `#ffc400` | the one accent: highlights, the tick, progress |
| gold-deep | `#a97a00` | small accent text on white |
| gold-wash | `#fff6d9` | highlighted words |
| graphite | `#5c6472` | secondary text |
| done | `#2f7a43` | "it worked" |

Fonts: Fraunces for headlines, DM Sans for body and captions, IBM Plex Mono for numbers, commands and
screens. Gold is a fill or a wash, never thin text on white.

## The avatar: "Pixel Vishnu"

A 16-bit pixel character drawn from his photo: big dark curls, black rectangular glasses, warm
light-brown skin, a lean build, navy blazer over a white tee with a small gold lapel pin. Shown from the
head to the waist. Reference: `brand/avatar-preview-v4.png`. Lives in a corner of the frame, talks when the voice talks
(mouth driven by the word timings), blinks every few seconds, and points or holds a gold tick on key
beats. Code: `remotion/src/kit/PixelVishnu.tsx`. Drawn as code, so he never needs an image generator.

## The voice

His own voice, cloned in ElevenLabs from a clean recording of him reading. Stored as a voice ID in
`ELEVENLABS_VOICE_ID`; the key in `ELEVENLABS_API_KEY`. Every description says "narrated by my cloned
voice reading a script I wrote". Until the clone exists, `speak.py` uses a stand-in voice and marks the
output DRAFT.

## Formats

- 16:9 for YouTube (1920x1080), and a 9:16 cut for Shorts, Reels, TikTok and LinkedIn (1080x1920),
  rendered from the same scene with the vertical layout.
- Burned-in captions on the vertical cut, two to five words at a time, the spoken word in gold.

## Talking-head style (set 2026-10-17, light since 2026-10-19)

Same fonts and colours as everything else. Since 2026-10-19 the cards are light, because Vishnu found
the dark ink panels and the dark end card heavy. `style: dark` in edit.md still gives the old look.

- Cards: white (96%), ink text, a soft shadow, rounded. They sit below the face and above the captions,
  never over the face.
- Captions: DM Sans, semibold, white with a dark shadow, at most three words at a time, breaking at the
  end of each sentence. The spoken word sits on a gold (`#ffc400`) block with ink text.
- Text on screen: two to four words or one number, never a full sentence (lesson from the first video).
  The first second is his face and voice only.
- Name tag, three seconds, timed to when he says his name: "Vishnu" in Fraunces, "building AskVerb in
  public" in DM Sans, a gold bar beside it.
- Numbers on screen: IBM Plex Mono, large, count up on the word; the suffix (+) in deep gold.
- End card: his last frame, frozen and softened, with a white card on it: one question in Fraunces and
  the address on a gold block ("askverb.com", or "auralionlabs.com" for the agency). Never a jump to a
  blank screen.
- Sound: subtle effects on beats (see the `broll` skill). No music until a licensed track is chosen.
- Gold is a fill, never thin text on white. Never more than one accent colour.
