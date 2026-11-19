# Spine files (generated per film; the copies here are a tiny SAMPLE)

The spine is built by the `news-qa-reel` shell (its clip builder cuts the voice and the footage from the same spans)
or, for a free-standing film, by the `paper-lab-reel` spine scripts. This world only **reads** it. The sample files
here are 5.5 s / 165 frames / 10 words ("The US just banned a Chinese AI. Was that fair?") so the template
typechecks and the shell code has something to read. They are not a film.

**With the sample spine, the worked-example `src/world/T.ts` (and so `beats.ts`, `scenes.tsx`, `ig.tsx`,
`events.ts`) throws at module load** (`cue not found: Why did they` etc.), because those cue the source film's
phrases. That is the intended safety: rewrite `T.ts` + `beats.ts` against the new film's real `words.json` first.
`npx tsc` is unaffected.

## `edl.json`
```jsonc
{
  "clip": "c1-deepseek", "version": "v5",         // free text
  "source": "<raw take file name>",               // provenance only
  "crop_x": 732, "lo": 0,                         // how the proxy was cut from the landscape raw (informational)
  "segments": [{ "out": 0, "src": 0, "len": 93.57 }], // output time `out` plays source time `src` of public/proxy-1440.mp4 for `len` s
                                                  // (one segment when voice + footage were sped together; N for pause trims)
                                                  // optional "idle": true -> that segment plays matte/idle-m1440.webm (silent listening footage)
  "speed": 1.18, "gap": 0.18,                     // speed-up and pause cap used by the builder (informational)
  "intro": null,                                  // or { t, dur, text }: a synthetic voice line before his first word
  "outro": { "t": 91.14, "dur": 2.13, "text": "Follow for more AI news." }, // spoken outro; the END beat starts at outro.t - 0.3
  "srcEnd": 93.57, "total": 93.57,                // seconds; mix.py reads `total`
  "frames": 2807,                                 // = composition durationInFrames (TOTAL in lib.ts) = round(total * 30)
  "items": [{ "type": "his", "q": true, "text": "..." }] // the script in order; q = a viewer question he reads out
}
```

## `words.json`
Array of `{ w, s, e, src, spk?, q? }`: the word as shown (with punctuation), start / end in **output** seconds, the
source time, speaker, and `q: true` when the word belongs to a question he reads (the IG DM card). The spoken outro
words are excluded (the end card shows them). Captions chunk these automatically (`src/captions.ts`: break at
sentence punctuation, a pause > 0.35 s, or ~4 words / 24 characters); `cue("phrase", nth?)` finds times in them and
throws on a missing or ambiguous phrase.

## `vo_env.json`
Per-frame voice RMS, normalised 0..1, length = `frames`. `voLevel(fr)` in `lib.ts`; optional for worlds (the
dossier world does not use it).

## `mattes.json`
`[{ "file": "matte/m0.webm", "srcStart": 0, "frames": <proxy frame count> }]`. The v6 presenter plays
`public/matte/m0-1440.webm` (VP9 alpha, whole clip, re-encoded with `-g 15`) per EDL segment.

## Media expected in `public/` (never committed)
`proxy-1440.mp4`, `matte/m0-1440.webm` (+ `matte/idle-m1440.webm` if any segment is `idle`), `vo.wav`, `bed-dossier.wav`.
Textures `src/world/tex/*.jpg` come from `src/world/make_textures.py`.
