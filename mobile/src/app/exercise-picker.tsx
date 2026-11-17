import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';

import { EmptyState } from '../components/visuals';
import { Badge, Chip, IconButton, IconCircle, IconName, Ionicons, Row, Screen, T } from '../components/ui';
import { searchExercises } from '../domain/exercises';
import { ExerciseCategory } from '../domain/types';
import { useApp } from '../store/AppStore';
import { colors, font, radius } from '../theme';

/** Search screen from the design: orange search header, filter chips, results or "Not Found". */
export default function ExercisePicker() {
  const { exercise, selectExercise } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all');
  const results = useMemo(() => searchExercises(query, category), [query, category]);

  const choose = (id: string) => {
    selectExercise(id);
    router.back();
  };

  return (
    <Screen bg={colors.white} edges={['top', 'bottom']}>
      <View style={{ backgroundColor: colors.orange, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton icon="close" label="Close" bg="rgba(255,255,255,0.2)" color={colors.white} onPress={() => router.back()} />
          <T v="title" style={{ color: colors.white }}>Search</T>
          <View style={{ width: 48 }} />
        </Row>
        <Row gap={10} style={{ backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 16, height: 52, marginTop: 16 }}>
          <Ionicons name="search" size={20} color={colors.gray} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Exercise or muscle group"
            placeholderTextColor={colors.gray2}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search exercises"
            style={{ flex: 1, fontFamily: font.semibold, fontSize: 16, color: colors.ink, height: 52 }}
          />
          {query ? <IconButton icon="close-circle" label="Clear search" size={32} bg="transparent" color={colors.gray} onPress={() => setQuery('')} /> : null}
        </Row>
        <Row gap={8} style={{ marginTop: 14 }}>
          {(['all', 'strength', 'cardio'] as const).map((c) => (
            <Chip key={c} dark label={c === 'all' ? 'All' : c === 'strength' ? 'Strength' : 'Cardio'}
              selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </Row>
      </View>

      <FlatList
        data={results}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, gap: 10, flexGrow: 1 }}
        ListHeaderComponent={results.length ? <T v="caption">{results.length} result{results.length === 1 ? '' : 's'}</T> : undefined}
        ListEmptyComponent={
          <EmptyState icon="search" message={`We couldn't find "${query}". Try another exercise name or muscle group.`}
            actionLabel="Clear search" onAction={() => { setQuery(''); setCategory('all'); }} />
        }
        renderItem={({ item }) => {
          const selected = item.id === exercise.id;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${item.name}, ${item.muscle}, ${item.category}`}
              onPress={() => choose(item.id)}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, minHeight: 68,
                borderWidth: 1.5, borderColor: selected ? colors.orange : colors.line,
                backgroundColor: selected ? colors.orangeSoft : pressed ? colors.bg : colors.white,
              })}
            >
              <IconCircle icon={item.icon as IconName} bg={selected ? colors.orange : colors.bg} color={selected ? colors.white : colors.ink} />
              <View style={{ flex: 1 }}>
                <T v="title">{item.name}</T>
                <T v="caption">{item.muscle} · {item.category === 'strength' ? 'Sets & reps' : 'Duration'}</T>
              </View>
              <Badge text={`${item.met} MET`} tone={selected ? 'orange' : 'gray'} />
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
