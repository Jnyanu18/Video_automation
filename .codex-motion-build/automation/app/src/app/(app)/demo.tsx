import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Page } from '../../components/Page';
import { Button, Card, EmptyState, ErrorState, Skeleton, T } from '../../components/ui';
import { useStoryboards } from '../../state/useStoryboards';
import { spacing } from '../../theme';

export default function PastWork() {
  const router = useRouter();
  const { list, error, loading, reload } = useStoryboards();

  return (
    <Page title="Past Work & Generated Reels" subtitle="Your saved storyboards and rendered videos">
      {error && !list ? <ErrorState message={error} onRetry={reload} /> : null}
      {loading ? <Skeleton /> : null}
      {list?.length === 0 ? (
        <EmptyState icon="film" title="No work yet" message="Create a reel to see it here." action={<Button label="Create a reel" onPress={() => router.push('/new')} />} />
      ) : null}
      {list?.map((sb) => (
        <Card key={sb.id}>
          <View style={{ gap: spacing.sm }}>
            <T variant="h3">{sb.storyboard?.title || sb.prompt || 'Untitled reel'}</T>
            <T variant="small" muted>{sb.status} · {sb.style || 'No style selected'}</T>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Button label="Open storyboard" small onPress={() => router.push({ pathname: '/storyboard', params: { sb: sb.id } })} />
              {sb.latest_render?.video_url ? <Button label="Open render" small variant="secondary" onPress={() => router.push('/media')} /> : null}
            </View>
          </View>
        </Card>
      ))}
    </Page>
  );
}
