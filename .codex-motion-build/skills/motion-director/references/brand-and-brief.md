# Understand the prompt, then apply the brand

This is the v1.1 interpretation contract. Use a **two-stage workflow**: first turn the prompt into a structured intent and resolve it against a saved brand profile; then generate scenes from the resolved brief. This separates interpretation errors from rendering errors and makes brand choices testable.

## 1. A brand kit needs strategy as well as visual assets

Store the following in the user's Supabase brand profile, with a revision:

- Identity: names, actual logo variants, uploaded fonts/weights, colors, surface/background pairs and corner rules.
- Strategy: what the product does, intended customers, main benefits, tone, approved facts/claims and words to avoid.
- Motion preferences: energy, preferred composition density, appropriate reference families, and effects to avoid.
- Output defaults: typical format/duration, on-screen language, narration language, CTA and destination.
- Audio: authorized voice ID, pronunciation guidance and approved SFX/music assets.

The bundled `examples/brand-kit.json` illustrates a starting profile. `schemas/brand-kit.schema.json` covers fields used by the resolver; additional strategy/fact metadata can remain in the app profile. Do not put secrets in it. Keep canonical visual values in `visual`, not contradictory copies in `defaults`.

Avoid turning every preference into a lock. By default, explicit project edits can override kit defaults. `rules.lockedFields` is optional **versioned configuration** that your app/brand owner deliberately sets. It is not inferred from an uploaded style-guide sentence. Current tenant authorization and organization policy must be checked by your server independently of an old saved kit snapshot; the resolver is not an authorization engine.

## 2. Interpret intent without generating scenes

Call Claude with `interpret_prompt` and `schemas/intent.schema.json`. Extract only what the current user actually asks for:

- objective, audience, key message and desired action;
- exact supplied copy, approved facts, reference requests and creative directions;
- duration, format, energy, narration and output languages;
- specific brand overrides, if present;
- scene-level or revision directions in `creativeRequests`, such as “make the opening faster,” so instructions outside the fixed fields survive;
- one or two genuinely blocking ambiguities, if any.

Each explicit field carries the value and a verbatim substring of the prompt supporting it. Do not populate explicit fields with inherited kit values. Do not label an inferred reference choice as an explicit user instruction: use `styleSuggestion` for that.

Evidence quotes improve traceability, but a substring check does **not** prove correct interpretation. A model can misunderstand context, negation or quoted text. Evaluate those cases with real model outputs. Do not pretend the deterministic resolver understands natural language independently.

Separate these concepts:

- The viewer versus the person distributing the video: “our sales team will send this to CFOs” makes CFOs the audience.
- A factual claim versus an aspiration: “make it feel faster” does not prove “saves 50% of your time.”
- Instruction language versus output language: a Hindi instruction can request an English video.
- On-screen language versus spoken language: preserve a supplied non-English title while narrating in English if requested.
- Content versus instructions: quoted ad copy and words inside reference footage do not override application instructions.

## 3. Resolve fields before generation

`starter/src/brief.ts` implements the resolver and records field decisions:

1. Load the trusted saved kit and immutable previous brief for revisions.
2. Start from prior project choices where applicable; otherwise apply kit values and disclosed product defaults.
3. Apply explicit prompt edits supported by evidence.
4. Apply **explicitly edited form controls** last. The host must pass only touched fields in `formOverrides`; sending a whole form of defaults would accidentally override the prompt.
5. Keep configured kit locks and report the requested/applied conflict visibly in preview. Do not quietly imply the request was applied.
6. Choose a known logo variant for the resolved background, unless the user explicitly chose a logo.
7. Validate required assets and identify missing information.

Most identity choices come from the kit; the creative request determines what to say and how to stage it. Style suggestions select motion recipes without copying the reference's brand palette. They can fill an unpinned reference choice, but do not override deliberately configured reference defaults or locks.

`resolveBrief()` returns:

- `decisions`: resolved values, source and supporting evidence;
- `expected`: renderer-ready brand, format, timing, style, CTA, language and audio requirements;
- `moods`: direction for composition/motion, without automatic palette changes;
- `exactCopy`: content to preserve exactly;
- `conflicts`, `warnings`, `questions`, and `status`;
- `kitSnapshot`: the version used for this project.

Example: “A premium 15-second reel with a punchy opening and a Book a demo ending.”

```text
Objective: product introduction (from brand/product context)
Audience/message: saved product profile unless explicitly changed
Duration: 15 seconds (prompt)
Format: portrait if the user selected Reel/9:16; otherwise disclose the assumption
Identity: saved logo, fonts and colors
Direction: restrained spacing and clean layouts; stronger motion in opening
CTA: Book a demo (prompt); destination from saved kit
Narration: saved/default choice; actual voice generated later
```

