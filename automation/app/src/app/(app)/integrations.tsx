import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Page, Row } from '../../components/Page';
import { Badge, Banner, Button, Card, SectionTitle, Skeleton, T } from '../../components/ui';
import { errorText, get } from '../../api/client';
import { ServiceHealth, editor } from '../../api/editor';
import { Tone, spacing } from '../../theme';

const tone = (s: string): Tone => (s === 'ONLINE' || s === 'connected' ? 'success' : s === 'STANDBY' || s === 'unconfigured' ? 'neutral' : s === 'CONFIG_REQUIRED' ? 'warning' : 'danger');
const LABEL: Record<string, string> = { n8n: 'n8n', airtable: 'Airtable', apify: 'Apify (reel scraping)', openai: 'LLM / speech-to-text (OpenAI-compatible)', heygen: 'HeyGen (avatar video)', blotato: 'Blotato / Postiz (publishing)' };

export default function Integrations() {
  const [services, setServices] = useState<ServiceHealth[] | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [providers, setProviders] = useState<any>(null);
  const [provErr, setProvErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async (force = false) => {
    setBusy(true);
    const [h, s] = await Promise.allSettled([editor.health(), get('/api/settings' + (force ? '?refresh=1' : ''))]);
    if (h.status === 'fulfilled') { setServices(h.value.services); setSummary(h.value.summary); setError(null); } else setError(errorText(h.reason));
    if (s.status === 'fulfilled') { setProviders(s.value); setProvErr(s.value.workflows?.ok === false ? s.value.workflows.message || s.value.workflows.error : null); } else setProvErr(errorText(s.reason));
    setBusy(false);
  }, []);
  useEffect(() => { check(); }, [check]);

  return (
    <Page title="Integrations" subtitle="Everything below is probed live, not assumed">
      <Row style={{ justifyContent: 'space-between' }}>
        <T muted>{summary ? `${summary.online} of ${summary.total} studio services online` : 'Checking…'}</T>
        <Button label={busy ? 'Probing…' : 'Re-check everything'} icon="refresh" loading={busy} onPress={() => check(true)} />
      </Row>
      {error ? <Banner tone="danger">The AI editor service did not answer: {error}. Start it with the stack launcher.</Banner> : null}
      {summary && !summary.core_ready ? <Banner tone="warning">Not ready for end-to-end editing: {summary.core_issues.join(', ')}.</Banner> : null}

      <SectionTitle title="Studio services" />
      {!services ? <Skeleton height={200} /> : services.map((s) => (
        <Card key={s.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, minWidth: 240, gap: 2 }}>
              <T variant="h3">{s.name}</T>
              <T variant="small" muted>{s.type}{s.port ? ` · port ${s.port}` : ''} · {s.endpoint}</T>
              <T muted>{s.detail}</T>
            </View>
            <Badge label={s.status.replace('_', ' ')} tone={tone(s.status)} dot />
          </Row>
        </Card>
      ))}

      <SectionTitle title="Providers behind the n8n workflows" />
      {provErr ? <Banner tone="warning">{provErr}. These providers are checked through n8n, so start it to see their status.</Banner> : null}
      {providers?.workflows?.ok ? Object.entries(providers.workflows.integrations).map(([k, v]: any) => (
        <Card key={k}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, minWidth: 240, gap: 2 }}>
              <T variant="h3">{LABEL[k] ?? k}</T>
              <T muted>{v.message || (v.status === 'connected' ? 'Credentials accepted' : '')}</T>
              {v.missing?.length ? <T variant="small" faint>Missing: {v.missing.join(', ')}</T> : null}
            </View>
            <Badge label={v.status} tone={tone(v.status)} dot />
          </Row>
        </Card>
      )) : null}
      {providers?.backend ? (
        <Card>
          <T variant="h3">Dashboard backend</T>
          <T muted>Airtable read access: {providers.backend.airtableRead.status}{providers.backend.airtableRead.message ? ` (${providers.backend.airtableRead.message})` : ''}</T>
          <T muted>Uploads: {providers.backend.uploads.enabled ? `enabled, max ${providers.backend.uploads.maxUploadMb} MB` : 'disabled (PUBLIC_BASE_URL must be https)'}</T>
        </Card>
      ) : null}
      <View style={{ height: spacing.lg }} />
    </Page>
  );
}
