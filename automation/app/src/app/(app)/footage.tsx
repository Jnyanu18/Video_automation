import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { TopNav } from '../../components/Navigation';
import { Button, Card, SectionTitle, T, Badge, Pill } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { post } from '../../api/client';
import { spacing, radius, useTheme } from '../../theme';

export default function FootageIntelligence() {
  const router = useRouter();
  const { colors } = useTheme();

  const [query, setQuery] = useState('features nobody asked for');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([
    {
      scene_id: 'scene_01',
      start: 0.0,
      end: 3.2,
      duration: 3.2,
      match_type: 'speech',
      snippet: '“Never build features nobody asked for...”',
      confidence: 0.98,
      keyframe_path: '/media/kf1.jpg',
    },
    {
      scene_id: 'scene_03',
      start: 14.0,
      end: 22.0,
      duration: 8.0,
      match_type: 'visual',
      snippet: '[Visual Tag: Pricing] “Our pricing model starts at 29 dollars per month...”',
      confidence: 0.88,
      keyframe_path: '/media/kf3.jpg',
    },
  ]);

  const scenes = [
    { id: 'sc_01', timestamp: '0.0s - 3.2s', framing: 'Close-Up / Talking Head', tags: ['hook', 'introduction'], text: 'Never build features nobody asked for.' },
    { id: 'sc_02', timestamp: '3.2s - 14.0s', framing: 'Medium Action Shot', tags: ['product_demo'], text: 'Here is our product dashboard demo showing retention data.' },
    { id: 'sc_03', timestamp: '14.0s - 22.0s', framing: 'Close-Up / Talking Head', tags: ['pricing', 'solution'], text: 'Our pricing model starts at 29 dollars per month.' },
    { id: 'sc_04', timestamp: '22.0s - 29.4s', framing: 'Medium Action Shot', tags: ['cta'], text: 'Send this to your cofounder before sprint planning.' },
  ];

  async function handleSearch() {
    if (!query || searching) return;
    setSearching(true);
    try {
      const res = await post('/api/editor/media/search', { query });
      if (res?.results) {
        setSearchResults(res.results);
      }
    } catch (err) {
      console.warn('Semantic search fallback:', err);
    } finally {
      setSearching(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopNav title="Footage Intelligence" subtitle="Multimodal Semantic Indexing, Face Tracking & Keyframe Search" />
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Semantic Search Box */}
        <Card style={styles.searchCard}>
          <SectionTitle title="Semantic Natural Language Footage Search" />
          <T variant="body" muted style={{ marginTop: 2, marginBottom: spacing.md }}>
            Search across spoken speech, detected objects, product demonstrations, and visual tags. Points strictly to verified source timestamps.
          </T>
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="e.g. 'find where I demonstrate the dashboard', 'pricing', 'hook'..."
              placeholderTextColor={colors.textFaint}
              style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
              onSubmitEditing={handleSearch}
            />
            <Button
              label={searching ? 'Searching...' : 'Search Moments'}
              variant="primary"
              icon="search"
              loading={searching}
              onPress={handleSearch}
            />
          </View>
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.section}>
            <SectionTitle title={`Search Results (${searchResults.length} Verified Matches)`} />
            <View style={{ gap: spacing.md }}>
              {searchResults.map((r) => (
                <Card key={r.scene_id} style={styles.resultCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Badge label={`CONFIDENCE ${Math.round(r.confidence * 100)}%`} tone="success" />
                      <Pill label={r.match_type?.toUpperCase()} />
                    </View>
                    <T variant="mono" color={colors.primary}>{r.start}s - {r.end}s ({r.duration}s)</T>
                  </View>
                  <T variant="h3" style={{ marginTop: spacing.xs }}>{r.snippet}</T>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                    <Button
                      label="Use in AI Studio"
                      variant="primary"
                      icon="camera"
                      small
                      onPress={() => router.push('/studio')}
                    />
                    <Button
                      label="Inspect in Storyboard"
                      variant="secondary"
                      icon="layers"
                      small
                      onPress={() => router.push('/storyboard')}
                    />
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* Scene Index & Shot Classification Gallery */}
        <View style={styles.section}>
          <SectionTitle title="Indexed Scene Breakdown & Shot Classification" />
          <View style={styles.sceneGrid}>
            {scenes.map((s) => (
              <Card key={s.id} style={styles.sceneCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge label={s.id.toUpperCase()} tone="neutral" />
                  <T variant="mono" muted>{s.timestamp}</T>
                </View>
                <T variant="body" style={{ fontWeight: '600', marginTop: spacing.xs }}>{s.framing}</T>
                <T variant="caption" muted style={{ fontStyle: 'italic', marginVertical: 4 }}>
                  “{s.text}”
                </T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {s.tags.map((t) => (
                    <Pill key={t} label={t} />
                  ))}
                </View>
              </Card>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    gap: spacing.xl,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  searchCard: {
    padding: spacing.lg,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: 280,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 14,
  },
  section: {
    gap: spacing.md,
  },
  resultCard: {
    padding: spacing.md,
  },
  sceneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  sceneCard: {
    flex: 1,
    minWidth: 260,
    maxWidth: 340,
    padding: spacing.md,
  },
});
