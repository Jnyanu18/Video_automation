import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from './Icon';
import { VideoPlayer } from './VideoPlayer';
import { editor } from '../api/editor';
import { font, radius, spacing, useTheme } from '../theme';

export type FilmCategory = 'all' | 'motion_graphics' | 'hybrid' | 'ai_editing';

export interface FilmProject {
  id: string;
  number: string;
  graphicTitle: string;
  tagline: string;
  title: string;
  category: 'motion_graphics' | 'hybrid' | 'ai_editing';
  format: string;
  status: 'SAVED' | 'IN REVIEW' | 'READY' | 'DRAFT';
  videoUrl: string;
  thumbnailUrl?: string | null;
  reference_id?: string | null;
  duration: string;
  gradientStart: string;
  gradientEnd: string;
  accentColor: string;
  isLandscape?: boolean;
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
          3. CINEMATIC FILM CARDS GRID (With Real Reel Images!)
          ========================================================================= */}
      <View style={styles.filmsGrid}>
        {filteredFilms.length === 0 && (
          <Text style={{ color: colors.textMuted, padding: spacing.xl }}>
            No films here yet. Create a film to start your library.
          </Text>
        )}
        {filteredFilms.map((film) => {
          return (
            <View key={film.id} style={styles.cardWrapper}>
              {/* Cinematic Card Frame */}
              <Pressable
                onPress={() => setSelectedFilm(film)}
                style={({ pressed, hovered }: any) => [
                  styles.cinematicCardSurface,
                  {
                    borderColor: hovered ? (film.accentColor || '#FF5A1F') : '#232936',
                  },
                  hovered && styles.cinematicCardHovered,
                  pressed && { opacity: 0.95 },
                ]}
              >
                {/* 1. Real Reel Thumbnail Image Background */}
                {film.thumbnailUrl ? (
                  <Image
                    source={{ uri: film.thumbnailUrl }}
                    style={styles.cardBgImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        backgroundColor: film.gradientStart,
                        ...(Platform.OS === 'web'
                          ? {
                              background: `linear-gradient(135deg, ${film.gradientStart} 0%, ${film.gradientEnd} 100%)`,
                            }
                          : {}),
                      },
                    ]}
                  />
                )}

                {/* 2. Cinematic Dark Gradient Vignette for Readability */}
                <View style={styles.cardDarkGradientOverlay} />

                {/* 3. Top Kicker (e.g. 01 / MOTION GRAPHICS) & Duration Pill */}
                <View style={styles.cardTopRow}>
                  <View style={styles.kickerPill}>
                    <Text style={styles.cardKickerText}>{film.number}</Text>
                  </View>
                  <View style={styles.playTopBadge}>
                    <Icon name="play" size={10} color="#FFFFFF" />
                    {film.duration && (
                      <Text style={styles.cardDurationText}>{film.duration}</Text>
                    )}
                  </View>
                </View>

                {/* 4. Center Bold Editorial Headline */}
                <View style={styles.cardCenterTitleBox}>
                  <Text style={styles.cardGraphicTitle}>{film.graphicTitle}</Text>
                </View>

                {/* 5. Bottom Tagline Motto & Hover Play Icon */}
                <View style={styles.cardBottomRow}>
                  <Text style={styles.cardTaglineText}>{film.tagline}</Text>
                  <View style={[styles.playIconCircle, { borderColor: film.accentColor }]}>
                    <Icon name="play" size={15} color="#FFFFFF" />
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
          4. VIDEO PREVIEW PLAYER MODAL (Plays the actual video!)
          ========================================================================= */}
      {selectedFilm && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, selectedFilm.isLandscape && { maxWidth: 660 }]}>
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

              {/* Video Player (Plays actual video file!) */}
              <View style={[styles.videoPlayerContainer, selectedFilm.isLandscape && { aspectRatio: 16 / 9, maxHeight: 380 }]}>
                {selectedFilm.videoUrl ? (
                  <VideoPlayer uri={selectedFilm.videoUrl} isLandscape={selectedFilm.isLandscape} />
                ) : (
                  <View style={styles.placeholderPlayer}>
                    <Icon name="film" size={48} color="#FF5A1F" />
                    <Text style={{ color: '#E2E8F0', marginTop: 12, fontWeight: '700' }}>
                      Ready to Render Video
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
                    router.push({ pathname: '/new', params: { reference: selectedFilm.reference_id || selectedFilm.id } });
                  }}
                >
                  <Icon name="sparkles" size={15} color="#FFFFFF" />
                  <Text style={styles.modalTimelineBtnText}>Use as reference</Text>
                </Pressable>

                <Pressable
                  style={styles.modalStoryboardBtn}
                  onPress={() => {
                    setSelectedFilm(null);
                  }}
                >
                  <Icon name="x" size={15} color="#0F172A" />
                  <Text style={styles.modalStoryboardBtnText}>Close</Text>
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
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
    backgroundColor: '#090D16',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  cinematicCardHovered: {
    transform: [{ translateY: -3 }],
  },
  cardBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  cardDarkGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 7, 12, 0.45)',
    ...Platform.select({
      web: {
        background:
          'linear-gradient(180deg, rgba(5, 8, 14, 0.75) 0%, rgba(5, 8, 14, 0.22) 42%, rgba(5, 8, 14, 0.65) 72%, rgba(5, 8, 14, 0.95) 100%)',
      } as any,
    }),
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  kickerPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(6px)',
      } as any,
    }),
  },
  cardKickerText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: font.mono,
    color: '#F8FAFC',
    letterSpacing: 1.4,
  },
  playTopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(6px)',
      } as any,
    }),
  },
  cardDurationText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: font.mono,
    color: '#FFFFFF',
  },
  cardCenterTitleBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: 8,
    zIndex: 2,
  },
  cardGraphicTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    lineHeight: 26,
    textTransform: 'uppercase',
    ...Platform.select({
      web: {
        textShadow: '0 2px 8px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.95)',
      } as any,
      default: {
        textShadowColor: 'rgba(0,0,0,0.85)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
      },
    }),
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  cardTaglineText: {
    fontSize: 9.5,
    fontWeight: '800',
    fontFamily: font.mono,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1.5,
    ...Platform.select({
      web: {
        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
      } as any,
      default: {
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
    }),
  },
  playIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(6px)',
      } as any,
    }),
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
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
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
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
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
    backgroundColor: '#FF5A1F',
    paddingVertical: 10,
    borderRadius: radius.sm,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
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
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  modalStoryboardBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
});
