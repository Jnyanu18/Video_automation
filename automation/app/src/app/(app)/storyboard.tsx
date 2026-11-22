import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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
import { spacing, useTheme } from '../../theme';
import { StudioTabs } from '../../components/StudioTabs';

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
  const [music, setMusic] = useState<{ tracks: { id: string; name: string }[]; note: string | null } | null>(null);
  useEffect(() => { editor.vsMusic().then(setMusic).catch(() => setMusic(null)); }, []);

  async function act(name: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(name); setErr(null);
    try { await fn(); await reload(); if (done) toast(done); } catch (e) { setErr(errorText(e)); } finally { setBusy(null); }
  }

  if (loading) return <Page title="Storyboard" subtitle="Review, approve and render"><Skeleton height={120} /><Skeleton height={240} /></Page>;
  if (error && !list) return <Page title="Storyboard"><ErrorState message={error} onRetry={reload} /></Page>;

  const finalSb = sb || (list && list.length > 0 ? list[0] : null);

  if (!list?.length || !finalSb) {
    return (
      <Page title="Storyboard" subtitle="Review, approve and render">
        <EmptyState icon="layers" title="No storyboards yet"
          message="Upload raw footage and let the editor draft a cut. You review it here before anything is rendered."
          action={<Button label="Create a new reel" variant="primary" icon="plus" onPress={() => router.push('/new')} />} />
      </Page>
    );
  }

  const card = finalSb.storyboard;
  const sc = card?.scorecard;
  const rendering = finalSb.render_job?.status === 'running' || finalSb.render_job?.status === 'queued';
  const processing = finalSb.status === 'processing';
  const video = finalSb.latest_render ?? finalSb.latest_preview;
  const blockedByScorecard = sc?.status === 'FAIL';

  return (
    <Page title="Video Editor" subtitle="Review the cut, fine-tune scenes, and render">
      <StudioTabs
        activeTab="storyboard"
        sbId={finalSb.id}
        title={titleOf(finalSb)}
        stage={finalSb.stage}
        approved={finalSb.approved}
        rendering={rendering}
        onPreviewRender={() => act('preview', () => editor.render(finalSb.id, 'preview'), 'Preview render started')}
        onFinalRender={finalSb.approved ? () => act('final', () => editor.render(finalSb.id, 'final'), 'Final render started') : undefined}
      />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, minWidth: 260, gap: 6 }}>
            <Row gap={spacing.sm}>
              <Badge label={STAGE_LABEL[finalSb.stage] ?? finalSb.stage} tone={stageTone(finalSb.stage)} dot />
              {finalSb.approved ? <Badge label={`Approved ${when(finalSb.approved_at)}`} tone="success" /> : null}
              {sc?.available ? <Badge label={`Scorecard ${sc.status}${sc.score !== null ? ' · ' + Math.round(sc.score * 100) + '%' : ''}`} tone={checkTone(sc.status === 'PASS' ? 'pass' : sc.status === 'WARN' ? 'warn' : 'fail')} /> : null}
              {finalSb.series ? <Badge label={`Series episode ${finalSb.series.episode}`} tone="info" /> : null}
            </Row>
            <T variant="h1">{titleOf(finalSb)}</T>
            {card ? (
              <T muted>{num(card.duration.original_seconds)}s of footage cut to {num(card.duration.output_seconds)}s ({pct(card.duration.reduction_percent)} removed) · style {finalSb.style}</T>
            ) : <T muted>Style {finalSb.style}</T>}
          </View>
          <Row gap={spacing.sm}>
            {finalSb.approved
              ? <Button label="Withdraw approval" icon="x" loading={busy === 'unapprove'} onPress={() => act('unapprove', () => editor.unapprove(finalSb.id), 'Approval withdrawn')} />
              : <Button label="Approve storyboard" variant="primary" icon="check" loading={busy === 'approve'}
                  disabled={finalSb.status !== 'ready' || blockedByScorecard} hint={blockedByScorecard ? 'The scorecard has failing checks: revise first' : 'Nothing to approve yet'}
                  onPress={() => act('approve', () => editor.approve(finalSb.id), 'Approved. You can render the final video.')} />}
            <Button label="Preview render" icon="play" loading={busy === 'preview'} disabled={finalSb.status !== 'ready' || rendering}
              onPress={() => act('preview', () => editor.render(finalSb.id, 'preview'), 'Preview render started')} />
            <Button label="Final render" variant={finalSb.approved ? 'primary' : 'secondary'} icon="film" loading={busy === 'final'}
              disabled={!finalSb.approved || rendering || finalSb.status !== 'ready'} hint="Approve the storyboard first"
              onPress={() => act('final', () => editor.render(finalSb.id, 'final'), 'Final render started')} />
          </Row>
        </Row>
      </Card>

      {err ? <Banner tone="danger">{err}</Banner> : null}
      {finalSb.approval_reset ? <Banner tone="warning">You revised this storyboard after approving it, so the approval was withdrawn. Review the new cut and approve again.</Banner> : null}
      {finalSb.error ? <Banner tone="danger">{finalSb.error}</Banner> : null}
      {finalSb.render_job?.status === 'failed' ? <Banner tone="danger">Render failed: {finalSb.render_job.error}</Banner> : null}

      {processing ? (
        <Card><Row><T variant="h2">The editor is working…</T></Row><JobLog events={finalSb.events} /></Card>
      ) : null}

      {card && !processing ? (
        <View style={[styles.cols, wide && { flexDirection: 'row' }]}>
          <View style={{ flex: 1.4, gap: spacing.lg }}>
            <SectionTitle title={`Scenes (${card.scenes_count})`} />
            {card.scenes.map((s) => (
              <Card key={s.scene_number}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T variant="h3">{s.scene_number}. {s.type}</T>
                  <T variant="small" muted>{s.timestamp_output}</T>
                </Row>
                <T style={{ marginTop: 6 }}>{s.action}</T>
                <T variant="small" muted style={{ marginTop: 4 }}>{s.framing} · {s.camera_motion} · source {s.source_range}</T>
                <View style={[styles.caption, { backgroundColor: colors.surfaceAlt }]}>
                  <T variant="small" faint>CAPTION ({s.caption_style})</T>
                  <T>{s.caption}</T>
                </View>
                {s.sfx.length ? <Row gap={spacing.sm} style={{ marginTop: 8 }}>{s.sfx.map((x, i) => <Badge key={i} label={`♪ ${x.name} @ ${num(x.at)}s`} tone="info" />)}</Row> : null}
              </Card>
            ))}

            <SectionTitle title="Revise with the editor" />
            <Card>
              <T variant="small" muted style={{ marginBottom: 8 }}>
                Describe a change in plain words. The agent edits the plan with real tools (cuts, captions, zooms, sound effects), then the scorecard re-checks it. A revision withdraws any earlier approval.
              </T>
              <Input value={msg} onChangeText={setMsg} multiline placeholder="e.g. Start right on the first word, put a whoosh on the hook and add a ‘send this to a friend’ line at the end" editable={!busy && !rendering} />
              <View style={{ height: spacing.sm }} />
              <Button label="Send revision" variant="primary" icon="send" loading={busy === 'chat'} disabled={!msg.trim() || rendering}
                onPress={() => act('chat', async () => { await editor.chat(finalSb.id, msg.trim()); setMsg(''); }, 'Revision started')} />
              {finalSb.agent_reply ? <View style={[styles.caption, { backgroundColor: colors.surfaceAlt, marginTop: spacing.md }]}><T variant="small" faint>LAST REPLY</T><T>{finalSb.agent_reply}</T></View> : null}
              {finalSb.events.length ? <View style={{ marginTop: spacing.md }}><JobLog events={finalSb.events} title="What the agent did" /></View> : null}
            </Card>
          </View>

          <View style={{ flex: 1, gap: spacing.lg }}>
            <SectionTitle title={finalSb.latest_render ? 'Final render' : finalSb.latest_preview ? 'Preview render' : 'Render'} />
            <Card>
              {rendering ? <T style={{ marginBottom: 8 }}>Rendering {finalSb.render_job?.quality}… this runs in the background.</T> : null}
              {video ? (
                <>
                  <VideoPlayer uri={absoluteUrl(video.video_url) as string} />
                  <T variant="small" muted style={{ marginTop: 8 }}>{video.quality} · {num(video.duration)}s · {video.resolution} · {video.backend} · {when(video.created_at)}</T>
                  {video.warnings.map((w, i) => <View key={i} style={{ marginTop: 6 }}><Banner tone="warning">{w}</Banner></View>)}
                  {finalSb.latest_render ? (
                    <Row gap={spacing.sm} style={{ marginTop: spacing.md }}>
                      <Button label="Schedule & publish" variant="primary" icon="send" onPress={() => router.push({ pathname: '/publishing', params: { sb: finalSb.id } })} />
                      <Button label="Send to approval pipeline" icon="upload" loading={busy === 'pipeline'}
                        onPress={() => act('pipeline', async () => {
                          try {
                            const r = await post<{ recordId: string }>('/api/reels/upload', {
                              uploadId: finalSb.latest_render!.render_id, caption: (card.scenes[card.scenes.length - 1]?.caption || card.title).slice(0, 200) || card.title,
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
                        })} />
                    </Row>
                  ) : null}
                </>
              ) : <EmptyState icon="film" title="Nothing rendered yet" message="Render a quick preview to check the cut, or approve and render the final." />}
            </Card>

            <SectionTitle title="Scorecard" />
            <Card>
              {sc?.available ? (
                <>
                  <ChecksList checks={sc.checks} />
                  <T variant="small" faint style={{ marginTop: 8 }}>Automatic, objective checks only. They do not judge whether the edit is good.</T>
                </>
              ) : <T muted>The scorecard could not run: {sc?.reason || 'unknown reason'}.</T>}
            </Card>

            {card.growth_signals ? (
              <>
                <SectionTitle title="Growth signals" />
                <Card style={{ gap: spacing.md }}>
                  {([['3-second hook', card.growth_signals.three_second_hook], ['Share trigger', card.growth_signals.sendability]] as const).map(([label, s]) => (
                    s ? (
                      <View key={label} style={{ gap: 4 }}>
                        <Row gap={spacing.sm}><T variant="h3">{label}</T><Badge label={s.status.toUpperCase()} tone={checkTone(s.status)} /></Row>
                        <T variant="small" muted>{s.detail}</T>
                      </View>
                    ) : null
                  ))}
                </Card>
              </>
            ) : null}

            {card.sound_design ? (
              <>
                <SectionTitle title="Sound" />
                <Card>
                  <Row gap={spacing.sm}>
                    <Badge label={`${card.sound_design.sfx_count ?? 0} sound effects`} tone="info" />
                    <Badge label={card.sound_design.music ? 'Music bed' : 'No music'} tone="neutral" />
                    <Badge label={card.sound_design.ducking_enabled ? 'Ducking on' : 'No ducking'} tone="neutral" />
                    <Badge label={card.sound_design.target_lufs ? `${card.sound_design.target_lufs} LUFS` : 'Loudness not set'} tone="neutral" />
                  </Row>
                </Card>
              </>
            ) : null}

            {finalSb.director ? (
              <>
                <SectionTitle title="What the director decided" />
                <Card style={{ gap: spacing.sm }}>
                  <Row gap={spacing.sm}>
                    <Badge label={finalSb.director.source === 'llm' ? 'Planned by the LLM director' : 'Planned by the built-in planner'} tone={finalSb.director.source === 'llm' ? 'success' : 'warning'} dot />
                    <Badge label={`${finalSb.director.plan?.beats?.length ?? 0} diagrams`} tone="info" />
                    <Badge label={`${finalSb.director.plan?.zooms?.length ?? 0} zooms`} tone="neutral" />
                    <Badge label={`${finalSb.director.plan?.sfx?.length ?? 0} sound effects`} tone="neutral" />
                  </Row>
                  {finalSb.director.source !== 'llm' ? <T variant="small" color={colors.warning}>No LLM answered, so this is the plainer plan. Configure a key in Settings for a richer one.</T> : null}
                  {finalSb.director.plan?.hook ? <T><T variant="label" muted>HOOK  </T>{finalSb.director.plan.hook.text}</T> : null}
                  {finalSb.director.plan?.speaker ? <T><T variant="label" muted>SPEAKER  </T>{finalSb.director.plan.speaker.name}{finalSb.director.plan.speaker.role ? `, ${finalSb.director.plan.speaker.role}` : ''}</T> : null}
                  {finalSb.director.plan?.beats?.map((b, i) => (
                    <View key={i} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <T variant="small" muted>{BEAT_LABEL[b.template] ?? b.template} · {num(b.start)}s to {num(b.end)}s</T>
                      <T>{beatSummary(b)}</T>
                    </View>
                  ))}
                  {finalSb.director.plan?.cta ? <T><T variant="label" muted>CLOSING LINE  </T>{finalSb.director.plan.cta.text}</T> : null}
                  {finalSb.director.warnings?.length ? <T variant="small" faint>Adjusted by validation: {finalSb.director.warnings.join('; ')}</T> : null}
                  <T variant="small" faint>To change any of it, use "Revise with the editor" on the left.</T>
                </Card>
              </>
            ) : null}

            <SectionTitle title="Music" />
            <Card style={{ gap: spacing.sm }}>
              {music && music.tracks.length ? (
                <>
                  <T muted>Tracks from the Vishnu studio library, put under the voice and ducked. Choosing one withdraws the approval so you review the new mix.</T>
                  <Chips options={music.tracks.slice(0, 10).map((t) => ({ value: t.id, label: t.name }))} value="" allowEmpty onChange={(v) => { if (v) act('music', () => editor.setMusic(finalSb.id, v), 'Music added'); }} />
                  {finalSb.storyboard?.sound_design?.music ? <Button label="Remove the music" small variant="secondary" onPress={() => act('music', () => editor.setMusic(finalSb.id, null), 'Music removed')} /> : null}
                </>
              ) : <T muted>{music?.note ?? 'No music library found.'}</T>}
            </Card>

            <SectionTitle title="Carousel" />
            <Card style={{ gap: spacing.sm }}>
              <T muted>Turn what this video says into Instagram slides with the Remotion carousel lane of the Vishnu studio.</T>
              <Button label="Make a carousel" icon="layers" onPress={() => router.push({ pathname: '/vstudio', params: { sb: finalSb.id } } as any)} />
            </Card>

            <SectionTitle title="Post text" />
            <Card style={{ gap: spacing.md }}>
              {finalSb.posts ? (
                <>
                  <Badge label={finalSb.posts.generated_by === 'llm' ? 'Written by AI from the transcript' : 'Plain template (no LLM answered)'} tone={finalSb.posts.generated_by === 'llm' ? 'success' : 'warning'} />
                  <Pasteable label="Instagram caption" text={finalSb.posts.instagram.caption} />
                  {finalSb.posts.instagram.cover_text ? <Pasteable label="Cover text" text={finalSb.posts.instagram.cover_text} /> : null}
                  <Pasteable label="YouTube Short title" text={finalSb.posts.youtube_short.title} />
                  <Pasteable label="YouTube Short description" text={finalSb.posts.youtube_short.description} />
                  <Pasteable label="X post" text={finalSb.posts.x.post} />
                </>
              ) : <T muted>Write the caption, title and X post from what the video says. Review them before you publish.</T>}
              <Button label={finalSb.posts ? 'Write again' : 'Write post text'} icon="edit" loading={busy === 'posts'} onPress={() => act('posts', () => editor.posts(finalSb.id), 'Post text written')} />
            </Card>

            <Button label="Delete this storyboard" variant="danger" icon="trash" onPress={() => setConfirmDelete(true)} />
          </View>
        </View>
      ) : null}

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

      <ConfirmDialog visible={confirmDelete} danger title="Delete storyboard?" confirmLabel="Delete"
        message="The plan and its working files are removed. Rendered videos in the media library are kept."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); act('delete', () => editor.deleteStoryboard(finalSb.id), 'Deleted'); }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  cols: { gap: spacing.lg, flexDirection: 'column' },
  caption: { marginTop: spacing.md, padding: spacing.md, borderRadius: 8, gap: 2 },
});


