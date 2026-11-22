# Edit plan: Every call went to voicemail

<!-- The cut is built by work/build_cut.py (a montage of many clips, then the demo at 1.25x), not by
cut.py. Times come from work/cut-words.json, so a beat stays on its word. Look: style site, the look of
auralionlabs.com (remotion/src/lanes/talking-head/site.tsx). Every number on screen is from the call log:
30 dials to 28 businesses, 2026-10-15 to 2026-10-20 (cold-call-scripts/call-log.csv); 16 of those 28
businesses only ever reached voicemail (57%). -->

## Settings
brand: agency
style: site
captions: on
lower-third: off
music: off
sfx: on 0.35
end-card: Every call answered. / Every booking made. | auralionlabs.com

## Beats
- text "If you reach this message" | I called 28 local businesses. | Here's who picked up.
- text "please record your message" | Voicemail.
- text "If you have reached this recording" | Voicemail. | Again.
- text "Please leave us a detailed" | Voicemail. | And again.
- zoom "Another voicemail" 1.15 1.4
- stat "Another voicemail" dur=3.4 57% | 16 of 28 businesses went to voicemail
- text "the exact problem" | A missed call | is a missed job.
- text "Hi, thanks for calling Lanternfield" top=180 | Same call. | But an AI picks up.
- text "Hi, yeah, so I think" top=180 | Demo: Lanternfield Roofing | is a made-up company.
- text "All right, so you're all set" top=180 | Booked. | No voicemail.
