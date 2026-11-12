import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { TopNav } from '../../components/Navigation';
import { Button, Card, SectionTitle, T, Badge, Pill } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { get, post } from '../../api/client';
import { spacing, radius, useTheme } from '../../theme';

export default function TimelineEditor() {
  const router = useRouter();
  const { colors } = useTheme();

  const [version, setVersion] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<string>('video');
  const [currentTime, setCurrentTime] = useState(0.0);

  const tracks = [
    {
      id: 'video',
      name: 'Video Cut Track',
      color: colors.primary,
      segments: [
        { id: 'v1', label: 'Scene 1: Hook (Punch-In)', start: 0.0, end: 3.2, dur: '3.2s' },
        { id: 'v2', label: 'Scene 2: Problem Statement', start: 3.2, end: 12.0, dur: '8.8s' },
        { id: 'v3', label: 'Scene 3: Proof / Solution', start: 12.0, end: 23.5, dur: '11.5s' },
        { id: 'v4', label: 'Scene 4: Call To Action', start: 23.5, end: 29.4, dur: '5.9s' },
      ],
    },
    {
      id: 'captions',
      name: 'Karaoke Caption Track',
      color: colors.info,
      segments: [
        { id: 'c1', label: '“Never build features nobody asked for”', start: 0.0, end: 3.0, dur: '3.0s' },
        { id: 'c2', label: '“6 months in dark mode building for zero users”', start: 3.5, end: 11.5, dur: '8.0s' },
        { id: 'c3', label: '“Before coding, ask them to prepay today”', start: 12.5, end: 22.0, dur: '9.5s' },
        { id: 'c4', label: '“Send this to your cofounder before sprint”', start: 23.5, end: 29.0, dur: '5.5s' },
      ],
    },
    {
      id: 'zooms',
      name: 'Punch-In Motion Track',
      color: colors.warning,
      segments: [
        { id: 'z1', label: 'Punch-In 1.15x (Hook)', start: 0.0, end: 2.8, dur: '2.8s' },
        { id: 'z2', label: 'Dynamic Cut Zoom 1.10x', start: 12.0, end: 15.0, dur: '3.0s' },
      ],
    },
    {
      id: 'sfx',
      name: 'Sound Design & SFX Track',
      color: colors.success,
      segments: [
        { id: 's1', label: 'whoosh_fast.wav', start: 0.0, end: 0.6, dur: '0.6s' },
        { id: 's2', label: 'riser_tension.wav', start: 21.5, end: 23.5, dur: '2.0s' },
        { id: 's3', label: 'sub_drop.wav', start: 23.5, end: 25.0, dur: '1.5s' },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopNav title="Timeline Editor" subtitle="Multi-Track Non-Linear Editor with Frame-Accurate Precision" />
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Timeline Header & Transport Controls */}
        <Card style={styles.transportCard}>
          <View style={styles.transportRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Badge label={`PLAN VERSION ${version}`} tone="info" />
              <Badge label="FRAME BASE: 30 FPS" tone="neutral" />
              <T variant="mono" style={{ fontSize: 16 }}>00:00:00:00 / 00:00:29:12</T>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                label="Undo"
                variant="secondary"
                icon="back"
                small
                disabled={!canUndo}
                onPress={() => { setVersion((v) => Math.max(1, v - 1)); setCanUndo(false); setCanRedo(true); }}
              />
              <Button
                label="Redo"
                variant="secondary"
                icon="forward"
                small
                disabled={!canRedo}
                onPress={() => { setVersion((v) => v + 1); setCanRedo(false); setCanUndo(true); }}
              />
              <Button
                label="Cut Silences"
                variant="primary"
                icon="zap"
                small
                onPress={() => { setVersion((v) => v + 1); setCanUndo(true); }}
              />
              <Button
                label="Render Cut"
                variant="primary"
                icon="camera"
                small
                onPress={() => router.push('/studio')}
              />
            </View>
          </View>
        </Card>

        {/* Multi-Track Timeline Canvas */}
        <View style={styles.tracksWrapper}>
          {tracks.map((trk) => (
            <Card key={trk.id} style={styles.trackCard}>
              <View style={styles.trackHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={[styles.trackDot, { backgroundColor: trk.color }]} />
                  <T variant="body" style={{ fontWeight: '600' }}>{trk.name}</T>
                </View>
                <T variant="mono" muted style={{ fontSize: 11 }}>{trk.segments.length} cues</T>
              </View>

              {/* Visual Track Lane */}
              <View style={styles.trackLane}>
                {trk.segments.map((seg) => {
                  const leftPct = (seg.start / 30.0) * 100;
                  const widthPct = Math.max(4, ((seg.end - seg.start) / 30.0) * 100);
                  return (
                    <View
                      key={seg.id}
                      style={[
                        styles.trackBlock,
                        {
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          backgroundColor: trk.color,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <T variant="caption" style={{ color: '#090A0C', fontWeight: '700' }} numberOfLines={1}>
                        {seg.label}
                      </T>
                    </View>
                  );
                })}
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
  transportCard: {
    padding: spacing.lg,
  },
  transportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tracksWrapper: {
    gap: spacing.md,
  },
  trackCard: {
    padding: spacing.md,
  },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  trackDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trackLane: {
    height: 48,
    backgroundColor: '#090A0C',
    borderRadius: radius.sm,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#252930',
  },
  trackBlock: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 4,
    paddingHorizontal: 6,
    justifyContent: 'center',
    borderWidth: 1,
  },
});
