import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { TopNav } from './Navigation';
import { MAX_CONTENT_WIDTH, spacing, useTheme } from '../theme';

/** Shared shell for the studio screens: top bar + a centred, scrolling content column. */
export function Page({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopNav title={title} subtitle={subtitle} />
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingBottom: spacing.xxl * 2 },
});

export const Row = ({ children, gap = spacing.md, style }: { children: React.ReactNode; gap?: number; style?: any }) => (
  <View style={[{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap }, style]}>{children}</View>
);
