import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { T } from './ui';
import { MAX_CONTENT_WIDTH, spacing, useTheme } from '../theme';

/** Shared shell for studio screens: centered, readable content column (max 860px). */
export function Page({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {title ? (
          <View style={{ marginBottom: spacing.xs, gap: 2 }}>
            <T variant="h1" style={{ fontSize: 22, fontWeight: '700' }}>{title}</T>
            {subtitle ? <T variant="small" muted>{subtitle}</T> : null}
          </View>
        ) : null}
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingBottom: spacing.xxl * 2,
  },
});

export const Row = ({ children, gap = spacing.md, style }: { children: React.ReactNode; gap?: number; style?: any }) => (
  <View style={[{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap }, style]}>{children}</View>
);
