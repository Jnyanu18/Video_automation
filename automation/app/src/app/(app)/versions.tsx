import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { TopNav } from '../../components/Navigation';
import { Button, Card, SectionTitle, T, Badge, Pill } from '../../components/ui';
import { get } from '../../api/client';
import { spacing, radius, useTheme } from '../../theme';

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
        console.warn('Versions fallback:', err);
      }
    }
    loadVersions();
  }, []);

  const versionList = versions.length > 0 ? versions : [
    {
      version_id: 'ver_retention_a',
      cut_type: 'retention',
      title: 'Version A: 3-Second Viral Hook',
      description: 'High-velocity algorithmic retention cut with aggressive pause cuts and punch-in zooms.',
      target_duration: 24.0,
      style_id: 'viral_hook_fast_pace',
      plan_summary: { keep_count: 4, zooms_count: 2, sfx_count: 3, target_lufs: -14.0 },
    },
    {
      version_id: 'ver_educational_b',
      cut_type: 'educational',
      title: 'Version B: Structured Masterclass',
      description: 'Conversational educational tempo with lower-third titles and balanced visual pacing.',
      target_duration: 45.0,
      style_id: 'educational_masterclass',
      plan_summary: { keep_count: 3, zooms_count: 1, sfx_count: 1, target_lufs: -15.0 },
    },
    {
      version_id: 'ver_cinematic_c',
      cut_type: 'cinematic',
      title: 'Version C: High-Energy Cinematic',
      description: 'Music-driven cut with frequent dynamic transitions, high contrast, and impact SFX.',
      target_duration: 20.0,
      style_id: 'cinematic_event',
      plan_summary: { keep_count: 5, zooms_count: 3, sfx_count: 4, target_lufs: -13.5 },
    },
    {
      version_id: 'ver_founder_d',
      cut_type: 'founder',
      title: 'Version D: Authentic Founder Demo',
      description: 'Unfiltered founder pitch with product screen emphasis and zero flashy distractions.',
      target_duration: 35.0,
      style_id: 'yc_presentation',
      plan_summary: { keep_count: 2, zooms_count: 0, sfx_count: 0, target_lufs: -14.0 },
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopNav title="Multi-Version Studio" subtitle="Parallel Editorial Variations Grounded in the Same Raw Footage" />
      <ScrollView contentContainerStyle={styles.container}>
        
        <Card style={styles.bannerCard}>
          <T variant="h2">A/B Narrative Experimentation</T>
          <T variant="body" muted style={{ marginTop: 4, lineHeight: 22 }}>
            Every version has its own distinct canonical EditPlan, narrative arc, and render history. Choose the best editorial strategy for each target distribution channel.
          </T>
        </Card>

        <SectionTitle title="Generated Editorial Variations (4 Independent Cuts)" />

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
