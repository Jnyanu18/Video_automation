import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { radius } from '../theme';

interface VideoPlayerProps {
  uri: string;
  poster?: string;
  isLandscape?: boolean;
}

/** Video preview player. Supports portrait 9:16 and landscape 16:9 with autoplay. */
export function VideoPlayer({ uri, poster, isLandscape = false }: VideoPlayerProps) {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.frame, isLandscape && styles.landscapeFrame]}>
        {React.createElement('video', {
          src: uri,
          poster,
          controls: true,
          autoPlay: true,
          preload: 'auto',
          playsInline: true,
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: '#000',
            borderRadius: 8,
          },
        })}
      </View>
    );
  }
  return <NativeVideo uri={uri} isLandscape={isLandscape} />;
}

function NativeVideo({ uri, isLandscape }: { uri: string; isLandscape?: boolean }) {
  const player = useVideoPlayer(uri, (p) => {
    p.play();
  });
  return (
    <View style={[styles.frame, isLandscape && styles.landscapeFrame]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 9 / 16,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignSelf: 'center',
  },
  landscapeFrame: {
    maxWidth: 580,
    aspectRatio: 16 / 9,
  },
});
