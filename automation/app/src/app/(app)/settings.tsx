import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, IconName } from '../../components/Icon';
import { TemplateWizardModal, TemplateWizardData } from '../../components/TemplateWizardModal';
import { font, radius, spacing, useTheme } from '../../theme';
import { useAuth } from '../../state/auth';
import { useDevMode } from '../../state/devMode';
import { useToast } from '../../state/toast';

interface SettingRowItem {
  id: string;
  label: string;
  valuePreview?: string;
  isNew?: boolean;
  targetWizardStep?: number;
  href?: string;
  action?: 'toggle' | 'wizard' | 'navigate';
  toggleValue?: boolean;
}

interface SettingSectionGroup {
  id: string;
  title: string;
  items: SettingRowItem[];
}

const DEV_TOOLS_ITEMS: { title: string; href: string; icon: IconName; desc: string }[] = [
  {
    title: 'Vishnu Studio',
    href: '/vstudio',
    icon: 'film',
    desc: 'Real presenter workspace, avatar synthesis, and talking-head recording pipelines.',
  },
  {
    title: 'Style DNA',
    href: '/styles',
    icon: 'sparkles',
    desc: 'Visual presets, pacing archetypes, typography palettes, and color grade definitions.',
  },
  {
    title: 'Footage Intelligence',
    href: '/footage',
    icon: 'eye',
    desc: 'Multimodal asset catalog, shot classification, speech transcripts, and face clustering.',
  },
  {
    title: 'Multi-Version Studio',
    href: '/versions',
    icon: 'copy',
    desc: 'Simultaneous multi-angle, multi-platform aspect ratio, and language variant generator.',
  },
  {
    title: 'Content Intelligence',
    href: '/intelligence',
    icon: 'cpu',
    desc: 'Audience retention heuristics, script scoring, competitor benchmarks, and hook analytics.',
  },
  {
    title: 'Render QA',
    href: '/qa',
    icon: 'check-circle',
    desc: 'Deep automated verification: flash frame checks, jump cuts, and -14 LUFS loudness mastering.',
  },
];

