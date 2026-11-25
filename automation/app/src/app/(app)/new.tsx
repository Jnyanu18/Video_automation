import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Screen } from '../../components/Screen';
import { Badge, Banner, Button, Card, Field, Input, Picker, T } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useWide } from '../../components/useWide';
import { errorText, get, post, uploadVideo } from '../../api/client';
import { editor } from '../../api/editor';
import { latestDirectorJob } from '../../components/DirectorJob';
import { ProductionPanel } from '../../components/ProductionPanel';
import { CustomAudio, type SelectedAudio } from '../../components/CustomAudio';
import type { FilmProject } from '../../components/ProjectHistory';
import type { UploadInfo } from '../../api/types';
import { useToast } from '../../state/toast';
import { font, radius, spacing, useTheme } from '../../theme';

const GOAL_OPTIONS = [
  { value: 'Viral retention & engagement', label: 'Viral retention & engagement' },
  { value: 'Educational explainer', label: 'Educational explainer' },
  { value: 'Direct response & sales', label: 'Direct response & sales' },
  { value: 'Brand storytelling', label: 'Brand storytelling' },
  { value: 'Product launch showcase', label: 'Product launch showcase' },
];

const AUDIENCE_OPTIONS = [
  { value: 'Social audience / Gen Z', label: 'Social audience / Gen Z' },
  { value: 'Founders & executives', label: 'Founders & executives' },
  { value: 'Developers & builders', label: 'Developers & builders' },
  { value: 'Creatives & designers', label: 'Creatives & designers' },
  { value: 'Everyone', label: 'Everyone' },
];

const FORMAT_OPTIONS = [
  { value: 'Vertical Reels / Shorts (9:16)', label: 'Vertical Reels / Shorts (9:16)' },
  { value: 'Horizontal YouTube (16:9)', label: 'Horizontal YouTube (16:9)' },
  { value: 'Square Feed (1:1)', label: 'Square Feed (1:1)' },
];

const DURATION_OPTIONS = [
  { value: '30 seconds', label: '30 seconds' },
  { value: '45 seconds', label: '45 seconds' },
  { value: '60 seconds', label: '60 seconds' },
  { value: 'Full condensed cut', label: 'Full condensed cut' },
];

const FEELING_OPTIONS = [
  { value: 'High-energy & punchy', label: 'High-energy & punchy' },
  { value: 'Cinematic & authentic', label: 'Cinematic & authentic' },
  { value: 'Clean & professional', label: 'Clean & professional' },
  { value: 'Fast-paced & witty', label: 'Fast-paced & witty' },
  { value: 'Dramatic & impactful', label: 'Dramatic & impactful' },
];

const RHYTHM_OPTIONS = [
  { value: 'Fast cuts & pattern interrupts', label: 'Fast cuts & pattern interrupts' },
  { value: 'Steady rhythm with punch-ins', label: 'Steady rhythm with punch-ins' },
  { value: 'Slow build, heavy payoff', label: 'Slow build, heavy payoff' },
  { value: 'Beat-synced flow', label: 'Beat-synced flow' },
];

/**
 * AI Video Editing Studio: raw clips + references + brief on the left, the live production line on the right.
 * Also the home page (index.tsx renders it with the project gallery as `footer`).
 */
