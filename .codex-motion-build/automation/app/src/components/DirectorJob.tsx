import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Badge, Banner, Button, Card, T } from './ui';
import { VideoPlayer } from './VideoPlayer';
import { timeAgo } from './ReelParts';
import { absoluteUrl, errorText, get, post } from '../api/client';
import { spacing, useTheme, Tone } from '../theme';

/** A brief handed to the creative director (studio/agent_bridge.py): its live progress and, when ready, the film. */
export type DirectorJobData = {
  id: string; status: 'queued' | 'working' | 'done' | 'failed' | 'cancelled'; prompt: string; title?: string | null;
  kind: 'motion' | 'edit' | 'event'; format: string; duration: number; clips: string[]; assets: string[];
  updates: { t: number; text: string }[]; created_at: number; error?: string | null; video_url?: string;
  output?: { duration: number; width: number; height: number; size_mb: number } | null;
};

const STATUS: Record<DirectorJobData['status'], { label: string; tone: Tone }> = {
  queued: { label: 'Queued', tone: 'neutral' },
  working: { label: 'In production', tone: 'info' },
  done: { label: 'Ready', tone: 'success' },
  failed: { label: 'Needs attention', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};
const ago = (t?: number) => (t ? timeAgo(new Date(t * 1000).toISOString()) : '');

/** Latest job of a kind for this account, so a screen can pick up where the user left off. */
export async function latestDirectorJob(kind: DirectorJobData['kind']): Promise<DirectorJobData | null> {
  const r = await get('/api/editor/agent/jobs');
  return ((r.jobs || []) as DirectorJobData[]).find((j) => j.kind === kind) || null;
}

export function DirectorJob({ jobId, onStatus, onNew }: {
  jobId: string; onStatus?: (job: DirectorJobData) => void; onNew?: () => void;
}) {
  const { colors } = useTheme();
  const [job, setJob] = useState<DirectorJobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus; // a parent's inline callback must not restart polling on every render

  const load = useCallback(async () => {
    try {
      const r = await get(`/api/editor/agent/jobs/${jobId}`);
      setJob(r.job);
      statusRef.current?.(r.job);
    } catch (e) {
      setError(errorText(e));
    }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);
  const live = !job || job.status === 'queued' || job.status === 'working';
  useEffect(() => {
    if (!live) return undefined;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [live, load]);

  if (error && !job) return <Banner tone="danger">{error}</Banner>;
  if (!job) return <Card><T muted>Loading your film…</T></Card>;

  const st = STATUS[job.status];
  const landscape = job.output ? job.output.width > job.output.height : job.format === '16:9';
  const url = job.video_url ? (absoluteUrl(job.video_url) as string) : undefined;

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <T variant="h2" numberOfLines={2}>{job.title || job.prompt}</T>
          <T variant="caption" muted>
            {job.format} · {job.duration} s{job.clips.length + job.assets.length ? ` · ${job.clips.length + job.assets.length} clip(s)` : ''} · started {ago(job.created_at)}
          </T>
        </View>
        <Badge label={st.label} tone={st.tone} dot={job.status === 'working'} />
      </View>

      {job.status === 'done' && url ? (
        <View style={{ gap: spacing.sm }}>
          <VideoPlayer uri={url} isLandscape={landscape} />
          <View style={styles.head}>
            <T variant="small" muted style={{ flex: 1 }}>
              {job.output ? `${job.output.duration}s · ${job.output.width}×${job.output.height} · ${job.output.size_mb} MB` : ''}
            </T>
            <Button small label="Download" icon="download" onPress={() => Linking.openURL(url)} />
          </View>
        </View>
      ) : null}

      {job.status === 'failed' && job.error ? <Banner tone="danger">{job.error}</Banner> : null}

      <View style={[styles.log, { borderColor: colors.border }]}>
        <T variant="label" muted>Production notes</T>
        {job.updates.slice(-8).map((u, i) => (
          <View key={i} style={styles.logRow}>
            <T variant="caption" faint style={{ width: 70 }}>{ago(u.t)}</T>
            <T variant="small" style={{ flex: 1 }}>{u.text}</T>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        {live ? (
          <Button small variant="ghost" icon="x" label="Cancel" onPress={async () => {
            try { await post(`/api/editor/agent/jobs/${job.id}/cancel`); await load(); } catch (e) { setError(errorText(e)); }
          }} />
        ) : null}
        {!live && onNew ? <Button small variant="primary" icon="plus" label="Create another" onPress={onNew} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  log: { borderTopWidth: 1, paddingTop: spacing.sm, gap: 6 },
  logRow: { flexDirection: 'row', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
