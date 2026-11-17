import { router } from 'expo-router';
import { View } from 'react-native';

import { RulerPicker } from '../../components/pickers';
import { StepLayout } from '../../components/StepLayout';
import { BODY_WEIGHT } from '../../domain/validation';
import { useApp } from '../../store/AppStore';

export default function Weight() {
  const { draft, setDraft } = useApp();
  return (
    <StepLayout step={3} onDark title="What's your current weight right now?"
      subtitle={`Slide the ruler (${BODY_WEIGHT.min}–${BODY_WEIGHT.max} kg).`}
      onNext={() => router.push('/onboarding/height')}>
      <View style={{ marginHorizontal: -20 }}>
        <RulerPicker label="Body weight" unit="kg" onDark min={BODY_WEIGHT.min} max={BODY_WEIGHT.max}
          value={draft.weightKg} onChange={(weightKg) => setDraft({ weightKg })} />
      </View>
    </StepLayout>
  );
}
