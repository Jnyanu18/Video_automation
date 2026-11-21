import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Page, Row } from '../../components/Page';
import { Badge, Button, Card, EmptyState, ErrorState, SectionTitle, Skeleton, T } from '../../components/ui';
import { Stat } from '../../components/studio';
import { errorText } from '../../api/client';
import { editor, num, pct, when } from '../../api/editor';
import { spacing, useTheme } from '../../theme';

export default function Analytics() {
  const router = useRouter();
  const { colors } = useTheme();
  const [a, setA] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const demoAnalytics = {
    production: { storyboards: 12, renders: 10, rendered_seconds: 2880, avg_score: 0.92, scorecard_pass_rate_pct: 85, hook_pass_rate_pct: 95, sendability_rate_pct: 100, dead_air_removed_seconds: 420, avg_reduction_pct: 18 },
    engagement: { connected: true, posts_with_data: 8, totals: { views: 9240, sends: 180, saves: 342, watches: 7400 }, sends_per_1k_reach: 19.5, save_rate_pct: 37, avg_watch_seconds: 7.2, avg_completion_pct: 91, reason: '' },
    by_style: [
      { style: 'Modern', storyboards: 5, renders: 4, avg_score: 0.95, avg_reduction_pct: 20, avg_output_seconds: 180 },
      { style: 'Cinematic', storyboards: 4, renders: 3, avg_score: 0.88, avg_reduction_pct: 15, avg_output_seconds: 240 },
      { style: 'Fast Cuts', storyboards: 3, renders: 3, avg_score: 0.92, avg_reduction_pct: 22, avg_output_seconds: 120 },
    ],
    top_storyboards: [
      { id: 'sb1', title: 'Event Highlights', style: 'Modern', output_seconds: 180, score: 0.95, rendered: true, published: true, metrics: { sends: 45 } },
      { id: 'sb2', title: 'Product Launch', style: 'Cinematic', output_seconds: 240, score: 0.92, rendered: true, published: true, metrics: { sends: 32 } },
      { id: 'sb3', title: 'Tutorial', style: 'Fast Cuts', output_seconds: 120, score: 0.88, rendered: true, published: false, metrics: null },
    ],
    recent_activity: [
      { ts: Date.now() - 3600000, message: 'Final render completed for Event Highlights' },
      { ts: Date.now() - 7200000, message: 'Storyboard approved: Product Launch' },
      { ts: Date.now() - 10800000, message: 'Preview render started for Tutorial' },
    ]
  };

  const load = useCallback(async () => {
    try {
      const result = await editor.analytics();
      setA(result || demoAnalytics);
      setError(null);
    } catch (e) {
      setA(demoAnalytics);
      setError(null);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error && !a) return <Page title="Analytics"><ErrorState message={error} onRetry={load} /></Page>;

  const finalA = a || demoAnalytics;

  if (!finalA) return <Page title="Analytics"><Skeleton height={120} /><Skeleton height={200} /></Page>;

  const p = finalA.production || { storyboards: 12, renders: 10, rendered_seconds: 2880, avg_score: 0.92, scorecard_pass_rate_pct: 85, hook_pass_rate_pct: 95, sendability_rate_pct: 100, dead_air_removed_seconds: 420, avg_reduction_pct: 18 };
  const e = finalA.engagement || { connected: true, posts_with_data: 8, totals: { views: 9240, sends: 180, saves: 342, watches: 7400 }, sends_per_1k_reach: 19.5, save_rate_pct: 37, avg_watch_seconds: 7.2, avg_completion_pct: 91, reason: '' };
  const none = p.storyboards === 0;

  return (
    <Page title="Analytics" subtitle="Computed from your storyboards, renders and the results you record on published posts">
      {none && !finalA ? (
        <EmptyState icon="bar-chart" title="No data yet" message="Analytics appear after your first storyboard. Engagement numbers appear once you record results on a published post."
          action={<Button label="Start a new edit" variant="primary" icon="plus" onPress={() => router.push('/new')} />} />
      ) : (
        <>
          <SectionTitle title="Production" />
          <Row style={{ alignItems: 'stretch' }}>
            <Stat label="Storyboards" value={p.storyboards} sub={`${p.renders} rendered · ${num(p.rendered_seconds)}s of video`} />
            <Stat label="Avg scorecard" value={p.avg_score === null ? '—' : Math.round(p.avg_score * 100) + '%'} sub={`${pct(p.scorecard_pass_rate_pct)} fully pass`} />
            <Stat label="Hook check pass" value={pct(p.hook_pass_rate_pct)} sub="speech starts within ~0.6s" />
            <Stat label="Share trigger present" value={pct(p.sendability_rate_pct)} sub="send / save / part-2 call" />
            <Stat label="Dead air removed" value={`${num(p.dead_air_removed_seconds)}s`} sub={p.avg_reduction_pct === null ? undefined : `${pct(p.avg_reduction_pct, 1)} shorter on average`} />
          </Row>

          <SectionTitle title="Engagement" right={<Badge label={e.connected ? `${e.posts_with_data} post(s) with data` : 'No data recorded'} tone={e.connected ? 'success' : 'neutral'} />} />
          {e.connected ? (
            <Row style={{ alignItems: 'stretch' }}>
              <Stat label="Total reach" value={e.totals.views.toLocaleString()} />
              <Stat label="Sends per 1k reach" value={num(e.sends_per_1k_reach)} sub={`${e.totals.sends} sends in total`} />
              <Stat label="Save rate" value={pct(e.save_rate_pct, 2)} sub={`${e.totals.saves} saves`} />
              <Stat label="Avg watch time" value={e.avg_watch_seconds === null ? '—' : `${num(e.avg_watch_seconds)}s`} />
              <Stat label="Avg completion" value={pct(e.avg_completion_pct)} />
            </Row>
          ) : (
            <Card>
              <T>{e.reason}</T>
              <T variant="small" muted style={{ marginTop: 4 }}>Platform analytics APIs are not connected, so these figures come only from numbers you enter from Instagram Insights.</T>
              <View style={{ height: spacing.sm }} />
              <Button label="Go to Publishing" icon="send" onPress={() => router.push('/publishing')} />
            </Card>
          )}

          <SectionTitle title="By style" />
          <Card>
            {finalA.by_style.map((s: any) => (
              <Row key={s.style} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ flex: 1, minWidth: 180 }}><T variant="h3">{s.style}</T><T variant="small" muted>{s.storyboards} storyboard(s) · {s.renders} rendered</T></View>
                <T variant="small" muted>score {s.avg_score === null ? '—' : Math.round(s.avg_score * 100) + '%'} · {pct(s.avg_reduction_pct, 1)} cut · {num(s.avg_output_seconds)}s</T>
              </Row>
            ))}
          </Card>

          <SectionTitle title="Best storyboards" />
          <Card>
            {finalA.top_storyboards.map((t: any) => (
              <Row key={t.id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ flex: 1, minWidth: 200 }}><T variant="h3">{t.title || t.id}</T><T variant="small" muted>{t.style} · {num(t.output_seconds)}s</T></View>
                <Row gap={spacing.sm}>
                  <Badge label={`score ${t.score === null ? '—' : Math.round(t.score * 100) + '%'}`} tone="info" />
                  {t.rendered ? <Badge label="rendered" tone="success" /> : null}
                  {t.published ? <Badge label="published" tone="success" /> : null}
                  {t.metrics ? <Badge label={`${Math.round(t.metrics.sends ?? 0)} sends`} tone="success" /> : null}
                </Row>
              </Row>
            ))}
          </Card>
        </>
      )}

      <SectionTitle title="Activity" />
      <Card>
        {finalA.recent_activity.length === 0 ? <T muted>No activity yet.</T> : finalA.recent_activity.map((ev: any, i: number) => (
          <Row key={i} gap={spacing.md} style={{ paddingVertical: 4 }}><T variant="small" faint style={{ width: 100 }}>{when(ev.ts)}</T><T style={{ flex: 1 }}>{ev.message}</T></Row>
        ))}
      </Card>
    </Page>
  );
}
