/** SVG visuals: fitness-level gauge, progress ring, weekly bar chart, "Not Found" empty states. */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, font, radius } from '../theme';
import { Button, IconName, Ionicons, T } from './ui';

// --- Gauge (fitness level 1-5) -------------------------------------------------------

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 180) * Math.PI) / 180; // 0° = left, 180° = right, arc on top
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const s = polar(cx, cy, r, from);
  const e = polar(cx, cy, r, to);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

export function LevelGauge({ level, onChange, max = 5, label, hint }: {
  level: number; onChange: (l: number) => void; max?: number; label: string; hint: string;
}) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = 112;
  const angle = (level / max) * 180;
  const knob = polar(cx, cy, r, angle);
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size / 2 + 50 }}>
        <Svg width={size} height={size / 2 + 50}>
          <Defs>
            <LinearGradient id="g" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFB07A" />
              <Stop offset="1" stopColor={colors.orange} />
            </LinearGradient>
          </Defs>
          {Array.from({ length: 31 }, (_, i) => {
            const a = (i / 30) * 180;
            const p1 = polar(cx, cy, r + 22, a);
            const p2 = polar(cx, cy, r + (i % 6 === 0 ? 34 : 28), a);
            return <Line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={a <= angle ? colors.orange : colors.line} strokeWidth={i % 6 === 0 ? 3 : 2} strokeLinecap="round" />;
          })}
          <Path d={arc(cx, cy, r, 0.01, 180)} stroke={colors.bg} strokeWidth={22} fill="none" strokeLinecap="round" />
          <Path d={arc(cx, cy, r, 0.01, Math.max(0.5, angle))} stroke="url(#g)" strokeWidth={22} fill="none" strokeLinecap="round" />
          <G>
            <Circle cx={knob.x} cy={knob.y} r={17} fill={colors.white} stroke={colors.orange} strokeWidth={5} />
          </G>
        </Svg>
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 }]} pointerEvents="none">
          <Text style={{ fontFamily: font.extrabold, fontSize: 84, color: colors.ink, letterSpacing: -3, lineHeight: 92 }}>{level}</Text>
        </View>
      </View>
      <T v="h2" style={{ marginTop: 8 }}>{label}</T>
      <T v="caption" style={{ marginTop: 2 }}>{hint}</T>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
          const selected = n === level;
          return (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`Level ${n}`}
              onPress={() => onChange(n)}
              style={{
                width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
                backgroundColor: selected ? colors.ink : n < level ? colors.orangeSoft : colors.bg,
              }}
            >
              <Text style={{ fontFamily: font.bold, fontSize: 18, color: selected ? colors.white : n < level ? colors.orange : colors.ink }}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// --- Progress ring -------------------------------------------------------------------

export function ProgressRing({
  progress, size = 132, stroke = 14, track = 'rgba(255,255,255,0.25)', color = colors.white, children,
}: { progress: number; size?: number; stroke?: number; track?: string; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - p)} strokeLinecap="round" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>
    </View>
  );
}

// --- Bar chart -----------------------------------------------------------------------

export function BarChart({ data, height = 140, highlightLast = true, dark = false }: {
  data: { label: string; value: number }[]; height?: number; highlightLast?: boolean; dark?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: height + 26 }}>
      {data.map((d, i) => {
        const h = Math.max(8, (d.value / max) * height);
        const hi = highlightLast && i === data.length - 1;
        return (
          <View key={`${d.label}-${i}`} style={{ alignItems: 'center', flex: 1 }}
            accessible accessibilityLabel={`${d.label}: ${Math.round(d.value)} kcal`}>
            <View style={{
              width: 22, height: h, borderRadius: 11,
              backgroundColor: hi ? colors.orange : d.value > 0 ? (dark ? colors.white : colors.ink) : dark ? colors.ink3 : colors.line,
            }} />
            <Text style={{ marginTop: 8, fontFamily: hi ? font.bold : font.medium, fontSize: 12, color: hi ? colors.orange : dark ? colors.gray2 : colors.gray }}>
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// --- Empty / Not Found state ---------------------------------------------------------------

export function EmptyState({
  icon = 'search', title = 'Not Found', message, actionLabel, onAction,
}: { icon?: IconName; title?: string; message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 }}>
      <View style={styles.emptyOuter}>
        <View style={styles.emptyMid}>
          <View style={styles.emptyInner}>
            <Ionicons name={icon} size={64} color={colors.ink} />
          </View>
        </View>
        <View style={styles.emptyDot1} />
        <View style={styles.emptyDot2} />
      </View>
      <T v="h1" style={{ marginTop: 28, textAlign: 'center' }}>{title}</T>
      <T v="caption" style={{ marginTop: 8, textAlign: 'center', fontSize: 14, maxWidth: 280 }}>{message}</T>
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="primary" onPress={onAction} style={{ marginTop: 24, alignSelf: 'stretch' }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyOuter: { width: 200, height: 200, borderRadius: 100, backgroundColor: colors.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  emptyMid: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#FFE1CE', alignItems: 'center', justifyContent: 'center' },
  emptyInner: {
    width: 108, height: 108, borderRadius: radius.xl, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    transform: [{ rotate: '-8deg' }], shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  emptyDot1: { position: 'absolute', top: 18, right: 22, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.orange },
  emptyDot2: { position: 'absolute', bottom: 26, left: 18, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink },
});
