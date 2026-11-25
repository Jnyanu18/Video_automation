import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Page } from '../../components/Page';
import { Icon } from '../../components/Icon';
import { T } from '../../components/ui';
import { font, radius, spacing, useTheme } from '../../theme';

const FRAMES = [
  { color: '#162239', label: 'Opening frame', accent: '#FF5A1F' },
  { color: '#263550', label: 'Scene variation', accent: '#F7B267' },
  { color: '#111B30', label: 'Final frame', accent: '#8EA6CB' },
];

export default function VideoGeneration() {
  const { colors } = useTheme();

  return (
    <Page title="AI Video Generation" subtitle="Create original video scenes from an idea or visual reference.">
      <View style={[styles.stage, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.preview, Platform.OS === 'web' ? ({ filter: 'blur(5px)' } as any) : { opacity: 0.28 }]}
        >
          <View style={styles.previewHeading}>
            <View style={{ gap: spacing.xs, flex: 1 }}>
              <T variant="mono" style={{ color: colors.primary, letterSpacing: 1.3 }}>GENERATION STUDIO</T>
              <T style={[styles.previewTitle, { color: colors.text }]}>Turn an idea into a scene.</T>
              <T muted>Describe the look, movement, and mood of your video.</T>
            </View>
            <View style={[styles.previewAction, { backgroundColor: colors.primarySoft }]}>
              <Icon name="sparkles" size={16} color={colors.primary} />
              <T style={{ color: colors.primary, fontWeight: '600' }}>Generate video</T>
            </View>
          </View>

          <View style={styles.workspace}>
            <View style={[styles.promptCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <T variant="label" muted>YOUR SCENE</T>
              <T style={{ fontSize: 16, lineHeight: 24 }}>
                A cinematic product reveal with soft studio light, a slow camera move, and a warm finish.
              </T>
              <View style={styles.chips}>
                {['9:16 Vertical', 'Cinematic', '5 seconds'].map((chip) => (
                  <View key={chip} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <T variant="small" muted>{chip}</T>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.frames}>
              {FRAMES.map((frame) => (
                <View key={frame.label} style={[styles.frameCard, { backgroundColor: frame.color }]}>
                  <View style={[styles.frameGlow, { backgroundColor: frame.accent }]} />
                  <View style={styles.frameSubject} />
                  <T style={styles.frameLabel}>{frame.label}</T>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none">
          <View style={[styles.messageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.messageIcon, { backgroundColor: colors.primarySoft }]}>
              <Icon name="video" size={27} color={colors.primary} />
            </View>
            <T variant="mono" style={{ color: colors.primary, letterSpacing: 1.5 }}>AI VIDEO GENERATION</T>
            <T variant="h1" style={styles.comingSoon}>Coming soon</T>
            <T muted style={styles.messageText}>
              Create video scenes from your ideas and visual references, right inside AILO Editor.
            </T>
          </View>
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  stage: { minHeight: 570, borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden', position: 'relative' },
  preview: { padding: spacing.xl, gap: spacing.xl },
  previewHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.lg },
  previewTitle: { fontFamily: font.bold, fontSize: 27, lineHeight: 34 },
  previewAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  workspace: { gap: spacing.lg },
  promptCard: { borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  frames: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  frameCard: { flexGrow: 1, flexBasis: 180, height: 205, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  frameGlow: { position: 'absolute', width: 105, height: 105, borderRadius: 54, opacity: 0.55 },
  frameSubject: { width: 58, height: 86, borderRadius: radius.md, backgroundColor: '#F4F6FB', transform: [{ rotate: '-14deg' }], opacity: 0.86 },
  frameLabel: { position: 'absolute', bottom: spacing.md, left: spacing.md, color: '#FFFFFF', fontFamily: font.semibold, fontSize: 12 },
  overlay: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(248, 250, 252, 0.34)' },
  messageCard: { width: '100%', maxWidth: 430, alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl, borderRadius: radius.lg, borderWidth: 1, shadowColor: '#0F172A', shadowOpacity: 0.1, shadowRadius: 24, elevation: 8 },
  messageIcon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  comingSoon: { fontSize: 31, lineHeight: 38, textAlign: 'center' },
  messageText: { textAlign: 'center', lineHeight: 21, maxWidth: 320 },
});
