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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState(getBaseUrl());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim()) return setError('Enter the email address your account was created with.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('That does not look like an email address.');
    if (!password) return setError('Enter your password.');
    setBusy(true);
    setError(null);
    try {
      if (!isWeb) {
        await saveServerUrl(server);
      }
      await signIn(email, password);
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
            <T muted style={{ textAlign: 'center' }}>Sign in with the account you were invited with. Your reels, storyboards and renders are yours alone.</T>
          </View>
          <Card style={{ gap: spacing.lg }}>
            {!isWeb ? (
              <Field label="Server address" hint="Where your dashboard backend is running.">
                <Input value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://reels.example.com" />
              </Field>
            ) : null}
            <Field label="Email">
              <Input value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
                autoComplete="email" textContentType="emailAddress" placeholder="you@company.com" onSubmitEditing={submit}
                returnKeyType="next" autoFocus={isWeb} />
            </Field>
            <Field label="Password">
              <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password"
                placeholder="Your password" onSubmitEditing={submit} returnKeyType="go" />
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
