# 2. UML Design — FitTrack

The PlantUML files in [uml/](uml/) are the authoritative diagrams. To render them, use the VS Code *PlantUML* extension (Alt+D) or `plantuml docs/uml/*.puml`. Simplified Mermaid versions follow below. They preview directly on GitHub.

| Diagram | Source | What it shows |
|---|---|---|
| Use Case | [uml/use_case.puml](uml/use_case.puml) | 11 user goals plus `<<include>>`/`<<extend>>` relationships to shared behaviour |
| Class | [uml/class.puml](uml/class.puml) | The pure-TypeScript domain model, persistence behind an interface, and the React Native UI layer |
| Activity | [uml/activity_log_workout.puml](uml/activity_log_workout.puml) | The end-to-end "assess, then record a workout" flow with User/App swimlanes |
| State | [uml/state_workout_session.puml](uml/state_workout_session.puml) | Life cycle of a `WorkoutSession` (implemented in `mobile/src/domain/session.ts`) |

## 2.1 Use Case diagram

```mermaid
flowchart LR
  user([User])
  store[(Device Storage)]
  subgraph FitTrack
    UC1((Complete Assessment))
    UC2((View Body Metrics))
    UC3((Start Workout))
    UC4((Log Strength Set))
    UC5((Log Cardio))
    UC6((Pause / Resume))
    UC7((Finish Workout))
    UC8((Cancel Workout))
    UC9((History & Dashboard))
    UC10((Search Exercise))
    UC11((Undo Last Entry))
    VAL((Validate Input))
    CAL((Calculate Calories))
    REP((Calculate Reps & Volume))
    TGT((Recommend Target))
    ORM((Estimate 1RM))
    CONF((Confirm Action))
    SAVE((Save Summary))
  end
  user --- UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8 & UC9 & UC10 & UC11
  UC1 -. include .-> VAL
  UC1 -. include .-> UC2
  UC2 -. include .-> TGT
  UC4 -. include .-> VAL & REP & CAL
  UC5 -. include .-> VAL & CAL
  ORM -. extend .-> UC4
  UC10 -. extend .-> UC4
  UC7 -. include .-> CONF & SAVE
  UC8 -. include .-> CONF
  SAVE --- store
  UC9 --- store
```

**Design notes**
- *Validate Input* and *Calculate Calories* are `<<include>>` because they run on every log. They exist once in code (`validation.ts`, `calculations.ts`).
- *Estimate 1RM* is an `<<extend>>` with a condition (load > 0 and reps ≤ 12). Above 12 reps the formulas become unreliable.
- *Confirm Action* is included by Finish and Cancel. It came from usability finding U-06.
- *Undo Last Entry* (UC11) came from usability finding U-04.

## 2.2 Class diagram

```mermaid
classDiagram
  direction LR
  class UserProfile {
    <<immutable>>
    +name: string
    +age: number
    +sex: Sex
    +weightKg: number
    +heightCm: number
    +activityLevel: ActivityLevel
    +goal: FitnessGoal
    +dailyCalorieGoal: number
  }
  class Exercise {
    +id: string
    +name: string
    +category: ExerciseCategory
    +met: number
  }
  class WorkoutSet {
    +reps: number
    +weightKg: number
  }
  class ExerciseEntry {
    +sets: WorkoutSet[]
    +cardioBlocks: number[]
    +addSet(s)
    +addMinutes(m)
    +removeLast() boolean
    +calories(kg) number
    +bestOneRepMax() number
  }
  class WorkoutSession {
    +state: SessionState
    +start()
    +pause()
    +resume()
    +finish() WorkoutSummary
    +cancel()
    +logSet(ex, reps, kg)
    +logCardio(ex, min)
    +undoLast() boolean
    +totalCalories() number
  }
  class WorkoutSummary {
    <<immutable>>
    +dateIso: string
    +totalReps: number
    +caloriesKcal: number
  }
  class FitnessCalculator {
    <<module>>
    +bmi() number
    +bmr() number
    +tdee() number
    +recommendedIntake() number
    +caloriesBurned() number
    +trainingVolume() number
    +oneRepMaxEpley() number
  }
  class KeyValueStore {
    <<interface>>
    +getItem(key)
    +setItem(key, value)
  }
  class Repository {
    +saveProfile(p)
    +loadProfile() UserProfile
    +addWorkout(s)
    +listWorkouts() WorkoutSummary[]
  }
  class AppStore {
    <<React context>>
    +profile
    +history
    +session
    +startSession()
    +finishSession()
  }
  WorkoutSession "1" *-- "0..*" ExerciseEntry
  ExerciseEntry "1" *-- "0..20" WorkoutSet
  ExerciseEntry --> "1" Exercise
  WorkoutSession ..> WorkoutSummary : creates
  ExerciseEntry ..> FitnessCalculator
  UserProfile ..> FitnessCalculator
  Repository o-- KeyValueStore
  Repository ..> UserProfile
  Repository ..> WorkoutSummary
  AppStore o-- Repository
  AppStore o-- WorkoutSession
```

