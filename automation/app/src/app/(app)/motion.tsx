import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Icon } from '../../components/Icon';
import { Banner, Button, Card, Field, Input, Picker, T } from '../../components/ui';
import { useWide } from '../../components/useWide';
import { errorText, post } from '../../api/client';
import { latestDirectorJob } from '../../components/DirectorJob';
import { ProductionPanel } from '../../components/ProductionPanel';
import { CustomAudio, type SelectedAudio } from '../../components/CustomAudio';
import { useToast } from '../../state/toast';
import { font, radius, spacing, useTheme } from '../../theme';

const GOAL_OPTIONS = [
  { value: 'Build awareness', label: 'Build awareness' },
  { value: 'Drive sales & conversions', label: 'Drive sales & conversions' },
  { value: 'Product launch showcase', label: 'Product launch showcase' },
  { value: 'Explain a concept', label: 'Explain a concept' },
  { value: 'Brand manifesto', label: 'Brand manifesto' },
];

const AUDIENCE_OPTIONS = [
  { value: 'Everyone', label: 'Everyone' },
  { value: 'Founders & executives', label: 'Founders & executives' },
  { value: 'Developers & builders', label: 'Developers & builders' },
  { value: 'Creatives & designers', label: 'Creatives & designers' },
  { value: 'Social audience', label: 'Social audience' },
];

const FORMAT_OPTIONS = [
  { value: 'Vertical Reels / Shorts (9:16)', label: 'Vertical Reels / Shorts (9:16)' },
  { value: 'Horizontal YouTube (16:9)', label: 'Horizontal YouTube (16:9)' },
  { value: 'Square Feed (1:1)', label: 'Square Feed (1:1)' },
];

const DURATION_OPTIONS = [
  { value: '15 seconds', label: '15 seconds' },
  { value: '30 seconds', label: '30 seconds' },
  { value: '45 seconds', label: '45 seconds' },
  { value: '60 seconds', label: '60 seconds' },
];

const FEELING_OPTIONS = [
  { value: 'Cinematic & powerful', label: 'Cinematic & powerful' },
  { value: 'Clean & minimal', label: 'Clean & minimal' },
  { value: 'High-energy & punchy', label: 'High-energy & punchy' },
  { value: 'Dark & technical', label: 'Dark & technical' },
  { value: 'Playful & lively', label: 'Playful & lively' },
];

const RHYTHM_OPTIONS = [
  { value: 'Build slowly, finish strong', label: 'Build slowly, finish strong' },
  { value: 'Fast & punchy throughout', label: 'Fast & punchy throughout' },
  { value: 'Rhythm & beat-synced', label: 'Rhythm & beat-synced' },
  { value: 'Steady & confident', label: 'Steady & confident' },
];

