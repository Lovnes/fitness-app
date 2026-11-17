/** Aggregations over workout history for the Home and Profile dashboards. */
import { WorkoutSummary } from './models';

export interface DayTotal {
  /** Local date key YYYY-MM-DD */
  key: string;
  /** Short weekday label, e.g. "Mon" */
  label: string;
  kcal: number;
  reps: number;
  workouts: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function dayKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Totals for the last `days` calendar days (oldest first, today last), in local time. */
export function lastDays(history: readonly WorkoutSummary[], now: Date, days = 7): DayTotal[] {
  const result: DayTotal[] = [];
  const index = new Map<string, DayTotal>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const t: DayTotal = { key: dayKey(d), label: WEEKDAYS[d.getDay()], kcal: 0, reps: 0, workouts: 0 };
    result.push(t);
    index.set(t.key, t);
  }
  for (const w of history) {
    const t = index.get(dayKey(new Date(w.dateIso)));
    if (t) {
      t.kcal += w.caloriesKcal;
      t.reps += w.totalReps;
      t.workouts += 1;
    }
  }
  return result;
}

export function today(history: readonly WorkoutSummary[], now: Date): DayTotal {
  return lastDays(history, now, 1)[0];
}

/** Consecutive days up to today (or yesterday) with at least one workout. */
export function streak(history: readonly WorkoutSummary[], now: Date): number {
  const days = new Set(history.map((w) => dayKey(new Date(w.dateIso))));
  let count = 0;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not trained yet: streak still alive
  while (days.has(dayKey(d))) {
    count += 1;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

export interface Totals {
  workouts: number;
  kcal: number;
  reps: number;
  minutes: number;
}

export function totals(history: readonly WorkoutSummary[]): Totals {
  return history.reduce(
    (t, w) => ({ workouts: t.workouts + 1, kcal: t.kcal + w.caloriesKcal, reps: t.reps + w.totalReps, minutes: t.minutes + w.activeMinutes }),
    { workouts: 0, kcal: 0, reps: 0, minutes: 0 },
  );
}
