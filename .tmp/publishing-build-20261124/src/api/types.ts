export type ReelStatus =
  | 'SUBMITTED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'VIDEO_COMPLETED'
  | 'PUBLISHED'
  | 'FAILED'
  | 'REJECTED'
  | string;

export interface Summary {
  totals: {
    submitted: number;
    awaitingApproval: number;
    generating: number;
    readyToPublish: number;
    published: number;
    failed: number;
    rejected: number;
  };
  stuck?: number;
  recent: { id: string; title?: string; sourceType?: string; status: ReelStatus; at?: string; error?: string }[];
  truncated?: boolean;
  fetchedAt?: string;
}

export interface ReelRow {
  key?: string;
  id: string;
  title?: string;
  status: ReelStatus;
  sourceType?: 'reel' | 'upload' | string;
  reelUrl?: string;
  niche?: string;
  brandVoice?: string;
  createdAt?: string;
  updatedAt?: string;
  error?: string | { at?: string; source?: string; stage?: string; message?: string; code?: string } | null;
  busy?: boolean;
  stuck?: boolean;
  retryable?: boolean;
  publishedUrl?: string;
}

export interface ReelList {
  items: ReelRow[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  counts?: Record<string, number>;
  truncated?: boolean;
}

export interface ActionState {
  allowed: boolean;
  reason?: string;
}

export interface ReelDetail extends ReelRow {
  fingerprint: string;
  source?: { caption?: string; transcript?: string; owner?: string; duration?: number };
  content?: { script?: string; caption?: string; overlay?: string; hashtags?: string[]; visual_prompt?: string };
  video?: { status?: string; url?: string; previewUrl?: string; thumbnailUrl?: string; duration?: number };
  publish?: { status?: string; publishedUrl?: string; publishedAt?: string };
  approval?: { regenerations?: number; maxRegenerations?: number };
  errors?: (string | { at?: string; stage?: string; message?: string; code?: string })[];
  progress?: { key: string; label: string; state: 'done' | 'active' | 'waiting' | 'failed' | 'rejected' | 'pending' }[];
  actions?: Record<'edit' | 'approve' | 'reject' | 'regenerate' | 'publish' | 'retry' | 'resume', ActionState>;
}

export interface Integration {
  status: 'connected' | 'error' | 'unconfigured' | string;
  code?: string;
  message?: string;
  missing?: string[];
  account?: { username?: string; name?: string; id?: string };
}

export interface SettingsData {
  workflows?: { ok?: boolean; error?: string; message?: string; integrations?: Record<string, Integration> };
  backend?: Record<string, unknown>;
}

export interface Options {
  avatars: { id: string; name?: string; previewImageUrl?: string }[];
  voices: { id: string; name?: string; language?: string }[];
  hasMoreAvatars?: boolean;
  hasMoreVoices?: boolean;
  warnings?: string[];
  presets?: { niches?: (string | { value: string })[]; brandVoices?: (string | { value: string })[] };
}

export interface UploadInfo {
  uploadId: string;
  fileName: string;
  sizeBytes: number;
  durationSeconds: number;
  mimeType: string;
  previewUrl?: string;
  diskPath?: string;
}

/* ------------------------------------------------ Storyboard & Video Engine */

export interface Scene {
  scene_number: number;
  type: string;
  timestamp_output: string;
  source_range: string;
  duration: number;
  action: string;
  framing: string;
  camera_motion: string;
  caption: string;
  caption_style: string;
  sound_effect?: string;
}

export interface StoryboardData {
  id?: string;
  title: string;
  duration: {
    original_seconds: number;
    output_seconds: number;
    removed_seconds: number;
    reduction_percent: number;
  };
  scenes_count: number;
  scenes: Scene[];
  sound_design: {
    ducking_enabled: boolean;
    target_lufs: number;
  };
  growth_signals?: {
    three_second_hook?: string;
    sendability_score?: string;
    series_readiness?: string;
  };
  scorecard: {
    status: string;
    score: number;
    failed_checks: string[];
    warnings: string[];
  };
  latest_render?: {
    render_id: string;
    video_url: string;
    duration: number;
    resolution: string;
    backend: string;
  };
}

/* ------------------------------------------------ Series Engine */

export interface EpisodePlan {
  episode_number: number;
  title: string;
  hook: string;
  learning: string;
  payoff: string;
  open_loop: string;
  cta: string;
  duration_target_seconds: number;
  status: 'planned' | 'drafted' | 'ready' | 'published';
}

export interface SeriesPlan {
  id: string;
  title: string;
  target_audience: string;
  core_topic: string;
  episodes_count: number;
  visual_style: string;
  episodes: EpisodePlan[];
  created_at: string;
}

/* ------------------------------------------------ Content Intelligence */

export interface ScorecardCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail' | 'skipped';
  score: number | null;
  value: any;
  detail: string;
}

export interface ScorecardReport {
  video: string;
  source_duration: number;
  output_duration: number;
  overall: 'PASS' | 'WARN' | 'FAIL';
  score: number | null;
  checks: ScorecardCheck[];
}

/* ------------------------------------------------ Media Library */

export interface SFXItem {
  name: string;
  file: string;
  category: 'impact' | 'transition' | 'ui' | 'fx';
  path: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'render' | 'sfx';
  duration?: number;
  size_bytes?: number;
  format?: string;
  url: string;
  created_at?: string;
}

/* ------------------------------------------------ Publishing & Operations */

export interface PublishingJob {
  id: string;
  reel_id: string;
  title: string;
  platforms: ('instagram' | 'tiktok' | 'youtube' | 'x')[];
  status: 'draft' | 'ready' | 'scheduled' | 'publishing' | 'published' | 'failed';
  scheduled_at?: string;
  published_url?: string;
  error_message?: string;
}

export interface AnalyticsMetric {
  reel_id: string;
  title: string;
  views: number;
  reach: number;
  watch_time_ratio: number;
  shares_per_1000_reach: number;
  saves: number;
  likes: number;
  comments: number;
  follows_per_1000_reach: number;
  hook_type: string;
  style_preset: string;
}

export interface WorkflowExecution {
  id: string;
  name: string;
  trigger: string;
  status: 'active' | 'success' | 'failed' | 'idle';
  last_execution: string;
  duration_seconds: number;
  error_details?: string;
}
