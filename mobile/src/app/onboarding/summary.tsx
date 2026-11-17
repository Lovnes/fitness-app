import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';

import { StepLayout } from '../../components/StepLayout';
import { Badge, Card, IconCircle, Row, T } from '../../components/ui';
import { createProfile, profileMetrics } from '../../domain/models';
import { GOAL_LABEL, levelToActivity } from '../../domain/types';
import { ValidationError } from '../../domain/validation';
import { useApp } from '../../store/AppStore';
import { colors, fmt, font, radius } from '../../theme';

export default function Summary() {
  const { draft, setDraft, saveProfile } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => {
    try {
      const p = createProfile({
        name: draft.name, age: draft.age, sex: draft.sex!, weightKg: draft.weightKg, heightCm: draft.heightCm,
        activityLevel: levelToActivity(draft.level), goal: draft.goal!,
      });
      return { profile: p, metrics: profileMetrics(p), error: null };
    } catch (e) {
      return { profile: null, metrics: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [draft]);

  const finish = async () => {
    if (!result.profile) return;
    setSaving(true);
    try {
      await saveProfile(result.profile);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof ValidationError || e instanceof Error ? e.message : 'Could not save your profile');
      setSaving(false);
    }
  };

  const m = result.metrics;
  return (
    <StepLayout step={7} scroll title="Your plan is ready" subtitle="Based on your answers. You can change them any time in Profile."
      nextLabel={draft.editing ? 'Save changes' : 'Start my journey'} onNext={finish} nextDisabled={!result.profile || saving}>
      <View style={{ gap: 12 }}>
        {error || result.error ? (
          <View accessibilityLiveRegion="polite" style={{ backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: 12 }}>
            <T style={{ color: colors.danger }}>{error ?? result.error}</T>
          </View>
        ) : null}

        <View>
          <T v="caption" style={{ marginBottom: 6 }}>What should we call you?</T>
          <TextInput
            value={draft.name}
            onChangeText={(name) => setDraft({ name })}
            placeholder="Your name"
            placeholderTextColor={colors.gray2}
            maxLength={40}
            autoCapitalize="words"
            returnKeyType="done"
            accessibilityLabel="Your name"
            style={{ height: 56, borderRadius: radius.md, backgroundColor: colors.bg, paddingHorizontal: 16, fontFamily: font.semibold, fontSize: 16, color: colors.ink }}
          />
        </View>

        {m && result.profile ? (
          <>
            <Card style={{ backgroundColor: colors.orange, borderColor: colors.orange }}>
              <T v="overline" style={{ color: 'rgba(255,255,255,0.8)' }}>Daily calorie target</T>
              <Row style={{ alignItems: 'flex-end', marginTop: 4 }} gap={6}>
                <T v="display" style={{ color: colors.white, fontSize: 48 }}>{fmt.int(result.profile.dailyCalorieGoal)}</T>
                <T v="title" style={{ color: colors.white, marginBottom: 10 }}>kcal</T>
              </Row>
              <T style={{ color: 'rgba(255,255,255,0.9)' }}>Goal: {GOAL_LABEL[result.profile.goal]}</T>
            </Card>
            <Row gap={12} style={{ alignItems: 'stretch' }}>
              <Metric icon="body-outline" label="BMI" value={fmt.one(m.bmi)} badge={m.bmiCategory} />
              <Metric icon="flame-outline" label="BMR" value={fmt.int(m.bmr)} unit="kcal" />
            </Row>
            <Row gap={12} style={{ alignItems: 'stretch' }}>
              <Metric icon="flash-outline" label="Maintenance" value={fmt.int(m.tdee)} unit="kcal" />
              <Metric icon="speedometer-outline" label="Weight · Height" value={`${draft.weightKg}·${draft.heightCm}`} unit="kg · cm" />
            </Row>
          </>
        ) : null}
      </View>
    </StepLayout>
  );
}

function Metric({ icon, label, value, unit, badge }: {
  icon: 'body-outline' | 'flame-outline' | 'flash-outline' | 'speedometer-outline'; label: string; value: string; unit?: string; badge?: string;
}) {
  return (
    <Card style={{ flex: 1, gap: 8 }}>
      <Row gap={8}>
        <IconCircle icon={icon} size={34} />
        <T v="caption">{label}</T>
      </Row>
      <T v="h2">{value} {unit ? <T v="caption">{unit}</T> : null}</T>
      {badge ? <Badge text={badge} tone={badge === 'Normal' ? 'success' : 'orange'} /> : null}
    </Card>
  );
}
