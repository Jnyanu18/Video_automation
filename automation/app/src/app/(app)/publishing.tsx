import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Page, Row } from '../../components/Page';
import { Badge, Banner, Button, Card, Chips, EmptyState, ErrorState, Field, Input, LinkText, SectionTitle, Sheet, Skeleton, T } from '../../components/ui';
import { errorText } from '../../api/client';
import { PlatformAccount, PublishItem, Storyboard, editor, when } from '../../api/editor';
import { usePoll } from '../../state/usePoll';
import { useToast } from '../../state/toast';
import { Tone, spacing, useTheme } from '../../theme';

const TONE: Record<string, Tone> = { SCHEDULED: 'info', PUBLISHING: 'warning', PUBLISHED: 'success', FAILED: 'danger', CANCELED: 'neutral' };
type Slot = 'now' | '1h' | 'tomorrow9' | 'tomorrow18' | 'custom';

function slotToIso(slot: Slot, custom: string): string | null | 'invalid' {
  const d = new Date();
  if (slot === 'now') return null;
  if (slot === '1h') d.setHours(d.getHours() + 1);
  else if (slot === 'tomorrow9' || slot === 'tomorrow18') { d.setDate(d.getDate() + 1); d.setHours(slot === 'tomorrow9' ? 9 : 18, 0, 0, 0); }
  else {
    const t = new Date(custom.trim().replace(' ', 'T'));
    if (isNaN(t.getTime()) || t.getTime() < Date.now() - 60000) return 'invalid';
    return t.toISOString();
  }
  return d.toISOString();
}