/** Motion Graphics Studio: a written brief becomes an animated motion reel. */
export default function MotionGraphics() {
  const toast = useToast();
  const { colors } = useTheme();
  const wide = useWide();

  // Creative brief form states
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [goal, setGoal] = useState('Build awareness');
  const [audience, setAudience] = useState('Everyone');
  const [format, setFormat] = useState('Vertical Reels / Shorts (9:16)');
  const [duration, setDuration] = useState('30 seconds');
  const [feeling, setFeeling] = useState('Cinematic & powerful');
  const [rhythm, setRhythm] = useState('Build slowly, finish strong');
  const [customAudio, setCustomAudio] = useState<SelectedAudio | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);

  // Optional finishing lines
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [button, setButton] = useState('');
  const [url, setUrl] = useState('');
  const [tagline, setTagline] = useState('');

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(name: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(name);
    setError(null);
    try {
      await fn();
      if (done) toast(done);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  // Every brief goes to the creative director (studio/agent_bridge.py) with each form field as its own value,
  // never glued into the prompt text.
  const [jobId, setJobId] = useState<string | null>(null);
  useEffect(() => {
    latestDirectorJob('motion')
      .then((j) => {
        if (!j || j.status === 'cancelled') return;
        setJobId(j.id);
      })
      .catch(() => undefined);
  }, []);

  async function build() {
    if (audioUploading) {
      return setError('Wait for your audio upload to finish.');
    }
    if (prompt.trim().length < 3) {
      return setError('Describe your idea first.');
    }
    await act(
      'build',
      async () => {
        const r = await post('/api/editor/agent/jobs', {
          kind: 'motion',
          prompt: prompt.trim(),
          title: title.trim() || undefined,
          format: format.includes('16:9') ? '16:9' : format.includes('1:1') ? '1:1' : '9:16',
          duration: parseInt(duration, 10) || 30,
          audio_upload_id: customAudio?.id,
          direction: { goal, audience, feeling, rhythm, button: button.trim(), url: url.trim(), tagline: tagline.trim() },
        });
        setJobId(r.job.id);
        setCustomAudio(null);
      },
      'Brief sent. Your film is in production.'
    );
  }

  function startOver() {
    setJobId(null);
  }

  return (
    <Screen title="Motion Films" subtitle="Create original motion graphics from a creative brief.">
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <View style={[styles.splitGrid, wide && styles.splitGridWide]}>
        <View style={styles.formCol}>
          <Card style={{ gap: spacing.lg }}>
            <View style={{ gap: 4 }}>
              <T muted style={{ fontSize: 13.5 }}>Describe the motion film you want your creative director to make.</T>
            </View>

            <Field label="GIVE YOUR FILM A NAME" hint="The working title for your motion film">
              <Input value={title} onChangeText={setTitle} placeholder="Give your film a name" />
            </Field>
            <Field label="DESCRIBE YOUR IDEA" hint="Describe the story, visual style, on-screen text and ending.">
              <Input
                value={prompt}
                onChangeText={setPrompt}
                multiline
                style={{ minHeight: 110, lineHeight: 22 }}
                placeholder="Describe the motion graphics film you want to create..."
              />
            </Field>

            <CustomAudio value={customAudio} onChange={setCustomAudio} onUploadingChange={setAudioUploading} />

            <View style={styles.selectorsGrid}>
              <View style={styles.selectorItem}>
                <T variant="label" muted style={styles.selectorLabel}>WHAT IS THE GOAL?</T>
                <Picker value={goal} placeholder="Choose goal" options={GOAL_OPTIONS} onChange={setGoal} />
              </View>
              <View style={styles.selectorItem}>
                <T variant="label" muted style={styles.selectorLabel}>WHO IS IT FOR?</T>
                <Picker value={audience} placeholder="Choose audience" options={AUDIENCE_OPTIONS} onChange={setAudience} />
              </View>
              <View style={styles.selectorItem}>
                <T variant="label" muted style={styles.selectorLabel}>WHERE WILL IT BE WATCHED?</T>
                <Picker value={format} placeholder="Choose format" options={FORMAT_OPTIONS} onChange={setFormat} />
              </View>
              <View style={styles.selectorItem}>
                <T variant="label" muted style={styles.selectorLabel}>HOW LONG?</T>
                <Picker value={duration} placeholder="Choose length" options={DURATION_OPTIONS} onChange={setDuration} />
              </View>
              <View style={styles.selectorItem}>
                <T variant="label" muted style={styles.selectorLabel}>CHOOSE A FEELING</T>
                <Picker value={feeling} placeholder="Choose feeling" options={FEELING_OPTIONS} onChange={setFeeling} />
              </View>
              <View style={styles.selectorItem}>
                <T variant="label" muted style={styles.selectorLabel}>STORY RHYTHM</T>
                <Picker value={rhythm} placeholder="Choose rhythm" options={RHYTHM_OPTIONS} onChange={setRhythm} />
              </View>
            </View>

            <Pressable onPress={() => setShowAdvanced(!showAdvanced)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name={showAdvanced ? 'chevron' : 'plus'} size={14} color={colors.primary} />
              <T variant="small" color={colors.primary} style={{ fontWeight: '600' }}>
                {showAdvanced ? 'Hide CTA & tagline' : 'Add CTA & tagline (optional)'}
              </T>
            </Pressable>
            {showAdvanced ? (
              <View style={{ gap: spacing.md }}>
                <Field label="CLOSING TAGLINE" hint="The closing line shown on screen">
                  <Input value={tagline} onChangeText={setTagline} placeholder="A short closing line" />
                </Field>
                <Field label="BUTTON TEXT & URL" hint="Optional call to action">
                  <Input value={button} onChangeText={setButton} placeholder="Button text" />
                  <View style={{ height: spacing.xs }} />
                  <Input value={url} onChangeText={setUrl} placeholder="https://yourcompany.com" autoCapitalize="none" autoCorrect={false} />
                </Field>
              </View>
            ) : null}

            <View style={styles.formFooter}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="sparkles" size={14} color={colors.primary} />
                <T variant="caption" faint>Your director will build the film from this brief.</T>
              </View>
              <Button
                label="Shape my creative direction"
                variant="primary"
                icon="sparkles"
                loading={busy === 'build'}
                onPress={build}
              />
            </View>
          </Card>
        </View>
        <View style={styles.previewCol}>
          <ProductionPanel kind="motion" jobId={jobId} onNew={startOver} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* Split Grid */
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

  /* Step 2 & 3 Details */
  head: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  textBlock: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
});
