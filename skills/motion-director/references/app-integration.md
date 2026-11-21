# React + Supabase + Claude API integration

This package is a skill, a project contract, and a tested renderer starter. It is not a deployed app, a Supabase migration, or a complete visual timeline editor. No production credentials or paid API calls were used to build it.

## Recommended architecture

```text
React app
  brand kit + brief + parameter edits + Remotion Player preview
       |
Authenticated server / orchestration job
  loads skill/context -> Claude -> validates proposed project
  ElevenLabs -> measured voice audio + alignment -> retimes project
       |
Supabase
  Auth + tenant-owned brand kits/projects/revisions/assets + Storage
       |
Isolated Node/Chromium render worker + queue
  same trusted components/props/assets -> approved revision -> MP4
```

Use Supabase Edge Functions or your backend to authenticate, validate, enqueue work and return job IDs. Run Chromium/video encoding on a suitable worker, such as a container worker, Cloud Run, or a supported Remotion rendering platform. Hosted Edge Function CPU/memory/runtime constraints make them an unsuitable default for a full video-render job. Long Claude/TTS calls should also run as resumable jobs when they exceed the orchestration request budget.

Remotion is the default because it shares React components between preview and render. GSAP can supply frame-seekable timelines where useful. HyperFrames is a separate optional rendering approach, not a dependency secretly required by this package. None of the source MP4s prove which renderer made them.

## Two ways to use the skill through an API

**A. App-managed context and tools — recommended initial integration.** Your server loads the skill, brand/brief policy, saved kit and approved assets. Claude interprets the prompt into typed intent; `resolveBrief()` merges that with the kit, records decisions and reports missing details. Claude then generates project data from this resolved brief; `validateAgainstBrief()` checks it before the renderer/audio tools run. `integration/generate-project.mjs` now enters `generate-branded-project.mjs` for this two-stage route. See [brand-and-brief.md](brand-and-brief.md). A plain API call does not discover a skill just because a folder exists on your machine.

**B. Anthropic-managed custom Skills.** Upload the skill files through the provider's current Skills API, then include the generated custom skill ID/version in a Messages request's `container.skills`. Follow the current code-execution prerequisites, model support, workspace isolation and version format in Anthropic's docs. A managed code-execution container should not be assumed to have Remotion, Chromium, ElevenLabs credentials, or access to your Supabase bucket. Route real rendering/audio jobs through host-owned tools/workers. This package does not include a verified managed-Skills upload or live invocation.

For app-managed context, prompt caching can reuse the stable skill/routing text. Tenant-specific brand kits and assets remain separately scoped. Retrieve relevant sections for each prompt rather than resending all eleven original videos.

The interpretation call receives every compact catalog card plus the brief, available assets and renderer capabilities. The next call receives the selected detail entries, resolved brand and a direction plan. The `.direction.json` sidecar records assumptions, reference roles, exact frame budget and suggested pacing windows. The custom renderer handoff receives this plan too. See [automatic direction](automatic-direction.md) for design catalog extension.

[Reusable execution](reusable-execution.md) is mandatory context for interpretation, project generation and optional production planning, and its full text is retained in a custom handoff. A sparse prompt can express quality through words such as “premium” or “dynamic”; the interpreter chooses concrete subject-appropriate direction rather than requiring technical effect names. It selects an execution profile from the mechanisms needed by that direction, including inferred mechanisms. Mood or subject alone does not force custom routing, and a catalog choice does not prove a matching renderer exists.

The host can include `musicTiming` alongside the existing request fields. For an approved audio asset, provide strictly increasing source timestamps in seconds and probe its duration in frames at the resolved project FPS. The adapter maps the markers to the played span and asks for one music cue at the resulting placement. It validates placement and length in the proposal. Pacing windows guide the cut and can be refined for text, voice and visible impacts.

```json
{
  "musicTiming": {
    "assetId": "approved-track",
    "startSeconds": 0,
    "beatSeconds": [0.12, 0.62, 1.12, 1.62],
    "evidence": "Beat positions measured from the approved track"
  }
}
```

`beatSeconds` in this example are illustrative. Use actual markers from the selected track. A requested BPM on its own becomes `targetBpm` in the plan. Without track measurements, the timing mode is provisional. The adapter does not extract beat markers or render videos.

## Brand kit contract

Start from `examples/brand-kit.json`:

- Brand name; light/dark/transparent logo asset IDs and their preferred backgrounds.
- Primary/secondary/surface/text/background/muted colors, including usable contrast pairs.
- Font family, actual uploaded font asset IDs/weights, corner radius and preferred density.
- Tone, language, forbidden claims, approved claims, CTA and website.
- Authorized ElevenLabs voice ID and pronunciation preferences when configured.
- Approved image/video/music/SFX asset IDs and immutable versions/hashes.

