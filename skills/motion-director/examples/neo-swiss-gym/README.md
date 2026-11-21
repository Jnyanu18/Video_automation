# FORM / Training Club — gym advertisement

15 seconds · 1920×1080 · 60 fps. FORM is a fictional gym brand used for this demonstration. No actual price, offer, location, performance result or booking destination is asserted.

The ad applies the supplied Neo-Swiss direction selectively: a persistent viewfinder HUD, flat high-contrast color flips, heavy per-letter spring typography, ball physics/trails, compatible polygon morphs and guide handles, concentric type, liquid-mask inversion, generative lines, a training bento, grain and a clear identity/CTA close. The eight chapters follow roughly four-beat 128 BPM intervals. The copy remains gym-focused.

The soundtrack is original synthesized percussion and impact/sweep accents. No external music, model API or paid voiceover call was used. The line field shares the composed beat envelope; it does not analyze arbitrary music files.

## Edit and render

Inside the source folder, run `npm install`, then `npm run render`. Output is written beside the source, or set GYM_OUTPUT_DIR. Set CHROME_PATH for an installed browser, or allow Remotion to use its managed browser. The exported plan near the top of GymAd.tsx contains brand name, CTA, dimensions, FPS, chapters and exact frame cuts. Colors are in palette. Individual scene functions contain choreography. This template is designed for its fixed 60 fps landscape composition; changing frame rate or aspect ratio requires retiming/reflow.

Fonts and their license notices are included. The optional make-audio.py regeneration script requires Python, NumPy, SciPy, Pillow and ffmpeg; the supplied MP3 and grain PNG already allow rendering without those Python dependencies.

## Integration limits

This is a tested custom motion component, not an extension to the basic seven-scene JSON schema. Skill v1.2 routes the specifically requested Neo-Swiss profile to a custom-renderer handoff instead of silently approximating it with basic panels. The app host still needs to register this trusted template or run reviewed custom source in its isolated worker.

## Verification

TypeScript and export checks passed. Eleven storyboard/animation frames were inspected before export. Media metadata and audio measurements are recorded in render-report.json. No claim of exact reproduction of every uploaded reference or of general production-app integration is made.
