import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from './Icon';
import { T } from './ui';
import { font, radius, spacing, useTheme } from '../theme';
import { useAuth } from '../state/auth';

export const NAV: { href: '/' | '/reels' | '/new' | '/settings'; label: string; icon: IconName }[] = [
  { href: '/', label: 'Dashboard', icon: 'home' },
  { href: '/reels', label: 'Reels', icon: 'film' },
  { href: '/new', label: 'New reel', icon: 'plus' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

function isActive(path: string, href: string) {
  return href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
}

export function Sidebar() {
  const { colors } = useTheme();
  const path = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  return (
    <View style={[styles.side, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
      <View style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}><Icon name="film" size={18} color={colors.onPrimary} /></View>
        <T variant="h3">Reels Automation</T>
      </View>
      <View style={{ gap: 4 }}>
        {NAV.map((n) => {
          const on = isActive(path, n.href);
          return (
            <Pressable key={n.href} accessibilityRole="link" accessibilityState={{ selected: on }} onPress={() => router.navigate(n.href)}
              style={({ hovered }: any) => [styles.item, { backgroundColor: on ? colors.primarySoft : hovered ? colors.surfaceAlt : 'transparent' }]}>
              <Icon name={n.icon} size={19} color={on ? colors.primary : colors.textMuted} />
              <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 14, color: on ? colors.primary : colors.text }}>{n.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1 }} />
      <View style={[styles.user, { borderTopColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <Text style={{ fontFamily: font.bold, color: colors.primary }}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <T variant="label" style={{ flex: 1 }} numberOfLines={1}>{user?.name || 'Signed in'}</T>
        <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={signOut} hitSlop={8}>
          <Icon name="logout" size={18} color={colors.textMuted} />
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
  return (
    <View style={[styles.bottom, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {NAV.map((n) => {
        const on = isActive(path, n.href);
        const isNew = n.href === '/new';
        return (
          <Pressable key={n.href} accessibilityRole="tab" accessibilityLabel={n.label} accessibilityState={{ selected: on }}
            onPress={() => router.navigate(n.href)} style={styles.tab}>
            {isNew ? (
              <View style={[styles.fab, { backgroundColor: colors.primary }]}><Icon name="plus" size={22} color={colors.onPrimary} /></View>
            ) : (
              <>
                <Icon name={n.icon} size={22} color={on ? colors.primary : colors.textFaint} />
                <Text style={{ fontFamily: font.medium, fontSize: 11, color: on ? colors.primary : colors.textFaint }}>{n.label}</Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  side: { width: 248, borderRightWidth: 1, padding: spacing.lg, gap: spacing.xl },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 6, paddingTop: 4 },
  logo: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 42, borderRadius: radius.md },
  user: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: spacing.md, borderTopWidth: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', borderTopWidth: 1, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 48 },
  fab: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: -18 },
});
