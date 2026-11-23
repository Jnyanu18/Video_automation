import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Icon } from '../../components/Icon';
import { Badge, Banner, Button, Card, Field, Input, Picker, SectionTitle, T } from '../../components/ui';
import { VideoPlayer } from '../../components/VideoPlayer';
import { useWide } from '../../components/useWide';
import { absoluteUrl, errorText, post } from '../../api/client';
import { editor, num, StoryboardCard, Storyboard } from '../../api/editor';
import { DirectorJob, latestDirectorJob } from '../../components/DirectorJob';
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

/**
 * Motion Graphics Studio:
 * A written brief becomes an animated motion reel.
 * Follows the 3-step studio workflow:
 * 01 Your brief -> 02 Creative direction -> 03 Review your film
 */
export default function MotionGraphics() {
  const toast = useToast();
  const { colors } = useTheme();
  const wide = useWide();

  // Active Stepper Step: 1 = Brief, 2 = Direction / Scenes, 3 = Review
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Creative brief form states
  const [title, setTitle] = useState('The power of a single moment');
  const [prompt, setPrompt] = useState(
    'Create a cinematic, human brand film about turning ambitious ideas into real-world momentum. Build anticipation, create a moment of silence, then deliver a powerful visual payoff.'
  );
  const [goal, setGoal] = useState('Build awareness');
  const [audience, setAudience] = useState('Everyone');
  const [format, setFormat] = useState('Vertical Reels / Shorts (9:16)');
  const [duration, setDuration] = useState('30 seconds');
  const [feeling, setFeeling] = useState('Cinematic & powerful');
  const [rhythm, setRhythm] = useState('Build slowly, finish strong');

  // Optional finishing lines
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [button, setButton] = useState('');
  const [url, setUrl] = useState('');
  const [tagline, setTagline] = useState('');

  // Engine state
  const [preview, setPreview] = useState<StoryboardCard | null>(null);
  const [sb, setSb] = useState<Storyboard | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const brief = () => {
    // Construct rich synthesized prompt
    const metaParts = [
      `Goal: ${goal}`,
      `Audience: ${audience}`,
      `Format: ${format}`,
      `Duration: ${duration}`,
      `Feeling: ${feeling}`,
      `Rhythm: ${rhythm}`,
    ].join(' | ');

    const combinedPrompt = `${prompt.trim()}\n\n[Direction: ${metaParts}]`;

    return {
      prompt: combinedPrompt,
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(button.trim() ? { button: button.trim() } : {}),
      ...(url.trim() ? { url: url.trim() } : {}),
      ...(tagline.trim() ? { tagline: tagline.trim() } : {}),
    };
  };

  const refresh = useCallback(async (id: string) => {
    try {
      const updated = await editor.storyboard(id);
      setSb(updated);
      if (updated.latest_render) {
        setActiveStep(3);
      }
    } catch (e) {
      setError(errorText(e));
    }
  }, []);

  // Poll while reel is being created or rendered
  const settling =
    sb !== null &&
    (sb.status === 'processing' ||
      sb.render_job?.status === 'running' ||
      sb.render_job?.status === 'queued');

  useEffect(() => {
    if (!sb || !settling) return undefined;
    const t = setTimeout(() => {
      refresh(sb.id);
    }, 1500);
    return () => clearTimeout(t);
  }, [sb, settling, refresh]);

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

  async function showScenes() {
    if (prompt.trim().length < 3) {
      return setError('Write your idea first. The first line becomes the hook on screen.');
    }
    await act('preview', async () => {
      const res = await editor.motionPreview(brief());
      setPreview(res.storyboard);
      setActiveStep(2);
    });
  }

  // Every brief goes to the creative director (studio/agent_bridge.py) with each form field as its own value,
  // never glued into the prompt text.
  const [jobId, setJobId] = useState<string | null>(null);
  useEffect(() => {
    latestDirectorJob('motion')
      .then((j) => {
        if (!j || j.status === 'cancelled') return;
        setJobId(j.id); // reopen the latest film: in production -> step 2, finished -> step 3
        if (j.status === 'queued' || j.status === 'working') setActiveStep(2);
        else if (j.status === 'done') setActiveStep(3);
      })
      .catch(() => undefined);
  }, []);

  async function build() {
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
          direction: { goal, audience, feeling, rhythm, button: button.trim(), url: url.trim(), tagline: tagline.trim() },
        });
        setSb(null);
        setJobId(r.job.id);
        setActiveStep(2);
      },
      'Brief sent. Your film is in production.'
    );
  }

  function startOver() {
    setJobId(null);
    setSb(null);
    setPreview(null);
    setActiveStep(1);
  }

  const card = sb?.storyboard ?? preview;
  const building = sb?.status === 'processing';
  const rendering = sb?.render_job?.status === 'running' || sb?.render_job?.status === 'queued';
  const ready = sb?.status === 'ready';
  const video = sb?.latest_render ?? sb?.latest_preview;

  // Dynamic poster slogan
  const posterTitle = title.trim() ? title.trim().toUpperCase() : 'MAKE IT MATTER.';

  return (
    <Screen title="Motion Films" subtitle="Creative direction and animated motion graphics for your brand.">
      {/* ---------------- 3-Step Top Stepper ---------------- */}
      <View style={[styles.stepperContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveStep(1)}
          style={[styles.stepItem, activeStep === 1 && styles.stepItemActive]}
        >
          <View
            style={[
              styles.stepBadge,
              activeStep === 1
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
          >
            <Text style={{ fontFamily: font.bold, fontSize: 11, color: activeStep === 1 ? colors.onPrimary : colors.textMuted }}>
              01
            </Text>
          </View>
          <Text style={[styles.stepLabel, { color: activeStep === 1 ? colors.text : colors.textMuted }]}>
            Your brief
          </Text>
        </Pressable>

        <View style={[styles.stepConnector, { backgroundColor: colors.border }]} />

        <Pressable
          accessibilityRole="tab"
          onPress={() => {
            if (card || sb || jobId) setActiveStep(2);
          }}
          style={[styles.stepItem, activeStep === 2 && styles.stepItemActive, !card && !sb && !jobId && { opacity: 0.5 }]}
        >
          <View
            style={[
              styles.stepBadge,
              activeStep === 2
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
          >
            <Text style={{ fontFamily: font.bold, fontSize: 11, color: activeStep === 2 ? colors.onPrimary : colors.textMuted }}>
              02
            </Text>
          </View>
          <Text style={[styles.stepLabel, { color: activeStep === 2 ? colors.text : colors.textMuted }]}>
            Creative direction
          </Text>
        </Pressable>

        <View style={[styles.stepConnector, { backgroundColor: colors.border }]} />

        <Pressable
          accessibilityRole="tab"
          onPress={() => {
            if (video || jobId) setActiveStep(3);
          }}
          style={[styles.stepItem, activeStep === 3 && styles.stepItemActive, !video && !jobId && { opacity: 0.5 }]}
        >
          <View
            style={[
              styles.stepBadge,
              activeStep === 3
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
          >
            <Text style={{ fontFamily: font.bold, fontSize: 11, color: activeStep === 3 ? colors.onPrimary : colors.textMuted }}>
              03
            </Text>
          </View>
          <Text style={[styles.stepLabel, { color: activeStep === 3 ? colors.text : colors.textMuted }]}>
            Review your film
          </Text>
        </Pressable>
      </View>

      {/* Global Error Banner */}
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {sb?.error ? <Banner tone="danger">{sb.error}</Banner> : null}

      {/* ============================================================== */}
      {/* STEP 1: YOUR BRIEF (SPLIT LAYOUT)                              */}
      {/* ============================================================== */}
      {activeStep === 1 ? (
        <View style={[styles.splitGrid, wide && styles.splitGridWide]}>
          {/* Left Column: The Configuration Form */}
          <View style={styles.formCol}>
            <Card style={{ gap: spacing.lg }}>
              <View style={styles.headerLine}>
                <T variant="caption" color={colors.primary} style={styles.eyebrowTag}>
                  STEP 01 — THE STARTING POINT
                </T>
                <View style={[styles.pillBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={[styles.pillBadgeText, { color: colors.textMuted }]}>ABOUT 2 MIN</Text>
                </View>
              </View>

              <View style={{ gap: 4 }}>
                <T variant="h1" style={{ fontSize: 24, letterSpacing: -0.5 }}>
                  What are we making?
                </T>
                <T muted style={{ fontSize: 13.5 }}>
                  A few details help your creative director understand the vision.
                </T>
              </View>

              <Field label="GIVE YOUR FILM A NAME" hint="The main hook or identity for the film">
                <Input value={title} onChangeText={setTitle} placeholder="The power of a single moment" />
              </Field>

              <Field
                label="DESCRIBE YOUR IDEA"
                hint="Describe the concept, rhythm, emotional impact, and what needs to happen."
              >
                <Input
                  value={prompt}
                  onChangeText={setPrompt}
                  multiline
                  style={{ minHeight: 110, lineHeight: 22 }}
                  placeholder="Create a cinematic, human brand film about turning ambitious ideas into real-world momentum..."
                />
              </Field>

              {/* 2x3 Selector Grid */}
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

              {/* Optional CTA & Links toggle */}
              <Pressable
                onPress={() => setShowAdvanced(!showAdvanced)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 }}
              >
                <Icon name={showAdvanced ? 'chevron' : 'plus'} size={14} color={colors.primary} />
                <T variant="small" color={colors.primary} style={{ fontWeight: '600' }}>
                  {showAdvanced ? 'Hide CTA & Tagline details' : 'Add CTA button & Tagline (optional)'}
                </T>
              </Pressable>

              {showAdvanced ? (
                <View style={{ gap: spacing.md, paddingLeft: 4 }}>
                  <Field label="Closing Tagline" hint="Big text on the closing card">
                    <Input value={tagline} onChangeText={setTagline} placeholder="e.g. Automate your marketing" />
                  </Field>
                  <Field label="Button text & URL" hint="Shown on the CTA card">
                    <Input value={button} onChangeText={setButton} placeholder="e.g. Book a free consultation" />
                    <View style={{ height: spacing.xs }} />
                    <Input
                      value={url}
                      onChangeText={setUrl}
                      placeholder="e.g. yourcompany.com"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </Field>
                </View>
              ) : null}

              {/* Form Actions */}
              <View style={styles.formFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="sparkles" size={14} color={colors.primary} />
                  <T variant="caption" faint>
                    You can refine every choice later.
                  </T>
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                  <Button
                    label="Shape my creative direction"
                    variant="primary"
                    icon="sparkles"
                    loading={busy === 'build'}
                    onPress={build}
                  />
                </View>
              </View>
            </Card>
          </View>

          {/* Right Column: Dynamic Process Poster & Highlights */}
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
                Your idea, with a point of view.
              </T>

              {/* Aesthetic Poster Preview */}
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
                  <Text style={[styles.posterMonoText, { color: colors.textMuted }]}>MF / CREATIVE STUDY</Text>
                  <Text style={[styles.posterMonoText, { color: colors.textMuted }]}>001</Text>
                </View>

                <View style={styles.posterCenter}>
                  <Text style={[styles.posterSubheading, { color: colors.primary }]}>
                    {feeling.toUpperCase()}
                  </Text>
                  <Text style={[styles.posterTitleText, { color: colors.text }]} numberOfLines={3}>
                    {posterTitle}
                  </Text>
                </View>

                <View style={[styles.posterBottomLine, { borderTopColor: colors.border }]}>
                  <Text style={[styles.posterMonoText, { color: colors.textFaint }]}>MOTION FILM STUDIO</Text>
                  <Text style={[styles.posterMonoText, { color: colors.textFaint }]}>YOUR STORY</Text>
                  <Text style={[styles.posterMonoText, { color: colors.textFaint }]}>01 23</Text>
                </View>
              </View>

              {/* Feature Highlights */}
              <View style={{ gap: spacing.md, marginTop: spacing.xs }}>
                <View style={styles.highlightRow}>
                  <View style={[styles.highlightIcon, { backgroundColor: colors.primarySoft }]}>
                    <Icon name="sparkles" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="label" style={{ fontWeight: '700' }}>
                      Made around your idea
                    </T>
                    <T variant="small" muted>
                      Your creative direction is built from your brief — not a generic template.
                    </T>
                  </View>
                </View>

                <View style={styles.highlightRow}>
                  <View style={[styles.highlightIcon, { backgroundColor: colors.primarySoft }]}>
                    <Icon name="clock" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="label" style={{ fontWeight: '700' }}>
                      You stay in control
                    </T>
                    <T variant="small" muted>
                      Review the direction, inspect the scenes, and approve before rendering.
                    </T>
                  </View>
                </View>
              </View>
            </Card>
          </View>
        </View>
      ) : null}

      {/* ============================================================== */}
      {/* STEP 2: CREATIVE DIRECTION (SCENES & STORYBOARD APPROVAL)      */}
      {/* ============================================================== */}
      {activeStep !== 1 && jobId ? (
        <DirectorJob
          jobId={jobId}
          onNew={startOver}
          onStatus={(j) => { if (j.status === 'done' && activeStep !== 3) setActiveStep(3); }}
        />
      ) : null}

      {activeStep === 2 && !jobId ? (
        <View style={{ gap: spacing.lg }}>
          <Card>
            <View style={styles.head}>
              <View style={{ flex: 1, minWidth: 240, gap: 6 }}>
                <View style={styles.row}>
                  <Badge label="Motion graphics" tone="info" />
                  <Badge
                    label={
                      building
                        ? 'Building scenes'
                        : rendering
                        ? 'Rendering'
                        : sb?.status === 'failed'
                        ? 'Failed'
                        : sb?.approved
                        ? 'Approved'
                        : 'Awaiting approval'
                    }
                    tone={sb?.status === 'failed' ? 'danger' : sb?.approved ? 'success' : 'warning'}
                    dot
                  />
                </View>
                <T variant="h1">{card?.title || title || 'Motion reel'}</T>
                {card ? (
                  <T muted>
                    {card.scenes_count} scenes · {num(card.duration.output_seconds)}s duration
                  </T>
                ) : null}
                {sb?.agent_reply ? <T variant="small" muted>{sb.agent_reply}</T> : null}
              </View>

              <View style={styles.row}>
                {video ? (
                  <Button
                    label="View finished film"
                    icon="film"
                    variant="primary"
                    onPress={() => setActiveStep(3)}
                  />
                ) : null}

                {sb?.approved ? (
                  <Button
                    label="Withdraw approval"
                    icon="x"
                    loading={busy === 'unapprove'}
                    onPress={() =>
                      act(
                        'unapprove',
                        async () => {
                          if (sb) {
                            await editor.unapprove(sb.id);
                            await refresh(sb.id);
                          }
                        },
                        'Approval withdrawn'
                      )
                    }
                  />
                ) : (
                  <Button
                    label="Approve reel"
                    variant="primary"
                    icon="check"
                    loading={busy === 'approve'}
                    disabled={!ready || !sb}
                    hint="The reel is still being built"
                    onPress={() =>
                      act(
                        'approve',
                        async () => {
                          if (sb) {
                            await editor.approve(sb.id);
                            await refresh(sb.id);
                          }
                        },
                        'Approved. You can render it now.'
                      )
                    }
                  />
                )}

                <Button
                  label="Final render"
                  variant={sb?.approved ? 'primary' : 'secondary'}
                  icon="film"
                  loading={busy === 'final'}
                  disabled={!sb?.approved || !ready || rendering || !sb}
                  hint="Approve the reel first"
                  onPress={() =>
                    act(
                      'final',
                      async () => {
                        if (sb) {
                          await editor.render(sb.id, 'final');
                          await refresh(sb.id);
                        }
                      },
                      'Final render started'
                    )
                  }
                />

                <Button
                  label="Edit brief"
                  icon="sliders"
                  onPress={() => setActiveStep(1)}
                />
              </View>
            </View>
          </Card>

          {building ? (
            <Banner tone="info">
              Animating scenes with the HyperFrames engine. This takes a moment; the storyboard updates automatically.
            </Banner>
          ) : null}

          {/* Generated Scenes List */}
          {card ? (
            <>
              <SectionTitle title={`Storyboard Scenes (${card.scenes_count})`} />
              {card.scenes.map((s) => (
                <Card key={s.scene_number}>
                  <View style={styles.head}>
                    <T variant="h3">
                      {s.scene_number}. {s.type}
                    </T>
                    <T variant="small" muted>
                      {s.timestamp_output}
                    </T>
                  </View>
                  <T style={{ marginTop: 6 }}>{s.action}</T>
                  <View style={[styles.textBlock, { backgroundColor: colors.surfaceAlt }]}>
                    <T variant="caption" faint style={{ letterSpacing: 0.5, fontWeight: '700' }}>
                      ON SCREEN
                    </T>
                    <T style={{ marginTop: 2 }}>{s.caption}</T>
                  </View>
                </Card>
              ))}

              {card.scorecard?.checks?.length ? (
                <Card>
                  <T variant="label" style={{ marginBottom: 6 }}>
                    Quality & Sendability Checks
                  </T>
                  {card.scorecard.checks.map((c) => (
                    <T key={c.name} variant="small" muted style={{ marginTop: 4 }}>
                      {c.status.toUpperCase()} · {c.detail}
                    </T>
                  ))}
                </Card>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      {/* ============================================================== */}
      {/* STEP 3: REVIEW YOUR FILM (VIDEO PLAYER & SCORECARD)            */}
      {/* ============================================================== */}
      {activeStep === 3 && !jobId ? (
        <View style={{ gap: spacing.lg }}>
          <Card>
            <View style={styles.head}>
              <View style={{ gap: 4 }}>
                <T variant="h1">{sb?.storyboard?.title || title || 'Finished Motion Reel'}</T>
                <T muted>Render complete. Ready for export and publication.</T>
              </View>
              <View style={styles.row}>
                <Button label="Back to scenes" icon="layers" onPress={() => setActiveStep(2)} />
                <Button
                  label="Create another film"
                  variant="primary"
                  icon="plus"
                  onPress={() => {
                    setSb(null);
                    setPreview(null);
                    setActiveStep(1);
                  }}
                />
              </View>
            </View>
          </Card>

          {video ? (
            <Card>
              <VideoPlayer uri={absoluteUrl(video.video_url) as string} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <T variant="small" muted>
                  {num(video.duration)}s · {video.resolution} · {video.backend}
                </T>
                <Badge label={video.quality === 'final' ? 'Final Quality' : 'Preview'} tone="success" />
              </View>
              {video.warnings?.length ? (
                <View style={{ marginTop: 8 }}>
                  <Banner tone="warning">
                    {video.warnings.join(' ')}
                  </Banner>
                </View>
              ) : null}
            </Card>
          ) : (
            <Banner tone="info">No video rendered yet. Head to Step 02 to build and approve your reel.</Banner>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
