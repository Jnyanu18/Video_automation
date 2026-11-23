import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { BottomNav, ChoppityHeader, ChoppityIconRail } from '../../components/Navigation';
import { ChoppityBanner } from '../../components/ChoppityBanner';
import { useWide } from '../../components/useWide';
import { useTheme } from '../../theme';

/**
 * Choppity-Style SaaS Layout:
 * - Fixed-width left icon rail (56-60px) with active soft tint and bottom utility group
 * - Full-width white header with mode pill switcher and user avatar
 * - Dismissible peach->lavender alert banner
 * - Centered, readable content column (max 860px)
 */
export default function AppLayout() {
  const wide = useWide();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      {/* 1. Left Icon Rail (Desktop/Tablet) */}
      {wide ? <ChoppityIconRail /> : null}

      {/* 2. Main Application Column */}
      <View style={{ flex: 1, flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Full-width Top Header */}
        <ChoppityHeader />

        {/* Global Dismissible Alert Banner */}
        <ChoppityBanner />

        {/* Content Area */}
        <View style={{ flex: 1 }}>
          <Slot />
        </View>

        {/* Mobile Bottom Bar */}
        {!wide ? <BottomNav /> : null}
      </View>
    </View>
  );
}

