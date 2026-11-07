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
  id: string;
  title?: string;
  status: ReelStatus;
  sourceType?: 'reel' | 'upload' | string;
  reelUrl?: string;
  niche?: string;
  brandVoice?: string;
  createdAt?: string;
  updatedAt?: string;
  /** The list endpoint sends a string; the detail endpoint sends the newest error-log entry (an object). Use errorLabel(). */
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
  content?: { script?: string; caption?: string; overlay?: string; hashtags?: string[] };
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
}
