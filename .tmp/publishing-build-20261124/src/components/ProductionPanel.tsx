import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge, Button, Card, T } from './ui';
import { Icon } from './Icon';
import { VideoPlayer } from './VideoPlayer';
import { timeAgo } from './ReelParts';
import type { DirectorJobData } from './DirectorJob';
import { absoluteUrl, errorText, get, post } from '../api/client';
import { font, spacing, useTheme, Tone } from '../theme';

/** The production line a brief goes through, in plain words (no tooling, no code). The worker sets `job.stage`. */
const STEPS: Record<'edit' | 'motion', [string, string][]> = {
  edit: [
    ['Brief received', 'Your clips, brief and references are saved.'],
    ['Reviewing your clips', 'Every clip is watched and logged: speech, faces, motion and the best takes.'],
    ['Choosing the best moments', 'Moments are picked to fit your length, story and goal.'],
    ['Cutting to the music', 'The cut is timed to the beat and to your reference pacing.'],
    ['Captions, titles & sound', 'On-screen text, captions and sound effects are added.'],
    ['Rendering & checking', 'The film is rendered and checked frame by frame.'],
    ['Ready to review', 'Approve it, or ask for changes in Storyboard.'],
  ],
  motion: [
    ['Brief received', 'Your idea, brand and format are saved.'],
    ['Studying the brand', 'The brand, product and message are researched.'],
    ['Writing the storyboard', 'Scenes, on-screen words and timing are planned.'],
    ['Choosing the music', 'A licensed track is picked and cut on its beat.'],
    ['Designing the motion', 'Every scene is animated and checked as stills.'],
    ['Rendering & checking', 'The film is rendered with motion blur and mastered sound.'],
    ['Ready to review', 'Approve it, or ask for changes in Storyboard.'],
  ],
};
const STATUS: Record<DirectorJobData['status'], { label: string; tone: Tone }> = {
  queued: { label: 'Queued', tone: 'neutral' },
  working: { label: 'In production', tone: 'info' },
  done: { label: 'Ready', tone: 'success' },
  failed: { label: 'Needs attention', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};
const ago = (t?: number) => (t ? timeAgo(new Date(t * 1000).toISOString()) : '');

/** Index of the step in progress (everything before it is done). */
function currentStep(job: (DirectorJobData & { stage?: number }) | null, total: number): number {
  if (!job) return -1;
  if (job.status === 'done') return total;
  if (job.status === 'queued') return 1;
  return Math.max(1, Math.min(total - 1, Number(job.stage) || 1));
}

export function ProductionPanel({ kind, jobId, onNew, attached }: {
  kind: 'edit' | 'motion'; jobId: string | null; onNew?: () => void;
  attached?: { clips: number; reference?: string };
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const [job, setJob] = useState<(DirectorJobData & { stage?: number; root?: string }) | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const idRef = useRef(jobId);
  idRef.current = jobId;

  const load = useCallback(async () => {
    if (!jobId) { setJob(null); return; }
    try {
      const r = await get(`/api/editor/agent/jobs/${jobId}`);
      if (idRef.current === jobId) setJob(r.job);
    } catch (e) {
      setErr(errorText(e));
    }
  }, [jobId]);

  useEffect(() => { setJob(null); load(); }, [load]);
  const live = !!jobId && (!job || job.status === 'queued' || job.status === 'working');
  useEffect(() => {
    if (!live) return undefined;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [live, load]);

  const steps = STEPS[kind];
  const cur = currentStep(job, steps.length);
  const st = job ? STATUS[job.status] : null;
  const url = job?.video_url ? (absoluteUrl(job.video_url) as string) : undefined;
  const lastNote = job?.updates?.length ? job.updates[job.updates.length - 1].text : '';
  const sbId = job ? 'sb_' + (job.root || job.id).slice(3) : '';

  return (
    <Card style={{ gap: spacing.md, backgroundColor: colors.surface }}>
      <View style={styles.head}>
        <T variant="caption" color={colors.primary} style={styles.eyebrow}>{job ? 'LIVE PRODUCTION' : 'HOW YOUR FILM GETS MADE'}</T>
        {st ? <Badge label={st.label} tone={st.tone} dot={job?.status === 'working'} /> : null}
      </View>

      {job ? (
        <View style={{ gap: 2 }}>
          <T variant="h2" style={{ fontSize: 17 }} numberOfLines={2}>{job.title || job.prompt}</T>
          <T variant="caption" muted>
            {job.format} · {job.duration} s{job.clips.length + job.assets.length ? ` · ${job.clips.length + job.assets.length} clip(s)` : ''} · started {ago(job.created_at)}
          </T>
        </View>
      ) : (
        <T variant="small" muted>
          Send your brief and follow each step here as it happens.
          {attached ? ` ${attached.clips ? `${attached.clips} clip${attached.clips > 1 ? 's' : ''} attached` : 'No clips attached yet'}${attached.reference ? ` · reference: ${attached.reference}` : ''}.` : ''}
        </T>
      )}

      {job?.status === 'done' && url ? (
        <View style={{ gap: spacing.sm }}>
          <VideoPlayer uri={url} isLandscape={job.output ? job.output.width > job.output.height : job.format === '16:9'} />
          <View style={styles.actions}>
            <Button small variant="primary" icon="layers" label="Open in Storyboard" onPress={() => router.push({ pathname: '/storyboard', params: { sb: sbId } })} />
            <Button small icon="download" label="Download" onPress={() => Linking.openURL(url)} />
            {onNew ? <Button small variant="ghost" icon="plus" label="New edit" onPress={onNew} /> : null}
          </View>
        </View>
      ) : null}

      <View style={{ gap: 0 }}>
        {steps.map(([title, desc], i) => {
          const done = i < cur, now = i === cur && job?.status !== 'done', failed = now && job?.status === 'failed';
          const dot = failed ? colors.danger : done || now ? colors.primary : colors.border;
          return (
            <View key={title} style={styles.step}>
              <View style={styles.rail}>
                <View style={[styles.dot, { borderColor: dot, backgroundColor: done ? colors.primary : colors.surface }]}>
                  {done ? <Icon name="check" size={11} color={colors.onPrimary} /> : now ? <View style={[styles.inner, { backgroundColor: dot }]} /> : null}
                </View>
                {i < steps.length - 1 ? <View style={[styles.line, { backgroundColor: done ? colors.primary : colors.border }]} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: spacing.md, gap: 2 }}>
                <Text style={{ fontFamily: now || done ? font.semibold : font.medium, fontSize: 13.5, color: done || now ? colors.text : colors.textMuted }}>
                  {title}{now && !failed ? '  ·  now' : ''}
                </Text>
                <T variant="small" muted={!now} faint={!now && !done}>{now && lastNote ? lastNote : desc}</T>
              </View>
            </View>
          );
        })}
      </View>

      {job && job.updates.length > 1 ? (
        <View style={[styles.notes, { borderColor: colors.border }]}>
          <T variant="label" muted>Production notes</T>
          {job.updates.slice(-4).reverse().map((u, i) => (
            <View key={i} style={styles.noteRow}>
              <T variant="caption" faint style={{ width: 64 }}>{ago(u.t)}</T>
              <T variant="small" style={{ flex: 1 }}>{u.text}</T>
            </View>
          ))}
        </View>
      ) : null}

      {job?.status === 'failed' && job.error ? <T variant="small" color={colors.danger}>{job.error}</T> : null}
      {err && !job ? <T variant="small" color={colors.danger}>{err}</T> : null}
      {live && job ? (
        <View style={styles.actions}>
          <Button small variant="ghost" icon="x" label="Cancel" onPress={async () => {
            try { await post(`/api/editor/agent/jobs/${job.id}/cancel`); await load(); } catch (e) { setErr(errorText(e)); }
          }} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  eyebrow: { fontWeight: '700', letterSpacing: 1.2 },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  step: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 22 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 2, flex: 1, minHeight: 14, marginVertical: 2 },
  notes: { borderTopWidth: 1, paddingTop: spacing.sm, gap: 6 },
  noteRow: { flexDirection: 'row', gap: spacing.sm },
});
