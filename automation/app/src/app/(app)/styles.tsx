import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { TopNav } from '../../components/Navigation';
import { Button, Card, SectionTitle, T, Badge, Pill } from '../../components/ui';
import { get } from '../../api/client';
import { spacing, radius, useTheme } from '../../theme';

export default function StyleDNAScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [stylesList, setStylesList] = useState<any[]>([]);

  useEffect(() => {
    async function loadStyles() {
      try {
        const res = await get('/api/editor/styles/dna');
        if (res?.styles) {
          setStylesList(Object.values(res.styles));
        }
      } catch (err) {
        console.warn('Styles DNA fallback:', err);
      }
    }
    loadStyles();
  }, []);

  const presets = stylesList.length > 0 ? stylesList : [
    {
      style_id: 'viral_hook_fast_pace',
      name: 'Viral Hook (Fast Paced)',
      description: 'Fast-paced TikTok/Reel pace: cuts every 1.8s, aggressive silence tightening (<0.22s), bold karaoke captions.',
      pacing: { avg_shot_duration: 1.8, cuts_per_minute: 33.3 },
      typography: { caption_style: 'karaoke', caption_max_words: 3 },
      visual_motion: { color_grade: 'cinematic_contrast', palette: ['#FF5A1F', '#090A0C', '#FFFFFF', '#70D6A1'] },
      audio: { target_lufs: -14.0, sfx_density: 'dense' },
    },
    {
      style_id: 'educational_masterclass',
      name: 'Educational Masterclass',
      description: 'Structured educational tempo: conversational pauses (<0.38s), clean lower thirds, balanced framing.',
      pacing: { avg_shot_duration: 3.2, cuts_per_minute: 18.5 },
      typography: { caption_style: 'clean-lower', caption_max_words: 5 },
      visual_motion: { color_grade: 'clean_vibrant', palette: ['#00B2FF', '#111317', '#F3F4F5', '#F2C36B'] },
      audio: { target_lufs: -15.0, sfx_density: 'moderate' },
    },
    {
      style_id: 'cinematic_event',
      name: 'Cinematic Event / Aftermovie',
      description: 'Dramatic pacing: dynamic punch-in zooms on beat, heavy transition effects, atmospheric risers.',
      pacing: { avg_shot_duration: 1.4, cuts_per_minute: 42.0 },
      typography: { caption_style: 'bold-pop', caption_max_words: 2 },
      visual_motion: { color_grade: 'cinematic_contrast', palette: ['#FF3B30', '#000000', '#FFCC00', '#FFFFFF'] },
      audio: { target_lufs: -13.5, sfx_density: 'dense' },
    },
    {
      style_id: 'yc_presentation',
      name: 'YC Pitch & Product Demo',
      description: 'Founder-led demo: camera split-screen, UI screen zooms, zero gimmicks, clean speech emphasis.',
      pacing: { avg_shot_duration: 4.0, cuts_per_minute: 15.0 },
      typography: { caption_style: 'clean-lower', caption_max_words: 6 },
      visual_motion: { color_grade: 'warm_founder', palette: ['#FF6600', '#222222', '#F6F6EF', '#4A90E2'] },
      audio: { target_lufs: -14.0, sfx_density: 'minimal' },
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopNav title="Style DNA Engine" subtitle="Reusable Aesthetic & Editing Profiles: Pacing, Typography & Sound Cues" />
      <ScrollView contentContainerStyle={styles.container}>
        
        <SectionTitle
          title="Signature Editing Styles"
          right={
            <Button
              label="Apply in AI Studio"
              variant="primary"
              icon="camera"
              small
              onPress={() => router.push('/studio')}
            />
          }
        />

        <View style={{ gap: spacing.lg }}>
          {presets.map((st) => (
            <Card key={st.style_id} style={styles.styleCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 }}>
                    <Pill label={st.style_id} />
                    <Badge label={`Cut Every ${st.pacing.avg_shot_duration}s`} tone="info" />
                    <Badge label={`${st.audio.target_lufs} LUFS`} tone="neutral" />
                  </View>
                  <T variant="h2">{st.name}</T>
                  <T variant="body" muted style={{ marginTop: 4 }}>{st.description}</T>
                </View>

                {/* Color Palette Swatch */}
                <View style={styles.paletteWrap}>
                  <T variant="caption" muted>COLOR PALETTE</T>
                  <View style={styles.paletteRow}>
                    {(st.visual_motion.palette || []).map((hex: string) => (
                      <View key={hex} style={[styles.swatch, { backgroundColor: hex }]} />
                    ))}
                  </View>
                </View>
              </View>

              {/* Metrics Grid */}
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <T variant="caption" muted>CUT FREQUENCY</T>
                  <T variant="stat" style={{ fontSize: 20 }}>{st.pacing.cuts_per_minute}</T>
                  <T variant="small" muted>Cuts per minute</T>
                </View>

                <View style={styles.metricItem}>
                  <T variant="caption" muted>CAPTION STYLE</T>
                  <T variant="stat" style={{ fontSize: 20, color: colors.primary }}>{st.typography.caption_style}</T>
                  <T variant="small" muted>Max {st.typography.caption_max_words} words/line</T>
                </View>

                <View style={styles.metricItem}>
                  <T variant="caption" muted>SFX DENSITY</T>
                  <T variant="stat" style={{ fontSize: 20, color: colors.success }}>{st.audio.sfx_density.toUpperCase()}</T>
                  <T variant="small" muted>Beat & transition cues</T>
                </View>

                <View style={styles.metricItem}>
                  <T variant="caption" muted>COLOR GRADE</T>
                  <T variant="stat" style={{ fontSize: 20 }}>{st.visual_motion.color_grade}</T>
                  <T variant="small" muted>LUT curve</T>
                </View>
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
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  styleCard: {
    padding: spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  paletteWrap: {
    alignItems: 'flex-end',
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252930',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#252930',
  },
  metricItem: {
    flex: 1,
    minWidth: 160,
  },
});
