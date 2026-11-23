import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, SectionTitle, T, Badge, Pill } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { post } from '../../api/client';
import { spacing, radius, useTheme, MAX_CONTENT_WIDTH } from '../../theme';

export default function FootageIntelligence() {
  const router = useRouter();
  const { colors } = useTheme();

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

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
      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: 4, maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' }}>
        <T variant="h1" style={{ fontSize: 22, fontWeight: '700' }}>Footage Intelligence</T>
        <T variant="small" muted>Multimodal Semantic Indexing, Face Tracking & Keyframe Search</T>
      </View>
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
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' }}>
                    <Button
                      label="Create Reel from this Clip"
                      variant="primary"
                      icon="sparkles"
                      small
                      onPress={() => router.push(`/new?footage=${encodeURIComponent(r.scene_id)}&note=${encodeURIComponent(r.snippet)}`)}
                    />
                    <Button
                      label="Use in Active Storyboard"
                      variant="secondary"
                      icon="layers"
                      small
                      onPress={() => router.push('/storyboard')}
                    />
                    <Button
                      label="Use in AI Studio"
                      variant="ghost"
                      icon="camera"
                      small
                      onPress={() => router.push('/studio')}
                    />
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {searchResults.length === 0 && <Card><T muted>No indexed footage matches yet. Index a real video to search its scenes.</T></Card>}
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
    minWidth: 280,
    maxWidth: 360,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
});
