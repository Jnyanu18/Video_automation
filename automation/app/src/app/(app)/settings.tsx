import React, { useCallback, useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Page, Row } from '../../components/Page';
import { Badge, Banner, Button, Card, Chips, ErrorState, Field, Input, SectionTitle, Skeleton, T } from '../../components/ui';
import { Icon, IconName } from '../../components/Icon';
import { errorText, get, getBaseUrl, isWeb, request } from '../../api/client';
import { editor } from '../../api/editor';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { useDevMode } from '../../state/devMode';
import { spacing, useTheme } from '../../theme';

const DEV_TOOLS: { title: string; href: string; icon: IconName; desc: string }[] = [
  {
    title: 'Vishnu Studio',
    href: '/vstudio',
    icon: 'film',
    desc: 'Real presenter workspace, avatar synthesis, and talking-head recording pipelines.',
  },
  {
    title: 'Style DNA',
    href: '/styles',
    icon: 'sparkles',
    desc: 'Visual presets, pacing archetypes, typography palettes, and color grade definitions.',
  },
  {
    title: 'Footage Intelligence',
    href: '/footage',
    icon: 'eye',
    desc: 'Multimodal asset catalog, shot classification, speech transcripts, and face clustering.',
  },
  {
    title: 'Multi-Version Studio',
    href: '/versions',
    icon: 'copy',
    desc: 'Simultaneous multi-angle, multi-platform aspect ratio, and language variant generator.',
  },
  {
    title: 'Content Intelligence',
    href: '/intelligence',
    icon: 'cpu',
    desc: 'Audience retention heuristics, script scoring, competitor benchmarks, and hook analytics.',
  },
  {
    title: 'Render QA',
    href: '/qa',
    icon: 'check-circle',
    desc: 'Deep automated verification: flash frame checks, jump cuts, and -14 LUFS loudness mastering.',
  },
];

export default function Settings() {
  const { colors } = useTheme();
  const toast = useToast();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { devMode, setDevMode } = useDevMode();
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

      <SectionTitle title="Developer Mode" />
      <Card style={{ gap: spacing.sm }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: spacing.md, gap: 2 }}>
            <T variant="h3">Enable Developer Tools</T>
            <T variant="small" muted>
              Show internal experimental suites and debug modules (Vishnu Studio, Style DNA, Footage Intelligence, Multi-Version Studio, Content Intelligence, and Render QA).
            </T>
          </View>
          <Switch
            value={devMode}
            onValueChange={setDevMode}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={devMode ? colors.onPrimary : colors.surface}
          />
        </Row>
      </Card>

      {devMode ? (
        <>
          <SectionTitle
            title="Develop"
            right={<Badge label="DEVELOPER MODE ACTIVE" tone="warning" dot />}
          />
          <View style={{ gap: spacing.sm }}>
            {DEV_TOOLS.map((tool) => (
              <Card
                key={tool.href}
                onPress={() => router.navigate(tool.href as any)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    backgroundColor: colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={tool.icon} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="body" style={{ fontWeight: '600' }}>{tool.title}</T>
                  <T variant="small" muted>{tool.desc}</T>
                </View>
                <Button
                  label="Open"
                  variant="secondary"
                  small
                  onPress={() => router.navigate(tool.href as any)}
                />
              </Card>
            ))}
          </View>
        </>
      ) : null}

      <SectionTitle title="Account & session" />
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Icon name="server" size={18} color={colors.textMuted} />
          <T variant="small" muted style={{ flex: 1 }}>{isWeb ? 'This studio server' : getBaseUrl()}</T>
        </View>
        <T variant="small" muted>Signed in as {user?.email || user?.name || 'Director'}.</T>
        <Button label="Sign out" icon="logout" onPress={signOut} />
      </Card>
    </Page>
  );
}
