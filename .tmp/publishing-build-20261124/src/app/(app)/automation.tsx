import React, { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { Page, Row } from '../../components/Page';
import { Badge, Banner, Button, Card, ErrorState, SectionTitle, Skeleton, T } from '../../components/ui';
import { errorText } from '../../api/client';
import { editor, when } from '../../api/editor';
import { usePoll } from '../../state/usePoll';
import { spacing, useTheme } from '../../theme';

export default function AutomationHub() {
  const { colors } = useTheme();
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setD(await editor.workflows()); setError(null); } catch (e) { setError(errorText(e)); } }, []);
  useEffect(() => { load(); }, [load]);
  usePoll(load, true, 8000);

  if (error && !d) return <Page title="Automation"><ErrorState message={error} onRetry={load} /></Page>;
  if (!d) return <Page title="Automation"><Skeleton height={120} /></Page>;

  return (
    <Page title="Automation" subtitle="The n8n workflows behind reel intake, approval, video and publishing, and the editor pipeline">
      <Card style={{ borderColor: d.n8n.reachable ? colors.success : colors.warning }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, minWidth: 240 }}>
            <Row gap={spacing.sm}><T variant="h2">n8n workflow engine</T><Badge label={d.n8n.reachable ? 'Running' : 'Not running'} tone={d.n8n.reachable ? 'success' : 'warning'} dot /></Row>
            <T muted>{d.n8n.reachable ? `Reachable at ${d.n8n.url}` : d.n8n.note}</T>
          </View>
          <Button label="Open n8n editor" icon="external" disabled={!d.n8n.reachable} hint="n8n is not running" onPress={() => Linking.openURL(d.n8n.url)} />
        </Row>
      </Card>
      {d.n8n.reachable ? <Banner tone="warning">The workflows are generated and tested against a simulated n8n runtime. Import them into n8n and add credentials before relying on them for real accounts.</Banner> : null}

      <SectionTitle title={`Workflows (${d.workflows.length})`} />
      {d.workflows.map((w: any) => (
        <Card key={w.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, minWidth: 240, gap: 2 }}>
              <T variant="h3">{w.number}. {w.title}</T>
              <T muted>{w.purpose}</T>
              <T variant="small" faint>{w.nodes} nodes · webhooks: {w.webhooks.join(', ') || 'internal'} · {w.file}</T>
            </View>
            <Badge label={w.status === 'AVAILABLE' ? 'Engine up' : 'Engine offline'} tone={w.status === 'AVAILABLE' ? 'success' : 'neutral'} />
          </Row>
        </Card>
      ))}

      <SectionTitle title="Editor pipeline (live counts)" />
      <Row style={{ alignItems: 'stretch' }}>
        {d.editor_pipeline.map((p: any) => (
          <Card key={p.key} style={{ flexGrow: 1, flexBasis: 120, minWidth: 110 }}>
            <T variant="stat" color={p.alert ? colors.warning : colors.text}>{p.count}</T>
            <T variant="label" muted>{p.label.toUpperCase()}</T>
          </Card>
        ))}
      </Row>

      <SectionTitle title="Recent activity" />
      <Card>{d.recent_activity.length === 0 ? <T muted>No activity yet.</T> : d.recent_activity.map((e: any, i: number) => (
        <Row key={i} gap={spacing.md} style={{ paddingVertical: 4 }}><T variant="small" faint style={{ width: 100 }}>{when(e.ts)}</T><T style={{ flex: 1 }}>{e.message}</T></Row>
      ))}</Card>
    </Page>
  );
}
