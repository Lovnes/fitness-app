/**
 * Calorie and rep calculations — the «utility» FitnessCalculator in the class diagram.
 *
 * Pure functions: no I/O, no clock, same input -> same output. Invalid input
 * throws ValidationError.
 *
 *   BMI                    = kg / m²
 *   BMR (Mifflin-St Jeor)  = 10·kg + 6.25·cm − 5·age + 5 (male) / −161 (female)
 *   TDEE                   = BMR × activity factor
 *   Calories burned        = MET × 3.5 × kg / 200 × minutes      (ACSM)
 *   1RM (Epley)            = w × (1 + reps/30)
 *   1RM (Brzycki)          = w × 36 / (37 − reps)
 */
import * as v from './validation';
import {
  ACTIVITY_FACTOR, ActivityLevel, FitnessGoal, GOAL_ADJUSTMENT, Sex,
} from './types';

export const DEFAULT_SECONDS_PER_REP = 3;
export const DEFAULT_REST_SECONDS = 60;
/** Safe minimum daily intake recommendations (kcal). */
export const MIN_INTAKE: Record<Sex, number> = { male: 1500, female: 1200 };

export interface HasRepsAndWeight {
  readonly reps: number;
  readonly weightKg: number;
}

// --- Body metrics --------------------------------------------------------------

export function bmi(weightKg: number, heightCm: number): number {
  const w = v.check(weightKg, v.BODY_WEIGHT);
  const m = v.check(heightCm, v.HEIGHT) / 100;
  return w / (m * m);
}

/** WHO adult categories. 18.5, 25 and 30 each start a new class. */
export function bmiCategory(value: number): 'Underweight' | 'Normal' | 'Overweight' | 'Obese' {
  if (value < 18.5) return 'Underweight';
  if (value < 25) return 'Normal';
  if (value < 30) return 'Overweight';
  return 'Obese';
}

export function bmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const w = v.check(weightKg, v.BODY_WEIGHT);
  const h = v.check(heightCm, v.HEIGHT);
  const a = v.check(age, v.AGE);
  if (sex !== 'male' && sex !== 'female') throw new v.ValidationError('Sex must be male or female');
  return 10 * w + 6.25 * h - 5 * a + (sex === 'male' ? 5 : -161);
}

export function tdee(bmrKcal: number, activity: ActivityLevel): number {
  const factor = ACTIVITY_FACTOR[activity];
  if (factor === undefined) throw new v.ValidationError('Unknown activity level');
  if (!(bmrKcal > 0)) throw new v.ValidationError('BMR must be positive');
  return bmrKcal * factor;
}

/**
 * Recommended daily intake for a goal: TDEE + goal adjustment, rounded to the
 * nearest 10 kcal, never below the safe minimum for the user's sex.
 */
export function recommendedIntake(tdeeKcal: number, goal: FitnessGoal, sex: Sex): number {
  const adj = GOAL_ADJUSTMENT[goal];
  if (adj === undefined) throw new v.ValidationError('Unknown goal');
  if (!(tdeeKcal > 0)) throw new v.ValidationError('TDEE must be positive');
  const target = Math.round((tdeeKcal + adj) / 10) * 10;
  return Math.max(MIN_INTAKE[sex], target);
}

// --- Calories ------------------------------------------------------------------

export function caloriesBurned(met: number, weightKg: number, durationMin: number): number {
  const m = v.check(met, v.MET);
  const w = v.check(weightKg, v.BODY_WEIGHT);
  const d = v.check(durationMin, v.DURATION);
  return (m * 3.5 * w) / 200 * d;
}

/** Time under tension plus rest between sets (no rest after the last set). */
export function strengthDurationMin(
  sets: readonly HasRepsAndWeight[],
  secondsPerRep = DEFAULT_SECONDS_PER_REP,
  restSeconds = DEFAULT_REST_SECONDS,
): number {
  if (sets.length === 0) return 0;
  if (!(secondsPerRep > 0) || !(restSeconds >= 0)) {
    throw new v.ValidationError('Tempo must be positive and rest non-negative');
  }
  return (totalReps(sets) * secondsPerRep + (sets.length - 1) * restSeconds) / 60;
}

export function strengthCalories(
  sets: readonly HasRepsAndWeight[], met: number, bodyWeightKg: number,
  secondsPerRep = DEFAULT_SECONDS_PER_REP, restSeconds = DEFAULT_REST_SECONDS,
): number {
  const m = v.check(met, v.MET);
  const w = v.check(bodyWeightKg, v.BODY_WEIGHT);
  return (m * 3.5 * w) / 200 * strengthDurationMin(sets, secondsPerRep, restSeconds);
}

/** Positive = surplus, negative = deficit. */
export function calorieBalance(intakeKcal: number, tdeeKcal: number, exerciseKcal: number): number {
  const intake = v.check(intakeKcal, v.CALORIE_INTAKE);
  if (tdeeKcal < 0 || exerciseKcal < 0) throw new v.ValidationError('Energy expenditure cannot be negative');
  return intake - (tdeeKcal + exerciseKcal);
}

// --- Reps & strength -----------------------------------------------------------

export function totalReps(sets: readonly HasRepsAndWeight[]): number {
  return sets.reduce((sum, s) => sum + v.check(s.reps, v.REPS), 0);
}

/** Volume load = Σ reps × weight (kg). Bodyweight sets (0 kg) add 0. */
export function trainingVolume(sets: readonly HasRepsAndWeight[]): number {
  return sets.reduce((sum, s) => sum + v.check(s.reps, v.REPS) * v.check(s.weightKg, v.LIFT_WEIGHT), 0);
}

export function oneRepMaxEpley(weightKg: number, reps: number): number {
  const w = v.check(weightKg, v.LIFT_WEIGHT);
  const r = v.check(reps, v.REPS_FOR_1RM);
  return r === 1 ? w : w * (1 + r / 30);
}

export function oneRepMaxBrzycki(weightKg: number, reps: number): number {
  const w = v.check(weightKg, v.LIFT_WEIGHT);
  const r = v.check(reps, v.REPS_FOR_1RM);
  return (w * 36) / (37 - r);
}

/** Progress toward a goal, clamped to 0..100 %. */
export function progressPercent(current: number, goal: number): number {
  const g = v.check(goal, v.GOAL);
  if (current < 0) throw new v.ValidationError('Progress cannot be negative');
  return Math.min(100, (current / g) * 100);
}
