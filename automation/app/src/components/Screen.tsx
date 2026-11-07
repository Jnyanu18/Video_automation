import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, T } from './ui';
import { BREAKPOINT_WIDE, MAX_CONTENT_WIDTH, spacing, useTheme } from '../theme';
import { useWide } from './useWide';

/** Page scaffold: scrolling, centered max-width content, title row, pull-to-refresh on mobile. */
export function Screen({ title, subtitle, actions, onBack, onRefresh, refreshing, children, narrow }: {
  title: string; subtitle?: string; actions?: React.ReactNode; onBack?: () => void;
  onRefresh?: () => void; refreshing?: boolean; children: React.ReactNode; narrow?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const wide = useWide();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: (wide ? spacing.xl : insets.top + spacing.md),
        paddingBottom: spacing.xxl + (wide ? 0 : 88),
        paddingHorizontal: wide ? spacing.xl : spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
    >
      <View style={[styles.inner, { maxWidth: narrow ? 640 : MAX_CONTENT_WIDTH }]}>
        <View style={styles.head}>
          {onBack ? <View style={{ marginLeft: -8 }}><IconButton icon="back" label="Back" onPress={onBack} /></View> : null}
          <View style={{ flex: 1 }}>
            <T variant="h1" accessibilityRole="header" numberOfLines={2}>{title}</T>
            {subtitle ? <T muted style={{ marginTop: 2 }}>{subtitle}</T> : null}
          </View>
          {actions}
        </View>
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inner: { width: '100%', alignSelf: 'center', gap: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
});

export { BREAKPOINT_WIDE };
