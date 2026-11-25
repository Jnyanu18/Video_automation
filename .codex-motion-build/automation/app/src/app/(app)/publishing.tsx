import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Page, Row } from '../../components/Page';
import { Badge, Banner, Button, Card, Chips, EmptyState, ErrorState, Field, Input, SectionTitle, Skeleton, T } from '../../components/ui';
import { errorText } from '../../api/client';
import { editor, when, PlatformAccount, PublishItem } from '../../api/editor';
import { usePoll } from '../../state/usePoll';
import { useToast } from '../../state/toast';
import { Tone, spacing, useTheme } from '../../theme';

const TONE: Record<string, Tone> = {
  SCHEDULED: 'info',
  PUBLISHING: 'warning',
  PUBLISHED: 'success',
  FAILED: 'danger',
  CANCELED: 'neutral',
};

type Slot = 'now' | '1h' | 'tomorrow9' | 'tomorrow18' | 'custom';

function slotToIso(slot: Slot, custom: string): string | null | 'invalid' {
  const d = new Date();
  if (slot === 'now') return null;
  if (slot === '1h') d.setHours(d.getHours() + 1);
  else if (slot === 'tomorrow9' || slot === 'tomorrow18') {
    d.setDate(d.getDate() + 1);
    d.setHours(slot === 'tomorrow9' ? 9 : 18, 0, 0, 0);
  } else {
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
  const [queue, setQueue] = useState<PublishItem[]>([]);
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [videoPath, setVideoPath] = useState('');
  const [slot, setSlot] = useState<Slot>('now');
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const q = await editor.queue();
      setQueue(q || []);
    } catch {
      // keep existing
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await editor.accounts();
      setAccounts(res.accounts || []);
    } catch {
      // keep existing
    }
  }, []);

  const loadAll = useCallback(async () => {
    setErr(null);
    try {
      await Promise.all([loadQueue(), loadAccounts()]);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [loadQueue, loadAccounts]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Pre-fill from storyboard if params.sb is provided
  useEffect(() => {
    if (!params.sb) return;
    editor.storyboard(params.sb).then((sb) => {
      if (!sb) return;
      if (sb.storyboard?.title) {
        setTitle(sb.storyboard.title);
      } else if (sb.prompt) {
        setTitle(sb.prompt.slice(0, 50));
      }
      const cap =
        sb.posts?.instagram?.caption ||
        (sb.storyboard?.scenes && sb.storyboard.scenes.length > 0
          ? sb.storyboard.scenes[sb.storyboard.scenes.length - 1]?.caption
          : '') ||
        sb.storyboard?.title ||
        '';
      if (cap) setCaption(cap);

      const vp = sb.latest_render?.video_url || sb.video_path || '';
      setVideoPath(vp);
    }).catch((e) => {
      setErr(`Failed to load storyboard ${params.sb}: ${errorText(e)}`);
    });
  }, [params.sb]);

  // Poll queue when active jobs are in progress
  const hasActive = queue.some((p) => p.status === 'SCHEDULED' || p.status === 'PUBLISHING');
  usePoll(loadQueue, hasActive, 4000);

  const submit = async () => {
    if (!title.trim()) return setErr('Please provide a title');
    if (!caption.trim()) return setErr('Please provide a caption');
    const when_ = slotToIso(slot, custom);
    if (when_ === 'invalid') return setErr('Enter a future date and time like 2026-11-12 18:30');
    setErr(null);
    setBusy('schedule');
    try {
      await editor.schedule({
        title: title.trim(),
        caption: caption.trim(),
        slot,
        target_platforms: ['instagram'],
        platforms: ['instagram'],
        scheduled_at: when_,
        storyboard_id: params.sb || undefined,
      });
      toast(slot === 'now' ? 'Published to queue!' : 'Scheduled successfully!');
      await loadQueue();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const handleAction = async (id: string, action: 'cancel' | 'retry') => {
    setBusy(`${action}-${id}`);
    setErr(null);
    try {
      await editor.pubAction(id, action);
      toast(action === 'cancel' ? 'Post canceled' : 'Retrying post...');
      await loadQueue();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <Page title="Publishing" subtitle="Schedule finished reels and watch them go out">
        <Skeleton height={100} />
        <Skeleton height={260} />
      </Page>
    );
  }

  return (
    <Page title="Publishing" subtitle="Schedule finished reels and watch them go out">
      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}>
        {err ? <Banner tone="danger">{err}</Banner> : null}

        <Row style={{ alignItems: 'stretch' }}>
          {accounts.map((a) => (
            <Card key={a.platform} style={{ flexGrow: 1, flexBasis: 220, minWidth: 220 }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <T variant="h3">{a.label}</T>
                <Badge
                  label={a.connected ? 'Connected' : 'Disconnected'}
                  tone={a.connected ? 'success' : 'neutral'}
                  dot
                />
              </Row>
              <T variant="small" muted>Account: {a.account || 'Not configured'}</T>
              {a.detail ? <T variant="small" faint style={{ marginTop: 4 }}>{a.detail}</T> : null}
            </Card>
          ))}
          {accounts.length === 0 ? (
            <Card style={{ flexGrow: 1 }}>
              <T muted>No publishing accounts configured. Check Settings to connect Instagram.</T>
            </Card>
          ) : null}
        </Row>

        <Card style={{ gap: spacing.md }}>
          <SectionTitle title="Schedule a reel" />
          {videoPath ? (
            <Field label="Video source" hint={params.sb ? `Storyboard: ${params.sb}` : undefined}>
              <Input value={videoPath} editable={false} />
            </Field>
          ) : params.sb ? (
            <Field label="Video source" hint={`Storyboard: ${params.sb}`}>
              <Input value="Loading video path..." editable={false} />
            </Field>
          ) : null}
          <Field label="Title"><Input value={title} onChangeText={setTitle} placeholder="Give it a name" /></Field>
          <Field label="Caption"><Input value={caption} onChangeText={setCaption} multiline placeholder="Write your caption" /></Field>
          <Field label="When">
            <Chips
              options={[
                { value: 'now', label: 'Publish now' },
                { value: '1h', label: 'In 1 hour' },
                { value: 'tomorrow9', label: 'Tomorrow 09:00' },
                { value: 'tomorrow18', label: 'Tomorrow 18:00' },
                { value: 'custom', label: 'Pick a time' },
              ]}
              value={slot}
              onChange={(v: any) => v && setSlot(v)}
            />
          </Field>
          {slot === 'custom' ? (
            <Field label="Date & time" hint="Format: 2026-11-12 18:30">
              <Input value={custom} onChangeText={setCustom} placeholder="2026-11-12 18:30" />
            </Field>
          ) : null}
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button
                label={slot === 'now' ? 'Publish Now' : 'Schedule'}
                variant="primary"
                icon="send"
                onPress={submit}
                loading={busy === 'schedule'}
              />
            </View>
          </Row>
        </Card>

        <Card style={{ gap: spacing.md }}>
          <SectionTitle title={`Queue (${queue.length})`} />
          {queue.length === 0 ? (
            <EmptyState
              icon="send"
              title="No reels in the publishing queue yet"
              message="Schedule an approved and rendered reel above to queue it for publishing."
            />
          ) : (
            queue.map((p) => (
              <Card key={p.id} style={{ backgroundColor: colors.surfaceAlt, padding: spacing.md }}>
                <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Row gap={spacing.sm} style={{ marginBottom: spacing.xs }}>
                      <T variant="h3">{p.title}</T>
                      <Badge label={p.status} tone={TONE[p.status] || 'neutral'} />
                    </Row>
                    <T variant="small" muted>
                      {p.status === 'PUBLISHED'
                        ? `Published ${when(p.published_at)}`
                        : p.scheduled_at
                        ? `Scheduled for ${when(p.scheduled_at)}`
                        : 'Scheduled immediately'}
                      {p.platforms && p.platforms.length > 0 ? ` • ${p.platforms.join(', ')}` : ''}
                    </T>
                  </View>
                </Row>
                {p.caption ? <T muted numberOfLines={2}>{p.caption}</T> : null}
                {p.video_url ? (
                  <T variant="small" faint style={{ marginTop: 4 }}>
                    Source: {p.video_url}
                  </T>
                ) : null}
                {p.error ? (
                  <View style={{ marginTop: spacing.sm }}>
                    <Banner tone="danger">{p.error.message || String(p.error)}</Banner>
                  </View>
                ) : null}
                {p.metrics ? (
                  <Row style={{ marginTop: spacing.sm, gap: spacing.md }}>
                    <T variant="small">👁️ {p.metrics.views ?? 0} views</T>
                    <T variant="small">❤️ {p.metrics.likes ?? 0} likes</T>
                    <T variant="small">💬 {p.metrics.comments ?? 0} comments</T>
                    <T variant="small">📤 {p.metrics.sends ?? 0} sends</T>
                  </Row>
                ) : null}
                <Row gap={spacing.sm} style={{ marginTop: spacing.sm, justifyContent: 'flex-end' }}>
                  {p.status === 'SCHEDULED' ? (
                    <Button
                      label="Cancel"
                      small
                      variant="ghost"
                      icon="x"
                      loading={busy === `cancel-${p.id}`}
                      onPress={() => handleAction(p.id, 'cancel')}
                    />
                  ) : null}
                  {p.status === 'FAILED' ? (
                    <>
                      <Button
                        label="Retry"
                        small
                        variant="primary"
                        icon="refresh"
                        loading={busy === `retry-${p.id}`}
                        onPress={() => handleAction(p.id, 'retry')}
                      />
                      <Button
                        label="Cancel"
                        small
                        variant="ghost"
                        icon="x"
                        loading={busy === `cancel-${p.id}`}
                        onPress={() => handleAction(p.id, 'cancel')}
                      />
                    </>
                  ) : null}
                </Row>
              </Card>
            ))
          )}
        </Card>
      </ScrollView>
    </Page>
  );
}
