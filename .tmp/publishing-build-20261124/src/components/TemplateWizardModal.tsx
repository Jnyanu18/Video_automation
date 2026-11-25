import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import { Icon } from './Icon';
import { font, radius, spacing, useTheme } from '../theme';

export interface TemplateWizardData {
  name: string;
  language: string;
  aspectRatio: '9:16' | '1:1' | '16:9';
  framing: 'auto-face' | 'split' | 'full';
  accentColor: string;
  showWatermark: boolean;
  captionStyle: 'karaoke' | 'minimal' | 'bold' | 'retro';
  targetDuration: number;
  hookAggressiveness: 'conservative' | 'balanced' | 'aggressive';
  removeSilence: boolean;
  autoBroll: boolean;
}

interface TemplateWizardModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (data: TemplateWizardData) => void;
  initialData?: Partial<TemplateWizardData>;
}

const STEPS = [
  { id: 1, title: 'Basic details' },
  { id: 2, title: 'Brand & Framing' },
  { id: 3, title: 'Caption Style' },
  { id: 4, title: 'AI Clipping' },
];

const ACCENT_COLORS = [
  '#FF5A1F', // Brand Violet
  '#0EA5E9', // Sky Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#F43F5E', // Rose
  '#111827', // Obsidian
];

export function TemplateWizardModal({
  visible,
  onClose,
  onComplete,
  initialData,
}: TemplateWizardModalProps) {
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Form State
  const [name, setName] = useState(initialData?.name || 'AILO Viral Clip Template');
  const [language, setLanguage] = useState(initialData?.language || 'English');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '16:9'>(initialData?.aspectRatio || '9:16');
  const [framing, setFraming] = useState<'auto-face' | 'split' | 'full'>(initialData?.framing || 'auto-face');
  const [accentColor, setAccentColor] = useState(initialData?.accentColor || '#FF5A1F');
  const [showWatermark, setShowWatermark] = useState(initialData?.showWatermark ?? false);
  const [captionStyle, setCaptionStyle] = useState<'karaoke' | 'minimal' | 'bold' | 'retro'>(initialData?.captionStyle || 'karaoke');
  const [targetDuration, setTargetDuration] = useState(initialData?.targetDuration || 30);
  const [hookAggressiveness, setHookAggressiveness] = useState<'conservative' | 'balanced' | 'aggressive'>(initialData?.hookAggressiveness || 'aggressive');
  const [removeSilence, setRemoveSilence] = useState(initialData?.removeSilence ?? true);
  const [autoBroll, setAutoBroll] = useState(initialData?.autoBroll ?? true);

  if (!visible) return null;

  const handleRequestClose = () => {
    setShowDiscardConfirm(true);
  };

  const confirmDiscard = () => {
    setShowDiscardConfirm(false);
    setStep(1);
    onClose();
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      onComplete({
        name,
        language,
        aspectRatio,
        framing,
        accentColor,
        showWatermark,
        captionStyle,
        targetDuration,
        hookAggressiveness,
        removeSilence,
        autoBroll,
      });
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleRequestClose}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Set up your video template</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                One question at a time. You can change anything later from the settings menu.
              </Text>
            </View>
            <Pressable
              onPress={handleRequestClose}
              style={({ pressed }: any) => [
                styles.closeButton,
                { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' },
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
            >
              <Icon name="x" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Stepper Card */}
          <View style={[styles.stepperContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
            <View style={styles.stepperTrack}>
              {STEPS.map((s, index) => {
                const isActive = step === s.id;
                const isCompleted = step > s.id;
                const isLast = index === STEPS.length - 1;

                return (
                  <React.Fragment key={s.id}>
                    <Pressable
                      onPress={() => s.id < step && setStep(s.id)}
                      style={[styles.stepNodeContainer, Platform.OS === 'web' && ({ cursor: s.id < step ? 'pointer' : 'default' } as any)]}
                    >
                      <View
                        style={[
                          styles.stepCircle,
                          {
                            backgroundColor: isCompleted || isActive ? colors.primary : 'transparent',
                            borderColor: isCompleted || isActive ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        {isCompleted ? (
                          <Icon name="check" size={13} color="#FFFFFF" />
                        ) : isActive ? (
                          <View style={styles.activeDot} />
                        ) : (
                          <Text style={[styles.stepNumber, { color: colors.textFaint }]}>{s.id}</Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.stepLabel,
                          {
                            color: isActive ? colors.primary : isCompleted ? colors.text : colors.textMuted,
                            fontFamily: isActive ? font.semibold : font.regular,
                          },
                        ]}
                      >
                        {s.id}. {s.title}
                      </Text>
                    </Pressable>
                    {!isLast && (
                      <View
                        style={[
                          styles.stepLine,
                          {
                            backgroundColor: isCompleted ? colors.primary : colors.border,
                            borderStyle: isCompleted ? 'solid' : 'dashed',
                          },
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          {/* Step Body (Question Card) */}
          <ScrollView contentContainerStyle={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            <View style={[styles.questionCard, { borderColor: colors.borderLight }]}>
              
              {/* STEP 1: Basic Details */}
              {step === 1 && (
                <View style={styles.stepContent}>
                  <View style={styles.questionHeader}>
                    <View style={[styles.questionIconBadge, { backgroundColor: colors.primarySoft }]}>
                      <Icon name="folder" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.questionTitle, { color: colors.text }]}>Template Name & Format</Text>
                      <Text style={[styles.questionHelper, { color: colors.textMuted }]}>
                        Define what this template produces and which canvas aspect ratio to target.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Template name</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. TikTok / Reels Viral Cuts"
                      placeholderTextColor={colors.textFaint}
                    />
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Target Canvas Aspect Ratio</Text>
                    <View style={styles.ratioRow}>
                      {[
                        { id: '9:16', title: '9:16 Vertical', sub: 'TikTok, Reels, Shorts', icon: 'smartphone' as const, badge: 'Recommended' },
                        { id: '1:1', title: '1:1 Square', sub: 'LinkedIn & Instagram Feed', icon: 'square' as const },
                        { id: '16:9', title: '16:9 Landscape', sub: 'YouTube & Web', icon: 'monitor' as const },
                      ].map((item) => {
                        const isSelected = aspectRatio === item.id;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => setAspectRatio(item.id as any)}
                            style={({ pressed }: any) => [
                              styles.ratioCard,
                              {
                                backgroundColor: isSelected ? colors.primarySoft : colors.surfaceAlt,
                                borderColor: isSelected ? colors.primary : colors.border,
                              },
                              Platform.OS === 'web' && ({
                                cursor: 'pointer',
                                transition: 'all 120ms ease',
                                transform: pressed ? 'scale(0.98)' : 'none',
                              } as any),
                            ]}
                          >
                            {item.badge && (
                              <View style={[styles.recommendedBadge, { backgroundColor: colors.primary }]}>
                                <Text style={styles.recommendedBadgeText}>{item.badge}</Text>
                              </View>
                            )}
                            <View style={[styles.ratioIconBox, { backgroundColor: isSelected ? colors.primary : colors.surface }]}>
                              <Icon name={item.icon} size={18} color={isSelected ? '#FFFFFF' : colors.textMuted} />
                            </View>
                            <Text style={[styles.ratioTitle, { color: isSelected ? colors.primary : colors.text }]}>
                              {item.title}
                            </Text>
                            <Text style={[styles.ratioSub, { color: colors.textMuted }]}>{item.sub}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )}

              {/* STEP 2: Brand & Framing */}
              {step === 2 && (
                <View style={styles.stepContent}>
                  <View style={styles.questionHeader}>
                    <View style={[styles.questionIconBadge, { backgroundColor: colors.primarySoft }]}>
                      <Icon name="camera" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.questionTitle, { color: colors.text }]}>Speaker Framing & Brand Color</Text>
                      <Text style={[styles.questionHelper, { color: colors.textMuted }]}>
                        How should the AI track the active speaker, and what color accent anchors your brand?
                      </Text>
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Speaker Framing Method</Text>
                    <View style={styles.optionsList}>
                      {[
                        { id: 'auto-face', title: 'Auto Face-Tracking Crop', desc: 'AI centers on the active speaker dynamically, panning smoothly when they move.', rec: true },
                        { id: 'split', title: 'Split Screen Layout', desc: 'Speaker top, game or secondary screen capture bottom with auto balance.', rec: false },
                        { id: 'full', title: 'Full Frame Fit & Blur', desc: 'Preserves the entire original 16:9 frame with aesthetic ambient blurred backdrop.', rec: false },
                      ].map((opt) => {
                        const isSelected = framing === opt.id;
                        return (
                          <Pressable
                            key={opt.id}
                            onPress={() => setFraming(opt.id as any)}
                            style={({ pressed }: any) => [
                              styles.optionRow,
                              {
                                backgroundColor: isSelected ? colors.primarySoft : colors.surfaceAlt,
                                borderColor: isSelected ? colors.primary : colors.border,
                              },
                              Platform.OS === 'web' && ({
                                cursor: 'pointer',
                                transition: 'all 120ms ease',
                                transform: pressed ? 'scale(0.99)' : 'none',
                              } as any),
                            ]}
                          >
                            <View style={[styles.radioCircle, { borderColor: isSelected ? colors.primary : colors.border }]}>
                              {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={[styles.optionTitle, { color: isSelected ? colors.primary : colors.text }]}>{opt.title}</Text>
                                {opt.rec && (
                                  <View style={[styles.miniRecBadge, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
                                    <Text style={[styles.miniRecBadgeText, { color: colors.primary }]}>Recommended</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[styles.optionDesc, { color: colors.textMuted }]}>{opt.desc}</Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Brand Accent Color</Text>
                    <View style={styles.colorPaletteRow}>
                      {ACCENT_COLORS.map((hex) => {
                        const isSelected = accentColor === hex;
                        return (
                          <Pressable
                            key={hex}
                            onPress={() => setAccentColor(hex)}
                            style={[
                              styles.colorSwatch,
                              { backgroundColor: hex },
                              isSelected && styles.colorSwatchSelected,
                              Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                            ]}
                          >
                            {isSelected && <Icon name="check" size={14} color="#FFFFFF" />}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )}

              {/* STEP 3: Caption Style Swatches */}
              {step === 3 && (
                <View style={styles.stepContent}>
                  <View style={styles.questionHeader}>
                    <View style={[styles.questionIconBadge, { backgroundColor: colors.primarySoft }]}>
                      <Icon name="type" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.questionTitle, { color: colors.text }]}>Pick Caption Style Preset</Text>
                      <Text style={[styles.questionHelper, { color: colors.textMuted }]}>
                        Select a high-retention animated subtitle style calibrated for short-form algorithms.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.swatchGrid}>
                    {[
                      {
                        id: 'karaoke',
                        name: 'Karaoke Bounce',
                        tagline: 'Word-by-word punchy pop with active glow',
                        badge: 'Most Popular',
                        bg: '#18181B',
                        previewText: 'HOW I GREW 10X',
                        highlightWord: '10X',
                        wordColor: '#FACC15',
                      },
                      {
                        id: 'minimal',
                        name: 'Minimal Clean',
                        tagline: 'Refined sans-serif with subtle background drop',
                        badge: null,
                        bg: '#0F172A',
                        previewText: 'The secret is compounding',
                        highlightWord: 'compounding',
                        wordColor: '#38BDF8',
                      },
                      {
                        id: 'bold',
                        name: 'Boxed Impact',
                        tagline: 'High-contrast boxed highlight that stops thumbs',
                        badge: 'High CTR',
                        bg: '#172554',
                        previewText: 'STOP WASTING TIME',
                        highlightWord: 'STOP',
                        wordColor: '#EF4444',
                      },
                      {
                        id: 'retro',
                        name: 'Typewriter Mono',
                        tagline: 'Courier style aesthetic for tech & finance',
                        badge: null,
                        bg: '#1C1917',
                        previewText: 'import { future } from ai',
                        highlightWord: 'future',
                        wordColor: '#A855F7',
                      },
                    ].map((swatch) => {
                      const isSelected = captionStyle === swatch.id;
                      return (
                        <Pressable
                          key={swatch.id}
                          onPress={() => setCaptionStyle(swatch.id as any)}
                          style={({ pressed }: any) => [
                            styles.swatchCard,
                            {
                              borderColor: isSelected ? colors.primary : colors.border,
                              backgroundColor: isSelected ? colors.primarySoft : colors.surfaceAlt,
                            },
                            Platform.OS === 'web' && ({
                              cursor: 'pointer',
                              transition: 'all 120ms ease',
                              transform: pressed ? 'scale(0.98)' : 'none',
                            } as any),
                          ]}
                        >
                          {swatch.badge && (
                            <View style={[styles.swatchBadge, { backgroundColor: colors.primary }]}>
                              <Text style={styles.swatchBadgeText}>{swatch.badge}</Text>
                            </View>
                          )}

                          {/* Mini simulated video frame */}
                          <View style={[styles.swatchFrame, { backgroundColor: swatch.bg }]}>
                            <View style={styles.swatchFrameSpeakerMock} />
                            <View style={styles.swatchSubtitleContainer}>
                              <Text style={styles.swatchMockText}>
                                {swatch.previewText.split(' ').map((word, i) => {
                                  const isHit = word.includes(swatch.highlightWord);
                                  return (
                                    <Text
                                      key={i}
                                      style={{
                                        color: isHit ? swatch.wordColor : '#FFFFFF',
                                        fontWeight: isHit ? '800' : '600',
                                        backgroundColor: isHit && swatch.id === 'bold' ? 'rgba(0,0,0,0.6)' : 'transparent',
                                      }}
                                    >
                                      {word}{' '}
                                    </Text>
                                  );
                                })}
                              </Text>
                            </View>
                            {isSelected && (
                              <View style={[styles.selectedCheckOverlay, { backgroundColor: colors.primary }]}>
                                <Icon name="check" size={12} color="#FFFFFF" />
                              </View>
                            )}
                          </View>

                          <View style={styles.swatchMeta}>
                            <Text style={[styles.swatchTitle, { color: isSelected ? colors.primary : colors.text }]}>
                              {swatch.name}
                            </Text>
                            <Text style={[styles.swatchTagline, { color: colors.textMuted }]}>{swatch.tagline}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* STEP 4: AI Clipping Policy */}
              {step === 4 && (
                <View style={styles.stepContent}>
                  <View style={styles.questionHeader}>
                    <View style={[styles.questionIconBadge, { backgroundColor: colors.primarySoft }]}>
                      <Icon name="sparkles" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.questionTitle, { color: colors.text }]}>AI Clipping & Hook Intelligence</Text>
                      <Text style={[styles.questionHelper, { color: colors.textMuted }]}>
                        Configure target length, silence trimming, and viral hook sensitivity.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Target Clip Duration</Text>
                    <View style={styles.segmentedRow}>
                      {[15, 30, 45, 60].map((sec) => {
                        const isSelected = targetDuration === sec;
                        return (
                          <Pressable
                            key={sec}
                            onPress={() => setTargetDuration(sec)}
                            style={[
                              styles.segmentButton,
                              {
                                backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                                borderColor: isSelected ? colors.primary : colors.border,
                              },
                              Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                            ]}
                          >
                            <Text style={[styles.segmentButtonText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                              ~{sec}s
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Hook Aggressiveness</Text>
                    <View style={styles.segmentedRow}>
                      {[
                        { id: 'conservative', label: 'Conservative' },
                        { id: 'balanced', label: 'Balanced' },
                        { id: 'aggressive', label: 'Aggressive' },
                      ].map((item) => {
                        const isSelected = hookAggressiveness === item.id;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => setHookAggressiveness(item.id as any)}
                            style={[
                              styles.segmentButton,
                              {
                                backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                                borderColor: isSelected ? colors.primary : colors.border,
                              },
                              Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                            ]}
                          >
                            <Text style={[styles.segmentButtonText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                              {item.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.toggleTitle, { color: colors.text }]}>Auto-cut Dead Silence</Text>
                      <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
                        Removes pauses greater than 400ms to preserve high viewer velocity.
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setRemoveSilence(!removeSilence)}
                      style={[
                        styles.togglePill,
                        { backgroundColor: removeSilence ? colors.primary : colors.border },
                        Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                      ]}
                    >
                      <View style={[styles.toggleKnob, removeSilence && styles.toggleKnobActive]} />
                    </Pressable>
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.toggleTitle, { color: colors.text }]}>Smart B-Roll Cut-Ins</Text>
                      <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
                        Automatically fetches contextual visuals when abstract concepts are named.
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setAutoBroll(!autoBroll)}
                      style={[
                        styles.togglePill,
                        { backgroundColor: autoBroll ? colors.primary : colors.border },
                        Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                      ]}
                    >
                      <View style={[styles.toggleKnob, autoBroll && styles.toggleKnobActive]} />
                    </Pressable>
                  </View>
                </View>
              )}

            </View>
          </ScrollView>

          {/* Fixed Footer */}
          <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
            {step > 1 ? (
              <Pressable
                onPress={handleBack}
                style={({ pressed }: any) => [
                  styles.backButton,
                  { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceAlt : 'transparent' },
                  Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                ]}
              >
                <Icon name="arrow-left" size={16} color={colors.text} />
                <Text style={[styles.backButtonText, { color: colors.text }]}>Back</Text>
              </Pressable>
            ) : <View style={{ width: 80 }} />}

            <View style={styles.footerRight}>
              <Pressable
                onPress={handleNext}
                style={[styles.skipButton, Platform.OS === 'web' && ({ cursor: 'pointer' } as any)]}
              >
                <Text style={[styles.skipButtonText, { color: colors.textMuted }]}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={handleNext}
                style={({ pressed }: any) => [
                  styles.continueButton,
                  {
                    backgroundColor: colors.primary,
                    transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                  },
                  Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                ]}
              >
                <Text style={styles.continueButtonText}>
                  {step === 4 ? 'Complete Setup' : 'Continue'}
                </Text>
                <Icon name={step === 4 ? 'check' : 'arrow-right'} size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

        </View>

        {/* Discard Confirmation Dialog */}
        {showDiscardConfirm && (
          <View style={styles.confirmBackdrop}>
            <View style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.confirmIconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <Icon name="alert-triangle" size={20} color={colors.danger} />
              </View>
              <Text style={[styles.confirmTitle, { color: colors.text }]}>Discard setup?</Text>
              <Text style={[styles.confirmBody, { color: colors.textMuted }]}>
                You have unsaved changes in this template wizard. If you leave now, your selections will be reset.
              </Text>
              <View style={styles.confirmActions}>
                <Pressable
                  onPress={() => setShowDiscardConfirm(false)}
                  style={[styles.confirmCancelBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.confirmCancelText, { color: colors.text }]}>Keep editing</Text>
                </Pressable>
                <Pressable
                  onPress={confirmDiscard}
                  style={[styles.confirmDiscardBtn, { backgroundColor: '#111827' }]}
                >
                  <Text style={styles.confirmDiscardText}>Discard</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '92%',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: font.bold,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: font.regular,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperContainer: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  stepperTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepNodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  stepNumber: {
    fontSize: 11,
    fontFamily: font.bold,
  },
  stepLabel: {
    fontSize: 12,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
  },
  bodyScroll: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  questionCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  stepContent: {
    gap: spacing.lg,
  },
  questionHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: spacing.md,
  },
  questionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionTitle: {
    fontSize: 16,
    fontFamily: font.bold,
  },
  questionHelper: {
    fontSize: 13,
    fontFamily: font.regular,
    marginTop: 2,
  },
  fieldBlock: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: font.semibold,
  },
  textInput: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    fontFamily: font.regular,
  },
  ratioRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ratioCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: spacing.md,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  recommendedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: font.bold,
  },
  ratioIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratioTitle: {
    fontSize: 13,
    fontFamily: font.semibold,
  },
  ratioSub: {
    fontSize: 11,
    textAlign: 'center',
  },
  optionsList: {
    gap: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionTitle: {
    fontSize: 13,
    fontFamily: font.semibold,
  },
  miniRecBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  miniRecBadgeText: {
    fontSize: 10,
    fontFamily: font.bold,
  },
  optionDesc: {
    fontSize: 12,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    gap: 14,
  },
  colorSwatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatchCard: {
    width: '48%',
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: 10,
    gap: 8,
    position: 'relative',
  },
  swatchBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    zIndex: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  swatchBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: font.bold,
  },
  swatchFrame: {
    height: 100,
    borderRadius: radius.sm,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  swatchFrameSpeakerMock: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: 14,
  },
  swatchSubtitleContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  swatchMockText: {
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  selectedCheckOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchMeta: {
    gap: 2,
  },
  swatchTitle: {
    fontSize: 13,
    fontFamily: font.semibold,
  },
  swatchTagline: {
    fontSize: 11,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonText: {
    fontSize: 12,
    fontFamily: font.semibold,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  toggleTitle: {
    fontSize: 13,
    fontFamily: font.semibold,
  },
  toggleDesc: {
    fontSize: 12,
  },
  togglePill: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 13,
    fontFamily: font.medium,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skipButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipButtonText: {
    fontSize: 13,
    fontFamily: font.medium,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: font.semibold,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 999,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: 12,
  },
  confirmIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    fontSize: 16,
    fontFamily: font.bold,
  },
  confirmBody: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 13,
    fontFamily: font.medium,
  },
  confirmDiscardBtn: {
    flex: 1,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDiscardText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: font.semibold,
  },
});
