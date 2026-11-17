import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { StepLayout } from '../../components/StepLayout';
import { IconCircle, IconName, Ionicons, T } from '../../components/ui';
import { FitnessGoal, GOAL_ADJUSTMENT, GOAL_LABEL, GOALS } from '../../domain/types';
import { useApp } from '../../store/AppStore';
import { colors, radius } from '../../theme';

const ICON: Record<FitnessGoal, IconName> = {
  lose_weight: 'flame-outline',
  build_muscle: 'barbell-outline',
  keep_fit: 'heart-outline',
  endurance: 'speedometer-outline',
};

function adjustment(goal: FitnessGoal): string {
  const a = GOAL_ADJUSTMENT[goal];
  return a === 0 ? 'Eat at maintenance' : `${a > 0 ? '+' : '−'}${Math.abs(a)} kcal / day vs maintenance`;
}

export default function Goal() {
  const { draft, setDraft } = useApp();
  return (
    <StepLayout step={6} title="What is your fitness goal?" subtitle="We'll adjust your daily calorie target to match."
      onNext={() => router.push('/onboarding/summary')} nextDisabled={!draft.goal}>
      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {GOALS.map((g) => {
          const selected = draft.goal === g;
          return (
            <Pressable
              key={g}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={GOAL_LABEL[g]}
              onPress={() => setDraft({ goal: g })}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, minHeight: 76, borderRadius: radius.lg,
                borderWidth: 2, borderColor: selected ? colors.orange : colors.line, backgroundColor: selected ? colors.orangeSoft : colors.white,
              }}
            >
              <IconCircle icon={ICON[g]} bg={selected ? colors.orange : colors.bg} color={selected ? colors.white : colors.ink} />
              <View style={{ flex: 1 }}>
                <T v="title">{GOAL_LABEL[g]}</T>
                <T v="caption">{adjustment(g)}</T>
              </View>
              <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
                borderColor: selected ? colors.orange : colors.gray2, backgroundColor: selected ? colors.orange : 'transparent' }}>
                {selected ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </StepLayout>
  );
}
