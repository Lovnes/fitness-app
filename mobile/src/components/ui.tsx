/** Shared UI primitives: text, buttons, cards, chips, icon circles, screen container. */
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { colors, font, radius, TOUCH } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export { Ionicons };

// --- Text ------------------------------------------------------------------------

const variants = StyleSheet.create({
  display: { fontFamily: font.extrabold, fontSize: 56, letterSpacing: -1.5, color: colors.ink },
  h1: { fontFamily: font.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: colors.ink },
  h2: { fontFamily: font.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: colors.ink },
  title: { fontFamily: font.bold, fontSize: 17, lineHeight: 22, color: colors.ink },
  body: { fontFamily: font.medium, fontSize: 15, lineHeight: 21, color: colors.ink },
  caption: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: colors.gray },
  overline: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.gray },
});

export type TextVariant = keyof typeof variants;

export function T({ v = 'body', style, ...rest }: TextProps & { v?: TextVariant }) {
  return <Text {...rest} style={[variants[v], style]} />;
}

// --- Screen ----------------------------------------------------------------------

export function Screen({
  children, bg = colors.white, edges = ['top'], style,
}: { children: ReactNode; bg?: string; edges?: Edge[]; style?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: bg }, style]}>
      {children}
    </SafeAreaView>
  );
}

// --- Button ----------------------------------------------------------------------

type ButtonVariant = 'primary' | 'dark' | 'light' | 'ghost' | 'danger' | 'outline';

const buttonColors: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.orange, fg: colors.white },
  dark: { bg: colors.ink, fg: colors.white },
  light: { bg: colors.white, fg: colors.ink },
  ghost: { bg: colors.bg, fg: colors.ink },
  danger: { bg: colors.danger, fg: colors.white },
  outline: { bg: 'transparent', fg: colors.ink, border: colors.line },
};

export function Button({
  label, onPress, variant = 'dark', icon = 'arrow-forward', iconLeft, disabled, loading, style, compact,
  accessibilityHint,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName | null;
  iconLeft?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  accessibilityHint?: string;
}) {
  const c = buttonColors[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && { height: TOUCH, paddingHorizontal: 18 },
        { backgroundColor: c.bg, borderColor: c.border ?? c.bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <>
          {iconLeft ? <Ionicons name={iconLeft} size={20} color={c.fg} /> : null}
          <Text style={[styles.buttonText, { color: c.fg }]}>{label}</Text>
          {icon ? <Ionicons name={icon} size={18} color={c.fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

// --- Icon button (round) -------------------------------------------------------------

export function IconButton({
  icon, onPress, label, bg = colors.bg, color = colors.ink, size = TOUCH, disabled,
}: { icon: IconName; onPress?: () => void; label: string; bg?: string; color?: string; size?: number; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: size, height: size, borderRadius: size / 2, backgroundColor: bg,
        alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={size * 0.45} color={color} />
    </Pressable>
  );
}

export function IconCircle({ icon, bg = colors.orangeSoft, color = colors.orange, size = 44 }: {
  icon: IconName; bg?: string; color?: string; size?: number;
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={size * 0.48} color={color} />
    </View>
  );
}

// --- Card / Chip -------------------------------------------------------------------

export function Card({ children, style, dark, onPress, accessibilityLabel }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean; onPress?: () => void; accessibilityLabel?: string;
}) {
  const base: StyleProp<ViewStyle> = [styles.card, dark && { backgroundColor: colors.ink2, borderColor: colors.ink2 }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon, dark }: {
  label: string; selected?: boolean; onPress?: () => void; icon?: IconName; dark?: boolean;
}) {
  const bg = selected ? (dark ? colors.white : colors.orange) : dark ? colors.ink : colors.white;
  const fg = selected ? (dark ? colors.orange : colors.white) : dark ? colors.white : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: bg, borderColor: selected ? bg : dark ? colors.ink : colors.line }]}
    >
      {icon ? <Ionicons name={icon} size={15} color={fg} /> : null}
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style, gap = 12 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Badge({ text, tone = 'orange' }: { text: string; tone?: 'orange' | 'dark' | 'success' | 'gray' }) {
  const map = {
    orange: [colors.orangeSoft, colors.orange],
    dark: [colors.ink, colors.white],
    success: [colors.successSoft, colors.success],
    gray: [colors.bg, colors.gray],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: fg, fontFamily: font.bold, fontSize: 12 } as TextStyle}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  buttonText: { fontFamily: font.bold, fontSize: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: { fontFamily: font.semibold, fontSize: 14 },
});
