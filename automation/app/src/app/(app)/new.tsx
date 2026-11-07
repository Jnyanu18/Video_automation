import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Screen } from '../../components/Screen';
import { Badge, Banner, Button, Card, Chips, Field, Input, Picker, T } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { VideoPlayer } from '../../components/VideoPlayer';
import { errorText, get, post, uploadVideo } from '../../api/client';
import type { Options, UploadInfo } from '../../api/types';
import { useQuery } from '../../state/useQuery';
import { useToast } from '../../state/toast';
import { font, radius, spacing, useTheme } from '../../theme';

type Mode = 'url' | 'editor' | 'upload';

interface Scene {
  scene_number: number;
  type: string;
  timestamp_output: string;
  source_range: string;
  duration: number;
  action: string;
  framing: string;
  camera_motion: string;
  caption: string;
  caption_style: string;
}

interface StoryboardData {
  title: string;
  duration: {
    original_seconds: number;
    output_seconds: number;
    removed_seconds: number;
    reduction_percent: number;
  };
  scenes_count: number;
  scenes: Scene[];
  sound_design: {
    ducking_enabled: boolean;
    target_lufs: number;
  };
  scorecard: {
    status: string;
    score: number;
    failed_checks: string[];
    warnings: string[];
  };
}

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

  // upload & editor mode video picker
  const [picked, setPicked] = useState<{ name: string; type: string; uri: string; blob?: Blob } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [staged, setStaged] = useState<UploadInfo | null>(null);

  // upload mode fields
  const [caption, setCaption] = useState('');
  const [overlay, setOverlay] = useState('');
  const [tags, setTags] = useState('');

  // AI Video Editor mode fields
  const [editorStyle, setEditorStyle] = useState('viral_hook_fast_pace');
  const [editorPrompt, setEditorPrompt] = useState('Cut dead air and silences, keep speech fast and engaging, reframe to 9:16 vertical, add karaoke captions.');
  const [storyboardId, setStoryboardId] = useState<string | null>(null);
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatting, setChatting] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);
  const [renderedId, setRenderedId] = useState<string | null>(null);

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
    setPicked(f); setStaged(null); setProgress(0); setStoryboard(null); setRenderedUrl(null);
    try {
      const up = await uploadVideo(f, setProgress);
      setStaged(up);
    } catch (e) {
      setPicked(null); setError(errorText(e));
    } finally { setProgress(null); }
  }

  async function generateStoryboard() {
    if (!staged) return setError('Choose and upload your raw footage first.');
    setBusy(true); setError(null);
    try {
      const res = await post('/api/editor/storyboard/create', {
        uploadId: staged.uploadId,
        style: editorStyle,
        prompt: editorPrompt,
      });
      if (res && res.data) {
        setStoryboardId(res.storyboard_id);
        setStoryboard(res.data.storyboard);
        toast('AI Storyboard generated by Gemini.');
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function sendRevisionChat() {
    if (!storyboardId || !chatMessage.trim()) return;
    setChatting(true); setError(null);
    try {
      const res = await post(`/api/editor/storyboard/${storyboardId}/chat`, { message: chatMessage.trim() });
      if (res && res.data) {
        setStoryboard(res.data.storyboard);
        setChatMessage('');
        toast('Storyboard revised.');
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setChatting(false);
    }
  }

  async function renderVideo() {
    if (!storyboardId) return;
    setRendering(true); setError(null);
    try {
      const res = await post(`/api/editor/storyboard/${storyboardId}/render`, { quality: 'final' });
      if (res && res.render) {
        setRenderedUrl(res.render.video_url);
        setRenderedId(res.render.render_id);
        toast('Video rendered successfully with FFmpeg + Hyperframes!');
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setRendering(false);
    }
  }

  async function submitUpload() {
    const targetUploadId = renderedId || staged?.uploadId;
    if (!targetUploadId) return setError('Choose or render a video first.');
    const targetCaption = caption.trim() || storyboard?.scenes[0]?.caption || 'Original AI Edited Reel';
    setBusy(true); setError(null);
    try {
      done(await post('/api/reels/upload', {
        uploadId: targetUploadId,
        caption: targetCaption,
        ...(overlay.trim() ? { overlay: overlay.trim() } : {}),
        hashtags: tagsOf(tags),
        ...shared(),
      }));
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }

  const uploading = progress !== null;

  return (
    <Screen title="New reel" subtitle="Turn viral reels or raw footage into original, publish-ready videos." narrow>
      {/* Mode switcher tabs */}
      <View style={[styles.seg, { backgroundColor: colors.surfaceAlt }]}>
        {([
          { key: 'url', label: 'From link', icon: 'link' },
          { key: 'editor', label: 'AI Video Editor', icon: 'sparkles' },
          { key: 'upload', label: 'Upload ready video', icon: 'upload' },
        ] as const).map((m) => (
          <Pressable
            key={m.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m.key }}
            onPress={() => { setMode(m.key); setError(null); }}
            style={[styles.segItem, mode === m.key && { backgroundColor: colors.surface }]}
          >
            <Icon name={m.icon as any} size={15} color={mode === m.key ? colors.primary : colors.textMuted} />
            <T variant="label" color={mode === m.key ? colors.primary : colors.textMuted}>{m.label}</T>
          </Pressable>
        ))}
      </View>

      <Card style={{ gap: spacing.lg }}>
        {/* MODE 1: From reel link */}
        {mode === 'url' ? (
          <>
            <Field label="Instagram reel link">
              <Input value={url} onChangeText={setUrl} placeholder="https://www.instagram.com/reel/…" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
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

            {error ? <Banner tone="danger">{error}</Banner> : null}
            <Button label="Submit reel" variant="primary" icon="send" full loading={busy} onPress={submitUrl} />
          </>
        ) : null}

        {/* MODE 2: AI Video Editor (Reel feature: Reference Style + Raw Footage -> Storyboard -> Render) */}
        {mode === 'editor' ? (
          <>
            <Banner tone="info">
              Drop raw camera footage and pick a reference style. Gemini analyzes silences, cuts, and writes a Storyboard first for your review before rendering.
            </Banner>

            {/* Step 1: Style Preset */}
            <Field label="Editing Style Sheet" hint="Controls pacing, cut frequency, pause tightening and caption layout.">
              <Chips
                options={[
                  { value: 'viral_hook_fast_pace', label: '⚡ Viral Hook (Cuts <1.8s)' },
                  { value: 'educational_talking_head', label: '🎓 Educational Story' },
                  { value: 'cinematic_punch', label: '🎬 Cinematic Punch' },
                ]}
                value={editorStyle}
                onChange={setEditorStyle}
              />
            </Field>

            {/* Step 2: Raw Footage Upload */}
            <Field label="Raw Footage" hint="Upload unedited camera recording (MP4 or MOV).">
              <Pressable accessibilityRole="button" onPress={uploading ? undefined : chooseFile}
                style={({ hovered }: any) => [styles.drop, { borderColor: staged ? colors.success : hovered ? colors.primary : colors.border, backgroundColor: colors.surfaceAlt }]}>
                <Icon name={staged ? 'check' : 'upload'} size={22} color={staged ? colors.success : colors.primary} />
                <View style={{ flex: 1 }}>
                  <T variant="h3" numberOfLines={1}>{picked ? picked.name : 'Choose raw footage'}</T>
                  <T variant="small" muted>
                    {uploading ? `Uploading… ${progress}%` : staged ? `Uploaded · ${Math.round(staged.durationSeconds)}s · ${(staged.sizeBytes / 1048576).toFixed(1)} MB` : 'Tap to browse raw video'}
                  </T>
                </View>
              </Pressable>
              {uploading ? <View style={[styles.bar, { backgroundColor: colors.border }]}><View style={[styles.barFill, { width: `${progress}%`, backgroundColor: colors.primary }]} /></View> : null}
            </Field>

            {/* Step 3: Editor Prompt */}
            <Field label="Editor Instructions" hint="What should Gemini focus on?">
              <Input value={editorPrompt} onChangeText={setEditorPrompt} multiline style={{ minHeight: 60 }} />
            </Field>

            {/* Button: Generate Storyboard */}
            {!storyboard ? (
              <Button
                label="Generate AI Storyboard"
                variant="primary"
                icon="sparkles"
                full
                loading={busy}
                disabled={!staged || uploading}
                onPress={generateStoryboard}
              />
            ) : null}

            {/* Step 4: Storyboard Display */}
            {storyboard ? (
              <View style={[styles.storyboardBox, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <T variant="h2">📋 AI Storyboard</T>
                  <Badge
                    label={`Scorecard: ${storyboard.scorecard.status}`}
                    tone={storyboard.scorecard.status === 'PASS' ? 'success' : 'warning'}
                  />
                </View>

                {/* Duration stats */}
                <View style={[styles.statRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.statCol}>
                    <T variant="small" muted>Raw Duration</T>
                    <T variant="h3">{storyboard.duration.original_seconds}s</T>
                  </View>
                  <View style={styles.statCol}>
                    <T variant="small" muted>Edited Duration</T>
                    <T variant="h3" color={colors.primary}>{storyboard.duration.output_seconds}s</T>
                  </View>
                  <View style={styles.statCol}>
                    <T variant="small" muted>Dead Air Cut</T>
                    <T variant="h3" color={colors.success}>-{storyboard.duration.removed_seconds}s ({storyboard.duration.reduction_percent}%)</T>
                  </View>
                </View>

                {/* Scene Cards */}
                <T variant="label" muted style={{ marginTop: 8 }}>SCENE BREAKDOWN ({storyboard.scenes.length} CUTS)</T>
                <View style={{ gap: 8 }}>
                  {storyboard.scenes.map((s) => (
                    <View key={s.scene_number} style={[styles.sceneCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <T variant="h3">#{s.scene_number} · {s.type}</T>
                        <T variant="label" color={colors.primary}>{s.timestamp_output}</T>
                      </View>
                      <T variant="body">{s.action}</T>
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        <Badge label={s.framing} tone="info" />
                        <Badge label={s.camera_motion} tone="neutral" />
                        <Badge label={s.caption_style} tone="neutral" />
                      </View>
                      {s.caption && s.caption !== '(No speech overlay)' ? (
                        <View style={[styles.captionPreview, { backgroundColor: colors.surfaceAlt }]}>
                          <T variant="small" color={colors.primary}>💬 "{s.caption}"</T>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>

                {/* Chat revision gate */}
                <Field label="Request Storyboard Changes" hint="Direct Gemini to tweak cuts, captions, pacing or zoom before rendering.">
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Input
                      value={chatMessage}
                      onChangeText={setChatMessage}
                      placeholder="e.g. Cut 2 more seconds of silence, make hook punchier..."
                      style={{ flex: 1 }}
                    />
                    <Button
                      label="Revise"
                      variant="secondary"
                      loading={chatting}
                      disabled={!chatMessage.trim() || chatting}
                      onPress={sendRevisionChat}
                    />
                  </View>
                </Field>

                {/* Step 5: Render Button */}
                {!renderedUrl ? (
                  <Button
                    label="Render Final Video (FFmpeg + Hyperframes)"
                    variant="primary"
                    icon="play"
                    full
                    loading={rendering}
                    onPress={renderVideo}
                  />
                ) : (
                  <View style={{ gap: spacing.md, marginTop: 8 }}>
                    <Banner tone="success">Render ready! Watch preview below:</Banner>
                    <VideoPlayer uri={renderedUrl} />
                    <Button
                      label="Submit for Approval & Publish"
                      variant="primary"
                      icon="send"
                      full
                      loading={busy}
                      onPress={submitUpload}
                    />
                  </View>
                )}
              </View>
            ) : null}

            {error ? <Banner tone="danger">{error}</Banner> : null}
          </>
        ) : null}

        {/* MODE 3: Upload ready video */}
        {mode === 'upload' ? (
          <>
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

            <Field label="Caption"><Input value={caption} onChangeText={setCaption} multiline placeholder="Write the caption for this reel" /></Field>
            <Field label="On-screen overlay" hint="Optional text shown on the video."><Input value={overlay} onChangeText={setOverlay} /></Field>
            <Field label="Hashtags"><Input value={tags} onChangeText={setTags} placeholder="#fitness #tips" autoCapitalize="none" /></Field>

            <Field label="Niche">
              <Chips options={niches.map((n) => ({ value: n, label: n }))} value={niche} allowEmpty onChange={setNiche} />
            </Field>
            <Field label="Brand voice">
              <Chips options={voices.map((n) => ({ value: n, label: n }))} value={voiceStyle} allowEmpty onChange={setVoiceStyle} />
            </Field>

            {error ? <Banner tone="danger">{error}</Banner> : null}
            <Button label="Submit for approval" variant="primary" icon="send" full loading={busy}
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
