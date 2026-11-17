/** Domain entities (see docs/uml/class.puml). */
import * as calc from './calculations';
import * as v from './validation';
import {
  ACTIVITY_FACTOR, ActivityLevel, ExerciseCategory, FitnessGoal, GOAL_ADJUSTMENT, Sex,
} from './types';

// --- UserProfile ---------------------------------------------------------------

export interface UserProfile {
  readonly name: string;
  readonly age: number;
  readonly sex: Sex;
  readonly weightKg: number;
  readonly heightCm: number;
  readonly activityLevel: ActivityLevel;
  readonly goal: FitnessGoal;
  readonly dailyCalorieGoal: number;
  readonly dailyBurnGoal: number;
}

export type ProfileInput = Omit<UserProfile, 'name' | 'dailyCalorieGoal' | 'dailyBurnGoal'> & {
  name?: string;
  dailyCalorieGoal?: number;
  dailyBurnGoal?: number;
};

/** Validate every field and return an immutable profile. */
export function createProfile(input: ProfileInput): UserProfile {
  if (input.sex !== 'male' && input.sex !== 'female') throw new v.ValidationError('Please choose a gender');
  if (ACTIVITY_FACTOR[input.activityLevel] === undefined) throw new v.ValidationError('Unknown activity level');
  if (GOAL_ADJUSTMENT[input.goal] === undefined) throw new v.ValidationError('Please choose a goal');
  const base = {
    name: (input.name ?? '').trim().slice(0, 40) || 'Athlete',
    age: v.check(input.age, v.AGE),
    sex: input.sex,
    weightKg: v.check(input.weightKg, v.BODY_WEIGHT),
    heightCm: v.check(input.heightCm, v.HEIGHT),
    activityLevel: input.activityLevel,
    goal: input.goal,
  };
  const suggested = calc.recommendedIntake(
    calc.tdee(calc.bmr(base.weightKg, base.heightCm, base.age, base.sex), base.activityLevel),
    base.goal, base.sex,
  );
  return Object.freeze({
    ...base,
    dailyCalorieGoal: v.check(input.dailyCalorieGoal ?? suggested, v.CALORIE_INTAKE),
    dailyBurnGoal: v.check(input.dailyBurnGoal ?? 400, v.BURN_GOAL),
  });
}

export interface ProfileMetrics {
  bmi: number;
  bmiCategory: ReturnType<typeof calc.bmiCategory>;
  bmr: number;
  tdee: number;
}

export function profileMetrics(p: UserProfile): ProfileMetrics {
  const bmi = calc.bmi(p.weightKg, p.heightCm);
  const bmr = calc.bmr(p.weightKg, p.heightCm, p.age, p.sex);
  return { bmi, bmiCategory: calc.bmiCategory(bmi), bmr, tdee: calc.tdee(bmr, p.activityLevel) };
}

// --- Exercise / WorkoutSet -----------------------------------------------------

export interface Exercise {
  readonly id: string;
  readonly name: string;
  readonly category: ExerciseCategory;
  readonly met: number;
  readonly muscle: string;
  readonly icon: string;
}

export interface WorkoutSet {
  readonly reps: number;
  readonly weightKg: number;
}

export function createSet(reps: number, weightKg = 0): WorkoutSet {
  return Object.freeze({ reps: v.check(reps, v.REPS), weightKg: v.check(weightKg, v.LIFT_WEIGHT) });
}

// --- ExerciseEntry -------------------------------------------------------------

/** One exercise inside a session: sets (strength) or minutes (cardio). */
export class ExerciseEntry {
  readonly sets: WorkoutSet[] = [];
  readonly cardioBlocks: number[] = [];

  constructor(readonly exercise: Exercise) {}

  get cardioMinutes(): number {
    return this.cardioBlocks.reduce((a, b) => a + b, 0);
  }

  get isEmpty(): boolean {
    return this.sets.length === 0 && this.cardioBlocks.length === 0;
  }

  addSet(set: WorkoutSet): void {
    if (this.exercise.category !== 'strength') {
      throw new v.ValidationError(`${this.exercise.name} is logged by duration, not sets`);
    }
    if (this.sets.length >= v.SETS.max) throw new v.ValidationError(`Maximum ${v.SETS.max} sets per exercise`);
    this.sets.push(set);
  }

  addMinutes(minutes: number): void {
    if (this.exercise.category !== 'cardio') {
      throw new v.ValidationError(`${this.exercise.name} is logged by sets, not duration`);
    }
    v.check(minutes, v.DURATION);
    if (this.cardioMinutes + minutes > v.DURATION.max) {
      throw new v.ValidationError(`Total ${v.DURATION.name.toLowerCase()} for one exercise is capped at ${v.DURATION.max} min`);
    }
    this.cardioBlocks.push(minutes);
  }

  /** Remove the most recent set or cardio block. Returns false if there was nothing to remove. */
  removeLast(): boolean {
    if (this.exercise.category === 'strength') return this.sets.pop() !== undefined;
    return this.cardioBlocks.pop() !== undefined;
  }

  totalReps(): number {
    return calc.totalReps(this.sets);
  }

  volume(): number {
    return calc.trainingVolume(this.sets);
  }

  calories(bodyWeightKg: number): number {
    if (this.exercise.category === 'cardio') {
      return this.cardioMinutes === 0 ? 0 : calc.caloriesBurned(this.exercise.met, bodyWeightKg, this.cardioMinutes);
    }
    return calc.strengthCalories(this.sets, this.exercise.met, bodyWeightKg);
  }

  /** Highest Epley estimate among loaded sets of 1–12 reps, or null. */
  bestOneRepMax(): number | null {
    const estimates = this.sets
      .filter((s) => s.weightKg > 0 && s.reps <= v.REPS_FOR_1RM.max)
      .map((s) => calc.oneRepMaxEpley(s.weightKg, s.reps));
    return estimates.length ? Math.max(...estimates) : null;
  }
}

// --- WorkoutSummary ------------------------------------------------------------

/** Immutable record saved to history once a session is completed. Full precision; round only for display. */
export interface WorkoutSummary {
  readonly id: string;
  readonly dateIso: string;
  readonly activeMinutes: number;
  readonly totalReps: number;
  readonly totalVolumeKg: number;
  readonly caloriesKcal: number;
  readonly exercises: readonly string[];
}
