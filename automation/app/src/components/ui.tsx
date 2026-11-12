import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Linking, Modal, Platform, Pressable, ScrollView, StyleProp, StyleSheet,
  Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { Icon, IconName } from './Icon';
import { font, radius, shadow, spacing, statusTone, STATUS_LABEL, Tone, toneColors, type, useTheme } from '../theme';

/* ----------------------------------------------------------------- Text */

export function T({ variant = 'body', muted, faint, color, style, children, ...rest }: {
  variant?: keyof typeof type; muted?: boolean; faint?: boolean; color?: string;
  style?: StyleProp<any>; children?: React.ReactNode; numberOfLines?: number; selectable?: boolean; accessibilityRole?: any;
}) {
  const { colors } = useTheme();
  const c = color ?? (faint ? colors.textFaint : muted ? colors.textMuted : colors.text);
  return <Text {...rest} style={[type[variant], { color: c }, style]}>{children}</Text>;
}

/* ----------------------------------------------------------------- Card */

export function Card({ children, style, pad = true, onPress, accessibilityLabel }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; pad?: boolean; onPress?: () => void; accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const base = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, shadow(colors), pad && { padding: spacing.lg }, style];
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}
        style={({ pressed, hovered }: any) => [base, hovered && { borderColor: colors.primary }, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <T variant="h2" style={{ flex: 1 }}>{title}</T>
      {right}
    </View>
  );
}

/* --------------------------------------------------------------- Button */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({ label, onPress, variant = 'secondary', icon, loading, disabled, small, full, hint }: {
  label: string; onPress?: () => void; variant?: ButtonVariant; icon?: IconName; loading?: boolean;
  disabled?: boolean; small?: boolean; full?: boolean; hint?: string;
}) {
  const { colors } = useTheme();
  const off = disabled || loading;
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress}
      // @ts-ignore web-only tooltip explaining why an action is unavailable
      title={Platform.OS === 'web' && disabled ? hint : undefined}
      style={({ pressed, hovered }: any) => [
        styles.btn,
        small && styles.btnSmall,
        full && { width: '100%' },
        { backgroundColor: palette.bg, borderColor: palette.border },
        variant === 'primary' && hovered && !off && { backgroundColor: colors.primaryPressed },
        variant !== 'primary' && hovered && !off && { borderColor: colors.primary },
        pressed && !off && { opacity: 0.8 },
        off && { opacity: 0.45 },
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={palette.fg} /> : icon ? <Icon name={icon} size={small ? 16 : 18} color={palette.fg} /> : null}
      <Text style={{ fontFamily: font.semibold, fontSize: small ? 13 : 15, color: palette.fg }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, color }: { icon: IconName; onPress: () => void; label: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}
      style={({ pressed, hovered }: any) => [styles.iconBtn, { backgroundColor: hovered || pressed ? colors.surfaceAlt : 'transparent' }]}>
      <Icon name={icon} size={20} color={color ?? colors.text} />
    </Pressable>
  );
}

/* ---------------------------------------------------------------- Badge */

export function Badge({ label, tone = 'neutral', dot }: { label: string; tone?: Tone; dot?: boolean }) {
  const { colors } = useTheme();
  const c = toneColors(colors, tone);
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: c.fg }]} /> : null}
      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: c.fg }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status?: string }) {
  const label = status ? STATUS_LABEL[status] ?? status.replace(/_/g, ' ').toLowerCase() : 'Unknown';
  return <Badge label={label} tone={statusTone(status)} dot />;
}

export function Pill({ label, tone = 'neutral', style }: { label?: string; tone?: Tone; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const c = toneColors(colors, tone);
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={{ fontFamily: font.medium, fontSize: 11, color: c.fg }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/* ---------------------------------------------------------------- Inputs */

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <T variant="label" muted>{label}</T>
      {children}
      {error ? <T variant="small" color="#C62F3E">{error}</T> : hint ? <T variant="small" faint>{hint}</T> : null}
    </View>
  );
}

export function Input({ style, multiline, invalid, ...rest }: TextInputProps & { invalid?: boolean }) {
  const { colors } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      {...rest}
      multiline={multiline}
      onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
      onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
      placeholderTextColor={colors.textFaint}
      style={[
        styles.input,
        { backgroundColor: colors.surface, color: colors.text, borderColor: invalid ? colors.danger : focus ? colors.primary : colors.border },
        multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 },
        Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
        style,
      ]}
    />
  );
}

