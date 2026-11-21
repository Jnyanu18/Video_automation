import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Icon, IconName } from './Icon';
import { font, radius, spacing, useTheme } from '../theme';
import { useAuth } from '../state/auth';
import { useDevMode } from '../state/devMode';

export interface NavRailItem {
  id: string;
  href: string;
  label: string;
  icon: IconName;
  badge?: string;
  isAction?: boolean;
}

export const PRIMARY_RAIL_ITEMS: NavRailItem[] = [
  { id: 'projects', href: '/', label: 'Projects', icon: 'folder' },
  { id: 'templates', href: '/settings', label: 'Templates', icon: 'layers' },
  { id: 'calendar', href: '/publishing', label: 'Calendar', icon: 'calendar' },
  { id: 'analytics', href: '/analytics', label: 'Analytics', icon: 'bar-chart' },
  { id: 'share', href: '/integrations', label: 'Social & Share', icon: 'share' },
  { id: 'storage', href: '/media', label: 'Media Storage', icon: 'database' },
];

export const BOTTOM_RAIL_ITEMS: NavRailItem[] = [
  { id: 'settings', href: '/settings', label: 'Settings', icon: 'settings' },
  { id: 'learning', href: '/demo', label: 'Tutorials', icon: 'book' },
  { id: 'community', href: 'https://discord.gg', label: 'Community', icon: 'users', isAction: true },
  { id: 'refer', href: '#refer', label: 'Refer & Earn', icon: 'gift', isAction: true },
];

export const CORE_MODES = [
  { id: 'clipper', href: '/', label: 'Clipper' },
  { id: 'studio', href: '/studio', label: 'Studio' },
  { id: 'storyboard', href: '/storyboard', label: 'Storyboard' },
  { id: 'motion', href: '/motion', label: 'Motion' },
  { id: 'planner', href: '/series', label: 'Planner' },
];

function isPathActive(currentPath: string, targetHref: string) {
  if (targetHref === '/') {
    return currentPath === '/' || currentPath === '/(app)' || currentPath === '';
  }
  return currentPath === targetHref || currentPath.startsWith(targetHref + '/');
}

/**
 * Choppity-Style Left Rail (≈56-60px collapsed, expand to reveal labels)
 */