The renderer's `brand` object is the resolved visual subset of the richer app kit. Keep source kit revision and user overrides in the app's revision metadata. Do not store API secrets in a brand kit. For a missing logo the starter can use a geometric stand-in and brand name, clearly identified in the preview plan.

## Generate endpoint

Suggested request to your own server:

```json
{
  "projectId": "server-owned-id",
  "prompt": "A clean product launch with punchy type and an analytics payoff",
  "brandKitRevision": 3,
  "format": "landscape",
  "durationSeconds": 15,
  "narration": true
}
```

The server derives owner/tenant from authenticated identity, loads the actual kit and asset manifest, and makes the Claude request. Never trust a browser-provided owner ID, asset URL, “approved” flag, or arbitrary JavaScript component. Default app mode only accepts registered scene kinds. The supplied proposal script reads a fully resolved local request JSON for development; wire equivalent server-side loads in your app.

A one-line brief is sufficient when the host can supply the real brand context and approved assets. The local development request still requires `prompt`, `brandKit` and `assetManifest`; the adapter does not retrieve a company's kit, inspect photo contents or manufacture approved assets from a name. Load those server-side before invoking it. Inferred wording and staging remain reversible assumptions, not new approved claims.

Translate explicit UI edits to `formOverrides` (for example `format: "portrait"`, `durationSeconds: 15`). Pass only touched controls; the adapter no longer interprets an arbitrary legacy `canvas` request as authority. Store/load `previousBrief` and `currentProject` server-side on revisions. A user-requested latest-kit update sets `rebaseBrandKit: true`. Saved versioned kit locks are distinct from live host authorization, which the server must enforce on every request.

Validate the returned data with JSON Schema and `validateProject`. Reject malformed/truncated responses, unsupported scene kinds, unresolved assets and timing gaps. A forced tool call can help supported models, but model compatibility differs; the sample defaults to `auto`, requests one `propose_project` call, and rejects responses without exactly one. Configure another tool-choice mode only for a model supporting it. Use bounded repair attempts that return validation errors to Claude without granting new authority or executing model-supplied code.

For standard projects, the development request's optional `productionPlan: true` enables a third `propose_production_plan` call. The server loads [production direction](production-direction.md), checks the separate [plan schema](../schemas/production-plan.schema.json), then runs `validatePlanForProject()`. This binds stable scene IDs, revision/FPS and the complete resolved audio cue set to the actual editable project. A changed cue schedule is rejected, not silently applied. Sidecars are `.plan.json`, `.plan-report.json` and an escaped text `.storyboard.html`; they contain no rendered imagery. Plan failure fails the generation job even though the validated project may already have been saved. Publish job outputs atomically in your app after all requested stages succeed. Advanced custom-renderer routes still stop for implementation rather than running this standard-plan stage.

For a custom profile, the JSON-only adapter retains `status: "needs_custom_renderer"` and exit code 3, and writes `.route.json` with the same explicit `phase`. It includes the selected reference details, relevant recipe text, reusable execution policy, candidate example paths and their current availability, requested canvas and an implementation/review workflow. `implementationReady: false` and `workerRequired: true` distinguish the handoff from a playable project. Source examples, including [FRAME / STUDIO](../examples/frame-photo-studio/README.md) and [event-stage](../examples/event-stage/README.md), require inspection, adaptation and testing; an available directory is not proof of the requested capability.

An agent following the skill continues from that handoff: complete the shot/action plan, implement and register the custom source/configuration in an isolated workspace, validate timing and assets, use a host-owned worker for actual captures and a playable preview, then critique and repair the result against the selected direction. Bind review evidence to the current source/assets/revision and state any unavailable checks. This proposal script performs none of those execution stages and never runs generated code. A plain JSON-only integration needs an implemented trusted worker or a capable agent for that continuation; successful proposal validation is not reference-quality output. Existing approval/export rules still apply.

When retiming in your host, call the pure `resolveCueTiming()` helper from shared event constants, explicitly assign intended cues to a new draft revision, then run `validateProject()`, brief checks and `validatePlanForProject()`. Local event frames must also change when local choreography changes. `buildReviewFrames()` supplies requested capture indices; your trusted renderer/review system must actually capture and inspect them. `inspectAssetResolution()` requires host-probed metadata tied to immutable asset bytes and checks only declared usages. Neither plan JSON nor model-reported dimensions establish media authenticity or visual quality. No additional paid provider calls, render jobs or audio mixing occur in the local plan CLI.

