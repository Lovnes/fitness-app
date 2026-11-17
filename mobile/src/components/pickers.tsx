/**
 * Scroll-based number pickers from the onboarding design:
 *  - WheelPicker: vertical wheel with the selected value in an orange pill (age)
 *  - RulerPicker: horizontal ruler with a centre needle (weight, height)
 *  - Stepper:     − value + control used while logging sets
 * All three only ever emit values inside [min, max], so the UI cannot produce
 * out-of-range input (error prevention, see docs/05_Testing.md).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityActionEvent, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent,
  Platform, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors, font, radius } from '../theme';
import { IconButton } from './ui';

const tick = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
};

const adjustableActions = [{ name: 'increment' as const }, { name: 'decrement' as const }];

// --- WheelPicker ------------------------------------------------------------------

export function WheelPicker({
  min, max, value, onChange, itemHeight = 72, visible = 5, label,
}: { min: number; max: number; value: number; onChange: (v: number) => void; itemHeight?: number; visible?: number; label: string }) {
  const ref = useRef<ScrollViewInstance>(null);
  const values = useMemo(() => Array.from({ length: max - min + 1 }, (_, i) => min + i), [min, max]);
  const [offset, setOffset] = useState((value - min) * itemHeight);
  const pad = (itemHeight * (visible - 1)) / 2;
  const last = useRef(value);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: (value - min) * itemHeight, animated: false }), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setOffset(y);
    const idx = Math.min(values.length - 1, Math.max(0, Math.round(y / itemHeight)));
    if (values[idx] !== last.current) {
      last.current = values[idx];
      tick();
      onChange(values[idx]);
    }
  };

  const scrollToValue = (v: number, animated = true) => {
    const clamped = Math.min(max, Math.max(min, v));
    ref.current?.scrollTo({ y: (clamped - min) * itemHeight, animated });
  };

  const onAction = (e: AccessibilityActionEvent) =>
    scrollToValue(value + (e.nativeEvent.actionName === 'increment' ? 1 : -1));

  return (
    <View
      style={{ height: itemHeight * visible, alignSelf: 'stretch' }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ now: value, min, max }}
      accessibilityActions={adjustableActions}
      onAccessibilityAction={onAction}
    >
      <View pointerEvents="none" style={[styles.wheelHighlight, { top: pad, height: itemHeight }]} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: pad }}
      >
        {values.map((n, i) => {
          const dist = Math.min(3, Math.abs(i * itemHeight - offset) / itemHeight);
          const selected = dist < 0.5;
          return (
            <Pressable key={n} onPress={() => scrollToValue(n)} style={{ height: itemHeight, alignItems: 'center', justifyContent: 'center' }}>
              <Text
                style={{
                  fontFamily: selected ? font.extrabold : font.bold,
                  fontSize: selected ? 44 : Math.max(22, 34 - dist * 6),
                  color: selected ? colors.white : colors.ink,
                  opacity: selected ? 1 : Math.max(0.15, 0.55 - (dist - 1) * 0.2),
                }}
              >
                {n}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// --- RulerPicker ------------------------------------------------------------------

export function RulerPicker({
  min, max, value, onChange, unit, onDark = false, spacing = 12, label,
}: { min: number; max: number; value: number; onChange: (v: number) => void; unit: string; onDark?: boolean; spacing?: number; label: string }) {
  const ref = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const last = useRef(value);
  const count = max - min + 1;
  const fg = onDark ? colors.white : colors.ink;
  const minor = onDark ? 'rgba(255,255,255,0.55)' : colors.gray2;

  const scrollToValue = (v: number, animated = true) => {
    const clamped = Math.min(max, Math.max(min, v));
    ref.current?.scrollTo({ x: (clamped - min) * spacing, animated });
  };

  useEffect(() => {
    if (width > 0) {
      const t = setTimeout(() => scrollToValue(value, false), 0);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.min(count - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / spacing)));
    const v = min + idx;
    if (v !== last.current) {
      last.current = v;
      tick();
      onChange(v);
    }
  };

  const onAction = (e: AccessibilityActionEvent) =>
    scrollToValue(value + (e.nativeEvent.actionName === 'increment' ? 1 : -1));

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ now: value, min, max, text: `${value} ${unit}` }}
      accessibilityActions={adjustableActions}
      onAccessibilityAction={onAction}
      style={{ alignSelf: 'stretch' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 20 }}>
        <Text style={{ fontFamily: font.extrabold, fontSize: 72, color: fg, letterSpacing: -2 }}>{value}</Text>
        <Text style={{ fontFamily: font.bold, fontSize: 22, color: fg, marginBottom: 16, marginLeft: 6 }}>{unit}</Text>
      </View>
      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height: 96 }}>
        {width > 0 && (
          <ScrollView
            ref={ref}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={spacing}
            decelerationRate="fast"
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: width / 2 - 1, alignItems: 'flex-start' }}
          >
            {Array.from({ length: count }, (_, i) => {
              const n = min + i;
              const major = n % 10 === 0;
              const mid = n % 5 === 0;
              return (
                <View key={n} style={{ width: spacing, alignItems: 'flex-start' }}>
                  <View style={{ width: 2, height: major ? 44 : mid ? 30 : 18, backgroundColor: major ? fg : minor, borderRadius: 1 }} />
                  {major && (
                    <Text style={{ position: 'absolute', top: 52, left: -12, width: 26, textAlign: 'center', fontFamily: font.semibold, fontSize: 12, color: minor }}>
                      {n}
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
        <View pointerEvents="none" style={[styles.needle, { left: width / 2 - 2, backgroundColor: onDark ? colors.ink : colors.orange }]} />
      </View>
    </View>
  );
}

// --- Stepper ----------------------------------------------------------------------

export function Stepper({
  label, value, onChange, min, max, step = 1, unit, format,
}: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string; format?: (v: number) => string }) {
  const set = (v: number) => {
    const next = Math.round(Math.min(max, Math.max(min, v)) * 100) / 100;
    if (next !== value) {
      tick();
      onChange(next);
    }
  };
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="remove" label={`Decrease ${label}`} onPress={() => set(value - step)} disabled={value <= min} bg={colors.white} />
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ now: value, min, max }}
          accessibilityActions={adjustableActions}
          onAccessibilityAction={(e) => set(value + (e.nativeEvent.actionName === 'increment' ? step : -step))}
          style={{ alignItems: 'center', minWidth: 72 }}
        >
          <Text style={styles.stepperValue}>{format ? format(value) : value}</Text>
          {unit ? <Text style={styles.stepperUnit}>{unit}</Text> : null}
        </View>
        <IconButton icon="add" label={`Increase ${label}`} onPress={() => set(value + step)} disabled={value >= max} bg={colors.white} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wheelHighlight: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    backgroundColor: colors.orange,
    borderRadius: radius.lg,
    shadowColor: colors.orange,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  needle: { position: 'absolute', top: -6, width: 4, height: 60, borderRadius: 2 },
  stepper: { alignSelf: 'stretch', backgroundColor: colors.bg, borderRadius: radius.lg, padding: 12, gap: 6 },
  stepperLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.gray, textAlign: 'center' },
  stepperValue: { fontFamily: font.extrabold, fontSize: 30, color: colors.ink, letterSpacing: -0.5 },
  stepperUnit: { fontFamily: font.semibold, fontSize: 12, color: colors.gray, marginTop: -2 },
});
