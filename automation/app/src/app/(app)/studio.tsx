import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Image, Pressable, Modal } from 'react-native';
import { Page, Row } from '../../components/Page';
import { Button, Card, T, SectionTitle, Badge } from '../../components/ui';
import { spacing, useTheme } from '../../theme';

const VIDEOS = [
  { id: 1, title: 'Behind The Scene A', duration: '2:30', status: 'ready', file: 'behind-the-scene-A-our-track.mp4', color: '#FF6B6B' },
  { id: 2, title: 'Behind The Scene B', duration: '3:15', status: 'ready', file: 'behind-the-scene-B-reference-audio.mp4', color: '#4ECDC4' },
  { id: 3, title: 'Claude Motion Reel', duration: '1:45', status: 'ready', file: 'claude_motion_reel.mp4', color: '#45B7D1' },
  { id: 4, title: 'Motion Graphics AILO', duration: '0:30', status: 'ready', file: 'motiongraphics_ailo.mp4', color: '#FFA502' },
  { id: 5, title: 'Naati Roots', duration: '4:20', status: 'ready', file: 'naatiiroots.mp4', color: '#95E1D3' },
  { id: 6, title: 'Naati Roots 15s', duration: '0:15', status: 'ready', file: 'NaatiRoots_15s_vertical (1).mp4', color: '#F38181' },
  { id: 7, title: 'Naati Roots Reel', duration: '0:15', status: 'ready', file: 'NaatiRoots_Reel_15s.mp4', color: '#AA96DA' },
  { id: 8, title: 'Rockcastle Motion', duration: '2:45', status: 'ready', file: 'rockcastle_motiongrpahis.mp4', color: '#FCBAD3' },
  { id: 9, title: 'Tool Launch', duration: '1:20', status: 'ready', file: 'tool_launch.mp4', color: '#A8D8EA' },
  { id: 10, title: 'Demo Video 1', duration: '0:45', status: 'ready', file: 'video_2026-11-21_11-34-25.mp4', color: '#FFD3B6' },
  { id: 11, title: 'Demo Video 2', duration: '1:10', status: 'ready', file: 'video_2026-11-21_11-34-42.mp4', color: '#FFAAA5' },
];

const VideoCard = ({ video, colors, onPress }: any) => (
  <Pressable onPress={onPress} style={[styles.card, { borderColor: colors.border }]}>
    <View style={[styles.thumb, { backgroundColor: video.color }]}>
      <View style={styles.playOverlay}>
        <T style={{ fontSize: 32 }}>▶</T>
      </View>
    </View>
    <View style={styles.info}>
      <T variant="label" numberOfLines={2}>{video.title}</T>
      <T muted style={{ fontSize: 11, marginTop: 4 }}>{video.duration}</T>
    </View>
  </Pressable>
);

function VideoSection({ title, videos, colors, onSelectVideo }: any) {
  const rows = [];
  for (let i = 0; i < videos.length; i += 2) {
    rows.push(videos.slice(i, i + 2));
  }

  return (
    <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
      <T variant="h3" style={{ paddingHorizontal: spacing.md }}>{title}</T>
      <View style={{ gap: spacing.md, paddingHorizontal: spacing.md }}>
        {rows.map((row, idx) => (
          <View key={idx} style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' }}>
            {row.map((video: any) => (
              <VideoCard
                key={video.id}
                video={video}
                colors={colors}
                onPress={() => onSelectVideo(video)}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function AIStudio() {
  const { colors } = useTheme();
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  const sections = [
    { title: '📹 All Videos', videos: VIDEOS },
  ];

  return (
    <Page title="AI Studio" subtitle="Your video library">
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {sections.map((section, idx) => (
          <VideoSection
            key={idx}
            title={section.title}
            videos={section.videos}
            colors={colors}
            onSelectVideo={setSelectedVideo}
          />
        ))}

      </ScrollView>

      {/* Video Player Modal */}
      <Modal visible={!!selectedVideo} transparent animationType="fade">
        <View style={[styles.playerContainer, { backgroundColor: colors.bg }]}>
          {/* Close Button */}
          <Pressable
            style={styles.closeBtn}
            onPress={() => setSelectedVideo(null)}
          >
            <T style={{ fontSize: 24 }}>✕</T>
          </Pressable>

          {/* Video Player */}
          <View style={styles.playerBox}>
            <video
              src={`/media/${selectedVideo?.file}`}
              style={styles.videoElement}
              controls
              autoPlay={false}
              muted={false}
            />
          </View>
          <T muted style={{ fontSize: 11, marginTop: spacing.sm }}>
            🔊 Click PLAY to hear audio. Browser blocks autoplay sound - you must click play first!
          </T>

          {/* Video Info */}
          <Card style={styles.infoCard}>
            <T variant="h2">{selectedVideo?.title}</T>
            <Row style={{ gap: spacing.md, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <T muted style={{ fontSize: 12 }}>Duration</T>
                <T variant="label">{selectedVideo?.duration}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T muted style={{ fontSize: 12 }}>Status</T>
                <Badge label="✅ Ready" tone="success" />
              </View>
            </Row>
          </Card>

          {/* Action Buttons */}
          <Row style={{ gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button label="💬 Edit" variant="primary" />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="📥 Download" variant="secondary" />
            </View>
          </Row>
        </View>
      </Modal>
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  thumb: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
  },
  info: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  playerContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'flex-start',
  },
  closeBtn: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  playerBox: {
    width: '100%',
    height: 400,
    marginBottom: spacing.lg,
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoElement: {
    width: '100%',
    height: '100%',
  } as any,
  infoCard: {
    marginBottom: spacing.md,
  },
});
