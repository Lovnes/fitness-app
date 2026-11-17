import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ConfirmSheet } from '../../components/chrome';
import { BarChart } from '../../components/visuals';
import { Badge, Card, IconCircle, IconName, Ionicons, Row, Screen, T } from '../../components/ui';
import { profileMetrics } from '../../domain/models';
import { lastDays } from '../../domain/stats';
import { ACTIVITY_LABEL, GOAL_LABEL } from '../../domain/types';
import { useApp } from '../../store/AppStore';
import { colors, fmt, font, radius } from '../../theme';

export default function Profile() {
  const { profile, history, editProfile, resetAll } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const [about, setAbout] = useState(false);
  const week = useMemo(() => lastDays(history, new Date()), [history]);
  if (!profile) return null;
  const m = profileMetrics(profile);

  const edit = () => {
    editProfile();
    router.push('/onboarding');
  };

  return (
    <Screen bg={colors.bg}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 16 }} showsVerticalScrollIndicator={false}>
        <T v="h1">Profile</T>

        {/* Identity */}
        <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center',
            borderWidth: 5, borderColor: colors.orangeSoft }}>
            <Text style={{ color: colors.white, fontFamily: font.extrabold, fontSize: 38 }}>{profile.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <T v="h2" style={{ marginTop: 12 }}>{profile.name}</T>
          <Row gap={8} style={{ marginTop: 8 }}>
            <Badge text={GOAL_LABEL[profile.goal]} />
            <Badge text={ACTIVITY_LABEL[profile.activityLevel]} tone="dark" />
          </Row>
          <Row style={{ marginTop: 20, alignSelf: 'stretch', justifyContent: 'space-around' }}>
            <Fact label="Weight" value={`${fmt.kg(profile.weightKg)} kg`} />
            <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.line }} />
            <Fact label="Height" value={`${fmt.kg(profile.heightCm)} cm`} />
            <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.line }} />
            <Fact label="Age" value={`${profile.age} yrs`} />
          </Row>
        </Card>

        {/* Metrics */}
        <Row gap={12} style={{ alignItems: 'stretch' }}>
          <Metric label="BMI" value={fmt.one(m.bmi)} sub={m.bmiCategory} highlight />
          <Metric label="BMR" value={fmt.int(m.bmr)} sub="kcal / day" />
        </Row>
        <Row gap={12} style={{ alignItems: 'stretch' }}>
          <Metric label="Maintenance" value={fmt.int(m.tdee)} sub="kcal / day" />
          <Metric label="Daily target" value={fmt.int(profile.dailyCalorieGoal)} sub="kcal intake" />
        </Row>

        {/* Activity chart */}
        <Card dark>
          <Row style={{ justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <T v="title" style={{ color: colors.white }}>Activity</T>
              <T v="caption" style={{ color: colors.gray2 }}>kcal burned, last 7 days</T>
            </View>
            <Badge text={`${fmt.int(week.reduce((s, d) => s + d.kcal, 0))} kcal`} />
          </Row>
          <BarChart dark data={week.map((d) => ({ label: d.label, value: d.kcal }))} height={110} />
        </Card>

        {/* Settings */}
        <T v="h2" style={{ marginTop: 4 }}>Account settings</T>
        <Card style={{ padding: 6 }}>
          <SettingRow icon="create-outline" label="Edit assessment" hint="Gender, age, weight, height, level, goal" onPress={edit} />
          <Divider />
          <SettingRow icon="information-circle-outline" label="About & formulas" hint="How calories are calculated" onPress={() => setAbout(true)} />
          <Divider />
          <SettingRow icon="trash-outline" label="Reset all data" hint="Delete profile and history from this phone" danger onPress={() => setConfirmReset(true)} />
        </Card>
        <T v="caption" style={{ textAlign: 'center' }}>FitTrack v{Constants.expoConfig?.version ?? '1.0.0'} · data stored only on this device</T>
      </ScrollView>

      <ConfirmSheet visible={confirmReset} tone="danger" icon="warning-outline" title="Reset all data?"
        message="Your profile and all workout history will be permanently deleted from this phone."
        confirmLabel="Delete everything" onClose={() => setConfirmReset(false)}
        onConfirm={async () => { setConfirmReset(false); await resetAll(); router.replace('/onboarding'); }} />

      <ConfirmSheet visible={about} icon="calculator-outline" title="How FitTrack calculates" confirmLabel="Got it" cancelLabel="Close"
        message="All values use published formulas and are estimates." onClose={() => setAbout(false)} onConfirm={() => setAbout(false)}>
        <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 16 }}>
          {[
            ['Calories', 'MET × 3.5 × kg ÷ 200 × minutes'],
            ['Strength time', 'reps × 3 s + 60 s rest between sets'],
            ['BMR', 'Mifflin-St Jeor'],
            ['Maintenance', 'BMR × activity factor (1.2–1.9)'],
            ['1-rep max', 'Epley: w × (1 + reps ÷ 30), 1–12 reps'],
          ].map(([k, val]) => (
            <Row key={k} style={{ justifyContent: 'space-between', backgroundColor: colors.bg, borderRadius: radius.sm, padding: 10 }}>
              <T v="caption" style={{ color: colors.ink, fontFamily: font.bold }}>{k}</T>
              <T v="caption" style={{ flex: 1, textAlign: 'right', marginLeft: 12 }}>{val}</T>
            </Row>
          ))}
        </View>
      </ConfirmSheet>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <T v="title">{value}</T>
      <T v="caption">{label}</T>
    </View>
  );
}

function Metric({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <Card style={[{ flex: 1 }, highlight && { backgroundColor: colors.orange, borderColor: colors.orange }]}>
      <T v="caption" style={highlight ? { color: 'rgba(255,255,255,0.85)' } : undefined}>{label}</T>
      <T v="h1" style={highlight ? { color: colors.white } : undefined}>{value}</T>
      <T v="caption" style={highlight ? { color: colors.white, fontFamily: font.bold } : undefined}>{sub}</T>
    </Card>
  );
}

function SettingRow({ icon, label, hint, onPress, danger }: { icon: IconName; label: string; hint: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 64, borderRadius: radius.md, backgroundColor: pressed ? colors.bg : 'transparent' })}>
      <IconCircle icon={icon} size={40} bg={danger ? colors.dangerSoft : colors.orangeSoft} color={danger ? colors.danger : colors.orange} />
      <View style={{ flex: 1 }}>
        <T v="title" style={danger ? { color: colors.danger } : undefined}>{label}</T>
        <T v="caption">{hint}</T>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.gray2} />
    </Pressable>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.line, marginHorizontal: 12 }} />;
}
