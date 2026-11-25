import React, { useState } from 'react';
import { Platform, StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Page, Row } from '../../components/Page';
import { Badge, Banner, Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, SectionTitle, Skeleton, T } from '../../components/ui';
import { JobLog } from '../../components/studio';
import { VideoPlayer } from '../../components/VideoPlayer';
import { useWide } from '../../components/useWide';
import { absoluteUrl, errorText, post } from '../../api/client';
import { editor, num, when } from '../../api/editor';
import { useStoryboards } from '../../state/useStoryboards';
import { useToast } from '../../state/toast';
import { radius, spacing, useTheme } from '../../theme';
import { Icon } from '../../components/Icon';

export default function StoryboardScreen() {
  const router = useRouter();
  const toast = useToast();
  const wide = useWide();
  const { colors } = useTheme();
  const { list, current: sb, reload, error, loading } = useStoryboards();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function act(name: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(name);
    setErr(null);
    try {
      await fn();
      await reload();
      if (done) toast(done);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <Page>
        <Skeleton height={100} />
        <Skeleton height={240} />
      </Page>
    );
  }

  if (error && !list) {
    return (
      <Page>
        <ErrorState message={error} onRetry={reload} />
      </Page>
    );
  }

  const finalSb = sb || (list && list.length > 0 ? list[0] : null);

  if (!list?.length || !finalSb) {
    return (
      <Page>
        <EmptyState
          icon="layers"
          title="No storyboards yet"
          message="Upload raw footage and let the editor draft a cut. You review it here before anything is rendered."
          action={<Button label="Create a new reel" variant="primary" icon="plus" onPress={() => router.push('/new')} />}
        />
      </Page>
    );
  }

  const card = finalSb.storyboard;
  const agent = (finalSb as any).agent as { root: string; version_number: number; pending: string | null; kind?: string } | undefined;
  const sc = card?.scorecard;
  const rendering = finalSb.render_job?.status === 'running' || finalSb.render_job?.status === 'queued';
  const processing = finalSb.status === 'processing';
  const video = finalSb.latest_render ?? finalSb.latest_preview;
  const blockedByScorecard = sc?.status === 'FAIL';

  const quickPromptSuggestions = agent?.kind === 'motion'
    ? ['Make the hook bigger', 'Faster cuts', 'Change the closing line', 'Use different music']
    : ['Punch-in closer on hook', 'Add whoosh sound effect', 'Tighten pauses and cut filler', 'Add closing call to action'];

  return (
    <Page>
      {/* Status Alerts */}
      {err ? <Banner tone="danger">{err}</Banner> : null}
      {finalSb.approval_reset ? (
        <Banner tone="warning">
          You revised this storyboard after approving it, so the approval was withdrawn. Review the new cut and approve again.
        </Banner>
      ) : null}
      {finalSb.error ? <Banner tone="danger">{finalSb.error}</Banner> : null}
      {agent?.pending ? (
        <Banner tone="info">
          Your change request is in production. The new version replaces this one here as soon as it is ready.
        </Banner>
      ) : null}
      {finalSb.render_job?.status === 'failed' ? (
        <Banner tone="danger">Render failed: {finalSb.render_job.error}</Banner>
      ) : null}

      {/* Editor Active Progress */}
      {processing ? (
        <Card>
          <Row>
            <T variant="h2">The editor is working…</T>
          </Row>
          <JobLog events={finalSb.events} />
        </Card>
      ) : null}

      {/* 2. Balanced 2-Column Studio Workspace */}
      {card && !processing ? (
        <View style={[styles.cols, wide && { flexDirection: 'row', alignItems: 'flex-start' }]}>
          {/* ========================================================
              LEFT COLUMN: Scenes List & AI Director Revision Copilot
             ======================================================== */}
          <View style={{ flex: 1.35, gap: spacing.lg }}>
            {/* Scenes Breakdown */}
            <View style={{ gap: spacing.md }}>
              <SectionTitle
                title={`Scenes (${card.scenes_count})`}
                right={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Badge label={`${num(card.duration.output_seconds)}s target`} tone="info" />
                    <Badge label={`${card.duration.reduction_percent}% removed`} tone="success" />
                  </View>
                }
              />

              {card.scenes.map((s) => (
                <Card key={s.scene_number} style={{ gap: spacing.sm }}>
                  <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Row gap={spacing.xs}>
                      <View style={[styles.sceneNumberBadge, { backgroundColor: colors.primarySoft }]}>
                        <T style={{ fontWeight: '700', fontSize: 11, color: colors.primary }}>
                          #{s.scene_number}
                        </T>
                      </View>
                      <T variant="h3">{s.type}</T>
                    </Row>
                    <T variant="small" muted style={{ fontFamily: Platform.select({ web: 'monospace', default: 'System' }) }}>
                      {s.timestamp_output}
                    </T>
                  </Row>

                  <T style={{ fontSize: 14, fontWeight: '500', color: colors.text, marginTop: 2 }}>
                    {s.action}
                  </T>

                  <Row gap={spacing.xs} style={{ flexWrap: 'wrap' }}>
                    <Badge label={s.framing} tone="neutral" />
                    <Badge label={s.camera_motion} tone="neutral" />
                    <Badge label={`Source: ${s.source_range}`} tone="neutral" />
                  </Row>

                  {/* Caption Box */}
                  <View style={[styles.caption, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                    <T style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>
                      {s.caption}
                    </T>
                  </View>

                </Card>
              ))}
            </View>

            {/* Revise: sits under the scenes, in the flow of the page (never floats over the cards) */}
            <View style={{ gap: spacing.sm }}>
              <SectionTitle title="Ask for changes" />
              <Card style={{ gap: spacing.sm }}>
                {finalSb.agent_reply ? (
                  <View style={[styles.caption, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                    <T variant="small" faint style={{ fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' }}>Latest update</T>
                    <T style={{ fontSize: 13, color: colors.text }}>{finalSb.agent_reply}</T>
                  </View>
                ) : (
                  <T variant="small" muted>Describe what to change in plain language. A new version comes back here to review.</T>
                )}
                <View style={styles.chipSuggestions}>
                  {quickPromptSuggestions.map((prompt) => (
                    <Pressable
                      key={prompt}
                      onPress={() => setMsg((prev) => (prev ? `${prev}, ${prompt.toLowerCase()}` : prompt))}
                      style={({ pressed, hovered }: any) => [
                        styles.suggestionChip,
                        { backgroundColor: hovered ? colors.primarySoft : colors.surfaceAlt, borderColor: colors.border },
                        pressed && { opacity: 0.8 },
                        Platform.OS === 'web' && ({ cursor: 'pointer', transition: 'all 120ms ease' } as any),
                      ]}
                    >
                      <T variant="small" faint style={{ fontSize: 11 }}>+ {prompt}</T>
                    </Pressable>
                  ))}
                </View>
                <Input
                  value={msg}
                  onChangeText={setMsg}
                  multiline
                  placeholder="e.g. Make the hook bigger, swap scene 3 for a different product, change the closing line…"
                  editable={!busy && !rendering && !agent?.pending}
                />
                <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    label="Send request"
                    variant="primary"
                    icon="send"
                    loading={busy === 'chat'}
                    disabled={!msg.trim() || rendering || !!agent?.pending}
                    onPress={() =>
                      act(
                        'chat',
                        async () => {
                          // Films from the creative director are revised as a new version; engine cuts use the chat agent.
                          if (agent?.root) await post(`/api/editor/agent/jobs/${agent.root}/revise`, { message: msg.trim() });
                          else await editor.chat(finalSb.id, msg.trim());
                          setMsg('');
                        },
                        agent?.root ? 'Change request sent. A new version is in production.' : 'Revision started'
                      )
                    }
                  />
                  {msg.trim() ? <Button label="Clear" small variant="ghost" onPress={() => setMsg('')} /> : null}
                </Row>
                {finalSb.events.length ? <JobLog events={finalSb.events} title="What happened" /> : null}
              </Card>
            </View>
          </View>

          {/* ========================================================
              RIGHT COLUMN: Video Preview & Multi-Tab Inspector
             ======================================================== */}
          <View style={{ flex: 1, gap: spacing.md, minWidth: 320 }}>
            {/* Video Player Card */}
            <Card style={{ gap: spacing.md }}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <T variant="h3">
                  {finalSb.latest_render ? 'Final Render' : finalSb.latest_preview ? 'Preview Render' : 'Video Preview'}
                </T>
                {video ? (
                  <Badge label={finalSb.latest_render ? 'FINAL' : 'PREVIEW'} tone={finalSb.latest_render ? 'success' : 'info'} />
                ) : (
                  <Badge label="DRAFT" tone="neutral" />
                )}
              </Row>

              {rendering ? (
                <View style={[styles.renderBanner, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
                  <Icon name="sparkles" size={14} color={colors.primary} />
                  <T style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>
                    Rendering {finalSb.render_job?.quality || 'preview'}… processing in background.
                  </T>
                </View>
              ) : null}

              {video ? (
                <>
                  <VideoPlayer uri={absoluteUrl(video.video_url) as string} />
                  <View style={[styles.metaBar, { backgroundColor: colors.surfaceAlt }]}>
                    <T variant="small" muted style={{ fontSize: 11 }}>
                      {video.quality} · {num(video.duration)}s · {video.resolution} · {video.backend} · {when(video.created_at)}
                    </T>
                  </View>

                  {video.warnings.map((w, i) => (
                    <Banner key={i} tone="warning">{w}</Banner>
                  ))}
                </>
              ) : (
                <EmptyState
                  icon="film"
                  title="Nothing rendered yet"
                  message="Render a quick preview to check the cut, or approve and render the final."
                />
              )}

              <Row gap={spacing.sm} style={{ justifyContent: 'flex-end' }}>
                {finalSb.approved ? (
                  <Button
                    label="Withdraw approval"
                    icon="x"
                    small
                    disabled={!!busy || rendering || !!agent?.pending}
                    loading={busy === 'unapprove'}
                    onPress={() => act('unapprove', () => editor.unapprove(finalSb.id), 'Approval withdrawn')}
                  />
                ) : (
                  <Button
                    label="Approve cut"
                    icon="check"
                    small
                    disabled={finalSb.status !== 'ready' || blockedByScorecard || !!busy || rendering || !!agent?.pending}
                    hint={blockedByScorecard ? 'Scorecard has failing checks: revise first' : 'Wait for the cut to be ready'}
                    loading={busy === 'approve'}
                    onPress={() => act('approve', () => editor.approve(finalSb.id), 'Approved. You can render the final video.')}
                  />
                )}
                <Button
                  label="Preview"
                  icon="play"
                  small
                  disabled={finalSb.status !== 'ready' || !!busy || rendering || !!agent?.pending}
                  loading={busy === 'preview' || (rendering && finalSb.render_job?.quality === 'preview')}
                  onPress={() => act('preview', () => editor.render(finalSb.id, 'preview'), 'Preview render started')}
                />
                <Button
                  label="Final render"
                  icon="film"
                  small
                  disabled={!finalSb.approved || !!busy || rendering || !!agent?.pending}
                  hint={!finalSb.approved ? 'Approve the cut first' : undefined}
                  loading={busy === 'final' || (rendering && finalSb.render_job?.quality === 'final')}
                  onPress={() => act('final', () => editor.render(finalSb.id, 'final'), 'Final render started')}
                />
                {finalSb.latest_render ? (
                  <Button
                    label="Schedule & publish"
                    variant="primary"
                    icon="send"
                    small
                    disabled={!!busy || rendering || !!agent?.pending}
                    onPress={() => router.push({ pathname: '/publishing', params: { sb: finalSb.id } })}
                  />
                ) : null}
              </Row>
            </Card>

            {/* Subtle Danger Action */}
            <View style={{ alignItems: 'flex-start', marginTop: spacing.xs }}>
              <Button
                label="Delete this storyboard"
                variant="danger"
                icon="trash"
                small
                onPress={() => setConfirmDelete(true)}
              />
            </View>
          </View>
        </View>
      ) : null}

      {/* Storyboard Failure State */}
      {finalSb.status === 'failed' ? (
        <Card>
          <T variant="h2">This storyboard could not be generated</T>
          <T muted style={{ marginVertical: 8 }}>{finalSb.error}</T>
          <Row gap={spacing.sm}>
            <Button label="Start again" variant="primary" icon="refresh" onPress={() => router.push('/new')} />
            <Button label="Delete" variant="danger" icon="trash" onPress={() => setConfirmDelete(true)} />
          </Row>
        </Card>
      ) : null}

      {/* Delete Confirmation */}
      <ConfirmDialog
        visible={confirmDelete}
        danger
        title="Delete storyboard?"
        confirmLabel="Delete"
        message="The plan and working files will be permanently removed. Rendered videos in the media library will be kept."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          act('delete', () => editor.deleteStoryboard(finalSb.id), 'Deleted');
        }}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  cols: {
    gap: spacing.lg,
    flexDirection: 'column',
  },
  sceneNumberBadge: {
    width: 26,
    height: 20,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 3,
  },
  chipSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 2,
  },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  renderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  metaBar: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    marginTop: 6,
  },
});
