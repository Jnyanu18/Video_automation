import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { BottomNav, Sidebar } from '../../components/Navigation';
import { useWide } from '../../components/useWide';
import { useTheme } from '../../theme';

/** Responsive shell: sidebar on desktop widths, bottom tab bar on phones. */
export default function AppLayout() {
  const wide = useWide();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      {wide ? <Sidebar /> : null}
      <View style={{ flex: 1 }}>
        <Slot />
        {!wide ? <BottomNav /> : null}
      </View>
    </View>
  );
}