Use `reviewSync()` when the host has a source marker for a named visual event, such as the kick inside a music bed or the transient inside a shutter cue. Pass the validated plan and project plus [sync review data](../schemas/sync-review.schema.json) for that revision and FPS. You can also provide the frame observed in the preview. [Choreography and synchronization](choreography-and-sync.md) explains timing, signed offsets and how to run the local check.

Model ID is a server setting. Use a high-capability model available to your account for complex first drafts and custom component work; evaluate latency/quality on your own prompts. The example does not invent a universal “best model.”

## Editable preview

Use `integration/EditablePreview.tsx` as a small example: the Player receives the same `Video` component and project data used by export; controls change data and produce a new draft revision. It demonstrates headline/color controls, not a finished editor. Build app controls for scene text, assets, timing, sound gains and brand overrides as needed.

Validation is necessary but does not detect every text overflow. Measure actual brand fonts at layout time, preview long copy and every supported aspect ratio, and adjust font size/line wrapping or scene duration. Scene reorder/trim changes require recomputing all starts and cue/voice timing. Keep original stable scene IDs and diff edits in data.

The starter uses landscape, portrait, and square design coordinate systems with full-frame backgrounds. Complex references still need composition-specific responsive layouts; scaling a card gallery is not equivalent to redesigning a dense dashboard for a phone.

## Revision, approval, and jobs

Recommended server-owned records (adapt to your app, not an applied migration):

| Record | Minimum useful fields |
| --- | --- |
| brand_kits | owner/tenant, kit JSON, revision |
| video_projects | owner/tenant, current revision ID, status |
| video_revisions | project ID, immutable project JSON, manifest hash, source/bundle hash, asset versions, parent revision |
| video_assets | owner/tenant, storage object key, media type, content hash, measured duration/dimensions, provenance |
| video_approvals | authenticated approver, exact revision/hash, preview render ID, approved timestamp |
| render_jobs | project/revision/hash, queue status, idempotency key, worker version, progress, output object key, error code |

Suggested state progression: `draft -> preparing_audio -> preview_ready -> approved -> rendering -> complete`. If no narration is requested, skip preparing audio. Any material edit creates a new draft and invalidates that revision's approval. Old approved revisions remain auditable; they do not approve the newly edited project.

`POST /projects/:id/approve` must verify ownership, the previewed revision/hash and resolved assets, then persist the approval. “No changes” can map to this action when it clearly refers to the displayed preview. `POST /projects/:id/render` verifies this approval server-side and enqueues the exact immutable revision. Never delegate authorization to Claude or a JSON field. The starter CLI revision flag is a local guardrail, not an authentication mechanism.

Use an idempotency key such as `revisionHash + renderPreset + workerVersion` to avoid duplicate paid jobs. Retrying the same job should not regenerate speech or choose new random assets. Enforce app-specific budget and concurrency limits in the queue.

## Storage and assets

Enable tenant/owner policies for tables and Storage objects. Use Supabase service-role credentials only on trusted servers. Store persistent object keys and hashes, not expired signed URLs. Resolve temporary preview URLs at read time; stage worker inputs locally before rendering. The starter CLI accepts local staged paths only and checks their existence.

Only download assets associated with the authenticated project. Validate URL origins, redirects, content type and size server-side. Do not permit a user/model URL to fetch internal addresses from your worker. Font/image/video decoders should run in the isolated worker context. These constraints are part of accepting user-provided media in a published app.

Preview and final export should use the same source hash, dependency lockfile, fonts and resolved asset bytes. Every render report should record those versions alongside output duration, dimensions, FPS, audio streams and final revision.

## What still needs app implementation

Authentication/tenant policies; persistence and job queue; API model/voice configuration; brand-kit UI and fuller editing controls; production audio mixing/caption components; custom advanced effect registration; authenticated approval/export endpoints; hosting and licensing setup. The reference package provides contracts and working local building blocks for these tasks, not a claim that they are already connected to your app.

## Documentation checked 2026-11-17

- [Anthropic custom Skills through the API](https://platform.claude.com/docs/en/build-with-claude/skills-guide)
- [Claude Messages/tool schema](https://platform.claude.com/docs/en/api/messages/create)
- [Remotion Player](https://www.remotion.dev/docs/player)
- [Remotion renderMedia](https://www.remotion.dev/docs/renderer/render-media)
- [Remotion/GSAP frame seeking](https://www.remotion.dev/docs/gsap)
- [ElevenLabs speech with timestamps](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)
- [Supabase Edge Function limits](https://supabase.com/docs/guides/functions/limits)
- [Remotion license/pricing](https://www.remotion.dev/docs/license/pricing)
- [HyperFrames documentation](https://hyperframes.heygen.com/)

Confirm current API/model support and the applicable Remotion license before publishing a video-creation app. The package pins the renderer version it was tested with; it does not pin external service behavior indefinitely.
