import { get, post, request } from './client';

/* Types mirror automation/editor/api_server.py. Every number the UI shows comes from these; nothing is defaulted client-side. */

export interface Check { name: string; status: 'pass' | 'warn' | 'fail' | 'skipped' | string; score: number | null; detail: string }
export interface Scorecard {
  available: boolean; reason?: string | null; status: string; score: number | null;
  failed_checks: string[]; warnings: string[]; checks: Check[];
}
export interface Signal { status: string; detail: string; score: number | null }
export interface SceneSfx { name: string; at: number | null; volume_db?: number }
export interface Scene {
  scene_number: number; type: string; timestamp_output: string; source_range: string; duration: number; action: string;
  framing: string; camera_motion: string; caption: string; caption_style: string; sfx: SceneSfx[];
}
export interface StoryboardCard {
  title: string;
  duration: { original_seconds: number; output_seconds: number; removed_seconds: number; reduction_percent: number };
  scenes_count: number; scenes: Scene[];
  sound_design: { ducking_enabled: boolean; target_lufs: number | null; music: boolean; sfx_count: number; sfx: { name: string; at: number | null; id: string }[] };
  growth_signals: { three_second_hook: Signal; sendability: Signal };
  scorecard: Scorecard;
}
export interface RenderRec {
  render_id: string; video_url: string; quality: 'preview' | 'final'; duration: number; resolution: string;
  backend: string; warnings: string[]; seconds?: number; created_at: number;
}
export interface RenderJob { status: 'queued' | 'running' | 'done' | 'failed'; quality: string; error?: string | null; render_id?: string }
export interface AgentEvent { ts: number; type: string; name?: string; state?: string; text?: string; warnings?: string[] }
export interface Storyboard {
  id: string; status: 'processing' | 'ready' | 'failed'; error: string | null; video_path: string; style: string; prompt: string;
  series: { id: string; episode: number } | null; storyboard: StoryboardCard | null; approved: boolean; approved_at: number | null;
  approval_reset?: boolean; latest_render: RenderRec | null; latest_preview: RenderRec | null; renders: RenderRec[];
  render_job: RenderJob | null; events: AgentEvent[]; stage: string; agent_reply: string; created_at: number; updated_at: number;
  messages?: { role: string; content: string }[];
  director?: Director | null; posts?: Posts | null; source_url?: string | null; stage_text?: string;
}
export interface Director {
  source: 'llm' | 'heuristic'; warnings: string[];
  plan: {
    hook: { text: string } | null; speaker: { name: string; role: string } | null;
    beats: { template: string; start: number; end: number; [k: string]: any }[];
    zooms: { start: number; end: number }[]; sfx: { name: string; at: number }[]; cta: { text: string } | null;
  };
}
export interface Posts {
  generated_by: 'llm' | 'template';
  instagram: { caption: string; cover_text: string }; youtube_short: { title: string; description: string }; x: { post: string; reply: string };
}
export interface Episode {
  episode_number: number; title: string; hook: string; cliffhanger: string; continuity: string;
  status: string; storyboard_id: string | null; score?: number | null;
}
export interface Series {
  id: string; title: string; niche: string; angle?: string; status: string; generated_by: 'llm' | 'template'; episodes: Episode[];
  progress: { total: number; storyboarded: number; rendered: number; published: number };
}
export interface PublishItem {
  id: string; title: string; caption: string; platforms: string[]; storyboard_id: string | null; render_id: string; video_url: string;
  scheduled_at: number | null; status: 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'CANCELED';
  results: Record<string, { status: string; url?: string; error?: string }>;
  error: { code: string; message: string; retryable: boolean } | null; outcome_unknown?: boolean; published_at?: number;
  metrics: Record<string, number> | null; created_at: number;
}
export interface PlatformAccount { platform: string; label: string; connected: boolean; account: string | null; detail: string }
export interface ServiceHealth { id: string; name: string; type: string; port: number | null; endpoint: string; status: string; detail: string }

export interface VsItem { id: string; label: string; ok: boolean; detail: string; fix: string }
export interface VsStatus { present: boolean; items: VsItem[]; carousel_ready: boolean; animated_ready: boolean; voice_mode: 'elevenlabs' | 'stand-in' | 'none'; videos: number; music_tracks: number }
export interface VsVideo { slug: string; title: string; lane: string; checks: { stage: string; done: boolean }[]; signed_off: boolean; outputs: string[] }
export interface Carousel {
  id: string; title: string; status: 'writing' | 'rendering' | 'ready' | 'failed'; error: string | null; slug: string | null;
  slides: { kind: string; kicker?: string; title: string; bullets: string[]; tip?: string; cta?: string }[]; files: string[];
  storyboard_id: string | null; generated_by: 'llm' | 'template' | null;
}

export const isActive = (s: Storyboard) => s.status === 'processing' || s.render_job?.status === 'running' || s.render_job?.status === 'queued';

