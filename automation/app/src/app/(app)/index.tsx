import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Banner, Button, Card, EmptyState, ErrorState, SectionTitle, Skeleton, T } from '../../components/ui';
import { ReelRowCard } from '../../components/ReelParts';
import { Icon, IconName } from '../../components/Icon';
import { get } from '../../api/client';
import type { Summary } from '../../api/types';
import { useQuery } from '../../state/useQuery';
import { radius, spacing, toneColors, Tone, useTheme } from '../../theme';

const TILES: { key: keyof Summary['totals']; label: string; status: string; tone: Tone; icon: IconName }[] = [
  { key: 'awaitingApproval', label: 'Needs review', status: 'AWAITING_APPROVAL', tone: 'warning', icon: 'clock' },
  { key: 'readyToPublish', label: 'Ready to publish', status: 'VIDEO_COMPLETED', tone: 'success', icon: 'send' },
  { key: 'generating', label: 'Generating', status: 'APPROVED', tone: 'info', icon: 'sparkles' },
  { key: 'published', label: 'Published', status: 'PUBLISHED', tone: 'success', icon: 'check' },
  { key: 'failed', label: 'Failed', status: 'FAILED', tone: 'danger', icon: 'alert' },
  { key: 'rejected', label: 'Rejected', status: 'REJECTED', tone: 'neutral', icon: 'x' },
];

export default function Dashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data, error, loading, refreshing, refresh, retry } = useQuery<Summary>(() => get('/api/summary'), []);

  const needsReview = data?.totals.awaitingApproval ?? 0;

  return (
    <Screen
      title="Dashboard"
      subtitle="Here's where your reels stand."
      onRefresh={refresh}
      refreshing={refreshing}
      actions={<Button label="New reel" icon="plus" variant="primary" small onPress={() => router.navigate('/new')} />}
    >
      {error && !data ? <ErrorState message={error} onRetry={retry} /> : null}

      {loading && !data ? (
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={92} style={styles.tileSkeleton} />)}
        </View>
      ) : null}

      {data ? (
        <>
          {data.stuck ? <Banner tone="warning">{data.stuck} reel{data.stuck === 1 ? ' looks' : 's look'} stuck. Open {data.stuck === 1 ? 'it' : 'them'} and use Retry or Resume.</Banner> : null}
          {needsReview > 0 ? (
            <Card onPress={() => router.navigate({ pathname: '/reels', params: { status: 'AWAITING_APPROVAL' } })} style={{ backgroundColor: colors.primarySoft }}>
              <View style={styles.cta}>
                <View style={{ flex: 1 }}>
                  <T variant="h2" color={colors.primary}>{needsReview} reel{needsReview === 1 ? '' : 's'} waiting for your review</T>
                  <T muted>Check the script and caption, then approve to start video generation.</T>
                </View>
                <Icon name="chevron" size={20} color={colors.primary} />
              </View>
            </Card>
          ) : null}

          <View style={styles.grid}>
            {TILES.map((t) => {
              const c = toneColors(colors, t.tone);
              return (
                <View key={t.key} style={styles.tileCell}>
                  <Card onPress={() => router.navigate({ pathname: '/reels', params: { status: t.status } })} accessibilityLabel={`${t.label}: ${data.totals[t.key] || 0}`}>
                    <View style={styles.tileTop}>
                      <View style={[styles.tileIcon, { backgroundColor: c.bg }]}><Icon name={t.icon} size={16} color={c.fg} /></View>
                      <T variant="small" muted style={{ flex: 1 }} numberOfLines={1}>{t.label}</T>
                    </View>
                    <T variant="stat" style={{ marginTop: spacing.sm }}>{data.totals[t.key] || 0}</T>
                  </Card>
                </View>
              );
            })}
          </View>

          <View>
            <SectionTitle title="Recent activity" right={<Button label="View all" variant="ghost" small onPress={() => router.navigate('/reels')} />} />
            {data.recent?.length ? (
              <View style={{ gap: spacing.sm }}>
                {data.recent.map((r) => (
                  <ReelRowCard key={r.id} reel={{ id: r.id, title: r.title, status: r.status, sourceType: r.sourceType, updatedAt: r.at, error: r.error }}
                    onPress={() => router.navigate({ pathname: '/reels/[id]', params: { id: r.id } })} />
                ))}
              </View>
            ) : (
              <Card>
                <EmptyState icon="film" title="No reels yet" message="Paste an Instagram reel link or upload a video to get started."
                  action={<Button label="Create your first reel" variant="primary" icon="plus" onPress={() => router.navigate('/new')} />} />
              </Card>
            )}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs - 2 },
  tileCell: { width: '50%', minWidth: 170, flexGrow: 1, flexBasis: 200, padding: spacing.xs + 2 },
  tileSkeleton: { width: '46%', margin: spacing.xs + 2, borderRadius: radius.lg, flexGrow: 1 },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tileIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
