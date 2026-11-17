import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart, ProgressRing } from '../../components/visuals';
import { Badge, Card, Chip, IconButton, IconCircle, IconName, Ionicons, Row, T } from '../../components/ui';
import { searchExercises } from '../../domain/exercises';
import { profileMetrics } from '../../domain/models';
import { lastDays, streak, today } from '../../domain/stats';
import { ExerciseCategory, GOAL_LABEL } from '../../domain/types';
import { useApp, useTicker } from '../../store/AppStore';
import { colors, fmt, font, radius } from '../../theme';

const CATEGORIES: { key: ExerciseCategory | 'all'; label: string; icon: IconName }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'strength', label: 'Strength', icon: 'barbell-outline' },
  { key: 'cardio', label: 'Cardio', icon: 'heart-outline' },
];

export default function Home() {
  const { profile, history, session, selectExercise } = useApp();
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all');
  const insets = useSafeAreaInsets();
  const running = session?.state === 'in_progress';
  useTicker(running);

  if (!profile) return null;

  // Cheap aggregations over local history; recomputed each render so "today" rolls over at midnight.
  const now = new Date();
  const day = today(history, now);
  const week = lastDays(history, now);
  const days = streak(history, now);

  const m = profileMetrics(profile);
  const liveKcal = session && !['completed', 'cancelled'].includes(session.state) ? session.totalCalories() : 0;
  const burned = day.kcal + liveKcal;
  const exercises = searchExercises('', category);
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Dark header */}
        <View style={{ backgroundColor: colors.ink, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, paddingTop: insets.top }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={12}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.white, fontFamily: font.extrabold, fontSize: 18 }}>{profile.name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View>
                  <T v="caption" style={{ color: colors.gray2 }}>{greeting}</T>
                  <T v="h2" style={{ color: colors.white }}>Hello, {profile.name}</T>
                </View>
              </Row>
              <IconButton icon="person-outline" label="Open profile" bg={colors.ink3} color={colors.white} onPress={() => router.navigate('/(tabs)/profile')} />
            </Row>
            <Row gap={8} style={{ marginTop: 18, flexWrap: 'wrap' }}>
              <Badge text={GOAL_LABEL[profile.goal]} tone="orange" />
              <Badge text={`${days}-day streak`} tone="dark" />
              <Badge text={`BMI ${fmt.one(m.bmi)}`} tone="dark" />
            </Row>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 16, marginTop: 20 }}>
          {/* Today ring */}
          <Card style={{ backgroundColor: colors.orange, borderColor: colors.orange, padding: 20 }}>
            <Row gap={18}>
              <ProgressRing progress={burned / profile.dailyBurnGoal}>
                <Text style={{ color: colors.white, fontFamily: font.extrabold, fontSize: 28 }}>{fmt.int(burned)}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: font.semibold, fontSize: 12 }}>of {profile.dailyBurnGoal} kcal</Text>
              </ProgressRing>
              <View style={{ flex: 1, gap: 10 }}>
                <T v="overline" style={{ color: 'rgba(255,255,255,0.85)' }}>Today</T>
                <Stat label="Reps" value={fmt.int(day.reps + (liveKcal ? session!.totalReps() : 0))} />
                <Stat label="Workouts" value={`${day.workouts}`} />
                <Stat label="Intake target" value={`${fmt.int(profile.dailyCalorieGoal)} kcal`} />
              </View>
            </Row>
          </Card>

          {/* Start / resume */}
          <Card dark onPress={() => router.navigate('/(tabs)/workout')} accessibilityLabel={session && !['completed', 'cancelled'].includes(session.state) ? 'Resume workout' : 'Start a workout'}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={14}>
                <IconCircle icon={running ? 'pulse' : 'play'} bg={colors.orange} color={colors.white} size={52} />
                <View>
                  <T v="title" style={{ color: colors.white }}>
                    {session && !['completed', 'cancelled'].includes(session.state) ? 'Workout in progress' : 'Start a workout'}
                  </T>
                  <T v="caption" style={{ color: colors.gray2 }}>
                    {session && !['completed', 'cancelled'].includes(session.state)
                      ? `${fmt.clock(session.activeMinutes)} · ${fmt.int(session.totalCalories())} kcal`
                      : 'Log sets, reps and cardio'}
                  </T>
                </View>
              </Row>
              <Ionicons name="arrow-forward" size={22} color={colors.white} />
            </Row>
          </Card>

          {/* Browse category */}
          <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <T v="h2">Browse category</T>
          </Row>
          <Row gap={8}>
            {CATEGORIES.map((c) => (
              <Chip key={c.key} label={c.label} icon={c.icon} selected={category === c.key} onPress={() => setCategory(c.key)} />
            ))}
          </Row>
        </View>

        <FlatList
          horizontal
          data={exercises}
          keyExtractor={(e) => e.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingVertical: 14 }}
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.muscle}`}
              onPress={() => { selectExercise(item.id); router.navigate('/(tabs)/workout'); }}
              style={({ pressed }) => ({
                width: 150, height: 170, borderRadius: radius.lg, padding: 14, justifyContent: 'space-between',
                backgroundColor: index % 3 === 0 ? colors.ink : colors.white, borderWidth: 1,
                borderColor: index % 3 === 0 ? colors.ink : colors.line, opacity: pressed ? 0.85 : 1,
              })}
            >
              <IconCircle icon={item.icon as IconName} size={44}
                bg={index % 3 === 0 ? colors.orange : colors.orangeSoft} color={index % 3 === 0 ? colors.white : colors.orange} />
              <View>
                <T v="title" numberOfLines={2} style={{ color: index % 3 === 0 ? colors.white : colors.ink }}>{item.name}</T>
                <T v="caption" style={{ color: index % 3 === 0 ? colors.gray2 : colors.gray }}>{item.muscle} · {item.met} MET</T>
              </View>
            </Pressable>
          )}
        />

        <View style={{ paddingHorizontal: 20, gap: 16 }}>
          {/* Week chart */}
          <Card>
            <Row style={{ justifyContent: 'space-between', marginBottom: 14 }}>
              <View>
                <T v="title">This week</T>
                <T v="caption">Calories burned per day</T>
              </View>
              <Badge text={`${fmt.int(week.reduce((s, d) => s + d.kcal, 0))} kcal`} />
            </Row>
            <BarChart data={week.map((d) => ({ label: d.label, value: d.kcal + (d.key === day.key ? liveKcal : 0) }))} />
          </Card>

          {/* Daily energy */}
          <Row gap={12}>
            <MiniCard icon="flame-outline" label="BMR" value={fmt.int(m.bmr)} unit="kcal/day" />
            <MiniCard icon="flash-outline" label="Maintenance" value={fmt.int(m.tdee)} unit="kcal/day" />
          </Row>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: font.medium, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.white, fontFamily: font.bold, fontSize: 15 }}>{value}</Text>
    </Row>
  );
}

function MiniCard({ icon, label, value, unit }: { icon: IconName; label: string; value: string; unit: string }) {
  return (
    <Card style={{ flex: 1, gap: 10 }}>
      <IconCircle icon={icon} size={38} />
      <View>
        <T v="caption">{label}</T>
        <T v="h2">{value}</T>
        <T v="caption">{unit}</T>
      </View>
    </Card>
  );
}
