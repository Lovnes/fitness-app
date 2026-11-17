import { router } from 'expo-router';
import { View } from 'react-native';

import { RulerPicker } from '../../components/pickers';
import { StepLayout } from '../../components/StepLayout';
import { HEIGHT } from '../../domain/validation';
import { useApp } from '../../store/AppStore';

export default function Height() {
  const { draft, setDraft } = useApp();
  return (
    <StepLayout step={4} title="How tall are you?" subtitle={`Slide the ruler (${HEIGHT.min}–${HEIGHT.max} cm).`}
      onNext={() => router.push('/onboarding/level')}>
      <View style={{ marginHorizontal: -20 }}>
        <RulerPicker label="Height" unit="cm" min={HEIGHT.min} max={HEIGHT.max}
          value={draft.heightCm} onChange={(heightCm) => setDraft({ heightCm })} />
      </View>
    </StepLayout>
  );
}
