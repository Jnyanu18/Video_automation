# Motion vocabulary: techniques by meaning

Choose a technique because of what it says, never because of how it looks. Each entry gives the meaning, when to use it, when to avoid it, and how to build it. "Kit" means a function already in `kit/src/kit/`. Anything without a kit function is buildable from the craft rules. Write it as a new component and add it to the kit afterwards.

## Cuts and transitions

| Technique | It says | Use when | Avoid when | Build |
|---|---|---|---|---|
| Hard cut on the beat | "New thought." Energy, confidence | Default for fast films; between distinct ideas | Inside one continuous idea | Section boundary on a beat |
| Full-bleed colour flip | Punctuation, a new chapter, emphasis | Each section or card change in energetic films | Calm and premium films (use at most once) | Next section's `bg`; alternate light and dark |
| Hard stop and silence | Reset, "listen now" | Right before the key message, or the turn in a contrast arc | More than once per film | An empty frame or a single element, with the audio cut |
| Match cut / persistent object | Same thing, new context; continuity, reliability | Showing many features of one product; product as the constant | Unrelated scenes | Keep the element's geometry identical across the cut and change the rest (kit `phone`) |
| Scale bridge (zoom into an element until it becomes the next scene) | Go deeper, look inside, detail | Overview → feature | Fast bursts | Animate the element's scale until it fills the frame, then cut |
| Mask or iris reveal from a shape | Born from this, origin | A logo or mark that opens into the world | When the shape has no meaning | SVG clipPath grown with a spring |
| Occlusion (an object passes the lens and hides the cut) | Seamless, premium | Luxury, cinematic | Fast reels | A large foreground shape crosses the frame; cut while it covers it |
| Push or slide | Next step, sequence, progress | Step-by-step processes | Every cut (it becomes a slideshow) | Translate both scenes |
| Stepped stripe or mosaic wipe | Mechanical, editorial, digital | Tech and editorial films | Soft brands | Columns of rects with staggered timing |
| Whip (fast move with directional blur) | Speed, travel | Linking two places or states | Readable copy moments | Large translate + `blurF(vblur(v),0)` |

## Type behaviours

| Technique | It says | Use when | Avoid when | Build |
|---|---|---|---|---|
| Masked letter rise | Confident reveal; editorial | Headlines and wordmarks | Very long sentences | Kit `letters` |
| Slam (fast lateral entry, stretch and blur) | Urgency, impact, stress | Problem words, bursts | Calm brands, except as "the enemy" | Kit `slam` |
| Word performs its meaning | Wit, memorability | One-word cards (STRETCH stretches, GROW grows, SPLIT splits, SHAKE shakes, FALL falls) | When the meaning is abstract | Kit `burstCard` variants, or a custom transform |
| Glitch / slice displacement | Noise, broken, disruption | The problem state | Trust brands, or after the turn | Kit `slices` |
| Typewriter (mono) | System, AI, precision, being entered | Prompts, inputs, data, taglines | Emotional lines | `text.slice(0, n)` with a mono font |
| Echo / outline repeats | Repetition, habit, scale, "again" | Rituals, routines, "every day" | Static frames | Kit `outline` stacked |
| Ring / circular type | Cycles, breath, orbit, wholeness | Rituals, global, continuity | Long messages | Kit `ringText` |
| Stable anchor + swapping word | Breadth: built for X / Y / Z | Audiences, use cases | More than 5 swaps | Fixed line + `letters` swapped per beat |
| One giant word, full bleed | The one idea | Key message, climax | Every section | `fit()` to 90 % of the width |

## Shapes and graphics

| Technique | It says | Use when | Avoid when | Build |
|---|---|---|---|---|
| Topology-matched morph | Becoming, transformation, progress through states | Steps, poses, before→after, logo formation | Shapes with no semantic link | Kit `radialMorph` (star-shaped forms); for other forms, resample paths to equal point counts |
| Breathing scale | Life, calm, rhythm | Wellness, waiting states, end holds | Urgent films | Scale on a sine at the tempo |
| Metaball liquid + type inversion | Flow, softness, merging, community | Wellness, beverages, "together" | Precise and enterprise brands | Kit `gooInvert` |
| Particles converging into a form | Many → one; synthesis; AI understanding | Data → insight, assembly | When nothing actually forms | Seeded particle positions lerped to target points |
| Particles dispersing | Release, spreading, reach | Distribution, launch, "share" | Calm endings | Reverse of converging, with drag |
| Orbit / network | Reach, connection, ecosystem | Platforms, integrations | Single-feature products | Fibonacci sphere, rotation, edges |
| Line draw-on | Plan, journey, craft, precision | Routes, blueprints, signatures, enso | Fast bursts | `pathLength=1` + `strokeDasharray` |
| Counter or chart rising | Growth, proof | **Only with real, approved numbers** | Any invented data | Tie the number and the bar to the same eased value |
| Bento grid filling | Breadth of features, order | Feature sets | More than 6 cells on 9:16 | Staggered spring pops (kit `pop`) |
| Piling chips | Overwhelm, accumulation | The problem state | After the turn | Kit `chips` with fixed slots |
| Squash and stretch bounce | Playful, physical, friendly | Consumer, kids, food | Finance, luxury | Volume-preserving scale on impact (`sx = 1/sy`) |
| Rigid snap (critically damped) | Precise, engineered, reliable | Enterprise, fintech, dev tools | Playful brands | `osc(dt, w, 1.0)` |

