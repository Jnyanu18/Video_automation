# PHP2Shell: facts and sources (checked 2026-10-22 via browser)

Sources:
- [T] Tenable FAQ (Satnam Narang, updated Oct 22): https://www.tenable.com/blog/php2shell-cve-2026-109618-cve-2026-109619-frequently-asked-questions-about-critical-php-remote
- [S] Sansec Forensics, "PHP2Shell" (Oct 21, updated Oct 22): https://sansec.io/research/php2shell
- Leads only (search snippets, not opened): ELLIO, Datadog Security Labs, Qualys, Sophos, Picus, CNBC (Oct 22), NCSC-NL php2shell repo.

| Claim on screen / in VO | Source | Status |
|---|---|---|
| CVE-2026-109618 (OOM corruption) and CVE-2026-109619 (stale global state, use-after-free), both CVSS v4.0 9.2 | T | verified in source |
| Fixes released Oct 21, 2026, 14:00 UTC: 8.5.12, 8.4.27, 8.3.36, 8.2.35 | T | verified |
| Advance notice Oct 20; CVE IDs leaked, so the release moved up a day | T | verified |
| Triggered while PHP parses a request, before any application code runs; risk highest for mod_php | T, S | verified |
| Every known trigger is a multipart/form-data (upload-style) request | S | verified |
| Bug 1: OOM while request data is partly initialised, then cleanup treats it as valid | T | verified |
| Bug 2: leftover state from one request points to freed memory; a later request on the same worker uses it | T | verified |
| Earliest affected code path dates to PHP 5.4.0 (released 2012) | T (Calif writeup) | verified; the 2012 date is PHP 5.4.0's release year |
| PHP used by 69.3% of websites whose server-side language is known (W3Techs) | T | verified; VO says "about seven in ten websites", footnote qualifies |
| Amazon Threat Intelligence saw an exploitation attempt on Oct 17 (MadPot honeypots), four days before disclosure | T | verified |
| Public PoCs do not work against a default PHP install; most need a local file inclusion bug too | S | verified (Sansec citing a researcher) |
| Update is the only complete fix; restart PHP workers after changes | T | verified |
| PHP 8.1 and older: no official release (source backports for 7.4-8.1; distro/LTS packages) | T, S | verified |
| Cloudflare deployed WAF rules for all customers including free; a stopgap only | T | verified |
| CISA alert Oct 21; not in KEV as of Oct 22 | T | verified, not used on screen |

Not used (kept out to stay accurate): any payload, request shape beyond "upload-style request", the affected app versions list, and host counts (estimates vary from 1.3M to 1.9M).

## Synthetic or stand-in elements
- Voice: edge-tts stand-in (`en-US-ChristopherNeural`). Replace it with Madhav's recording or an approved ElevenLabs clone before posting.
- Music and SFX: synthesized in code.
- No real people are shown and no logos are drawn. Product names appear only as text tags.

## Deliverable v1 (2026-10-22)
- `case-file-php2shell-v1-1440x2560.mp4`: 59.9 s, 1440x2560, H.264 High, 30 fps CFR, yuv420p limited range, BT.709 tags,
  13.6 Mbps, 102 MB, AAC 48 kHz, faststart. Within IG limits (≤25 Mbps, ≤300 MB).
- Technical QA: full decode clean; no black runs of 0.2 s or more; -14.1 LUFS integrated, -2.0 dBFS peak.
  Contact sheet `qa/final-contact.png`; transition strips `qa/cuts-v1b.png` (after the entrance fix).
- Creative QA: reviewed through stills and transition strips only. Not watched in real time; the audio was measured, not listened to.
- Not done: user review; replacing the VO with Madhav's own voice; a cover via image_gen; caption copy; scheduling. Nothing uploaded.
- Known nit: the memory-to-timeline cut (~39.5 s) is dim for about 2 frames while the timeline line starts drawing.

## Deliverable v2: Madhav Voice (2026-10-23)
- `case-file-php2shell-v2-madhav-voice-1440x2560.mp4`: 69.3 s, 1440x2560, H.264, 30 fps, yuv420p limited range, 13.8 Mbps, 120 MB.
- VO: ElevenLabs "Madhav Voice" (professional clone), eleven_v4, similarity 1.0, stability 0.45, speed 1.1, speaker boost.
  Generated as 14 separate lines (`film/audio/eleven/NN/`), then the clarity chain, gaps of 0.30 s (0.55 s at section breaks),
  pauses over 0.65 s shortened to 0.5 s, and -16 LUFS. Assembled VO: `film/audio/vo.wav`. The stand-in is kept as `vo-standin.wav`.
- Characters: 20,870 used before, 22,103 after = **1,233 deducted** (script was 853 characters). The first 14 calls failed on missing
  folders and charged nothing (balance unchanged). No retakes.
- Whisper medium.en (faster-whisper, CPU) on every line: all 14 match the script (line 2 only as digits "7 in 10").
  Full transcript of the delivered file matches the script, including the CTA "Save this for your next deploy."
- Technical QA: clean decode; no black runs; -14.1 LUFS, -2.2 dBFS peak. Contact sheet `qa/final-contact-v2.png`.
- Still open: listening review by Madhav; image_gen cover; caption copy; scheduling. Nothing uploaded.
