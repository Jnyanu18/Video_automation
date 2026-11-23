import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Page, Row } from '../../components/Page';
import { Badge, Banner, Button, Card, Chips, ConfirmDialog, EmptyState, ErrorState, Input, SectionTitle, Skeleton, T } from '../../components/ui';
import { ChecksList, JobLog, STAGE_LABEL, checkTone, stageTone, titleOf } from '../../components/studio';
import { VideoPlayer } from '../../components/VideoPlayer';
import { useWide } from '../../components/useWide';
import { absoluteUrl, errorText, post } from '../../api/client';
import { editor, num, pct, when } from '../../api/editor';
import { useStoryboards } from '../../state/useStoryboards';
import { useToast } from '../../state/toast';
import { radius, spacing, useTheme } from '../../theme';
import { StudioTabs } from '../../components/StudioTabs';
import { Icon, IconName } from '../../components/Icon';

type InspectorTabKey = 'qa' | 'copy' | 'audio' | 'director';

export default function StoryboardScreen() {
  const router = useRouter();
  const toast = useToast();
  const wide = useWide();
  const { colors } = useTheme();
  const { list, current: sb, select, reload, error, loading } = useStoryboards();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTabKey>('qa');
  const [music, setMusic] = useState<{ tracks: { id: string; name: string }[]; note: string | null } | null>(null);

  useEffect(() => {
    editor.vsMusic().then(setMusic).catch(() => setMusic(null));
  }, []);

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
  const sc = card?.scorecard;
  const rendering = finalSb.render_job?.status === 'running' || finalSb.render_job?.status === 'queued';
  const processing = finalSb.status === 'processing';
  const video = finalSb.latest_render ?? finalSb.latest_preview;
  const blockedByScorecard = sc?.status === 'FAIL';

  const quickPromptSuggestions = [
    'Punch-in closer on hook',
    'Add whoosh sound effect',
    'Tighten pauses and cut filler',
    'Add closing call to action',
  ];

  return (
    <Page>
      {/* 1. Unified Project Hero Bar */}
      <StudioTabs
        activeTab="storyboard"
        sbId={finalSb.id}
        title={titleOf(finalSb)}
        subtitle={
          card
            ? `${num(card.duration.original_seconds)}s footage cut to ${num(card.duration.output_seconds)}s (${pct(card.duration.reduction_percent)} cut) · Style: ${finalSb.style}`
            : `Style: ${finalSb.style}`
        }
        stage={finalSb.stage}
        approved={finalSb.approved}
        approvedAt={finalSb.approved_at}
        scorecard={sc}
        seriesEpisode={finalSb.series?.episode}
        canApprove={finalSb.status === 'ready' && !blockedByScorecard}
        approvalBlockedHint={blockedByScorecard ? 'Scorecard has failing checks: revise first' : 'Nothing to approve yet'}
        approveLoading={busy === 'approve'}
        unapproveLoading={busy === 'unapprove'}
        rendering={rendering}
        onApprove={() => act('approve', () => editor.approve(finalSb.id), 'Approved. You can render the final video.')}
        onUnapprove={() => act('unapprove', () => editor.unapprove(finalSb.id), 'Approval withdrawn')}
        onPreviewRender={() => act('preview', () => editor.render(finalSb.id, 'preview'), 'Preview render started')}
        onFinalRender={finalSb.approved ? () => act('final', () => editor.render(finalSb.id, 'final'), 'Final render started') : undefined}
      />

      {/* Status Alerts */}
      {err ? <Banner tone="danger">{err}</Banner> : null}
      {finalSb.approval_reset ? (
        <Banner tone="warning">
          You revised this storyboard after approving it, so the approval was withdrawn. Review the new cut and approve again.
        </Banner>
      ) : null}
      {finalSb.error ? <Banner tone="danger">{finalSb.error}</Banner> : null}
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

                  {/* Karaoke Caption Box */}
                  <View style={[styles.caption, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                    <Row gap={6} style={{ marginBottom: 2 }}>
                      <Icon name="sparkles" size={12} color={colors.primary} />
                      <T variant="small" faint style={{ fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                        Karaoke Subtitle ({s.caption_style})
                      </T>
                    </Row>
                    <T style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>
                      {s.caption}
                    </T>
                  </View>

                  {/* Sound FX Tags */}
                  {s.sfx.length ? (
                    <Row gap={spacing.xs} style={{ marginTop: 2 }}>
                      {s.sfx.map((x, i) => (
                        <Badge key={i} label={`♪ ${x.name} @ ${num(x.at)}s`} tone="info" />
                      ))}
                    </Row>
                  ) : null}
                </Card>
              ))}
            </View>

            {/* AI Director Revision Copilot */}
            <View style={{ gap: spacing.sm }}>
              <SectionTitle title="Revise with AI Director" />
              <Card style={{ gap: spacing.sm }}>
                <T variant="small" muted>
                  Describe edits in plain language. The AI re-cuts footage, pacing, subtitles, and audio.
                </T>

                {/* Quick Suggestion Chips */}
                <View style={styles.chipSuggestions}>
                  {quickPromptSuggestions.map((prompt) => (
                    <Pressable
                      key={prompt}
                      onPress={() => setMsg((prev) => (prev ? `${prev}, ${prompt.toLowerCase()}` : prompt))}
                      style={({ pressed, hovered }: any) => [
                        styles.suggestionChip,
                        {
                          backgroundColor: hovered ? colors.primarySoft : colors.surfaceAlt,
                          borderColor: colors.border,
                        },
                        pressed && { opacity: 0.8 },
                        Platform.OS === 'web' && ({ cursor: 'pointer', transition: 'all 120ms ease' } as any),
                      ]}
                    >
                      <T variant="small" faint style={{ fontSize: 11 }}>
                        + {prompt}
                      </T>
                    </Pressable>
                  ))}
                </View>

                <Input
                  value={msg}
                  onChangeText={setMsg}
                  multiline
                  placeholder="e.g. Punch in closer on the speaker, add a whoosh sound effect on scene 1, and add a strong call-to-action line at the end..."
                  editable={!busy && !rendering}
                />

                <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Button
                    label="Send revision to AI"
                    variant="primary"
                    icon="send"
                    loading={busy === 'chat'}
                    disabled={!msg.trim() || rendering}
                    onPress={() =>
                      act(
                        'chat',
                        async () => {
                          await editor.chat(finalSb.id, msg.trim());
                          setMsg('');
                        },
                        'Revision started'
                      )
                    }
                  />
                  {msg.trim() ? (
                    <Button label="Clear" small variant="ghost" onPress={() => setMsg('')} />
                  ) : null}
                </Row>

                {finalSb.agent_reply ? (
                  <View style={[styles.caption, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, marginTop: spacing.xs }]}>
                    <T variant="small" faint style={{ fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                      Last AI Reply
                    </T>
                    <T style={{ fontSize: 13, color: colors.text }}>{finalSb.agent_reply}</T>
                  </View>
                ) : null}

                {finalSb.events.length ? (
                  <View style={{ marginTop: spacing.xs }}>
                    <JobLog events={finalSb.events} title="What the agent did" />
                  </View>
                ) : null}
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

                  {finalSb.latest_render ? (
                    <View style={{ gap: spacing.xs }}>
                      <Button
                        label="Schedule & publish"
                        variant="primary"
                        icon="send"
                        onPress={() => router.push({ pathname: '/publishing', params: { sb: finalSb.id } })}
                      />
                      <Button
                        label="Send to approval pipeline"
                        icon="upload"
                        loading={busy === 'pipeline'}
                        onPress={() =>
                          act('pipeline', async () => {
                            try {
                              const r = await post<{ recordId: string }>('/api/reels/upload', {
                                uploadId: finalSb.latest_render!.render_id,
                                caption: (card.scenes[card.scenes.length - 1]?.caption || card.title).slice(0, 200) || card.title,
                              });
                              if (r && r.recordId) {
                                router.push({ pathname: '/reels/[id]', params: { id: r.recordId } });
                                return;
                              }
                              router.push({ pathname: '/publishing', params: { sb: finalSb.id } });
                            } catch (_e) {
                              toast('Approval pipeline unavailable, directing to native publishing');
                              router.push({ pathname: '/publishing', params: { sb: finalSb.id } });
                            }
                          })
                        }
                      />
                    </View>
                  ) : null}
                </>
              ) : (
                <EmptyState
                  icon="film"
                  title="Nothing rendered yet"
                  message="Render a quick preview to check the cut, or approve and render the final."
                />
              )}
            </Card>

            {/* Multi-Tab Studio Inspector Card */}
            <Card style={{ gap: spacing.md, padding: spacing.md }}>
              {/* Inspector Tab Switcher */}
              <View style={[styles.inspectorTabBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                {[
                  { key: 'qa' as InspectorTabKey, label: 'Quality & QA', icon: 'check-circle' as IconName },
                  { key: 'copy' as InspectorTabKey, label: 'Social Copy', icon: 'share' as IconName },
                  { key: 'audio' as InspectorTabKey, label: 'Audio & Music', icon: 'music' as IconName },
                  ...(finalSb.director ? [{ key: 'director' as InspectorTabKey, label: 'Director Plan', icon: 'sparkles' as IconName }] : []),
                ].map((tab) => {
                  const on = inspectorTab === tab.key;
                  return (
                    <Pressable
                      key={tab.key}
                      onPress={() => setInspectorTab(tab.key)}
                      style={({ pressed, hovered }: any) => [
                        styles.inspectorTabBtn,
                        on && [
                          styles.inspectorTabBtnActive,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            ...(Platform.OS === 'web' ? ({ boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)' } as any) : {}),
                          },
                        ],
                        !on && hovered && { backgroundColor: colors.surface + '66' },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Icon name={tab.icon} size={13} color={on ? colors.primary : colors.textMuted} />
                      <T
                        variant="label"
                        style={{
                          fontWeight: on ? '700' : '500',
                          fontSize: 11,
                          color: on ? colors.primary : colors.textMuted,
                        }}
                      >
                        {tab.label}
                      </T>
                    </Pressable>
                  );
                })}
              </View>

              {/* Tab 1: Quality & QA */}
              {inspectorTab === 'qa' && (
                <View style={{ gap: spacing.md }}>
                  {/* Scorecard Overview */}
                  <View style={{ gap: spacing.xs }}>
                    <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <T variant="h3">Automated Scorecard</T>
                      {sc?.available ? (
                        <Badge
                          label={`${sc.status}${typeof sc.score === 'number' && !isNaN(sc.score) ? ' · ' + Math.round(sc.score * 100) + '%' : ''}`}
                          tone={checkTone(sc.status === 'PASS' ? 'pass' : sc.status === 'WARN' ? 'warn' : 'fail')}
                        />
                      ) : null}
                    </Row>

                    {sc?.available ? (
                      <>
                        <ChecksList checks={sc.checks} />
                        <T variant="small" faint style={{ marginTop: 4, fontSize: 10 }}>
                          Objective verification only. Scorecard evaluates pacing, hook length, and compliance.
                        </T>
                      </>
                    ) : (
                      <T muted style={{ fontSize: 12 }}>The scorecard could not run: {sc?.reason || 'unknown reason'}.</T>
                    )}
                  </View>

                  {/* Growth Signals */}
                  {card.growth_signals ? (
                    <View style={{ gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
                      <T variant="h3">Growth Signals</T>
                      {([['3-second hook', card.growth_signals.three_second_hook], ['Share trigger', card.growth_signals.sendability]] as const).map(
                        ([label, s]) =>
                          s ? (
                            <View key={label} style={{ gap: 2, paddingVertical: 4 }}>
                              <Row gap={spacing.sm}>
                                <T variant="label" style={{ fontWeight: '600' }}>{label}</T>
                                <Badge label={s.status.toUpperCase()} tone={checkTone(s.status)} />
                              </Row>
                              <T variant="small" muted>{s.detail}</T>
                            </View>
                          ) : null
                      )}
                    </View>
                  ) : null}

                  {/* Audio Specs */}
                  {card.sound_design ? (
                    <View style={{ gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
                      <T variant="h3">Audio Balance</T>
                      <Row gap={spacing.xs} style={{ flexWrap: 'wrap' }}>
                        <Badge label={`${card.sound_design.sfx_count ?? 0} sound effects`} tone="info" />
                        <Badge label={card.sound_design.music ? 'Music bed' : 'No music'} tone="neutral" />
                        <Badge label={card.sound_design.ducking_enabled ? 'Ducking on' : 'No ducking'} tone="neutral" />
                        <Badge label={card.sound_design.target_lufs ? `${card.sound_design.target_lufs} LUFS` : 'Loudness unset'} tone="neutral" />
                      </Row>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Tab 2: Social Copy & Distribution */}
              {inspectorTab === 'copy' && (
                <View style={{ gap: spacing.md }}>
                  <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <T variant="h3">Publishing Copy</T>
                    {finalSb.posts ? (
                      <Button
                        label="Write again"
                        small
                        icon="edit"
                        loading={busy === 'posts'}
                        onPress={() => act('posts', () => editor.posts(finalSb.id), 'Post text written')}
                      />
                    ) : null}
                  </Row>

                  {finalSb.posts ? (
                    <View style={{ gap: spacing.sm }}>
                      <Badge
                        label={finalSb.posts.generated_by === 'llm' ? 'AI Written from Transcript' : 'Template Copy'}
                        tone={finalSb.posts.generated_by === 'llm' ? 'success' : 'warning'}
                      />
                      <Pasteable label="Instagram Caption" text={finalSb.posts.instagram.caption} />
                      {finalSb.posts.instagram.cover_text ? (
                        <Pasteable label="Cover Text" text={finalSb.posts.instagram.cover_text} />
                      ) : null}
                      <Pasteable label="YouTube Short Title" text={finalSb.posts.youtube_short.title} />
                      <Pasteable label="YouTube Short Description" text={finalSb.posts.youtube_short.description} />
                      <Pasteable label="X / Twitter Post" text={finalSb.posts.x.post} />
                    </View>
                  ) : (
                    <View style={{ gap: spacing.sm }}>
                      <T muted style={{ fontSize: 12 }}>
                        Generate high-converting captions, titles, and tags directly from what was said in the video.
                      </T>
                      <Button
                        label="Generate post copy"
                        variant="primary"
                        icon="edit"
                        loading={busy === 'posts'}
                        onPress={() => act('posts', () => editor.posts(finalSb.id), 'Post text written')}
                      />
                    </View>
                  )}

                  {/* Carousel Generator */}
                  <View style={{ gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
                    <T variant="h3">Instagram Carousel</T>
                    <T muted style={{ fontSize: 12 }}>
                      Turn what this video says into multi-slide Instagram carousel graphics.
                    </T>
                    <Button
                      label="Make a carousel"
                      icon="layers"
                      small
                      onPress={() => router.push({ pathname: '/vstudio', params: { sb: finalSb.id } } as any)}
                    />
                  </View>
                </View>
              )}

              {/* Tab 3: Audio & Music */}
              {inspectorTab === 'audio' && (
                <View style={{ gap: spacing.md }}>
                  <T variant="h3">Background Music</T>
                  <T muted style={{ fontSize: 12 }}>
                    Pick royalty-free music from the studio library. The engine ducks it under speech automatically.
                  </T>
                  {music && music.tracks.length ? (
                    <View style={{ gap: spacing.sm }}>
                      <Chips
                        options={music.tracks.slice(0, 10).map((t) => ({ value: t.id, label: t.name }))}
                        value=""
                        allowEmpty
                        onChange={(v) => {
                          if (v) act('music', () => editor.setMusic(finalSb.id, v), 'Music added');
                        }}
                      />
                      {finalSb.storyboard?.sound_design?.music ? (
                        <Button
                          label="Remove current music"
                          small
                          variant="secondary"
                          icon="x"
                          onPress={() => act('music', () => editor.setMusic(finalSb.id, null), 'Music removed')}
                        />
                      ) : null}
                    </View>
                  ) : (
                    <T muted style={{ fontSize: 12 }}>{music?.note ?? 'No music library found.'}</T>
                  )}

                  {card.sound_design ? (
                    <View style={{ gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
                      <T variant="h3">Sound Design Settings</T>
                      <Row gap={spacing.xs} style={{ flexWrap: 'wrap' }}>
                        <Badge label={`${card.sound_design.sfx_count ?? 0} SFX Cues`} tone="info" />
                        <Badge label={card.sound_design.ducking_enabled ? 'Speech Ducking On' : 'No Ducking'} tone="neutral" />
                        <Badge label={card.sound_design.target_lufs ? `${card.sound_design.target_lufs} LUFS` : 'Loudness Default'} tone="neutral" />
                      </Row>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Tab 4: Director Plan */}
              {inspectorTab === 'director' && finalSb.director && (
                <View style={{ gap: spacing.sm }}>
                  <Row gap={spacing.xs} style={{ flexWrap: 'wrap' }}>
                    <Badge
                      label={finalSb.director.source === 'llm' ? 'AI Director Plan' : 'Built-in Planner'}
                      tone={finalSb.director.source === 'llm' ? 'success' : 'warning'}
                      dot
                    />
                    <Badge label={`${finalSb.director.plan?.beats?.length ?? 0} visual beats`} tone="info" />
                    <Badge label={`${finalSb.director.plan?.zooms?.length ?? 0} zooms`} tone="neutral" />
                    <Badge label={`${finalSb.director.plan?.sfx?.length ?? 0} SFX`} tone="neutral" />
                  </Row>

                  {finalSb.director.source !== 'llm' ? (
                    <T variant="small" color={colors.warning}>
                      No LLM responded, so this is the fallback rule-based plan. Configure an API key in Settings for enhanced pacing.
                    </T>
                  ) : null}

                  {finalSb.director.plan?.hook ? (
                    <View style={{ gap: 2 }}>
                      <T variant="label" muted style={{ fontSize: 10 }}>HOOK CONCEPT</T>
                      <T style={{ fontSize: 13 }}>{finalSb.director.plan.hook.text}</T>
                    </View>
                  ) : null}

                  {finalSb.director.plan?.speaker ? (
                    <View style={{ gap: 2 }}>
                      <T variant="label" muted style={{ fontSize: 10 }}>SPEAKER</T>
                      <T style={{ fontSize: 13 }}>
                        {finalSb.director.plan.speaker.name}
                        {finalSb.director.plan.speaker.role ? ` · ${finalSb.director.plan.speaker.role}` : ''}
                      </T>
                    </View>
                  ) : null}

                  {finalSb.director.plan?.beats?.map((b: any, i: number) => (
                    <View key={i} style={{ paddingVertical: 4, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <T variant="small" muted style={{ fontSize: 10 }}>
                        {BEAT_LABEL[b.template] ?? b.template} · {num(b.start)}s - {num(b.end)}s
                      </T>
                      <T style={{ fontSize: 12 }}>{beatSummary(b)}</T>
                    </View>
                  ))}

                  {finalSb.director.plan?.cta ? (
                    <View style={{ gap: 2 }}>
                      <T variant="label" muted style={{ fontSize: 10 }}>CLOSING CTA</T>
                      <T style={{ fontSize: 13 }}>{finalSb.director.plan.cta.text}</T>
                    </View>
                  ) : null}
                </View>
              )}
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
  inspectorTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
  },
  inspectorTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: radius.sm + 1,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inspectorTabBtnActive: {
    borderWidth: 1,
  },
});

const BEAT_LABEL: Record<string, string> = {
  counter: 'Counter',
  versus: 'Versus',
  brands: 'Others vs us',
  flow: 'Step flow',
  shift: 'Before → after',
};

function beatSummary(b: any): string {
  switch (b.template) {
    case 'counter':
      return `${Number(b.value).toLocaleString()}${b.suffix || ''} ${b.caption}`;
    case 'versus':
      return `${b.left?.tag}: ${b.left?.text}  vs  ${b.right?.tag}: ${b.right?.text}`;
    case 'brands':
      return `${(b.top || []).join(', ')} ${b.top_caption || ''} → ${b.bottom}`;
    case 'flow':
      return (b.steps || []).join(' → ');
    case 'shift':
      return `${b.from} → ${b.to}`;
    default:
      return b.template;
  }
}

function Pasteable({ label, text }: { label: string; text: string }) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const canCopy = Platform.OS === 'web' && typeof navigator !== 'undefined' && !!(navigator as any).clipboard;

  return (
    <View style={{ gap: 4 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <T variant="label" muted style={{ fontSize: 11, textTransform: 'uppercase' }}>{label}</T>
        {canCopy ? (
          <Button
            label={copied ? 'Copied' : 'Copy'}
            small
            variant="ghost"
            icon="copy"
            onPress={() => {
              (navigator as any).clipboard.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          />
        ) : null}
      </Row>
      <View style={{ padding: spacing.md, borderRadius: 8, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
        <T selectable style={{ fontSize: 13, lineHeight: 18 }}>{text}</T>
      </View>
    </View>
  );
}
