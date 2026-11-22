import React from 'react';
import { StyleSheet, View, Pressable, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, IconName } from './Icon';
import { T, Badge, Button, Chips } from './ui';
import { radius, spacing, useTheme } from '../theme';
import { STAGE_LABEL, stageTone } from './studio';
import { useStoryboards } from '../state/useStoryboards';

export type StudioTabKey = 'storyboard' | 'timeline' | 'copilot';

interface StudioTabsProps {
  activeTab: StudioTabKey;
  sbId?: string;
  title?: string;
  stage?: string;
  approved?: boolean;
  onPreviewRender?: () => void;
  onFinalRender?: () => void;
  rendering?: boolean;
}

export function StudioTabs({
  activeTab,
  sbId,
  title,
  stage,
  approved,
  onPreviewRender,
  onFinalRender,
  rendering = false,
}: StudioTabsProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { list, select } = useStoryboards();

  const tabs: { key: StudioTabKey; label: string; icon: IconName; route: string }[] = [
    { key: 'storyboard', label: 'Storyboard Cards', icon: 'layers', route: '/storyboard' },
    { key: 'timeline', label: 'Timeline Editor', icon: 'sliders', route: '/timeline' },
    { key: 'copilot', label: 'AI Director Copilot', icon: 'sparkles', route: '/studio' },
  ];

  function handleTabPress(tab: typeof tabs[0]) {
    if (tab.key === activeTab) return;
    router.push({
      pathname: tab.route as any,
      params: sbId ? { sb: sbId } : {},
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Upper Row: Project Identity & Quick Switcher */}
      <View style={styles.topRow}>
        <View style={styles.projectInfo}>
          <View style={[styles.projectIconBadge, { backgroundColor: colors.primarySoft }]}>
            <Icon name="layers" size={16} color={colors.primary} />
          </View>
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <T variant="label" muted style={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 10 }}>
                Active Project
              </T>
              {stage ? <Badge label={STAGE_LABEL[stage] ?? stage} tone={stageTone(stage)} dot /> : null}
              {approved ? <Badge label="Approved" tone="success" dot /> : null}
            </View>
            <T variant="h3" numberOfLines={1} style={{ fontWeight: '700' }}>
              {title || (sbId ? `Storyboard ${sbId}` : 'Project Editor')}
            </T>
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.actionsRow}>
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
              loading={rendering}
              onPress={onFinalRender}
            />
          ) : null}
          <Button
            label="+ New Reel"
            variant="ghost"
            icon="plus"
            small
            onPress={() => router.push('/new')}
          />
        </View>
      </View>

      {/* Storyboard Quick Switcher (when multiple projects exist) */}
      {list && list.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherScroll}>
          {list.map((item) => {
            const isSelected = item.id === sbId;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  select(item.id);
                  router.push({
                    pathname: (activeTab === 'timeline' ? '/timeline' : activeTab === 'copilot' ? '/studio' : '/storyboard') as any,
                    params: { sb: item.id },
                  });
                }}
                style={({ pressed, hovered }: any) => [
                  styles.projectChip,
                  {
                    backgroundColor: isSelected ? colors.primarySoft : hovered ? colors.surfaceAlt : 'transparent',
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: isSelected ? colors.primary : colors.textFaint }]} />
                <T
                  variant="small"
                  style={{ fontWeight: isSelected ? '600' : '400', fontSize: 11 }}
                  color={isSelected ? colors.primary : colors.textMuted}
                  numberOfLines={1}
                >
                  {(item.storyboard?.title || item.id).slice(0, 24)}
                </T>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Lower Row: Modern Segmented Sub-view Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => handleTabPress(tab)}
              style={({ pressed, hovered }: any) => [
                styles.tabItem,
                isActive && [
                  styles.tabItemActive,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    ...(Platform.OS === 'web'
                      ? ({ boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)' } as any)
                      : {}),
                  },
                ],
                !isActive && hovered && { backgroundColor: colors.surface + '66' },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Icon
                name={tab.icon}
                size={15}
                color={isActive ? colors.primary : colors.textMuted}
              />
              <T
                variant="label"
                style={{ fontWeight: isActive ? '700' : '500', fontSize: 13 }}
                color={isActive ? colors.primary : colors.textMuted}
              >
                {tab.label}
              </T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  projectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 240,
  },
  projectIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switcherScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  projectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabItemActive: {
    borderWidth: 1,
  },
});
