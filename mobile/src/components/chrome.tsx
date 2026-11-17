/** Navigation chrome: onboarding header with progress, confirm sheet, floating tab bar. */
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, radius } from '../theme';
import { Button, IconButton, IconCircle, IconName, Ionicons, T } from './ui';

// --- Onboarding header ---------------------------------------------------------------

export function StepHeader({ step, total, onBack, onDark = false, title = 'Assessment' }: {
  step: number; total: number; onBack?: () => void; onDark?: boolean; title?: string;
}) {
  const fg = onDark ? colors.white : colors.ink;
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {onBack ? (
          <IconButton icon="chevron-back" label="Back" onPress={onBack}
            bg={onDark ? 'rgba(255,255,255,0.2)' : colors.bg} color={fg} />
        ) : <View style={{ width: 48 }} />}
        <Text style={{ fontFamily: font.bold, fontSize: 17, color: fg }}>{title}</Text>
        <View style={{
          minWidth: 48, height: 32, paddingHorizontal: 10, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
          backgroundColor: onDark ? 'rgba(255,255,255,0.2)' : colors.orangeSoft,
        }}>
          <Text style={{ fontFamily: font.bold, fontSize: 13, color: onDark ? colors.white : colors.orange }}>{step} of {total}</Text>
        </View>
      </View>
      <View style={{ height: 6, borderRadius: 3, marginTop: 16, backgroundColor: onDark ? 'rgba(255,255,255,0.25)' : colors.line }}
        accessible accessibilityRole="progressbar" accessibilityValue={{ now: step, min: 0, max: total }}>
        <View style={{ height: 6, borderRadius: 3, width: `${(step / total) * 100}%`, backgroundColor: onDark ? colors.white : colors.orange }} />
      </View>
    </View>
  );
}

// --- Confirm sheet (prevents accidental Finish / Cancel / Reset — usability U-06) -----------------

export function ConfirmSheet({
  visible, icon, tone = 'orange', title, message, confirmLabel, cancelLabel = 'Not now', onConfirm, onClose, children,
}: {
  visible: boolean; icon: IconName; tone?: 'orange' | 'danger'; title: string; message: string;
  confirmLabel: string; cancelLabel?: string; onConfirm: () => void; onClose: () => void; children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close dialog" />
      <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
        <View style={styles.grabber} />
        <IconCircle icon={icon} size={64} bg={tone === 'danger' ? colors.dangerSoft : colors.orangeSoft} color={tone === 'danger' ? colors.danger : colors.orange} />
        <T v="h2" style={{ marginTop: 16, textAlign: 'center' }}>{title}</T>
        <T v="caption" style={{ marginTop: 6, textAlign: 'center', fontSize: 14 }}>{message}</T>
        {children}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, alignSelf: 'stretch' }}>
          <Button label={cancelLabel} variant="ghost" icon={null} onPress={onClose} style={{ flex: 1 }} />
          <Button label={confirmLabel} variant={tone === 'danger' ? 'danger' : 'primary'} icon={null} onPress={onConfirm} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );
}

// --- Tab bar -------------------------------------------------------------------------------

const TAB_ICONS: Record<string, [IconName, IconName]> = {
  index: ['home-outline', 'home'],
  workout: ['barbell-outline', 'barbell'],
  history: ['time-outline', 'time'],
  profile: ['person-outline', 'person'],
};

export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const [outline, filled] = TAB_ICONS[route.name] ?? ['ellipse-outline', 'ellipse'];
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              style={[styles.tab, focused && styles.tabFocused]}
            >
              <Ionicons name={focused ? filled : outline} size={22} color={focused ? colors.white : colors.gray2} />
              {focused ? <Text style={styles.tabLabel}>{label}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 24, alignItems: 'center',
  },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 20 },
  tabWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, backgroundColor: 'transparent' },
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.ink, borderRadius: radius.pill, padding: 8, justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  tab: { height: 52, minWidth: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 14 },
  tabFocused: { backgroundColor: colors.orange, paddingHorizontal: 18 },
  tabLabel: { color: colors.white, fontFamily: font.bold, fontSize: 14 },
});
