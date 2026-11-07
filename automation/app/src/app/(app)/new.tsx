import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Screen } from '../../components/Screen';
import { Banner, Button, Card, Chips, Field, Input, Picker, T } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { errorText, get, post, uploadVideo } from '../../api/client';
import type { Options, UploadInfo } from '../../api/types';
import { useQuery } from '../../state/useQuery';
import { useToast } from '../../state/toast';
import { font, radius, spacing, useTheme } from '../../theme';

type Mode = 'url' | 'upload';
const val = (x: string | { value: string }) => (typeof x === 'string' ? x : x.value);
const tagsOf = (s: string) => s.split(/[\s,]+/).filter(Boolean).map((t) => (t.startsWith('#') ? t : '#' + t));

export default function NewReel() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('url');
  const { data: options } = useQuery<Options>(() => get('/api/options'), [], { live: false });

  // shared fields
  const [niche, setNiche] = useState('');
  const [voiceStyle, setVoiceStyle] = useState('');
  const [notes, setNotes] = useState('');
  // url mode
  const [url, setUrl] = useState('');
  const [avatarId, setAvatarId] = useState('');
  const [voiceId, setVoiceId] = useState('');
  // upload mode
  const [picked, setPicked] = useState<{ name: string; type: string; uri: string; blob?: Blob } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [staged, setStaged] = useState<UploadInfo | null>(null);
  const [caption, setCaption] = useState('');
  const [overlay, setOverlay] = useState('');
  const [tags, setTags] = useState('');

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
    setBusy(true); setError(null);
    try {
      done(await post('/api/reels', { url: url.trim(), ...shared(), ...(avatarId ? { avatarId } : {}), ...(voiceId ? { voiceId } : {}) }));
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }

  async function chooseFile() {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({ type: ['video/mp4', 'video/quicktime'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const f = { name: a.name, type: a.mimeType || 'video/mp4', uri: a.uri, blob: Platform.OS === 'web' ? (a.file as Blob | undefined) : undefined };
    setPicked(f); setStaged(null); setProgress(0);
    try {
      const up = await uploadVideo(f, setProgress);
      setStaged(up);
    } catch (e) {
      setPicked(null); setError(errorText(e));
    } finally { setProgress(null); }
  }

  async function submitUpload() {
    if (!staged) return setError('Choose a video first.');
    if (!caption.trim()) return setError('Add a caption for the reel.');
    setBusy(true); setError(null);
    try {
      done(await post('/api/reels/upload', {
        uploadId: staged.uploadId, caption: caption.trim(), ...(overlay.trim() ? { overlay: overlay.trim() } : {}),
        hashtags: tagsOf(tags), ...shared(),
      }));
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }

  const uploading = progress !== null;

  return (
    <Screen title="New reel" subtitle="Remix a reel from a link, or bring your own video." narrow>
      <View style={[styles.seg, { backgroundColor: colors.surfaceAlt }]}>
        {(['url', 'upload'] as Mode[]).map((m) => (
          <Pressable key={m} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} onPress={() => { setMode(m); setError(null); }}
            style={[styles.segItem, mode === m && { backgroundColor: colors.surface }]}>
            <Icon name={m === 'url' ? 'link' : 'upload'} size={16} color={mode === m ? colors.primary : colors.textMuted} />
            <T variant="label" color={mode === m ? colors.primary : colors.textMuted}>{m === 'url' ? 'From reel link' : 'Upload video'}</T>
          </Pressable>
        ))}
      </View>

      <Card style={{ gap: spacing.lg }}>
        {mode === 'url' ? (
          <Field label="Instagram reel link">
            <Input value={url} onChangeText={setUrl} placeholder="https://www.instagram.com/reel/…" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          </Field>
        ) : (
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
        )}

        {mode === 'upload' ? (
          <>
            <Field label="Caption"><Input value={caption} onChangeText={setCaption} multiline placeholder="Write the caption for this reel" /></Field>
            <Field label="On-screen overlay" hint="Optional text shown on the video."><Input value={overlay} onChangeText={setOverlay} /></Field>
            <Field label="Hashtags"><Input value={tags} onChangeText={setTags} placeholder="#fitness #tips" autoCapitalize="none" /></Field>
          </>
        ) : null}

        <Field label="Niche">
          <Chips options={niches.map((n) => ({ value: n, label: n }))} value={niche} allowEmpty onChange={setNiche} />
        </Field>
        <Field label="Brand voice">
          <Chips options={voices.map((n) => ({ value: n, label: n }))} value={voiceStyle} allowEmpty onChange={setVoiceStyle} />
        </Field>
        <Field label="Voice notes" hint="Optional. Anything the writer should know about your tone."><Input value={notes} onChangeText={setNotes} multiline style={{ minHeight: 72 }} /></Field>

        {mode === 'url' ? (
          <>
            <Field label="Avatar">
              <Picker value={avatarId} placeholder="Default avatar" onChange={setAvatarId} options={(options?.avatars ?? []).map((a) => ({ value: a.id, label: a.name || a.id }))} />
            </Field>
            <Field label="Voice" hint={options?.hasMoreAvatars || options?.hasMoreVoices ? 'Only the first page of avatars and voices is listed.' : undefined}>
              <Picker value={voiceId} placeholder="Default voice" onChange={setVoiceId}
                options={(options?.voices ?? []).map((v) => ({ value: v.id, label: v.name || v.id, sub: v.language }))} />
            </Field>
          </>
        ) : null}

        {(options?.warnings ?? []).map((w, i) => <T key={i} variant="small" muted>{String(w)}</T>)}
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <Button label={mode === 'url' ? 'Submit reel' : 'Submit for approval'} variant="primary" icon="send" full loading={busy}
          disabled={mode === 'upload' && (!staged || uploading)} onPress={mode === 'url' ? submitUrl : submitUpload} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', padding: 4, borderRadius: radius.md },
  segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 40, borderRadius: radius.sm + 2 },
  drop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed' },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: spacing.sm },
  barFill: { height: 6, borderRadius: 3 },
});
void font;
