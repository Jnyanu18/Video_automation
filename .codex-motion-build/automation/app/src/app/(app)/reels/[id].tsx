import React, { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../components/Screen';
import {
  Badge, Banner, Button, Card, ConfirmDialog, ErrorState, Field, Input, LinkText, SectionTitle, Skeleton, StatusBadge, T,
} from '../../../components/ui';
import { ProgressSteps, timeAgo } from '../../../components/ReelParts';
import { VideoPlayer } from '../../../components/VideoPlayer';
import { Icon } from '../../../components/Icon';
import { absoluteUrl, ApiError, errorLabel, errorText, get, post } from '../../../api/client';
import { editor } from '../../../api/editor';
import type { ActionState, ReelDetail } from '../../../api/types';
import { useQuery } from '../../../state/useQuery';
import { useToast } from '../../../state/toast';
import { spacing, useTheme } from '../../../theme';
import { useWide } from '../../../components/useWide';

type ActionKey = keyof NonNullable<ReelDetail['actions']>;

const normalizeTags = (s: string) =>
  s.split(/[\s,]+/).filter(Boolean).map((t) => (t.startsWith('#') ? t : '#' + t));

export default function ReelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const wide = useWide();
  const { colors } = useTheme();

  const [dirty, setDirty] = useState(false);
  const [script, setScript] = useState('');
  const [caption, setCaption] = useState('');
  const [overlay, setOverlay] = useState('');
  const [tags, setTags] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<ActionKey | null>(null);
  const [confirm, setConfirm] = useState<null | 'publish' | 'reject'>(null);

  // Seamlessly redirect if id starts with 'sb'
  useEffect(() => {
    if (id && id.startsWith('sb')) {
      router.replace({ pathname: '/storyboard', params: { sb: id } });
    }
  }, [id, router]);

  // Live refreshes are paused while the user has unsaved edits so we never clobber typing.
  const { data: reel, error, loading, refreshing, refresh, retry, reload, setData } = useQuery<ReelDetail>(
    async () => {
      if (id?.startsWith('sb')) {
        router.replace({ pathname: '/storyboard', params: { sb: id } });
        return {} as ReelDetail;
      }
      try {
        const res = await get(`/api/reels/${encodeURIComponent(id)}`);
        return res.reel;
      } catch (e: any) {
        const is404 = (e instanceof ApiError && (e.status === 404 || e.code === 'NOT_FOUND')) ||
          e?.status === 404 || e?.code === 'NOT_FOUND' || (typeof e?.message === 'string' && /404|not found/i.test(e.message));
        const isNetwork = (e instanceof ApiError && e.code === 'NETWORK') ||
          e?.code === 'NETWORK' || (typeof e?.message === 'string' && /network|cannot reach/i.test(e.message));

        if (is404 || isNetwork) {
          try {
            const sbData = await editor.storyboard(id);
            if (sbData?.id) {
              router.replace({ pathname: '/storyboard', params: { sb: id } });
              return {} as ReelDetail;
            }
          } catch {
            if (is404) {
              router.replace({ pathname: '/storyboard', params: { sb: id } });
              return {} as ReelDetail;
            }
          }
        }
        throw e;
      }
    },
    [id],
    { paused: dirty },
  );

  // If fetching returns 404 / NOT_FOUND / network error, check storyboard fallback or redirect
  useEffect(() => {
    if (!id || id.startsWith('sb')) return;
    if (error && /404|not found|network|cannot reach/i.test(error)) {
      editor.storyboard(id)
        .then((sb) => {
          if (sb?.id) {
            router.replace({ pathname: '/storyboard', params: { sb: id } });
          }
        })
        .catch(() => {
          if (/404|not found/i.test(error)) {
            router.replace({ pathname: '/storyboard', params: { sb: id } });
          }
        });
    }
  }, [id, error, router]);

  // Hydrate the form from the server whenever a fresh copy arrives and nothing is being edited.
  useEffect(() => {
    if (!reel || dirty) return;
    setScript(reel.content?.script ?? '');
    setCaption(reel.content?.caption ?? '');
    setOverlay(reel.content?.overlay ?? '');
    setTags((reel.content?.hashtags ?? []).join(' '));
  }, [reel, dirty]);

  const edit = (setter: (v: string) => void) => (v: string) => { setter(v); setDirty(true); };

  async function run(key: ActionKey, fn: () => Promise<unknown>, okMsg: string) {
    setBusy(key);
    try {
      await fn();
      toast(okMsg);
      setDirty(false);
      await reload();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'STALE_CONTENT') {
        toast('This reel changed elsewhere. Reloaded the latest version.', true);
        setDirty(false);
        await reload();
      } else {
        toast(errorText(e), true);
      }
    } finally {
      setBusy(null);
    }
  }

  const base = `/api/reels/${encodeURIComponent(id)}`;
  const fp = () => ({ expectedFingerprint: reel!.fingerprint });
  const A = (k: ActionKey): ActionState => reel?.actions?.[k] ?? { allowed: false, reason: 'Not available' };

  const save = () => run('edit', async () => {
    const r = await post(`${base}/edit`, { ...fp(), script, caption, overlay, hashtags: normalizeTags(tags) });
    if (r.fingerprint && reel) setData({ ...reel, fingerprint: r.fingerprint });
  }, 'Changes saved');

  const videoUri = absoluteUrl(reel?.video?.previewUrl || reel?.video?.url);
  const reasonOk = note.trim().length >= 3;

  return (
    <Screen title={reel?.title || (loading ? 'Loading…' : 'Reel')} onBack={() => router.canGoBack() ? router.back() : router.navigate('/reels')}
      onRefresh={refresh} refreshing={refreshing}
      actions={reel ? <StatusBadge status={reel.status} /> : undefined}>
      {loading && !reel ? <View style={{ gap: spacing.md }}><Skeleton height={80} /><Skeleton height={220} /><Skeleton height={160} /></View> : null}
      {error && !reel ? (
        <View style={{ gap: spacing.md }}>
          <Banner tone="info">
            <View style={{ gap: spacing.sm }}>
              <T variant="h3">Open in Unified Video Engine?</T>
              <T variant="small">
                This reel could not be found in the database. If this is a storyboard or new video cut, open it directly in the editor:
              </T>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' }}>
                <Button
                  label="Open Storyboard"
                  icon="sparkles"
                  variant="primary"
                  small
                  onPress={() => router.replace({ pathname: '/storyboard', params: { sb: id } })}
                />
                <Button
                  label="Multi-track Timeline"
                  icon="film"
                  variant="secondary"
                  small
                  onPress={() => router.replace({ pathname: '/timeline', params: { sb: id } })}
                />
              </View>
            </View>
          </Banner>
          <ErrorState message={error} onRetry={retry} />
        </View>
      ) : null}

      {reel ? (
        <>
          {/* Prominent banner guiding users into the unified editing engine */}
          <Card style={[styles.unifiedCard, { borderColor: colors.primary, backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.unifiedInner}>
              <View style={[styles.unifiedIconWrap, { backgroundColor: colors.primarySoft }]}>
                <Icon name="sparkles" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <T variant="h3">Unified Video Editing Engine</T>
                  <Badge label="Native Studio" tone="info" />
                </View>
                <T variant="small" muted>
                  Review AI storyboard cues, re-cut scenes, or edit timings on the multi-track timeline.
                </T>
              </View>
              <View style={styles.unifiedActions}>
                <Button
                  label="Open Storyboard"
                  icon="sparkles"
                  variant="primary"
                  small
                  onPress={() => router.push({ pathname: '/storyboard', params: { sb: id } })}
                />
                <Button
                  label="Multi-track Timeline"
                  icon="film"
                  variant="secondary"
                  small
                  onPress={() => router.push({ pathname: '/timeline', params: { sb: id } })}
                />
              </View>
            </View>
          </Card>

          <View style={styles.metaRow}>
            {reel.busy ? <Badge label="Working…" tone="info" /> : null}
            {reel.stuck ? <Badge label="Stuck" tone="warning" /> : null}
            <T variant="small" faint>Updated {timeAgo(reel.updatedAt) || '—'}</T>
          </View>

          {reel.status === 'FAILED' && reel.error ? <Banner tone="danger">{errorLabel(reel.error)}</Banner> : null}

          {reel.progress?.length ? <Card><SectionTitle title="Progress" /><ProgressSteps steps={reel.progress} /></Card> : null}

          <View style={[styles.cols, wide && { flexDirection: 'row', alignItems: 'flex-start' }]}>
            <View style={[styles.col, wide && { flex: 5 }]}>
              <Card>
                <SectionTitle title="Generated content" />
                <View style={{ gap: spacing.lg }}>
                  <Field label="Script"><Input value={script} onChangeText={edit(setScript)} multiline style={{ minHeight: 140 }} editable={A('edit').allowed} /></Field>
                  <Field label="Caption"><Input value={caption} onChangeText={edit(setCaption)} multiline editable={A('edit').allowed} /></Field>
                  <Field label="On-screen overlay"><Input value={overlay} onChangeText={edit(setOverlay)} editable={A('edit').allowed} /></Field>
                  <Field label="Hashtags" hint="Separate with spaces."><Input value={tags} onChangeText={edit(setTags)} autoCapitalize="none" editable={A('edit').allowed} /></Field>
                  <View style={styles.rowEnd}>
                    {dirty ? <T variant="small" color={colors.warning}>Unsaved changes</T> : null}
                    <Button label="Save changes" icon="check" disabled={!A('edit').allowed || !dirty} hint={A('edit').reason} loading={busy === 'edit'} onPress={save} />
                  </View>
                </View>
              </Card>

              <Card>
                <SectionTitle title="Source" />
                <View style={{ gap: spacing.sm }}>
                  {reel.reelUrl ? <LinkText href={reel.reelUrl}>{reel.reelUrl}</LinkText> : null}
                  <T variant="small" muted>
                    {[reel.source?.owner ? '@' + reel.source.owner : '', reel.source?.duration ? Math.round(reel.source.duration) + 's' : '', reel.niche, reel.brandVoice].filter(Boolean).join(' · ') || 'Uploaded video'}
                  </T>
                  {reel.source?.transcript ? <View style={[styles.quote, { backgroundColor: colors.surfaceAlt }]}><T variant="small" selectable>{reel.source.transcript}</T></View>
                    : <T variant="small" faint>No transcript available.</T>}
                </View>
              </Card>
            </View>

            <View style={[styles.col, wide && { flex: 4 }]}>
              <Card>
                <SectionTitle title="Video" />
                {videoUri ? (
                  <View style={{ gap: spacing.md, alignItems: 'center' }}>
                    <VideoPlayer uri={videoUri} poster={reel.video?.thumbnailUrl} />
                    <View style={{ width: '100%', maxWidth: 320, gap: spacing.xs }}>
                      <Button
                        label="Download MP4 for Instagram"
                        icon="download"
                        variant="primary"
                        full
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            const a = document.createElement('a');
                            a.href = videoUri;
                            a.download = `${reel.title || reel.key || 'reel'}.mp4`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          } else {
                            Linking.openURL(videoUri);
                          }
                        }}
                      />
                      <Button
                        label="Open in Storyboard"
                        icon="sparkles"
                        small
                        onPress={() => router.push({ pathname: '/storyboard', params: { sb: id } })}
                      />
                    </View>
                  </View>
                ) : <T muted>{reel.video?.status ? `Video: ${reel.video.status.toLowerCase()}` : 'No video yet. It appears here once generation finishes.'}</T>}
                {reel.publishedUrl ? <View style={{ marginTop: spacing.md }}><LinkText href={reel.publishedUrl}>View on Instagram</LinkText></View> : null}
              </Card>

              <Card>
                <SectionTitle title="Decide" />
                <View style={{ gap: spacing.md }}>
                  <View style={styles.actions}>
                    <Button label="Approve" variant="primary" icon="check" full disabled={!A('approve').allowed} hint={A('approve').reason}
                      loading={busy === 'approve'} onPress={() => run('approve', () => post(`${base}/approve`, fp()), 'Approved. Video generation started.')} />
                    <Button label="Publish to Instagram" variant="primary" icon="send" full disabled={!A('publish').allowed} hint={A('publish').reason}
                      loading={busy === 'publish'} onPress={() => setConfirm('publish')} />
                  </View>
                  {!A('approve').allowed && A('approve').reason && reel.status === 'AWAITING_APPROVAL' ? <T variant="small" faint>{A('approve').reason}</T> : null}
                  <Field label="Reason or note" hint="Required (3+ characters) to reject. Optional guidance when regenerating.">
                    <Input value={note} onChangeText={setNote} placeholder="e.g. Tone is too salesy" />
                  </Field>
                  <View style={styles.actions}>
                    <Button label="Regenerate" icon="refresh" disabled={!A('regenerate').allowed} hint={A('regenerate').reason} loading={busy === 'regenerate'}
                      onPress={() => run('regenerate', () => post(`${base}/regenerate`, { ...fp(), ...(note.trim() ? { note: note.trim() } : {}) }), 'Regenerating content…')} />
                    <Button label="Reject" variant="danger" icon="x" disabled={!A('reject').allowed || !reasonOk}
                      hint={!A('reject').allowed ? A('reject').reason : 'Add a reason first'} loading={busy === 'reject'} onPress={() => setConfirm('reject')} />
                  </View>
                  {(A('retry').allowed || A('resume').allowed) ? (
                    <View style={styles.actions}>
                      {A('retry').allowed ? <Button label="Retry failed step" icon="refresh" loading={busy === 'retry'} onPress={() => run('retry', () => post(`${base}/retry`, {}), 'Retrying…')} /> : null}
                      {A('resume').allowed ? <Button label="Resume" icon="play" loading={busy === 'resume'} onPress={() => run('resume', () => post(`${base}/resume`, {}), 'Resuming…')} /> : null}
                    </View>
                  ) : null}
                  {reel.approval?.maxRegenerations != null ? (
                    <T variant="small" faint>Regenerations used: {reel.approval.regenerations ?? 0} of {reel.approval.maxRegenerations}</T>
                  ) : null}
                </View>
              </Card>

              {reel.errors?.length ? (
                <Card>
                  <SectionTitle title="Error history" />
                  <View style={{ gap: spacing.sm }}>
                    {reel.errors.map((e, i) => (
                      <T key={i} variant="small" color={colors.danger}>
                        {typeof e === 'string' ? e : [e.at ? timeAgo(e.at) : '', e.stage, e.message || e.code].filter(Boolean).join(' · ')}
                      </T>
                    ))}
                  </View>
                </Card>
              ) : null}
            </View>
          </View>
        </>
      ) : null}

      <ConfirmDialog visible={confirm === 'publish'} title="Publish to Instagram?" message="This posts the reel to your connected Instagram account right away."
        confirmLabel="Publish now" onCancel={() => setConfirm(null)}
        onConfirm={() => { setConfirm(null); run('publish', () => post(`${base}/publish`, fp()), 'Publishing requested.'); }} />
      <ConfirmDialog visible={confirm === 'reject'} danger title="Reject this reel?" message="It will not be generated or published. Your note is saved with the rejection."
        confirmLabel="Reject reel" onCancel={() => setConfirm(null)}
        onConfirm={() => { setConfirm(null); run('reject', () => post(`${base}/reject`, { ...fp(), reason: note.trim() }), 'Reel rejected.'); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginTop: -spacing.sm },
  cols: { gap: spacing.lg },
  col: { gap: spacing.lg },
  rowEnd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quote: { padding: spacing.md, borderRadius: 10 },
  unifiedCard: { padding: spacing.md, borderWidth: 1.5, borderRadius: 12, marginBottom: spacing.xs },
  unifiedInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  unifiedIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  unifiedActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
});