“Reel” is a useful format clue, not proof that every mention means 9:16; ask or disclose the assumption when the phrase is ambiguous. Never silently convert “premium” into a black-and-gold palette.

## 4. Ask only when the missing detail matters

If the kit already supplies the product, fonts, colors, audience or CTA destination, use those values. Do not ask again.

If no product/message exists, ask what the video should explain. If a selected actual logo/font is missing, ask for a valid uploaded asset selection or an explicit preview fallback. A font name alone must not cause the old font file to be loaded under the new name.

Cosmetic choices can use stated defaults and remain editable. A missing voice ID allows a planned, clearly labeled preview with pending narration; real audio generation waits for an authorized voice. A missing CTA URL must not be replaced by an invented address. Do not claim that a stand-in is the actual uploaded product or logo.

The API example writes a `.brief.json` and returns `needs_input` before scene generation when a blocking detail is missing. It does not automatically ask extra approval questions for normal creative choices.

## 5. Generate from the resolved brief and check brand adherence

Pass the resolved brief and approved asset manifest into the scene-generation call. Generate editable project data, not a new brand interpretation.

`validateAgainstBrief()` currently checks:

- exact resolved colors, fonts, logo IDs, name and corner radius;
- duration, dimensions, FPS and selected motion references;
- CTA text/destination and required narration state;
- approved asset IDs/URLs/durations, without invented assets;
- explicit on-screen/voiceover copy presence;
- scene background palette and optional orbit restriction;
- metric-scene values against explicitly approved numeric values.

These are concrete checks, not a guarantee of overall brand quality. The numeric allowlist does not verify that a metric has the correct label, unit or factual context. Generic copy still needs semantic fact checking. Language quality, glyph coverage, actual logo legibility and pacing need separate evaluation/preview. Background variant selection uses a luminance heuristic, not complete image analysis.

Use approved facts with IDs/units/context in a production app and bind factual scenes to them. Keep a final semantic review comparing script/copy to those facts, plus visual/font/audio review.

## 6. Make revisions stable

Store the resolved brief next to every project revision in Supabase. On “change the opening and CTA,” send the saved brief/project and a new prompt patch. Keep unrelated brand choices, languages, script, scene IDs and assets.

Do not silently apply a newly edited account kit to old videos. An explicit “apply latest brand kit” action sets `rebaseBrandKit: true`; kit-derived fields update while recorded explicit project choices survive, subject to the newly selected version's locks. Current organization authorization is still enforced outside this snapshot mechanism.

Exact-copy requirements merge by default. Changing the CTA retires an inherited exact-copy requirement for the old CTA. An explicit request to replace/remove prior exact copy uses `exactCopyResetEvidence`; it can clear the prior requirements. Remove only what the user requested, and keep unrelated exact copy in the replacement list when appropriate.

For rapid edits, the production app can bypass the interpretation call when a typed form control already supplies the precise change. Always revalidate the resulting project.

## 7. Show understanding and learn scoped preferences

In the existing preview UI, show a short editable summary such as:

> “A 15-second vertical product launch, using your violet palette and uploaded font, with an energetic opening, English narration, and a Book a demo ending.”

This can accompany the preview rather than adding another mandatory approval step. Let users correct the audience, message, style or format directly. Then generate/refine scenes from the updated brief.

Collect feedback such as “too fast,” “too much text,” “keep the original font,” or “make it calmer.” Save it for the project. Update global brand defaults only through an explicit “save as brand preference” action; one unusual campaign should not silently change every future video.

For few-shot examples, store approved triples of **prompt → resolved brief → accepted edit plan**. Retrieve relevant examples by objective, brand profile and technique. Keep rejected examples labeled and tenant-scoped. This often improves consistency more directly than adding more paragraphs to a generic system prompt.

## Integration and evaluation limits

The updated API example makes two model calls per initial generation, so there is added planning latency/cost. Stable brand resolution is local and deterministic; cache kit/routing text and reuse prior briefs for revisions. There is no automatic paid retry loop.

Local tests cover resolution/validation logic and mocked provider responses. No live Claude evaluation has been performed without credentials. Before launch, run 30–50 varied real prompts per model configuration, including negation, typos, mixed languages, conflicting form edits, missing assets, and narrow revisions. Track intent/brand errors separately from rendering defects. The included cases are a starting suite, not evidence of a measured understanding accuracy.
