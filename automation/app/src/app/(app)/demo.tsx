import React, { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Page, Row } from '../../components/Page';
import { Badge, Button, Card, SectionTitle, T } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useStoryboards } from '../../state/useStoryboards';
import { useToast } from '../../state/toast';
import { font, radius, shadow, spacing, useTheme } from '../../theme';

interface PastReel {
  id: string;
  title: string;
  duration: string;
  style: string;
  aspect: string;
  date: string;
  views?: string;
  thumbnail: string;
  sbId?: string;
}

const DEFAULT_PAST_REELS: PastReel[] = [
  {
    id: '1',
    title: 'Why Cursor AI is Taking Over Software Development',
    duration: '42s',
    style: 'Viral Hook Fast Pace',
    aspect: '9:16',
    date: 'Today, 10:14 AM',
    views: '+18.4k',
    thumbnail: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=600&h=1066&fit=crop',
    sbId: 'sb1',
  },
  {
    id: '2',
    title: '3 Growth Loops That Scaled Our SaaS to $100k MRR',
    duration: '56s',
    style: 'Karaoke Highlights',
    aspect: '9:16',
    date: 'Yesterday, 4:30 PM',
    views: '+24.1k',
    thumbnail: 'https://images.unsplash.com/photo-1611339555312-e607c90352fd?w=600&h=1066&fit=crop',
  },
  {
    id: '3',
    title: 'How Autonomous AI Agents Build Production Apps',
    duration: '38s',
    style: 'Cyberpunk Glow',
    aspect: '9:16',
    date: 'Nov 20, 2:15 PM',
    views: '+9.8k',
    thumbnail: 'https://images.unsplash.com/photo-1617638924702-92f37fcb0f6e?w=600&h=1066&fit=crop',
  },
  {
    id: '4',
    title: 'Behind The Scenes: Video Automation Rendering Pipeline',
    duration: '49s',
    style: 'Cinematic Punch',
    aspect: '9:16',
    date: 'Nov 18, 6:00 PM',
    views: '+12.3k',
    thumbnail: 'https://images.unsplash.com/photo-1534169529454-37c5c5eb8872?w=600&h=1066&fit=crop',
  },
];

