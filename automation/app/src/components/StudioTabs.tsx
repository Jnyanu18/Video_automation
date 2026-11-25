import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from './ui';
import { spacing } from '../theme';

export type StudioTabKey = 'storyboard' | 'timeline' | 'copilot';

export interface StudioTabsProps {
  activeTab: StudioTabKey;
  sbId?: string;
  title?: string;
  subtitle?: string;
  stage?: string;
  approved?: boolean;
  approvedAt?: number | string | null;
  scorecard?: { available?: boolean; status?: string; score?: number | null } | null;
  seriesEpisode?: number | null;
  onPreviewRender?: () => void;
  onFinalRender?: () => void;
  onApprove?: () => void;
  onUnapprove?: () => void;
  approveLoading?: boolean;
  unapproveLoading?: boolean;
  rendering?: boolean;
  canApprove?: boolean;
  approvalBlockedHint?: string;
}

export function StudioTabs({
  approved,
  onPreviewRender,
  onFinalRender,
  onApprove,
  onUnapprove,
  approveLoading = false,
  unapproveLoading = false,
  rendering = false,
  canApprove = true,
  approvalBlockedHint,
}: StudioTabsProps) {
  return (
    <View style={styles.actionsRow}>
      {onApprove || onUnapprove ? (
        approved ? (
          <Button
            label="Withdraw approval"
            icon="x"
            small
            loading={unapproveLoading}
            onPress={onUnapprove}
          />
        ) : (
          <Button
            label="Approve cut"
            variant="primary"
            icon="check"
            small
            disabled={!canApprove}
            hint={approvalBlockedHint}
            loading={approveLoading}
            onPress={onApprove}
          />
        )
      ) : null}

      {onPreviewRender ? (
        <Button
          label="Preview"
          icon="play"
          small
          loading={rendering}
          onPress={onPreviewRender}
        />
      ) : null}

      {onFinalRender ? (
        <Button
          label="Final Render"
          variant={approved ? 'primary' : 'secondary'}
          icon="film"
          small
          disabled={!approved || rendering}
          hint={!approved ? 'Approve the cut first' : undefined}
          loading={rendering}
          onPress={onFinalRender}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
