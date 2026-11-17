/** Persistence, exercise search and dashboard statistics. */
import { CATALOG, searchExercises } from '../exercises';
import { createProfile, profileMetrics, WorkoutSummary } from '../models';
import { lastDays, streak, today, totals } from '../stats';
import { MemoryStore, Repository, StorageError } from '../storage';

const summary = (id: string, dateIso: string, kcal = 250, reps = 50): WorkoutSummary => ({
  id, dateIso, activeMinutes: 30, totalReps: reps, totalVolumeKg: 1000, caloriesKcal: kcal, exercises: ['Squat'],
});

const local = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h).toISOString();

describe('Repository', () => {
  test('empty on first launch', async () => {
    const repo = new Repository(new MemoryStore());
    expect(await repo.loadProfile()).toBeNull();
    expect(await repo.listWorkouts()).toEqual([]);
  });

  test('profile round trip keeps metrics identical', async () => {
    const repo = new Repository(new MemoryStore());
    const p = createProfile({ name: 'Sam', age: 30, sex: 'female', weightKg: 60, heightCm: 165, activityLevel: 'active', goal: 'keep_fit' });
    await repo.saveProfile(p);
    const loaded = await new Repository((repo as any).store).loadProfile();
    expect(loaded).toEqual(p);
    expect(profileMetrics(loaded!).tdee).toBeCloseTo(profileMetrics(p).tdee, 6);
  });

  test('history is newest first', async () => {
    const repo = new Repository(new MemoryStore());
    await repo.addWorkout(summary('1', '2026-11-01T08:00:00.000Z'));
    await repo.addWorkout(summary('2', '2026-11-03T08:00:00.000Z'));
    await repo.addWorkout(summary('3', '2026-11-02T08:00:00.000Z'));
    expect((await repo.listWorkouts()).map((s) => s.id)).toEqual(['2', '3', '1']);
  });

  test('corrupted data raises StorageError', async () => {
    const store = new MemoryStore();
    await store.setItem('fittrack.history.v1', '{not json');
    await expect(new Repository(store).listWorkouts()).rejects.toThrow(StorageError);
  });

  test('tampered profile is re-validated on load', async () => {
    const store = new MemoryStore();
    await store.setItem('fittrack.profile.v1', JSON.stringify({ name: 'X', age: 5, sex: 'male', weightKg: 70, heightCm: 175, activityLevel: 'moderate', goal: 'keep_fit' }));
    await expect(new Repository(store).loadProfile()).rejects.toThrow('Age');
  });

  test('clearAll wipes profile and history', async () => {
    const repo = new Repository(new MemoryStore());
    await repo.addWorkout(summary('1', '2026-11-01T08:00:00.000Z'));
    await repo.clearAll();
    expect(await repo.listWorkouts()).toEqual([]);
  });
});

describe('createProfile', () => {
  test('defaults: name, recommended calorie goal, burn goal', () => {
    const p = createProfile({ age: 25, sex: 'male', weightKg: 70, heightCm: 175, activityLevel: 'moderate', goal: 'lose_weight' });
    expect(p.name).toBe('Athlete');
    expect(p.dailyCalorieGoal).toBe(2090);
    expect(p.dailyBurnGoal).toBe(400);
  });

  test('requires gender and goal', () => {
    const base = { age: 25, weightKg: 70, heightCm: 175, activityLevel: 'moderate' as const };
    expect(() => createProfile({ ...base, sex: undefined as never, goal: 'keep_fit' })).toThrow('gender');
    expect(() => createProfile({ ...base, sex: 'male', goal: undefined as never })).toThrow('goal');
  });
});

describe('exercise search', () => {
  test('empty query returns everything', () => {
    expect(searchExercises('')).toHaveLength(CATALOG.length);
  });
  test('matches name or muscle, case-insensitive', () => {
    expect(searchExercises('BENCH').map((e) => e.id)).toEqual(['bench_press']);
    expect(searchExercises('legs').map((e) => e.id)).toEqual(['squat', 'cycle_moderate']);
  });
  test('category filter', () => {
    expect(searchExercises('', 'cardio').every((e) => e.category === 'cardio')).toBe(true);
  });
  test('no match returns empty list (Not Found state)', () => {
    expect(searchExercises('zumba')).toEqual([]);
  });
});

describe('stats', () => {
  const now = new Date(2026, 10, 17, 18); // Tue 17 Nov 2026, local time
  const history = [
    summary('a', local(2026, 11, 17), 300, 40),
    summary('b', local(2026, 11, 17, 7), 100, 10),
    summary('c', local(2026, 11, 16), 200, 20),
    summary('d', local(2026, 11, 14), 150, 30),
    summary('e', local(2026, 11, 1), 999, 99), // outside the 7-day window
  ];

  test('today', () => {
    expect(today(history, now)).toMatchObject({ kcal: 400, reps: 50, workouts: 2, label: 'Tue' });
  });

  test('last 7 days, oldest first, zero-filled', () => {
    const days = lastDays(history, now);
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.label)).toEqual(['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue']);
    expect(days.map((d) => d.kcal)).toEqual([0, 0, 0, 150, 0, 200, 400]);
  });

  test('streak counts consecutive days ending today', () => {
    expect(streak(history, now)).toBe(2);
  });

  test('streak survives if today has no workout yet', () => {
    expect(streak(history, new Date(2026, 10, 18, 8))).toBe(2);
    expect(streak(history, new Date(2026, 10, 19, 8))).toBe(0);
  });

  test('totals', () => {
    expect(totals(history)).toEqual({ workouts: 5, kcal: 1749, reps: 199, minutes: 150 });
    expect(totals([])).toEqual({ workouts: 0, kcal: 0, reps: 0, minutes: 0 });
  });
});