export function LeftRail() {
  const { colors } = useTheme();
  const path = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [showReferModal, setShowReferModal] = useState(false);

  const handleItemPress = (item: NavRailItem) => {
    if (item.id === 'refer') {
      setShowReferModal(true);
      return;
    }
    if (item.href.startsWith('http')) {
      if (typeof window !== 'undefined') {
        window.open(item.href, '_blank');
      }
      return;
    }
    router.navigate(item.href as any);
  };

  const railWidth = expanded ? 210 : 60;

  return (
    <>
      <View
        style={[
          styles.railContainer,
          {
            width: railWidth,
            backgroundColor: colors.surface,
            borderRightColor: colors.border,
          },
          Platform.OS === 'web' && ({
            transition: 'width 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          } as any),
        ]}
      >
        {/* Top Rail Brand Icon */}
        <Pressable
          onPress={() => router.navigate('/')}
          style={[styles.railBrandButton, Platform.OS === 'web' && ({ cursor: 'pointer' } as any)]}
        >
          <View style={[styles.brandIconBox, { backgroundColor: colors.primary }]}>
            <Icon name="sparkles" size={17} color="#FFFFFF" />
          </View>
          {expanded && (
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.brandTitle, { color: colors.text }]}>ROCKCASTLE</Text>
              <Text style={[styles.brandSub, { color: colors.primary }]}>GrowthOS AI</Text>
            </View>
          )}
        </Pressable>

        {/* Primary Stack */}
        <View style={styles.primaryItemsList}>
          {PRIMARY_RAIL_ITEMS.map((item) => {
            const active = isPathActive(path, item.href);
            return (
              <Pressable
                key={item.id}
                onPress={() => handleItemPress(item)}
                accessibilityLabel={item.label}
                style={({ pressed, hovered }: any) => [
                  styles.railItem,
                  {
                    backgroundColor: active
                      ? 'rgba(108, 76, 240, 0.14)'
                      : hovered
                      ? colors.surfaceAlt
                      : 'transparent',
                    justifyContent: expanded ? 'flex-start' : 'center',
                    paddingHorizontal: expanded ? 14 : 0,
                  },
                  Platform.OS === 'web' && ({
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                    transform: pressed ? 'scale(0.96)' : 'none',
                  } as any),
                ]}
              >
                <View style={[styles.iconFrame, active && { backgroundColor: 'transparent' }]}>
                  <Icon
                    name={item.icon}
                    size={20}
                    color={active ? colors.primary : colors.textMuted}
                  />
                </View>
                {expanded && (
                  <Text
                    style={[
                      styles.expandedItemLabel,
                      {
                        color: active ? colors.primary : colors.text,
                        fontFamily: active ? font.semibold : font.medium,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Divider */}
        <View style={[styles.railDivider, { backgroundColor: colors.borderLight }]} />

        {/* Bottom Stack */}
        <View style={styles.bottomItemsList}>
          {BOTTOM_RAIL_ITEMS.map((item) => {
            const active = !item.isAction && isPathActive(path, item.href);
            return (
              <Pressable
                key={item.id}
                onPress={() => handleItemPress(item)}
                accessibilityLabel={item.label}
                style={({ pressed, hovered }: any) => [
                  styles.railItem,
                  {
                    backgroundColor: active
                      ? 'rgba(108, 76, 240, 0.14)'
                      : hovered
                      ? colors.surfaceAlt
                      : 'transparent',
                    justifyContent: expanded ? 'flex-start' : 'center',
                    paddingHorizontal: expanded ? 14 : 0,
                  },
                  Platform.OS === 'web' && ({
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                    transform: pressed ? 'scale(0.96)' : 'none',
                  } as any),
                ]}
              >
                <View style={styles.iconFrame}>
                  <Icon
                    name={item.icon}
                    size={19}
                    color={active ? colors.primary : colors.textMuted}
                  />
                </View>
                {expanded && (
                  <Text
                    style={[
                      styles.expandedItemLabel,
                      {
                        color: active ? colors.primary : colors.text,
                        fontFamily: active ? font.semibold : font.medium,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                )}
              </Pressable>
            );
          })}

          {/* Expand/Collapse Chevron Button */}
          <Pressable
            onPress={() => setExpanded(!expanded)}
            style={({ pressed, hovered }: any) => [
              styles.expandToggleBtn,
              {
                backgroundColor: hovered ? colors.surfaceAlt : 'transparent',
                justifyContent: expanded ? 'flex-start' : 'center',
                paddingHorizontal: expanded ? 14 : 0,
              },
              Platform.OS === 'web' && ({
                cursor: 'pointer',
                transform: pressed ? 'scale(0.96)' : 'none',
              } as any),
            ]}
          >
            <View style={styles.iconFrame}>
              <Icon
                name={expanded ? 'chevron-left' : 'chevron-right'}
                size={18}
                color={colors.textFaint}
              />
            </View>
            {expanded && (
              <Text style={[styles.expandedItemLabel, { color: colors.textFaint }]}>
                Collapse menu
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Refer & Earn Modal */}
      {showReferModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowReferModal(false)}>
          <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
            <View style={[styles.referModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.referIconBadge, { backgroundColor: 'rgba(108, 76, 240, 0.12)' }]}>
                <Icon name="gift" size={26} color={colors.primary} />
              </View>
              <Text style={[styles.referTitle, { color: colors.text }]}>Refer a creator, earn 3 free hours</Text>
              <Text style={[styles.referDesc, { color: colors.textMuted }]}>
                Share your personal GrowthOS invite link. When a creator signs up and exports their first reel, you both get 3 hours of free AI auto-clipping.
              </Text>
              <View style={[styles.linkBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={[styles.linkText, { color: colors.text }]}>https://growthos.ai/r/rockcastle-jnyan</Text>
                <Pressable
                  onPress={() => setShowReferModal(false)}
                  style={[styles.copyBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.copyBtnText}>Copy Link</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => setShowReferModal(false)}
                style={[styles.closeReferBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.closeReferText, { color: colors.textMuted }]}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

/**
 * Choppity-Style Top Header Bar (Full width, white, segmented pill control for core modes)
 */
export function TopHeader({ title, subtitle }: { title?: string; subtitle?: string } = {}) {
  const { colors } = useTheme();
  const path = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  return (
    <View style={[styles.topHeaderContainer, { backgroundColor: '#FFFFFF', borderBottomColor: colors.borderLight }]}>
      {/* Wordmark branding */}
      <View style={styles.headerWordmarkGroup}>
        <Text style={[styles.headerBrandTitle, { color: colors.text }]}>Rockcastle</Text>
        <View style={styles.headerDotDivider} />
        <Text style={[styles.headerSubTitle, { color: colors.textMuted }]}>{title || 'GrowthOS Video'}</Text>
      </View>

      {/* Segmented Control for Core Modes */}
      <View style={[styles.segmentedControlCard, { backgroundColor: colors.surfaceAlt }]}>
        {CORE_MODES.map((mode) => {
          const isSelected = isPathActive(path, mode.href);
          return (
            <Pressable
              key={mode.id}
              onPress={() => router.navigate(mode.href as any)}
              style={({ pressed }: any) => [
                styles.segmentTab,
                isSelected && styles.segmentTabActive,
                Platform.OS === 'web' && ({
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                  transform: pressed ? 'scale(0.97)' : 'none',
                } as any),
              ]}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  {
                    color: isSelected ? colors.text : colors.textMuted,
                    fontFamily: isSelected ? font.semibold : font.medium,
                  },
                ]}
              >
                {mode.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* User Avatar */}
      <View style={styles.headerRightGroup}>
        <Pressable
          onPress={() => router.navigate('/settings')}
          style={({ pressed }: any) => [
            styles.avatarCircle,
            { backgroundColor: colors.primary },
            Platform.OS === 'web' && ({
              cursor: 'pointer',
              transform: pressed ? 'scale(0.95)' : 'none',
            } as any),
          ]}
        >
          <Text style={styles.avatarInitial}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'J'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Choppity-Style Soft Dismissible Alert / Banner Slot
 */
export function BannerAlertSlot({
  title = 'Pro Auto-Clipping Active',
  message = 'You have 4 hours of remaining GPU transcription & auto-framing on your team workspace.',
  actionLabel = 'Upgrade Plan',
  onAction,
}: {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <View style={styles.bannerAlertWrapper}>
      <View style={[styles.bannerAlertCard, { borderColor: '#FED7AA' }]}>
        <View style={styles.bannerLeftRow}>
          <View style={styles.bannerWarningCircle}>
            <Icon name="sparkles" size={15} color="#FF5A1F" />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={styles.bannerTitleText}>{title}</Text>
            <Text style={styles.bannerMessageText}>{message}</Text>
          </View>
        </View>
        <View style={styles.bannerRightRow}>
          {onAction && (
            <Pressable
              onPress={onAction}
              style={({ pressed }: any) => [
                styles.bannerActionButton,
                { backgroundColor: colors.primary },
                Platform.OS === 'web' && ({
                  cursor: 'pointer',
                  transform: pressed ? 'scale(0.97)' : 'none',
                } as any),
              ]}
            >
              <Text style={styles.bannerActionText}>{actionLabel}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setDismissed(true)}
            style={[styles.bannerCloseBtn, Platform.OS === 'web' && ({ cursor: 'pointer' } as any)]}
          >
            <Icon name="x" size={16} color="#9CA3AF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Fallback compatibility exports
export const Sidebar = LeftRail;
export const BottomNav = () => null;
export const TopNav = TopHeader;

const styles = StyleSheet.create({
  railContainer: {
    height: '100%',
    paddingVertical: 14,
    borderRightWidth: 1,
    alignItems: 'center',
    zIndex: 10,
  },
  railBrandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 11,
    marginBottom: 20,
  },
  brandIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 13,
    fontFamily: font.bold,
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 10,
    fontFamily: font.semibold,
  },
  primaryItemsList: {
    flex: 1,
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  railItem: {
    width: '88%',
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconFrame: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedItemLabel: {
    fontSize: 13,
    marginLeft: 8,
  },
  railDivider: {
    width: '70%',
    height: 1,
    marginVertical: 12,
  },
  bottomItemsList: {
    width: '100%',
    gap: 6,
    alignItems: 'center',
  },
  expandToggleBtn: {
    width: '88%',
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  topHeaderContainer: {
    height: 60,
    width: '100%',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerWordmarkGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBrandTitle: {
    fontSize: 16,
    fontFamily: font.bold,
  },
  headerDotDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  headerSubTitle: {
    fontSize: 13,
    fontFamily: font.medium,
  },
  segmentedControlCard: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.pill,
  },
  segmentTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 13,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: font.bold,
  },
  bannerAlertWrapper: {
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  bannerAlertCard: {
    backgroundColor: '#FFF7ED', // Soft warm peach
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bannerWarningCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitleText: {
    fontSize: 13,
    fontFamily: font.bold,
    color: '#9A3412',
  },
  bannerMessageText: {
    fontSize: 12,
    fontFamily: font.regular,
    color: '#7C2D12',
  },
  bannerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerActionButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  bannerActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: font.semibold,
  },
  bannerCloseBtn: {
    padding: 4,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  referModalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  referIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referTitle: {
    fontSize: 17,
    fontFamily: font.bold,
    textAlign: 'center',
  },
  referDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  linkText: {
    fontSize: 12,
    fontFamily: font.mono,
  },
  copyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: font.semibold,
  },
  closeReferBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  closeReferText: {
    fontSize: 13,
    fontFamily: font.medium,
  },
});
