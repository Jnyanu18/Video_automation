import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';
import { Page, Row } from '../../components/Page';
import { Badge, Banner, Button, Card, Chips, EmptyState, Field, Input, SectionTitle, Skeleton, T } from '../../components/ui';
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

/** Vector brand logos for publishing platforms */
function PlatformLogo({ platform }: { platform: string }) {
  if (platform === 'instagram') {
    return (
      <View style={styles.instagramLogoBadge}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Rect x="2" y="2" width="20" height="20" rx="5" stroke="#FFFFFF" strokeWidth="2" />
          <Path
            d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <Path d="M17.5 6.5h.01" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </Svg>
      </View>
    );
  }

  if (platform === 'youtube_shorts' || platform === 'youtube') {
    return (
      <View style={styles.youtubeLogoBadge}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"
            fill="#FF0000"
          />
          <Path d="m9.75 15.02 5.75-3.27-5.75-3.27v6.54z" fill="#FFFFFF" />
        </Svg>
      </View>
    );
  }

  if (platform === 'x' || platform === 'twitter') {
    return (
      <View style={styles.xLogoBadge}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
            fill="#FFFFFF"
          />
        </Svg>
      </View>
    );
  }

  return null;
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
  const [connectPlatform, setConnectPlatform] = useState<string | null>(null);

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
      // Remove TikTok as requested
      const valid = (res.accounts || []).filter(
        (a) => a.platform !== 'tiktok' && a.platform.toLowerCase() !== 'tiktok'
      );
      setAccounts(valid);
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
    editor
      .storyboard(params.sb)
      .then((sb) => {
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
      })
      .catch((e) => {
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

  // Filter out any TikTok presence from display
  const displayAccounts = accounts.filter((a) => a.platform !== 'tiktok');

  return (
    <Page title="Publishing" subtitle="Schedule finished reels and watch them go out">
      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}>
        {err ? <Banner tone="danger">{err}</Banner> : null}

        {/* =========================================================================
            PLATFORM ACCOUNTS (With Real Brand Logos, TikTok Removed)
            ========================================================================= */}
        <Row style={{ alignItems: 'stretch' }}>
          {displayAccounts.map((a) => (
            <Card key={a.platform} style={{ flexGrow: 1, flexBasis: 240, minWidth: 240, padding: spacing.md }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm, alignItems: 'center' }}>
                <Row gap={8} style={{ alignItems: 'center' }}>
                  <PlatformLogo platform={a.platform} />
                  <T variant="h3">{a.label}</T>
                </Row>
                <Badge
                  label={a.connected ? 'Connected' : 'Disconnected'}
                  tone={a.connected ? 'success' : 'neutral'}
                  dot
                />
              </Row>
              <T variant="small" muted>
                Account: {a.account || 'Not configured'}
              </T>
              {a.detail && !a.detail.includes('Publishing adapter not reachable') ? (
                <T variant="small" faint style={{ marginTop: 4 }}>
                  {a.detail}
                </T>
              ) : null}
              {!a.connected ? (
                <View style={{ marginTop: spacing.md, alignItems: 'flex-start', gap: spacing.sm }}>
                  <Button
                    label="Connect"
                    variant="secondary"
                    small
                    onPress={() => setConnectPlatform(connectPlatform === a.platform ? null : a.platform)}
                  />
                  {connectPlatform === a.platform ? (
                    <T variant="small" muted>
                      {a.platform === 'instagram'
                        ? 'Connect Instagram in Postiz, then configure the publishing adapter and refresh this page to check the connection.'
                        : `${a.label} connection is not available yet. A publishing connector must be configured before this account can be linked.`}
                    </T>
                  ) : null}
                </View>
              ) : null}
            </Card>
          ))}
          {displayAccounts.length === 0 ? (
            <Card style={{ flexGrow: 1 }}>
              <T muted>No publishing accounts configured. Check Settings to connect Instagram.</T>
            </Card>
          ) : null}
        </Row>

        {/* =========================================================================
            SCHEDULE A REEL FORM (Clean single action button, no duplicate Publish Now)
            ========================================================================= */}
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
          <Field label="Title">
            <Input value={title} onChangeText={setTitle} placeholder="Give it a name" />
          </Field>
          <Field label="Caption">
            <Input value={caption} onChangeText={setCaption} multiline placeholder="Write your caption" />
          </Field>

          {/* When Selector with clean timing options */}
          <Field label="When">
            <Chips
              options={[
                { value: 'now', label: 'Immediately' },
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

          {/* Single clear action button */}
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button
                label={slot === 'now' ? 'Publish Now' : 'Schedule Post'}
                variant="primary"
                icon="send"
                onPress={submit}
                loading={busy === 'schedule'}
              />
            </View>
          </Row>
        </Card>

        {/* =========================================================================
            QUEUE LIST
            ========================================================================= */}
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
                {p.caption ? (
                  <T muted numberOfLines={2}>
                    {p.caption}
                  </T>
                ) : null}
                {p.error && !String(p.error.message || p.error).includes('Publishing adapter not reachable') ? (
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
                        label="Dismiss"
                        small
                        variant="ghost"
                        icon="trash"
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

const styles = StyleSheet.create({
  instagramLogoBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#E1306C',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      } as any,
    }),
  },
  youtubeLogoBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xLogoBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#0F1419',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2F3336',
  },
});
