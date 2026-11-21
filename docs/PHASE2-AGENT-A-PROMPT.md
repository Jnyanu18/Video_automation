# Paste this to Agent A

Open the workspace `J:\ai editor`. You are **Agent A**. Another agent is working in parallel on
Phase 3 in the same repository.

Read these three files in full before writing any code:
1. `docs/longform-contract-v2.md` — file ownership, the frozen interface, schema rules. Binding.
2. `docs/longform-phase1-verification.md` — what Phase 1 actually measures, including the gate
   it fails.
3. `docs/ANTIGRAVITY-BUILD-LONGFORM-EDITOR.md` section 4 — the original Phase 2 brief.

Then read the code you are taking over: `packages/footage/footage/` — especially `schema.py`,
`index.py`, `triage.py`, `proxy.py`, `speech.py`, `faces.py`.

**You own understanding the footage. You do not write the planner or the renderer** — Agent B
does, and editing a file you do not own is the one unrecoverable mistake here.

---

## Hour one, before anything else

Agent B is blocked until you commit `footage/score.py` and `footage/search.py` with the exact
signatures in contract section 2, implemented deterministically with **no model calls**:
`highlight_score` from `keep_score`, face area, audio class and duration; `find_moments` as
keyword matching over `description`, `tags` and `speech.text`. Commit, then say so.

Those signatures are frozen from that commit on. Improve the insides later as much as you like.

---

## Task 1 — fix the throughput failure (do this before the model work)

Phase 1's `realtime_factor` is **3.64x against a gate of 6.0**. Eight hours of footage would
take ~2h12m to index. **61% of the time is the proxy transcode** (297s of 488s on the
verification corpus).

**Measure before you change anything.** The verification corpus had only 2 files, and the proxy
pass parallelises across *files*, so it could only use two cores — the number may be pessimistic
for a real shoot, which arrives as dozens of card files, and optimistic on resolution, since it
was 1080p and real footage is 4K. So:

1. Build a corpus of **~20 files** at realistic resolution. Rebuild instructions are in
   `docs/longform-phase1-verification.md`; scale it up, and use 4K where you can.
2. Re-measure `realtime_factor`. **Report the number before and after any change.**
3. If still under 6.0, parallelise **within** a file: split into segments, transcode
   concurrently, concat. Do not start by tuning ffmpeg flags — the parallelism ceiling is the
   structural problem, flags are noise against it.
4. Cap worker count at `os.cpu_count() - 1` and keep it in config.

Gate: **`realtime_factor >= 6.0` on the 20-file corpus**, reported with both numbers.

## Task 2 — the speech path has never run

Phase 1 reports `speech: 0 segments` even on audio-bearing files, because the verification
audio was pink noise and a sine tone. Classifying that as "not speech" is arguably correct, so
**the speech path is untested, not broken** — and Agent B's Phase 3 depends on it completely
(`prefer: speech_whole` beats must never cut mid-sentence).

Build a corpus containing **real spoken audio** — TTS output is acceptable if you record the
ground-truth text — and prove:
- speech shots are detected and transcribed, with word timings
- `audio_class == "speech"` fires on speech and not on music or applause
- speaker turns split on pauses
- transcription runs only on shots over 2s classified as speech, never on the whole file

Gate: report segments found, against the known ground-truth text, and the fraction of total
audio that ran through whisper (it should be small — that is the point of the ladder).

## Task 3 — describe the survivors

`footage/describe.py`. Only moments that survived triage. **Hard budget: the model sees at most
40 minutes of footage per 8-hour project.**

- Send **3–5 sampled frames or a short proxy segment** per moment — never a whole clip, never an
  original file. Fill `description`, `tags[]`, `energy` (1–5), `people_count`.
- Batch into one request where the API allows it.
- Cache by moment content hash in `<work>/cache/describe/<hash>.json`. A second run must be free.
- Use Gemini. Keep every call behind one interface so the provider can be swapped.
- **With no API key this must still succeed**, filling `description` from local metrics
  ("handheld, 2 faces, speech, high motion") and `tags` from `audio_class`, with
  `describe_source="local"`.

Gate: `model_seconds_sent <= 2400` for an 8-hour project; `cache_hits` on a second run equals
the moment count; the no-key path produces a usable description for every kept moment.

## Task 4 — people

Grow `faces.py` from detection into **clustering**: embeddings plus agglomerative clustering,
entirely local. Emit `Person` clusters (contract section 3) with representative thumbnails so a
human can name them once — "the bride", "grandmother". Names come from people, never guessed.

This is biometric-adjacent data about private individuals, including children at school events.
Therefore, and this is not negotiable: **every embedding and thumbnail stays inside the
project's own work directory, nothing goes to any external service, and deleting a project
deletes its face data.** Implement and test that deletion.

Gate: the same person groups across camera angles on the verification corpus — the tester checks
a named cluster by eye — and a test proves no face data is written outside the work dir.

## Task 5 — scoring and search, properly

Now improve the hour-one implementations: `highlight_score` from keep_score, energy, face area,
audio class, speech presence, named-person presence and **novelty** (penalise near-duplicates, so
a highlight reel does not show the same thing five times). Weights in one documented
`ScoreConfig`. `find_moments` gains optional embedding similarity, with the keyword path still
working with no model.

Gate: `python -m footage search idx.json "first dance"` returns ranked moments whose top 5 are
genuinely relevant when the tester opens the contact sheets.

---

## When you are done

`pytest` in `packages/footage` green with **at least 40 tests** total, including a no-API-key
test. Engine suite still at least 433 passed / 1 skipped. Then write
`docs/longform-phase2-results.md` using the reporting format in section 7 of the build spec:
what you built, the measured numbers from real runs, what you could not do, dependencies added
with a one-line justification each, and copy-pasteable commands.

Work on branch `longform/phase-2`. Commit as you go. **Do not merge.** A third agent tests your
work by rerunning every command in your results doc, so a number you estimated rather than
measured will be caught.
