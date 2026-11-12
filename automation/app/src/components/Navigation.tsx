import React from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from './Icon';
import { T, Badge } from './ui';
import { font, radius, spacing, useTheme } from '../theme';
import { useAuth } from '../state/auth';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'WORKSPACE',
    items: [
      { href: '/', label: 'Overview', icon: 'grid' },
      { href: '/studio', label: 'AI Studio', icon: 'camera' },
      { href: '/storyboard', label: 'Storyboard', icon: 'layers' },
      { href: '/timeline', label: 'Timeline Editor', icon: 'sliders' },
      { href: '/footage', label: 'Footage Intelligence', icon: 'eye' },
      { href: '/styles', label: 'Style DNA', icon: 'sparkles' },
      { href: '/versions', label: 'Multi-Version Studio', icon: 'copy' },
      { href: '/intelligence', label: 'Content Intelligence', icon: 'cpu' },
      { href: '/qa', label: 'Render QA', icon: 'check-circle' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { href: '/series', label: 'Series Engine', icon: 'tv' },
      { href: '/vstudio', label: 'Vishnu Studio', icon: 'film' },
      { href: '/media', label: 'Media Library', icon: 'music' },
      { href: '/publishing', label: 'Publishing', icon: 'send' },
      { href: '/analytics', label: 'Analytics', icon: 'bar-chart' },
      { href: '/editing-memory', label: 'Editing Memory', icon: 'clock' },
      { href: '/automation', label: 'Automation', icon: 'zap' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { href: '/settings', label: 'Settings', icon: 'settings' },
      { href: '/integrations', label: 'Integrations', icon: 'server' },
    ],
  },
];

function isActive(path: string, href: string) {
  if (href === '/') return path === '/' || path === '/(app)';
  return path === href || path.startsWith(href + '/');
}

export function Sidebar() {
  const { colors } = useTheme();
  const path = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <View style={[styles.side, { backgroundColor: colors.sidebar, borderRightColor: colors.border }]}>
      {/* Brand Header */}
      <View style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Icon name="sparkles" size={16} color={colors.onPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="h3" style={{ letterSpacing: -0.2 }}>GROWTHOS</T>
          <T variant="mono" style={{ fontSize: 9, color: colors.primary, letterSpacing: 1.2 }}>CREATIVE INTELLIGENCE</T>
        </View>
      </View>

      {/* Workspace Selector Pill */}
      <View style={[styles.workspaceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
        <T variant="small" style={{ flex: 1, fontFamily: font.mono }} numberOfLines={1}>Rockcastle Studio</T>
        <T variant="mono" style={{ fontSize: 10, color: colors.textFaint }}>v2.4</T>
      </View>

      {/* Navigation Sections */}
      <View style={{ gap: spacing.lg, flex: 1 }}>
        {NAV_SECTIONS.map((sec) => (
          <View key={sec.title} style={{ gap: 4 }}>
            <T variant="label" style={{ fontSize: 10, color: colors.textFaint, paddingHorizontal: 12, marginBottom: 2 }}>
              {sec.title}
            </T>
            {sec.items.map((n) => {
              const on = isActive(path, n.href);
              return (
                <Pressable
                  key={n.href}
                  accessibilityRole="link"
                  accessibilityState={{ selected: on }}
                  onPress={() => router.navigate(n.href as any)}
                  style={({ hovered }: any) => [
                    styles.item,
                    {
                      backgroundColor: on ? colors.primarySoft : hovered ? colors.surface : 'transparent',
                      borderLeftColor: on ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  <Icon name={n.icon} size={17} color={on ? colors.primary : colors.textMuted} />
                  <Text
                    style={{
                      fontFamily: on ? font.semibold : font.medium,
                      fontSize: 13,
                      color: on ? colors.primary : colors.text,
                      flex: 1,
                    }}
                  >
                    {n.label}
                  </Text>
                  {n.badge ? <Badge label={n.badge} tone="info" /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* User Footer */}
      <View style={[styles.user, { borderTopColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.primary }}>
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <T variant="small" style={{ fontWeight: '600' }} numberOfLines={1}>{user?.name || 'Director'}</T>
          <T variant="mono" style={{ fontSize: 10, color: colors.textMuted }}>Producer</T>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={signOut} hitSlop={8}>
          <Icon name="logout" size={17} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

export function TopNav({ title, subtitle, breadcrumb }: { title?: string; subtitle?: string; breadcrumb?: string }) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.topnav, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
      <View style={{ flex: 1, gap: 2 }}>
        {breadcrumb ? (
          <T variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
            {breadcrumb}
          </T>
        ) : null}
        {title ? <T variant="h2">{title}</T> : null}
        {subtitle ? <T variant="small" muted>{subtitle}</T> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {/* Real-time Health Pill */}
        <View style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.pulseDot, { backgroundColor: colors.success }]} />
          <T variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>ALL SERVICES ACTIVE</T>
        </View>

        {/* Quick Action Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/studio' as any)}
          style={({ pressed, hovered }: any) => [
            styles.quickBtn,
            { backgroundColor: hovered ? colors.primaryPressed : colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Icon name="plus" size={16} color={colors.onPrimary} />
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.onPrimary }}>New Reel</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function BottomNav() {
  const { colors } = useTheme();
  const path = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const primaryItems = [
    { href: '/', label: 'Overview', icon: 'grid' as const },
    { href: '/studio', label: 'Studio', icon: 'camera' as const },
    { href: '/storyboard', label: 'Storyboard', icon: 'layers' as const },
    { href: '/intelligence', label: 'Intel', icon: 'cpu' as const },
    { href: '/settings', label: 'Settings', icon: 'settings' as const },
  ];

  return (
    <View style={[styles.bottom, { backgroundColor: colors.sidebar, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {primaryItems.map((n) => {
        const on = isActive(path, n.href);
        return (
          <Pressable
            key={n.href}
            accessibilityRole="tab"
            accessibilityLabel={n.label}
            accessibilityState={{ selected: on }}
            onPress={() => router.navigate(n.href as any)}
            style={styles.tab}
          >
            <Icon name={n.icon} size={20} color={on ? colors.primary : colors.textFaint} />
            <Text style={{ fontFamily: font.medium, fontSize: 10, color: on ? colors.primary : colors.textFaint }}>
              {n.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  side: { width: 250, borderRightWidth: 1, paddingVertical: spacing.lg, paddingHorizontal: spacing.md, gap: spacing.md },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 6, paddingTop: 2 },
  logo: { width: 30, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  workspaceCard: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, marginHorizontal: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, height: 38, borderRadius: radius.sm, borderLeftWidth: 3 },
  user: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: spacing.md, borderTopWidth: 1, paddingHorizontal: 4 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  topnav: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  pulseDot: { width: 6, height: 6, borderRadius: 3 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.md },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', borderTopWidth: 1, paddingTop: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 46 },
});
