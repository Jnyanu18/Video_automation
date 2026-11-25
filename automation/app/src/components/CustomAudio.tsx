import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { errorText, uploadAgentAudio } from '../api/client';
import { Button, T } from './ui';
import { Icon } from './Icon';
import { spacing, useTheme } from '../theme';

export type SelectedAudio = { id: string; file_name: string; size_bytes: number };

export function CustomAudio({ value, onChange, onUploadingChange }: {
  value: SelectedAudio | null;
  onChange: (audio: SelectedAudio | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const { colors } = useTheme();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function choose() {
    setError('');
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/aac'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!/\.(mp3|wav|m4a|aac)$/i.test(asset.name)) {
      setError('Choose an MP3, WAV, M4A, or AAC file.');
      return;
    }
    setProgress(0);
    onUploadingChange?.(true);
    try {
      const audio = await uploadAgentAudio({
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
        uri: asset.uri,
        blob: Platform.OS === 'web' ? (asset.file as Blob | undefined) : undefined,
      }, setProgress);
      onChange(audio);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setProgress(null);
      onUploadingChange?.(false);
    }
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <T variant="label" style={{ fontWeight: '700', letterSpacing: 0.5 }}>CUSTOM AUDIO (OPTIONAL)</T>
      <T variant="caption" muted>Use your own music in the final film. MP3, WAV, M4A, or AAC, up to 50 MB.</T>
      {value ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Icon name="check" size={16} color={colors.primary} />
          <T variant="small" style={{ flex: 1, minWidth: 120 }}>{value.file_name}</T>
          <Button label="Remove" small variant="ghost" icon="x" onPress={() => onChange(null)} />
        </View>
      ) : (
        <Pressable onPress={choose} disabled={progress !== null}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surfaceAlt,
            padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Icon name="upload" size={18} color={colors.primary} />
          <T variant="small">{progress !== null ? `Uploading audio… ${progress}%` : 'Choose audio file'}</T>
        </Pressable>
      )}
      {error ? <T variant="caption" color={colors.primary}>{error}</T> : null}
    </View>
  );
}
