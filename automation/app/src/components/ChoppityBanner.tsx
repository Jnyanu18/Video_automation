import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { Icon } from './Icon';
import { T } from './ui';
import { radius, spacing, useTheme } from '../theme';
import { useRouter } from 'expo-router';

export function ChoppityBanner({ onAction }: { onAction?: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  const { colors } = useTheme();
  const router = useRouter();

  if (dismissed) return null;

  return (
    <View style={[styles.banner, { borderColor: 'rgba(255, 90, 31, 0.22)' }]}>
      <View style={styles.contentRow}>
        {/* Warning / Sparkle Circular Badge */}
        <View style={styles.iconCircle}>
          <Icon name="sparkles" size={17} color="#FF5A1F" />
        </View>

        {/* Text Block */}
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="h3" style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
            ⚡ Fast AI Video Reframe & Auto-Caption Engine Active
          </T>
          <T variant="small" style={{ fontSize: 12, color: '#64748B' }}>
            Transform long-form YouTube and local videos into viral 9:16 short clips with speaker tracking and karaoke subtitles.
          </T>
        </View>

        {/* CTA Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (onAction) onAction();
            else router.push('/styles');
          }}
          style={({ pressed, hovered }: any) => [
            styles.ctaBtn,
            { backgroundColor: hovered ? colors.primaryPressed : colors.primary },
            pressed && { opacity: 0.9 },
            Platform.OS === 'web' && ({
              cursor: 'pointer',
              transition: 'all 140ms ease',
              transform: pressed ? 'scale(0.97)' : hovered ? 'translateY(-1px)' : 'none',
              boxShadow: '0 2px 6px rgba(108, 76, 240, 0.25)',
            } as any),
          ]}
        >
          <T variant="label" style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 12 }}>
            Customize Templates
          </T>
        </Pressable>

        {/* Dismiss Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss banner"
          onPress={() => setDismissed(true)}
          hitSlop={8}
          style={({ hovered }: any) => [
            styles.dismissBtn,
            hovered && { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
          ]}
        >
          <Icon name="x" size={16} color="#94A3B8" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF9F5',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage: 'linear-gradient(90deg, #FFF9F5 0%, #FAF5FF 100%)',
          boxShadow: '0 1px 3px rgba(255, 90, 31, 0.08)',
        } as any)
      : {}),
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtn: {
    padding: 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