export default function Publishing() {
  const toast = useToast();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ sb?: string }>();
  const [queue, setQueue] = useState<PublishItem[] | null>(null);
  const [accounts, setAccounts] = useState<PlatformAccount[] | null>(null);
  const [publicOk, setPublicOk] = useState(true);
  const [sbs, setSbs] = useState<Storyboard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sbId, setSbId] = useState<string>(params.sb ?? '');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [slot, setSlot] = useState<Slot>('now');
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [metricsFor, setMetricsFor] = useState<PublishItem | null>(null);
  const [m, setM] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [q, a, s] = await Promise.all([editor.queue(), editor.accounts(), editor.storyboards()]);
      setQueue(q); setAccounts(a.accounts); setPublicOk(a.public_url_configured); setSbs(s); setError(null);
    } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const live = !!queue?.some((p) => p.status === 'PUBLISHING' || p.status === 'SCHEDULED');
  usePoll(load, live, 3000);

  const ready = sbs.filter((s) => s.latest_render);
  useEffect(() => {
    if (!sbId && ready.length) setSbId(ready[0].id);
  }, [ready.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = ready.find((s) => s.id === sbId);
  useEffect(() => {
    if (!chosen?.storyboard) return;
    setTitle((t) => t || chosen.storyboard!.title);
    const last = chosen.storyboard.scenes[chosen.storyboard.scenes.length - 1];
    const written = chosen.posts?.instagram.caption;
    setCaption((c) => c || written || (last?.caption && last.caption !== '(no speech overlay)' ? last.caption : ''));
  }, [chosen?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(name: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(name); setErr(null);
    try { await fn(); await load(); if (ok) toast(ok); } catch (e) { setErr(errorText(e)); } finally { setBusy(null); }
  }

  function submit() {
    const when_ = slotToIso(slot, custom);
    if (when_ === 'invalid') return setErr('Enter a future date and time like 2026-11-12 18:30');
    act('schedule', async () => {
      await editor.schedule({ title: title.trim(), caption: caption.trim(), platforms: ['instagram'], storyboard_id: sbId, scheduled_at: when_ });
      setTitle(''); setCaption('');
    }, slot === 'now' ? 'Publishing started' : 'Scheduled');
  }

  if (error && !queue) return <Page title="Publishing"><ErrorState message={error} onRetry={load} /></Page>;
  if (!queue || !accounts) return <Page title="Publishing"><Skeleton height={100} /><Skeleton height={200} /></Page>;

  const instagram = accounts.find((a) => a.platform === 'instagram');

  return (
    <Page title="Publishing" subtitle="Schedule finished reels and watch them go out">
      <Row style={{ alignItems: 'stretch' }}>
        {accounts.map((a) => (
          <Card key={a.platform} style={{ flexGrow: 1, flexBasis: 220, minWidth: 220 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="h3">{a.label}</T>
              <Badge label={a.connected ? 'Connected' : 'Not connected'} tone={a.connected ? 'success' : 'neutral'} dot />
            </Row>
            <T variant="small" muted style={{ marginTop: 4 }}>{a.connected ? `Account: ${a.account}` : a.detail}</T>
          </Card>
        ))}
      </Row>
      {!publicOk ? <Banner tone="warning">PUBLIC_BASE_URL is not set to an https address. Instagram can only fetch your video from a public URL (for example a Cloudflare tunnel to the media server on port 8792), so publishing will fail until it is set in automation/.env.local.</Banner> : null}
      {err ? <Banner tone="danger">{err}</Banner> : null}

      <Card>
        <SectionTitle title="Schedule a reel" />
        {ready.length === 0 ? (
          <EmptyState icon="film" title="No finished renders yet" message="Approve a storyboard and render the final video. It will appear here ready to schedule." />
        ) : (
          <View style={{ gap: spacing.md }}>
            <Field label="Rendered video">
              <Chips options={ready.map((s) => ({ value: s.id, label: `${(s.storyboard?.title || s.id).slice(0, 34)} · ${Math.round(s.latest_render!.duration)}s` }))} value={sbId} onChange={(v) => { if (v) { setSbId(v); setTitle(''); setCaption(''); } }} />
            </Field>
            <Field label="Title (for your queue)"><Input value={title} onChangeText={setTitle} /></Field>
            <Field label="Caption" hint={chosen?.posts ? `Filled from the post text written on the storyboard (${chosen.posts.generated_by === 'llm' ? 'AI' : 'template'}). Edit freely.` : 'Write it on the storyboard page (Write post text), or type it here.'}><Input value={caption} onChangeText={setCaption} multiline /></Field>
            <Field label="When">
              <Chips<Slot> options={[{ value: 'now', label: 'Publish now' }, { value: '1h', label: 'In 1 hour' }, { value: 'tomorrow9', label: 'Tomorrow 09:00' }, { value: 'tomorrow18', label: 'Tomorrow 18:00' }, { value: 'custom', label: 'Pick a time' }]} value={slot} onChange={(v) => v && setSlot(v)} />
            </Field>
            {slot === 'custom' ? <Field label="Local date and time" hint="Format: 2026-11-12 18:30"><Input value={custom} onChangeText={setCustom} autoCapitalize="none" placeholder="2026-11-12 18:30" /></Field> : null}
            <Row gap={spacing.sm}>
              <Button label={slot === 'now' ? 'Publish to Instagram' : 'Schedule on Instagram'} variant="primary" icon="send" loading={busy === 'schedule'}
                disabled={!sbId || !title.trim() || !caption.trim() || !instagram?.connected} hint={instagram?.connected ? 'Fill in title and caption' : instagram?.detail}
                onPress={submit} />
              {!instagram?.connected ? <T variant="small" color={colors.warning}>{instagram?.detail}</T> : null}
            </Row>
          </View>
        )}
      </Card>

      <SectionTitle title={`Queue (${queue.length})`} />
      {queue.length === 0 ? <T muted>Nothing scheduled yet.</T> : queue.map((p) => (
        <Card key={p.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, minWidth: 240, gap: 4 }}>
              <Row gap={spacing.sm}><T variant="h3">{p.title}</T><Badge label={p.status} tone={TONE[p.status]} dot /></Row>
              <T variant="small" muted>{p.status === 'PUBLISHED' ? `Published ${when(p.published_at)}` : p.scheduled_at ? `Scheduled for ${when(p.scheduled_at)}` : 'Immediate'} · {p.platforms.join(', ')}</T>
              <T muted numberOfLines={2}>{p.caption}</T>
              {p.results?.instagram?.url ? <LinkText href={p.results.instagram.url}>{p.results.instagram.url}</LinkText> : null}
            </View>
            <Row gap={spacing.sm}>
              {p.status === 'SCHEDULED' ? <Button label="Cancel" small variant="danger" loading={busy === p.id} onPress={() => act(p.id, () => editor.pubAction(p.id, 'cancel'), 'Canceled')} /> : null}
              {p.status === 'FAILED' && !p.outcome_unknown ? <Button label="Retry" small icon="refresh" loading={busy === p.id} onPress={() => act(p.id, () => editor.pubAction(p.id, 'retry'), 'Retrying')} /> : null}
              {p.status === 'PUBLISHED' ? <Button label={p.metrics ? 'Edit results' : 'Record results'} small icon="bar-chart" onPress={() => { setMetricsFor(p); setM(Object.fromEntries(Object.entries(p.metrics ?? {}).map(([k, v]) => [k, String(v)]))); }} /> : null}
            </Row>
          </Row>
          {p.error ? <View style={{ marginTop: spacing.sm }}><Banner tone="danger">{p.error.message}</Banner></View> : null}
          {p.status === 'FAILED' && p.outcome_unknown ? (
            <View style={{ marginTop: spacing.sm, gap: 8 }}>
              <Banner tone="warning">The request may have reached Instagram. Open the account and check whether the reel is there before retrying, otherwise it could be posted twice.</Banner>
              <Button label="I checked, it is not posted. Retry" small variant="danger" loading={busy === p.id} onPress={() => act(p.id, () => editor.pubAction(p.id, 'confirm-retry'), 'Retrying')} />
            </View>
          ) : null}
        </Card>
      ))}

      <Sheet visible={!!metricsFor} onClose={() => setMetricsFor(null)} title="Post performance">
        <View style={{ gap: spacing.md, padding: spacing.lg }}>
          <T muted>Copy these from Instagram Insights. They drive the engagement numbers on the Analytics page; nothing is estimated.</T>
          {([['views', 'Reach / views'], ['likes', 'Likes'], ['comments', 'Comments'], ['sends', 'Sends (DM shares)'], ['saves', 'Saves'], ['avg_watch_seconds', 'Average watch time (seconds)'], ['completion_pct', 'Completion rate (%)']] as const).map(([k, label]) => (
            <Field key={k} label={label}><Input value={m[k] ?? ''} onChangeText={(v) => setM({ ...m, [k]: v })} keyboardType="decimal-pad" /></Field>
          ))}
          <Button label="Save" variant="primary" loading={busy === 'metrics'}
            onPress={() => act('metrics', async () => { await editor.metrics(metricsFor!.id, Object.fromEntries(Object.entries(m).filter(([, v]) => v.trim() !== ''))); setMetricsFor(null); }, 'Saved')} />
        </View>
      </Sheet>
    </Page>
  );
}
