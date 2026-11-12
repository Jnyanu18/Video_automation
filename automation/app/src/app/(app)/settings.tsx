import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Page, Row } from '../../components/Page';
import { Badge, Banner, Button, Card, Chips, ErrorState, Field, Input, SectionTitle, Skeleton, T } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { errorText, get, getBaseUrl, isWeb, request } from '../../api/client';
import { editor } from '../../api/editor';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { spacing, useTheme } from '../../theme';

export default function Settings() {
  const { colors } = useTheme();
  const toast = useToast();
  const { signOut, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [styles_, setStyles] = useState<{ value: string; label: string }[]>([]);
  const [style, setStyle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, st] = await Promise.all([get('/api/editor/settings'), editor.styles()]);
      setData(s); setStyle(s.settings.default_style); setPrompt(s.settings.default_prompt);
      setStyles([...Object.values((st as any).presets), ...Object.values((st as any).custom)].map((p: any) => ({ value: p.name, label: p.name.replace(/_/g, ' ') })));
      setError(null);
    } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setErr(null);
    try { await request('PUT', '/api/editor/settings', { body: { default_style: style, default_prompt: prompt } }); await load(); toast('Defaults saved'); } catch (e) { setErr(errorText(e)); } finally { setSaving(false); }
  }

  if (error && !data) return <Page title="Settings"><ErrorState message={error} onRetry={load} /></Page>;
  if (!data) return <Page title="Settings"><Skeleton height={200} /></Page>;
  const t = data.thresholds;
  const dirty = style !== data.settings.default_style || prompt !== data.settings.default_prompt;

  return (
    <Page title="Settings" subtitle="Defaults for new edits, how the checks measure, and your session">
      <SectionTitle title="Defaults for new edits" />
      <Card style={{ gap: spacing.md }}>
        <Field label="Default style"><Chips options={styles_} value={style} onChange={(v) => v && setStyle(v)} /></Field>
        <Field label="Default editor instructions"><Input value={prompt} onChangeText={setPrompt} multiline /></Field>
        {err ? <Banner tone="danger">{err}</Banner> : null}
        <Button label="Save defaults" variant="primary" loading={saving} disabled={!dirty} onPress={save} />
      </Card>

      <SectionTitle title="How the checks measure" />
      <Card style={{ gap: spacing.sm }}>
        {([
          ['Hook: first word', `warn after ${t.hook_warn_seconds}s, fail after ${t.hook_fail_seconds}s of lead-in`],
          ['Shortest segment', `${t.min_segment_seconds}s`],
          ['Caption length', `${t.max_caption_chars} characters`],
          ['Caption reading speed', `warn above ${t.caption_cps_warn}, fail above ${t.caption_cps_fail} characters per second`],
          ['Loudness jump at a cut', `warn above ${t.loudness_jump_warn_db} dB, fail above ${t.loudness_jump_fail_db} dB`],
          ['Browser (caption/overlay) render timeout', `${data.limits.hyperframes_timeout_s}s, then captions fall back to FFmpeg`],
          ['Agent steps per request', String(data.limits.agent_max_iterations)],
        ] as const).map(([k, v]) => (
          <Row key={k} style={{ justifyContent: 'space-between' }}><T>{k}</T><T muted>{v}</T></Row>
        ))}
        <T variant="small" faint>Pause length and loudness targets come from the chosen style. These thresholds are set in code (evals/checks.py).</T>
      </Card>

      <SectionTitle title="Services" />
      <Card style={{ gap: spacing.sm }}>
        <Row style={{ justifyContent: 'space-between' }}><T>LLM provider</T><Badge label={`${data.llm.provider}: ${data.llm.status.replace('_', ' ')}`} tone={data.llm.status === 'ONLINE' ? 'success' : 'warning'} dot /></Row>
        <T variant="small" muted>{data.llm.detail}</T>
        <Row style={{ justifyContent: 'space-between' }}><T>Publishing adapter</T><T muted>{data.publishing.adapter}</T></Row>
        <Row style={{ justifyContent: 'space-between' }}><T>Public media URL</T><T muted>{data.publishing.public_base_url ?? 'not set (needed to publish)'}</T></Row>
      </Card>

      <SectionTitle title="Account & session" />
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Icon name="server" size={18} color={colors.textMuted} />
          <T variant="small" muted style={{ flex: 1 }}>{isWeb ? 'This studio server' : getBaseUrl()}</T>
        </View>
        <T variant="small" muted>Signed in as {user?.name || 'Director'}.</T>
        <Button label="Sign out" icon="logout" onPress={signOut} />
      </Card>
    </Page>
  );
}