export default function NewReel({ footer }: { footer?: React.ReactNode } = {}) {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const wide = useWide();
  const params = useLocalSearchParams<{ style?: string; footage?: string; note?: string; prompt?: string; reference?: string }>();

  // 1. Film Title & Vision
  const [filmTitle, setFilmTitle] = useState('Viral Hook Master Cut');
  const [prompt, setPrompt] = useState(
    'Cut dead air and silences, keep speech fast and engaging, reframe to 9:16 vertical, add dynamic karaoke captions.'
  );

  // 2. Raw Footage State
  const [picked, setPicked] = useState<{ name: string; type: string; uri: string; blob?: Blob } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [staged, setStaged] = useState<UploadInfo | null>(null);
  const [footage, setFootage] = useState<{ path: string; name: string; size_mb: number }[]>([]);
  const [footagePath, setFootagePath] = useState(params.footage || '');

  // 3. Reference Video State (The dedicated reference video box)
  const [referenceUrl, setReferenceUrl] = useState('');
  const [referenceId, setReferenceId] = useState(params.reference || '');
  const [referenceFilms, setReferenceFilms] = useState<FilmProject[]>([]);
  const [customAudio, setCustomAudio] = useState<SelectedAudio | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);

  // 4. Selector Grid States
  const [goal, setGoal] = useState('Viral retention & engagement');
  const [audience, setAudience] = useState('Social audience / Gen Z');
  const [format, setFormat] = useState('Vertical Reels / Shorts (9:16)');
  const [duration, setDuration] = useState('30 seconds');
  const [feeling, setFeeling] = useState('High-energy & punchy');
  const [rhythm, setRhythm] = useState('Fast cuts & pattern interrupts');

  // 5. Editing Style Preset
  const [editorStyle, setEditorStyle] = useState(params.style || 'viral_hook_fast_pace');
  const [styleList, setStyleList] = useState<{ value: string; label: string }[]>([]);

  // State & Loading
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    get('/api/editor/settings')
      .then((r: any) => {
        if (!params.style && r?.settings?.default_style) setEditorStyle(r.settings.default_style);
        if (!params.prompt && r?.settings?.default_prompt) setPrompt(r.settings.default_prompt);
      })
      .catch(() => undefined);

    editor
      .styles()
      .then((r: any) => {
        const presets = [...Object.values(r.presets || {}), ...Object.values(r.custom || {})];
        setStyleList(presets.map((p: any) => ({ value: p.name, label: p.name.replace(/_/g, ' ') })));
      })
      .catch(() => undefined);

    editor
      .footage()
      .then((r) => setFootage(r.files || []))
      .catch(() => undefined);
    editor.creativeLibrary().then((films) => setReferenceFilms(films)).catch(() => undefined);
  }, [params.style, params.prompt]);

  // Many clips go into one edit: each is uploaded on its own and listed below the drop zone.
  const [clips, setClips] = useState<UploadInfo[]>([]);
  const [uploadingName, setUploadingName] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  useEffect(() => {
    latestDirectorJob('edit')
      .then((j) => { if (j && j.status !== 'cancelled') setJobId(j.id); })
      .catch(() => undefined);
  }, []);

  async function chooseFile() {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: ['video/mp4', 'video/quicktime'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return;
    for (const a of res.assets) {
      const f = {
        name: a.name,
        type: a.mimeType || 'video/mp4',
        uri: a.uri,
        blob: Platform.OS === 'web' ? (a.file as Blob | undefined) : undefined,
      };
      setUploadingName(a.name);
      setProgress(0);
      try {
        const up = await uploadVideo(f, setProgress);
        setClips((c) => [...c, up]);
      } catch (e) {
        setError(`${a.name}: ${errorText(e)}`);
      }
    }
    setProgress(null);
    setUploadingName('');
  }

  function clearSelectedFootage() {
    setPicked(null);
    setStaged(null);
    setFootagePath('');
  }

  // Generate Storyboard / Shape Creative Direction
  async function submitCreativeDirection() {
    setError(null);
    if (audioUploading) {
      setError('Wait for your audio upload to finish.');
      return;
    }
    const refLink = referenceUrl.trim();
    if (!clips.length && !footagePath) {
      setError('Add the raw clips to edit. The reference only guides the style.');
      return;
    }

    if (refLink && !/^https?:\/\//i.test(refLink)) {
      setError('Reference video URL must start with https://');
      return;
    }

    setBusy(true);
    try {
      // Every form field travels as its own value to the creative director (studio/agent_bridge.py).
      const studioRef = referenceId ? referenceFilms.find((film) => film.id === referenceId)?.title || referenceId : '';
      const r = await post('/api/editor/agent/jobs', {
        kind: 'edit',
        prompt: prompt.trim() || 'Edit these clips into a strong short film.',
        title: filmTitle.trim() || undefined,
        format: format.includes('16:9') ? '16:9' : format.includes('1:1') ? '1:1' : '9:16',
        duration: parseInt(duration, 10) || 60,
        upload_ids: clips.map((c) => c.uploadId),
        footage_paths: footagePath ? [footagePath] : [],
        reference_url: refLink || undefined,
        reference_video_id: referenceId || undefined,
        audio_upload_id: customAudio?.id,
        direction: {
          goal, audience, feeling, rhythm, style: editorStyle, length: duration,
          studio_reference_id: referenceId || '', studio_reference: studioRef,
        },
      });
      setJobId(r.job.id);
      setClips([]);
      setFootagePath('');
      setCustomAudio(null);
      toast('Brief sent. Your edit is in production.');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const uploading = progress !== null;
  const activeFootageName = staged?.fileName || picked?.name || (footagePath ? footagePath.split(/[\\/]/).pop() : '');

  return (
    <Screen title="AI Video Editing" subtitle="Turn raw footage and viral references into original, publish-ready videos.">
      {/* Global Error Alert */}
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {/* ============================================================== */}
      {/* STEP 1: SPLIT 2-COLUMN WORKFLOW                                */}
      {/* ============================================================== */}
      <View style={[styles.splitGrid, wide && styles.splitGridWide]}>
        {/* Left Column: Form Controls */}
        <View style={styles.formCol}>
          <Card style={{ gap: spacing.lg }}>
            <View style={styles.headerLine}>
              <T variant="caption" color={colors.primary} style={styles.eyebrowTag}>
                STEP 01 — RAW CLIPS & BRIEF
              </T>
              <View style={[styles.pillBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={[styles.pillBadgeText, { color: colors.textMuted }]}>ABOUT 2 MIN</Text>
              </View>
            </View>

            {/* 1. Raw Clips Section */}
            <View style={styles.boxSection}>
              <View style={styles.boxHeader}>
                <Icon name="film" size={16} color={colors.primary} />
                <T variant="label" style={{ fontWeight: '700', letterSpacing: 0.5 }}>
                  1. RAW FOOTAGE CLIPS
                </T>
              </View>

              {clips.map((c) => (
                <View
                  key={c.uploadId}
                  style={[styles.selectedClipCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                >
                  <View style={[styles.clipIconBadge, { backgroundColor: colors.primarySoft }]}>
                    <Icon name="check" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={[styles.clipNameText, { color: colors.text }]} numberOfLines={1}>{c.fileName}</Text>
                    <T variant="caption" muted>{`${(c.sizeBytes / 1048576).toFixed(1)} MB · Ready for edit`}</T>
                  </View>
                  <Button label="Remove" small variant="ghost" icon="x"
                    onPress={() => setClips((x) => x.filter((y) => y.uploadId !== c.uploadId))} />
                </View>
              ))}
              {footagePath ? (
                <View style={[styles.selectedClipCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <View style={[styles.clipIconBadge, { backgroundColor: colors.primarySoft }]}>
                    <Icon name="check" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={[styles.clipNameText, { color: colors.text }]} numberOfLines={1}>{activeFootageName}</Text>
                    <T variant="caption" muted>Selected from local footage</T>
                  </View>
                  <Button label="Remove" small variant="ghost" icon="x" onPress={clearSelectedFootage} />
                </View>
              ) : null}
              {(
                <View style={{ gap: spacing.sm }}>
                  <Pressable
                    onPress={chooseFile}
                    style={({ hovered }: any) => [
                      styles.uploadDropZone,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: hovered ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Icon name="upload" size={24} color={colors.primary} />
                    <View style={{ alignItems: 'center', gap: 2 }}>
                      <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text }}>
                        {uploading
                          ? `Uploading ${uploadingName}… ${progress || 0}%`
                          : clips.length
                          ? `Add more clips (${clips.length} added)`
                          : 'Upload raw clips from computer'}
                      </Text>
                      <T variant="caption" muted>
                        Accepts MP4, MOV. Video stays on your machine.
                      </T>
                    </View>
                  </Pressable>

                  {footage.length > 0 ? (
                    <View style={{ marginTop: 2 }}>
                      <T variant="caption" faint style={{ marginBottom: 4 }}>
                        OR CHOOSE FROM EXISTING RAW-FOOTAGE FOLDER:
                      </T>
                      <Picker
                        value={footagePath}
                        placeholder="Pick a file in raw-footage folder"
                        onChange={(v) => {
                          setFootagePath(v);
                          setPicked(null);
                          setStaged(null);
                        }}
                        options={footage.map((f) => ({
                          value: f.path,
                          label: f.name,
                          sub: `${f.size_mb} MB`,
                        }))}
                      />
                    </View>
                  ) : null}
                </View>
              )}
            </View>

            {/* 2. Reference Video Box (Requested feature) */}
            <View style={styles.boxSection}>
              <View style={styles.boxHeader}>
                <Icon name="link" size={16} color={colors.primary} />
                <T variant="label" style={{ fontWeight: '700', letterSpacing: 0.5 }}>
                  2. REFERENCE VIDEO (OPTIONAL)
                </T>
              </View>

              {/* One row: your own film on the left, a video link on the right (keeps the page short) */}
              <View style={styles.referenceRow}>
                <View style={styles.referenceCell}>
                  <Picker
                    value={referenceId}
                    placeholder="Choose one of your films as a reference"
                    options={referenceFilms.map((film) => ({ value: film.id, label: film.title }))}
                    onChange={setReferenceId}
                  />
                </View>
                <View style={styles.referenceCell}>
                  <Input
                    value={referenceUrl}
                    onChangeText={setReferenceUrl}
                    placeholder="Or paste a reel / TikTok / YouTube link"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
              <T variant="caption" muted style={{ marginTop: 2 }}>
                Choose one of your films to measure its editing rhythm, or paste a video link.
              </T>
            </View>

            <CustomAudio value={customAudio} onChange={setCustomAudio} onUploadingChange={setAudioUploading} />

            {/* 3. Film Name */}
            <Field label="GIVE YOUR FILM A NAME" hint="Working title for this reel">
              <Input value={filmTitle} onChangeText={setFilmTitle} placeholder="Viral Hook Master Cut" />
            </Field>

            {/* 4. Describe Editing Vision */}
            <Field
              label="DESCRIBE YOUR EDITING VISION"
              hint="Specify cuts, pacing, on-screen text, karaoke captions, or specific moments to emphasize."
            >
              <Input
                value={prompt}
                onChangeText={setPrompt}
                multiline
                style={{ minHeight: 90, lineHeight: 22 }}
                placeholder="Cut dead air and silences, keep speech fast and engaging, reframe to 9:16 vertical, add karaoke captions."
              />
            </Field>

            {/* 5. 2x3 Configuration Grid */}
            <View style={styles.selectorsGrid}>
              <View style={styles.selectorItem}>
                <T variant="label" muted style={styles.selectorLabel}>
                  WHAT IS THE GOAL?
                </T>
                <Picker value={goal} placeholder="Choose goal" options={GOAL_OPTIONS} onChange={setGoal} />
              </View>

              <View style={styles.selectorItem}>
                <T variant="label" muted style={styles.selectorLabel}>
                  WHO IS IT FOR?
                </T>
                <Picker value={audience} placeholder="Choose audience" options={AUDIENCE_OPTIONS} onChange={setAudience} />
              </View>

              <View style={styles.selectorItem}>
                <T variant="label" muted style={styles.selectorLabel}>
                  WHERE WILL IT BE WATCHED?
                </T>
                <Picker value={format} placeholder="Choose format" options={FORMAT_OPTIONS} onChange={setFormat} />
              </View>

              <View style={styles.selectorItem}>
                <T variant="label" muted style={styles.selectorLabel}>
                  HOW LONG?
                </T>
                <Picker value={duration} placeholder="Choose length" options={DURATION_OPTIONS} onChange={setDuration} />
              </View>

              <View style={styles.selectorItem}>
                <T variant="label" muted style={styles.selectorLabel}>
                  CHOOSE A FEELING
                </T>
                <Picker value={feeling} placeholder="Choose feeling" options={FEELING_OPTIONS} onChange={setFeeling} />
              </View>

              <View style={styles.selectorItem}>
                <T variant="label" muted style={styles.selectorLabel}>
                  STORY RHYTHM
                </T>
                <Picker value={rhythm} placeholder="Choose rhythm" options={RHYTHM_OPTIONS} onChange={setRhythm} />
              </View>

              {styleList.length > 0 ? (
                <View style={styles.selectorItem}>
                  <T variant="label" muted style={styles.selectorLabel}>
                    EDITING STYLE PRESET
                  </T>
                  <Picker value={editorStyle} placeholder="Select editing style" options={styleList} onChange={setEditorStyle} />
                </View>
              ) : null}
            </View>

            {/* Form Footer */}
            <View style={styles.formFooter}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="sparkles" size={14} color={colors.primary} />
                <T variant="caption" faint>
                  The editor cuts and reframes automatically. You approve before final render.
                </T>
              </View>

              <Button
                label="Shape my creative direction"
                variant="primary"
                icon="sparkles"
                loading={busy}
                onPress={submitCreativeDirection}
              />
            </View>
          </Card>
        </View>

        {/* Right Column: the live production line for this account's latest edit */}
        <View style={styles.previewCol}>
          <ProductionPanel
            kind="edit"
            jobId={jobId}
            onNew={() => setJobId(null)}
            attached={{
              clips: clips.length + (footagePath ? 1 : 0),
              reference: referenceId ? referenceFilms.find((f) => f.id === referenceId)?.title || 'your film' : referenceUrl.trim() ? 'video link' : undefined,
            }}
          />
        </View>
      </View>
      {footer}
    </Screen>
  );
}


const styles = StyleSheet.create({
  referenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  referenceCell: { flexGrow: 1, flexBasis: 260, minWidth: 0 },
  /* Stepper */
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: spacing.md,
    gap: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer' as any,
  },
  stepItemActive: {},
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontFamily: font.semibold,
    fontSize: 13,
  },
  stepConnector: {
    width: 24,
    height: 1,
  },

  /* Split Layout */
  splitGrid: {
    gap: spacing.xl,
  },
  splitGridWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  formCol: {
    flex: 1.25,
    minWidth: 0,
  },
  previewCol: {
    flex: 0.9,
    minWidth: 320,
  },

  headerLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrowTag: {
    fontFamily: font.mono,
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 11,
  },
  pillBadge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillBadgeText: {
    fontFamily: font.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  /* Box Sections for Raw Clips and Reference Video */
  boxSection: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
  },
  boxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadDropZone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer' as any,
  },
  selectedClipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  clipIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipNameText: {
    fontFamily: font.semibold,
    fontSize: 13.5,
  },

  /* Selectors Grid */
  selectorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  selectorItem: {
    gap: 4,
    flexGrow: 1,
    flexBasis: 260,
    minWidth: 0,
  },
  selectorLabel: {
    fontSize: 10.5,
    fontFamily: font.mono,
    letterSpacing: 0.8,
  },

  formFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },

  /* Poster Card */
  posterCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    aspectRatio: 1 / 1.05,
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
  },
  posterTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  posterCenter: {
    marginVertical: 'auto',
    gap: 6,
  },
  posterSubheading: {
    fontFamily: font.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  posterTitleText: {
    fontFamily: font.bold,
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -1,
  },
  posterStatusPill: {
    fontFamily: font.mono,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  posterBottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  posterMonoText: {
    fontFamily: font.mono,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
  },

  /* Highlights */
  highlightRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  highlightIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
