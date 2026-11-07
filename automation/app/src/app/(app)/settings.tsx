import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Badge, Banner, Button, Card, ErrorState, SectionTitle, Skeleton, T } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { get, getBaseUrl, isWeb } from '../../api/client';
import type { SettingsData } from '../../api/types';
import { useAuth } from '../../state/auth';
import { useQuery } from '../../state/useQuery';
import { spacing, statusTone, useTheme } from '../../theme';

const NAMES: Record<string, string> = {
  n8n: 'n8n workflows', airtable: 'Airtable', apify: 'Apify (reel scraping)', openai: 'OpenAI (writing)', heygen: 'HeyGen (video)', blotato: 'Blotato (Instagram)',
};

export default function Settings() {
  const { colors } = useTheme();
  const { signOut, user } = useAuth();
  const [fresh, setFresh] = useState(0);
  const { data, error, loading, refreshing, refresh, retry } = useQuery<SettingsData>(() => get('/api/settings' + (fresh ? '?refresh=1' : '')), [fresh], { live: false });

  const w = data?.workflows;
  const items = Object.entries(w?.integrations ?? {});

  return (
    <Screen title="Settings" subtitle="Connection health for every service in the pipeline." onRefresh={refresh} refreshing={refreshing} narrow
      actions={<Button label="Re-check" icon="refresh" small onPress={() => setFresh((n) => n + 1)} />}>
      {loading && !data ? <View style={{ gap: spacing.sm }}>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={64} style={{ borderRadius: 16 }} />)}</View> : null}
      {error && !data ? <ErrorState message={error} onRetry={retry} /> : null}

      {data ? (
        <>
          {w?.ok === false ? <Banner tone="warning">Workflow layer unavailable: {w.error || 'unknown'}{w.message ? ` — ${w.message}` : ''}</Banner> : null}
          <View>
            <SectionTitle title="Integrations" />
            <View style={{ gap: spacing.sm }}>
              {items.length ? items.map(([key, i]) => (
                <Card key={key}>
                  <View style={styles.row}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="h3">{NAMES[key] ?? key}</T>
                      {i.message ? <T variant="small" muted>{i.message}</T> : null}
                      {i.missing?.length ? <T variant="small" color={colors.warning}>Missing: {i.missing.join(', ')}</T> : null}
                      {i.account && (i.account.username || i.account.name || i.account.id) ? <T variant="small" faint>Instagram: {i.account.username || i.account.name || i.account.id}</T> : null}
                    </View>
                    <Badge label={i.status === 'connected' ? 'Connected' : i.status === 'unconfigured' ? 'Not set up' : 'Error'} tone={statusTone(i.status)} dot />
                  </View>
                </Card>
              )) : <Card><T muted>No integration data yet.</T></Card>}
            </View>
          </View>

          <View>
            <SectionTitle title="Account" />
            <Card style={{ gap: spacing.md }}>
              <View style={styles.row}>
                <Icon name="server" size={18} color={colors.textMuted} />
                <T variant="small" muted style={{ flex: 1 }} numberOfLines={1}>{isWeb ? 'This server' : getBaseUrl()}</T>
              </View>
              <T variant="small" muted>Signed in as {user?.name || 'user'}.</T>
              <Button label="Sign out" icon="logout" onPress={signOut} />
            </Card>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md } });