export default function TemplateSettingsPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { user, signOut } = useAuth();
  const { devMode, setDevMode } = useDevMode();

  // Wizard modal state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStartStep, setWizardStartStep] = useState(1);

  // Template editable state
  const [templateName, setTemplateName] = useState('GrowthOS Viral Master Template');
  const [isEditingName, setIsEditingName] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Interactive inline toggles
  const [autoWatermark, setAutoWatermark] = useState(false);
  const [brollOverlay, setBrollOverlay] = useState(true);
  const [loudnessMastering, setLoudnessMastering] = useState(true);
  const [silenceCut, setSilenceCut] = useState(true);

  const sections: SettingSectionGroup[] = [
    {
      id: 'workspace',
      title: 'WORKSPACE & GENERAL',
      items: [
        { id: 'ratio', label: 'Default aspect ratio', valuePreview: '9:16 Vertical (1080x1920)', targetWizardStep: 1, action: 'wizard' },
        { id: 'language', label: 'Spoken language transcription model', valuePreview: 'English (Whisper Large-v3)', targetWizardStep: 1, action: 'wizard' },
        { id: 'render_resolution', label: 'Export video resolution', valuePreview: '1080p 60fps', isNew: true },
      ],
    },
    {
      id: 'captions',
      title: 'CAPTION SETTINGS',
      items: [
        { id: 'caption_preset', label: 'Active subtitle style', valuePreview: 'Karaoke Bounce (Yellow glow)', targetWizardStep: 3, action: 'wizard' },
        { id: 'highlight_color', label: 'Word highlight color accent', valuePreview: '#6C4CF0 Brand Violet', targetWizardStep: 3, action: 'wizard' },
        { id: 'max_words_screen', label: 'Words per caption slice', valuePreview: '2 - 3 words max' },
        { id: 'auto_emojis', label: 'Automatic viral emoji cut-ins', valuePreview: 'Enabled' },
      ],
    },
    {
      id: 'video',
      title: 'VIDEO & FRAMING',
      items: [
        { id: 'framing_method', label: 'Speaker face tracking mode', valuePreview: 'Smooth dynamic pan', targetWizardStep: 2, action: 'wizard' },
        { id: 'silence_trim', label: 'Auto-cut silent pauses > 400ms', action: 'toggle', toggleValue: silenceCut },
        { id: 'loudness', label: 'Auto-normalize audio to -14 LUFS', action: 'toggle', toggleValue: loudnessMastering },
      ],
    },
    {
      id: 'assets',
      title: 'BRAND & ASSETS',
      items: [
        { id: 'watermark', label: 'Include transparent corner watermark logo', action: 'toggle', toggleValue: autoWatermark },
        { id: 'smart_broll', label: 'Insert stock B-roll on conceptual keywords', action: 'toggle', toggleValue: brollOverlay },
        { id: 'outros', label: 'End-card follower CTA loop', valuePreview: 'Rockcastle standard', isNew: true },
      ],
    },
    {
      id: 'ai',
      title: 'AI CLIPPING POLICY',
      items: [
        { id: 'clip_duration', label: 'Target short clip duration', valuePreview: '30 seconds', targetWizardStep: 4, action: 'wizard' },
        { id: 'hook_aggression', label: 'Hook detection sensitivity', valuePreview: 'Aggressive (High CTR)', targetWizardStep: 4, action: 'wizard' },
        { id: 'cliffhanger', label: 'Generate loop cliffhangers for episodic series', valuePreview: 'Active', href: '/series', action: 'navigate' },
      ],
    },
    {
      id: 'social',
      title: 'SOCIAL POSTS & EXPORTS',
      items: [
        { id: 'auto_desc', label: 'Generate AI social copy (X, Instagram, LinkedIn)', valuePreview: 'Enabled' },
        { id: 'scheduler', label: 'Auto-queue into publishing calendar', valuePreview: 'Configured', href: '/publishing', action: 'navigate' },
      ],
    },
  ];

  const handleRowClick = (item: SettingRowItem) => {
    if (item.action === 'wizard' && item.targetWizardStep) {
      setWizardStartStep(item.targetWizardStep);
      setWizardOpen(true);
      return;
    }
    if (item.action === 'navigate' && item.href) {
      router.navigate(item.href as any);
      return;
    }
    if (item.action === 'toggle') {
      if (item.id === 'watermark') setAutoWatermark(!autoWatermark);
      if (item.id === 'smart_broll') setBrollOverlay(!brollOverlay);
      if (item.id === 'loudness') setLoudnessMastering(!loudnessMastering);
      if (item.id === 'silence_trim') setSilenceCut(!silenceCut);
      toast('Setting updated');
      return;
    }
    toast(`Viewing setting: ${item.label}`);
  };

  const handleDeleteTemplate = () => {
    setShowDeleteConfirm(true);
  };

  return (
    <ScrollView
      style={[styles.viewportScroll, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.centerContainer}>
        
        {/* Page Title */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Template settings</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
            Configure automation presets, visual styling, framing rules, and social delivery pipelines.
          </Text>
        </View>

        {/* Top Summary Row: Editable name field + "Start template wizard" highlight row */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.templateNameRow}>
            {isEditingName ? (
              <TextInput
                style={[
                  styles.nameInput,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.primary,
                    color: colors.text,
                  },
                ]}
                value={templateName}
                onChangeText={setTemplateName}
                onBlur={() => {
                  setIsEditingName(false);
                  toast('Template renamed');
                }}
                autoFocus
              />
            ) : (
              <Pressable
                onPress={() => setIsEditingName(true)}
                style={styles.nameDisplayBtn}
              >
                <Text style={[styles.templateNameText, { color: colors.text }]}>{templateName}</Text>
                <View style={styles.pencilIconBox}>
                  <Icon name="edit" size={15} color={colors.textMuted} />
                </View>
              </Pressable>
            )}
            <View style={[styles.activePill, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.activePillText, { color: colors.primary }]}>Active Preset</Text>
            </View>
          </View>

          {/* Highlighted CTA Banner: "Start template wizard" with "Go" button */}
          <View style={[styles.wizardCtaBanner, { backgroundColor: 'rgba(108, 76, 240, 0.08)', borderColor: 'rgba(108, 76, 240, 0.25)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={[styles.wizardCtaIcon, { backgroundColor: colors.primary }]}>
                <Icon name="sparkles" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.wizardCtaTitle, { color: colors.text }]}>Start template wizard</Text>
                <Text style={[styles.wizardCtaSubtitle, { color: colors.textMuted }]}>
                  Walk through step-by-step questions to configure brand, aspect ratio, captions, and AI policies.
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                setWizardStartStep(1);
                setWizardOpen(true);
              }}
              style={({ pressed }: any) => [
                styles.goWizardButton,
                {
                  backgroundColor: colors.primary,
                  transform: pressed ? [{ scale: 0.96 }] : [{ scale: 1 }],
                },
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
            >
              <Text style={styles.goWizardButtonText}>Go</Text>
              <Icon name="chevron-right" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Section Groups */}
        {sections.map((sec) => (
          <View key={sec.id} style={styles.sectionGroup}>
            <Text style={[styles.smallCapsHeader, { color: colors.textFaint }]}>{sec.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {sec.items.map((item, idx) => {
                const isLast = idx === sec.items.length - 1;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleRowClick(item)}
                    style={({ pressed, hovered }: any) => [
                      styles.settingRow,
                      !isLast && [styles.settingRowBorder, { borderBottomColor: colors.borderLight }],
                      hovered && { backgroundColor: colors.surfaceAlt },
                      Platform.OS === 'web' && ({
                        cursor: 'pointer',
                        transition: 'background-color 100ms ease',
                      } as any),
                    ]}
                  >
                    <View style={styles.settingRowLeft}>
                      <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
                      {item.isNew && (
                        <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.settingRowRight}>
                      {item.action === 'toggle' ? (
                        <Switch
                          value={item.toggleValue}
                          onValueChange={() => handleRowClick(item)}
                          trackColor={{ false: colors.border, true: colors.primary }}
                          thumbColor="#FFFFFF"
                        />
                      ) : (
                        <>
                          {item.valuePreview && (
                            <Text style={[styles.valuePreviewText, { color: colors.textMuted }]}>
                              {item.valuePreview}
                            </Text>
                          )}
                          <Icon name="chevron-right" size={15} color={colors.textFaint} />
                        </>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {/* DEVELOPER TOOLS SECTION */}
        <View style={styles.sectionGroup}>
          <View style={styles.devSectionHeaderRow}>
            <Text style={[styles.smallCapsHeader, { color: colors.textFaint }]}>DEVELOPER TOOLS</Text>
            <View style={styles.devToggleWrapper}>
              <Text style={[styles.devToggleLabel, { color: colors.textMuted }]}>Developer Mode</Text>
              <Switch
                value={devMode}
                onValueChange={(val) => {
                  setDevMode(val);
                  toast(val ? 'Developer mode enabled' : 'Developer mode disabled');
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {devMode ? (
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {DEV_TOOLS_ITEMS.map((tool, idx) => {
                const isLast = idx === DEV_TOOLS_ITEMS.length - 1;
                return (
                  <Pressable
                    key={tool.href}
                    onPress={() => router.navigate(tool.href as any)}
                    style={({ hovered }: any) => [
                      styles.devToolRow,
                      !isLast && [styles.settingRowBorder, { borderBottomColor: colors.borderLight }],
                      hovered && { backgroundColor: colors.surfaceAlt },
                      Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                    ]}
                  >
                    <View style={[styles.devToolIconBox, { backgroundColor: colors.primarySoft }]}>
                      <Icon name={tool.icon} size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.devToolTitle, { color: colors.text }]}>{tool.title}</Text>
                      <Text style={[styles.devToolDesc, { color: colors.textMuted }]}>{tool.desc}</Text>
                    </View>
                    <Icon name="chevron-right" size={15} color={colors.textFaint} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={[styles.devModeNoticeCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
              <Icon name="settings" size={16} color={colors.textFaint} />
              <Text style={[styles.devNoticeText, { color: colors.textMuted }]}>
                Developer tools (Vishnu Studio, Style DNA, Footage Intelligence, Multi-Version, Content Intelligence, Render QA) are hidden. Toggle Developer Mode above to reveal them.
              </Text>
            </View>
          )}
        </View>

        {/* User Session Row */}
        <View style={styles.sectionGroup}>
          <Text style={[styles.smallCapsHeader, { color: colors.textFaint }]}>ACCOUNT & SESSION</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={{ gap: 2 }}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Signed in as</Text>
                <Text style={[styles.valuePreviewText, { color: colors.textMuted }]}>
                  {user?.email || 'jnyan8784@gmail.com'} ({user?.name || 'Jnyan'})
                </Text>
              </View>
              <Pressable
                onPress={() => signOut()}
                style={[styles.signOutBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.signOutText, { color: colors.danger }]}>Sign out</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Isolated Destructive Action: De-emphasized at the very bottom */}
        <View style={styles.destructiveContainer}>
          <Pressable
            onPress={handleDeleteTemplate}
            style={({ pressed }: any) => [
              styles.deleteTemplateBtn,
              Platform.OS === 'web' && ({
                cursor: 'pointer',
                opacity: pressed ? 0.7 : 1,
              } as any),
            ]}
          >
            <Text style={[styles.deleteTemplateText, { color: colors.danger }]}>Delete template</Text>
          </Pressable>
        </View>

      </View>

      {/* Template Wizard Modal */}
      <TemplateWizardModal
        visible={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={(data: TemplateWizardData) => {
          setTemplateName(data.name);
          toast(`Updated template: ${data.name}`);
        }}
        initialData={{ name: templateName }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  viewportScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  centerContainer: {
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 28,
  },
  pageHeader: {
    gap: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: font.bold,
  },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: font.regular,
  },
  summaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: 16,
  },
  templateNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameDisplayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateNameText: {
    fontSize: 16,
    fontFamily: font.bold,
  },
  pencilIconBox: {
    padding: 4,
  },
  nameInput: {
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: font.semibold,
    minWidth: 280,
  },
  activePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  activePillText: {
    fontSize: 11,
    fontFamily: font.bold,
  },
  wizardCtaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  wizardCtaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardCtaTitle: {
    fontSize: 14,
    fontFamily: font.bold,
  },
  wizardCtaSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  goWizardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  goWizardButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: font.bold,
  },
  sectionGroup: {
    gap: 8,
  },
  smallCapsHeader: {
    fontSize: 11,
    fontFamily: font.bold,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  settingLabel: {
    fontSize: 13,
    fontFamily: font.medium,
  },
  newBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: font.bold,
  },
  settingRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valuePreviewText: {
    fontSize: 13,
    fontFamily: font.regular,
  },
  devSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  devToggleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  devToggleLabel: {
    fontSize: 12,
    fontFamily: font.medium,
  },
  devToolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  devToolIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devToolTitle: {
    fontSize: 13,
    fontFamily: font.semibold,
  },
  devToolDesc: {
    fontSize: 11,
  },
  devModeNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  devNoticeText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  signOutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 12,
    fontFamily: font.semibold,
  },
  destructiveContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  deleteTemplateBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deleteTemplateText: {
    fontSize: 13,
    fontFamily: font.medium,
  },
});
