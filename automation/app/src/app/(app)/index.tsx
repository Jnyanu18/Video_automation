import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { BannerAlertSlot } from '../../components/Navigation';
import { TemplateWizardModal, TemplateWizardData } from '../../components/TemplateWizardModal';
import { font, radius, spacing, useTheme } from '../../theme';
import { editor, StoryboardCard } from '../../api/editor';
import { useToast } from '../../state/toast';

interface ProjectItem {
  id: string;
  title: string;
  status: string;
  date: string;
  duration: string;
  thumbnail: string;
  clipsCount: number;
}

const SAMPLE_PROJECTS: ProjectItem[] = [
  {
    id: 'proj-1',
    title: 'How to scale an AI startup in 2026',
    status: 'Ready',
    date: '2 hours ago',
    duration: '42m 15s',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    clipsCount: 6,
  },
  {
    id: 'proj-2',
    title: 'Prompt engineering vs Agent frameworks',
    status: 'Ready',
    date: 'Yesterday',
    duration: '28m 40s',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    clipsCount: 4,
  },
];

const TUTORIALS = [
  {
    id: 'tut-1',
    title: 'Auto-crop face framing for dual podcasts',
    duration: '1m 45s',
    views: '12.4k',
    thumb: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'tut-2',
    title: 'Viral captions: Hook typography & bouncy color pops',
    duration: '2m 10s',
    views: '8.9k',
    thumb: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'tut-3',
    title: 'Repurposing YouTube long-form into TikTok & Shorts',
    duration: '3m 20s',
    views: '15.1k',
    thumb: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=500&auto=format&fit=crop&q=80',
  },
];

const COMMUNITY_SHOWCASE = [
  {
    id: 'comm-1',
    title: 'Y-Combinator pitch breakdown clip',
    creator: 'Madhav Tech',
    views: '+48.2k views',
    thumb: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'comm-2',
    title: 'AI coding assistant benchmarks',
    creator: 'Rockcastle Studio',
    views: '+29.6k views',
    thumb: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'comm-3',
    title: 'SaaS founder weekly revenue retrospective',
    creator: 'GrowthOS Community',
    views: '+18.5k views',
    thumb: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=500&auto=format&fit=crop&q=80',
  },
];

