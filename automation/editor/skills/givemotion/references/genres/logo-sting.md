# Genre: logo sting / intro (3–6 s)

Purpose: structure, pacing and the moves that scored well for short logo animations that open or close a brand's videos.

| Time (5 s sting) | Beat |
|---|---|
| 0–0.3 s | Already moving at frame 0: strokes or shapes flying in, light streaks; never an empty first frame |
| 0.3–2.5 s | Build: lines and shapes converge, draw on and wrap into the mark (`draw`, path travel, `morph` of shapes into the logo paths) |
| ~2.5–3 s | The hit, on the strongest beat: the mark locks, burst of sparks, a ring that scales out, flash, camera shake 10–16 px |
| 3–4.5 s | Wordmark reveal (`mask-left`, `blur`, split chars with a short stagger) and the tagline |
| 4.5–5 s | Lockup still alive: slow push, a shine across the mark; the last second must not be still |

Rules:
- Find the hit first: `npx givemotion audio music.m4a` lists the biggest hits; put the lock on one in the first 3 s and build backwards from it.
- Use the logo's own SVG paths: draw its strokes (`data-enter="draw"`), or morph simple shapes into its paths with a timeline `morph`.
- Tagline ≥ 48 px on 1080p; judges called 30 px taglines "barely readable" in every sting.
- Keep the wordmark clear of the moving mark (chars overlapped the icon while it slid). Check the build with `snapshot --from 0 --to 3 --every 0.2`.
- "Expensive" means restraint: one palette, one hit, smooth arcs, motion blur (`--motion-blur 8`; a sting is short, so the cost is small), no scribbly tangle of lines in the build.

What judges marked down: nearly empty first frame, 0.5–1.5 s with little change, a tiny tagline, a near-static last second, a build that looked tangled rather than designed.
