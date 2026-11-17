/** Enumerations and shared types (see docs/uml/class.puml). */

export type Sex = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export const ACTIVITY_LEVELS: readonly ActivityLevel[] = [
  'sedentary', 'light', 'moderate', 'active', 'very_active',
];

/** Harris-Benedict multipliers used to turn BMR into TDEE. */
export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Very active',
  very_active: 'Athlete',
};

export const ACTIVITY_HINT: Record<ActivityLevel, string> = {
  sedentary: 'Little or no exercise',
  light: 'Exercise 1-3 days a week',
  moderate: 'Exercise 3-5 days a week',
  active: 'Exercise 6-7 days a week',
  very_active: 'Hard training every day',
};

/** Fitness level 1..5 shown on the gauge maps one-to-one onto an activity level. */
export function levelToActivity(level: number): ActivityLevel {
  return ACTIVITY_LEVELS[Math.min(5, Math.max(1, Math.round(level))) - 1];
}

export function activityToLevel(activity: ActivityLevel): number {
  return ACTIVITY_LEVELS.indexOf(activity) + 1;
}

export type FitnessGoal = 'lose_weight' | 'build_muscle' | 'keep_fit' | 'endurance';

export const GOALS: readonly FitnessGoal[] = ['lose_weight', 'build_muscle', 'keep_fit', 'endurance'];

export const GOAL_LABEL: Record<FitnessGoal, string> = {
  lose_weight: 'Lose weight',
  build_muscle: 'Build muscle',
  keep_fit: 'Stay fit & healthy',
  endurance: 'Improve endurance',
};

/** Daily intake adjustment applied to TDEE for each goal (kcal). */
export const GOAL_ADJUSTMENT: Record<FitnessGoal, number> = {
  lose_weight: -500,
  build_muscle: 300,
  keep_fit: 0,
  endurance: 200,
};

export type ExerciseCategory = 'strength' | 'cardio';

export type SessionState = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled';

export const SESSION_STATES: readonly SessionState[] = [
  'not_started', 'in_progress', 'paused', 'completed', 'cancelled',
];

export function isTerminal(state: SessionState): boolean {
  return state === 'completed' || state === 'cancelled';
}
