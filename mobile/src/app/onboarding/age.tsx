import { router } from 'expo-router';

import { WheelPicker } from '../../components/pickers';
import { StepLayout } from '../../components/StepLayout';
import { AGE } from '../../domain/validation';
import { useApp } from '../../store/AppStore';

export default function Age() {
  const { draft, setDraft } = useApp();
  return (
    <StepLayout step={2} title="What's your age?" subtitle={`Scroll to choose (${AGE.min}–${AGE.max} years).`}
      onNext={() => router.push('/onboarding/weight')}>
      <WheelPicker label="Age in years" min={AGE.min} max={AGE.max} value={draft.age} onChange={(age) => setDraft({ age })} />
    </StepLayout>
  );
}
