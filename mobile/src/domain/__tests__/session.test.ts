/**
 * STATE MACHINE TESTS — every event in every state (all-transitions + sneak paths),
 * guards, timing with a fake clock, undo, and the D-02 rounding regression.
 */
import { BY_ID } from '../exercises';
import { InvalidTransition, SESSION_EVENTS, TRANSITIONS, WorkoutSession } from '../session';
import { SESSION_STATES, SessionState, isTerminal } from '../types';
import { ValidationError } from '../validation';

class FakeClock {
  t = 0;
  now = () => this.t;
  advance(minutes: number) {
    this.t += minutes * 60000;
  }
}

function sessionIn(state: SessionState, clock = new FakeClock()): WorkoutSession {
  const s = new WorkoutSession(70, clock.now);
  if (state === 'not_started') return s;
  s.start();
  s.logSet(BY_ID.push_up, 10);
  if (state === 'paused') s.pause();
  else if (state === 'completed') s.finish();
  else if (state === 'cancelled') s.cancel();
  return s;
}

describe('transitions', () => {
  test('initial state', () => {
    expect(new WorkoutSession(70).state).toBe('not_started');
  });

  const pairs = SESSION_STATES.flatMap((st) => SESSION_EVENTS.map((ev) => [st, ev] as const));
  test.each(pairs)('%s + %s', (state, event) => {
    const s = sessionIn(state);
    const expected = TRANSITIONS[`${state}:${event}`];
    if (expected) {
      s[event]();
      expect(s.state).toBe(expected);
    } else {
      expect(() => s[event]()).toThrow(InvalidTransition);
      expect(s.state).toBe(state);
    }
  });

  test('exactly 8 valid transitions', () => {
    expect(Object.keys(TRANSITIONS)).toHaveLength(8);
  });

  test('terminal states', () => {
    expect(isTerminal('completed')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('paused')).toBe(false);
  });
});

describe('guards and logging', () => {
  test('cannot finish an empty workout', () => {
    const s = new WorkoutSession(70);
    s.start();
    expect(() => s.finish()).toThrow('at least one');
    expect(s.state).toBe('in_progress');
  });

  test.each(['not_started', 'paused', 'completed', 'cancelled'] as SessionState[])('cannot log when %s', (state) => {
    expect(() => sessionIn(state).logSet(BY_ID.squat, 5, 100)).toThrow(InvalidTransition);
  });

  test('invalid set leaves no empty entry', () => {
    const s = new WorkoutSession(70);
    s.start();
    expect(() => s.logSet(BY_ID.squat, 0, 100)).toThrow(ValidationError);
    expect(s.entries).toHaveLength(0);
  });

  test('wrong logging mode is rejected and leaves nothing behind', () => {
    const s = new WorkoutSession(70);
    s.start();
    expect(() => s.logCardio(BY_ID.squat, 10)).toThrow(ValidationError);
    expect(() => s.logSet(BY_ID.run_8kmh, 10)).toThrow(ValidationError);
    expect(s.entries).toHaveLength(0);
  });

  test('sets are grouped by exercise', () => {
    const s = new WorkoutSession(70);
    s.start();
    s.logSet(BY_ID.bench_press, 10, 60);
    s.logSet(BY_ID.bench_press, 8, 70);
    s.logSet(BY_ID.squat, 5, 100);
    expect(s.entries.map((e) => e.exercise.id)).toEqual(['bench_press', 'squat']);
    expect(s.totalReps()).toBe(23);
    expect(s.totalVolume()).toBeCloseTo(600 + 560 + 500, 6);
  });
});

describe('undo (usability fix U-04)', () => {
  test('undo removes the most recent log, across exercises', () => {
    const s = new WorkoutSession(70);
    s.start();
    s.logSet(BY_ID.bench_press, 10, 60);
    s.logCardio(BY_ID.run_8kmh, 20);
    s.logSet(BY_ID.bench_press, 8, 70);
    expect(s.undoLast()).toBe(true);
    expect(s.entries[0].sets).toHaveLength(1);
    expect(s.undoLast()).toBe(true);
    expect(s.entries.map((e) => e.exercise.id)).toEqual(['bench_press']); // empty run entry dropped
    expect(s.undoLast()).toBe(true);
    expect(s.entries).toHaveLength(0);
    expect(s.undoLast()).toBe(false);
    expect(s.canUndo).toBe(false);
  });

  test('undo allowed while paused, not after finishing', () => {
    const s = sessionIn('paused');
    expect(s.canUndo).toBe(true);
    s.resume();
    s.logSet(BY_ID.push_up, 12);
    s.finish();
    expect(s.canUndo).toBe(false);
    expect(() => s.undoLast()).toThrow(InvalidTransition);
  });
});

describe('timing and summary', () => {
  test('paused time is not counted', () => {
    const clock = new FakeClock();
    const s = new WorkoutSession(70, clock.now);
    s.start();
    clock.advance(10);
    s.pause();
    clock.advance(5);
    s.resume();
    clock.advance(15);
    s.logCardio(BY_ID.run_8kmh, 25);
    expect(s.finish().activeMinutes).toBeCloseTo(25, 6);
  });

  test('finish while paused', () => {
    const clock = new FakeClock();
    const s = new WorkoutSession(70, clock.now);
    s.start();
    s.logSet(BY_ID.push_up, 20);
    clock.advance(4);
    s.pause();
    clock.advance(30);
    expect(s.finish().activeMinutes).toBeCloseTo(4, 6);
  });

  test('summary calories', () => {
    const s = new WorkoutSession(70, new FakeClock().now, 'abc');
    s.start();
    s.logCardio(BY_ID.run_8kmh, 30); // 305.025
    for (let i = 0; i < 3; i++) s.logSet(BY_ID.squat, 10, 60); // 6×3.5×70/200 × 3.5 = 25.725
    const summary = s.finish();
    expect(summary.id).toBe('abc');
    expect(summary.totalReps).toBe(30);
    expect(summary.caloriesKcal).toBeCloseTo(305.025 + 25.725, 6);
    expect(summary.exercises).toEqual(['Running (8 km/h)', 'Barbell Squat']);
  });

  test('regression D-02: saved total equals live total (328.545 kcal)', () => {
    const s = new WorkoutSession(70, new FakeClock().now);
    s.start();
    for (const [r, w] of [[10, 60], [8, 70], [6, 80]]) s.logSet(BY_ID.bench_press, r, w);
    s.logCardio(BY_ID.run_8kmh, 30);
    const live = s.totalCalories();
    const summary = s.finish();
    expect(live).toBeCloseTo(328.545, 6);
    expect(summary.caloriesKcal.toFixed(0)).toBe(live.toFixed(0));
  });
});
