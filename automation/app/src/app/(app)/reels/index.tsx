import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { Button, Card, Chips, EmptyState, ErrorState, Input, Skeleton, T } from '../../../components/ui';
import { ReelRowCard } from '../../../components/ReelParts';
import { Icon } from '../../../components/Icon';
import { get } from '../../../api/client';
import type { ReelList } from '../../../api/types';
import { useQuery } from '../../../state/useQuery';
import { spacing, STATUS_LABEL, useTheme } from '../../../theme';

const STATUS_OPTIONS = ['AWAITING_APPROVAL', 'APPROVED', 'VIDEO_COMPLETED', 'PUBLISHED', 'FAILED', 'REJECTED', 'SUBMITTED']
  .map((s) => ({ value: s, label: STATUS_LABEL[s] }));
const SOURCE_OPTIONS = [{ value: 'reel', label: 'From URL' }, { value: 'upload', label: 'Uploaded' }];

export default function Reels() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ status?: string }>();
  const [status, setStatus] = useState<string>(params.status ?? '');
  const [source, setSource] = useState<string>('');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  // keep filter in sync when arriving from a dashboard tile
  useEffect(() => { setStatus(params.status ?? ''); setPage(1); }, [params.status]);

  // debounce search input
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => { setQ(text.trim()); setPage(1); }, 350);
    return () => { if (t.current) clearTimeout(t.current); };
  }, [text]);

  const { data, error, loading, refreshing, refresh, retry } = useQuery<ReelList>(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status) p.set('status', status);
    if (source) p.set('source', source);
    if (q) p.set('q', q);
    return get('/api/reels?' + p);
  }, [status, source, q, page]);

  const filtered = !!(status || source || q);

  return (
    <Screen title="Reels" subtitle={data ? `${data.total} reel${data.total === 1 ? '' : 's'}${filtered ? ' match your filters' : ''}` : undefined}
      onRefresh={refresh} refreshing={refreshing}
      actions={<Button label="New" icon="plus" variant="primary" small onPress={() => router.navigate('/new')} />}>
      <View style={{ gap: spacing.md }}>
        <View>
          <Input value={text} onChangeText={setText} placeholder="Search by title or caption" returnKeyType="search" autoCorrect={false}
            style={{ paddingLeft: 42 }} accessibilityLabel="Search reels" />
          <View style={styles.searchIcon} pointerEvents="none"><Icon name="search" size={18} color={colors.textFaint} /></View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
          <Chips options={STATUS_OPTIONS} value={status} allowEmpty onChange={(v) => { setStatus(v); setPage(1); }} />
        </ScrollView>
        <Chips options={SOURCE_OPTIONS} value={source} allowEmpty onChange={(v) => { setSource(v); setPage(1); }} />
      </View>

      {loading && !data ? (
        <View style={{ gap: spacing.sm }}>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={76} style={{ borderRadius: 16 }} />)}</View>
      ) : null}
      {error && !data ? <ErrorState message={error} onRetry={retry} /> : null}

      {data && !data.items.length ? (
        <Card>
          <EmptyState icon="inbox" title={filtered ? 'No reels match' : 'No reels yet'}
            message={filtered ? 'Try clearing a filter or searching for something else.' : 'Submit your first reel to see it here.'}
            action={filtered ? <Button label="Clear filters" onPress={() => { setStatus(''); setSource(''); setText(''); setPage(1); router.setParams({ status: '' }); }} /> : undefined} />
        </Card>
      ) : null}

      {data?.items.length ? (
        <View style={{ gap: spacing.sm }}>
          {data.items.map((r) => (
            <ReelRowCard key={r.id} reel={r} onPress={() => router.navigate({ pathname: '/reels/[id]', params: { id: r.id } })} />
          ))}
          {data.pages > 1 ? (
            <View style={styles.pager}>
              <Button label="Previous" small disabled={page <= 1} onPress={() => setPage(page - 1)} />
              <T variant="small" muted>Page {data.page} of {data.pages}</T>
              <Button label="Next" small disabled={page >= data.pages} onPress={() => setPage(page + 1)} />
            </View>
          ) : null}
          {data.truncated ? <T variant="small" faint style={{ textAlign: 'center' }}>Older history is not shown.</T> : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchIcon: { position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
});
