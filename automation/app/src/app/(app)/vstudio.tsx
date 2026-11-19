import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Page, Row } from '../../components/Page';
import { Badge, Banner, Button, Card, Chips, EmptyState, ErrorState, Field, Input, LinkText, SectionTitle, Skeleton, T } from '../../components/ui';
import { absoluteUrl, errorText } from '../../api/client';
import { Carousel, VsStatus, VsVideo, editor } from '../../api/editor';
import { useStoryboards } from '../../state/useStoryboards';
import { usePoll } from '../../state/usePoll';
import { useToast } from '../../state/toast';
import { radius, spacing, useTheme } from '../../theme';

const file = (slug: string, name: string) => absoluteUrl(`/api/editor/vstudio/file/${slug}/${name}`) as string;

export default function VishnuStudio() {
  const toast = useToast();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ sb?: string }>();
  const { list } = useStoryboards();
  const [status, setStatus] = useState<(VsStatus & { ok: boolean }) | null>(null);
  const [videos, setVideos] = useState<VsVideo[]>([]);
  const [cars, setCars] = useState<Carousel[]>([]);
  const [music, setMusic] = useState<{ tracks: { id: string; name: string; video: string; size_mb: number }[]; note: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sbId, setSbId] = useState<string>(params.sb ?? '');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [install, setInstall] = useState<{ status: string; error?: string; log: string[] } | null>(null);
  const [laneFilter, setLaneFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, v, c, m] = await Promise.all([editor.vsStatus(), editor.vsVideos(), editor.vsCarousels(), editor.vsMusic()]);
      setStatus(s); setVideos(v); setCars(c); setMusic(m); setError(null);
    } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const working = cars.some((c) => c.status === 'writing' || c.status === 'rendering');
  usePoll(load, working, 2500);

  const ready = (list ?? []).filter((s) => s.status === 'ready');
  useEffect(() => { if (!sbId && ready.length) setSbId(ready[0].id); }, [ready.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(name: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(name); setErr(null);
    try { await fn(); await load(); if (ok) toast(ok); } catch (e) { setErr(errorText(e)); } finally { setBusy(null); }
  }

  async function installRemotion() {
    setErr(null); setInstall({ status: 'running', log: [] });
    try {
      const r = await editor.vsInstall();
      const tick = async () => {
        const j = await editor.vsJob(r.job.id).catch(() => null);
        if (!j) return;
        setInstall(j);
        if (j.status === 'running') setTimeout(tick, 3000); else load();
      };
      setTimeout(tick, 2000);
    } catch (e) { setErr(errorText(e)); setInstall(null); }
  }

  if (error && !status) return <Page title="Vishnu Studio"><ErrorState message={error} onRetry={load} /></Page>;
  if (!status) return <Page title="Vishnu Studio"><Skeleton height={160} /></Page>;

  const lanes = Array.from(new Set(videos.map((v) => v.lane)));
  const shown = videos.filter((v) => !laneFilter || v.lane === laneFilter).slice(0, 40);

  return (
    <Page title="Vishnu Studio" subtitle="Remotion carousels, the studio's library and sign-offs, and its music">
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, minWidth: 240 }}>
            <Row gap={spacing.sm}><T variant="h2">Studio connection</T><Badge label={status.carousel_ready ? 'Carousels ready' : 'Setup needed'} tone={status.carousel_ready ? 'success' : 'warning'} dot /></Row>
            <T muted>{status.present ? `${status.videos} videos in the studio library` : 'The vishnu-studio folder was not found next to automation/.'}</T>
          </View>
          {!status.carousel_ready && status.present && status.items.find((i) => i.id === 'remotion' && !i.ok) ? (
            <Button label={install?.status === 'running' ? 'Installing…' : 'Install Remotion'} variant="primary" icon="download" loading={install?.status === 'running'} onPress={installRemotion} />
          ) : null}
        </Row>
        <View style={{ marginTop: spacing.md, gap: 4 }}>
          {status.items.map((i) => (
            <Row key={i.id} gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
              <Badge label={i.ok ? 'OK' : 'MISSING'} tone={i.ok ? 'success' : 'warning'} />
              <View style={{ flex: 1, minWidth: 220 }}>
                <T variant="h3">{i.label}</T>
                <T variant="small" muted>{i.ok ? i.detail : `${i.detail}. ${i.fix}`}</T>
              </View>
            </Row>
          ))}
        </View>
        {install?.status === 'failed' ? <View style={{ marginTop: spacing.sm }}><Banner tone="danger">{install.error}</Banner></View> : null}
        {install?.status === 'done' ? <View style={{ marginTop: spacing.sm }}><Banner tone="success">Remotion is installed. The first render also downloads a headless browser (about 110 MB).</Banner></View> : null}
        <T variant="small" faint style={{ marginTop: spacing.sm }}>
          Narration for the animated lane: {status.voice_mode === 'elevenlabs' ? 'ElevenLabs' : status.voice_mode === 'stand-in' ? 'free stand-in voice only (the studio marks those videos “Do not publish”)' : 'not available'}. The animated lane uses hand-built scenes, so it stays a human-directed process; carousels are automatic.
        </T>
      </Card>

      {err ? <Banner tone="danger">{err}</Banner> : null}

      <SectionTitle title="Make a carousel" />
      <Card style={{ gap: spacing.md }}>
        <T muted>Turns what a video says into 5 to 6 Instagram slides (1080×1350), rendered by the Remotion carousel lane of the Vishnu studio. Slides are stills, so you review them before anything is posted.</T>
        {ready.length ? (
          <Field label="From a storyboard">
            <Chips options={ready.slice(0, 8).map((s) => ({ value: s.id, label: (s.storyboard?.title || s.id).slice(0, 34) }))} value={sbId} allowEmpty onChange={(v) => setSbId(v)} />
          </Field>
        ) : null}
        {!sbId ? <Field label="Or paste text"><Input value={text} onChangeText={setText} multiline placeholder="Paste a script or an article. At least a few sentences." /></Field> : null}
        <Field label="Title (optional)"><Input value={title} onChangeText={setTitle} placeholder="Leave empty to use the storyboard's title" /></Field>
        <Button label="Make the carousel" variant="primary" icon="layers" loading={busy === 'car'} disabled={!status.carousel_ready || (!sbId && text.trim().length < 40)}
          hint={status.carousel_ready ? 'Pick a storyboard or paste some text' : 'Install Remotion first'}
          onPress={() => act('car', () => editor.vsMakeCarousel({ ...(sbId ? { storyboard_id: sbId } : { text }), ...(title.trim() ? { title: title.trim() } : {}) }), 'Making the carousel')} />
      </Card>

      {cars.length === 0 ? null : cars.map((c) => (
        <Card key={c.id} style={{ gap: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, minWidth: 220 }}>
              <T variant="h3">{c.title}</T>
              <T variant="small" muted>{c.generated_by === 'llm' ? 'Slides written by AI from the transcript' : c.generated_by === 'template' ? 'Plain template (no LLM answered)' : ''}</T>
            </View>
            <Badge label={c.status === 'writing' ? 'Writing slides' : c.status === 'rendering' ? 'Rendering with Remotion' : c.status === 'ready' ? 'Ready' : 'Failed'} tone={c.status === 'ready' ? 'success' : c.status === 'failed' ? 'danger' : 'info'} dot />
          </Row>
          {c.error ? <Banner tone="danger">{c.error}</Banner> : null}
          {c.status === 'ready' && c.slug ? (
            <>
              {Platform.OS === 'web' ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {c.files.filter((f) => f.startsWith('slide-')).map((f) => (
                    <Image key={f} source={{ uri: file(c.slug!, f) }} style={{ width: 180, height: 225, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }} resizeMode="contain" />
                  ))}
                </View>
              ) : null}
              <Row gap={spacing.sm}>
                <LinkText href={file(c.slug, 'contact-sheet.png')}>Open the contact sheet</LinkText>
                {c.files.filter((f) => f.startsWith('slide-')).slice(0, 1).map((f) => <LinkText key={f} href={file(c.slug!, f)}>Slide 1 (full size)</LinkText>)}
              </Row>
              <T variant="small" faint>Check every line against what was actually said (names are machine-transcribed). Then sign the slides off; download the PNGs from the links and post them on Instagram as a carousel.</T>
              <Button label={videos.find((v) => v.slug === c.slug)?.signed_off ? 'Signed off (undo)' : 'I checked the slides: sign off'} small variant={videos.find((v) => v.slug === c.slug)?.signed_off ? 'secondary' : 'primary'} icon="check"
                loading={busy === c.id} onPress={() => act(c.id, () => editor.vsGate(c.slug!, 'Slides', !videos.find((v) => v.slug === c.slug)?.signed_off))} />
            </>
          ) : null}
        </Card>
      ))}

      <SectionTitle title="Music library" />
      <Card>
        {music && music.tracks.length ? music.tracks.map((t) => (
          <Row key={t.id} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
            <T>{t.name}</T><T variant="small" muted>{t.video} · {t.size_mb} MB</T>
          </Row>
        )) : <T muted>{music?.note ?? 'No tracks.'}</T>}
        <T variant="small" faint style={{ marginTop: 6 }}>Music comes only from tracks already on disk (the studio never makes music with ElevenLabs credits). Pick one on a storyboard to put it under the voice.</T>
      </Card>

      <SectionTitle title="Studio library" />
      <Chips options={lanes.map((l) => ({ value: l, label: l }))} value={laneFilter} allowEmpty onChange={(v) => setLaneFilter(v)} />
      {shown.length === 0 ? <EmptyState icon="film" title="No videos" message="The studio's videos folder is empty." /> : shown.map((v) => (
        <Card key={v.slug}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, minWidth: 220, gap: 2 }}>
              <T variant="h3">{v.title}</T>
              <T variant="small" muted>{v.slug} · {v.lane}</T>
              {v.outputs.slice(0, 4).map((o) => <LinkText key={o} href={file(v.slug, o)}>{o}</LinkText>)}
            </View>
            <View style={{ gap: 4, alignItems: 'flex-end' }}>
              {v.checks.length === 0 ? <Badge label="no sign-offs" tone="neutral" /> : v.checks.map((c) => (
                <Button key={c.stage} small variant={c.done ? 'secondary' : 'primary'} label={`${c.done ? '✓' : '○'} ${c.stage.split(':')[0]}`}
                  onPress={() => act(`${v.slug}:${c.stage}`, () => editor.vsGate(v.slug, c.stage.split(':')[0], !c.done))} />
              ))}
            </View>
          </Row>
        </Card>
      ))}
    </Page>
  );
}
