import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Icon, IconName } from './Icon';
import { Badge, T } from './ui';
import { font, radius, spacing, useTheme } from '../theme';

export interface TemplateConfig {
  name: string;
  aspectRatio: '9:16' | '1:1' | '16:9' | '4:5';
  captionStyle: 'karaoke' | 'hormozi' | 'minimal' | 'cyberpunk';
  brandColor: string;
  brandAccent: string;
  watermark: string;
  showWatermark: boolean;
  autoPunchZoom: boolean;
  autoSFX: boolean;
  cutFillerWords: boolean;
  retentionThreshold: number;
}

const DEFAULT_CONFIG: TemplateConfig = {
  name: 'Viral Social Shorts',
  aspectRatio: '9:16',
  captionStyle: 'karaoke',
  brandColor: '#FF5A1F',
  brandAccent: '#FF5A1F',
  watermark: '@ailo',
  showWatermark: true,
  autoPunchZoom: true,
  autoSFX: true,
  cutFillerWords: true,
  retentionThreshold: 80,
};

const STEPS = [
  { id: 1, title: 'Aspect & Framing', short: 'Framing', icon: 'video' as IconName },
  { id: 2, title: 'Caption Style', short: 'Captions', icon: 'type' as IconName },
  { id: 3, title: 'Brand Kit', short: 'Brand', icon: 'sparkles' as IconName },
  { id: 4, title: 'AI & Retention', short: 'AI Audio', icon: 'zap' as IconName },
  { id: 5, title: 'Review & Complete', short: 'Review', icon: 'check-circle' as IconName },
];

