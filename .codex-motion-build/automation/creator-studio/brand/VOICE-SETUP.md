# Setting up the ElevenLabs voice (one time)

Until a key and a voice are set, the animated lane uses a stand-in voice and marks the video DRAFT.

## Keys and the voice

1. **API key:** at elevenlabs.io, Profile, then API keys, then create one. Copy it.
2. **Voice:** a library voice for narration (Voice Library: add it to My Voices, then copy its voice ID), or
   later your own clone (below). With more than one account, add the voice to each one, or use one of the
   default voices, which every account has.
3. **Set them as Windows user environment variables**, never in a file and never in a chat. In
   PowerShell:

       [Environment]::SetEnvironmentVariable("ELEVENLABS_API_KEY", "<first key>", "User")
       [Environment]::SetEnvironmentVariable("ELEVENLABS_API_KEY_2", "<second key>", "User")
       [Environment]::SetEnvironmentVariable("ELEVENLABS_VOICE_ID", "<voice id>", "User")

   Or with no typing in a terminal: Start, search "Edit environment variables for your account", New, and
   add each name and value. A third key is `ELEVENLABS_API_KEY_3`, and so on up to `_9`.

`speak.py` reads them straight from the user environment, so nothing needs restarting. It uses the first
key until ElevenLabs says it is out of credits, then the next one, and stops with a clear message when all
of them are. Keys are never printed or written to a file.

## The voice pick, every video

Before any narration is made, `python lanes/animated/speak.py <slug> --sample` speaks the first paragraph
to `voice/sample.mp3` and writes the voice's name into CHECKS.md as `0b Voice pick`. Claude says "The
selected voice is <name>. Continue with it, or change it?" and waits. On continue the line is ticked and
the full narration runs; on change, set a new `ELEVENLABS_VOICE_ID` and sample again. Changing the voice
later asks again.

## Your own clone (later, needs a paid plan)

1. **Record the sample.** 2 to 5 minutes of you reading something you'd actually say (a past Reddit
   post works). Quiet room, phone or a USB mic about a hand's width away, no music. Talk the way you
   talk on a call, not the way you read. Save it as a WAV or MP3.
2. **Make the clone.** At elevenlabs.io: Voices, Add a new voice, Instant Voice Clone. Upload the
   sample and confirm you are cloning your own voice. (Professional Voice Clone sounds closer but
   needs 30+ minutes of audio; start with Instant.)
3. Put its voice ID in `ELEVENLABS_VOICE_ID`. Re-voice a video with `python lanes/animated/speak.py <slug>`,
   then run steps 2 to 5 again, because the timings change with the new voice.

## What the description says

- A library voice: "Narrated by an AI voice."
- Your clone: "Narrated by my cloned voice, reading a script I wrote and approved."

The free plan is for personal use and asks for credit to ElevenLabs; anything posted on your accounts
should be made on a paid plan.