/** Pill selector for short lists (replaces native <select>, which looks different on every platform). */
export function Chips<T extends string>({ options, value, onChange, allowEmpty }: {
  options: { value: T; label: string }[]; value: T | ''; onChange: (v: T | '') => void; allowEmpty?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="button" accessibilityState={{ selected: on }}
            onPress={() => onChange(on && allowEmpty ? '' : o.value)}
            style={({ hovered }: any) => [styles.chip, { backgroundColor: on ? colors.primary : colors.surface, borderColor: on ? colors.primary : hovered ? colors.primary : colors.border }]}>
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: on ? colors.onPrimary : colors.text }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Tappable field that opens a bottom-sheet/dialog list (for long lists like avatars and voices). */
export function Picker({ value, placeholder, options, onChange }: {
  value: string; placeholder: string; options: { value: string; label: string; sub?: string }[]; onChange: (v: string) => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)}
        style={({ hovered }: any) => [styles.input, styles.pickerField, { backgroundColor: colors.surface, borderColor: hovered ? colors.primary : colors.border }]}>
        <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 15, color: current ? colors.text : colors.textFaint }} numberOfLines={1}>
          {current ? current.label : placeholder}
        </Text>
        <View style={{ transform: [{ rotate: '90deg' }] }}><Icon name="chevron" size={16} color={colors.textFaint} /></View>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={placeholder}>
        {[{ value: '', label: placeholder, sub: undefined as string | undefined }, ...options].map((o) => (
          <Pressable key={o.value || '_default'} accessibilityRole="button"
            onPress={() => { onChange(o.value); setOpen(false); }}
            style={({ hovered, pressed }: any) => [styles.option, (hovered || pressed) && { backgroundColor: colors.surfaceAlt }]}>
            <View style={{ flex: 1 }}>
              <T variant="body">{o.label}</T>
              {o.sub ? <T variant="small" faint>{o.sub}</T> : null}
            </View>
            {o.value === value ? <Icon name="check" size={18} color={colors.primary} /> : null}
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------- Sheet / Dialog */

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }, shadow(colors, 2)]} onPress={() => {}}>
          <View style={styles.sheetHead}>
            <T variant="h2" style={{ flex: 1 }}>{title}</T>
            <IconButton icon="x" label="Close" onPress={onClose} />
          </View>
          <ScrollView style={{ maxHeight: 420 }}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ConfirmDialog({ visible, title, message, confirmLabel, onConfirm, onCancel, danger }: {
  visible: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay, justifyContent: 'center' }]}>
        <View style={[styles.dialog, { backgroundColor: colors.surface }, shadow(colors, 2)]}>
          <T variant="h2">{title}</T>
          <T muted style={{ marginTop: 8 }}>{message}</T>
          <View style={styles.dialogActions}>
            <Button label="Cancel" onPress={onCancel} />
            <Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* --------------------------------------------------- Feedback / states */

export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(o, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    a.start();
    return () => a.stop();
  }, [o]);
  return <Animated.View style={[{ height, width: width as any, borderRadius: 8, backgroundColor: colors.surfaceAlt, opacity: o }, style]} />;
}

export function EmptyState({ icon, title, message, action }: { icon: IconName; title: string; message?: string; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Icon name={icon} size={26} color={colors.primary} /></View>
      <T variant="h2" style={{ textAlign: 'center' }}>{title}</T>
      {message ? <T muted style={{ textAlign: 'center', maxWidth: 360 }}>{message}</T> : null}
      {action ? <View style={{ alignSelf: 'center' }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <EmptyState icon="alert" title="Something went wrong" message={message} action={onRetry ? <Button label="Try again" icon="refresh" onPress={onRetry} /> : undefined} />;
}

export function Banner({ tone = 'warning', children }: { tone?: Tone; children: React.ReactNode }) {
  const { colors } = useTheme();
  const c = toneColors(colors, tone);
  return (
    <View style={[styles.banner, { backgroundColor: c.bg }]}>
      <Icon name="alert" size={18} color={c.fg} />
      <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: c.fg }}>{children}</Text>
    </View>
  );
}

export function LinkText({ href, children }: { href: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(href)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontFamily: font.medium, fontSize: 14, color: colors.primary, flexShrink: 1 }} numberOfLines={1}>{children}</Text>
      <Icon name="external" size={14} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
  btn: { minHeight: 44, paddingHorizontal: 18, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'flex-start' },
  btnSmall: { minHeight: 34, paddingHorizontal: 12, borderRadius: radius.sm },
  iconBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, fontFamily: font.regular, fontSize: 15 },
  pickerField: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1 },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 12, gap: 8 },
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', padding: spacing.lg },
  sheet: { width: '100%', maxWidth: 520, borderRadius: radius.lg, paddingBottom: spacing.sm },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.lg, paddingRight: spacing.sm, paddingVertical: spacing.sm },
  dialog: { width: '100%', maxWidth: 420, borderRadius: radius.lg, padding: spacing.xl },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xl },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
});
