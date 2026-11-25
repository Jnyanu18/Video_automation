import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Page, Row } from '../../components/Page';
import { Badge, Banner, Button, Card, Chips, EmptyState, ErrorState, Input, SectionTitle, Skeleton, T } from '../../components/ui';
import { JobLog, STAGE_LABEL, stageTone, titleOf } from '../../components/studio';
import { VideoPlayer } from '../../components/VideoPlayer';
import { useWide } from '../../components/useWide';
import { absoluteUrl, errorText } from '../../api/client';
import { editor, num } from '../../api/editor';
import { Field } from '../../components/ui';
import { useStoryboards } from '../../state/useStoryboards';
import { useToast } from '../../state/toast';
import { radius, spacing, useTheme } from '../../theme';
import { StudioTabs } from '../../components/StudioTabs';

type Mode = 'revise' | 'ask';
interface Msg { role: 'user' | 'assistant' | 'system'; content: string }

const QUICK: { label: string; text: string; mode: Mode }[] = [
  { label: 'Tighten the hook', text: 'Start the cut right on the first spoken word and make sure nothing static holds for more than 1.5 seconds in the first 5 seconds.', mode: 'revise' },
  { label: 'Add a share call', text: 'Add a closing caption that asks viewers to send this to someone who needs it.', mode: 'revise' },
  { label: 'Sound effects', text: 'Place a whoosh on the first word and a pop on the most important caption. Keep it to 3 to 5 effects.', mode: 'revise' },
  { label: 'Hook ideas', text: 'Give me three alternative hooks for this reel, each under 12 words.', mode: 'ask' },
  { label: 'Where does it sag?', text: 'Looking at the scenes, where will viewers most likely drop off, and what would you change?', mode: 'ask' },
];