export default function ClientDemo() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { list: storyboards } = useStoryboards();
  const [filter, setFilter] = useState<'all' | 'vertical' | 'motion'>('all');

  return (
    <Page>
      {/* =========================================================================
          TOP BAR: Title on Left, "+ AI Video Studio" CTA on Top Right
         ========================================================================= */}
      <View style={styles.topHeaderRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="h1" style={{ fontSize: 24, fontWeight: '700' }}>
            Past Work & Generated Reels
          </T>
          <T variant="small" muted>
            Browse, preview, edit in timeline, and download your previous AI-generated social clips.
          </T>
        </View>

        {/* Primary CTA in Top Right */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Launch AI Video Studio"
          onPress={() => router.push('/')}
          style={({ pressed, hovered }: any) => [
            styles.aiStudioTopBtn,
            { backgroundColor: hovered ? colors.primaryPressed : colors.primary },
            pressed && { opacity: 0.9 },
            Platform.OS === 'web' && ({
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(108, 76, 240, 0.35)',
            } as any),
          ]}
        >
          <Icon name="sparkles" size={16} color="#FFFFFF" />
          <Text style={{ fontFamily: font.bold, fontSize: 13, color: '#FFFFFF' }}>
            + AI Video Studio
          </Text>
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { id: 'all', label: 'All Past Work' },
          { id: 'vertical', label: '9:16 Reels & Shorts' },
          { id: 'motion', label: 'Motion Graphics' },
        ].map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setFilter(tab.id as any)}
            style={[
              styles.filterPill,
              {
                borderColor: filter === tab.id ? colors.primary : colors.border,
                backgroundColor: filter === tab.id ? 'rgba(108, 76, 240, 0.08)' : colors.surface,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: filter === tab.id ? font.bold : font.medium,
                fontSize: 12,
                color: filter === tab.id ? colors.primary : colors.textMuted,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* =========================================================================
          PAST WORK GALLERY: Sleek 9:16 Vertical Video Cards
         ========================================================================= */}
      <View style={styles.reelsGrid}>
        {DEFAULT_PAST_REELS.map((reel) => (
          <View
            key={reel.id}
            style={[
              styles.reelCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              shadow(colors),
            ]}
          >
            {/* 9:16 Aspect Ratio Poster */}
            <View style={styles.posterContainer}>
              <Image source={{ uri: reel.thumbnail }} style={styles.posterImage} resizeMode="cover" />

              {/* Gradient Dark Overlay */}
              <View style={styles.posterOverlay}>
                <View style={styles.badgeRow}>
                  <View style={[styles.durationChip, { backgroundColor: 'rgba(0, 0, 0, 0.75)' }]}>
                    <Text style={{ fontFamily: font.mono, fontSize: 10, color: '#FFFFFF' }}>
                      {reel.duration}
                    </Text>
                  </View>
                  {reel.views && (
                    <View style={[styles.viewsChip, { backgroundColor: 'rgba(108, 76, 240, 0.85)' }]}>
                      <Text style={{ fontFamily: font.bold, fontSize: 10, color: '#FFFFFF' }}>
                        {reel.views}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Centered Play Button */}
                <Pressable
                  onPress={() => {
                    if (reel.sbId) router.push(`/timeline?sb=${reel.sbId}` as any);
                    else router.push('/storyboard');
                  }}
                  style={({ pressed, hovered }: any) => [
                    styles.playBtnCircle,
                    { backgroundColor: hovered ? colors.primaryPressed : colors.primary },
                    pressed && { opacity: 0.9 },
                    Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                  ]}
                >
                  <Icon name="play" size={20} color="#FFFFFF" />
                </Pressable>

                <View style={styles.aspectBadge}>
                  <Badge label={reel.aspect} tone="neutral" />
                </View>
              </View>
            </View>

            {/* Reel Details */}
            <View style={styles.cardDetails}>
              <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.text, lineHeight: 18 }} numberOfLines={2}>
                {reel.title}
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <Text style={{ fontFamily: font.medium, fontSize: 11, color: colors.primary }}>
                  {reel.style}
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 10, color: colors.textFaint }}>
                  {reel.date}
                </Text>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.cardActionsRow}>
                <Pressable
                  onPress={() => router.push(reel.sbId ? `/timeline?sb=${reel.sbId}` : '/timeline')}
                  style={({ pressed, hovered }: any) => [
                    styles.actionBtn,
                    { borderColor: colors.border, backgroundColor: hovered ? colors.surfaceAlt : '#FFFFFF' },
                    pressed && { opacity: 0.8 },
                    Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                  ]}
                >
                  <Icon name="sliders" size={13} color={colors.text} />
                  <Text style={{ fontFamily: font.semibold, fontSize: 11, color: colors.text }}>
                    Timeline
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => toast('Exporting full quality master video...')}
                  style={({ pressed, hovered }: any) => [
                    styles.actionBtn,
                    { borderColor: colors.border, backgroundColor: hovered ? colors.surfaceAlt : '#FFFFFF' },
                    pressed && { opacity: 0.8 },
                    Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                  ]}
                >
                  <Icon name="download" size={13} color={colors.text} />
                  <Text style={{ fontFamily: font.semibold, fontSize: 11, color: colors.text }}>
                    Export
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  aiStudioTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  reelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: spacing.sm,
  },
  reelCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    minWidth: 240,
    maxWidth: 420,
  },
  posterContainer: {
    width: '100%',
    aspectRatio: 9 / 12,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
    padding: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  viewsChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  playBtnCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  aspectBadge: {
    alignSelf: 'flex-start',
  },
  cardDetails: {
    padding: 12,
    gap: 4,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
