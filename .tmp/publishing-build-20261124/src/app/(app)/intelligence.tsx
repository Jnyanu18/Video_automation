import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Page, Row } from '../../components/Page';
import { Badge, Banner, Button, Card, Chips, EmptyState, ErrorState, SectionTitle, Skeleton, T } from '../../components/ui';
import { ChecksList, STAGE_LABEL, Stat, checkTone } from '../../components/studio';
import { errorText } from '../../api/client';
import { Scorecard, editor } from '../../api/editor';
import { useStoryboards } from '../../state/useStoryboards';
import { spacing } from '../../theme';

const MEANING: Record<string, string> = {
  three_second_hook: 'Measures the seconds between the first kept frame and the first spoken word, and flags slow greetings. New viewers are tested in the first seconds, so dead air here costs reach.',
  sendability_signal: 'Looks for an explicit send / save / tag / part-2 call, and rewards it being in the closing third where viewers act. Sends and saves are strong distribution signals.',
  no_cut_mid_word: 'Uses the transcript to make sure no cut lands inside a spoken word.',
  silence_remaining: 'Measures silence left in the output against the style’s allowed pause length.',
  caption_reading_speed: 'Characters per second per caption, so captions can actually be read.',
  loudness_jumps: 'Loudness difference across each cut, so volume does not jump between shots.',
};

export default function ContentIntelligence() {
  const router = useRouter();
  const { list, current: sb, select, error, loading, reload } = useStoryboards();
  const [live, setLive] = useState<Scorecard | null>(null);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const rescore = useCallback(async () => {
    if (!sb || sb.status !== 'ready') return;
    setChecking(true); setErr(null);
    try { const r = await editor.scorecard(sb.id); setLive(r.scorecard); } catch (e) { setErr(errorText(e)); } finally { setChecking(false); }
  }, [sb?.id, sb?.status, sb?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setLive(null); rescore(); }, [rescore]);

  if (loading) return <Page title="Content Intelligence"><Skeleton height={160} /></Page>;
  if (error && !list) return <Page title="Content Intelligence"><ErrorState message={error} onRetry={reload} /></Page>;
  if (!list?.length || !sb) {
    return <Page title="Content Intelligence" subtitle="Objective checks on every edit"><EmptyState icon="cpu" title="Nothing to evaluate yet" message="Create a storyboard and its checks appear here." action={<Button label="Start a new edit" variant="primary" icon="plus" onPress={() => router.push('/new')} />} /></Page>;
  }

  const card = live ?? (sb.storyboard?.scorecard as any);
  const checks = card?.checks ?? [];
  const hook = checks.find((c: any) => c.name === 'three_second_hook');
  const send = checks.find((c: any) => c.name === 'sendability_signal');

  return (
    <Page title="Content Intelligence" subtitle="Objective, measurable checks. They flag problems; they do not judge taste.">
      <Chips options={list.filter((s) => s.status === 'ready').slice(0, 10).map((s) => ({ value: s.id, label: `${(s.storyboard?.title || s.id).slice(0, 30)} · ${STAGE_LABEL[s.stage] ?? s.stage}` }))} value={sb.id} onChange={(v) => v && select(v)} />
      {err ? <Banner tone="danger">{err}</Banner> : null}
      {!card?.available ? <Banner tone="warning">The scorecard could not run: {card?.reason || 'storyboard not ready'}.</Banner> : null}

      {card?.available ? (
        <>
          <Row style={{ alignItems: 'stretch' }}>
            <Stat label="Overall" value={card.overall ?? card.status} tone={card.status === 'FAIL' ? 'danger' : card.status === 'WARN' ? 'warning' : 'success'} sub={card.score === null ? undefined : `score ${Math.round(card.score * 100)}%`} />
            <Stat label="3-second hook" value={hook ? hook.status.toUpperCase() : '—'} tone={hook?.status === 'fail' ? 'danger' : hook?.status === 'warn' ? 'warning' : undefined} sub={hook?.detail} />
            <Stat label="Share trigger" value={send ? send.status.toUpperCase() : '—'} tone={send?.status === 'warn' ? 'warning' : undefined} sub={send?.detail} />
          </Row>
          <Row>
            <Button label={checking ? 'Re-checking…' : 'Re-run checks'} icon="refresh" loading={checking} onPress={rescore} />
            <Button label="Open storyboard" icon="layers" onPress={() => router.push({ pathname: '/storyboard', params: { sb: sb.id } })} />
          </Row>
          <SectionTitle title="All checks" />
          <Card><ChecksList checks={checks} /></Card>
          <SectionTitle title="What each check measures" />
          <Card style={{ gap: spacing.md }}>
            {Object.entries(MEANING).map(([k, v]) => (
              <View key={k} style={{ gap: 2 }}>
                <Row gap={spacing.sm}><T variant="h3">{k.replace(/_/g, ' ')}</T>{checks.find((c: any) => c.name === k) ? <Badge label={checks.find((c: any) => c.name === k).status.toUpperCase()} tone={checkTone(checks.find((c: any) => c.name === k).status)} /> : null}</Row>
                <T variant="small" muted>{v}</T>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Page>
  );
}