## Camera

| Technique | It says | Build |
|---|---|---|
| Slow push-in | Intimacy, importance, focus | Scale the scene group 1 → 1.06 over the section |
| Pull-out reveal | Context, scale, "it's bigger than you think" | Scale 1.6 → 1 with an expo-out |
| Impact recoil / shake | Weight, power | A damped `kick()` offset on the impact frame |
| Parallax layers | Depth, premium | Translate layers proportionally to depth |
| Tilt / perspective card | Dimensional product | `perspective` + `rotateY` on HTML, or a skew matrix in SVG |

## Product and UI

| Technique | It says | Build |
|---|---|---|
| Device springs in with blur | "It's here" (launch, arrival) | Kit `phone` + `osc` + vertical `vblur` |
| Screen swaps per beat inside a persistent device | Many features, one product | Kit `phone` content per beat; slide content with directional blur |
| Tap ripple / cursor contact | Ease, causality ("one tap") | An expanding ring on the tap point; the next state follows the tap |
| Typed prompt → result | AI that does work for you | Typewriter in an input, then the result springs in |
| Stand-in UI | — | Always generic and labelled, never claiming real features or data the client didn't give |

## Rhythm devices

| Device | It says |
|---|---|
| Half-beat burst | Momentum, climax, abundance. Use once, near the end. |
| Silence or an empty frame | Emphasis. The next thing matters. |
| Callback | Coherence; the viewer feels the film was designed |
| Bookend | Closure, memorability |
| Accelerating cuts | Building excitement towards the payoff |
| Decelerating cuts | Settling, trust, arrival |

---

## Emotion map

Start from the brand's emotional target, then pick the row. Mixed briefs (like "calm brand, fast beats") resolve through a contrast arc: use the opposite emotion as the problem state and the brand emotion as the resolution.

| Target feeling | BPM / pace | Springs and easing | Colour behaviour | Type | Signature techniques | Sound palette |
|---|---|---|---|---|---|---|
| Calm, wellness | 70–95, or 128 at half-time | Soft (`osc w 12–16, z .55–.65`), long holds | 1 signature calm colour + neutrals; few flips | Rounded or humanist, generous size | Breathing scale, liquid, ring type, line draw, silence | Pads, bowls, breath noise, soft plucks |
| Urgent, sport, energy | 120–140 | Snappy (`w 22–28, z .4–.5`), overshoot | Saturated pairs, frequent full-bleed flips | Heavy condensed or grotesk, giant | Slams, flips, recoil, squash, bursts | Kicks, claps, risers, impacts |
| Premium, luxury | 80–100 | Long expo-outs, no overshoot | 2 colours, large dark fields, one metallic or accent | Light serif or thin grotesk, tracked | Occlusion cuts, parallax, slow push-ins, restraint | Sparse piano or strings, low hits |
| Trust, finance, enterprise | 100–118 | Critically damped snaps | Blues or ink, one accent | Neutral grotesk, clear hierarchy | Grids, line draws, match cuts, real counters only | Clean clicks, soft pulses |
| Playful, consumer, kids | 110–130 | Bouncy overshoot (`z .3–.4`) | Bright complementary pairs | Rounded, chunky | Squash/stretch, wobble, stickers, pops | Plucks, boings, claps |
| Tech, AI, dev tools | 120–128 | Snappy with mono precision | Dark base, one electric accent | Grotesk + mono | Typewriter, particles converging, HUD, grid, glitch accents | Digital ticks, synth stabs, risers |
| Food, sensory | 90–110 | Smooth, weighty | Warm, appetising, high saturation | Bold serif or warm grotesk | Macro push-ins, drips and pours (liquid), steam lines | Foley textures: crunch, pour, sizzle |
| Social cause, NGO | 80–100 | Gentle | Restrained, one hopeful accent | Humanist | Accumulation (one → many), line journey, hold on the human truth | Warm pads, a single piano |
