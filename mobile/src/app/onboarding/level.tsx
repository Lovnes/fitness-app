import { router } from 'expo-router';

import { StepLayout } from '../../components/StepLayout';
import { LevelGauge } from '../../components/visuals';
import { ACTIVITY_HINT, ACTIVITY_LABEL, levelToActivity } from '../../domain/types';
import { useApp } from '../../store/AppStore';

export default function Level() {
  const { draft, setDraft } = useApp();
  const activity = levelToActivity(draft.level);
  return (
    <StepLayout step={5} title="How would you rate your fitness level?" subtitle="Sets the activity factor used for your daily energy needs."
      onNext={() => router.push('/onboarding/goal')}>
      <LevelGauge level={draft.level} onChange={(level) => setDraft({ level })}
        label={ACTIVITY_LABEL[activity]} hint={ACTIVITY_HINT[activity]} />
    </StepLayout>
  );
}
