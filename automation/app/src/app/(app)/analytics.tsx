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
  const load = useCallback(async () => { try { setA(await editor.analytics()); setError(null); } catch (e) { setError(errorText(e)); } }, []);
  useEffect(() => { load(); }, [load]);

  if (error && !a) return <Page title="Analytics"><ErrorState message={error} onRetry={load} /></Page>;
  if (!a) return <Page title="Analytics"><Skeleton height={120} /><Skeleton height={200} /></Page>;

  const p = a.production;
  const e = a.engagement;
  const none = p.storyboards === 0;

  return (
    <Page title="Analytics" subtitle="Computed from your storyboards, renders and the results you record on published posts">
      {none ? (
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
            {a.by_style.map((s: any) => (
              <Row key={s.style} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ flex: 1, minWidth: 180 }}><T variant="h3">{s.style}</T><T variant="small" muted>{s.storyboards} storyboard(s) · {s.renders} rendered</T></View>
                <T variant="small" muted>score {s.avg_score === null ? '—' : Math.round(s.avg_score * 100) + '%'} · {pct(s.avg_reduction_pct, 1)} cut · {num(s.avg_output_seconds)}s</T>
              </Row>
            ))}
          </Card>

          <SectionTitle title="Best storyboards" />
          <Card>
            {a.top_storyboards.map((t: any) => (
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
        {a.recent_activity.length === 0 ? <T muted>No activity yet.</T> : a.recent_activity.map((ev: any, i: number) => (
          <Row key={i} gap={spacing.md} style={{ paddingVertical: 4 }}><T variant="small" faint style={{ width: 100 }}>{when(ev.ts)}</T><T style={{ flex: 1 }}>{ev.message}</T></Row>
        ))}
      </Card>
    </Page>
  );
}
