import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Page } from '../../components/Page';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, T } from '../../components/ui';
import { useStoryboards } from '../../state/useStoryboards';
import { spacing } from '../../theme';

export default function Timeline() {
  const router = useRouter();
  const { current, list, error, loading, reload } = useStoryboards();
  const scenes = current?.storyboard?.scenes ?? [];

  return (
    <Page title="Timeline" subtitle="Scene plan from your saved storyboard">
      {error && !list ? <ErrorState message={error} onRetry={reload} /> : null}
      {loading ? <Skeleton /> : null}
      {!loading && !current ? (
        <EmptyState
          icon="film"
          title="No timeline yet"
          message="Create a reel to build a storyboard and scene plan."
          action={<Button label="Create a reel" onPress={() => router.push('/new')} />}
        />
      ) : null}
      {current ? (
        <>
          <Card>
            <View style={{ gap: spacing.sm }}>
              <T variant="h3">{current.storyboard?.title || current.prompt || 'Untitled reel'}</T>
              <T variant="small" muted>Detailed timeline editing is not connected yet. Edit and render from the storyboard.</T>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                <Button label="Open storyboard" onPress={() => router.push({ pathname: '/storyboard', params: { sb: current.id } })} />
                {current.latest_render?.video_url ? <Button label="View render" variant="secondary" onPress={() => router.push('/media')} /> : null}
              </View>
            </View>
          </Card>
          {scenes.length === 0 ? <T muted>No scenes generated for this storyboard yet.</T> : null}
          {scenes.map((scene, index) => (
            <Card key={index}>
              <View style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Badge label={`Scene ${index + 1}`} tone="info" />
                  <T variant="h3">{scene.type || 'Scene'}</T>
                </View>
                <T variant="small" muted>Output: {scene.timestamp_output || 'Pending'} · Source: {scene.source_range || 'Pending'}</T>
                {scene.action ? <T>{scene.action}</T> : null}
                {scene.caption ? <T variant="small">Caption: {scene.caption}</T> : null}
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </Page>
  );
}
