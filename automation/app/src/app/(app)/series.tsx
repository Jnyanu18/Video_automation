import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Page, Row } from '../../components/Page';
import { Badge, Banner, Button, Card, Chips, ConfirmDialog, EmptyState, ErrorState, Field, Input, SectionTitle, Sheet, Skeleton, T } from '../../components/ui';
import { errorText } from '../../api/client';
import { Episode, Series, editor } from '../../api/editor';
import { useToast } from '../../state/toast';
import { Tone, radius, spacing, useTheme } from '../../theme';

const EP_TONE: Record<string, Tone> = { OUTLINED: 'neutral', SCRIPTED: 'info', STORYBOARDED: 'warning', RENDERED: 'success', PUBLISHED: 'success' };

export default function SeriesEngine() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const [list, setList] = useState<Series[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<string>('');
  const [title, setTitle] = useState('');
  const [niche, setNiche] = useState('');
  const [count, setCount] = useState('3');
  const [angle, setAngle] = useState('Counter-intuitive truth');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ ep: Episode; hook: string; cliffhanger: string; title: string; continuity: string } | null>(null);
  const [pick, setPick] = useState<Episode | null>(null);
  const [files, setFiles] = useState<{ path: string; name: string; size_mb: number }[] | null>(null);
  const [path, setPath] = useState('');
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(async () => {
    try { const s = await editor.series(); setList(s); setError(null); setSel((cur) => (s.some((x) => x.id === cur) ? cur : s[0]?.id ?? '')); } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const series = list?.find((s) => s.id === sel) ?? null;

  async function run(name: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(name); setErr(null);
    try { await fn(); await load(); if (ok) toast(ok); } catch (e) { setErr(errorText(e)); } finally { setBusy(null); }
  }

  async function openPicker(ep: Episode) {
    setPick(ep); setPath('');
    if (!files) { try { setFiles((await editor.footage()).files); } catch { setFiles([]); } }
  }

  if (error && !list) return <Page title="Series Engine"><ErrorState message={error} onRetry={load} /></Page>;
  if (!list) return <Page title="Series Engine"><Skeleton height={140} /></Page>;

  return (
    <Page title="Series Engine" subtitle="Plan an episodic arc where each reel ends on a loop the next one closes">
      <Card>
        <SectionTitle title="Plan a new series" />
        <View style={{ gap: spacing.md }}>
          <Row style={{ alignItems: 'flex-start' }}>
            <View style={{ flex: 2, minWidth: 220 }}><Field label="Series title"><Input value={title} onChangeText={setTitle} placeholder="e.g. 30-day SaaS growth engine" /></Field></View>
            <View style={{ flex: 2, minWidth: 220 }}><Field label="Niche / audience"><Input value={niche} onChangeText={setNiche} placeholder="e.g. Indie hackers" /></Field></View>
            <View style={{ width: 90 }}><Field label="Episodes"><Input value={count} onChangeText={setCount} keyboardType="number-pad" /></Field></View>
          </Row>
          <Field label="Hook angle"><Input value={angle} onChangeText={setAngle} /></Field>
          <Button label="Generate series plan" variant="primary" icon="sparkles" loading={busy === 'gen'} disabled={!title.trim() || !niche.trim()}
            onPress={() => run('gen', async () => { const r = await editor.generateSeries({ title, niche, episodes_count: parseInt(count, 10) || 3, hook_angle: angle }); setSel(r.series.id); setTitle(''); }, 'Series planned')} />
        </View>
      </Card>

      {err ? <Banner tone="danger">{err}</Banner> : null}

      {list.length === 0 ? (
        <EmptyState icon="tv" title="No series yet" message="Plan one above. Every episode gets a hook for the first two seconds and a cliffhanger for the last." />
      ) : (
        <>
          <Chips options={list.map((s) => ({ value: s.id, label: s.title }))} value={sel} onChange={(v) => v && setSel(v)} />
          {series ? (
            <>
              <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, minWidth: 240, gap: 4 }}>
                    <Row gap={spacing.sm}>
                      <T variant="h1">{series.title}</T>
                      <Badge label={series.generated_by === 'llm' ? 'Written by AI' : 'Template plan'} tone={series.generated_by === 'llm' ? 'success' : 'warning'} />
                    </Row>
                    <T muted>{series.niche}</T>
                    {series.generated_by === 'template' ? <T variant="small" color={colors.warning}>No LLM answered, so this is a generic structure. Edit each episode, or configure an LLM key and generate again.</T> : null}
                  </View>
                  <View style={{ gap: 6, minWidth: 220 }}>
                    <T variant="label" muted>PROGRESS</T>
                    <Row gap={spacing.sm}>
                      <Badge label={`${series.progress.storyboarded}/${series.progress.total} storyboarded`} tone="info" />
                      <Badge label={`${series.progress.rendered} rendered`} tone="success" />
                      <Badge label={`${series.progress.published} published`} tone="success" />
                    </Row>
                    <Button label="Delete series" variant="ghost" small icon="trash" onPress={() => setConfirm(true)} />
                  </View>
                </Row>
              </Card>

              {series.episodes.map((ep, i) => (
                <View key={ep.episode_number} style={styles.epRow}>
                  <View style={[styles.rail, { backgroundColor: colors.border }]} />
                  <Card style={{ flex: 1 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <T variant="h2">Episode {ep.episode_number}: {ep.title}</T>
                      <Badge label={ep.status} tone={EP_TONE[ep.status] ?? 'neutral'} dot />
                    </Row>
                    <View style={[styles.block, { backgroundColor: colors.surfaceAlt }]}><T variant="small" faint>HOOK (first 2 seconds)</T><T>{ep.hook}</T></View>
                    <View style={[styles.block, { backgroundColor: colors.surfaceAlt }]}>
                      <T variant="small" faint>{i === series.episodes.length - 1 ? 'CLOSING CALL TO ACTION' : 'OPEN LOOP (pays off in the next episode)'}</T>
                      <T>{ep.cliffhanger || '—'}</T>
                    </View>
                    {ep.continuity ? <T variant="small" muted style={{ marginTop: 6 }}>Continuity: {ep.continuity}</T> : null}
                    <Row gap={spacing.sm} style={{ marginTop: spacing.md }}>
                      <Button label="Edit" small icon="edit" onPress={() => setEdit({ ep, hook: ep.hook, cliffhanger: ep.cliffhanger, title: ep.title, continuity: ep.continuity })} />
                      {ep.storyboard_id
                        ? <Button label="Open storyboard" small variant="primary" icon="layers" onPress={() => router.push({ pathname: '/storyboard', params: { sb: ep.storyboard_id! } })} />
                        : <Button label="Create storyboard" small variant="primary" icon="film" onPress={() => openPicker(ep)} />}
                      {ep.score !== null && ep.score !== undefined ? <Badge label={`score ${Math.round(ep.score * 100)}%`} tone="info" /> : null}
                    </Row>
                  </Card>
                </View>
              ))}
            </>
          ) : null}
        </>
      )}

      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={`Edit episode ${edit?.ep.episode_number ?? ''}`}>
        {edit ? (
          <View style={{ gap: spacing.md, padding: spacing.lg }}>
            <Field label="Title"><Input value={edit.title} onChangeText={(v) => setEdit({ ...edit, title: v })} /></Field>
            <Field label="Hook"><Input value={edit.hook} onChangeText={(v) => setEdit({ ...edit, hook: v })} multiline /></Field>
            <Field label="Open loop / call to action"><Input value={edit.cliffhanger} onChangeText={(v) => setEdit({ ...edit, cliffhanger: v })} multiline /></Field>
            <Field label="Continuity"><Input value={edit.continuity} onChangeText={(v) => setEdit({ ...edit, continuity: v })} /></Field>
            <Button label="Save episode" variant="primary" loading={busy === 'save'}
              onPress={() => run('save', async () => { await editor.patchEpisode(series!.id, edit.ep.episode_number, { title: edit.title, hook: edit.hook, cliffhanger: edit.cliffhanger, continuity: edit.continuity }); setEdit(null); }, 'Episode saved')} />
          </View>
        ) : null}
      </Sheet>

      <Sheet visible={!!pick} onClose={() => setPick(null)} title={`Footage for episode ${pick?.episode_number ?? ''}`}>
        <View style={{ gap: spacing.md, padding: spacing.lg }}>
          <T muted>Pick a file from the raw-footage folder, or paste a path inside an allowed media folder. The editor writes the storyboard using this episode’s hook and open loop.</T>
          {files === null ? <Skeleton height={60} /> : files.length === 0 ? <T faint>No videos found in the raw-footage folder.</T> : files.slice(0, 40).map((f) => (
            <Button key={f.path} label={`${f.name}  (${f.size_mb} MB)`} small variant={path === f.path ? 'primary' : 'secondary'} onPress={() => setPath(f.path)} />
          ))}
          <Field label="Or a file path"><Input value={path} onChangeText={setPath} autoCapitalize="none" autoCorrect={false} placeholder="J:\ai editor\raw footage\clip.mp4" /></Field>
          <Button label="Create storyboard" variant="primary" icon="film" loading={busy === 'sb'} disabled={!path.trim()}
            onPress={() => run('sb', async () => {
              const r: any = await editor.episodeStoryboard(series!.id, pick!.episode_number, { video_path: path.trim() });
              setPick(null);
              router.push({ pathname: '/storyboard', params: { sb: r.storyboard_id } });
            })} />
        </View>
      </Sheet>

      <ConfirmDialog visible={confirm} danger title="Delete this series plan?" confirmLabel="Delete"
        message="Episodes and their links are removed. Storyboards already created are kept."
        onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); run('del', () => editor.deleteSeries(series!.id), 'Series deleted'); }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  epRow: { flexDirection: 'row', gap: spacing.md },
  rail: { width: 3, borderRadius: 2 },
  block: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md, gap: 2 },
});