**Design notes**
- **Separation of concerns.** Everything in `src/domain/` is pure TypeScript: no React, no I/O, no global clock. That makes all of it unit-testable in Jest, which is the main design driver given the testing requirement. Screens only read state and call domain operations.
- **Dependency inversion for storage.** `Repository` depends on the `KeyValueStore` interface. The app injects AsyncStorage; tests inject `MemoryStore`. Loaded data is re-validated through `createProfile`.
- **Composition.** A session owns its entries, and an entry owns its sets. `Exercise` is shared catalogue data, so it is an association.
- **Immutability.** `UserProfile`, `WorkoutSet`, `Exercise` and `WorkoutSummary` are frozen after validation, so they cannot become invalid.
- **Testable time.** `WorkoutSession` takes an injectable `clock`, so tests control time exactly.

## 2.3 Activity diagram — Assess, then record a workout

```mermaid
flowchart TD
  A([Open app]) --> B{Profile saved?}
  B -- no --> C[/Assessment: gender, age wheel, weight & height rulers, level gauge, goal/]
  C --> E[Compute BMI, BMR, TDEE, calorie target → save] --> F
  B -- yes --> F[Tap Start → in_progress]
  F --> G[/Select exercise: search + filter/]
  G --> H{Strength?}
  H -- yes --> I[/Reps & weight steppers/]
  H -- no --> J[/Minutes stepper/]
  I --> K{Valid?}
  J --> K
  K -- no --> L[Error banner next to Log] --> G
  K -- yes --> M[Add to entry] --> N[Recalc reps ‖ volume ‖ calories ‖ 1RM] --> O[Refresh totals]
  O --> X{Logged by mistake?}
  X -- yes --> Y[Undo last entry] --> O
  X -- no --> P{More?}
  P -- yes --> G
  P -- no --> Q{Finish or Cancel?}
  Q -- Cancel --> R{Confirm discard?}
  R -- yes --> S([cancelled])
  R -- no --> G
  Q -- Finish --> Z{Confirm summary?}
  Z -- Keep going --> G
  Z -- Finish & save --> T{Anything logged?}
  T -- no --> U[Show 'log at least one set'] --> G
  T -- yes --> V[completed → build summary → save] --> W([Workout saved · History updated])
```

## 2.4 State machine diagram — WorkoutSession

```mermaid
stateDiagram-v2
  [*] --> NotStarted
  NotStarted --> InProgress : start()
  NotStarted --> Cancelled : cancel()
  InProgress --> Paused : pause()
  Paused --> InProgress : resume()
  InProgress --> InProgress : logSet / logCardio / undoLast
  Paused --> Paused : undoLast [stack not empty]
  InProgress --> Completed : finish() [has logged work]
  Paused --> Completed : finish() [has logged work]
  InProgress --> Cancelled : cancel() [confirmed]
  Paused --> Cancelled : cancel() [confirmed]
  Completed --> [*]
  Cancelled --> [*]
```

**Traceability to code and tests:** the diagram is implemented one-to-one as the `TRANSITIONS` table in [`session.ts`](../mobile/src/domain/session.ts). [`session.test.ts`](../mobile/src/domain/__tests__/session.test.ts) fires all 5 events in all 5 states (25 pairs). That covers the 8 valid transitions and confirms the other 17 are rejected and leave the state unchanged (sneak-path testing). It also tests undo in each state and timing with a fake clock.
