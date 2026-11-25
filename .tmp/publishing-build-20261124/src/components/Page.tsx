import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { T } from './ui';
import { spacing, useTheme } from '../theme';

/** Shared shell for studio screens: full-width responsive layout fitting both left and right. */
export function Page({
  title,
  subtitle,
  actions,
  children,
  maxWidth,
  contentGap,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number | string;
  contentGap?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          contentGap !== undefined ? { gap: contentGap } : null,
          maxWidth ? { maxWidth, alignSelf: 'center' } : null,
        ]}
      >
        {title ? (
          <View style={styles.header}>
            <View style={{ gap: 2 }}>
              <T variant="h1" style={{ fontSize: 22, fontWeight: '700' }}>{title}</T>
              {subtitle ? <T variant="small" muted>{subtitle}</T> : null}
            </View>
            {actions ? <View>{actions}</View> : null}
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
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    marginBottom: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});

export const Row = ({ children, gap = spacing.md, style }: { children: React.ReactNode; gap?: number; style?: any }) => (
  <View style={[{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap }, style]}>{children}</View>
);
