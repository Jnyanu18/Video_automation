import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { Badge, Card, StatusBadge, T } from './ui';
import { font, radius, spacing, useTheme } from '../theme';
import type { ReelDetail } from '../api/types';
import { errorLabel } from '../api/client';

export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (isNaN(d)) return '';
  const s = Math.max(0, Math.round((Date.now() - d) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface RowLike { id: string; title?: string; status: string; sourceType?: string; updatedAt?: string; error?: ReelDetail["error"]; stuck?: boolean; busy?: boolean }

/** One reel in a list: works as a tappable card on phones and a dense row on desktop. */
export function ReelRowCard({ reel, onPress }: { reel: RowLike; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={`Open ${reel.title || 'untitled reel'}`} style={{ padding: spacing.md + 2 }}>
      <View style={styles.row}>
        <View style={[styles.thumb, { backgroundColor: colors.primarySoft }]}>
          <Icon name={reel.sourceType === 'upload' ? 'upload' : 'link'} size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="h3" numberOfLines={1}>{reel.title || '(untitled)'}</T>
          <View style={styles.meta}>
            <StatusBadge status={reel.status} />
            {reel.stuck ? <Badge label="Stuck" tone="warning" /> : null}
            {reel.busy ? <Badge label="Working" tone="info" /> : null}
            <T variant="small" faint>{reel.sourceType === 'upload' ? 'Upload' : 'From URL'}{reel.updatedAt ? ' · ' + timeAgo(reel.updatedAt) : ''}</T>
          </View>
          {reel.status === 'FAILED' && reel.error ? <T variant="small" color={colors.danger} numberOfLines={2}>{errorLabel(reel.error)}</T> : null}
        </View>
        <Icon name="chevron" size={18} color={colors.textFaint} />
      </View>
    </Card>
  );
}

/** Horizontal pipeline progress; wraps on narrow screens. */
export function ProgressSteps({ steps }: { steps: NonNullable<ReelDetail['progress']> }) {
  const { colors } = useTheme();
  const look = (s: string) => {
    switch (s) {
      case 'done': return { bg: colors.successSoft, fg: colors.success, icon: 'check' as const };
      case 'active': return { bg: colors.infoSoft, fg: colors.info, icon: 'clock' as const };
      case 'failed':
      case 'rejected': return { bg: colors.dangerSoft, fg: colors.danger, icon: 'x' as const };
      default: return { bg: colors.surfaceAlt, fg: colors.textFaint, icon: null };
    }
  };
  return (
    <View style={styles.steps}>
      {steps.map((s, i) => {
        const l = look(s.state);
        return (
          <View key={s.key + i} style={styles.step} accessible accessibilityLabel={`${s.label}: ${s.state}`}>
            <View style={[styles.stepDot, { backgroundColor: l.bg }]}>
              {l.icon ? <Icon name={l.icon} size={14} color={l.fg} strokeWidth={2.5} /> : <View style={[styles.pendingDot, { backgroundColor: l.fg }]} />}
            </View>
            <Text style={{ fontFamily: s.state === 'active' ? font.semibold : font.medium, fontSize: 13, color: s.state === 'pending' || s.state === 'waiting' ? colors.textFaint : colors.text }}>{s.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, rowGap: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pendingDot: { width: 6, height: 6, borderRadius: 3 },
});
