import React, { useCallback, useEffect, useState } from 'react';
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
import { Badge, Button, T } from '../../components/ui';
import { TemplateWizard } from '../../components/TemplateWizard';
import { useAuth } from '../../state/auth';
import { useDevMode } from '../../state/devMode';
import { useToast } from '../../state/toast';
import { get, request } from '../../api/client';
import { editor } from '../../api/editor';
import { MAX_CONTENT_WIDTH, font, radius, shadow, spacing, useTheme } from '../../theme';

interface SettingRowItem {
  id: string;
  label: string;
  value?: string;
  badge?: string;
  badgeTone?: 'info' | 'neutral' | 'success' | 'warning' | 'danger';
  action?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (val: boolean) => void;
}

interface SettingSection {
  title: string;
  rows: SettingRowItem[];
}

export default function ChoppitySettingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { signOut, user } = useAuth();
  const { devMode, setDevMode } = useDevMode();

  // Template State
  const [templateName, setTemplateName] = useState('Viral Social Shorts (Default)');
  const [isEditingName, setIsEditingName] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Settings Toggles
  const [autoEmojis, setAutoEmojis] = useState(true);
  const [safeMargins, setSafeMargins] = useState(true);
  const [fillerCuts, setFillerCuts] = useState(true);
  const [punchZooms, setPunchZooms] = useState(true);
  const [autoSFX, setAutoSFX] = useState(true);

  // Flat Scannable Settings Sections
  const sections: SettingSection[] = [
    {
      title: 'WORKSPACE & TEAM',
      rows: [
        {
          id: 'workspace',
          label: 'Default Workspace',
          value: 'Personal Creator Studio (Pro)',
          action: () => toast('Current workspace: GrowthOS Pro'),
        },
        {
          id: 'team',
          label: 'Team Members & Permissions',
          value: '1 Owner • 0 Guests',
          action: () => toast('Team sharing: Invite editors to your workspace'),
        },
        {
          id: 'api_keys',
          label: 'API Keys & Webhooks',
          value: 'FastAPI Backend Connected',
          badge: 'ACTIVE',
          badgeTone: 'success',
          action: () => toast('Backend API status: All endpoints operational'),
        },
      ],
    },
    {
      title: 'CAPTION SETTINGS',
      rows: [
        {
          id: 'caption_style',
          label: 'Subtitle Typography Style',
          value: 'Karaoke Highlights',
          badge: 'PRESET',
          action: () => setWizardOpen(true),
        },
        {
          id: 'caption_color',
          label: 'Active Word Highlight Color',
          value: '#FACC15 Electric Yellow',
          action: () => setWizardOpen(true),
        },
        {
          id: 'auto_emojis',
          label: 'Auto Emojis & Word Highlighting',
          badge: 'NEW',
          badgeTone: 'info',
          toggle: true,
          toggleValue: autoEmojis,
          onToggle: setAutoEmojis,
        },
        {
          id: 'words_per_line',
          label: 'Max Words Per Line',
          value: '3-4 Words (Fast Retention)',
          action: () => toast('Pacing set to 3-4 words for peak watch-time'),
        },
      ],
    },
    {
      title: 'VIDEO & FRAMING',
      rows: [
        {
          id: 'aspect_ratio',
          label: 'Default Aspect Ratio',
          value: '9:16 Vertical (Shorts/Reels)',
          action: () => setWizardOpen(true),
        },
        {
          id: 'face_reframe',
          label: 'Speaker Auto-Reframe',
          value: 'Face-Tracking Center Crop',
          action: () => toast('Auto-Reframe dynamically centers the primary active speaker'),
        },
        {
          id: 'safe_margins',
          label: 'TikTok & Reels UI Safe Margins',
          badge: 'RECOMMENDED',
          badgeTone: 'neutral',
          toggle: true,
          toggleValue: safeMargins,
          onToggle: setSafeMargins,
        },
        {
          id: 'export_resolution',
          label: 'Export Master Quality',
          value: '1080x1920 (60 FPS)',
          action: () => toast('Rendering in full 1080x1920 60fps MP4'),
        },
      ],
    },
    {
      title: 'AI & RETENTION CUES',
      rows: [
        {
          id: 'filler_removal',
          label: 'Silence & Dead Air Removal',
          badge: 'NEW',
          badgeTone: 'info',
          toggle: true,
          toggleValue: fillerCuts,
          onToggle: setFillerCuts,
        },
        {
          id: 'punch_zooms',
          label: 'Smart 1.12x Punch Zooms',
          toggle: true,
          toggleValue: punchZooms,
          onToggle: setPunchZooms,
        },
        {
          id: 'auto_sfx',
          label: 'SFX Transitions & Whooshes',
          toggle: true,
          toggleValue: autoSFX,
          onToggle: setAutoSFX,
        },
        {
          id: 'retention_threshold',
          label: 'Hook & Viral Threshold',
          value: 'Score > 80%',
          action: () => toast('Only moments scoring above 80% will be clipped'),
        },
      ],
    },
    {
      title: 'SOCIAL PUBLISHING',
      rows: [
        {
          id: 'instagram',
          label: 'Instagram Professional Account',
          value: '@vishnubuilds.ai',
          badge: 'CONNECTED',
          badgeTone: 'success',
          action: () => router.push('/publishing'),
        },
        {
          id: 'youtube',
          label: 'YouTube Shorts Channel',
          value: 'GrowthOS Studio',
          badge: 'READY',
          badgeTone: 'neutral',
          action: () => router.push('/publishing'),
        },
        {
          id: 'queue_schedule',
          label: 'Auto-Publish Publishing Slots',
          value: 'Mon, Wed, Fri at 6:00 PM',
          action: () => router.push('/publishing'),
        },
      ],
    },
    {
      title: 'DEVELOPER & DIAGNOSTICS',
      rows: [
        {
          id: 'dev_mode',
          label: 'Developer Mode & Engine Diagnostics',
          toggle: true,
          toggleValue: devMode,
          onToggle: (v) => {
            setDevMode(v);
            toast(v ? 'Dev Mode enabled: Extended logs active' : 'Dev Mode disabled');
          },
        },
        {
          id: 'creator_studio',
          label: 'Creator Studio Standalone Pipeline',
          value: 'Remotion Carousels & Video Library',
          action: () => router.push('/creator-studio' as any),
        },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { maxWidth: MAX_CONTENT_WIDTH }]}
      >
        {/* Page Title */}
        <View style={{ gap: 4 }}>
          <T variant="h1" style={{ fontSize: 24, fontWeight: '700' }}>
            Template settings
          </T>
          <T variant="small" muted>
            Customize your brand templates, caption typography, aspect ratios, and automated AI editing rules.
          </T>
        </View>

        {/* Top Summary Card: Editable Name + Wizard CTA Row */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadow(colors)]}>
          {/* Row 1: Editable Template Name */}
          <View style={styles.nameRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <T variant="label" muted style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.8 }}>
                ACTIVE TEMPLATE
              </T>
              {isEditingName ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    value={templateName}
                    onChangeText={setTemplateName}
                    autoFocus
                    onBlur={() => setIsEditingName(false)}
                    style={[styles.nameInput, { borderColor: colors.primary, color: colors.text }]}
                  />
                  <Pressable
                    onPress={() => setIsEditingName(false)}
                    style={[styles.pillIconBtn, { backgroundColor: colors.primary }]}
                  >
                    <Icon name="check" size={14} color="#FFFFFF" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setIsEditingName(true)}
                  style={({ hovered }: any) => [
                    styles.nameDisplay,
                    hovered && { opacity: 0.8 },
                    Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                  ]}
                >
                  <Text style={{ fontFamily: font.bold, fontSize: 16, color: colors.text }}>
                    {templateName}
                  </Text>
                  <Icon name="edit" size={15} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            <Badge label="Active Default" tone="info" />
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Row 2: Highlighted CTA Row: "Start template wizard" + Go button */}
          <View style={[styles.wizardCtaRow, { backgroundColor: '#F8FAFC', borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={[styles.wizardIconCircle, { backgroundColor: 'rgba(108, 76, 240, 0.12)' }]}>
                <Icon name="sparkles" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 14, color: colors.text }}>
                  Start template wizard
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.textMuted }}>
                  Reconfigure branding, captions, framing, and retention in a 5-step guided flow.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setWizardOpen(true)}
              style={({ pressed, hovered }: any) => [
                styles.goBtn,
                { backgroundColor: hovered ? colors.primaryPressed : colors.primary },
                pressed && { opacity: 0.9 },
                Platform.OS === 'web' && ({
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(108, 76, 240, 0.3)',
                } as any),
              ]}
            >
              <Text style={{ fontFamily: font.bold, fontSize: 13, color: '#FFFFFF' }}>Go</Text>
              <Icon name="arrow-right" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Flat Scannable List Sections */}
        {sections.map((sec) => (
          <View key={sec.title} style={{ gap: 6 }}>
            {/* Small-Caps Gray Section Header */}
            <Text style={styles.sectionHeader}>{sec.title}</Text>

            {/* List Card */}
            <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {sec.rows.map((row, idx) => {
                const isLast = idx === sec.rows.length - 1;
                return (
                  <View key={row.id}>
                    <Pressable
                      disabled={row.toggle}
                      onPress={row.action}
                      style={({ pressed, hovered }: any) => [
                        styles.listRow,
                        !row.toggle && hovered && { backgroundColor: colors.surfaceAlt },
                        pressed && { opacity: 0.8 },
                        Platform.OS === 'web' && !row.toggle && ({ cursor: 'pointer' } as any),
                      ]}
                    >
                      {/* Label on the left */}
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontFamily: font.medium, fontSize: 13, color: colors.text }}>
                          {row.label}
                        </Text>
                        {row.badge && (
                          <Badge label={row.badge} tone={row.badgeTone || 'neutral'} />
                        )}
                      </View>

                      {/* Right Control: Value + Chevron OR Switch */}
                      {row.toggle ? (
                        <Switch
                          value={row.toggleValue}
                          onValueChange={row.onToggle}
                          trackColor={{ false: '#CBD5E1', true: colors.primary }}
                        />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {row.value && (
                            <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.textMuted }}>
                              {row.value}
                            </Text>
                          )}
                          <Icon name="chevron-right" size={16} color={colors.textFaint} />
                        </View>
                      )}
                    </Pressable>
                    {!isLast && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Destructive Action: Isolated at Bottom */}
        <View style={styles.destructiveSection}>
          <Pressable
            onPress={() => toast('Template reset to factory defaults')}
            style={({ pressed, hovered }: any) => [
              styles.deleteBtn,
              hovered && { backgroundColor: 'rgba(239, 68, 68, 0.08)' },
              pressed && { opacity: 0.8 },
              Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
            ]}
          >
            <Icon name="trash" size={16} color="#EF4444" />
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: '#EF4444' }}>
              Delete template & reset defaults
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Signature Template Wizard Modal */}
      <TemplateWizard
        visible={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSave={(cfg) => {
          setTemplateName(`${cfg.name} (${cfg.aspectRatio})`);
          toast('Template configuration updated successfully!');
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
    paddingBottom: spacing.xxl * 2,
  },

  /* Summary Card */
  summaryCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontFamily: font.bold,
    fontSize: 15,
    minWidth: 260,
  },
  pillIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  wizardCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
  },
  wizardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },

  /* Section Small-Caps Labels */
  sectionHeader: {
    fontFamily: font.bold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: '#64748B',
    paddingLeft: 4,
    marginBottom: 4,
  },

  /* Flat Scannable List */
  listCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  rowDivider: {
    height: 1,
    width: '100%',
  },

  /* Destructive Action */
  destructiveSection: {
    alignItems: 'flex-start',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
});
