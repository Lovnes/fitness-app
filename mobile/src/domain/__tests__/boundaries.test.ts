/**
 * BOUNDARY VALUE TESTS.
 *
 * Each range is tested at 7 points: min−δ, min, min+δ, nominal, max−δ, max, max+δ
 * (δ = 1 for integer fields, 0.1 for decimal fields). The two outer points must
 * be rejected and the five inner points accepted.
 */
import * as calc from '../calculations';
import { CATALOG } from '../exercises';
import { createProfile, createSet, ExerciseEntry, Exercise } from '../models';
import * as v from '../validation';
import { levelToActivity } from '../types';

const round1 = (x: number) => Math.round(x * 10) / 10;

function bvaPoints(r: v.Range) {
  const d = r.integer ? 1 : 0.1;
  const nominal = r.integer ? Math.trunc((r.min + r.max) / 2) : (r.min + r.max) / 2;
  return {
    valid: [r.min, round1(r.min + d), nominal, round1(r.max - d), r.max],
    invalid: [round1(r.min - d), round1(r.max + d)],
  };
}

describe('7-point BVA for every range', () => {
  for (const r of v.ALL_RANGES) {
    const { valid, invalid } = bvaPoints(r);
    test.each(valid)(`${r.name}: accepts %p`, (value) => {
      expect(v.check(value, r)).toBe(value);
    });
    test.each(invalid)(`${r.name}: rejects %p`, (value) => {
      expect(() => v.check(value, r)).toThrow(v.ValidationError);
    });
  }
});

describe('type robustness', () => {
  test.each([null, undefined, '10', true, false, NaN, Infinity, -Infinity, [5], {}])('rejects %p', (bad) => {
    expect(() => v.check(bad, v.REPS)).toThrow(v.ValidationError);
  });

  test('integer fields reject fractions', () => {
    expect(() => v.check(10.5, v.REPS)).toThrow('whole number');
    expect(v.check(10.0, v.REPS)).toBe(10);
  });
});

describe('parsing text fields', () => {
  test('accepts trimmed numbers', () => {
    expect(v.parse(' 70 ', v.BODY_WEIGHT)).toBe(70);
    expect(v.parse('12', v.REPS)).toBe(12);
  });

  test.each([
    ['', 'required'], ['   ', 'required'], [null, 'required'],
    ['abc', 'number'], ['12kg', 'number'], ['nan', 'finite'], ['inf', 'finite'],
    ['1e3', 'between'], ['-5', 'between'],
  ])('%p → message contains "%s"', (text, fragment) => {
    expect(() => v.parse(text, v.BODY_WEIGHT)).toThrow(fragment);
  });

  test('clamp keeps pickers inside the range', () => {
    expect(v.clamp(12, v.AGE)).toBe(13);
    expect(v.clamp(101, v.AGE)).toBe(100);
    expect(v.clamp(40, v.AGE)).toBe(40);
  });
});

describe('entity boundaries', () => {
  const strength: Exercise = CATALOG.find((e) => e.category === 'strength')!;
  const cardio: Exercise = CATALOG.find((e) => e.category === 'cardio')!;

  test('set reps 1..100', () => {
    [1, 2, 99, 100].forEach((r) => expect(() => createSet(r)).not.toThrow());
    [0, 101, -1].forEach((r) => expect(() => createSet(r)).toThrow(v.ValidationError));
  });

  test('set weight 0..500 kg', () => {
    [0, 0.1, 499.9, 500].forEach((w) => expect(() => createSet(5, w)).not.toThrow());
    [-0.1, 500.1].forEach((w) => expect(() => createSet(5, w)).toThrow(v.ValidationError));
  });

  test('20 sets per exercise allowed, 21st rejected', () => {
    const entry = new ExerciseEntry(strength);
    for (let i = 0; i < 20; i++) entry.addSet(createSet(5, 20));
    expect(() => entry.addSet(createSet(5, 20))).toThrow('Maximum 20');
    expect(entry.sets).toHaveLength(20);
  });

  test('cardio: per-block minimum and 600-min cumulative cap', () => {
    const entry = new ExerciseEntry(cardio);
    entry.addMinutes(599);
    expect(() => entry.addMinutes(0.5)).toThrow(v.ValidationError);
    expect(() => entry.addMinutes(1.1)).toThrow('capped at 600');
    entry.addMinutes(1);
    expect(entry.cardioMinutes).toBe(600);
  });

  test('profile age 13..100', () => {
    const base = { sex: 'male' as const, weightKg: 70, heightCm: 175, activityLevel: 'moderate' as const, goal: 'keep_fit' as const };
    [13, 14, 99, 100].forEach((age) => expect(() => createProfile({ ...base, age })).not.toThrow());
    [12, 101].forEach((age) => expect(() => createProfile({ ...base, age })).toThrow(v.ValidationError));
  });

  test('fitness level 1..5 maps to activity, out-of-range is clamped', () => {
    expect(levelToActivity(1)).toBe('sedentary');
    expect(levelToActivity(5)).toBe('very_active');
    expect(levelToActivity(0)).toBe('sedentary');
    expect(levelToActivity(6)).toBe('very_active');
  });
});

describe('calculation boundaries', () => {
  test.each([
    [18.49, 'Underweight'], [18.5, 'Normal'], [24.99, 'Normal'],
    [25.0, 'Overweight'], [29.99, 'Overweight'], [30.0, 'Obese'],
  ])('BMI %p is %s', (value, category) => {
    expect(calc.bmiCategory(value)).toBe(category);
  });

  test('1RM accepts 12 reps, rejects 0 and 13', () => {
    expect(() => calc.oneRepMaxEpley(100, 12)).not.toThrow();
    expect(() => calc.oneRepMaxBrzycki(100, 12)).not.toThrow();
    for (const reps of [0, 13]) {
      expect(() => calc.oneRepMaxEpley(100, reps)).toThrow(v.ValidationError);
      expect(() => calc.oneRepMaxBrzycki(100, reps)).toThrow(v.ValidationError);
    }
  });

  test('extreme valid inputs: 23 MET, 300 kg, 600 min = 72,450 kcal', () => {
    expect(calc.caloriesBurned(23, 300, 600)).toBeCloseTo(72450, 6);
  });

  test('minimum valid inputs: 1 MET, 20 kg, 1 min = 0.35 kcal', () => {
    expect(calc.caloriesBurned(1, 20, 1)).toBeCloseTo(0.35, 6);
  });

  test('duration below 1 min is rejected', () => {
    expect(() => calc.caloriesBurned(8, 70, 0.9)).toThrow(v.ValidationError);
    expect(() => calc.caloriesBurned(8, 70, 0)).toThrow(v.ValidationError);
  });

  test('goal boundary', () => {
    expect(calc.progressPercent(1, 1)).toBe(100);
    expect(() => calc.progressPercent(1, 0)).toThrow(v.ValidationError);
  });

  test('safe-minimum intake boundary (female 1200)', () => {
    // TDEE such that target lands exactly on / just above / just below the floor
    expect(calc.recommendedIntake(1700, 'lose_weight', 'female')).toBe(1200);
    expect(calc.recommendedIntake(1710, 'lose_weight', 'female')).toBe(1210);
    expect(calc.recommendedIntake(1690, 'lose_weight', 'female')).toBe(1200);
  });
});