export const editor = {
  overview: () => get('/api/editor/overview'),
  analytics: () => get('/api/editor/analytics'),
  health: () => get<{ services: ServiceHealth[]; summary: { online: number; total: number; core_ready: boolean; core_issues: string[] } }>('/api/editor/integrations/health'),
  workflows: () => get('/api/editor/automation/workflows'),
  activity: () => get('/api/editor/activity'),
  styles: () => get('/api/editor/styles'),
  footage: () => get<{ files: { path: string; name: string; size_mb: number }[] }>('/api/editor/footage'),
  media: () => get('/api/editor/media'),

  storyboards: () => get<{ storyboards: Storyboard[] }>('/api/editor/storyboards').then((r) => r.storyboards),
  storyboard: (id: string) => get<{ data: Storyboard }>(`/api/editor/storyboard/${id}`).then((r) => r.data),
  autoEdit: (body: Record<string, unknown>) => post<{ storyboard_id: string; data: Storyboard }>('/api/editor/reel/auto', body),
  posts: (id: string) => post<{ posts: Posts }>(`/api/editor/storyboard/${id}/posts`).then((r) => r.posts),
  learnStyle: (body: Record<string, unknown>) => post<{ job: { id: string } }>('/api/editor/styles/learn', body),
  styleJob: (id: string) => get<{ job: { id: string; status: 'running' | 'done' | 'failed'; message: string; error?: string; style?: string; learned_from?: number } }>(`/api/editor/styles/learn/${id}`).then((r) => r.job),
  vsStatus: () => get<VsStatus & { ok: boolean }>('/api/editor/vstudio/status'),
  vsInstall: () => post<{ job: { id: string } }>('/api/editor/vstudio/install'),
  vsJob: (id: string) => get<{ job: { id: string; status: 'running' | 'done' | 'failed'; error?: string; log: string[] } }>(`/api/editor/vstudio/jobs/${id}`).then((r) => r.job),
  vsVideos: () => get<{ videos: VsVideo[] }>('/api/editor/vstudio/videos').then((r) => r.videos),
  vsGate: (slug: string, stage: string, done: boolean) => post(`/api/editor/vstudio/videos/${slug}/gate`, { stage, done }),
  vsMusic: () => get<{ tracks: { id: string; name: string; video: string; size_mb: number }[]; note: string | null }>('/api/editor/vstudio/music'),
  vsCarousels: () => get<{ carousels: Carousel[] }>('/api/editor/vstudio/carousels').then((r) => r.carousels),
  vsMakeCarousel: (body: Record<string, unknown>) => post<{ carousel: Carousel }>('/api/editor/vstudio/carousel', body),
  setMusic: (id: string, track_id: string | null, volume_db = -20) => post(`/api/editor/storyboard/${id}/music`, { track_id, volume_db }),
  recipes: () => get<{ recipes: { name: string; title: string; description: string; steps: number }[] }>('/api/editor/recipes').then((r) => r.recipes),
  createStoryboard: (body: Record<string, unknown>) => post<{ storyboard_id: string; data: Storyboard }>('/api/editor/storyboard/create', body),
  chat: (id: string, message: string) => post(`/api/editor/storyboard/${id}/chat`, { message }),
  approve: (id: string) => post(`/api/editor/storyboard/${id}/approve`),
  unapprove: (id: string) => post(`/api/editor/storyboard/${id}/unapprove`),
  render: (id: string, quality: 'preview' | 'final') => post(`/api/editor/storyboard/${id}/render`, { quality }),
  scorecard: (id: string) => get<{ scorecard: any }>(`/api/editor/storyboard/${id}/scorecard`),
  deleteStoryboard: (id: string) => request('DELETE', `/api/editor/storyboard/${id}`),
  copilot: (body: Record<string, unknown>) => post('/api/editor/copilot/chat', body),

  series: () => get<{ series: Series[] }>('/api/editor/series').then((r) => r.series),
  generateSeries: (body: Record<string, unknown>) => post<{ series: Series }>('/api/editor/series/generate', body),
  patchEpisode: (sid: string, n: number, body: Record<string, unknown>) => request<{ series: Series }>('PATCH', `/api/editor/series/${sid}/episodes/${n}`, { body }),
  episodeStoryboard: (sid: string, n: number, body: Record<string, unknown>) => post(`/api/editor/series/${sid}/episodes/${n}/storyboard`, body),
  deleteSeries: (sid: string) => request('DELETE', `/api/editor/series/${sid}`),

  queue: () => get<{ queue: PublishItem[] }>('/api/editor/publishing/queue').then((r) => r.queue),
  accounts: () => get<{ accounts: PlatformAccount[]; public_url_configured: boolean }>('/api/editor/publishing/accounts'),
  schedule: (body: Record<string, unknown>) => post<{ item: PublishItem }>('/api/editor/publishing/schedule', body),
  pubAction: (id: string, action: 'cancel' | 'retry' | 'confirm-retry') => post(`/api/editor/publishing/${id}/${action}`),
  metrics: (id: string, body: Record<string, unknown>) => request('PUT', `/api/editor/publishing/${id}/metrics`, { body }),
};

export const when = (ts?: number | null) => (ts ? new Date(ts * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
export const pct = (n?: number | null, d = 0) => (n === null || n === undefined ? '—' : `${n.toFixed(d)}%`);
export const num = (n?: number | null, d = 1) => (n === null || n === undefined ? '—' : Number.isInteger(n) ? String(n) : n.toFixed(d));
