import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Icon } from '../../components/Icon';
import { Badge, Banner, Button, Card, Field, Input, Picker, T } from '../../components/ui';
import { TemplateWizard } from '../../components/TemplateWizard';
import { ProjectHistory } from '../../components/ProjectHistory';
import type { FilmProject } from '../../components/ProjectHistory';
import { useStoryboards } from '../../state/useStoryboards';
import { useToast } from '../../state/toast';
import { useWide } from '../../components/useWide';
import { editor } from '../../api/editor';
import { errorText, get, uploadVideo } from '../../api/client';
import type { UploadInfo } from '../../api/types';
import { MAX_CONTENT_WIDTH, font, radius, shadow, spacing, useTheme } from '../../theme';

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

export default function ChoppityHomeScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const wide = useWide();
  const { list: storyboards, reload } = useStoryboards();

  // Template wizard modal state
  const [wizardOpen, setWizardOpen] = useState(false);

  // 1. Film Title & Vision
  const [filmTitle, setFilmTitle] = useState('');
  const [prompt, setPrompt] = useState(
    'Cut dead air and silences, keep speech fast and engaging, reframe to 9:16 vertical, add dynamic karaoke captions.'
  );

  // 2. Raw Footage State
  const [picked, setPicked] = useState<{ name: string; type: string; uri: string; blob?: Blob } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [staged, setStaged] = useState<UploadInfo | null>(null);
  const [footage, setFootage] = useState<{ path: string; name: string; size_mb: number }[]>([]);
  const [footagePath, setFootagePath] = useState('');

  // 3. Reference Video State (The dedicated reference video box)
  const [referenceUrl, setReferenceUrl] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [referenceFilms, setReferenceFilms] = useState<FilmProject[]>([]);

  // 4. Selector Grid States
  const [goal, setGoal] = useState('Viral retention & engagement');
  const [audience, setAudience] = useState('Social audience / Gen Z');
  const [format, setFormat] = useState('Vertical Reels / Shorts (9:16)');
  const [duration, setDuration] = useState('30 seconds');
  const [feeling, setFeeling] = useState('High-energy & punchy');
  const [rhythm, setRhythm] = useState('Fast cuts & pattern interrupts');

  // 5. Editing Style Preset
  const [editorStyle, setEditorStyle] = useState('viral_hook_fast_pace');
  const [styleList, setStyleList] = useState<{ value: string; label: string }[]>([]);

  // State & Loading
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    get('/api/editor/settings')
      .then((r: any) => {
        if (r?.settings?.default_style) setEditorStyle(r.settings.default_style);
        if (r?.settings?.default_prompt) setPrompt(r.settings.default_prompt);
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
  }, []);

  // File Picker
  async function chooseFile() {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: ['video/mp4', 'video/quicktime'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const f = {
      name: a.name,
      type: a.mimeType || 'video/mp4',
      uri: a.uri,
      blob: Platform.OS === 'web' ? (a.file as Blob | undefined) : undefined,
    };
    setPicked(f);
    setStaged(null);
    setFootagePath('');
    setProgress(0);
    try {
      const up = await uploadVideo(f, setProgress);
      setStaged(up);
    } catch (e) {
      setPicked(null);
      setError(errorText(e));
    } finally {
      setProgress(null);
    }
  }

  function clearSelectedFootage() {
    setPicked(null);
    setStaged(null);
    setFootagePath('');
  }

  // Generate Storyboard / Shape Creative Direction
  async function submitCreativeDirection() {
    setError(null);
    const refLink = referenceUrl.trim();
    if (!staged && !footagePath && !refLink) {
      setError('Please add at least one raw clip or paste a reference video link to start editing.');
      return;
    }

    if (refLink && !/^https?:\/\//i.test(refLink)) {
      setError('Reference video URL must start with https://');
      return;
    }

    setBusy(true);
    try {
      const directionSummary = [
        filmTitle.trim() ? `Title: ${filmTitle.trim()}` : '',
        `Goal: ${goal}`,
        `Audience: ${audience}`,
        `Format: ${format}`,
        `Duration: ${duration}`,
        `Feeling: ${feeling}`,
        `Rhythm: ${rhythm}`,
        refLink ? `Reference Video Pacing Guide: ${refLink}` : '',
        referenceId ? `Studio reference: ${referenceFilms.find((film) => film.id === referenceId)?.title || referenceId}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const combinedPrompt = `${prompt.trim()}\n\n[Direction: ${directionSummary}]`;

      let res: { storyboard_id: string };

      if (staged) {
        res = await editor.autoEdit({
          video_path: undefined,
          url: undefined,
          uploadId: staged.uploadId,
          style: editorStyle,
          instruction: combinedPrompt,
          reference_video_id: referenceId || undefined,
        } as any);
      } else if (footagePath) {
        res = await editor.autoEdit({
          video_path: footagePath,
          style: editorStyle,
          instruction: combinedPrompt,
          reference_video_id: referenceId || undefined,
        });
      } else {
        res = await editor.autoEdit({
          url: refLink,
          style: editorStyle,
          instruction: combinedPrompt,
          reference_video_id: referenceId || undefined,
        });
      }

      toast('The creative director is drafting your storyboard cut.');
      await reload();
      router.push({ pathname: '/storyboard', params: { sb: res.storyboard_id } });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const uploading = progress !== null;
  const activeFootageName = staged?.fileName || picked?.name || (footagePath ? footagePath.split(/[\\/]/).pop() : '');
  const posterTitle = filmTitle.trim() ? filmTitle.trim().toUpperCase() : 'MAKE IT MATTER.';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { maxWidth: MAX_CONTENT_WIDTH }]}
      >
        {/* =========================================================================
            1. PRIMARY WORKFLOW SCREEN: AI VIDEO EDITING STUDIO
           ========================================================================= */}
        <View style={{ gap: spacing.md }}>
          {/* Stepper Bar */}
          <View style={[styles.stepperContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={[styles.stepItem, styles.stepItemActive]}>
              <View style={[styles.stepBadge, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                <Text style={{ fontFamily: font.bold, fontSize: 11, color: colors.onPrimary }}>01</Text>
              </View>
              <Text style={[styles.stepLabel, { color: colors.text }]}>Raw clips & brief</Text>
            </View>

            <View style={[styles.stepConnector, { backgroundColor: colors.border }]} />

            <Pressable
              accessibilityRole="tab"
              onPress={() => router.push('/storyboard' as any)}
              style={[styles.stepItem, { opacity: 0.6 }]}
            >
              <View style={[styles.stepBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={{ fontFamily: font.bold, fontSize: 11, color: colors.textMuted }}>02</Text>
              </View>
              <Text style={[styles.stepLabel, { color: colors.textMuted }]}>Creative direction</Text>
            </Pressable>

            <View style={[styles.stepConnector, { backgroundColor: colors.border }]} />

            <Pressable
              accessibilityRole="tab"
              onPress={() => router.push('/timeline' as any)}
              style={[styles.stepItem, { opacity: 0.6 }]}
            >
              <View style={[styles.stepBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={{ fontFamily: font.bold, fontSize: 11, color: colors.textMuted }}>03</Text>
              </View>
              <Text style={[styles.stepLabel, { color: colors.textMuted }]}>Review your film</Text>
            </Pressable>
          </View>

          {/* Global Error Banner */}
          {error ? <Banner tone="danger">{error}</Banner> : null}

          {/* Split 2-Column Workflow */}
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

                <View style={{ gap: 4 }}>
                  <T variant="h1" style={{ fontSize: 24, letterSpacing: -0.5 }}>
                    What are we cutting?
                  </T>
                  <T muted style={{ fontSize: 13.5 }}>
                    Add your raw footage clips and an optional reference video to shape the pacing.
                  </T>
                </View>

                {/* 1. Raw Clips Section */}
                <View style={styles.boxSection}>
                  <View style={styles.boxHeader}>
                    <Icon name="film" size={16} color={colors.primary} />
                    <T variant="label" style={{ fontWeight: '700', letterSpacing: 0.5 }}>
                      1. RAW FOOTAGE CLIPS
                    </T>
                  </View>

                  {activeFootageName ? (
                    <View
                      style={[
                        styles.selectedClipCard,
                        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                      ]}
                    >
                      <View style={[styles.clipIconBadge, { backgroundColor: colors.primarySoft }]}>
                        <Icon name="check" size={16} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text style={[styles.clipNameText, { color: colors.text }]} numberOfLines={1}>
                          {activeFootageName}
                        </Text>
                        <T variant="caption" muted>
                          {staged
                            ? `${(staged.sizeBytes / 1048576).toFixed(1)} MB · Ready for edit`
                            : 'Selected from local footage'}
                        </T>
                      </View>
                      <Button label="Remove" small variant="ghost" icon="x" onPress={clearSelectedFootage} />
                    </View>
                  ) : (
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
                            {uploading ? `Uploading... ${progress || 0}%` : 'Upload raw clips from computer'}
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

                {/* 2. Reference Video Box */}
                <View style={styles.boxSection}>
                  <View style={styles.boxHeader}>
                    <Icon name="link" size={16} color={colors.primary} />
                    <T variant="label" style={{ fontWeight: '700', letterSpacing: 0.5 }}>
                      2. REFERENCE VIDEO (OPTIONAL)
                    </T>
                  </View>

                  <Input
                    value={referenceUrl}
                    onChangeText={setReferenceUrl}
                    placeholder="https://www.instagram.com/reel/... or TikTok / YouTube Short"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Picker
                    value={referenceId}
                    placeholder="Choose one of your films as a reference"
                    options={referenceFilms.map((film) => ({ value: film.id, label: film.title }))}
                    onChange={setReferenceId}
                  />
                  <T variant="caption" muted style={{ marginTop: 2 }}>
                    Choose one of your films to measure its editing rhythm, or paste a video link.
                  </T>
                </View>

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
                </View>

                {/* Editing Style Preset */}
                {styleList.length > 0 ? (
                  <Field label="EDITING STYLE PRESET" hint="Visual presets with pre-configured pacing and caption typography">
                    <Picker
                      value={editorStyle}
                      placeholder="Select editing style"
                      options={styleList}
                      onChange={setEditorStyle}
                    />
                  </Field>
                ) : null}

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

            {/* Right Column: Aesthetic Glimpse of the Process */}
            <View style={styles.previewCol}>
              <Card style={{ gap: spacing.lg, backgroundColor: colors.surface }}>
                <View style={styles.headerLine}>
                  <T variant="caption" color={colors.primary} style={styles.eyebrowTag}>
                    A GLIMPSE OF THE PROCESS
                  </T>
                  <View style={[styles.pillBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                    <Text style={[styles.pillBadgeText, { color: colors.textMuted }]}>STUDIO</Text>
                  </View>
                </View>

                <T variant="h2" style={{ fontSize: 16 }}>
                  Raw footage, transformed with vision.
                </T>

                {/* Aesthetic Poster Card */}
                <View
                  style={[
                    styles.posterCard,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.posterTopLine}>
                    <Text style={[styles.posterMonoText, { color: colors.textMuted }]}>MF / EDITORIAL STUDY</Text>
                    <Text style={[styles.posterMonoText, { color: colors.textMuted }]}>001</Text>
                  </View>

                  <View style={styles.posterCenter}>
                    <Text style={[styles.posterSubheading, { color: colors.primary }]}>
                      {feeling.toUpperCase()}
                    </Text>
                    <Text style={[styles.posterTitleText, { color: colors.text }]} numberOfLines={3}>
                      {posterTitle}
                    </Text>
                    <View style={{ marginTop: 8, gap: 4 }}>
                      <Text style={[styles.posterStatusPill, { color: activeFootageName ? colors.primary : colors.textMuted }]}>
                        {activeFootageName ? `▶ CLIP: ${activeFootageName}` : '○ NO RAW CLIPS ATTACHED YET'}
                      </Text>
                      {referenceUrl.trim() ? (
                        <Text style={[styles.posterStatusPill, { color: colors.primary }]}>
                          ✦ REFERENCE GUIDED ACTIVE
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={[styles.posterBottomLine, { borderTopColor: colors.border }]}>
                    <Text style={[styles.posterMonoText, { color: colors.textFaint }]}>AI VIDEO STUDIO</Text>
                    <Text style={[styles.posterMonoText, { color: colors.textFaint }]}>YOUR FOOTAGE</Text>
                    <Text style={[styles.posterMonoText, { color: colors.textFaint }]}>01 23</Text>
                  </View>
                </View>

                {/* Process Highlights */}
                <View style={{ gap: spacing.md, marginTop: spacing.xs }}>
                  <View style={styles.highlightRow}>
                    <View style={[styles.highlightIcon, { backgroundColor: colors.primarySoft }]}>
                      <Icon name="sparkles" size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="label" style={{ fontWeight: '700' }}>
                        Multimodal Scene Indexing
                      </T>
                      <T variant="small" muted>
                        Analyzes spoken speech, detected objects, and keyframe motion — no blind cuts.
                      </T>
                    </View>
                  </View>

                  <View style={styles.highlightRow}>
                    <View style={[styles.highlightIcon, { backgroundColor: colors.primarySoft }]}>
                      <Icon name="link" size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="label" style={{ fontWeight: '700' }}>
                        Reference-Guided Pacing
                      </T>
                      <T variant="small" muted>
                        Recreates viral cut timing and hook structure from your reference video.
                      </T>
                    </View>
                  </View>

                  <View style={styles.highlightRow}>
                    <View style={[styles.highlightIcon, { backgroundColor: colors.primarySoft }]}>
                      <Icon name="clock" size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="label" style={{ fontWeight: '700' }}>
                        You Stay in Control
                      </T>
                      <T variant="small" muted>
                        Review every scene and caption in the Storyboard before final rendering.
                      </T>
                    </View>
                  </View>
                </View>
              </Card>
            </View>
          </View>
        </View>

        {/* =========================================================================
            2. CREATIVE LIBRARY / PROJECT HISTORY & TUTORIALS (PRESERVED)
           ========================================================================= */}
        <ProjectHistory onCreateFilm={() => router.push('/new')} />
      </ScrollView>

      {/* Signature Template Wizard Modal */}
      <TemplateWizard
        visible={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSave={(cfg) => {
          toast(`Saved template '${cfg.name}' (${cfg.aspectRatio}, ${cfg.captionStyle})`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.xl,
    alignSelf: 'center',
    width: '100%',
    gap: spacing.lg,
  },

  /* Stepper */
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: spacing.xs,
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
    gap: spacing.md,
  },
  selectorItem: {
    gap: 4,
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
