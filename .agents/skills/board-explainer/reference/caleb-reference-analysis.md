# Source analysis: Caleb Writes Code, "PHP security crisis explained.."

https://www.youtube.com/watch?v=6VmA4x1lh1M (8:03, 1920x1080 50 fps, uploaded 2026-10-23, ~68K views at analysis).
Local copy + sheets: `analysis/ref-6VmA4x1lh1M/`. Chapters: 0:00 PHP2Shell · 3:57 Sponsor (Bluehost) · 4:55 Analysis.

## Look
- Pure black canvas, no texture. Everything is drawn on an iPad (Procreate-style monoline marker/pencil, slightly wobbly,
  round caps), revealed stroke by stroke as he talks. One master diagram grows across the whole explanation:
  user (stick figure) → "HTTP POST" arrow → cloud → server tower with the PHP logo → green RAM stick → a memory box
  (hex addresses / nested boxes), with annotations around it ("Book Keeping, nElements, nUsed", "Out of Memory (OOM)",
  "allocation", "Setting", "GOAL").
- Colour = role, hand-lettered: white = structure; **blue** = PHP's own actions (allocation arrows); **green** = data /
  RAM; **yellow** = labels, RAM title, highlights; **red/orange** = danger, attacker data, OOM; a **purple** in places.
  A big flat **red block arrow** (stamped, not drawn) points at the thing being discussed.
- Attacker = a small red figure (crewmate-style) next to "malicious data?". Skull drawn on the memory box.
- Few hard cuts (7 scene changes in 8 min). Cut-aways to real screenshots (GitHub issue, Claude Code / vLLM bug report,
  a CVE tracker chart with a red arrow on the spike), then back to the board.
- Second half ("Analysis") wipes to new small boards: a 10-week timeline (Jul → Oct, "patch"), AI agents finding bugs,
  "3 weeks" of disclosure, and a final mini board.

## Voice / audio
- Calm, conversational solo narration; no music bed to speak of. Integrated -20.1 LUFS, LRA 4.2.

## What to keep for Madhav's version
- Black iPad board, monoline coloured strokes drawn on at the speed of speech, one diagram that grows, red stamp arrows,
  colour = role, cut-aways to real artefacts (CVE chart, real advisory text), the closing "analysis" section.
- Madhav's version adds: his real face (DJI take) for the lines he recorded, his ElevenLabs voice (v4 + clone strength)
  for richer factual narration over the board, and Hindi humour from his take.
- Don't copy Caleb's drawings or wording 1:1; same visual grammar and structure, original drawings and script.
  Never reproduce exploit syntax (the nested-array payload shape stays conceptual: "a strangely nested form").
