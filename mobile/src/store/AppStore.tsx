/**
 * App state: profile, workout history, the active WorkoutSession and the
 * onboarding draft. Persistence goes through the domain Repository, backed by
 * AsyncStorage on device (localStorage on web).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';

import { BY_ID, CATALOG } from '../domain/exercises';
import { Exercise, UserProfile, WorkoutSummary } from '../domain/models';
import { WorkoutSession } from '../domain/session';
import { Repository } from '../domain/storage';
import { activityToLevel, FitnessGoal, Sex } from '../domain/types';

export interface Draft {
  name: string;
  sex?: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  level: number;
  goal?: FitnessGoal;
  editing: boolean;
}

const NEW_DRAFT: Draft = { name: '', age: 25, weightKg: 70, heightCm: 170, level: 3, editing: false };

interface AppStore {
  ready: boolean;
  loadError: string | null;
  profile: UserProfile | null;
  history: WorkoutSummary[];
  session: WorkoutSession | null;
  /** Bumped after every session mutation so screens re-render. */
  version: number;
  exercise: Exercise;
  draft: Draft;
  setDraft: (patch: Partial<Draft>) => void;
  editProfile: () => void;
  saveProfile: (p: UserProfile) => Promise<void>;
  selectExercise: (id: string) => void;
  startSession: () => WorkoutSession;
  mutate: (fn: (s: WorkoutSession) => void) => void;
  finishSession: () => Promise<WorkoutSummary>;
  cancelSession: () => void;
  resetAll: () => Promise<void>;
}

const Ctx = createContext<AppStore | null>(null);

export function AppStoreProvider({ children, repository }: { children: ReactNode; repository?: Repository }) {
  const [repo] = useState(() => repository ?? new Repository(AsyncStorage));
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<WorkoutSummary[]>([]);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [version, setVersion] = useState(0);
  const [exerciseId, setExerciseId] = useState(CATALOG[0].id);
  const [draft, setDraftState] = useState<Draft>(NEW_DRAFT);

  useEffect(() => {
    (async () => {
      try {
        const [p, h] = await Promise.all([repo.loadProfile(), repo.listWorkouts()]);
        setProfile(p);
        setHistory(h);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        setReady(true);
      }
    })();
  }, [repo]);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const setDraft = useCallback((patch: Partial<Draft>) => setDraftState((d) => ({ ...d, ...patch })), []);

  const editProfile = useCallback(() => {
    if (!profile) return;
    setDraftState({
      name: profile.name, sex: profile.sex, age: profile.age, weightKg: Math.round(profile.weightKg),
      heightCm: Math.round(profile.heightCm), level: activityToLevel(profile.activityLevel), goal: profile.goal, editing: true,
    });
  }, [profile]);

  const saveProfile = useCallback(async (p: UserProfile) => {
    await repo.saveProfile(p);
    setProfile(p);
    setLoadError(null);
    setDraftState(NEW_DRAFT);
  }, [repo]);

  const startSession = useCallback(() => {
    if (!profile) throw new Error('Set up your profile first');
    const s = new WorkoutSession(profile.weightKg);
    s.start();
    setSession(s);
    bump();
    return s;
  }, [profile, bump]);

  const mutate = useCallback((fn: (s: WorkoutSession) => void) => {
    if (!session) return;
    try {
      fn(session);
    } finally {
      bump();
    }
  }, [session, bump]);

  const finishSession = useCallback(async () => {
    if (!session) throw new Error('No active workout');
    const summary = session.finish(); // throws InvalidTransition if nothing logged
    bump();
    await repo.addWorkout(summary);
    setHistory((h) => [summary, ...h]);
    return summary;
  }, [session, repo, bump]);

  const cancelSession = useCallback(() => {
    session?.cancel();
    setSession(null);
    bump();
  }, [session, bump]);

  const resetAll = useCallback(async () => {
    await repo.clearAll();
    setProfile(null);
    setHistory([]);
    setSession(null);
    setDraftState(NEW_DRAFT);
    bump();
  }, [repo, bump]);

  const value = useMemo<AppStore>(() => ({
    ready, loadError, profile, history, session, version,
    exercise: BY_ID[exerciseId] ?? CATALOG[0],
    draft, setDraft, editProfile, saveProfile,
    selectExercise: setExerciseId,
    startSession, mutate, finishSession, cancelSession, resetAll,
  }), [ready, loadError, profile, history, session, version, exerciseId, draft, setDraft, editProfile,
    saveProfile, startSession, mutate, finishSession, cancelSession, resetAll]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppStoreProvider');
  return ctx;
}

/** Re-render once a second while a workout is running (live timer). */
export function useTicker(active: boolean): void {
  const [, setT] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setT((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}
