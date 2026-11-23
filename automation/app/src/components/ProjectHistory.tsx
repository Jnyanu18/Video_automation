import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from './Icon';
import { Badge, T } from './ui';
import { VideoPlayer } from './VideoPlayer';
import { editor } from '../api/editor';
import { font, radius, spacing, useTheme } from '../theme';

export type FilmCategory = 'all' | 'motion_graphics' | 'hybrid' | 'ai_editing';

export interface FilmProject {
  id: string;
  number: string; // e.g. "01 / BRAND STORY"
  graphicTitle: string; // e.g. "SIGNAL\n/ NOISE"
  tagline: string; // e.g. "MAKE YOURSELF HEARD."
  title: string; // e.g. "Signal / Noise"
  category: 'motion_graphics' | 'hybrid' | 'ai_editing';
  format: string; // e.g. "Brand teaser • Vertical"
  status: 'SAVED' | 'IN REVIEW' | 'READY' | 'DRAFT';
  videoUrl?: string;
  duration?: string;
  gradientStart: string;
  gradientEnd: string;
  accentColor?: string;
  storyboardId?: string;
}

interface ProjectHistoryProps {
  customFilms?: FilmProject[];
  onCreateFilm?: () => void;
}

export function ProjectHistory({ customFilms, onCreateFilm }: ProjectHistoryProps) {
  const router = useRouter();
  const { colors } = useTheme();

  // Active Filter Builder: 'all' | 'motion_graphics' | 'hybrid' | 'ai_editing'
  const [activeFilter, setActiveFilter] = useState<FilmCategory>('all');
  const [dbFilms, setDbFilms] = useState<FilmProject[]>([]);

  // Video Preview Modal State
  const [selectedFilm, setSelectedFilm] = useState<FilmProject | null>(null);

  useEffect(() => {
    let mounted = true;
    editor.creativeLibrary()
      .then((films) => {
        if (mounted && Array.isArray(films)) {
          setDbFilms(films);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const filmsList = customFilms ?? dbFilms;

  // Filter films based on selected builder
  const filteredFilms = filmsList.filter((film) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'motion_graphics') return film.category === 'motion_graphics';
    if (activeFilter === 'hybrid') return film.category === 'hybrid';
    if (activeFilter === 'ai_editing') return film.category === 'ai_editing';
    return true;
  });

  return (
    <View style={styles.sectionRoot}>
      {/* =========================================================================
          1. HEADER & BREADCRUMB (Matching Reference Image)
          ========================================================================= */}
      <View style={styles.headerBlock}>
        {/* Breadcrumb line */}
        <View style={styles.breadcrumbRow}>
          <Text style={styles.breadcrumbText}>YOUR STUDIO</Text>
          <Text style={styles.breadcrumbDivider}>/</Text>
          <Text style={[styles.breadcrumbText, { color: '#E2E8F0', fontWeight: '700' }]}>
            MY FILMS
          </Text>
        </View>

        {/* Accent Kicker with Dot */}
        <View style={styles.kickerRow}>
          <View style={styles.kickerDot} />
          <Text style={styles.kickerText}>YOUR CREATIVE LIBRARY</Text>
        </View>

        {/* Big Display Headline */}
        <Text style={styles.displayHeadline}>Stories in the making.</Text>

        {/* Editorial Subtitle */}
        <Text style={styles.displaySubtitle}>
          Keep every idea, concept and finished film together in one place.
        </Text>
      </View>

      {/* =========================================================================
          2. FILTER BUILDERS & ACTION BAR
          [X films • Your creative space]  [All] [Motion Graphics] [AI + Motion] [AI Editing]  [+ Create a film]
          ========================================================================= */}
      <View style={styles.toolbarRow}>
        {/* Left: Count & Segregation Filter Tabs */}
        <View style={styles.toolbarLeft}>
          <Text style={styles.filmsCountBadge}>
            <Text style={{ fontWeight: '800', color: '#F1F5F9' }}>{filteredFilms.length} films</Text>
            <Text style={{ color: '#64748B' }}> • Your creative space</Text>
          </Text>

          {/* Builder Tabs */}
          <View style={styles.filterTabsPillBox}>
            {[
              { id: 'all', label: 'All' },
              { id: 'motion_graphics', label: 'Motion Graphics' },
              { id: 'hybrid', label: 'AI Editing + Motion Graphics' },
              { id: 'ai_editing', label: 'AI Editing' },
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveFilter(tab.id as FilmCategory)}
                  style={[styles.filterTabPill, isActive && styles.filterTabPillActive]}
                >
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Right: + Create a film Button */}
        <Pressable
          style={({ pressed }: any) => [
            styles.createFilmBtn,
            pressed && { opacity: 0.9 },
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
          onPress={() => (onCreateFilm ? onCreateFilm() : router.push('/new'))}
        >
          <Icon name="plus" size={15} color="#FFFFFF" />
          <Text style={styles.createFilmBtnText}>+ Create a film</Text>
        </Pressable>
      </View>

      {/* =========================================================================
          3. CINEMATIC FILM CARDS GRID (3 Columns Matching Reference)
          ========================================================================= */}
      <View style={styles.filmsGrid}>
        {filteredFilms.length === 0 && (
          <Text style={{ color: colors.textMuted, padding: spacing.xl }}>
            No films here yet. Create a film to start your library.
          </Text>
        )}
        {filteredFilms.map((film, index) => {
          return (
            <View key={film.id} style={styles.cardWrapper}>
              {/* Cinematic Card Frame */}
              <Pressable
                onPress={() => setSelectedFilm(film)}
                style={({ pressed, hovered }: any) => [
                  styles.cinematicCardSurface,
                  {
                    backgroundColor: film.gradientStart,
                    borderColor: hovered ? (film.accentColor || '#6C4CF0') : '#232936',
                  },
                  hovered && styles.cinematicCardHovered,
                  pressed && { opacity: 0.95 },
                  Platform.OS === 'web' && ({
                    cursor: 'pointer',
                    background: `linear-gradient(135deg, ${film.gradientStart} 0%, ${film.gradientEnd} 100%)`,
                  } as any),
                ]}
              >
                {/* Top Kicker (e.g. 01 / BRAND STORY) */}
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardKickerText}>{film.number}</Text>
                  {film.duration && (
                    <Text style={styles.cardDurationText}>{film.duration}</Text>
                  )}
                </View>

                {/* Center Bold Editorial Headline */}
                <View style={styles.cardCenterTitleBox}>
                  <Text style={styles.cardGraphicTitle}>{film.graphicTitle}</Text>
                </View>

                {/* Bottom Motto Inside Card */}
                <View style={styles.cardBottomRow}>
                  <Text style={styles.cardTaglineText}>{film.tagline}</Text>
                </View>

                {/* Hover Play Button Overlay */}
                <View style={styles.cardPlayOverlay}>
                  <View style={styles.playIconCircle}>
                    <Icon name="play" size={16} color="#FFFFFF" />
                  </View>
                </View>
              </Pressable>

              {/* Card Meta Row Below Card Frame */}
              <View style={styles.cardMetaRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{film.title}</Text>
                  <Text style={styles.cardFormatSubtitle}>{film.format}</Text>
                </View>

                <View style={styles.cardStatusCol}>
                  <Text
                    style={[
                      styles.cardStatusBadge,
                      film.status === 'SAVED' && { color: '#94A3B8' },
                      film.status === 'IN REVIEW' && { color: '#FBBF24' },
                      film.status === 'READY' && { color: '#34D399' },
                    ]}
                  >
                    {film.status}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* =========================================================================
          4. VIDEO PREVIEW PLAYER MODAL
          ========================================================================= */}
      {selectedFilm && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              {/* Modal Top Bar */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalKicker}>{selectedFilm.number}</Text>
                  <Text style={styles.modalTitle}>{selectedFilm.title}</Text>
                  <Text style={styles.modalFormat}>{selectedFilm.format}</Text>
                </View>
                <Pressable
                  onPress={() => setSelectedFilm(null)}
                  style={styles.modalCloseBtn}
                  hitSlop={8}
                >
                  <Icon name="x" size={20} color="#94A3B8" />
                </Pressable>
              </View>

              {/* Video Player */}
              <View style={styles.videoPlayerContainer}>
                {selectedFilm.videoUrl ? (
                  <VideoPlayer uri={selectedFilm.videoUrl} />
                ) : (
                  <View style={styles.placeholderPlayer}>
                    <Icon name="film" size={48} color="#6C4CF0" />
                    <Text style={{ color: '#E2E8F0', marginTop: 12, fontWeight: '700' }}>
                      Ready to Render Video
                    </Text>
                    <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>
                      Open in Timeline Editor to preview frames
                    </Text>
                  </View>
                )}
              </View>

              {/* Modal Actions */}
              <View style={styles.modalActionsRow}>
                <Pressable
                  style={styles.modalTimelineBtn}
                  onPress={() => {
                    setSelectedFilm(null);
                    router.push('/timeline');
                  }}
                >
                  <Icon name="sliders" size={15} color="#FFFFFF" />
                  <Text style={styles.modalTimelineBtnText}>Open in Timeline Editor</Text>
                </Pressable>

                <Pressable
                  style={styles.modalStoryboardBtn}
                  onPress={() => {
                    setSelectedFilm(null);
                    router.push('/storyboard');
                  }}
                >
                  <Icon name="layers" size={15} color="#374151" />
                  <Text style={styles.modalStoryboardBtnText}>Storyboard View</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionRoot: {
    width: '100%',
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },

  /* 1. Header */
  headerBlock: {
    gap: 8,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breadcrumbText: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: font.mono,
    color: '#64748B',
    fontWeight: '600',
  },
  breadcrumbDivider: {
    fontSize: 10,
    color: '#475569',
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  kickerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF5A1F',
  },
  kickerText: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontFamily: font.mono,
    fontWeight: '700',
    color: '#FF5A1F',
  },
  displayHeadline: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  displaySubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    maxWidth: 620,
  },

  /* 2. Toolbar & Segregation Filter Tabs */
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
  },
  filmsCountBadge: {
    fontSize: 12,
    fontFamily: font.mono,
  },
  filterTabsPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    padding: 3,
    borderRadius: radius.pill,
    gap: 2,
  },
  filterTabPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  filterTabPillActive: {
    backgroundColor: '#0F172A',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  createFilmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF5A1F',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  createFilmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* 3. Cinematic Film Cards Grid */
  filmsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 6,
  },
  cardWrapper: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 280,
    gap: 8,
  },
  cinematicCardSurface: {
    aspectRatio: 16 / 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E2333',
    padding: 16,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  cinematicCardHovered: {
    transform: [{ translateY: -3 }],
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardKickerText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: font.mono,
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 1.4,
  },
  cardDurationText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: font.mono,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  cardCenterTitleBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  cardGraphicTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    lineHeight: 26,
    textTransform: 'uppercase',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTaglineText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: font.mono,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 1.5,
  },
  cardPlayOverlay: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  playIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Meta Below Card */
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardFormatSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  cardStatusCol: {
    alignItems: 'flex-end',
  },
  cardStatusBadge: {
    fontSize: 10,
    fontFamily: font.mono,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  /* 4. Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#0F172A',
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalKicker: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: font.mono,
    color: '#FF5A1F',
    letterSpacing: 1.2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  modalFormat: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  videoPlayerContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 460,
    backgroundColor: '#000000',
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderPlayer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalTimelineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6C4CF0',
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  modalTimelineBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalStoryboardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E2E8F0',
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  modalStoryboardBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
});
