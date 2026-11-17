import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { StepLayout } from '../../components/StepLayout';
import { IconName, Ionicons } from '../../components/ui';
import { Sex } from '../../domain/types';
import { useApp } from '../../store/AppStore';
import { colors, font, radius } from '../../theme';

const OPTIONS: { value: Sex; label: string; icon: IconName }[] = [
  { value: 'male', label: 'Male', icon: 'male' },
  { value: 'female', label: 'Female', icon: 'female' },
];

export default function Gender() {
  const { draft, setDraft } = useApp();
  return (
    <StepLayout step={1} title="What is your gender?" subtitle="Used only for the BMR formula (Mifflin-St Jeor)."
      onNext={() => router.push('/onboarding/age')} nextDisabled={!draft.sex}>
      <View style={{ flexDirection: 'row', gap: 14 }} accessibilityRole="radiogroup">
        {OPTIONS.map((o) => {
          const selected = draft.sex === o.value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              onPress={() => setDraft({ sex: o.value })}
              style={({ pressed }) => ({
                flex: 1, height: 260, borderRadius: radius.xl, padding: 18, justifyContent: 'space-between',
                backgroundColor: selected ? colors.orange : colors.bg, borderWidth: 2,
                borderColor: selected ? colors.orange : colors.bg, opacity: pressed ? 0.9 : 1,
              })}
            >
              <View style={{ alignSelf: 'flex-end', width: 28, height: 28, borderRadius: 14, borderWidth: 2,
                borderColor: selected ? colors.white : colors.gray2, backgroundColor: selected ? colors.white : 'transparent',
                alignItems: 'center', justifyContent: 'center' }}>
                {selected ? <Ionicons name="checkmark" size={18} color={colors.orange} /> : null}
              </View>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: selected ? 'rgba(255,255,255,0.2)' : colors.white }}>
                  <Ionicons name={o.icon} size={52} color={selected ? colors.white : colors.ink} />
                </View>
              </View>
              <Text style={{ fontFamily: font.extrabold, fontSize: 22, color: selected ? colors.white : colors.ink, textAlign: 'center' }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </StepLayout>
  );
}
