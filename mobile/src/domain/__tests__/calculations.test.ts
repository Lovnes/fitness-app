/**
 * UNIT TESTS — calorie and rep calculations against hand-computed values.
 * The working for each expected value is in the comment beside it (test oracle).
 */
import * as calc from '../calculations';
import { createSet } from '../models';
import { ACTIVITY_FACTOR, ActivityLevel } from '../types';
import { ValidationError } from '../validation';

const sets = (...pairs: [number, number][]) => pairs.map(([r, w]) => createSet(r, w));

describe('body metrics', () => {
  test('BMI 70 kg / 1.75 m² = 22.857', () => {
    expect(calc.bmi(70, 175)).toBeCloseTo(22.857, 3);
  });

  test('BMR male: 700 + 1093.75 − 125 + 5 = 1673.75', () => {
    expect(calc.bmr(70, 175, 25, 'male')).toBeCloseTo(1673.75, 6);
  });

  test('BMR female: 600 + 1031.25 − 150 − 161 = 1320.25', () => {
    expect(calc.bmr(60, 165, 30, 'female')).toBeCloseTo(1320.25, 6);
  });

  test('male and female BMR differ by exactly 166 kcal', () => {
    expect(calc.bmr(70, 175, 25, 'male') - calc.bmr(70, 175, 25, 'female')).toBeCloseTo(166, 6);
  });

  test.each(Object.entries(ACTIVITY_FACTOR))('TDEE for %s uses factor %d', (level, factor) => {
    expect(calc.tdee(1673.75, level as ActivityLevel)).toBeCloseTo(1673.75 * factor, 6);
  });

  test('TDEE rejects bad input', () => {
    expect(() => calc.tdee(1500, 'jogging' as ActivityLevel)).toThrow(ValidationError);
    expect(() => calc.tdee(0, 'moderate')).toThrow(ValidationError);
  });

  test('BMR rejects unknown sex', () => {
    expect(() => calc.bmr(70, 175, 25, 'M' as never)).toThrow(ValidationError);
  });
});

describe('recommended intake', () => {
  // TDEE 2594.3125 (male 70/175/25 moderate)
  test('lose weight: 2594.31 − 500 = 2094.31 → 2090', () => {
    expect(calc.recommendedIntake(2594.3125, 'lose_weight', 'male')).toBe(2090);
  });
  test('build muscle: +300 → 2890', () => {
    expect(calc.recommendedIntake(2594.3125, 'build_muscle', 'male')).toBe(2890);
  });
  test('keep fit: unchanged → 2590', () => {
    expect(calc.recommendedIntake(2594.3125, 'keep_fit', 'male')).toBe(2590);
  });
  test('never below the safe minimum for the sex', () => {
    expect(calc.recommendedIntake(1500, 'lose_weight', 'female')).toBe(1200);
    expect(calc.recommendedIntake(1800, 'lose_weight', 'male')).toBe(1500);
  });
});

describe('calories', () => {
  test('MET formula: 8.3 × 3.5 × 70 / 200 × 30 = 305.025', () => {
    expect(calc.caloriesBurned(8.3, 70, 30)).toBeCloseTo(305.025, 6);
  });

  test('calories scale linearly with duration', () => {
    expect(calc.caloriesBurned(6, 80, 30)).toBeCloseTo(3 * calc.caloriesBurned(6, 80, 10), 6);
  });

  test('strength duration: 90 s work + 2 × 60 s rest = 3.5 min', () => {
    expect(calc.strengthDurationMin(sets([10, 60], [10, 60], [10, 60]))).toBeCloseTo(3.5, 6);
  });

  test('single set has no rest', () => {
    expect(calc.strengthDurationMin(sets([10, 60]))).toBeCloseTo(0.5, 6);
  });

  test('strength calories: 8.4 kcal/min × 3.5 min = 29.4', () => {
    expect(calc.strengthCalories(sets([10, 60], [10, 60], [10, 60]), 6, 80)).toBeCloseTo(29.4, 6);
  });

  test('no sets burn nothing', () => {
    expect(calc.strengthCalories([], 6, 80)).toBe(0);
  });

  test('custom tempo, and tempo must be positive', () => {
    expect(calc.strengthDurationMin(sets([20, 0]), 1.5)).toBeCloseTo(0.5, 6);
    expect(() => calc.strengthDurationMin(sets([10, 0]), 0)).toThrow(ValidationError);
  });

  test('calorie balance', () => {
    expect(calc.calorieBalance(2000, 2500, 300)).toBe(-800);
    expect(calc.calorieBalance(3000, 2500, 0)).toBe(500);
    expect(() => calc.calorieBalance(2000, -1, 0)).toThrow(ValidationError);
  });
});

describe('reps and strength', () => {
  test('total reps 10 + 8 + 6 = 24', () => {
    expect(calc.totalReps(sets([10, 60], [8, 70], [6, 80]))).toBe(24);
  });

  test('total reps of nothing is 0', () => {
    expect(calc.totalReps([])).toBe(0);
  });

  test('volume 600 + 560 + 480 = 1640 kg', () => {
    expect(calc.trainingVolume(sets([10, 60], [8, 70], [6, 80]))).toBeCloseTo(1640, 6);
  });

  test('bodyweight volume is 0', () => {
    expect(calc.trainingVolume(sets([20, 0], [15, 0]))).toBe(0);
  });

  test('Epley 1RM', () => {
    expect(calc.oneRepMaxEpley(100, 5)).toBeCloseTo(116.667, 3);
    expect(calc.oneRepMaxEpley(100, 10)).toBeCloseTo(133.333, 3);
    expect(calc.oneRepMaxEpley(140, 1)).toBe(140);
  });

  test('Brzycki 1RM: 100 × 36 / 32 = 112.5', () => {
    expect(calc.oneRepMaxBrzycki(100, 5)).toBeCloseTo(112.5, 6);
    expect(calc.oneRepMaxBrzycki(100, 1)).toBeCloseTo(100, 6);
  });

  test('Epley and Brzycki agree at 10 reps', () => {
    expect(calc.oneRepMaxEpley(80, 10)).toBeCloseTo(calc.oneRepMaxBrzycki(80, 10), 6);
  });

  test('progress percent, clamped', () => {
    expect(calc.progressPercent(50, 200)).toBe(25);
    expect(calc.progressPercent(250, 200)).toBe(100);
    expect(calc.progressPercent(0, 200)).toBe(0);
    expect(() => calc.progressPercent(-1, 200)).toThrow(ValidationError);
  });
});
