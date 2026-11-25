import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Page } from '../../components/Page';
import { Badge, Button, Card, ErrorState, Skeleton, T } from '../../components/ui';
import { get, errorText } from '../../api/client';
import { editor } from '../../api/editor';
import { useAuth } from '../../state/auth';
import { spacing } from '../../theme';

export default function Settings() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [accounts, setAccounts] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [settingsResult, healthResult, accountsResult] = await Promise.all([
        get('/api/editor/settings'), editor.health(), editor.accounts(),
      ]);
      setSettings(settingsResult);
      setHealth(healthResult);
      setAccounts(accountsResult);
      setError(null);
    } catch (e) {
      setError(errorText(e));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Page title="Settings" subtitle="Current configuration and connection status">
      {error && !settings ? <ErrorState message={error} onRetry={load} /> : null}
      {!settings && !error ? <Skeleton /> : null}
      {settings ? (
        <>
          <Card>
            <View style={{ gap: spacing.sm }}>
              <T variant="h3">Editor defaults</T>
              <T>Style: {settings.settings?.default_style || 'Not configured'}</T>
              <T variant="small" muted>Prompt: {settings.settings?.default_prompt || 'Not configured'}</T>
            </View>
          </Card>
          <Card>
            <View style={{ gap: spacing.sm }}>
              <T variant="h3">Integrations</T>
              <Badge label={health?.summary?.core_ready ? 'Core ready' : 'Core needs attention'} tone={health?.summary?.core_ready ? 'success' : 'warning'} />
              {(health?.services ?? []).map((service: any, index: number) => (
                <T key={index} variant="small">{service.name || service.id}: {service.status || 'unknown'}</T>
              ))}
            </View>
          </Card>
          <Card>
            <View style={{ gap: spacing.sm }}>
              <T variant="h3">Publishing accounts</T>
              {(accounts?.accounts ?? []).length === 0 ? <T muted>No publishing accounts connected.</T> : null}
              {(accounts?.accounts ?? []).map((account: any, index: number) => (
                <T key={index}>{account.platform || 'Platform'}: {account.name || account.username || account.id || 'Connected'}</T>
              ))}
              <Button label="Open publishing" variant="secondary" onPress={() => router.push('/publishing')} />
            </View>
          </Card>
          <Button label="Refresh status" variant="secondary" onPress={load} />
          <Button label="Sign out" variant="secondary" onPress={signOut} />
        </>
      ) : null}
    </Page>
  );
}
