import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Image, Pressable } from 'react-native';
import { Page, Row } from '../../components/Page';
import { Button, Card, T, SectionTitle } from '../../components/ui';
import { spacing, useTheme } from '../../theme';

const DEMO_IMAGES = [
  { id: 1, url: 'https://images.unsplash.com/photo-1611339555312-e607c90352fd?w=300&h=300&fit=crop', alt: 'Generated reel 1' },
  { id: 2, url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=300&h=300&fit=crop', alt: 'Generated reel 2' },
  { id: 3, url: 'https://images.unsplash.com/photo-1617638924702-92f37fcb0f6e?w=300&h=300&fit=crop', alt: 'Generated reel 3' },
  { id: 4, url: 'https://images.unsplash.com/photo-1633356360233-55a3a827b1a0?w=300&h=300&fit=crop', alt: 'Generated reel 4' },
  { id: 5, url: 'https://images.unsplash.com/photo-1534169529454-37c5c5eb8872?w=300&h=300&fit=crop', alt: 'Generated reel 5' },
  { id: 6, url: 'https://images.unsplash.com/photo-1626914418145-dae8d9bfaedd?w=300&h=300&fit=crop', alt: 'Generated reel 6' },
];

const DIRECTIONS = [
  { id: 'brand-launch', label: 'Brand Launch', icon: '🚀', desc: 'Cinematic brand reveal' },
  { id: 'event-summary', label: 'Event Summary', icon: '📸', desc: 'Highlight reel' },
  { id: 'product-demo', label: 'Product Demo', icon: '🎯', desc: 'Feature showcase' },
  { id: 'testimonial', label: 'Testimonial', icon: '💬', desc: 'Client feedback' },
  { id: 'behind-scenes', label: 'Behind Scenes', icon: '🎬', desc: 'BTS storytelling' },
];

const WORKFLOWS = [
  { id: 'motion', label: 'Motion Graphics', desc: 'Animated graphics & text' },
  { id: 'video-edit', label: 'Video Editing', desc: 'Footage cutting & color' },
  { id: 'both', label: 'Motion + Video', desc: 'Complete video production' },
];

export default function ClientDemo() {
  const { colors } = useTheme();
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  return (
    <Page title="AI Video Studio" subtitle="Create professional reels in minutes">
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>

        {/* Generated Reels Gallery */}
        <SectionTitle title="Recently Generated Reels" />
        <View style={styles.gallery}>
          {DEMO_IMAGES.map((img) => (
            <Pressable key={img.id} style={[styles.galleryItem, { borderColor: colors.border }]}>
              <Image source={{ uri: img.url }} style={styles.galleryImage} />
              <View style={[styles.playButton, { backgroundColor: colors.primary }]}>
                <T style={{ fontSize: 24 }}>▶</T>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Timeline */}
        <SectionTitle title="Production Timeline" />
        <View style={[styles.timeline, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <TimelineStep label="Upload" icon="📤" completed active={!selectedWorkflow} colors={colors} />
          <TimelineStep label="Configure" icon="⚙️" completed={!!selectedWorkflow} active={!!selectedWorkflow && !selectedDirection} colors={colors} />
          <TimelineStep label="Generate" icon="✨" completed={!!selectedDirection} active={false} colors={colors} />
          <TimelineStep label="Review" icon="👁️" completed={false} active={false} colors={colors} />
        </View>

        {/* Workflow Selection */}
        <SectionTitle title="Choose Your Service" />
        <View style={styles.workflowGrid}>
          {WORKFLOWS.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => setSelectedWorkflow(w.id)}
              style={[
                styles.workflowCard,
                { borderColor: selectedWorkflow === w.id ? colors.primary : colors.border, borderWidth: selectedWorkflow === w.id ? 2 : 1 },
                { backgroundColor: selectedWorkflow === w.id ? colors.primarySoft : colors.surface },
              ]}
            >
              <T variant="h3" style={{ color: selectedWorkflow === w.id ? colors.primary : colors.text }}>
                {w.label}
              </T>
              <T muted style={{ fontSize: 12 }}>{w.desc}</T>
            </Pressable>
          ))}
        </View>

        {selectedWorkflow && (
          <>
            {/* Direction Selection */}
            <SectionTitle title="Choose Direction" />
            <View style={styles.directionGrid}>
              {DIRECTIONS.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => setSelectedDirection(d.id)}
                  style={[
                    styles.directionCard,
                    { borderColor: selectedDirection === d.id ? colors.primary : colors.border },
                    { backgroundColor: selectedDirection === d.id ? colors.primarySoft : colors.surface },
                  ]}
                >
                  <T style={{ fontSize: 32 }}>{d.icon}</T>
                  <T variant="label" style={{ color: selectedDirection === d.id ? colors.primary : colors.text }}>
                    {d.label}
                  </T>
                  <T muted style={{ fontSize: 11 }}>{d.desc}</T>
                </Pressable>
              ))}
            </View>

            {/* Upload Section */}
            <SectionTitle title="Upload Content" />
            <Card style={[styles.uploadCard, { borderColor: colors.border, borderWidth: 2, borderStyle: 'dashed' }]}>
              <View style={styles.uploadContent}>
                <T style={{ fontSize: 48 }}>📹</T>
                <T variant="h3">Drop your video here</T>
                <T muted>or tap to browse</T>
                <T muted style={{ fontSize: 11, marginTop: spacing.sm }}>
                  Supports MP4, MOV, WebM • Up to 1GB
                </T>
              </View>
            </Card>

            {/* Audio Upload */}
            <Card style={[styles.audioCard, { backgroundColor: colors.surfaceAlt }]}>
              <Row>
                <T style={{ fontSize: 32 }}>🎵</T>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <T variant="label">Add Audio/Music</T>
                  <T muted style={{ fontSize: 12 }}>Optional: Upload custom soundtrack or narration</T>
                </View>
                <Button label="Browse" small variant="secondary" />
              </Row>
            </Card>

            {/* Generate Button */}
            <View style={{ marginTop: spacing.lg }}>
              <Button
                label="Generate Reel"
                variant="primary"
                onPress={() => alert('Starting generation...')}
              />
            </View>
          </>
        )}
      </ScrollView>
    </Page>
  );
}

function TimelineStep({ label, icon, completed, active, colors }: any) {
  return (
    <View style={styles.timelineStepContainer}>
      <View
        style={[
          styles.timelineCircle,
          {
            backgroundColor: completed ? colors.success : active ? colors.primary : colors.border,
            borderColor: completed ? colors.success : active ? colors.primary : colors.textMuted,
          },
        ]}
      >
        <T style={{ fontSize: 16 }}>{icon}</T>
      </View>
      <T variant="label" style={{ marginTop: spacing.sm }}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  galleryItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    top: '50%',
    left: '50%',
    marginLeft: -24,
    marginTop: -24,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.xl,
    minHeight: 120,
  },
  timelineStepContainer: {
    alignItems: 'center',
  },
  timelineCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  workflowGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  workflowCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 100,
  },
  directionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  directionCard: {
    width: '32%',
    aspectRatio: 1.1,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadCard: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderRadius: 12,
  },
  uploadContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  audioCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
});
