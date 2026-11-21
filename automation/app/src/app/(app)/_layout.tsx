import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { LeftRail, TopHeader } from '../../components/Navigation';
import { useTheme } from '../../theme';

/**
 * Choppity-Style Global Shell:
 * - Fixed Left Icon Rail (≈60px, expandable)
 * - Top Header Bar (Full width, segmented control for core modes)
 * - Main Content Area
 */
export default function AppLayout() {
  const { colors } = useTheme();

  return (
    <View style={[styles.shellContainer, { backgroundColor: colors.bg }]}>
      {/* Left Icon Rail */}
      <LeftRail />

      {/* Main Right Area */}
      <View style={styles.mainRightColumn}>
        {/* Top Header */}
        <TopHeader />

        {/* Page Content Slot */}
        <View style={styles.contentViewport}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shellContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  },
  mainRightColumn: {
    flex: 1,
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  contentViewport: {
    flex: 1,
    width: '100%',
  },
});
