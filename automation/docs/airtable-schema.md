# Airtable schema: table `Reels`

| Field | Type | Notes |
|---|---|---|
| ReelKey | Single line text | Unique key `ig_<shortCode>`; the dedupe key |
| ReelURL | URL | Normalized reel URL |
| Status | Single select | SUBMITTED, EXTRACTING, CONTENT_GENERATED, AWAITING_APPROVAL, APPROVED, REJECTED, VIDEO_GENERATING, VIDEO_COMPLETED, READY_TO_PUBLISH, PUBLISHING, PUBLISHED, FAILED |
| SourceCaption, SourceTranscript | Long text | Scraped source |
| TranscriptSource | Single select | apify, stt, none |
| SourceDuration | Number | Seconds |
| SourceOwner | Single line text | |
| AudioURL | URL | Used for the STT fallback |
| ExtractionDone | Checkbox | Gate for the content stage |
| Script, Caption, Overlay, Hashtags | Long text | Generated, human-reviewable |
| ContentAttempts | Number | |
| ApprovedBy, RejectedReason | Single line text | |
| ApprovedAt | Date with time | |
| HeyGenVideoId | Single line text | Stored before polling, so jobs are never duplicated; cleared only after a terminal job failure |
| VideoDuration | Number | Seconds |
| VideoURL, ThumbnailURL | URL | From HeyGen on completion (expiry unverified) |
| VideoAttempt | Number | 1-based; part of the HeyGen `Idempotency-Key`; incremented after a terminal job failure |
| PollAttempts | Number | Heartbeat while polling |
| HeyGenStatus | Single line text | Last status reported by HeyGen |
| VideoSubmittedAt, VideoCompletedAt | Date with time | |
| ApprovedFingerprint | Single line text | Hash of the approved script, caption, overlay and hashtags |
| RegenerationNote | Long text | Reviewer guidance for the next generation |
| RegenerationCount | Number | Capped by `MAX_REGENERATIONS` |
| LastAction, LastActionBy | Single line text | Last approval action and its (self-asserted) actor |
| LastActionAt | Date with time | |
| PublishAdapter | Single select | mock, blotato, meta (`meta` is not implemented), postiz |
| PostSubmissionId, ContainerId, PublishedURL | Single line text | `PostSubmissionId` is the Blotato submission id; `PublishedURL` is the public Instagram URL from the final status |
| BlotatoMediaURL | URL | Blotato-hosted media returned by `POST /v2/media`; reused on retries so the video is not uploaded twice |
| PublishIntentAt | Date with time | Written before the create-post call. An intent without a `PostSubmissionId` means the outcome is unknown and publishing stops for a human |
| PublishStatus | Single line text | creating, in-progress, published, failed, not_created, unknown, timeout, fatal (last status seen) |
| PublishPollAttempts | Number | Heartbeat while polling Blotato; reset when a poll timeout is recorded |
| PublishedAt | Date with time | Set when Blotato reports `published` |
| RetryCount | Number | |
| FailedFromState | Single select | Same options as Status |
| ErrorLog | Long text | Redacted, capped at 8000 characters |
| LockedBy, LockedAt | Text, Date with time | Optimistic claim: write, re-read, compare |
| SubmittedBy | Single line text | |
| SourceType | Single select | `reel` (URL pipeline) or `upload` (finished video). Empty is treated as `reel` |
| Niche, BrandVoice | Single line text | Optional choices made at submission; fed into the content prompt |
| BrandVoiceNotes | Long text | Optional free-text guidance for the content prompt |
| AvatarID, VoiceID | Single line text | Optional HeyGen choices for this reel; the environment defaults are used when empty |
| UploadFileName | Single line text | Uploads only (sanitised original name) |
| UploadSizeBytes | Number | Uploads only |
| UploadSha256 | Single line text | Uploads only; part of the dedupe key `up_<first 16 hex>` stored in `ReelKey` |
| CreatedTime, ModifiedTime | Created time, Last modified time | Computed by Airtable |

Transitions are defined in `automation/lib/core.js` (`TRANSITIONS`).
