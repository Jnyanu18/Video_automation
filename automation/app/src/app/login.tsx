import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner, Button, Card, Field, Input, T } from '../components/ui';
import { Icon } from '../components/Icon';
import { errorText, getBaseUrl, isWeb, saveServerUrl } from '../api/client';
import { useAuth } from '../state/auth';
import { radius, spacing, useTheme } from '../theme';

export default function Login() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, recheck } = useAuth();
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [server, setServer] = useState(getBaseUrl());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!password) return setError('Enter your password.');
    setBusy(true);
    setError(null);
    try {
      if (!isWeb) {
        await saveServerUrl(server);
      }
      await signIn(password, name.trim() || undefined);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.wrap}>
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}><Icon name="film" size={28} color={colors.onPrimary} /></View>
            <T variant="h1" style={{ textAlign: 'center' }}>Reels Automation</T>
            <T muted style={{ textAlign: 'center' }}>Sign in to review, approve and publish your reels.</T>
          </View>
          <Card style={{ gap: spacing.lg }}>
            {!isWeb ? (
              <Field label="Server address" hint="Where your dashboard backend is running.">
                <Input value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://reels.example.com" />
              </Field>
            ) : null}
            <Field label="Password">
              <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password"
                placeholder="Dashboard password" onSubmitEditing={submit} returnKeyType="go" autoFocus={isWeb} />
            </Field>
            <Field label="Your name" hint="Optional. Shown next to approvals.">
              <Input value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder="e.g. Alex" onSubmitEditing={submit} />
            </Field>
            {error ? <Banner tone="danger">{error}</Banner> : null}
            <Button label="Sign in" variant="primary" full loading={busy} onPress={submit} />
          </Card>
          {!isWeb ? <Button label="Retry connection" variant="ghost" icon="refresh" onPress={() => { saveServerUrl(server).then(recheck); }} /> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  wrap: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: spacing.xl, alignItems: 'stretch' },
  brand: { alignItems: 'center', gap: spacing.sm },
  logo: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
});
