/**
 * Built-in exercise catalogue. MET values from the Compendium of Physical
 * Activities (Ainsworth et al.).
 */
import { Exercise } from './models';
import { ExerciseCategory } from './types';

const ex = (id: string, name: string, category: ExerciseCategory, met: number, muscle: string, icon: string): Exercise =>
  Object.freeze({ id, name, category, met, muscle, icon });

export const CATALOG: readonly Exercise[] = [
  ex('bench_press', 'Bench Press', 'strength', 6.0, 'Chest', 'barbell-outline'),
  ex('squat', 'Barbell Squat', 'strength', 6.0, 'Legs', 'barbell-outline'),
  ex('deadlift', 'Deadlift', 'strength', 6.0, 'Back', 'barbell-outline'),
  ex('bicep_curl', 'Bicep Curl', 'strength', 3.5, 'Arms', 'fitness-outline'),
  ex('push_up', 'Push-up', 'strength', 3.8, 'Chest', 'body-outline'),
  ex('sit_up', 'Sit-up', 'strength', 3.8, 'Core', 'body-outline'),
  ex('pull_up', 'Pull-up', 'strength', 8.0, 'Back', 'body-outline'),
  ex('run_8kmh', 'Running (8 km/h)', 'cardio', 8.3, 'Full body', 'walk-outline'),
  ex('walk_brisk', 'Brisk Walking', 'cardio', 4.3, 'Full body', 'footsteps-outline'),
  ex('cycle_moderate', 'Cycling (16-19 km/h)', 'cardio', 6.8, 'Legs', 'bicycle-outline'),
  ex('jump_rope', 'Jump Rope', 'cardio', 11.8, 'Full body', 'pulse-outline'),
  ex('swim_freestyle', 'Swimming (freestyle)', 'cardio', 5.8, 'Full body', 'water-outline'),
  ex('yoga', 'Yoga (Hatha)', 'cardio', 2.5, 'Mobility', 'leaf-outline'),
];

export const BY_ID: Readonly<Record<string, Exercise>> = Object.fromEntries(CATALOG.map((e) => [e.id, e]));

/** Case-insensitive search over name and muscle group, optionally filtered by category. */
export function searchExercises(query: string, category: ExerciseCategory | 'all' = 'all'): Exercise[] {
  const q = query.trim().toLowerCase();
  return CATALOG.filter((e) =>
    (category === 'all' || e.category === category) &&
    (q === '' || e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q)));
}
