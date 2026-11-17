/**
 * Local persistence (offline-first, no account). Works with any async
 * key-value store — AsyncStorage in the app, an in-memory map in tests.
 */
import { createProfile, UserProfile, WorkoutSummary } from './models';

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

const PROFILE_KEY = 'fittrack.profile.v1';
const HISTORY_KEY = 'fittrack.history.v1';

export class Repository {
  constructor(private readonly store: KeyValueStore) {}

  private async readJson<T>(key: string, fallback: T): Promise<T> {
    const raw = await this.store.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new StorageError('Saved data is corrupted and could not be read');
    }
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    await this.store.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  /** Returns null on first launch. Re-validates stored data so a bad file can never produce an invalid profile. */
  async loadProfile(): Promise<UserProfile | null> {
    const raw = await this.readJson<UserProfile | null>(PROFILE_KEY, null);
    return raw ? createProfile(raw) : null;
  }

  async addWorkout(summary: WorkoutSummary): Promise<void> {
    const history = await this.readJson<WorkoutSummary[]>(HISTORY_KEY, []);
    if (!Array.isArray(history)) throw new StorageError('Saved history has an unexpected format');
    history.push(summary);
    await this.store.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  /** Newest first. */
  async listWorkouts(): Promise<WorkoutSummary[]> {
    const history = await this.readJson<WorkoutSummary[]>(HISTORY_KEY, []);
    if (!Array.isArray(history)) throw new StorageError('Saved history has an unexpected format');
    return [...history].sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  }

  async clearAll(): Promise<void> {
    await this.store.removeItem(PROFILE_KEY);
    await this.store.removeItem(HISTORY_KEY);
  }
}

/** In-memory store for tests and previews. */
export class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  async getItem(key: string) { return this.data.has(key) ? this.data.get(key)! : null; }
  async setItem(key: string, value: string) { this.data.set(key, value); }
  async removeItem(key: string) { this.data.delete(key); }
}
