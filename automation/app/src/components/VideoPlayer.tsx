import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { radius } from '../theme';

interface VideoPlayerProps {
  uri: string;
  poster?: string;
  isLandscape?: boolean;
}

/**
 * Video preview player for 9:16 and 16:9. It never starts by itself: switching tabs or opening a
 * screen shows the first frame with a big play button, and the viewer decides when to play.
 */
export function VideoPlayer({ uri, poster, isLandscape = false }: VideoPlayerProps) {
  if (Platform.OS === 'web') return <WebVideo uri={uri} poster={poster} isLandscape={isLandscape} />;
  return <NativeVideo uri={uri} isLandscape={isLandscape} />;
}

function WebVideo({ uri, poster, isLandscape }: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  // "#t=0.001" makes browsers paint the first frame while paused (instead of a black box)
  const src = poster || uri.includes('#') ? uri : `${uri}#t=0.001`; // poster wins when given

  const play = () => {
    const v = ref.current;
    if (!v) return;
    if (v.ended) v.currentTime = 0;
    v.play().catch(() => setPlaying(false));
  };

  return (
    <View style={[styles.frame, isLandscape && styles.landscapeFrame]}>
      {React.createElement('video', {
        ref,
        src,
        poster,
        controls: true,
        preload: 'auto',
        playsInline: true,
        onPlay: () => setPlaying(true),
        onPause: () => setPlaying(false),
        onEnded: () => setPlaying(false),
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#000',
          borderRadius: 8,
        },
      })}
      {!playing ? (
        // leaves the bottom control bar free so the scrubber and volume stay usable
        <Pressable onPress={play} accessibilityRole="button" accessibilityLabel="Play video" style={styles.overlay}>
          <View style={styles.playDisc}>
            <View style={styles.playTriangle} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

function NativeVideo({ uri, isLandscape }: { uri: string; isLandscape?: boolean }) {
  const player = useVideoPlayer(uri);
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  playDisc: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF5A1F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  playTriangle: {
    marginLeft: 6,
    width: 0,
    height: 0,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftWidth: 22,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
  },
});
