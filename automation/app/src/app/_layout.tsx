import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
} from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from '../state/auth';
import { LiveProvider } from '../state/live';
import { ToastProvider } from '../state/toast';
import { useTheme } from '../theme';

function Gate() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useTheme();
  const onLogin = segments[0] === 'login';

  useEffect(() => {
    if (status === 'signedOut' && !onLogin) router.replace('/login');
    if (status === 'signedIn' && onLogin) router.replace('/');
  }, [status, onLogin, router]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return <Slot />;
}

export default function RootLayout() {
  const { isDark, colors } = useTheme();
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthProvider>
        <LiveProvider>
          <ToastProvider>
            <View style={{ flex: 1, backgroundColor: colors.bg }}>
              <Gate />
            </View>
          </ToastProvider>
        </LiveProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
