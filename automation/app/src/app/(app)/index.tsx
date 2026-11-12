import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Page, Row } from '../../components/Page';
import { Badge, Banner, Button, Card, EmptyState, ErrorState, SectionTitle, Skeleton, T } from '../../components/ui';
import { Stat } from '../../components/studio';
import { errorText } from '../../api/client';
import { editor, when } from '../../api/editor';
import { usePoll } from '../../state/usePoll';
import { Tone, spacing, useTheme } from '../../theme';

const svcTone = (s: string): Tone => (s === 'ONLINE' ? 'success' : s === 'STANDBY' ? 'neutral' : s === 'OFFLINE' || s === 'NOT_FOUND' || s === 'ERROR' ? 'danger' : 'warning');

export default function CommandCenter() {
  const router = useRouter();
  const { colors } = useTheme();
  const [ov, setOv] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [o, h] = await Promise.allSettled([editor.overview(), editor.health()]);
    if (o.status === 'fulfilled') { setOv(o.value); setError(null); } else setError(errorText(o.reason));
    if (h.status === 'fulfilled') setHealth(h.value);
  }, []);
  useEffect(() => { load(); }, [load]);
  usePoll(load, true, 5000);

  if (error && !ov) return <Page title="Command Center"><ErrorState message={error} onRetry={load} /></Page>;
  if (!ov) return <Page title="Command Center" subtitle="Autonomous video production"><Skeleton height={100} /><Skeleton height={160} /></Page>;

  const k = ov.kpis;
  const empty = k.storyboards === 0;
  const issues: string[] = health?.summary?.core_issues ?? [];

  return (
    <Page title="Command Center" subtitle="What is in the pipeline, what needs you, and what is healthy">
      {issues.length ? (
        <Banner tone="warning">
          Setup needed before the editor can run end to end: {issues.join(', ')}. Open Integrations for details.
        </Banner>
      ) : null}

      {k.awaiting_approval > 0 ? (
        <Card onPress={() => router.push('/storyboard')} style={{ borderColor: colors.warning }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, minWidth: 220 }}>
              <T variant="h2">{k.awaiting_approval} storyboard{k.awaiting_approval > 1 ? 's' : ''} waiting for your approval</T>
              <T muted>Nothing is rendered in final quality until you approve it.</T>
            </View>
            <Button label="Review now" variant="primary" icon="layers" onPress={() => router.push('/storyboard')} />
          </Row>
        </Card>
      ) : null}

      <Row style={{ alignItems: 'stretch' }}>
        <Stat label="In pipeline" value={k.in_pipeline} sub={`${k.storyboards} storyboards in total`} />
        <Stat label="Awaiting approval" value={k.awaiting_approval} tone={k.awaiting_approval ? 'warning' : undefined} />
        <Stat label="Rendered" value={k.rendered} sub={k.rendering ? `${k.rendering} rendering now` : undefined} />
        <Stat label="Scheduled" value={k.scheduled} />
        <Stat label="Published" value={k.published} />
        <Stat label="Avg scorecard" value={k.avg_score === null ? '—' : Math.round(k.avg_score * 100) + '%'} sub={k.failed ? `${k.failed} failed item(s)` : undefined} tone={k.failed ? 'danger' : undefined} />
      </Row>

      {empty ? (
        <EmptyState icon="film" title="Your pipeline is empty"
          message="Start with raw footage. The editor drafts a cut, you review and approve it, then it renders and publishes."
          action={<Button label="Start a new edit" variant="primary" icon="plus" onPress={() => router.push('/new')} />} />
      ) : (
        <>
          <SectionTitle title="Pipeline" />
          <Row style={{ alignItems: 'stretch' }}>
            {ov.pipeline.map((p: any) => (
              <Card key={p.key} style={[styles.stage, p.alert && { borderColor: colors.warning }]}>
                <T variant="stat" color={p.alert ? colors.warning : colors.text}>{p.count}</T>
                <T variant="label" muted>{p.label.toUpperCase()}</T>
              </Card>
            ))}
          </Row>
        </>
      )}

      <View style={styles.cols}>
        <View style={{ flex: 1, minWidth: 300, gap: spacing.md }}>
          <SectionTitle title="Recent activity" />
          <Card>
            {ov.recent_activity.length === 0 ? <T muted>Nothing has happened yet.</T> : ov.recent_activity.map((e: any, i: number) => (
              <View key={i} style={[styles.event, { borderBottomColor: colors.border }]}>
                <T variant="small" faint style={{ width: 96 }}>{when(e.ts)}</T>
                <T style={{ flex: 1 }}>{e.message}</T>
              </View>
            ))}
          </Card>
          {ov.next_scheduled.length ? (
            <>
              <SectionTitle title="Next scheduled posts" />
              <Card>{ov.next_scheduled.map((p: any) => (
                <Row key={p.id} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
                  <T>{p.title}</T><T variant="small" muted>{when(p.scheduled_at)}</T>
                </Row>
              ))}</Card>
            </>
          ) : null}
        </View>

        <View style={{ flex: 1, minWidth: 300, gap: spacing.md }}>
          <SectionTitle title="System health" right={health ? <Badge label={`${health.summary.online}/${health.summary.total} online`} tone={health.summary.core_ready ? 'success' : 'warning'} dot /> : undefined} />
          <Card>
            {!health ? <Skeleton height={120} /> : health.services.map((s: any) => (
              <View key={s.id} style={[styles.event, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <T variant="h3">{s.name}</T>
                  <T variant="small" muted numberOfLines={2}>{s.detail}</T>
                </View>
                <Badge label={s.status.replace('_', ' ')} tone={svcTone(s.status)} dot />
              </View>
            ))}
          </Card>
          <Button label="Quick start: new edit" icon="plus" onPress={() => router.push('/new')} />
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  stage: { flexGrow: 1, flexBasis: 120, minWidth: 110, alignItems: 'flex-start' },
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'flex-start' },
  event: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
});
