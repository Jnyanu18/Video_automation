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
  if (!list?.length || !sb) {
    return (
      <Page title="Storyboard" subtitle="Review, approve and render">
        <EmptyState icon="layers" title="No storyboards yet"
          message="Upload raw footage and let the editor draft a cut. You review it here before anything is rendered."
          action={<Button label="Start a new edit" variant="primary" icon="plus" onPress={() => router.push('/new')} />} />
      </Page>
    );
  }

  const card = sb.storyboard;
  const sc = card?.scorecard;
  const rendering = sb.render_job?.status === 'running' || sb.render_job?.status === 'queued';
  const processing = sb.status === 'processing';
  const video = sb.latest_render ?? sb.latest_preview;
  const blockedByScorecard = sc?.status === 'FAIL';

  return (
    <Page title="Storyboard" subtitle="Review the cut, approve it, then render">
      <Chips
        options={list.slice(0, 10).map((s) => ({ value: s.id, label: `${(s.storyboard?.title || s.id).slice(0, 28)} · ${STAGE_LABEL[s.stage] ?? s.stage}` }))}
        value={sb.id} onChange={(v) => v && select(v)} />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, minWidth: 260, gap: 6 }}>
            <Row gap={spacing.sm}>
              <Badge label={STAGE_LABEL[sb.stage] ?? sb.stage} tone={stageTone(sb.stage)} dot />
              {sb.approved ? <Badge label={`Approved ${when(sb.approved_at)}`} tone="success" /> : null}
              {sc?.available ? <Badge label={`Scorecard ${sc.status}${sc.score !== null ? ' · ' + Math.round(sc.score * 100) + '%' : ''}`} tone={checkTone(sc.status === 'PASS' ? 'pass' : sc.status === 'WARN' ? 'warn' : 'fail')} /> : null}
              {sb.series ? <Badge label={`Series episode ${sb.series.episode}`} tone="info" /> : null}
            </Row>
            <T variant="h1">{titleOf(sb)}</T>
            {card ? (
              <T muted>{num(card.duration.original_seconds)}s of footage cut to {num(card.duration.output_seconds)}s ({pct(card.duration.reduction_percent)} removed) · style {sb.style}</T>
            ) : <T muted>Style {sb.style}</T>}
          </View>
          <Row gap={spacing.sm}>
            {sb.approved
              ? <Button label="Withdraw approval" icon="x" loading={busy === 'unapprove'} onPress={() => act('unapprove', () => editor.unapprove(sb.id), 'Approval withdrawn')} />
              : <Button label="Approve storyboard" variant="primary" icon="check" loading={busy === 'approve'}
                  disabled={sb.status !== 'ready' || blockedByScorecard} hint={blockedByScorecard ? 'The scorecard has failing checks: revise first' : 'Nothing to approve yet'}
                  onPress={() => act('approve', () => editor.approve(sb.id), 'Approved. You can render the final video.')} />}
            <Button label="Preview render" icon="play" loading={busy === 'preview'} disabled={sb.status !== 'ready' || rendering}
              onPress={() => act('preview', () => editor.render(sb.id, 'preview'), 'Preview render started')} />
            <Button label="Final render" variant={sb.approved ? 'primary' : 'secondary'} icon="film" loading={busy === 'final'}
              disabled={!sb.approved || rendering || sb.status !== 'ready'} hint="Approve the storyboard first"
              onPress={() => act('final', () => editor.render(sb.id, 'final'), 'Final render started')} />
          </Row>
        </Row>
      </Card>

      {err ? <Banner tone="danger">{err}</Banner> : null}
      {sb.approval_reset ? <Banner tone="warning">You revised this storyboard after approving it, so the approval was withdrawn. Review the new cut and approve again.</Banner> : null}
      {sb.error ? <Banner tone="danger">{sb.error}</Banner> : null}
      {sb.render_job?.status === 'failed' ? <Banner tone="danger">Render failed: {sb.render_job.error}</Banner> : null}

      {processing ? (
        <Card><Row><T variant="h2">The editor is working…</T></Row><JobLog events={sb.events} /></Card>
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
                onPress={() => act('chat', async () => { await editor.chat(sb.id, msg.trim()); setMsg(''); }, 'Revision started')} />
              {sb.agent_reply ? <View style={[styles.caption, { backgroundColor: colors.surfaceAlt, marginTop: spacing.md }]}><T variant="small" faint>LAST REPLY</T><T>{sb.agent_reply}</T></View> : null}
              {sb.events.length ? <View style={{ marginTop: spacing.md }}><JobLog events={sb.events} title="What the agent did" /></View> : null}
            </Card>
          </View>

          <View style={{ flex: 1, gap: spacing.lg }}>
            <SectionTitle title={sb.latest_render ? 'Final render' : sb.latest_preview ? 'Preview render' : 'Render'} />
            <Card>
              {rendering ? <T style={{ marginBottom: 8 }}>Rendering {sb.render_job?.quality}… this runs in the background.</T> : null}
              {video ? (
                <>
                  <VideoPlayer uri={absoluteUrl(video.video_url) as string} />
                  <T variant="small" muted style={{ marginTop: 8 }}>{video.quality} · {num(video.duration)}s · {video.resolution} · {video.backend} · {when(video.created_at)}</T>
                  {video.warnings.map((w, i) => <View key={i} style={{ marginTop: 6 }}><Banner tone="warning">{w}</Banner></View>)}
                  {sb.latest_render ? (
                    <Row gap={spacing.sm} style={{ marginTop: spacing.md }}>
                      <Button label="Schedule & publish" variant="primary" icon="send" onPress={() => router.push({ pathname: '/publishing', params: { sb: sb.id } })} />
                      <Button label="Send to approval pipeline" icon="upload" loading={busy === 'pipeline'}
                        onPress={() => act('pipeline', async () => {
                          const r = await post('/api/reels/upload', {
                            uploadId: sb.latest_render!.render_id, caption: (card.scenes[card.scenes.length - 1]?.caption || card.title).slice(0, 200) || card.title,
                          });
                          router.push({ pathname: '/reels/[id]', params: { id: r.recordId } });
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

            <SectionTitle title="Growth signals" />
            <Card style={{ gap: spacing.md }}>
              {([['3-second hook', card.growth_signals.three_second_hook], ['Share trigger', card.growth_signals.sendability]] as const).map(([label, s]) => (
                <View key={label} style={{ gap: 4 }}>
                  <Row gap={spacing.sm}><T variant="h3">{label}</T><Badge label={s.status.toUpperCase()} tone={checkTone(s.status)} /></Row>
                  <T variant="small" muted>{s.detail}</T>
                </View>
              ))}
            </Card>

            <SectionTitle title="Sound" />
            <Card>
              <Row gap={spacing.sm}>
                <Badge label={`${card.sound_design.sfx_count} sound effects`} tone="info" />
                <Badge label={card.sound_design.music ? 'Music bed' : 'No music'} tone="neutral" />
                <Badge label={card.sound_design.ducking_enabled ? 'Ducking on' : 'No ducking'} tone="neutral" />
                <Badge label={card.sound_design.target_lufs ? `${card.sound_design.target_lufs} LUFS` : 'Loudness not set'} tone="neutral" />
              </Row>
            </Card>

            {sb.director ? (
              <>
                <SectionTitle title="What the director decided" />
                <Card style={{ gap: spacing.sm }}>
                  <Row gap={spacing.sm}>
                    <Badge label={sb.director.source === 'llm' ? 'Planned by the LLM director' : 'Planned by the built-in planner'} tone={sb.director.source === 'llm' ? 'success' : 'warning'} dot />
                    <Badge label={`${sb.director.plan.beats.length} diagrams`} tone="info" />
                    <Badge label={`${sb.director.plan.zooms.length} zooms`} tone="neutral" />
                    <Badge label={`${sb.director.plan.sfx.length} sound effects`} tone="neutral" />
                  </Row>
                  {sb.director.source !== 'llm' ? <T variant="small" color={colors.warning}>No LLM answered, so this is the plainer plan. Configure a key in Settings for a richer one.</T> : null}
                  {sb.director.plan.hook ? <T><T variant="label" muted>HOOK  </T>{sb.director.plan.hook.text}</T> : null}
                  {sb.director.plan.speaker ? <T><T variant="label" muted>SPEAKER  </T>{sb.director.plan.speaker.name}{sb.director.plan.speaker.role ? `, ${sb.director.plan.speaker.role}` : ''}</T> : null}
                  {sb.director.plan.beats.map((b, i) => (
                    <View key={i} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <T variant="small" muted>{BEAT_LABEL[b.template] ?? b.template} · {num(b.start)}s to {num(b.end)}s</T>
                      <T>{beatSummary(b)}</T>
                    </View>
                  ))}
                  {sb.director.plan.cta ? <T><T variant="label" muted>CLOSING LINE  </T>{sb.director.plan.cta.text}</T> : null}
                  {sb.director.warnings.length ? <T variant="small" faint>Adjusted by validation: {sb.director.warnings.join('; ')}</T> : null}
                  <T variant="small" faint>To change any of it, use “Revise with the editor” on the left.</T>
                </Card>
              </>
            ) : null}

            <SectionTitle title="Music" />
            <Card style={{ gap: spacing.sm }}>
              {music && music.tracks.length ? (
                <>
                  <T muted>Tracks from the Vishnu studio library, put under the voice and ducked. Choosing one withdraws the approval so you review the new mix.</T>
                  <Chips options={music.tracks.slice(0, 10).map((t) => ({ value: t.id, label: t.name }))} value="" allowEmpty onChange={(v) => { if (v) act('music', () => editor.setMusic(sb.id, v), 'Music added'); }} />
                  {sb.storyboard?.sound_design.music ? <Button label="Remove the music" small variant="secondary" onPress={() => act('music', () => editor.setMusic(sb.id, null), 'Music removed')} /> : null}
                </>
              ) : <T muted>{music?.note ?? 'No music library found.'}</T>}
            </Card>

            <SectionTitle title="Carousel" />
            <Card style={{ gap: spacing.sm }}>
              <T muted>Turn what this video says into Instagram slides with the Remotion carousel lane of the Vishnu studio.</T>
              <Button label="Make a carousel" icon="layers" onPress={() => router.push({ pathname: '/vstudio', params: { sb: sb.id } } as any)} />
            </Card>

            <SectionTitle title="Post text" />
            <Card style={{ gap: spacing.md }}>
              {sb.posts ? (
                <>
                  <Badge label={sb.posts.generated_by === 'llm' ? 'Written by AI from the transcript' : 'Plain template (no LLM answered)'} tone={sb.posts.generated_by === 'llm' ? 'success' : 'warning'} />
                  <Pasteable label="Instagram caption" text={sb.posts.instagram.caption} />
                  {sb.posts.instagram.cover_text ? <Pasteable label="Cover text" text={sb.posts.instagram.cover_text} /> : null}
                  <Pasteable label="YouTube Short title" text={sb.posts.youtube_short.title} />
                  <Pasteable label="YouTube Short description" text={sb.posts.youtube_short.description} />
                  <Pasteable label="X post" text={sb.posts.x.post} />
                </>
              ) : <T muted>Write the caption, title and X post from what the video says. Review them before you publish.</T>}
              <Button label={sb.posts ? 'Write again' : 'Write post text'} icon="edit" loading={busy === 'posts'} onPress={() => act('posts', () => editor.posts(sb.id), 'Post text written')} />
            </Card>

            <Button label="Delete this storyboard" variant="danger" icon="trash" onPress={() => setConfirmDelete(true)} />
          </View>
        </View>
      ) : null}

      {sb.status === 'failed' ? (
        <Card>
          <T variant="h2">This storyboard could not be generated</T>
          <T muted style={{ marginVertical: 8 }}>{sb.error}</T>
          <Row gap={spacing.sm}>
            <Button label="Start again" variant="primary" icon="refresh" onPress={() => router.push('/new')} />
            <Button label="Delete" variant="danger" icon="trash" onPress={() => setConfirmDelete(true)} />
          </Row>
        </Card>
      ) : null}

      <ConfirmDialog visible={confirmDelete} danger title="Delete storyboard?" confirmLabel="Delete"
        message="The plan and its working files are removed. Rendered videos in the media library are kept."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); act('delete', () => editor.deleteStoryboard(sb.id), 'Deleted'); }} />
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
