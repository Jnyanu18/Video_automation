import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { radius } from '../theme';

/** Video preview. Uses a plain <video> on web and expo-video on iOS/Android. Reels are portrait, so the frame is 9:16. */
export function VideoPlayer({ uri, poster }: { uri: string; poster?: string }) {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.frame}>
        {React.createElement('video', {
          src: uri, poster, controls: true, preload: 'metadata', playsInline: true,
          style: { width: '100%', height: '100%', objectFit: 'contain', background: '#000' },
        })}
      </View>
    );
  }
  return <NativeVideo uri={uri} />;
}

function NativeVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return (
    <View style={styles.frame}>
      <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', maxWidth: 320, aspectRatio: 9 / 16, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#000', alignSelf: 'center' },
});
