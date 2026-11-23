import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, SectionTitle, T, Badge, Pill } from '../../components/ui';
import { get } from '../../api/client';
import { spacing, radius, useTheme, MAX_CONTENT_WIDTH } from '../../theme';

export default function MultiVersionStudio() {
  const router = useRouter();
  const { colors } = useTheme();

  const [versions, setVersions] = useState<any[]>([]);

  useEffect(() => {
    async function loadVersions() {
      try {
        const res = await get('/api/editor/versions');
        if (res?.versions) {
          setVersions(res.versions);
        }
      } catch (err) {
        console.warn('Could not load versions:', err);
      }
    }
    loadVersions();
  }, []);

  const versionList = versions;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: 4, maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' }}>
        <T variant="h1" style={{ fontSize: 22, fontWeight: '700' }}>Multi-Version Studio</T>
        <T variant="small" muted>Parallel Editorial Variations Grounded in the Same Raw Footage</T>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        
        <Card style={styles.bannerCard}>
          <T variant="h2">A/B Narrative Experimentation</T>
          <T variant="body" muted style={{ marginTop: 4, lineHeight: 22 }}>
            Every version has its own distinct canonical EditPlan, narrative arc, and render history. Choose the best editorial strategy for each target distribution channel.
          </T>
        </Card>

        <SectionTitle title={`Generated Editorial Variations (${versionList.length})`} />
        {versionList.length === 0 && <Card><T muted>No versions generated yet. Create a reel to start.</T></Card>}

        <View style={styles.versionGrid}>
          {versionList.map((ver) => (
            <Card key={ver.version_id} style={styles.verCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Pill label={ver.cut_type.toUpperCase()} />
                <Badge label={`${ver.target_duration}s Cut`} tone="info" />
              </View>

              <T variant="h3" style={{ marginTop: spacing.md }}>{ver.title}</T>
              <T variant="body" muted style={{ marginTop: 4, flex: 1 }}>{ver.description}</T>

              <View style={styles.specBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T variant="caption" muted>STYLE DNA</T>
                  <T variant="caption" style={{ fontWeight: '600' }}>{ver.style_id}</T>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <T variant="caption" muted>CUTS / ZOOMS / SFX</T>
                  <T variant="mono">
                    {ver.plan_summary.keep_count} cuts · {ver.plan_summary.zooms_count} zooms · {ver.plan_summary.sfx_count} sfx
                  </T>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <Button
                  label="Open in Studio"
                  variant="primary"
                  icon="camera"
                  small
                  onPress={() => router.push('/studio')}
                />
                <Button
                  label="Render Cut"
                  variant="secondary"
                  icon="zap"
                  small
                  onPress={() => router.push('/studio')}
                />
              </View>
            </Card>
          ))}
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
  bannerCard: {
    padding: spacing.xl,
  },
  versionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  verCard: {
    flex: 1,
    minWidth: 300,
    maxWidth: 600,
    padding: spacing.lg,
  },
  specBox: {
    backgroundColor: '#090A0C',
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#252930',
    marginTop: spacing.md,
  },
});
