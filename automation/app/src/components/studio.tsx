import React from 'react';
import { View } from 'react-native';
import { Badge, Card, T } from './ui';
import { Check, AgentEvent, Storyboard } from '../api/editor';
import { Tone, spacing, useTheme } from '../theme';

export const checkTone = (s: string): Tone => (s === 'pass' ? 'success' : s === 'warn' ? 'warning' : s === 'fail' ? 'danger' : 'neutral');
export const humanize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function stageTone(stage: string): Tone {
  if (stage === 'failed') return 'danger';
  if (stage === 'awaiting_approval') return 'warning';
  if (stage === 'rendered' || stage === 'approved') return 'success';
  return 'info';
}
export const STAGE_LABEL: Record<string, string> = {
  analyzing: 'Analyzing', awaiting_approval: 'Needs your approval', approved: 'Approved', rendering: 'Rendering', rendered: 'Rendered', failed: 'Failed',
};

export function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: Tone }) {
  const { colors } = useTheme();
  const color = tone === 'warning' ? colors.warning : tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : colors.text;
  return (
    <Card style={{ flexGrow: 1, flexBasis: 150, minWidth: 150 }}>
      <T variant="label" muted>{label.toUpperCase()}</T>
      <T variant="stat" color={color} style={{ marginTop: 6 }}>{value}</T>
      {sub ? <T variant="small" muted style={{ marginTop: 2 }}>{sub}</T> : null}
    </Card>
  );
}

export function ChecksList({ checks }: { checks: Check[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      {checks.map((c) => (
        <View key={c.name} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ width: 70 }}><Badge label={c.status.toUpperCase()} tone={checkTone(c.status)} /></View>
          <View style={{ flex: 1 }}>
            <T variant="h3">{humanize(c.name)}{c.score !== null ? `  ·  ${Math.round(c.score * 100)}%` : ''}</T>
            <T variant="small" muted>{c.detail}</T>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Live view of what the agent is doing (tool calls with their outcome), straight from the job's event stream. */
export function JobLog({ events, title = 'Agent activity' }: { events: AgentEvent[]; title?: string }) {
  const { colors } = useTheme();
  const rows = events.filter((e) => e.type === 'tool' || e.type === 'message' || e.type === 'claim_check' || e.type === 'scorecard').slice(-14);
  return (
    <View style={{ gap: 6 }}>
      <T variant="label" muted>{title.toUpperCase()}</T>
      {rows.length === 0 ? <T variant="small" faint>Starting…</T> : rows.map((e, i) => {
        const tone: Tone = e.state === 'error' ? 'danger' : e.state === 'running' ? 'info' : e.type === 'claim_check' ? 'warning' : 'neutral';
        const color = tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : tone === 'info' ? colors.info : colors.textMuted;
        const text = e.type === 'tool' ? `${e.name}${e.state === 'running' ? ' …' : e.state === 'error' ? ' failed' : ' ✓'}` : e.text;
        return <T key={i} variant="small" color={color} numberOfLines={2}>{text}</T>;
      })}
    </View>
  );
}

export function titleOf(sb: Storyboard) {
  return sb.storyboard?.title || (sb.status === 'processing' ? 'Generating storyboard…' : sb.status === 'failed' ? 'Storyboard failed' : sb.id);
}
