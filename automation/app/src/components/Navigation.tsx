import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform, ScrollView } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from './Icon';
import { T, Badge } from './ui';
import { font, radius, spacing, useTheme } from '../theme';
import { useAuth } from '../state/auth';
import { useDevMode } from '../state/devMode';
import { useToast } from '../state/toast';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: string;
  action?: () => void;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const BASE_NAV_SECTIONS: NavSection[] = [
  {
    title: 'STUDIO',
    items: [
      { href: '/', label: 'Projects', icon: 'folder' },
      { href: '/storyboard', label: 'Storyboard', icon: 'layers' },
      { href: '/timeline', label: 'Timeline Editor', icon: 'sliders' },
      { href: '/creator-studio', label: 'Creator Studio', icon: 'film' },
      { href: '/motion', label: 'Motion Graphics', icon: 'zap' },
    ],
  },
  {
    title: 'ASSETS & INTEL',
    items: [
      { href: '/footage', label: 'Footage Intelligence', icon: 'database' },
      { href: '/styles', label: 'Style DNA & Templates', icon: 'sparkles' },
      { href: '/editing-memory', label: 'Editing Memory', icon: 'clock' },
      { href: '/media', label: 'Media Library', icon: 'music' },
    ],
  },
  {
    title: 'DISTRIBUTION',
    items: [
      { href: '/publishing', label: 'Calendar & Queue', icon: 'calendar' },
      { href: '/analytics', label: 'Analytics', icon: 'bar-chart' },
      { href: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

export const DEVELOP_NAV_ITEMS: NavItem[] = [
  { href: '/creator-studio', label: 'Creator Studio', icon: 'film' },
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

/**
 * Choppity-Style Fixed-Width Left Icon Rail (≈56-64px)
 * Vertically stacked icon-only navigation with generous spacing.
 * Bottom section houses Settings, Tutorials, Community, Refer & Earn, and an Expand chevron.
 */
export function ChoppityIconRail() {
  const { colors } = useTheme();
  const path = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);

  const primaryRailItems: NavItem[] = [
    { href: '/', label: 'Projects', icon: 'folder' },
    { href: '/styles', label: 'Templates', icon: 'sparkles' },
    { href: '/publishing', label: 'Calendar', icon: 'calendar' },
    { href: '/analytics', label: 'Analytics', icon: 'bar-chart' },
    { href: '/publishing', label: 'Social Share', icon: 'share' },
    { href: '/footage', label: 'Storage', icon: 'database' },
  ];

  const bottomRailItems: { label: string; icon: IconName; href?: string; action?: () => void }[] = [
    { label: 'Settings', icon: 'settings', href: '/settings' },
    { label: 'Tutorials', icon: 'book', href: '/demo' },
    { label: 'Community', icon: 'inbox', action: () => toast('Community Discord: Coming soon to AILO Studio!') },
    { label: 'Refer & Earn', icon: 'gift', action: () => toast('Referral Program: Earn 30% recurring creator credit!') },
  ];

  const railWidth = expanded ? 200 : 60;

  return (
    <View style={[styles.iconRail, { width: railWidth, backgroundColor: colors.sidebar, borderRightColor: colors.border }]}>
      {/* Top Section: Primary Mode Icons */}
      <View style={styles.railTopGroup}>
        {primaryRailItems.map((item) => {
          const on = isActive(path, item.href);
          return (
            <Pressable
              key={item.label}
              accessibilityRole="link"
              accessibilityLabel={item.label}
              onPress={() => router.navigate(item.href as any)}
              // @ts-ignore web-only tooltip title
              title={Platform.OS === 'web' && !expanded ? item.label : undefined}
              style={({ pressed, hovered }: any) => [
                styles.railItem,
                expanded && styles.railItemExpanded,
                on && { backgroundColor: 'rgba(108, 76, 240, 0.12)' },
                !on && hovered && { backgroundColor: colors.surfaceAlt },
                pressed && { opacity: 0.8 },
                Platform.OS === 'web' && ({
                  cursor: 'pointer',
                  transition: 'all 140ms ease',
                  transform: pressed ? 'scale(0.96)' : 'none',
                } as any),
              ]}
            >
              <View style={[styles.iconBadge, on && { backgroundColor: 'transparent' }]}>
                <Icon name={item.icon} size={20} color={on ? colors.primary : colors.textMuted} />
              </View>
              {expanded ? (
                <Text
                  style={{
                    fontFamily: on ? font.semibold : font.medium,
                    fontSize: 13,
                    color: on ? colors.primary : colors.text,
                    marginLeft: 8,
                  }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Divider */}
      <View style={[styles.railDivider, { backgroundColor: colors.border }]} />

      {/* Bottom Section: Utility & Settings Icons */}
      <View style={styles.railBottomGroup}>
        {bottomRailItems.map((item) => {
          const on = item.href ? isActive(path, item.href) : false;
          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => {
                if (item.action) item.action();
                else if (item.href) router.navigate(item.href as any);
              }}
              // @ts-ignore web-only tooltip title
              title={Platform.OS === 'web' && !expanded ? item.label : undefined}
              style={({ pressed, hovered }: any) => [
                styles.railItem,
                expanded && styles.railItemExpanded,
                on && { backgroundColor: 'rgba(108, 76, 240, 0.12)' },
                !on && hovered && { backgroundColor: colors.surfaceAlt },
                pressed && { opacity: 0.8 },
                Platform.OS === 'web' && ({
                  cursor: 'pointer',
                  transition: 'all 140ms ease',
                } as any),
              ]}
            >
              <View style={styles.iconBadge}>
                <Icon name={item.icon} size={19} color={on ? colors.primary : colors.textFaint} />
              </View>
              {expanded ? (
                <Text
                  style={{
                    fontFamily: font.medium,
                    fontSize: 13,
                    color: on ? colors.primary : colors.textMuted,
                    marginLeft: 8,
                  }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}

        {/* Expand / Collapse Toggle Chevron */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          onPress={() => setExpanded(!expanded)}
          // @ts-ignore
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          style={({ pressed, hovered }: any) => [
            styles.railItem,
            expanded && styles.railItemExpanded,
            hovered && { backgroundColor: colors.surfaceAlt },
            pressed && { opacity: 0.8 },
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
        >
          <View style={styles.iconBadge}>
            <Icon name={expanded ? 'chevron-left' : 'chevron-right'} size={18} color={colors.textFaint} />
          </View>
          {expanded ? (
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.textFaint, marginLeft: 8 }}>
              Collapse
            </Text>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Choppity-Style Top Header Bar (Full width, white, thin border)
 * Houses Logo, Horizontal Mode Pill Segmented Control, and User Avatar
 */
export function ChoppityHeader() {
  const { colors } = useTheme();
  const path = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const modes: { label: string; href: string }[] = [
    { label: 'Auto-Clipper', href: '/' },
    { label: 'Storyboard', href: '/storyboard' },
    { label: 'Timeline', href: '/timeline' },
    { label: 'Creator Studio', href: '/creator-studio' },
    { label: 'Brand Kit', href: '/styles' },
  ];

  return (
    <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {/* Far Left: Logo + Wordmark */}
      <Pressable onPress={() => router.push('/')} style={styles.headerLogoGroup}>
        <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
          <Icon name="sparkles" size={17} color={colors.onPrimary} />
        </View>
        <View style={{ gap: 1 }}>
          <T variant="h3" style={{ fontSize: 15, fontWeight: '700', letterSpacing: -0.3 }}>
            GROWTHOS
          </T>
          <T variant="mono" style={{ fontSize: 9, color: colors.primary, letterSpacing: 1.2, fontWeight: '600' }}>
            STUDIO
          </T>
        </View>
      </Pressable>

      {/* Center: Mode Pill Segmented Control */}
      <View style={[styles.pillSegmentGroup, { backgroundColor: '#F1F5F9', borderColor: colors.border }]}>
        {modes.map((m) => {
          const on = isActive(path, m.href);
          return (
            <Pressable
              key={m.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => router.navigate(m.href as any)}
              style={({ pressed, hovered }: any) => [
                styles.pillTab,
                on && [
                  styles.pillTabActive,
                  Platform.OS === 'web' && ({
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
                  } as any),
                ],
                !on && hovered && { backgroundColor: 'rgba(255, 255, 255, 0.5)' },
                pressed && { opacity: 0.9 },
                Platform.OS === 'web' && ({
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                } as any),
              ]}
            >
              <Text
                style={{
                  fontFamily: on ? font.semibold : font.medium,
                  fontSize: 13,
                  color: on ? colors.text : colors.textMuted,
                }}
              >
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Far Right: Status Pill & User Avatar */}
      <View style={styles.headerRightGroup}>
        <View style={[styles.statusPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
          <Text style={{ fontFamily: font.mono, fontSize: 10, color: colors.textMuted, letterSpacing: 0.5 }}>
            ONLINE
          </Text>
        </View>

        {/* Circular Avatar */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="User profile"
          onPress={() => router.push('/settings')}
          style={({ pressed, hovered }: any) => [
            styles.avatarCircle,
            { backgroundColor: colors.primary },
            hovered && { transform: [{ scale: 1.05 }] },
            pressed && { opacity: 0.9 },
            Platform.OS === 'web' && ({
              cursor: 'pointer',
              transition: 'transform 140ms ease',
              boxShadow: '0 2px 6px rgba(108, 76, 240, 0.3)',
            } as any),
          ]}
        >
          <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.onPrimary }}>
            {(user?.name || user?.email || 'J').charAt(0).toUpperCase()}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// Re-export alias for backward compatibility
export const Sidebar = ChoppityIconRail;
export const TopNav = ChoppityHeader;

export function BottomNav() {
  const { colors } = useTheme();
  const path = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const primaryItems = [
    { href: '/', label: 'Clipper', icon: 'folder' as const },
    { href: '/storyboard', label: 'Storyboard', icon: 'layers' as const },
    { href: '/timeline', label: 'Timeline', icon: 'sliders' as const },
    { href: '/publishing', label: 'Publish', icon: 'calendar' as const },
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
  /* Choppity Left Icon Rail */
  iconRail: {
    borderRightWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  railTopGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  railBottomGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  railDivider: {
    width: '80%',
    height: 1,
    marginVertical: spacing.sm,
  },
  railItem: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railItemExpanded: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  iconBadge: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Choppity Full-Width Top Header */
  headerBar: {
    height: 56,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    zIndex: 9,
  },
  headerLogoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSegmentGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTabActive: {
    backgroundColor: '#FFFFFF',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Mobile Bottom Nav */
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', borderTopWidth: 1, paddingTop: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 46 },
});