export default function ClipperHome() {
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Card Collapse / Intake State
  const [isCardCollapsed, setIsCardCollapsed] = useState(false);
  const [sourceTab, setSourceTab] = useState<'new' | 'existing'>('new');
  const [videoLink, setVideoLink] = useState('');
  const [linksList, setLinksList] = useState<string[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Template Wizard Modal State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [templateConfig, setTemplateConfig] = useState<TemplateWizardData | null>(null);

  // Real backend projects list
  const [projects, setProjects] = useState<ProjectItem[]>(SAMPLE_PROJECTS);

  const fetchRecentProjects = useCallback(async () => {
    try {
      const resp = await editor.storyboards();
      if (resp && resp.length > 0) {
        const mapped: ProjectItem[] = resp.slice(0, 6).map((sb, idx) => ({
          id: sb.id,
          title: sb.prompt ? sb.prompt.slice(0, 50) : `Project #${idx + 1}`,
          status: sb.status === 'ready' ? 'Ready' : 'Processing',
          date: 'Recent',
          duration: '0:45',
          thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
          clipsCount: 3,
        }));
        setProjects(mapped);
      }
    } catch {
      // Use sample projects as robust fallback
    }
  }, []);

  useEffect(() => {
    fetchRecentProjects();
  }, [fetchRecentProjects]);

  const handleAddLink = () => {
    if (videoLink.trim()) {
      setLinksList([...linksList, videoLink.trim()]);
      setVideoLink('');
      toast('Link added to intake queue');
    }
  };

  const handleFilePicked = (event: any) => {
    if (Platform.OS === 'web') {
      const file = event.target?.files?.[0];
      if (file) {
        setSelectedFileName(file.name);
        toast(`Selected video: ${file.name}`);
      }
    }
  };

  const handleBrowseClick = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleGenerateClips = async () => {
    if (!videoLink && !selectedFileName && linksList.length === 0) {
      toast('Please paste a link or drop a video file');
      return;
    }

    setIsGenerating(true);
    try {
      // Create storyboard request in background
      await editor.createStoryboard({
        prompt: customInstructions || 'Auto-clip viral hooks and punchy segments',
        style: templateConfig?.captionStyle || 'karaoke_bounce',
      });
      toast('AI clipping pipeline initiated! Navigating to Studio...');
      setTimeout(() => {
        setIsGenerating(false);
        router.navigate('/studio');
      }, 900);
    } catch {
      toast('Job queued in local studio pipeline.');
      setIsGenerating(false);
      router.navigate('/studio');
    }
  };

  return (
    <ScrollView
      style={[styles.viewportScroll, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hidden file input for web upload */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          style={{ display: 'none' }}
          onChange={handleFilePicked}
        />
      )}

      {/* Dismissible Alert Banner Slot directly under header */}
      <BannerAlertSlot
        title="Pro GPU Acceleration Active"
        message="5 hours of remaining high-speed AI transcription & auto-framing on your team workspace."
        actionLabel="Workspace Limits"
        onAction={() => router.navigate('/settings')}
      />

      {/* Centered Single Column Content Container (max width ~840px) */}
      <View style={styles.centerContainer}>
        
        {/* PRIMARY WORKFLOW CARD: "Pick a video" */}
        <View style={[styles.intakeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          
          {/* Card Header with Chevron */}
          <View style={styles.cardHeaderRow}>
            <View style={{ gap: 2 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Pick a video</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                Import raw footage to automatically generate viral vertical clips with animated captions.
              </Text>
            </View>
            <Pressable
              onPress={() => setIsCardCollapsed(!isCardCollapsed)}
              style={({ pressed }: any) => [
                styles.collapseChevronBtn,
                { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' },
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
            >
              <Icon
                name={isCardCollapsed ? 'chevron-down' : 'chevron-up'}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          {/* Collapsible Content */}
          {!isCardCollapsed && (
            <View style={styles.cardBody}>
              
              {/* Segmented Control INSIDE the card: "New video" vs "Existing video" */}
              <View style={[styles.cardSegmentedControl, { backgroundColor: colors.surfaceAlt }]}>
                <Pressable
                  onPress={() => setSourceTab('new')}
                  style={[
                    styles.cardSegmentTab,
                    sourceTab === 'new' && [styles.cardSegmentTabActive, { backgroundColor: '#FFFFFF' }],
                    Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                  ]}
                >
                  <Text
                    style={[
                      styles.cardSegmentText,
                      {
                        color: sourceTab === 'new' ? colors.text : colors.textMuted,
                        fontFamily: sourceTab === 'new' ? font.semibold : font.medium,
                      },
                    ]}
                  >
                    New video
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSourceTab('existing')}
                  style={[
                    styles.cardSegmentTab,
                    sourceTab === 'existing' && [styles.cardSegmentTabActive, { backgroundColor: '#FFFFFF' }],
                    Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                  ]}
                >
                  <Text
                    style={[
                      styles.cardSegmentText,
                      {
                        color: sourceTab === 'existing' ? colors.text : colors.textMuted,
                        fontFamily: sourceTab === 'existing' ? font.semibold : font.medium,
                      },
                    ]}
                  >
                    Existing video
                  </Text>
                </Pressable>
              </View>

              {sourceTab === 'new' ? (
                <>
                  {/* a) Labeled Text Input: "Paste a link" + "+" button */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Paste a link</Text>
                    <View style={styles.linkInputRow}>
                      <TextInput
                        style={[
                          styles.linkTextInput,
                          {
                            backgroundColor: colors.surfaceAlt,
                            borderColor: colors.border,
                            color: colors.text,
                          },
                        ]}
                        value={videoLink}
                        onChangeText={setVideoLink}
                        placeholder="YouTube, Vimeo or Google Drive link"
                        placeholderTextColor={colors.textFaint}
                        onSubmitEditing={handleAddLink}
                      />
                      <Pressable
                        onPress={handleAddLink}
                        style={({ pressed }: any) => [
                          styles.plusButton,
                          {
                            backgroundColor: colors.primary,
                            transform: pressed ? [{ scale: 0.95 }] : [{ scale: 1 }],
                          },
                          Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                        ]}
                      >
                        <Icon name="plus" size={18} color="#FFFFFF" />
                      </Pressable>
                    </View>

                    {/* Queued links chips */}
                    {linksList.length > 0 && (
                      <View style={styles.linksChipContainer}>
                        {linksList.map((lnk, idx) => (
                          <View key={idx} style={[styles.linkChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                            <Icon name="link" size={12} color={colors.primary} />
                            <Text style={[styles.linkChipText, { color: colors.text }]} numberOfLines={1}>
                              {lnk}
                            </Text>
                            <Pressable
                              onPress={() => setLinksList(linksList.filter((_, i) => i !== idx))}
                              style={{ padding: 2 }}
                            >
                              <Icon name="x" size={12} color={colors.textFaint} />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* b) "or" divider */}
                  <View style={styles.orDividerContainer}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
                    <Text style={[styles.orText, { color: colors.textFaint }]}>or</Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
                  </View>

                  {/* c) Large Dashed-border Drop-Zone */}
                  <Pressable
                    onPress={handleBrowseClick}
                    style={({ pressed, hovered }: any) => [
                      styles.dropZone,
                      {
                        borderColor: selectedFileName ? colors.primary : colors.border,
                        backgroundColor: hovered ? colors.primarySoft : colors.surfaceAlt,
                      },
                      Platform.OS === 'web' && ({
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                        transform: pressed ? 'scale(0.995)' : 'none',
                      } as any),
                    ]}
                  >
                    <View style={[styles.cloudBadge, { backgroundColor: 'rgba(108, 76, 240, 0.12)' }]}>
                      <Icon name="upload" size={24} color={colors.primary} />
                    </View>
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <Text style={[styles.dropZoneTitle, { color: colors.text }]}>
                        {selectedFileName ? selectedFileName : 'Drop a video here'}
                      </Text>
                      <Text style={[styles.dropZoneSubtitle, { color: colors.textMuted }]}>
                        {selectedFileName ? (
                          'Ready to process. Click to pick a different file.'
                        ) : (
                          <>
                            drag & drop footage or{' '}
                            <Text style={{ color: colors.primary, fontFamily: font.semibold }}>browse files</Text>
                          </>
                        )}
                      </Text>
                    </View>
                    <Text style={[styles.formatsCaption, { color: colors.textFaint }]}>
                      Supports MP4, MOV, WEBM up to 4GB (auto-transcribed in seconds)
                    </Text>
                  </Pressable>

                  {/* d) Optional Textarea: "Add custom instructions" */}
                  <View style={styles.inputGroup}>
                    <View style={styles.instructionHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon name="lightbulb" size={15} color="#F59E0B" />
                        <Text style={[styles.fieldLabel, { color: colors.text }]}>Add custom instructions</Text>
                      </View>
                      <Text style={[styles.optionalTag, { color: colors.textFaint }]}>Optional</Text>
                    </View>
                    <TextInput
                      style={[
                        styles.instructionsInput,
                        {
                          backgroundColor: colors.surfaceAlt,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                      value={customInstructions}
                      onChangeText={setCustomInstructions}
                      placeholder="e.g. Find all the moments where the founder explains pricing mistakes, keep under 45 seconds..."
                      placeholderTextColor={colors.textFaint}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  {/* Template Quick Selection */}
                  <View style={[styles.templateBanner, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={[styles.templateIconBox, { backgroundColor: colors.primary }]}>
                        <Icon name="layers" size={15} color="#FFFFFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.templateNameText, { color: colors.text }]}>
                          Template: {templateConfig?.name || 'GrowthOS Viral Preset (Karaoke Bounce, 9:16)'}
                        </Text>
                        <Text style={[styles.templateSubText, { color: colors.textMuted }]}>
                          Auto-framing active • Captions enabled • Smart B-roll on
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => setWizardOpen(true)}
                      style={[styles.customizeTemplateBtn, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.customizeTemplateText, { color: colors.primary }]}>Customize</Text>
                    </Pressable>
                  </View>

                  {/* Primary CTA Button: Prominent solid brand pill button */}
                  <Pressable
                    onPress={handleGenerateClips}
                    disabled={isGenerating}
                    style={({ pressed }: any) => [
                      styles.primaryGenerateButton,
                      {
                        backgroundColor: colors.primary,
                        transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                      },
                      Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                    ]}
                  >
                    {isGenerating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Icon name="sparkles" size={18} color="#FFFFFF" />
                        <Text style={styles.primaryGenerateButtonText}>Generate short clips</Text>
                      </>
                    )}
                  </Pressable>
                </>
              ) : (
                /* Existing video selector tab */
                <View style={styles.existingVideoContainer}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Select from media library</Text>
                  <View style={styles.existingProjectsGrid}>
                    {SAMPLE_PROJECTS.map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() => {
                          setSelectedFileName(p.title);
                          setSourceTab('new');
                          toast(`Loaded footage: ${p.title}`);
                        }}
                        style={[styles.existingCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                      >
                        <Image source={{ uri: p.thumbnail }} style={styles.existingThumb} />
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={[styles.existingTitle, { color: colors.text }]} numberOfLines={1}>{p.title}</Text>
                          <Text style={[styles.existingMeta, { color: colors.textMuted }]}>{p.duration} • {p.date}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

            </View>
          )}

        </View>

        {/* SECTION 2: "My projects" */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>My projects</Text>
            <Pressable
              onPress={() => router.navigate('/studio')}
              style={[styles.viewAllBtn, Platform.OS === 'web' && ({ cursor: 'pointer' } as any)]}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View all in Studio</Text>
              <Icon name="chevron-right" size={14} color={colors.primary} />
            </Pressable>
          </View>

          {projects.length === 0 ? (
            <View style={[styles.emptyProjectsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceAlt }]}>
                <Icon name="folder" size={28} color={colors.textFaint} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No projects generated yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Import a raw video above to create your first set of social-ready clips.
              </Text>
              <Pressable
                onPress={handleBrowseClick}
                style={[styles.emptyUploadBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.emptyUploadBtnText}>Upload a video</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.projectsGrid}>
              {projects.map((proj) => (
                <Pressable
                  key={proj.id}
                  onPress={() => router.navigate('/studio')}
                  style={({ pressed }: any) => [
                    styles.projectCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                    },
                    Platform.OS === 'web' && ({
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                    } as any),
                  ]}
                >
                  <View style={styles.posterContainer}>
                    <Image source={{ uri: proj.thumbnail }} style={styles.projectPoster} />
                    <View style={styles.durationChip}>
                      <Text style={styles.durationChipText}>{proj.duration}</Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: colors.primary }]}>
                      <Text style={styles.statusChipText}>{proj.status}</Text>
                    </View>
                  </View>
                  <View style={styles.projectMeta}>
                    <Text style={[styles.projectTitle, { color: colors.text }]} numberOfLines={2}>
                      {proj.title}
                    </Text>
                    <View style={styles.projectFooterRow}>
                      <Text style={[styles.projectDate, { color: colors.textMuted }]}>{proj.date}</Text>
                      <View style={[styles.clipsCountBadge, { backgroundColor: colors.primarySoft }]}>
                        <Text style={[styles.clipsCountText, { color: colors.primary }]}>
                          {proj.clipsCount} clips
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* SECTION 3: Tutorials Horizontal Scroll List */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ gap: 2 }}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Tutorials & Fast Tips</Text>
              <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                Short 2-minute masterclasses on viral hooks, pacing, and auto-framing
              </Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tutorialsScroll}>
            {TUTORIALS.map((tut) => (
              <Pressable
                key={tut.id}
                onPress={() => toast(`Opening masterclass: ${tut.title}`)}
                style={({ pressed }: any) => [
                  styles.tutorialCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                  },
                  Platform.OS === 'web' && ({
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  } as any),
                ]}
              >
                <View style={styles.tutorialThumbContainer}>
                  <Image source={{ uri: tut.thumb }} style={styles.tutorialThumb} />
                  <View style={styles.tutorialDurationBadge}>
                    <Icon name="clock" size={10} color="#FFFFFF" />
                    <Text style={styles.tutorialDurationText}>{tut.duration}</Text>
                  </View>
                </View>
                <View style={styles.tutorialMeta}>
                  <Text style={[styles.tutorialTitle, { color: colors.text }]} numberOfLines={2}>
                    {tut.title}
                  </Text>
                  <Text style={[styles.tutorialViews, { color: colors.textMuted }]}>
                    {tut.views} views • GrowthOS Guide
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* SECTION 4: Community Showcase Grid */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ gap: 2 }}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Community Creations</Text>
              <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                Real high-performing clips generated by creators using this engine
              </Text>
            </View>
          </View>

          <View style={styles.showcaseGrid}>
            {COMMUNITY_SHOWCASE.map((item) => (
              <View
                key={item.id}
                style={[styles.showcaseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.showcaseThumbContainer}>
                  <Image source={{ uri: item.thumb }} style={styles.showcaseThumb} />
                  <View style={[styles.showcaseBadge, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.showcaseBadgeText}>{item.views}</Text>
                  </View>
                </View>
                <View style={styles.showcaseMeta}>
                  <Text style={[styles.showcaseTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[styles.showcaseCreator, { color: colors.textMuted }]}>
                    by {item.creator}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

      </View>

      {/* Signature Template Wizard Modal */}
      <TemplateWizardModal
        visible={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={(data) => {
          setTemplateConfig(data);
          toast(`Applied template: ${data.name}`);
        }}
        initialData={templateConfig || undefined}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  viewportScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  centerContainer: {
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 28,
  },
  intakeCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: font.bold,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: font.regular,
  },
  collapseChevronBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    gap: 18,
  },
  cardSegmentedControl: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.pill,
    width: '100%',
  },
  cardSegmentTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSegmentTabActive: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardSegmentText: {
    fontSize: 13,
  },
  inputGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: font.semibold,
  },
  linkInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkTextInput: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    fontFamily: font.regular,
  },
  plusButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linksChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: 320,
  },
  linkChipText: {
    fontSize: 12,
    fontFamily: font.mono,
  },
  orDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 12,
    fontFamily: font.medium,
  },
  dropZone: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  cloudBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneTitle: {
    fontSize: 15,
    fontFamily: font.bold,
  },
  dropZoneSubtitle: {
    fontSize: 13,
  },
  formatsCaption: {
    fontSize: 11,
    marginTop: 2,
  },
  instructionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionalTag: {
    fontSize: 12,
    fontFamily: font.regular,
  },
  instructionsInput: {
    minHeight: 74,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: font.regular,
    textAlignVertical: 'top',
  },
  templateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  templateIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateNameText: {
    fontSize: 12,
    fontFamily: font.semibold,
  },
  templateSubText: {
    fontSize: 11,
  },
  customizeTemplateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  customizeTemplateText: {
    fontSize: 12,
    fontFamily: font.semibold,
  },
  primaryGenerateButton: {
    height: 48,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#6C4CF0',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 4,
  },
  primaryGenerateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: font.bold,
  },
  existingVideoContainer: {
    gap: 12,
  },
  existingProjectsGrid: {
    gap: 8,
  },
  existingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  existingThumb: {
    width: 60,
    height: 44,
    borderRadius: 6,
  },
  existingTitle: {
    fontSize: 13,
    fontFamily: font.semibold,
  },
  existingMeta: {
    fontSize: 11,
  },
  sectionBlock: {
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    fontSize: 17,
    fontFamily: font.bold,
  },
  sectionSub: {
    fontSize: 12,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontFamily: font.semibold,
  },
  emptyProjectsCard: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: font.bold,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 360,
  },
  emptyUploadBtn: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  emptyUploadBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: font.semibold,
  },
  projectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  projectCard: {
    width: '48.5%',
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  posterContainer: {
    width: '100%',
    height: 130,
    position: 'relative',
  },
  projectPoster: {
    width: '100%',
    height: '100%',
  },
  durationChip: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: font.medium,
  },
  statusChip: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: font.bold,
  },
  projectMeta: {
    padding: 12,
    gap: 8,
  },
  projectTitle: {
    fontSize: 13,
    fontFamily: font.semibold,
    lineHeight: 18,
  },
  projectFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectDate: {
    fontSize: 11,
  },
  clipsCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  clipsCountText: {
    fontSize: 11,
    fontFamily: font.semibold,
  },
  tutorialsScroll: {
    gap: 12,
    paddingRight: 20,
  },
  tutorialCard: {
    width: 220,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tutorialThumbContainer: {
    width: '100%',
    height: 110,
    position: 'relative',
  },
  tutorialThumb: {
    width: '100%',
    height: '100%',
  },
  tutorialDurationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tutorialDurationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: font.medium,
  },
  tutorialMeta: {
    padding: 10,
    gap: 4,
  },
  tutorialTitle: {
    fontSize: 12,
    fontFamily: font.semibold,
    lineHeight: 16,
  },
  tutorialViews: {
    fontSize: 11,
  },
  showcaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  showcaseCard: {
    width: '31.5%',
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  showcaseThumbContainer: {
    width: '100%',
    height: 100,
    position: 'relative',
  },
  showcaseThumb: {
    width: '100%',
    height: '100%',
  },
  showcaseBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  showcaseBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: font.bold,
  },
  showcaseMeta: {
    padding: 8,
    gap: 2,
  },
  showcaseTitle: {
    fontSize: 12,
    fontFamily: font.semibold,
    lineHeight: 16,
  },
  showcaseCreator: {
    fontSize: 11,
  },
});
