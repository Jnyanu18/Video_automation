import React from 'react';
import { Pressable, StyleSheet, Text, View, Platform, ScrollView } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from './Icon';
import { T, Badge } from './ui';
import { font, radius, spacing, useTheme } from '../theme';
import { useAuth } from '../state/auth';
import { useDevMode } from '../state/devMode';

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

export const BASE_NAV_SECTIONS: NavSection[] = [
  {
    title: 'WORKSPACE',
    items: [
      { href: '/', label: 'Overview', icon: 'grid' },
      { href: '/studio', label: 'AI Studio', icon: 'camera' },
      { href: '/storyboard', label: 'Storyboard', icon: 'layers' },
      { href: '/motion', label: 'Motion Graphics', icon: 'zap' },
      { href: '/timeline', label: 'Timeline Editor', icon: 'sliders' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { href: '/series', label: 'Series Engine', icon: 'tv' },
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

export const DEVELOP_NAV_ITEMS: NavItem[] = [
  { href: '/vstudio', label: 'Vishnu Studio', icon: 'film' },
  { href: '/styles', label: 'Style DNA', icon: 'sparkles' },
  { href: '/footage', label: 'Footage Intelligence', icon: 'eye' },
  { href: '/versions', label: 'Multi-Version Studio', icon: 'copy' },
  { href: '/intelligence', label: 'Content Intelligence', icon: 'cpu' },
  { href: '/qa', label: 'Render QA', icon: 'check-circle' },
];

export const DEVELOP_NAV_SECTION: NavSection = {
  title: 'DEVELOP',
  items: DEVELOP_NAV_ITEMS,
};

export const NAV_SECTIONS: NavSection[] = BASE_NAV_SECTIONS;

function isActive(path: string, href: string) {
  if (href === '/') return path === '/' || path === '/(app)';
  return path === href || path.startsWith(href + '/');
}

export function Sidebar() {
  const { colors } = useTheme();
  const path = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { devMode } = useDevMode();

  const sections = devMode
    ? [...BASE_NAV_SECTIONS.slice(0, 2), DEVELOP_NAV_SECTION, ...BASE_NAV_SECTIONS.slice(2)]
    : BASE_NAV_SECTIONS;

  return (
    <View style={[styles.side, { backgroundColor: colors.sidebar, borderRightColor: colors.border }]}>
      {/* Brand Header */}
      <View style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Icon name="sparkles" size={17} color={colors.onPrimary} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <T variant="h3" style={{ letterSpacing: 0.3, fontWeight: '700' }}>GROWTHOS</T>
          <T variant="mono" style={{ fontSize: 9, color: colors.primary, letterSpacing: 1.4, fontWeight: '500' }}>CREATIVE STUDIO</T>
        </View>
      </View>

      {/* Workspace Selector Pill */}
      <View style={[styles.workspaceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
        <T variant="small" style={{ flex: 1, fontFamily: font.mono, fontWeight: '500' }} numberOfLines={1}>Rockcastle Studio</T>
        <T variant="mono" style={{ fontSize: 10, color: colors.textFaint }}>v2.4</T>
      </View>

      {/* Navigation Sections */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.sm }} style={{ flex: 1 }}>
        {sections.map((sec) => (
          <View key={sec.title} style={{ gap: 3 }}>
            <T variant="label" style={{ fontSize: 10, color: colors.textFaint, paddingHorizontal: 12, marginBottom: 4, letterSpacing: 1.1 }}>
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
                  style={({ pressed, hovered }: any) => [
                    styles.item,
                    {
                      backgroundColor: on
                        ? 'rgba(255, 90, 31, 0.12)'
                        : hovered
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'transparent',
                      borderColor: on
                        ? 'rgba(255, 90, 31, 0.28)'
                        : 'transparent',
                    },
                    Platform.OS === 'web' && ({
                      cursor: 'pointer',
                      transition: 'all 120ms cubic-bezier(0.16, 1, 0.3, 1)',
                      transform: pressed ? 'scale(0.98)' : 'none',
                    } as any),
                  ]}
                >
                  <Icon name={n.icon} size={17} color={on ? colors.primary : colors.textMuted} />
                  <Text
                    style={{
                      fontFamily: on ? font.semibold : font.medium,
                      fontSize: 13,
                      color: on ? colors.text : colors.textMuted,
                      flex: 1,
                    }}
                  >
                    {n.label}
                  </Text>
                  {on ? (
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary }} />
                  ) : n.badge ? (
                    <Badge label={n.badge} tone="info" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* User Footer */}
      <View style={[styles.user, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 1 }]}>
          <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.primary }}>
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <T variant="small" style={{ fontWeight: '600' }} numberOfLines={1}>{user?.name || user?.email || 'Director'}</T>
          <T variant="mono" style={{ fontSize: 10, color: colors.textMuted }}>Producer</T>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={signOut}
          hitSlop={8}
          style={({ hovered }: any) => [
            styles.logoutBtn,
            { backgroundColor: hovered ? colors.surfaceAlt : 'transparent' },
            Platform.OS === 'web' && ({ cursor: 'pointer', transition: 'background-color 150ms ease' } as any),
          ]}
        >
          <Icon name="logout" size={16} color={colors.textMuted} />
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
          <T variant="mono" style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 0.5 }}>
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
          <T variant="mono" style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 0.5 }}>ALL SERVICES ACTIVE</T>
        </View>

        {/* Quick Action Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/studio' as any)}
          style={({ pressed, hovered }: any) => [
            styles.quickBtn,
            { backgroundColor: hovered ? colors.primaryPressed : colors.primary },
            pressed && { opacity: 0.9 },
            Platform.OS === 'web' && ({
              cursor: 'pointer',
              transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)',
              transform: pressed ? 'scale(0.97)' : hovered ? 'translateY(-1px)' : 'none',
              boxShadow: '0 2px 8px rgba(255, 90, 31, 0.3)',
            } as any),
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
    { href: '/media', label: 'Media', icon: 'music' as const },
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
  side: { width: 260, borderRightWidth: 1, paddingVertical: spacing.lg, paddingHorizontal: spacing.md, gap: spacing.md },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, paddingTop: 2 },
  logo: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  workspaceCard: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, marginHorizontal: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, height: 38, borderRadius: radius.md, borderWidth: 1 },
  user: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.md, borderWidth: 1, marginTop: 2 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { padding: 6, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  topnav: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  pulseDot: { width: 7, height: 7, borderRadius: 4 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, paddingVertical: 8, borderRadius: radius.md },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', borderTopWidth: 1, paddingTop: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 46 },
});