export function TemplateWizard({
  visible,
  onClose,
  onSave,
  initialConfig,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (config: TemplateConfig) => void;
  initialConfig?: Partial<TemplateConfig>;
}) {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<TemplateConfig>({ ...DEFAULT_CONFIG, ...initialConfig });
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!visible) return null;

  const handleRequestClose = () => {
    // Show confirmation dialog before closing to prevent accidental progress loss
    setShowDiscardConfirm(true);
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    setCurrentStep(1);
    onClose();
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      onSave(config);
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isFinalStep = currentStep === STEPS.length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleRequestClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="h2" style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                Set up your video template
              </T>
              <T variant="small" muted>
                One question at a time. You can change anything later from the settings menu.
              </T>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close wizard"
              onPress={handleRequestClose}
              style={({ pressed, hovered }: any) => [
                styles.closeBtn,
                hovered && { backgroundColor: colors.surfaceAlt },
                pressed && { opacity: 0.8 },
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
            >
              <Icon name="x" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Stepper Card */}
          <View style={[styles.stepperContainer, { backgroundColor: '#F8FAFC', borderColor: colors.border }]}>
            <View style={styles.stepperRow}>
              {STEPS.map((step, idx) => {
                const isPassed = step.id < currentStep;
                const isCurrent = step.id === currentStep;
                const isFuture = step.id > currentStep;

                return (
                  <React.Fragment key={step.id}>
                    {/* Step Node */}
                    <Pressable
                      onPress={() => step.id <= currentStep && setCurrentStep(step.id)}
                      style={styles.stepNodeContainer}
                    >
                      <View
                        style={[
                          styles.stepCircle,
                          (isCurrent || isPassed) && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          },
                          isFuture && {
                            backgroundColor: '#FFFFFF',
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        {isPassed ? (
                          <Icon name="check" size={12} color="#FFFFFF" />
                        ) : isCurrent ? (
                          <View style={styles.currentDot} />
                        ) : (
                          <Text style={{ fontFamily: font.semibold, fontSize: 11, color: colors.textMuted }}>
                            {step.id}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={{
                          fontFamily: isCurrent ? font.semibold : font.medium,
                          fontSize: 11,
                          color: isCurrent ? colors.primary : isPassed ? colors.text : colors.textFaint,
                          marginTop: 4,
                          textAlign: 'center',
                        }}
                        numberOfLines={1}
                      >
                        {step.short}
                      </Text>
                    </Pressable>

                    {/* Connecting Line between steps */}
                    {idx < STEPS.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          {
                            backgroundColor: isPassed ? colors.primary : colors.border,
                            borderStyle: isPassed ? 'solid' : 'dashed',
                          },
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          {/* Scrollable Step Question Body */}
          <ScrollView contentContainerStyle={styles.stepBody} showsVerticalScrollIndicator={false}>
            {/* Step 1: Aspect & Framing */}
            {currentStep === 1 && (
              <View style={[styles.questionCard, { borderColor: colors.border }]}>
                <View style={styles.questionHeader}>
                  <View style={[styles.questionIconBadge, { backgroundColor: colors.primarySoft }]}>
                    <Icon name="video" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="h3" style={{ fontSize: 15, fontWeight: '700' }}>
                      Choose your video framing & target aspect ratio
                    </T>
                    <T variant="small" muted>
                      Select how your video will be framed across social platforms.
                    </T>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {/* Swatch Grid */}
                <View style={styles.swatchGrid}>
                  {[
                    {
                      id: '9:16',
                      label: '9:16 Vertical',
                      desc: 'Instagram Reels, TikTok, YouTube Shorts',
                      recommended: true,
                      ratioW: 24,
                      ratioH: 42,
                    },
                    {
                      id: '1:1',
                      label: '1:1 Square',
                      desc: 'LinkedIn & Instagram Feed square clips',
                      recommended: false,
                      ratioW: 32,
                      ratioH: 32,
                    },
                    {
                      id: '16:9',
                      label: '16:9 Landscape',
                      desc: 'Standard widescreen for YouTube desktop & web',
                      recommended: false,
                      ratioW: 42,
                      ratioH: 24,
                    },
                    {
                      id: '4:5',
                      label: '4:5 Portrait',
                      desc: 'High-converting Facebook & Insta portrait feed',
                      recommended: false,
                      ratioW: 28,
                      ratioH: 35,
                    },
                  ].map((opt) => {
                    const selected = config.aspectRatio === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => setConfig({ ...config, aspectRatio: opt.id as any })}
                        style={({ pressed, hovered }: any) => [
                          styles.swatchTile,
                          {
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? 'rgba(255, 90, 31, 0.04)' : '#FFFFFF',
                          },
                          hovered && !selected && { borderColor: colors.borderLight, backgroundColor: colors.surfaceAlt },
                          pressed && { opacity: 0.9 },
                          Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                        ]}
                      >
                        {opt.recommended && (
                          <View style={styles.recommendedBadge}>
                            <Badge label="Recommended" tone="info" />
                          </View>
                        )}
                        {/* Mockup Frame */}
                        <View style={styles.aspectFrameWrapper}>
                          <View
                            style={[
                              styles.aspectFrame,
                              {
                                width: opt.ratioW,
                                height: opt.ratioH,
                                borderColor: selected ? colors.primary : colors.textMuted,
                                backgroundColor: selected ? 'rgba(255, 90, 31, 0.15)' : '#F1F5F9',
                              },
                            ]}
                          >
                            <Icon name="video" size={12} color={selected ? colors.primary : colors.textMuted} />
                          </View>
                        </View>
                        <View style={{ alignItems: 'center', gap: 2 }}>
                          <T variant="body" style={{ fontWeight: selected ? '700' : '600', fontSize: 13, color: selected ? colors.primary : colors.text }}>
                            {opt.label}
                          </T>
                          <T variant="small" muted style={{ textAlign: 'center', fontSize: 11 }}>
                            {opt.desc}
                          </T>
                        </View>
                        {selected && (
                          <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                            <Icon name="check" size={11} color="#FFFFFF" />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Step 2: Caption Style */}
            {currentStep === 2 && (
              <View style={[styles.questionCard, { borderColor: colors.border }]}>
                <View style={styles.questionHeader}>
                  <View style={[styles.questionIconBadge, { backgroundColor: colors.primarySoft }]}>
                    <Icon name="type" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="h3" style={{ fontSize: 15, fontWeight: '700' }}>
                      Select your animated subtitle style
                    </T>
                    <T variant="small" muted>
                      High-retention captions with automatic word-level highlighting and emojis.
                    </T>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {/* Caption Visual Swatch Grid */}
                <View style={styles.swatchGrid}>
                  {[
                    {
                      id: 'karaoke',
                      label: 'Karaoke Highlights',
                      desc: 'Word-by-word yellow glow pop over dark backdrop',
                      recommended: true,
                      sampleWord1: 'INCREDIBLE',
                      sampleWord2: 'RESULTS',
                      highlightWord: 'TODAY',
                      sampleColor: '#FACC15',
                      bgTone: '#1E293B',
                    },
                    {
                      id: 'hormozi',
                      label: 'Bold Punch',
                      desc: 'All-caps heavy typography, bright green impact pop',
                      recommended: false,
                      sampleWord1: 'SCALE',
                      sampleWord2: 'YOUR',
                      highlightWord: 'REVENUE',
                      sampleColor: '#10B981',
                      bgTone: '#0F172A',
                    },
                    {
                      id: 'minimal',
                      label: 'Minimal Clean',
                      desc: 'Understated sans-serif text with soft drop shadow',
                      recommended: false,
                      sampleWord1: 'Precision',
                      sampleWord2: 'editing',
                      highlightWord: 'workflow',
                      sampleColor: '#FFFFFF',
                      bgTone: '#334155',
                    },
                    {
                      id: 'cyberpunk',
                      label: 'Cyberpunk Glow',
                      desc: 'Electric cyan neon with monospace typewriter motion',
                      recommended: false,
                      sampleWord1: 'AUTO',
                      sampleWord2: 'RENDER',
                      highlightWord: 'PIPELINE',
                      sampleColor: '#06B6D4',
                      bgTone: '#020617',
                    },
                  ].map((style) => {
                    const selected = config.captionStyle === style.id;
                    return (
                      <Pressable
                        key={style.id}
                        onPress={() => setConfig({ ...config, captionStyle: style.id as any })}
                        style={({ pressed, hovered }: any) => [
                          styles.swatchTile,
                          {
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? 'rgba(255, 90, 31, 0.04)' : '#FFFFFF',
                          },
                          hovered && !selected && { borderColor: colors.borderLight, backgroundColor: colors.surfaceAlt },
                          pressed && { opacity: 0.9 },
                          Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                        ]}
                      >
                        {style.recommended && (
                          <View style={styles.recommendedBadge}>
                            <Badge label="Recommended" tone="info" />
                          </View>
                        )}
                        {/* Mini Video Preview Mockup */}
                        <View style={[styles.captionMockup, { backgroundColor: style.bgTone }]}>
                          <View style={styles.captionSpeakerAvatar} />
                          <View style={styles.captionRow}>
                            <Text style={styles.captionNormalText}>{style.sampleWord1} </Text>
                            <Text style={[styles.captionHighlightText, { color: style.sampleColor }]}>
                              {style.highlightWord}
                            </Text>
                          </View>
                        </View>

                        <View style={{ alignItems: 'center', gap: 2 }}>
                          <T variant="body" style={{ fontWeight: selected ? '700' : '600', fontSize: 13, color: selected ? colors.primary : colors.text }}>
                            {style.label}
                          </T>
                          <T variant="small" muted style={{ textAlign: 'center', fontSize: 11 }}>
                            {style.desc}
                          </T>
                        </View>

                        {selected && (
                          <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                            <Icon name="check" size={11} color="#FFFFFF" />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Step 3: Brand Kit */}
            {currentStep === 3 && (
              <View style={[styles.questionCard, { borderColor: colors.border }]}>
                <View style={styles.questionHeader}>
                  <View style={[styles.questionIconBadge, { backgroundColor: colors.primarySoft }]}>
                    <Icon name="sparkles" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="h3" style={{ fontSize: 15, fontWeight: '700' }}>
                      Define your brand colors & watermark
                    </T>
                    <T variant="small" muted>
                      Every clip is automatically color-graded and branded with your social handle.
                    </T>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {/* Color Palette Selector */}
                <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
                  <T variant="label" style={{ fontWeight: '600', color: colors.text }}>
                    Brand Palette Presets
                  </T>
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    {[
                      { name: 'AILO Orange', primary: '#FF5A1F', accent: '#FF5A1F' },
                      { name: 'Emerald Peak', primary: '#059669', accent: '#10B981' },
                      { name: 'Midnight Navy', primary: '#1E293B', accent: '#3B82F6' },
                      { name: 'Crimson Surge', primary: '#E11D48', accent: '#F59E0B' },
                    ].map((pal) => {
                      const isChosen = config.brandColor === pal.primary;
                      return (
                        <Pressable
                          key={pal.name}
                          onPress={() => setConfig({ ...config, brandColor: pal.primary, brandAccent: pal.accent })}
                          style={({ pressed }: any) => [
                            styles.palettePill,
                            {
                              borderColor: isChosen ? colors.primary : colors.border,
                              backgroundColor: isChosen ? 'rgba(255, 90, 31, 0.08)' : '#FFFFFF',
                            },
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                            <View style={[styles.colorDot, { backgroundColor: pal.primary }]} />
                            <View style={[styles.colorDot, { backgroundColor: pal.accent }]} />
                            <Text style={{ fontFamily: font.medium, fontSize: 12, color: colors.text }}>
                              {pal.name}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Watermark Section */}
                <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <T variant="label" style={{ fontWeight: '600', color: colors.text }}>
                      Overlay Watermark / Handle
                    </T>
                    <Switch
                      value={config.showWatermark}
                      onValueChange={(val) => setConfig({ ...config, showWatermark: val })}
                      trackColor={{ false: '#CBD5E1', true: colors.primary }}
                    />
                  </View>
                  {config.showWatermark && (
                    <TextInput
                      value={config.watermark}
                      onChangeText={(val) => setConfig({ ...config, watermark: val })}
                      placeholder="@yourhandle"
                      style={[styles.textInput, { borderColor: colors.border, color: colors.text }]}
                    />
                  )}
                </View>
              </View>
            )}

            {/* Step 4: AI & Retention */}
            {currentStep === 4 && (
              <View style={[styles.questionCard, { borderColor: colors.border }]}>
                <View style={styles.questionHeader}>
                  <View style={[styles.questionIconBadge, { backgroundColor: colors.primarySoft }]}>
                    <Icon name="zap" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="h3" style={{ fontSize: 15, fontWeight: '700' }}>
                      Automated sound design & retention cues
                    </T>
                    <T variant="small" muted>
                      Boost viewer watch time with automated punch zooms, tactile sound effects, and silence cutting.
                    </T>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={{ gap: spacing.md }}>
                  {/* Punch Zooms Toggle */}
                  <View style={styles.featureRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" style={{ fontWeight: '600' }}>
                        Dynamic Punch Zooms
                      </T>
                      <T variant="small" muted>
                        Auto-zoom (1.12x) on hook words, topic shifts, and key emotional beats.
                      </T>
                    </View>
                    <Switch
                      value={config.autoPunchZoom}
                      onValueChange={(val) => setConfig({ ...config, autoPunchZoom: val })}
                      trackColor={{ false: '#CBD5E1', true: colors.primary }}
                    />
                  </View>

                  {/* SFX Toggle */}
                  <View style={styles.featureRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" style={{ fontWeight: '600' }}>
                        Auto Foley & SFX Transitions
                      </T>
                      <T variant="small" muted>
                        Subtle whooshes, tape stops, and camera click sounds synced to cuts.
                      </T>
                    </View>
                    <Switch
                      value={config.autoSFX}
                      onValueChange={(val) => setConfig({ ...config, autoSFX: val })}
                      trackColor={{ false: '#CBD5E1', true: colors.primary }}
                    />
                  </View>

                  {/* Cut Filler Words */}
                  <View style={styles.featureRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" style={{ fontWeight: '600' }}>
                        Dead Air & Filler Word Removal
                      </T>
                      <T variant="small" muted>
                        Eliminate filler words and silent pauses longer than 450ms automatically.
                      </T>
                    </View>
                    <Switch
                      value={config.cutFillerWords}
                      onValueChange={(val) => setConfig({ ...config, cutFillerWords: val })}
                      trackColor={{ false: '#CBD5E1', true: colors.primary }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Step 5: Review & Complete */}
            {currentStep === 5 && (
              <View style={[styles.questionCard, { borderColor: colors.border }]}>
                <View style={styles.questionHeader}>
                  <View style={[styles.questionIconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                    <Icon name="check-circle" size={18} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="h3" style={{ fontSize: 15, fontWeight: '700' }}>
                      Ready to launch with your custom template
                    </T>
                    <T variant="small" muted>
                      Review your configuration below. This template will be applied to all your generated clips.
                    </T>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {/* Summary Table */}
                <View style={{ gap: spacing.sm }}>
                  <View style={styles.summaryItem}>
                    <T variant="small" muted>
                      Framing & Aspect:
                    </T>
                    <Badge label={config.aspectRatio} tone="info" />
                  </View>
                  <View style={styles.summaryItem}>
                    <T variant="small" muted>
                      Caption Style:
                    </T>
                    <Badge label={config.captionStyle.toUpperCase()} tone="neutral" />
                  </View>
                  <View style={styles.summaryItem}>
                    <T variant="small" muted>
                      Brand Colors:
                    </T>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <View style={[styles.colorDot, { backgroundColor: config.brandColor }]} />
                      <View style={[styles.colorDot, { backgroundColor: config.brandAccent }]} />
                    </View>
                  </View>
                  <View style={styles.summaryItem}>
                    <T variant="small" muted>
                      Watermark:
                    </T>
                    <T variant="small" style={{ fontWeight: '600' }}>
                      {config.showWatermark ? config.watermark : 'None'}
                    </T>
                  </View>
                  <View style={styles.summaryItem}>
                    <T variant="small" muted>
                      Smart Retention:
                    </T>
                    <T variant="small" style={{ fontWeight: '600' }}>
                      {config.autoPunchZoom ? 'Zooms ✓' : ''} {config.autoSFX ? 'SFX ✓' : ''}{' '}
                      {config.cutFillerWords ? 'No Fillers ✓' : ''}
                    </T>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Fixed Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            {/* Back Button */}
            <Pressable
              disabled={currentStep === 1}
              onPress={handleBack}
              style={({ pressed }: any) => [
                styles.ghostBtn,
                currentStep === 1 && { opacity: 0.3 },
                pressed && { opacity: 0.8 },
                Platform.OS === 'web' && ({ cursor: currentStep === 1 ? 'not-allowed' : 'pointer' } as any),
              ]}
            >
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.textMuted }}>
                Back
              </Text>
            </Pressable>

            {/* Right Buttons: Skip & Continue/Complete */}
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {!isFinalStep && (
                <Pressable
                  onPress={handleNext}
                  style={({ pressed }: any) => [
                    styles.ghostBtn,
                    pressed && { opacity: 0.8 },
                    Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                  ]}
                >
                  <Text style={{ fontFamily: font.medium, fontSize: 13, color: colors.textMuted }}>
                    Skip
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={handleNext}
                style={({ pressed, hovered }: any) => [
                  styles.primaryPillBtn,
                  { backgroundColor: hovered ? colors.primaryPressed : colors.primary },
                  pressed && { opacity: 0.9 },
                  Platform.OS === 'web' && ({
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(255, 90, 31, 0.3)',
                  } as any),
                ]}
              >
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: '#FFFFFF' }}>
                  {isFinalStep ? 'Complete Setup' : 'Continue'}
                </Text>
                <Icon name={isFinalStep ? 'check' : 'arrow-right'} size={15} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Discard Confirmation Dialog */}
        {showDiscardConfirm && (
          <View style={styles.confirmBackdrop}>
            <View style={[styles.confirmDialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.questionIconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Icon name="alert-triangle" size={20} color="#EF4444" />
              </View>
              <T variant="h3" style={{ fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                Discard setup?
              </T>
              <T variant="small" muted style={{ textAlign: 'center', lineHeight: 18 }}>
                Are you sure you want to discard your changes? Your template progress will not be saved.
              </T>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.sm, width: '100%' }}>
                <Pressable
                  onPress={() => setShowDiscardConfirm(false)}
                  style={[styles.dialogBtn, { borderColor: colors.border, backgroundColor: '#FFFFFF' }]}
                >
                  <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text }}>
                    Keep editing
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmDiscard}
                  style={[styles.dialogBtn, { backgroundColor: '#1E293B', borderColor: '#1E293B' }]}
                >
                  <Text style={{ fontFamily: font.semibold, fontSize: 13, color: '#FFFFFF' }}>
                    Discard
                  </Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '90%',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'column',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      } as any,
    }),
  },
  modalHeader: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepNodeContainer: {
    alignItems: 'center',
    width: 64,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  stepBody: {
    padding: spacing.xl,
  },
  questionCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  questionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: spacing.lg,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatchTile: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    minHeight: 140,
    justifyContent: 'center',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  aspectFrameWrapper: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aspectFrame: {
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionMockup: {
    width: '100%',
    height: 52,
    borderRadius: radius.sm,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 4,
  },
  captionSpeakerAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  captionNormalText: {
    fontFamily: font.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  captionHighlightText: {
    fontFamily: font.bold,
    fontSize: 12,
  },
  palettePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: font.regular,
    marginTop: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  modalFooter: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      web: {
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)',
      } as any,
    }),
  },
  ghostBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  primaryPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 99,
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
      } as any,
    }),
  },
  dialogBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
