import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '../../components/Icon';
import { Badge, Button, Card, T } from '../../components/ui';
import { TemplateWizard } from '../../components/TemplateWizard';
import { ProjectHistory } from '../../components/ProjectHistory';
import { useStoryboards } from '../../state/useStoryboards';
import { useToast } from '../../state/toast';
import { editor } from '../../api/editor';
import { MAX_CONTENT_WIDTH, font, radius, shadow, spacing, useTheme } from '../../theme';

export default function ChoppityHomeScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { list: storyboards, loading, reload } = useStoryboards();

  // Pick a video card state
  const [pickCardExpanded, setPickCardExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
  const [linkInput, setLinkInput] = useState('');
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Template wizard modal state
  const [wizardOpen, setWizardOpen] = useState(false);

  const handleGenerateClips = async () => {
    if (!linkInput.trim()) {
      toast('Please paste a video link');
      return;
    }
    setSubmitting(true);
    try {
      const res = await editor.autoEdit({
        url: linkInput.trim(),
        prompt: instructions.trim() || undefined,
        style: 'viral_hook_fast_pace',
      });
      toast('Video imported! Generating short clips...');
      setLinkInput('');
      setInstructions('');
      await reload();
      if (res?.storyboard_id) {
        router.push(`/storyboard?sb=${res.storyboard_id}` as any);
      }
    } catch (e: any) {
      toast(e?.message || 'Failed to process video');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { maxWidth: MAX_CONTENT_WIDTH }]}
      >
        {/* =========================================================================
            1. PRIMARY WORKFLOW SCREEN: "Pick a video" Card
           ========================================================================= */}
        <View style={[styles.intakeCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadow(colors)]}>
          {/* Card Header with Collapse/Expand Toggle */}
          <Pressable
            onPress={() => setPickCardExpanded(!pickCardExpanded)}
            style={styles.cardHeaderRow}
            accessibilityRole="button"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.intakeIconBadge, { backgroundColor: 'rgba(108, 76, 240, 0.1)' }]}>
                <Icon name="video" size={18} color={colors.primary} />
              </View>
              <T variant="h2" style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                Pick a video
              </T>
            </View>
            <View style={styles.chevronBox}>
              <Icon name={pickCardExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
            </View>
          </Pressable>

          {pickCardExpanded && (
            <View style={{ marginTop: spacing.md, gap: spacing.md }}>
              {/* Two-tab Segmented Control Inside Card */}
              <View style={[styles.tabSegmentGroup, { backgroundColor: '#F1F5F9', borderColor: colors.border }]}>
                <Pressable
                  onPress={() => setActiveTab('new')}
                  style={[
                    styles.tabSegmentBtn,
                    activeTab === 'new' && styles.tabSegmentBtnActive,
                    activeTab === 'new' && Platform.OS === 'web' && ({
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    } as any),
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: activeTab === 'new' ? font.bold : font.medium,
                      fontSize: 13,
                      color: activeTab === 'new' ? colors.text : colors.textMuted,
                    }}
                  >
                    New video
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setActiveTab('existing')}
                  style={[
                    styles.tabSegmentBtn,
                    activeTab === 'existing' && styles.tabSegmentBtnActive,
                    activeTab === 'existing' && Platform.OS === 'web' && ({
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    } as any),
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: activeTab === 'existing' ? font.bold : font.medium,
                      fontSize: 13,
                      color: activeTab === 'existing' ? colors.text : colors.textMuted,
                    }}
                  >
                    Existing video
                  </Text>
                </Pressable>
              </View>

              {/* Tab 1: New Video Intake */}
              {activeTab === 'new' ? (
                <View style={{ gap: spacing.md }}>
                  {/* a) Labeled text input "Paste a link" + "+" button */}
                  <View style={{ gap: 6 }}>
                    <T variant="label" style={{ fontWeight: '600', color: colors.text }}>
                      Paste a link
                    </T>
                    <View style={styles.linkInputRow}>
                      <View style={[styles.linkInputWrapper, { borderColor: colors.border, backgroundColor: '#FFFFFF' }]}>
                        <Icon name="link" size={16} color={colors.textMuted} />
                        <TextInput
                          value={linkInput}
                          onChangeText={setLinkInput}
                          placeholder="YouTube, Vimeo or Google Drive link"
                          placeholderTextColor={colors.textFaint}
                          style={[styles.textInput, { color: colors.text }]}
                        />
                      </View>
                      <Pressable
                        onPress={() => router.push('/new')}
                        style={({ pressed, hovered }: any) => [
                          styles.squarePlusBtn,
                          { borderColor: colors.border, backgroundColor: hovered ? colors.surfaceAlt : '#FFFFFF' },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Icon name="plus" size={17} color={colors.text} />
                      </Pressable>
                    </View>
                  </View>

                  {/* b) "or" divider */}
                  <View style={styles.orDividerRow}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    <Text style={{ fontFamily: font.medium, fontSize: 12, color: colors.textFaint, paddingHorizontal: 12 }}>
                      or
                    </Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  </View>

                  {/* c) Large dashed-border drop-zone */}
                  <Pressable
                    onPress={() => router.push('/new')}
                    style={({ pressed, hovered }: any) => [
                      styles.dropZone,
                      {
                        borderColor: hovered ? colors.primary : '#CBD5E1',
                        backgroundColor: hovered ? 'rgba(108, 76, 240, 0.02)' : '#F8FAFC',
                      },
                      pressed && { opacity: 0.9 },
                      Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                    ]}
                  >
                    <View style={[styles.cloudBadge, { backgroundColor: 'rgba(108, 76, 240, 0.1)' }]}>
                      <Icon name="upload" size={24} color={colors.primary} />
                    </View>
                    <View style={{ alignItems: 'center', gap: 2 }}>
                      <Text style={{ fontFamily: font.bold, fontSize: 14, color: colors.text }}>
                        Upload a video
                      </Text>
                      <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.textMuted }}>
                        Choose a file in the New Reel form
                      </Text>
                    </View>
                    <Text style={{ fontFamily: font.regular, fontSize: 11, color: colors.textFaint }}>
                      Open the upload form
                    </Text>
                  </Pressable>

                  {/* d) Optional textarea: "Add custom instructions" */}
                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon name="lightbulb" size={15} color="#F59E0B" />
                        <T variant="label" style={{ fontWeight: '600', color: colors.text }}>
                          Add custom instructions
                        </T>
                      </View>
                      <Badge label="Optional" tone="neutral" />
                    </View>
                    <TextInput
                      value={instructions}
                      onChangeText={setInstructions}
                      placeholder="e.g. Find all the punchy moments where I explain how the AI agent works and punch in on key hook phrases..."
                      placeholderTextColor={colors.textFaint}
                      multiline
                      numberOfLines={3}
                      style={[
                        styles.textareaInput,
                        { borderColor: colors.border, backgroundColor: '#FFFFFF', color: colors.text },
                      ]}
                    />
                  </View>

                  {/* e) Primary CTA Button */}
                  <Pressable
                    disabled={submitting}
                    onPress={handleGenerateClips}
                    style={({ pressed, hovered }: any) => [
                      styles.primaryGenerateBtn,
                      { backgroundColor: hovered ? colors.primaryPressed : colors.primary },
                      pressed && { opacity: 0.9 },
                      submitting && { opacity: 0.7 },
                      Platform.OS === 'web' && ({
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 14px rgba(108, 76, 240, 0.35)',
                      } as any),
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Icon name="sparkles" size={18} color="#FFFFFF" />
                        <Text style={{ fontFamily: font.bold, fontSize: 15, color: '#FFFFFF' }}>
                          Generate short clips
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ) : (
                /* Tab 2: Existing Video Picker */
                <View style={{ gap: spacing.sm, paddingVertical: spacing.sm }}>
                  <T variant="small" muted>
                    Select an existing footage asset from your library to generate a new variation:
                  </T>
                  {storyboards && storyboards.length > 0 ? (
                    <View style={{ gap: 8 }}>
                      {storyboards.slice(0, 4).map((sb) => (
                        <Pressable
                          key={sb.id}
                          onPress={() => router.push(`/storyboard?sb=${sb.id}` as any)}
                          style={({ pressed, hovered }: any) => [
                            styles.existingItemRow,
                            { borderColor: colors.border, backgroundColor: hovered ? colors.surfaceAlt : '#FFFFFF' },
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <View style={styles.existingThumbnail}>
                            <Icon name="film" size={16} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text }} numberOfLines={1}>
                              {sb.storyboard?.title || sb.video_path || `Project ${sb.id.slice(0, 8)}`}
                            </Text>
                            <Text style={{ fontFamily: font.regular, fontSize: 11, color: colors.textMuted }}>
                              {sb.storyboard?.duration?.output_seconds ? `${Math.round(sb.storyboard.duration.output_seconds)}s • ` : ''}
                              {sb.style} • {sb.status.toUpperCase()}
                            </Text>
                          </View>
                          <Badge label="Open" tone="info" />
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.textMuted, paddingVertical: 12 }}>
                      No existing videos found in your workspace library yet.
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* =========================================================================
            2. CREATIVE LIBRARY / PROJECT HISTORY (Matching Editorial Design Reference)
           ========================================================================= */}
        <ProjectHistory onCreateFilm={() => setPickCardExpanded(true)} />
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

  /* Primary Intake Card */
  intakeCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  intakeIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronBox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSegmentGroup: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    borderWidth: 1,
    padding: 3,
  },
  tabSegmentBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSegmentBtnActive: {
    backgroundColor: '#FFFFFF',
  },

  /* Link Input Row */
  linkInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  squarePlusBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* "or" divider */
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },

  /* Drop Zone */
  dropZone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cloudBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Textarea */
  textareaInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 13,
    fontFamily: font.regular,
    minHeight: 70,
    textAlignVertical: 'top',
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },

  /* Primary Button */
  primaryGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: radius.pill,
    marginTop: 4,
  },

  /* Existing items row */
  existingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
    gap: 12,
  },
  existingThumbnail: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Projects Section */
  templateConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  emptyProjectCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: 12,
  },
  emptyFolderCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  projectCard: {
    flexBasis: '31%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    minWidth: 200,
  },
  posterPreview: {
    height: 110,
    backgroundColor: '#0F172A',
  },
  posterInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  posterBadgeOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  projectCardDetails: {
    padding: 12,
    gap: 4,
  },

  /* Supporting Content */
  tutorialScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  tutorialCard: {
    width: 220,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
  },
  tutorialThumb: {
    height: 80,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  durationChip: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  communityGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  showcaseCard: {
    flex: 1,
    minWidth: 220,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  showcaseThumb: {
    height: 90,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  showcaseTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