const BEAT_LABEL: Record<string, string> = { counter: 'Counter', versus: 'Versus', brands: 'Others vs us', flow: 'Step flow', shift: 'Before → after' };

function beatSummary(b: any): string {
  switch (b.template) {
    case 'counter': return `${Number(b.value).toLocaleString()}${b.suffix || ''} ${b.caption}`;
    case 'versus': return `${b.left?.tag}: ${b.left?.text}  vs  ${b.right?.tag}: ${b.right?.text}`;
    case 'brands': return `${(b.top || []).join(', ')} ${b.top_caption || ''} → ${b.bottom}`;
    case 'flow': return (b.steps || []).join(' → ');
    case 'shift': return `${b.from} → ${b.to}`;
    default: return b.template;
  }
}

function Pasteable({ label, text }: { label: string; text: string }) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const canCopy = Platform.OS === 'web' && typeof navigator !== 'undefined' && !!(navigator as any).clipboard;
  return (
    <View style={{ gap: 4 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="label" muted>{label.toUpperCase()}</T>
        {canCopy ? <Button label={copied ? 'Copied' : 'Copy'} small variant="ghost" icon="copy" onPress={() => { (navigator as any).clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }} /> : null}
      </Row>
      <View style={{ padding: spacing.md, borderRadius: 8, backgroundColor: colors.surfaceAlt }}>
        <T selectable>{text}</T>
      </View>
    </View>
  );
}
