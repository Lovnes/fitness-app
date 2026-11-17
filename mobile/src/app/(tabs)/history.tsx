import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, TextInput, View } from 'react-native';

import { EmptyState } from '../../components/visuals';
import { Badge, Card, IconCircle, Ionicons, Row, Screen, T } from '../../components/ui';
import { WorkoutSummary } from '../../domain/models';
import { totals } from '../../domain/stats';
import { useApp } from '../../store/AppStore';
import { colors, fmt, font, radius } from '../../theme';

export default function History() {
  const { history } = useApp();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? history.filter((w) => w.exercises.some((e) => e.toLowerCase().includes(q))) : history;
  }, [history, query]);

  const sections = useMemo(() => {
    const groups = new Map<string, WorkoutSummary[]>();
    for (const w of filtered) {
      const key = fmt.date(w.dateIso);
      groups.set(key, [...(groups.get(key) ?? []), w]);
    }
    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [filtered]);

  const t = totals(history);

  if (history.length === 0) {
    return (
      <Screen bg={colors.bg}>
        <View style={{ padding: 20 }}><T v="h1">History</T></View>
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 100 }}>
          <EmptyState icon="barbell-outline" title="No workouts yet"
            message="Finish your first workout and it will show up here with reps, calories and time."
            actionLabel="Start a workout" onAction={() => router.navigate('/(tabs)/workout')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen bg={colors.bg}>
      <SectionList
        sections={sections}
        keyExtractor={(w) => w.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ gap: 14, paddingTop: 20, paddingBottom: 6 }}>
            <T v="h1">History</T>
            <Card dark style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 18 }}>
              <Total label="Workouts" value={fmt.int(t.workouts)} />
              <Total label="Calories" value={fmt.int(t.kcal)} />
              <Total label="Reps" value={fmt.int(t.reps)} />
              <Total label="Minutes" value={fmt.int(t.minutes)} />
            </Card>
            <Row gap={10} style={{ backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: colors.line }}>
              <Ionicons name="search" size={18} color={colors.gray} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Filter by exercise" placeholderTextColor={colors.gray2}
                accessibilityLabel="Filter workouts by exercise"
                style={{ flex: 1, height: 50, fontFamily: font.semibold, fontSize: 15, color: colors.ink }} />
            </Row>
          </View>
        }
        renderSectionHeader={({ section }) => <T v="overline" style={{ marginTop: 16, marginBottom: 8 }}>{section.title}</T>}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<EmptyState icon="search" message={`No workouts with "${query}".`} actionLabel="Clear filter" onAction={() => setQuery('')} />}
        renderItem={({ item }) => (
          <Card style={{ gap: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={12} style={{ flex: 1 }}>
                <IconCircle icon="barbell-outline" />
                <View style={{ flex: 1 }}>
                  <T v="title" numberOfLines={1}>{item.exercises.join(', ')}</T>
                  <T v="caption">{fmt.time(item.dateIso)} · {fmt.clock(item.activeMinutes)} active</T>
                </View>
              </Row>
              <Badge text={`${fmt.int(item.caloriesKcal)} kcal`} />
            </Row>
            <Row gap={16}>
              <Mini icon="repeat" text={`${fmt.int(item.totalReps)} reps`} />
              <Mini icon="barbell" text={`${fmt.int(item.totalVolumeKg)} kg volume`} />
            </Row>
          </Card>
        )}
      />
    </Screen>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <T v="h2" style={{ color: colors.white }}>{value}</T>
      <T v="caption" style={{ color: colors.gray2 }}>{label}</T>
    </View>
  );
}

function Mini({ icon, text }: { icon: 'repeat' | 'barbell'; text: string }) {
  return (
    <Row gap={6}>
      <Ionicons name={icon} size={16} color={colors.orange} />
      <T v="caption" style={{ color: colors.ink }}>{text}</T>
    </Row>
  );
}
