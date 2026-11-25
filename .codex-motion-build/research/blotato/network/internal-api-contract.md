# Internal dashboard API contract (static extraction)

Source: chunk `6332-6ea21540daee7d92.js` served on the logged-out `/login` page of https://my.blotato.com.
Extraction: static string parse of exported bundle (no execution, no requests sent). Tool: `tools/extract-contract.cjs`.
Client wiring (CONFIRMED in bundle): `fetch("https://backend.blotato.com" + "/v2" + path, { mode: "cors", credentials: "include" })` - cookie-session auth for the dashboard.
Public API (DOCUMENTED, https://backend.blotato.com/openapi.json, OpenAPI 3.0.3, "Blotato API" 2.0.0): header `blotato-api-key`.

Confidence: entries are CONFIRMED as present in shipped client code. Server reachability, permissions and request/response behavior are UNVERIFIED (no authenticated traffic observed).

Totals: 133 contract endpoints in bundle; 46 also in public OpenAPI; 87 internal-only. Public OpenAPI has 46 operations.

| Method | Path (prefix /v2) | Contract key | Tags | Public OpenAPI? |
|---|---|---|---|---|
| DELETE | `/accounts` | `remove` |  | **internal-only** |
| GET | `/accounts` | `list` |  | **internal-only** |
| DELETE | `/accounts/subaccounts` | `remove` |  | **internal-only** |
| GET | `/admin/quicklinks/:userId/api-logs` | `apiLogs` |  | **internal-only** |
| POST | `/admin/quicklinks/duplicate-video` | `duplicateVideo` |  | **internal-only** |
| GET | `/analytics` | `list` | analytics | yes |
| GET | `/analytics/platforms` | `listByPlatform` | analytics | yes |
| GET | `/analytics/summary` | `summary` | analytics | yes |
| GET | `/api-requests` | `list` |  | **internal-only** |
| GET | `/api-requests/:id` | `find` |  | **internal-only** |
| POST | `/api-requests/retry` | `retry` |  | **internal-only** |
| GET | `/api-requests/stats` | `stats` |  | **internal-only** |
| POST | `/auth/signup` | `signup` |  | **internal-only** |
| GET | `/automation-accounts` | `list` |  | **internal-only** |
| POST | `/automation-accounts` | `create` |  | **internal-only** |
| DELETE | `/automation-accounts/:accountId` | `delete` |  | **internal-only** |
| GET | `/brands` | `list` |  | **internal-only** |
| POST | `/brands` | `create` |  | **internal-only** |
| DELETE | `/brands/:brandId` | `delete` |  | **internal-only** |
| PATCH | `/brands/:brandId` | `update` |  | **internal-only** |
| GET | `/comments` | `listComments` | comments | yes |
| POST | `/comments` | `postComment` | comments | yes |
| GET | `/comments/:commentId` | `getComment` | comments | yes |
| GET | `/conversations` | `listConversations` | messaging | yes |
| GET | `/conversations/:conversationId` | `getConversation` | messaging | yes |
| GET | `/credits` | `get` | billing | yes |
| POST | `/credits` | `purchase` | billing | yes |
| GET | `/dm-automations` | `list` | automations | yes |
| POST | `/dm-automations` | `create` | automations | yes |
| PATCH | `/dm-automations/:flowId/triggers/:triggerId` | `updateTrigger` | automations | yes |
| DELETE | `/dm-automations/:id` | `delete` | automations | yes |
| GET | `/dm-automations/:id` | `find` | automations | yes |
| PATCH | `/dm-automations/:id` | `update` | automations | yes |
| GET | `/dm-automations/:id/analytics` | `findAnalytics` | automations | yes |
| GET | `/dm-automations/:id/logs` | `listFlowLogs` | automations | yes |
| GET | `/dm-automations/:id/runs` | `listRuns` | automations | yes |
| GET | `/failed-posts` | `list` |  | **internal-only** |
| DELETE | `/failed-posts/:id` | `remove` |  | **internal-only** |
| GET | `/failed-posts/:id` | `find` |  | **internal-only** |
| POST | `/generations/images` | `generate` |  | **internal-only** |
| GET | `/inbox/chats` | `listChats` |  | **internal-only** |
| GET | `/inbox/chats/:chatId/items` | `getChatItems` |  | **internal-only** |
| GET | `/integrations/oauth2/linkedin/pages` | `listPages` | accounts | yes |
| PUT | `/integrations/oauth2/linkedin/pages` | `setPages` |  | **internal-only** |
| GET | `/labs/viral-coach` | `list` |  | **internal-only** |
| GET | `/labs/viral-coach/:id` | `get` |  | **internal-only** |
| POST | `/labs/viral-coach/analyze` | `analyze` |  | **internal-only** |
| GET | `/me/preferences` | `list` |  | **internal-only** |
| PATCH | `/me/preferences` | `update` |  | **internal-only** |
| POST | `/media` | `create` | publishing | yes |
| POST | `/media/uploads` | `createPresignedUrl` | publishing | yes |
| GET | `/messages` | `listMessages` | messaging | yes |
| POST | `/messages` | `sendMessage` | messaging | yes |
| GET | `/messages/:messageId` | `getMessage` | messaging | yes |
| DELETE | `/post-drafts` | `removeAll` |  | **internal-only** |
| GET | `/post-drafts` | `list` |  | **internal-only** |
| POST | `/post-drafts` | `create` |  | **internal-only** |
| DELETE | `/post-drafts/:id` | `remove` |  | **internal-only** |
| POST | `/post-drafts/:postDraftId/parts` | `create` |  | **internal-only** |
| POST | `/post-drafts/clone` | `clone` |  | **internal-only** |
| DELETE | `/post-drafts/parts/:partId` | `remove` |  | **internal-only** |
| POST | `/post-drafts/parts/:partId/media/image-gen` | `imageGen` |  | **internal-only** |
| POST | `/post-drafts/parts/:partId/media/upload` | `upload` |  | **internal-only** |
| DELETE | `/post-drafts/parts/media/:id` | `remove` |  | **internal-only** |
| POST | `/post-drafts/parts/variations/:id` | `update` |  | **internal-only** |
| GET | `/posts` | `list` | publishing | yes |
| POST | `/posts` | `create` |  | yes |
| GET | `/posts/:id/analytics` | `findAnalytics` | analytics | yes |
| GET | `/posts/:postSubmissionId` | `findBySubmissionId` | publishing | yes |
| GET | `/prompts` | `list` |  | **internal-only** |
| POST | `/prompts` | `create` |  | **internal-only** |
| DELETE | `/prompts/:id` | `remove` |  | **internal-only** |
| GET | `/prompts/:id` | `find` |  | **internal-only** |
| PATCH | `/prompts/:id` | `update` |  | **internal-only** |
| POST | `/prompts/clone` | `clone` |  | **internal-only** |
| GET | `/published-posts` | `search` | publishing | yes |
| GET | `/published-posts/:id` | `find` | publishing | yes |
| GET | `/remix-agent/state` | `getState` |  | **internal-only** |
| GET | `/schedule/slots` | `list` |  | **internal-only** |
| POST | `/schedule/slots` | `create` |  | **internal-only** |
| PATCH | `/schedule/slots/:id` | `update` |  | **internal-only** |
| POST | `/schedule/slots/next-available` | `findNextAvailable` |  | **internal-only** |
| DELETE | `/schedules` | `bulkRemove` |  | **internal-only** |
| GET | `/schedules` | `list` | publishing | yes |
| DELETE | `/schedules/:id` | `remove` | publishing | yes |
| GET | `/schedules/:id` | `find` | publishing | yes |
| PATCH | `/schedules/:id` | `update` | publishing | yes |
| DELETE | `/schedules/slots/:id` | `remove` |  | **internal-only** |
| POST | `/scripts` | `create` |  | **internal-only** |
| GET | `/social/pinterest/boards` | `listBoards` | accounts | yes |
| POST | `/source-resolutions-v2` | `create` |  | **internal-only** |
| POST | `/source-resolutions-v3` | `create` | publishing | yes |
| GET | `/source-resolutions-v3/:id` | `find` | publishing | yes |
| GET | `/sources` | `list` |  | **internal-only** |
| POST | `/sources` | `create` |  | **internal-only** |
| DELETE | `/sources/:id` | `remove` |  | **internal-only** |
| GET | `/sources/:id` | `find` |  | **internal-only** |
| PATCH | `/sources/:id` | `update` |  | **internal-only** |
| POST | `/sources/search` | `search` |  | **internal-only** |
| PATCH | `/subscriptions` | `update` |  | **internal-only** |
| POST | `/subscriptions` | `create` |  | **internal-only** |
| POST | `/superadmin/:userId/impersonations` | `create` |  | **internal-only** |
| GET | `/users/me` | `me` | accounts | yes |
| GET | `/users/me/accounts` | `meAccounts` | accounts | yes |
| GET | `/users/me/accounts/:accountId/subaccounts` | `meSubaccounts` | accounts | yes |
| POST | `/users/me/api-keys` | `meApiKeysCreate` |  | **internal-only** |
| GET | `/users/me/api-setup` | `meApiSetup` |  | **internal-only** |
| PUT | `/users/me/api-setup/account` | `meApiSetupAccountUpdate` |  | **internal-only** |
| POST | `/users/me/api-setup/complete` | `meApiSetupComplete` |  | **internal-only** |
| POST | `/users/me/api-setup/skip` | `meApiSetupSkip` |  | **internal-only** |
| POST | `/users/me/api-setup/start` | `meApiSetupStart` |  | **internal-only** |
| PUT | `/users/me/api-setup/tool` | `meApiSetupToolUpdate` |  | **internal-only** |
| PATCH | `/users/me/email` | `meUpdateEmail` |  | **internal-only** |
| POST | `/users/me/email-change/confirm` | `meConfirmEmailChange` |  | **internal-only** |
| POST | `/users/me/onboard-remix` | `meOnboardRemix` |  | **internal-only** |
| POST | `/users/me/onboarding-api-update` | `meApiOnboardingUpdate` |  | **internal-only** |
| POST | `/users/me/skip-onboarding-api` | `meSkipOnboardingApi` |  | **internal-only** |
| POST | `/users/me/skip-onboarding-generation` | `meSkipOnboardingGeneration` |  | **internal-only** |
| GET | `/users/me/usage` | `meUsage` | accounts | yes |
| GET | `/videos-v2` | `list` |  | **internal-only** |
| POST | `/videos-v2` | `create` |  | **internal-only** |
| GET | `/videos-v2/:id` | `find` |  | **internal-only** |
| PATCH | `/videos-v2/:id` | `update` |  | **internal-only** |
| POST | `/videos-v2/:id/media` | `createMedia` |  | **internal-only** |
| POST | `/videos-v2/:id/renders` | `render` |  | **internal-only** |
| GET | `/videos-v2/templates` | `searchTemplates` |  | **internal-only** |
| DELETE | `/videos/:id` | `remove` | video | yes |
| GET | `/videos/captions/voices` | `getCaptionVoices` |  | **internal-only** |
| POST | `/videos/creations` | `templateCreate` |  | **internal-only** |
| GET | `/videos/creations/:id` | `templateFind` | video | yes |
| POST | `/videos/from-templates` | `templateCreateV2` | video | yes |
| GET | `/videos/templates` | `templateListV2` | video | yes |
| POST | `/viral-posts` | `search` |  | **internal-only** |

## Public OpenAPI operations not found in the login-shell contract

- none
