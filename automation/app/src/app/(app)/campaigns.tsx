import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Page } from '../../components/Page';
import { Icon } from '../../components/Icon';
import { T } from '../../components/ui';
import { font, radius, spacing, useTheme } from '../../theme';

const CHANNELS = ['Website', 'Instagram', 'YouTube', 'X / Twitter'];
const CAMPAIGNS = [
  { name: 'Product launch', detail: '4 channels · Scheduled', progress: '72%' },
  { name: 'Brand awareness', detail: '3 channels · Draft', progress: '42%' },
  { name: 'Retargeting', detail: '2 channels · Draft', progress: '25%' },
];

export default function Campaigns() {
  const { colors } = useTheme();

  return (
    <Page title="Campaigns" subtitle="Plan and run campaigns across your sites and channels.">
      <View style={[styles.stage, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.preview, Platform.OS === 'web' ? ({ filter: 'blur(5px)' } as any) : { opacity: 0.35 }]}
        >
          <View style={styles.previewHeader}>
            <View style={{ gap: spacing.sm, flex: 1 }}>
              <T variant="mono" style={{ color: colors.primary, letterSpacing: 1.5 }}>CAMPAIGN WORKSPACE</T>
              <T style={styles.previewTitle}>One launch. Every channel.</T>
              <T muted>Coordinate creative, publishing, and performance in one place.</T>
            </View>
            <View style={[styles.previewButton, { backgroundColor: colors.primarySoft }]}>
              <Icon name="plus" size={17} color={colors.primary} />
              <T style={{ color: colors.primary, fontWeight: '600' }}>New campaign</T>
            </View>
          </View>

          <View style={styles.metrics}>
            {[
              { label: 'ACTIVE CAMPAIGNS', value: '—' },
              { label: 'CONNECTED CHANNELS', value: '—' },
              { label: 'TOTAL REACH', value: '—' },
            ].map((metric) => (
              <View key={metric.label} style={[styles.metricCard, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                <T variant="mono" muted style={styles.metricLabel}>{metric.label}</T>
                <T style={styles.metricValue}>{metric.value}</T>
              </View>
            ))}
          </View>

          <View style={[styles.workspace, { borderColor: colors.border }]}>
            <View style={styles.workspaceHeading}>
              <T variant="h2">Campaign pipeline</T>
              <T variant="small" muted>Planning across channels</T>
            </View>
            {CAMPAIGNS.map((campaign) => (
              <View key={campaign.name} style={[styles.campaignRow, { borderTopColor: colors.border }]}>
                <View style={[styles.campaignIcon, { backgroundColor: colors.primarySoft }]}>
                  <Icon name="megaphone" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 140, gap: 3 }}>
                  <T style={{ fontWeight: '600' }}>{campaign.name}</T>
                  <T variant="small" muted>{campaign.detail}</T>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
                  <View style={[styles.progressFill, { width: campaign.progress, backgroundColor: colors.primary }]} />
                </View>
              </View>
            ))}
          </View>

          <View style={styles.channels}>
            {CHANNELS.map((channel) => (
              <View key={channel} style={[styles.channel, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                <View style={[styles.channelDot, { backgroundColor: colors.primary }]} />
                <T variant="small">{channel}</T>
              </View>
            ))}
          </View>
        </View>

        <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none">
          <View style={[styles.messageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.messageIcon, { backgroundColor: colors.primarySoft }]}>
              <Icon name="megaphone" size={26} color={colors.primary} />
            </View>
            <T variant="mono" style={{ color: colors.primary, letterSpacing: 1.6 }}>CAMPAIGNS</T>
            <T variant="h1" style={styles.comingSoon}>Coming soon</T>
            <T muted style={styles.messageText}>
              Plan and run campaigns across your sites and social channels from one workspace.
            </T>
          </View>
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  stage: { minHeight: 580, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  preview: { padding: spacing.xl, gap: spacing.xl },
  previewHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'center', justifyContent: 'space-between' },
  previewTitle: { fontFamily: font.bold, fontSize: 27, lineHeight: 34, color: '#0F172A' },
  previewButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metricCard: { flexGrow: 1, flexBasis: 190, minHeight: 100, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, justifyContent: 'space-between' },
  metricLabel: { fontSize: 10, letterSpacing: 0.7 },
  metricValue: { fontFamily: font.bold, fontSize: 28, color: '#0F172A' },
  workspace: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  workspaceHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm, padding: spacing.md, alignItems: 'center' },
  campaignRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap', borderTopWidth: 1, padding: spacing.md },
  campaignIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 6, width: 100, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill },
  channels: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  channel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  channelDot: { width: 6, height: 6, borderRadius: radius.pill },
  overlay: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(248, 250, 252, 0.34)' },
  messageCard: { width: '100%', maxWidth: 430, alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl, borderRadius: radius.lg, borderWidth: 1, shadowColor: '#0F172A', shadowOpacity: 0.1, shadowRadius: 24, elevation: 8 },
  messageIcon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  comingSoon: { fontSize: 31, lineHeight: 38, textAlign: 'center' },
  messageText: { textAlign: 'center', lineHeight: 21, maxWidth: 320 },
});
