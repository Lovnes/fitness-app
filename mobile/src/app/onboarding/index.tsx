import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Ionicons, Screen, T } from '../../components/ui';
import { useApp } from '../../store/AppStore';
import { colors, font } from '../../theme';

const BARS = [18, 34, 56, 30, 74, 104, 64, 120, 86, 48, 96, 132, 70, 40, 88, 60, 110, 52, 28, 46, 20];

/** Welcome screen — waveform hero + headline with an orange highlight, as in the reference design. */
export default function Welcome() {
  const { draft } = useApp();
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="flash" size={20} color={colors.white} />
          </View>
          <Text style={{ fontFamily: font.extrabold, fontSize: 20, color: colors.ink }}>FitTrack</Text>
        </View>
        {draft.editing ? <T v="caption">Editing profile</T> : null}
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 150 }}
          accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {BARS.map((h, i) => (
            <View key={i} style={{ width: 8, height: h, borderRadius: 4, backgroundColor: i === 11 ? colors.orange : i % 3 === 0 ? colors.ink : colors.gray2 }} />
          ))}
        </View>
        <View style={{ paddingHorizontal: 28, marginTop: 40 }}>
          <Text style={{ fontFamily: font.extrabold, fontSize: 34, lineHeight: 42, color: colors.ink, letterSpacing: -0.8, textAlign: 'center' }}>
            Every rep{' '}
            <Text style={{ backgroundColor: colors.orange, color: colors.white }}> counts. </Text>
            {'\n'}Every calorie, tracked.
          </Text>
          <T v="caption" style={{ textAlign: 'center', marginTop: 14, fontSize: 15 }}>
            Answer 6 quick questions and we&apos;ll work out your BMI, metabolism and a daily calorie target.
          </T>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 10 }}>
        <Button label={draft.editing ? 'Update my assessment' : 'Get started'} onPress={() => router.push('/onboarding/gender')} />
        <T v="caption" style={{ textAlign: 'center' }}>Takes about a minute · Your data stays on this phone</T>
      </View>
    </Screen>
  );
}
