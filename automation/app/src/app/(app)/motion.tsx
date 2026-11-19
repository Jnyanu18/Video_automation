import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Badge, Banner, Button, Card, Field, Input, SectionTitle, T } from '../../components/ui';
import { VideoPlayer } from '../../components/VideoPlayer';
import { absoluteUrl, errorText } from '../../api/client';
import { editor, num, StoryboardCard, Storyboard } from '../../api/editor';
import { useToast } from '../../state/toast';
import { radius, spacing, useTheme } from '../../theme';

/**
 * Motion Graphics: a written brief becomes a motion reel. No footage, no presenter.
 *
 * Everything happens on this one screen: write the brief, see the scenes it would make, build it, approve it,
 * render it. Approval and render go through the ordinary storyboard endpoints, so the same approval gate applies:
 * a final render is refused until the storyboard is approved.
 */
export default function MotionGraphics() {
  const toast = useToast();
  const { colors } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [button, setButton] = useState('');
  const [url, setUrl] = useState('');
  const [tagline, setTagline] = useState('');

  const [preview, setPreview] = useState<StoryboardCard | null>(null);
  const [sb, setSb] = useState<Storyboard | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const brief = () => ({
    prompt: prompt.trim(),
    ...(title.trim() ? { title: title.trim() } : {}),
    ...(button.trim() ? { button: button.trim() } : {}),
    ...(url.trim() ? { url: url.trim() } : {}),
    ...(tagline.trim() ? { tagline: tagline.trim() } : {}),
  });

  // Poll while the reel is being built or rendered; stop as soon as it settles.
  const poll = useCallback(async (id: string) => {
    try {
      const next = await editor.storyboard(id);
      setSb(next);
      const working = next.status === 'processing' || next.render_job?.status === 'running' || next.render_job?.status === 'queued';
      if (working) timer.current = setTimeout(() => poll(id), 1500);
    } catch (e) {
      setError(errorText(e));
    }
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function act(name: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(name); setError(null);
    try { await fn(); if (done) toast(done); } catch (e) { setError(errorText(e)); } finally { setBusy(null); }
  }

  async function showScenes() {
    if (prompt.trim().length < 3) return setError('Write the brief first. The first line becomes the hook on screen.');
    await act('preview', async () => { setPreview((await editor.motionPreview(brief())).storyboard); });
  }

  async function build() {
    if (prompt.trim().length < 3) return setError('Write the brief first. The first line becomes the hook on screen.');
    await act('build', async () => {
      const r = await editor.motionCreate(brief());
      setSb(r.data);
      poll(r.storyboard_id);
    }, 'Building your motion reel.');
  }

  const card = sb?.storyboard ?? preview;
  const building = sb?.status === 'processing';
  const rendering = sb?.render_job?.status === 'running' || sb?.render_job?.status === 'queued';
  const ready = sb?.status === 'ready';
  const video = sb?.latest_render ?? sb?.latest_preview;

  return (
    <Screen title="Motion Graphics" subtitle="Write the brief. Get an animated reel. No footage needed." narrow>
      {!sb ? (
        <Card style={{ gap: spacing.lg }}>
          <Banner tone="info">
            Write what the reel should say. The first sentence becomes the hook on screen, the rest become the beats,
            and any number ("20 hrs saved every week") becomes a stat card. Nothing is rendered until you approve it.
          </Banner>
          <Field label="The brief" hint="One sentence per beat. For example: Still editing reels by hand. Cutting, captions, sound, posting. 20 hrs saved every week.">
            <Input value={prompt} onChangeText={setPrompt} multiline style={{ minHeight: 110 }}
              placeholder="Still editing reels by hand. Cutting, captions, sound, posting. 20 hrs saved every week." />
          </Field>
          <Field label="Brand or product name" hint="Optional. Shown under the hook.">
            <Input value={title} onChangeText={setTitle} placeholder="e.g. AILO" />
          </Field>
          <Field label="Closing line" hint="Optional. The last card's big text.">
            <Input value={tagline} onChangeText={setTagline} placeholder="e.g. Automate your marketing" />
          </Field>
          <Field label="Call to action" hint="Optional. The button and the address on the last card.">
            <Input value={button} onChangeText={setButton} placeholder="e.g. Book a free consultation" />
            <View style={{ height: spacing.sm }} />
            <Input value={url} onChangeText={setUrl} placeholder="e.g. accelerationlogics.com" autoCapitalize="none" autoCorrect={false} />
          </Field>
          {error ? <Banner tone="danger">{error}</Banner> : null}
          <Button label="Show me the scenes" icon="eye" full loading={busy === 'preview'} onPress={showScenes} />
          <Button label="Build this reel" variant="primary" icon="sparkles" full loading={busy === 'build'} onPress={build} />
          <T variant="small" faint>
            Building animates every scene in the browser renderer and takes a few minutes. You approve the result before a final render.
          </T>
        </Card>
      ) : null}

      {sb ? (
        <Card>
          <View style={styles.head}>
            <View style={{ flex: 1, minWidth: 240, gap: 6 }}>
              <View style={styles.row}>
                <Badge label="Motion graphics" tone="info" />
                <Badge label={building ? 'Building' : rendering ? 'Rendering' : sb.status === 'failed' ? 'Failed' : sb.approved ? 'Approved' : 'Awaiting approval'}
                  tone={sb.status === 'failed' ? 'danger' : sb.approved ? 'success' : 'warning'} dot />
              </View>
              <T variant="h1">{card?.title || 'Motion reel'}</T>
              {card ? <T muted>{card.scenes_count} scenes · {num(card.duration.output_seconds)}s</T> : null}
              {sb.agent_reply ? <T variant="small" muted>{sb.agent_reply}</T> : null}
            </View>
            <View style={styles.row}>
              {sb.approved
                ? <Button label="Withdraw approval" icon="x" loading={busy === 'unapprove'}
                    onPress={() => act('unapprove', async () => { await editor.unapprove(sb.id); await poll(sb.id); }, 'Approval withdrawn')} />
                : <Button label="Approve" variant="primary" icon="check" loading={busy === 'approve'} disabled={!ready}
                    hint="The reel is still being built" onPress={() => act('approve', async () => { await editor.approve(sb.id); await poll(sb.id); }, 'Approved. You can render it now.')} />}
              <Button label="Final render" variant={sb.approved ? 'primary' : 'secondary'} icon="film" loading={busy === 'final'}
                disabled={!sb.approved || !ready || rendering} hint="Approve the reel first"
                onPress={() => act('final', async () => { await editor.render(sb.id, 'final'); poll(sb.id); }, 'Final render started')} />
              <Button label="Start another" icon="plus" onPress={() => { setSb(null); setPreview(null); setError(null); }} />
            </View>
          </View>
        </Card>
      ) : null}

      {error && sb ? <Banner tone="danger">{error}</Banner> : null}
      {sb?.error ? <Banner tone="danger">{sb.error}</Banner> : null}
      {sb?.render_job?.status === 'failed' ? <Banner tone="danger">Render failed: {sb.render_job.error}</Banner> : null}
      {building ? <Banner tone="info">Animating the scenes. This takes a few minutes; the page updates itself.</Banner> : null}

      {video ? (
        <>
          <SectionTitle title={`${video.quality === 'final' ? 'Final' : 'Preview'} render`} />
          <Card>
            <VideoPlayer uri={absoluteUrl(video.video_url) as string} />
            <T variant="small" muted style={{ marginTop: 8 }}>{num(video.duration)}s · {video.resolution} · {video.backend}</T>
            {video.warnings?.length ? <Banner tone="warning">{video.warnings.join(' ')}</Banner> : null}
          </Card>
        </>
      ) : null}

      {card ? (
        <>
          <SectionTitle title={`Scenes (${card.scenes_count})`} />
          {card.scenes.map((s) => (
            <Card key={s.scene_number}>
              <View style={styles.head}>
                <T variant="h3">{s.scene_number}. {s.type}</T>
                <T variant="small" muted>{s.timestamp_output}</T>
              </View>
              <T style={{ marginTop: 6 }}>{s.action}</T>
              <View style={[styles.text, { backgroundColor: colors.surfaceAlt }]}>
                <T variant="small" faint>ON SCREEN</T>
                <T>{s.caption}</T>
              </View>
            </Card>
          ))}
          {card.scorecard?.checks?.length ? (
            <Card>
              <T variant="label">Checks</T>
              {card.scorecard.checks.map((c) => (
                <T key={c.name} variant="small" muted style={{ marginTop: 4 }}>{c.status.toUpperCase()} · {c.detail}</T>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between', alignItems: 'flex-start' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  text: { padding: spacing.sm, borderRadius: radius.sm, marginTop: spacing.sm },
});
