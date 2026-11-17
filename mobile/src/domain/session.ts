/**
 * WorkoutSession — the state machine in docs/uml/state_workout_session.puml.
 *
 *   not_started --start--> in_progress <--pause/resume--> paused
 *   in_progress | paused --finish [has logged work]--> completed
 *   not_started | in_progress | paused --cancel--> cancelled
 *
 * The clock is injectable so tests control time deterministically.
 */
import * as v from './validation';
import { createSet, Exercise, ExerciseEntry, WorkoutSet, WorkoutSummary } from './models';
import { SessionState } from './types';

export class InvalidTransition extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTransition';
  }
}

export type SessionEvent = 'start' | 'pause' | 'resume' | 'finish' | 'cancel';
export const SESSION_EVENTS: readonly SessionEvent[] = ['start', 'pause', 'resume', 'finish', 'cancel'];

export const TRANSITIONS: Readonly<Record<string, SessionState>> = {
  'not_started:start': 'in_progress',
  'in_progress:pause': 'paused',
  'paused:resume': 'in_progress',
  'in_progress:finish': 'completed',
  'paused:finish': 'completed',
  'not_started:cancel': 'cancelled',
  'in_progress:cancel': 'cancelled',
  'paused:cancel': 'cancelled',
};

const STATE_WORD: Record<SessionState, string> = {
  not_started: 'not started',
  in_progress: 'in progress',
  paused: 'paused',
  completed: 'completed',
  cancelled: 'cancelled',
};

export type Clock = () => number; // milliseconds

let counter = 0;
function newId(now: number): string {
  counter += 1;
  return `${now.toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export class WorkoutSession {
  readonly id: string;
  readonly bodyWeightKg: number;
  state: SessionState = 'not_started';
  readonly entries: ExerciseEntry[] = [];
  startedAt: Date | null = null;

  private activeMs = 0;
  private resumedAt: number | null = null;
  private readonly undoStack: string[] = []; // exercise ids, most recent last

  constructor(
    bodyWeightKg: number,
    private readonly clock: Clock = Date.now,
    id?: string,
  ) {
    this.bodyWeightKg = v.check(bodyWeightKg, v.BODY_WEIGHT);
    this.id = id ?? newId(clock());
  }

  // --- state machine -------------------------------------------------------
  private fire(event: SessionEvent): void {
    const target = TRANSITIONS[`${this.state}:${event}`];
    if (!target) throw new InvalidTransition(`Cannot ${event} a workout that is ${STATE_WORD[this.state]}`);
    this.state = target;
  }

  start(): void {
    this.fire('start');
    this.startedAt = new Date(this.clock());
    this.resumedAt = this.clock();
  }

  pause(): void {
    this.fire('pause');
    this.bankTime();
  }

  resume(): void {
    this.fire('resume');
    this.resumedAt = this.clock();
  }

  finish(): WorkoutSummary {
    if ((this.state === 'in_progress' || this.state === 'paused') && !this.hasLoggedWork()) {
      throw new InvalidTransition('Log at least one set or cardio block before finishing');
    }
    const wasRunning = this.state === 'in_progress';
    this.fire('finish');
    if (wasRunning) this.bankTime();
    return this.summary();
  }

  cancel(): void {
    const wasRunning = this.state === 'in_progress';
    this.fire('cancel');
    if (wasRunning) this.bankTime();
  }

  private bankTime(): void {
    if (this.resumedAt !== null) {
      this.activeMs += this.clock() - this.resumedAt;
      this.resumedAt = null;
    }
  }

  // --- logging -------------------------------------------------------------
  private requireRunning(): void {
    if (this.state !== 'in_progress') throw new InvalidTransition('Start or resume the workout before logging');
  }

  private entryFor(exercise: Exercise): ExerciseEntry {
    let entry = this.entries.find((e) => e.exercise.id === exercise.id);
    if (!entry) {
      entry = new ExerciseEntry(exercise);
      this.entries.push(entry);
    }
    return entry;
  }

  private dropIfEmpty(entry: ExerciseEntry): void {
    if (entry.isEmpty) this.entries.splice(this.entries.indexOf(entry), 1);
  }

  logSet(exercise: Exercise, reps: number, weightKg = 0): WorkoutSet {
    this.requireRunning();
    const set = createSet(reps, weightKg); // validate before touching state
    const entry = this.entryFor(exercise);
    try {
      entry.addSet(set);
    } catch (e) {
      this.dropIfEmpty(entry);
      throw e;
    }
    this.undoStack.push(exercise.id);
    return set;
  }

  logCardio(exercise: Exercise, minutes: number): void {
    this.requireRunning();
    const entry = this.entryFor(exercise);
    try {
      entry.addMinutes(minutes);
    } catch (e) {
      this.dropIfEmpty(entry);
      throw e;
    }
    this.undoStack.push(exercise.id);
  }

  /** Undo the most recent log (set or cardio block). Allowed while in progress or paused. */
  undoLast(): boolean {
    if (this.state !== 'in_progress' && this.state !== 'paused') {
      throw new InvalidTransition(`Cannot undo in a workout that is ${STATE_WORD[this.state]}`);
    }
    const id = this.undoStack.pop();
    if (id === undefined) return false;
    const entry = this.entries.find((e) => e.exercise.id === id);
    if (!entry) return false;
    entry.removeLast();
    this.dropIfEmpty(entry);
    return true;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0 && (this.state === 'in_progress' || this.state === 'paused');
  }

  hasLoggedWork(): boolean {
    return this.entries.some((e) => !e.isEmpty);
  }

  // --- derived values ------------------------------------------------------
  get activeMinutes(): number {
    let ms = this.activeMs;
    if (this.resumedAt !== null) ms += this.clock() - this.resumedAt;
    return ms / 60000;
  }

  totalReps(): number {
    return this.entries.reduce((s, e) => s + e.totalReps(), 0);
  }

  totalVolume(): number {
    return this.entries.reduce((s, e) => s + e.volume(), 0);
  }

  totalCalories(): number {
    return this.entries.reduce((s, e) => s + e.calories(this.bodyWeightKg), 0);
  }

  /** Full-precision summary; rounding happens only in the UI (PSP defect D-02). */
  summary(): WorkoutSummary {
    return Object.freeze({
      id: this.id,
      dateIso: (this.startedAt ?? new Date(this.clock())).toISOString(),
      activeMinutes: this.activeMinutes,
      totalReps: this.totalReps(),
      totalVolumeKg: this.totalVolume(),
      caloriesKcal: this.totalCalories(),
      exercises: this.entries.map((e) => e.exercise.name),
    });
  }
}