export default function AIStudio() {
  const router = useRouter();
  const toast = useToast();
  const wide = useWide();
  const { colors } = useTheme();
  const { list, current: sb, select, reload, error, loading } = useStoryboards();
  const [mode, setMode] = useState<Mode>('revise');
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Record<string, Msg[]>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const waitingSince = useRef<number | null>(null);
  const [refs, setRefs] = useState('');
  const [styleName, setStyleName] = useState('');
  const [learn, setLearn] = useState<{ status: 'running' | 'done' | 'failed'; message: string; error?: string; style?: string; learned_from?: number } | null>(null);

  const push = (id: string, m: Msg) => setMsgs((cur) => ({ ...cur, [id]: [...(cur[id] ?? []), m] }));

  // When a revision job finishes, show the agent's own reply (what it did, and what it could not do).
  useEffect(() => {
    if (!sb || waitingSince.current === null) return;
    if (sb.status === 'ready' && sb.updated_at * 1000 > waitingSince.current) {
      waitingSince.current = null;
      push(sb.id, { role: 'assistant', content: sb.error ? `The revision failed: ${sb.error}` : sb.agent_reply || 'Done.' });
      setBusy(false);
    }
  }, [sb?.status, sb?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(text: string, m: Mode) {
    if (!sb || !text.trim() || busy) return;
    setErr(null); setInput(''); push(sb.id, { role: 'user', content: (m === 'revise' ? '✂️ ' : '💬 ') + text });
    setBusy(true);
    try {
      if (m === 'revise') {
        waitingSince.current = Date.now() - 2000;
        await editor.chat(sb.id, text);
        await reload();
        toast('Revision started');
      } else {
        const history = (msgs[sb.id] ?? []).filter((x) => x.role !== 'system').map((x) => ({ role: x.role, content: x.content.replace(/^(✂️|💬) /, '') }));
        const r: any = await editor.copilot({ message: text, history, storyboard_id: sb.id });
        push(sb.id, { role: 'assistant', content: r.ok ? r.reply : r.message });
        setBusy(false);
      }
    } catch (e) {
      waitingSince.current = null; setBusy(false); setErr(errorText(e));
    }
  }

  if (loading) return <Page title="AI Studio"><Skeleton height={300} /></Page>;
  if (error && !list) return <Page title="AI Studio"><ErrorState message={error} onRetry={reload} /></Page>;

  return (
    <Page title="Video Editor" subtitle="Watch the cut, direct changes with AI, and fine-tune scenes">
      {!list?.length || !sb ? (
        <EmptyState icon="camera" title="No edit open" message="Start an edit from raw footage. The studio opens it here so you can watch it and direct changes."
          action={<Button label="Start a new edit" variant="primary" icon="plus" onPress={() => router.push('/new')} />} />
      ) : (
        <>
          <StudioTabs
            activeTab="copilot"
            sbId={sb.id}
            title={titleOf(sb)}
            stage={sb.stage}
            approved={sb.approved}
            rendering={sb.render_job?.status === 'running' || sb.render_job?.status === 'queued'}
            onPreviewRender={() => editor.render(sb.id, 'preview').then(reload).catch((e) => setErr(errorText(e)))}
            onFinalRender={sb.approved ? () => editor.render(sb.id, 'final').then(reload).catch((e) => setErr(errorText(e))) : undefined}
          />
          <View style={[styles.cols, wide && { flexDirection: 'row' }]}>
            <View style={{ flex: 1, gap: spacing.md, minWidth: 280 }}>
              <Card>
                <Row gap={spacing.sm} style={{ marginBottom: 8 }}>
                  <Badge label={STAGE_LABEL[sb.stage] ?? sb.stage} tone={stageTone(sb.stage)} dot />
                  {sb.approved ? <Badge label="Approved" tone="success" /> : null}
                </Row>
                <T variant="h2">{titleOf(sb)}</T>
                {sb.storyboard ? <T variant="small" muted>{num(sb.storyboard.duration.output_seconds)}s · {sb.storyboard.scenes_count} scenes · {sb.storyboard.sound_design.sfx_count} sound effects</T> : null}
                <View style={{ height: spacing.md }} />
                {sb.latest_render || sb.latest_preview ? (
                  <VideoPlayer uri={absoluteUrl((sb.latest_render ?? sb.latest_preview)!.video_url) as string} />
                ) : (
                  <View style={[styles.empty, { backgroundColor: colors.surfaceAlt }]}>
                    <T muted style={{ textAlign: 'center' }}>{sb.render_job?.status === 'running' ? 'Rendering…' : 'No render yet. Render a preview to watch the cut.'}</T>
                  </View>
                )}
                <Row gap={spacing.sm} style={{ marginTop: spacing.md }}>
                  <Button label="Preview render" small icon="play" disabled={sb.status !== 'ready' || sb.render_job?.status === 'running'} onPress={() => editor.render(sb.id, 'preview').then(reload).catch((e) => setErr(errorText(e)))} />
                  <Button label="Review & approve" small variant="primary" icon="layers" onPress={() => router.push({ pathname: '/storyboard', params: { sb: sb.id } })} />
                </Row>
                {(sb.latest_render ?? sb.latest_preview)?.warnings.map((w, i) => <View key={i} style={{ marginTop: 6 }}><Banner tone="warning">{w}</Banner></View>)}
              </Card>
              {sb.status === 'processing' ? <Card><JobLog events={sb.events} /></Card> : null}
            </View>

            <View style={{ flex: 1.2, gap: spacing.md, minWidth: 300 }}>
              <Card>
                <Chips<Mode> options={[{ value: 'revise', label: 'Revise the cut' }, { value: 'ask', label: 'Ask the director' }]} value={mode} onChange={(v) => v && setMode(v)} />
                <T variant="small" muted style={{ marginTop: 6 }}>{mode === 'revise' ? 'Applies real edits to the plan with tools, then re-checks it. Withdraws any approval.' : 'Advice only. Nothing in the video changes.'}</T>
                <View style={[styles.log, { backgroundColor: colors.surfaceAlt }]}>
                  {(msgs[sb.id] ?? []).length === 0 ? <T faint>Pick a suggestion or type below.</T> : (msgs[sb.id] ?? []).map((m, i) => (
                    <View key={i} style={[styles.bubble, m.role === 'user' ? { alignSelf: 'flex-end', backgroundColor: colors.primarySoft } : { alignSelf: 'flex-start', backgroundColor: colors.surface }]}>
                      <T>{m.content}</T>
                    </View>
                  ))}
                  {busy ? <T faint>{mode === 'revise' ? 'Editing…' : 'Thinking…'}</T> : null}
                </View>
                {err ? <Banner tone="danger">{err}</Banner> : null}
                <Row gap={spacing.sm} style={{ marginVertical: spacing.sm }}>
                  {QUICK.filter((q) => q.mode === mode).map((q) => <Button key={q.label} label={q.label} small variant="ghost" onPress={() => setInput(q.text)} />)}
                </Row>
                <Input value={input} onChangeText={setInput} multiline placeholder={mode === 'revise' ? 'What should change in the cut?' : 'Ask for hooks, pacing notes, caption wording…'} />
                <View style={{ height: spacing.sm }} />
                <Button label={mode === 'revise' ? 'Apply to the cut' : 'Ask'} variant="primary" icon="send" loading={busy} disabled={!input.trim() || sb.status === 'processing'} onPress={() => send(input, mode)} />
              </Card>
            </View>
          </View>
        </>
      )}

      <SectionTitle title="Learn a style from reference reels" />
      <Card style={{ gap: spacing.md }}>
        <T muted>Give the links (or file paths) of 1 to 5 reels whose editing you like. The studio measures their pacing, pauses, caption look and loudness, and saves the combined result as a style you can pick for any new edit. Only use videos you own or may analyse.</T>
        <Field label="Reference links or files, one per line"><Input value={refs} onChangeText={setRefs} multiline placeholder={'https://www.instagram.com/reel/…\nhttps://www.youtube.com/shorts/…'} autoCapitalize="none" /></Field>
        <Field label="Name for this style"><Input value={styleName} onChangeText={setStyleName} placeholder="e.g. founder_fast_cuts" autoCapitalize="none" /></Field>
        {learn ? <Banner tone={learn.status === 'failed' ? 'danger' : learn.status === 'done' ? 'success' : 'info'}>{learn.status === 'failed' ? learn.error : learn.status === 'done' ? `Saved style “${learn.style}” from ${learn.learned_from} reference(s).` : learn.message}</Banner> : null}
        <Button label="Learn this style" icon="sparkles" variant="primary" loading={learn?.status === 'running'} disabled={!refs.trim() || styleName.trim().length < 2}
          onPress={async () => {
            setErr(null);
            const lines = refs.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
            try {
              const r = await editor.learnStyle({ name: styleName.trim(), urls: lines.filter((l) => /^https?:/i.test(l)), video_paths: lines.filter((l) => !/^https?:/i.test(l)) });
              setLearn({ status: 'running', message: 'Starting' });
              const id = r.job.id;
              const tick = async () => {
                const j = await editor.styleJob(id).catch(() => null);
                if (!j) return;
                setLearn(j);
                if (j.status === 'running') setTimeout(tick, 2000);
              };
              setTimeout(tick, 1500);
            } catch (e) { setErr(errorText(e)); }
          }} />
      </Card>

    </Page>
  );
}

const styles = StyleSheet.create({
  cols: { gap: spacing.lg, flexDirection: 'column' },
  empty: { aspectRatio: 9 / 16, maxWidth: 320, width: '100%', alignSelf: 'center', borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  log: { marginTop: spacing.md, minHeight: 200, maxHeight: 360, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  bubble: { maxWidth: '88%', padding: spacing.md, borderRadius: radius.md },
});
