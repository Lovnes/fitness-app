/**
 * Input limits and validators.
 *
 * Every numeric value a user can enter has a documented, inclusive range here.
 * These ranges are the single source of truth for boundary-value tests
 * (src/domain/__tests__/boundaries.test.ts) and for UI error messages.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface Range {
  readonly name: string;
  readonly min: number;
  readonly max: number;
  readonly integer?: boolean;
  readonly unit?: string;
}

export function describe(r: Range): string {
  const unit = r.unit ? ` ${r.unit}` : '';
  return `${r.name} must be between ${r.min} and ${r.max}${unit}`;
}

// --- Valid input ranges (inclusive) ------------------------------------------
export const AGE: Range = { name: 'Age', min: 13, max: 100, integer: true, unit: 'years' };
export const BODY_WEIGHT: Range = { name: 'Body weight', min: 20, max: 300, unit: 'kg' };
export const HEIGHT: Range = { name: 'Height', min: 100, max: 250, unit: 'cm' };
export const REPS: Range = { name: 'Reps', min: 1, max: 100, integer: true };
export const SETS: Range = { name: 'Sets per exercise', min: 1, max: 20, integer: true };
export const LIFT_WEIGHT: Range = { name: 'Weight lifted', min: 0, max: 500, unit: 'kg' };
export const DURATION: Range = { name: 'Duration', min: 1, max: 600, unit: 'min' };
export const MET: Range = { name: 'MET value', min: 1, max: 23 };
export const CALORIE_INTAKE: Range = { name: 'Calorie intake', min: 0, max: 10000, integer: true, unit: 'kcal' };
export const BURN_GOAL: Range = { name: 'Daily burn goal', min: 50, max: 3000, integer: true, unit: 'kcal' };
export const GOAL: Range = { name: 'Goal', min: 1, max: 100000, integer: true };
export const REPS_FOR_1RM: Range = { name: 'Reps for 1RM estimate', min: 1, max: 12, integer: true };
export const FITNESS_LEVEL: Range = { name: 'Fitness level', min: 1, max: 5, integer: true };

export const ALL_RANGES: readonly Range[] = [
  AGE, BODY_WEIGHT, HEIGHT, REPS, SETS, LIFT_WEIGHT, DURATION, MET,
  CALORIE_INTAKE, BURN_GOAL, GOAL, REPS_FOR_1RM, FITNESS_LEVEL,
];

/** Validate a value against `r` and return it. Booleans, NaN and ±Infinity are rejected. */
export function check(value: unknown, r: Range): number {
  if (typeof value !== 'number') throw new ValidationError(`${r.name} must be a number`);
  if (!Number.isFinite(value)) throw new ValidationError(`${r.name} must be a finite number`);
  if (r.integer && !Number.isInteger(value)) throw new ValidationError(`${r.name} must be a whole number`);
  if (value < r.min || value > r.max) throw new ValidationError(describe(r));
  return value;
}

/** Parse raw text from a form field, then validate it with {@link check}. */
export function parse(text: unknown, r: Range): number {
  if (text === null || text === undefined || String(text).trim() === '') {
    throw new ValidationError(`${r.name} is required`);
  }
  const s = String(text).trim();
  if (/^[+-]?(nan|inf|infinity)$/i.test(s)) throw new ValidationError(`${r.name} must be a finite number`);
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) throw new ValidationError(`${r.name} must be a number`);
  return check(Number(s), r);
}

/** Clamp into a range (used by pickers/steppers so they can never produce invalid values). */
export function clamp(value: number, r: Range): number {
  return Math.min(r.max, Math.max(r.min, value));
}
