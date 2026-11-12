import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Page, Row } from '../../components/Page';
import { Badge, Button, Card, Chips, EmptyState, ErrorState, LinkText, Skeleton, T } from '../../components/ui';
import { VideoPlayer } from '../../components/VideoPlayer';
import { absoluteUrl, errorText } from '../../api/client';
import { editor, num, when } from '../../api/editor';
import { spacing } from '../../theme';

type Tab = 'renders' | 'sfx';

export default function MediaLibrary() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('renders');
  const [media, setMedia] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState<string>('');
  const [playing, setPlaying] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const audio = useRef<any>(null);

  const load = useCallback(async () => { try { setMedia(await editor.media()); setError(null); } catch (e) { setError(errorText(e)); } }, []);
  useEffect(() => { load(); return () => { audio.current?.pause?.(); }; }, [load]);

  function play(s: any) {
    if (Platform.OS !== 'web') return;
    audio.current?.pause?.();
    if (playing === s.id) { setPlaying(null); return; }
    const a = new (globalThis as any).Audio(absoluteUrl(s.url));
    a.onended = () => setPlaying(null);
    a.play().catch(() => setPlaying(null));
    audio.current = a; setPlaying(s.id);
  }

  if (error && !media) return <Page title="Media Library"><ErrorState message={error} onRetry={load} /></Page>;
  if (!media) return <Page title="Media Library"><Skeleton height={160} /></Page>;

  const cats = Array.from(new Set<string>(media.sfx.map((s: any) => s.category)));
  const sfx = media.sfx.filter((s: any) => !cat || s.category === cat);

  return (
    <Page title="Media Library" subtitle="Your renders and the CC0 sound-effect library the editor uses">
      <Chips<Tab> options={[{ value: 'renders', label: `Renders (${media.total_renders})` }, { value: 'sfx', label: `Sound effects (${media.total_sfx})` }]} value={tab} onChange={(v) => v && setTab(v)} />

      {tab === 'renders' ? (
        media.renders.length === 0 ? (
          <EmptyState icon="film" title="No renders yet" message="Approve a storyboard and render it. Finished videos show up here." action={<Button label="Open storyboards" icon="layers" onPress={() => router.push('/storyboard')} />} />
        ) : media.renders.map((r: any) => (
          <Card key={r.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1, minWidth: 240, gap: 4 }}>
                <Row gap={spacing.sm}><T variant="h3">{r.title || r.filename}</T>{r.quality ? <Badge label={r.quality} tone={r.quality === 'final' ? 'success' : 'neutral'} /> : <Badge label="imported" tone="neutral" />}</Row>
                <T variant="small" muted>{r.duration ? `${num(r.duration)}s · ` : ''}{r.size_mb} MB · {when(r.modified)}</T>
                <LinkText href={absoluteUrl(r.url) as string}>Open file</LinkText>
              </View>
              <Row gap={spacing.sm}>
                <Button label={open === r.id ? 'Hide' : 'Preview'} small icon="play" onPress={() => setOpen(open === r.id ? null : r.id)} />
                {r.storyboard_id ? <Button label="Storyboard" small icon="layers" onPress={() => router.push({ pathname: '/storyboard', params: { sb: r.storyboard_id } })} /> : null}
                {r.storyboard_id && r.quality === 'final' ? <Button label="Publish" small variant="primary" icon="send" onPress={() => router.push({ pathname: '/publishing', params: { sb: r.storyboard_id } })} /> : null}
              </Row>
            </Row>
            {open === r.id ? <View style={{ marginTop: spacing.md }}><VideoPlayer uri={absoluteUrl(r.url) as string} /></View> : null}
          </Card>
        ))
      ) : (
        <>
          <Chips options={cats.map((c) => ({ value: c, label: c }))} value={cat} onChange={(v) => setCat(v)} allowEmpty />
          {Platform.OS !== 'web' ? <T variant="small" muted>Audition playback is available in the web dashboard.</T> : null}
          <Row style={{ alignItems: 'stretch' }}>
            {sfx.map((s: any) => (
              <Card key={s.id} style={{ flexGrow: 1, flexBasis: 200, minWidth: 190 }}>
                <Row style={{ justifyContent: 'space-between' }}><T variant="h3">{s.name}</T><Badge label={s.category} tone="neutral" /></Row>
                <T variant="small" muted>{s.duration ? `${num(s.duration)}s` : ''} · {s.license}</T>
                <View style={{ height: spacing.sm }} />
                <Button label={playing === s.id ? 'Stop' : 'Play'} small icon={playing === s.id ? 'x' : 'play'} onPress={() => play(s)} />
              </Card>
            ))}
          </Row>
        </>
      )}
    </Page>
  );
}
