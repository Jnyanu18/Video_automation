import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Screen } from '../../components/Screen';
import { Banner, Button, Card, Chips, Field, Input, Picker, T } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { errorText, get, post, uploadVideo } from '../../api/client';
import { editor } from '../../api/editor';
import type { Options, UploadInfo } from '../../api/types';
import { useQuery } from '../../state/useQuery';
import { useToast } from '../../state/toast';
import { font, radius, spacing, useTheme } from '../../theme';

type Mode = 'url' | 'editor' | 'upload';

const val = (x: string | { value: string }) => (typeof x === 'string' ? x : x.value);
const tagsOf = (s: string) => s.split(/[\s,]+/).filter(Boolean).map((t) => (t.startsWith('#') ? t : '#' + t));

export default function NewReel() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('editor');
  const { data: options } = useQuery<Options>(() => get('/api/options'), [], { live: false });

  // shared fields
  const [niche, setNiche] = useState('');
  const [voiceStyle, setVoiceStyle] = useState('');
  const [notes, setNotes] = useState('');

  // url mode
  const [url, setUrl] = useState('');
  const [avatarId, setAvatarId] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [urlFallbackAvailable, setUrlFallbackAvailable] = useState(false);

  // upload & editor mode video picker
  const [picked, setPicked] = useState<{ name: string; type: string; uri: string; blob?: Blob } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [staged, setStaged] = useState<UploadInfo | null>(null);

  // upload mode fields
  const [caption, setCaption] = useState('');
  const [overlay, setOverlay] = useState('');
  const [tags, setTags] = useState('');

  // AI Video Editor mode fields
  const params = useLocalSearchParams<{ style?: string; footage?: string; note?: string; prompt?: string }>();
  const [editorStyle, setEditorStyle] = useState(params.style || 'viral_hook_fast_pace');
  const [editorPrompt, setEditorPrompt] = useState('Cut dead air and silences, keep speech fast and engaging, reframe to 9:16 vertical, add karaoke captions.');
  const [seriesMode, setSeriesMode] = useState(false);
  const [sendabilityFocus, setSendabilityFocus] = useState(true);
  const [styleList, setStyleList] = useState<{ value: string; label: string }[]>([]);
  const [footage, setFootage] = useState<{ path: string; name: string; size_mb: number }[]>([]);
  const [footagePath, setFootagePath] = useState('');
  const [editorUrl, setEditorUrl] = useState('');
  const [director, setDirector] = useState<'auto' | 'manual'>('auto');
  const [note, setNote] = useState('');

  useEffect(() => {
    get('/api/editor/settings').then((r: any) => {
      if (!params.style) setEditorStyle(r.settings.default_style);
      setEditorPrompt(r.settings.default_prompt);
    }).catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode !== 'editor') return;
    editor.styles().then((r: any) => setStyleList([...Object.values(r.presets), ...Object.values(r.custom)].map((p: any) => ({ value: p.name, label: p.name.replace(/_/g, ' ') })))).catch(() => undefined);
    editor.footage().then((r) => setFootage(r.files)).catch(() => undefined);
  }, [mode]);
  useEffect(() => {
    if (params.style) { setEditorStyle(params.style); setMode('editor'); }
    if (params.prompt) { setEditorPrompt(params.prompt); setDirector('manual'); setMode('editor'); }
    if (params.note) { setNote(params.note); setMode('editor'); }
    if (params.footage) { setFootagePath(params.footage); setMode('editor'); }
  }, [params.style, params.prompt, params.note, params.footage]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const niches = (options?.presets?.niches ?? []).map(val);
  const voices = (options?.presets?.brandVoices ?? []).map(val);
  const shared = () => ({
    ...(niche ? { niche } : {}), ...(voiceStyle ? { brandVoice: voiceStyle } : {}), ...(notes.trim() ? { brandVoiceNotes: notes.trim() } : {}),
  });

  function done(r: { recordId: string; duplicate?: boolean }) {
    toast(r.duplicate ? 'That one was already submitted. Opening it.' : 'Submitted.');
    router.replace({ pathname: '/reels/[id]', params: { id: r.recordId } });
  }

  async function submitUrl() {
    if (!/^https?:\/\//i.test(url.trim())) return setError('Paste a full link that starts with https://');
    setBusy(true); setError(null); setUrlFallbackAvailable(false);
    try {
      done(await post('/api/reels', { url: url.trim(), ...shared(), ...(avatarId ? { avatarId } : {}), ...(voiceId ? { voiceId } : {}) }));
    } catch (e) {
      setError(errorText(e));
      setUrlFallbackAvailable(true);
    } finally { setBusy(false); }
  }

  async function autoEditUrlFallback() {
    if (!url.trim()) return;
    setBusy(true); setError(null);
    try {
      const res = await editor.createStoryboard({
        url: url.trim(),
        prompt: notes.trim() || 'Remake reel from link',
        style: editorStyle,
      });
      toast('The editor is drafting your storyboard.');
      router.push({ pathname: '/storyboard', params: { sb: res.storyboard_id } });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function chooseFile() {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({ type: ['video/mp4', 'video/quicktime'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const f = { name: a.name, type: a.mimeType || 'video/mp4', uri: a.uri, blob: Platform.OS === 'web' ? (a.file as Blob | undefined) : undefined };
    setPicked(f); setStaged(null); setFootagePath(''); setProgress(0);
    try {
      const up = await uploadVideo(f, setProgress);
      setStaged(up);
    } catch (e) {
      setPicked(null); setError(errorText(e));
    } finally { setProgress(null); }
  }

  async function generateStoryboard() {
    const link = editorUrl.trim();
    if (!link && !staged && !footagePath) return setError('Paste a link, upload a video, or pick a file from the raw-footage folder.');
    if (link && !/^https:\/\//i.test(link)) return setError('The link must start with https://');
    setBusy(true); setError(null);
    try {
      const source = link ? { url: link } : staged ? { uploadId: staged.uploadId } : { video_path: footagePath };
      const res = director === 'auto'
        ? await editor.autoEdit({ ...source, style: editorStyle, instruction: note.trim() })
        : await editor.createStoryboard({ ...source, style: editorStyle, prompt: editorPrompt, series_mode: seriesMode, sendability_focus: sendabilityFocus });
      toast(director === 'auto' ? 'The director is working on your reel.' : 'The editor is drafting your storyboard.');
      router.push({ pathname: '/storyboard', params: { sb: res.storyboard_id } });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitUpload() {
    const targetUploadId = staged?.uploadId;
    if (!targetUploadId) return setError('Choose a video first.');
    const promptText = caption.trim() || 'Original reel cut';
    setBusy(true); setError(null);
    try {
      const res = await editor.createStoryboard({
        uploadId: targetUploadId,
        prompt: promptText,
        style: editorStyle,
      });
      toast('Storyboard created from uploaded video.');
      router.push({ pathname: '/storyboard', params: { sb: res.storyboard_id } });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const uploading = progress !== null;

  return (
    <Screen title="New reel" subtitle="Turn viral reels or raw footage into original, publish-ready videos." narrow>
      {/* Mode switcher tabs */}
      <View style={[styles.seg, { backgroundColor: colors.surfaceAlt }]}>
        {([
          { key: 'editor', label: 'Auto-edit', icon: 'sparkles', isPrimary: true },
          { key: 'upload', label: 'Upload ready video', icon: 'upload', isPrimary: false },
          { key: 'url', label: 'AI avatar remake', icon: 'link', isPrimary: false },
        ] as const).map((m) => {
          const isSelected = mode === m.key;
          return (
            <Pressable
              key={m.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              onPress={() => { setMode(m.key); setError(null); setUrlFallbackAvailable(false); }}
              style={[
                styles.segItem,
                isSelected && { backgroundColor: colors.surface },
                m.isPrimary && !isSelected && { borderColor: colors.primary + '33', borderWidth: 1 },
              ]}
            >
              <Icon name={m.icon as any} size={15} color={isSelected ? colors.primary : colors.textMuted} />
              <T variant="label" color={isSelected ? colors.primary : colors.textMuted}>{m.label}</T>
              {m.isPrimary ? (
                <View style={{ backgroundColor: isSelected ? colors.primarySoft : 'transparent', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 }}>
                  <T variant="small" style={{ fontSize: 10, fontWeight: '700' }} color={colors.primary}>AI</T>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Card style={{ gap: spacing.lg }}>
        {/* MODE 1: From reel link */}
        {mode === 'url' ? (
          <>
            <Field label="Instagram reel link">
              <Input value={url} onChangeText={(v) => { setUrl(v); setError(null); setUrlFallbackAvailable(false); }} placeholder="https://www.instagram.com/reel/…" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
            </Field>

            <Field label="Niche">
              <Chips options={niches.map((n) => ({ value: n, label: n }))} value={niche} allowEmpty onChange={setNiche} />
            </Field>
            <Field label="Brand voice">
              <Chips options={voices.map((n) => ({ value: n, label: n }))} value={voiceStyle} allowEmpty onChange={setVoiceStyle} />
            </Field>
            <Field label="Voice notes" hint="Optional. Anything the writer should know about your tone.">
              <Input value={notes} onChangeText={setNotes} multiline style={{ minHeight: 72 }} />
            </Field>

            <Field label="Avatar">
              <Picker value={avatarId} placeholder="Default avatar" onChange={setAvatarId} options={(options?.avatars ?? []).map((a) => ({ value: a.id, label: a.name || a.id }))} />
            </Field>
            <Field label="Voice" hint={options?.hasMoreAvatars || options?.hasMoreVoices ? 'Only the first page of avatars and voices is listed.' : undefined}>
              <Picker value={voiceId} placeholder="Default voice" onChange={setVoiceId}
                options={(options?.voices ?? []).map((v) => ({ value: v.id, label: v.name || v.id, sub: v.language }))} />
            </Field>

            {urlFallbackAvailable ? (
              <Banner tone="warning">
                <View style={{ gap: spacing.sm }}>
                  <T variant="body" style={{ fontWeight: '600' }}>
                    Avatar remake pipeline unavailable or unconfigured
                  </T>
                  <T variant="small">
                    {error ? `Reason: ${error}. ` : ''}The legacy n8n pipeline could not be reached. You can auto-edit this URL directly with the native AI Video Editor engine instead:
                  </T>
                  <Button
                    label="Auto-edit this URL directly"
                    variant="primary"
                    icon="sparkles"
                    loading={busy}
                    onPress={autoEditUrlFallback}
                  />
                </View>
              </Banner>
            ) : error ? (
              <Banner tone="danger">{error}</Banner>
            ) : null}
            <Button label="Submit reel" variant="primary" icon="send" full loading={busy} onPress={submitUrl} />
          </>
        ) : null}

        {/* MODE 2: Auto-edit. A link or a file in; a reviewable storyboard out. */}
        {mode === 'editor' ? (
          <>
            <Banner tone="info">
              Paste a link or add a video. The director transcribes it, tightens the cut, then plans the hook, animated diagrams, zooms and sound effects. You review the storyboard and approve before anything is rendered.
            </Banner>

            <Field label="Link to a video" hint="Instagram, YouTube, TikTok and similar. Only use videos you own or have permission to edit.">
              <Input value={editorUrl} onChangeText={(v) => { setEditorUrl(v); if (v.trim()) { setStaged(null); setPicked(null); setFootagePath(''); } }}
                placeholder="https://www.instagram.com/reel/…" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
            </Field>

            <Field label="Or a video file" hint="MP4 or MOV from your computer.">
              <Pressable accessibilityRole="button" onPress={uploading ? undefined : chooseFile}
                style={({ hovered }: any) => [styles.drop, { borderColor: staged ? colors.success : hovered ? colors.primary : colors.border, backgroundColor: colors.surfaceAlt }]}>
                <Icon name={staged ? 'check' : 'upload'} size={22} color={staged ? colors.success : colors.primary} />
                <View style={{ flex: 1 }}>
                  <T variant="h3" numberOfLines={1}>{picked ? picked.name : 'Choose a video'}</T>
                  <T variant="small" muted>
                    {uploading ? `Uploading… ${progress}%` : staged ? `Uploaded · ${Math.round(staged.durationSeconds)}s · ${(staged.sizeBytes / 1048576).toFixed(1)} MB` : 'Tap to browse'}
                  </T>
                </View>
              </Pressable>
              {uploading ? <View style={[styles.bar, { backgroundColor: colors.border }]}><View style={[styles.barFill, { width: `${progress}%`, backgroundColor: colors.primary }]} /></View> : null}
            </Field>

            {footage.length ? (
              <Field label="Or footage already on this computer" hint="Files in the raw-footage folder">
                <Picker value={footagePath} placeholder="Choose a file" onChange={(v) => { setFootagePath(v); if (v) { setStaged(null); setPicked(null); setEditorUrl(''); } }}
                  options={footage.map((f) => ({ value: f.path, label: f.name, sub: `${f.size_mb} MB` }))} />
              </Field>
            ) : null}

            <Field label="Editing style" hint="Sets pacing, pause length, caption look and loudness.">
              <Chips options={styleList.length ? styleList : [{ value: editorStyle, label: editorStyle.replace(/_/g, ' ') }]} value={editorStyle} onChange={(v) => v && setEditorStyle(v)} />
            </Field>

            <Field label="Who decides the edit?">
              <Chips<'auto' | 'manual'> options={[{ value: 'auto', label: 'The director (recommended)' }, { value: 'manual', label: 'I will describe it' }]} value={director} onChange={(v) => v && setDirector(v)} />
            </Field>

            {director === 'auto' ? (
              <Field label="Notes for the director (optional)" hint="For example: focus on the pricing claim, keep it under 45 seconds.">
                <Input value={note} onChangeText={setNote} multiline style={{ minHeight: 60 }} />
              </Field>
            ) : (
              <>
                <Field label="Editor instructions" hint="The agent edits with tools from this description. It can lose track on long, multi-step requests.">
                  <Input value={editorPrompt} onChangeText={setEditorPrompt} multiline style={{ minHeight: 60 }} />
                </Field>
                <Field label="Growth options">
                  <Chips<'dm' | 'series'> options={[{ value: 'dm', label: sendabilityFocus ? 'Share trigger: on' : 'Share trigger: off' }, { value: 'series', label: seriesMode ? 'Series mode: on' : 'Series mode: off' }]}
                    value="" onChange={(v) => { if (v === 'dm') setSendabilityFocus(!sendabilityFocus); if (v === 'series') setSeriesMode(!seriesMode); }} />
                </Field>
              </>
            )}

            <Button label={director === 'auto' ? 'Auto-edit this video' : 'Generate storyboard'} variant="primary" icon="sparkles" full loading={busy}
              disabled={uploading} onPress={generateStoryboard} />
            <T variant="small" faint>Runs in the background; the next screen shows each step. Nothing is rendered or published until you approve.</T>

            {error ? <Banner tone="danger">{error}</Banner> : null}
          </>
        ) : null}

        {/* MODE 3: Upload ready video */}
        {mode === 'upload' ? (
          <>
            <Banner tone="info">
              Upload your video directly into the unified video editing engine. It creates a storyboard ready for cut editing, captions, and rendering without requiring Airtable.
            </Banner>

            <Field label="Video file" hint="MP4 or MOV.">
              <Pressable accessibilityRole="button" onPress={uploading ? undefined : chooseFile}
                style={({ hovered }: any) => [styles.drop, { borderColor: staged ? colors.success : hovered ? colors.primary : colors.border, backgroundColor: colors.surfaceAlt }]}>
                <Icon name={staged ? 'check' : 'upload'} size={22} color={staged ? colors.success : colors.primary} />
                <View style={{ flex: 1 }}>
                  <T variant="h3" numberOfLines={1}>{picked ? picked.name : 'Choose a video'}</T>
                  <T variant="small" muted>
                    {uploading ? `Uploading… ${progress}%` : staged ? `Uploaded · ${Math.round(staged.durationSeconds)}s · ${(staged.sizeBytes / 1048576).toFixed(1)} MB` : 'Tap to browse'}
                  </T>
                </View>
              </Pressable>
              {uploading ? <View style={[styles.bar, { backgroundColor: colors.border }]}><View style={[styles.barFill, { width: `${progress}%`, backgroundColor: colors.primary }]} /></View> : null}
            </Field>

            <Field label="Caption / Editing instructions" hint="Guidance for the video storyboard cut.">
              <Input value={caption} onChangeText={setCaption} multiline placeholder="e.g. Cut dead air, hook in first 3s" />
            </Field>

            <Field label="Editing style" hint="Sets pacing, pause length, and caption styling.">
              <Chips options={styleList.length ? styleList : [{ value: editorStyle, label: editorStyle.replace(/_/g, ' ') }]} value={editorStyle} onChange={(v) => v && setEditorStyle(v)} />
            </Field>

            <Field label="On-screen overlay" hint="Optional text shown on the video."><Input value={overlay} onChangeText={setOverlay} /></Field>
            <Field label="Hashtags"><Input value={tags} onChangeText={setTags} placeholder="#fitness #tips" autoCapitalize="none" /></Field>

            <Field label="Niche">
              <Chips options={niches.map((n) => ({ value: n, label: n }))} value={niche} allowEmpty onChange={setNiche} />
            </Field>
            <Field label="Brand voice">
              <Chips options={voices.map((n) => ({ value: n, label: n }))} value={voiceStyle} allowEmpty onChange={setVoiceStyle} />
            </Field>

            {error ? <Banner tone="danger">{error}</Banner> : null}
            <Button label="Create storyboard" variant="primary" icon="sparkles" full loading={busy}
              disabled={!staged || uploading} onPress={submitUpload} />
          </>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', padding: 4, borderRadius: radius.md, marginBottom: spacing.md },
  segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 42, borderRadius: radius.sm + 2 },
  drop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed' },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: spacing.sm },
  barFill: { height: 6, borderRadius: 3 },
  storyboardBox: { borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md, marginTop: spacing.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', padding: spacing.md, borderWidth: 1, borderRadius: radius.sm },
  statCol: { alignItems: 'center' },
  sceneCard: { padding: spacing.md, borderWidth: 1, borderRadius: radius.sm, gap: 4 },
  captionPreview: { padding: 6, borderRadius: radius.sm / 2, marginTop: 4 },
});
void font;
