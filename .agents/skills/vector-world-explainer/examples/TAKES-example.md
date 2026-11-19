# v6 takes: which on-camera clip plays each face window, and why

Source: `<RAW_TAKES_DIR>/DJI_20261020*_0129..0137_D.MP4` (1512x2688 HEVC 10-bit, 29.97 fps, BT.709) with the DJI mic `.WAV` of the same name. All of them were already archived, byte-identical, with transcripts, so nothing was copied again.

## How they were judged
- **Words:** faster-whisper medium.en with word timestamps on each untouched WAV (`audio/v6/takes/t*.words.json`). Doubtful words were re-checked with large-v3 on short clips.
- **Eyes to lens:** YuNet face landmarks every 3rd frame (`takes/gaze.json`). The yaw proxy is (nose x - eye-midpoint x) / eye distance; |yaw| < 0.35 counts as "towards the lens". The camera sat to his right and he was reading the script on a screen to his left, so **every take looks off-lens most of the time**. The choice is relative: the best sentence available.
- **Face never covered:** dense face-crop strips at 0.2 s (`film-v6/v6/facestrip.py`), checked by eye.
- **Light and focus:** the same in all of 131-137 (one sitting, same framing). 132 is a different handheld close-up from below and starts mid-word ("build a chip"), so it wasn't used. 129/130/136 are false starts.
- **Sync:** the MP4s of 129-134 have a silent audio track (-91 dB). 135-137 have the camera's copy of the mic, which lags the WAV by about 35 ms (wireless latency). All WAVs have exactly their MP4's duration, so WAV time = video time (lag 0). The lip-sync stills in the review confirm this.

## Chosen (frame sheet `qa/v6-takes-sheet.jpg`)
| Window | Line | Take, source s | Why |
|---|---|---|---|
| 1 hook | "Google built a chip ... would have taken 10 septillion years. Now what is it? It's a quantum computer." | **131** 8.22-16.74 | The clearest "septillion". It has the most lens time of any hook take (49% / 100% / 82% by sentence) and no hands on the face. |
| 1 hook | "And in the next 2 minutes, you'll actually understand it." | **135** 9.62-12.12 | Says "two minutes" (no "60 seconds" problem) and is clean. 137 runs "computer and in" together with no gap to cut on, and 131's version is 0% to lens. |
| 2 myth | "So does it try every answer at once? Well, no. The moment you look, it lands on just one random answer." | **134** 12.68-17.64 | Has the most lens time (38/0/39%) and a clean face. 137 is 0-7% and 133 0/0/57%. |
| 3 pool | "Now imagine you and your friends are in a pool, splashing water on each other, waving your hands." | **137** 18.86-23.54 | His favourite take, delivered with energy. I cut before "having fun": at 24.2 s his hand covers the lens. |
| 3 pool | "When two waves at the same length and the same width combine, they form like a bigger wave." | **133** 26.38-30.08 | Clean face. In 135 the hand sweeps across his forehead and cheek on "bigger wave" (26.0-26.4 s). In 137 the hand covers his mouth on "wave." (29.0-29.3 s). |
| 3 pool | "Now that's what the right answers are. They form a bigger wave. So the probability of the right answers goes up." | **135** 27.00-31.68 | Clean face, and he says "what". 137 sounds like "where" and has a hand at the mouth before it. |
| 4 | "So a quantum computer isn't a faster laptop, it's a whole new kind of computing. And here's why I want you to know this. Quantum computing could be the next AI wave." | **137** 36.76-45.12 | His favourite. Complete and clean, with a smile at the lens on "next AI wave". 135's "AI wave" (74% to lens) has a hand on the chin and mouth. |
| 4 | "We're trying to have a breakthrough here and AI is helping make those breakthroughs. So quantum computing could be the next thing you have to learn." | **134** 41.98-48.04 | Clean face, and it ends looking into the lens. 137 has a hand at the mouth (45.6-46.0 and 47.0-47.8 s). |
| 4 CTA | "And if you want to keep learning about the next big breakthrough, hit follow." | **135** 54.70-57.34 | The most lens time of any CTA take (81%). The "hit follow" wave is beside his face, not over it. |

**Seconds per take (of 48.8 s on camera): 137 = 13.3 (27%, the largest share), 134 = 11.6, 135 = 11.0, 131 = 8.7, 133 = 4.2.** Where 137 (his favourite) lost on merit:
- the hook: his "ten septillion" in 137 is mumbled. Whisper medium hears "tens of pillion" and large-v3 hears "sub-billion".
- three sentences where his hand crosses his mouth.

## Cuts this creates (all on sentence boundaries)
- **Same take, joined in the pause** (no time skipped, invisible):
  - W1 131 at "Now what is it"
  - W2 134 at "The moment"
- **Zoom cuts** (hard reframe on the cut frame):
  - W1 131→135 "And in the next 2 minutes"
  - W3 137→133 "When two waves" and 133→135 "Now that's what"
  - W4:
    - 137 pauses tightened at "And here's why" (0.19 s skipped) and "Quantum computing" (0.17 s)
    - 137→134 "We're trying"
    - 134→135 "And if you want"
    - 135 pause tightened before "hit follow" (0.16 s)

## Fact notes
- Every take says "would have taken 10 septillion years (for)" instead of "would need". The meaning is the same.
- No take says "60 seconds". The film now says "in the next 2 minutes" (v5 open issue #81 closed).
- "AI is helping make those breakthroughs" replaces rec55's "AI is enabling those breakthroughs". The meaning is the same, and the NOTES.md check still holds.
