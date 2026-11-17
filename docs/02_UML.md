# 2. UML Design — FitTrack

The PlantUML files in [uml/](uml/) are the authoritative diagrams. To render them, use the VS Code *PlantUML* extension (Alt+D) or `plantuml docs/uml/*.puml`. Simplified Mermaid versions follow below. They preview directly on GitHub and in VS Code with a Mermaid extension.

| Diagram | Source | What it shows |
|---|---|---|
| Use Case | [uml/use_case.puml](uml/use_case.puml) | 9 user goals plus `<<include>>`/`<<extend>>` relationships to shared behaviour |
| Class | [uml/class.puml](uml/class.puml) | Domain model, calculator utility, persistence, and the UI layer |
| Activity | [uml/activity_log_workout.puml](uml/activity_log_workout.puml) | The end-to-end "record a workout" flow with User/App swimlanes |
| State | [uml/state_workout_session.puml](uml/state_workout_session.puml) | Life cycle of a `WorkoutSession` (implemented in `fitness/session.py`) |

## 2.1 Use Case diagram

```mermaid
flowchart LR
  user([User])
  store[(Device Storage)]
  subgraph FitTrack
    UC1((Manage Profile))
    UC2((View Body Metrics))
    UC3((Start Workout))
    UC4((Log Strength Set))
    UC5((Log Cardio))
    UC6((Pause / Resume))
    UC7((Finish Workout))
    UC8((Cancel Workout))
    UC9((View History))
    VAL((Validate Input))
    CAL((Calculate Calories))
    REP((Calculate Reps & Volume))
    ORM((Estimate 1RM))
    SAVE((Save Summary))
  end
  user --- UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8 & UC9
  UC1 -. include .-> VAL
  UC1 -. include .-> UC2
  UC4 -. include .-> VAL & REP & CAL
  UC5 -. include .-> VAL & CAL
  ORM -. extend .-> UC4
  UC7 -. include .-> SAVE
  SAVE --- store
  UC9 --- store
```

**Design notes**
- *Validate Input* and *Calculate Calories* are `<<include>>` because they run on every log action. They exist once in code (`validation.py`, `calculations.py`).
- *Estimate 1RM* is an `<<extend>>` with a condition: it runs only when the load is > 0 and reps ≤ 12. Above 12 reps, the Epley and Brzycki formulas become unreliable.

## 2.2 Class diagram

```mermaid
classDiagram
  direction LR
  class UserProfile {
    +name: str
    +age: int
    +sex: Sex
    +weight_kg: float
    +height_cm: float
    +activity_level: ActivityLevel
    +bmi() float
    +bmr() float
    +tdee() float
  }
  class Exercise {
    +id: str
    +name: str
    +category: ExerciseCategory
    +met: float
  }
  class WorkoutSet {
    +reps: int
    +weight_kg: float
  }
  class ExerciseEntry {
    +sets: List~WorkoutSet~
    +cardio_minutes: float
    +add_set(s)
    +add_minutes(m)
    +total_reps() int
    +volume() float
    +calories(kg) float
    +best_one_rep_max() float
  }
  class WorkoutSession {
    +state: SessionState
    +start()
    +pause()
    +resume()
    +finish() WorkoutSummary
    +cancel()
    +log_set(ex, reps, kg)
    +log_cardio(ex, min)
    +total_calories() float
  }
  class WorkoutSummary {
    +date_iso: str
    +total_reps: int
    +calories_kcal: float
  }
  class FitnessCalculator {
    <<utility>>
    +bmi() float
    +bmr() float
    +tdee() float
    +calories_burned() float
    +total_reps() int
    +training_volume() float
    +one_rep_max_epley() float
  }
  class JsonRepository {
    +save_profile(p)
    +load_profile() UserProfile
    +add_workout(s)
    +list_workouts() List
  }
  WorkoutSession "1" *-- "0..*" ExerciseEntry
  ExerciseEntry "1" *-- "0..20" WorkoutSet
  ExerciseEntry --> "1" Exercise
  WorkoutSession ..> WorkoutSummary : creates
  ExerciseEntry ..> FitnessCalculator
  UserProfile ..> FitnessCalculator
  JsonRepository ..> UserProfile
  JsonRepository ..> WorkoutSummary
```

**Design notes**
- **Separation of concerns:** `FitnessCalculator` (module `calculations.py`) holds only pure functions with no I/O and no clock. That makes it fully unit-testable, which is the main design driver given the testing requirement.
- **Composition:** a session owns its entries, and an entry owns its sets. Deleting a session deletes them. `Exercise` is shared reference data from the catalogue, so it is an association.
- **Immutability:** `WorkoutSet`, `Exercise` and `WorkoutSummary` are frozen dataclasses. After validation in `__post_init__`, they cannot become invalid.
- **Dependency direction:** UI → domain, never the reverse. `WorkoutSession` accepts an injectable `clock`, so timing can be tested deterministically.

## 2.3 Activity diagram — Record a workout

```mermaid
flowchart TD
  A([Open app]) --> B{Profile saved?}
  B -- no --> C[/Enter details/] --> D{Valid?}
  D -- no --> C
  D -- yes --> E[Compute BMI/BMR/TDEE, save] --> F
  B -- yes --> F[Tap Start → IN_PROGRESS]
  F --> G[/Select exercise/]
  G --> H{Strength?}
  H -- yes --> I[/Enter reps & weight/]
  H -- no --> J[/Enter minutes/]
  I --> K{Valid?}
  J --> K
  K -- no --> L[Show error] --> G
  K -- yes --> M[Add to entry] --> N[Recalc reps ‖ volume ‖ calories ‖ 1RM] --> O[Refresh totals]
  O --> P{More?}
  P -- yes --> G
  P -- no --> Q{Finish or Cancel?}
  Q -- Cancel --> R{Confirm?}
  R -- yes --> S([CANCELLED])
  R -- no --> G
  Q -- Finish --> T{Anything logged?}
  T -- no --> U[Show 'log at least one set'] --> G
  T -- yes --> V[COMPLETED → build summary → save] --> W([Show totals / history])
```

The PlantUML version adds User/App swimlanes, the fork/join for the parallel recalculations, and the pause/resume branch.

## 2.4 State machine diagram — WorkoutSession

```mermaid
stateDiagram-v2
  [*] --> NotStarted
  NotStarted --> InProgress : start()
  NotStarted --> Cancelled : cancel()
  InProgress --> Paused : pause()
  Paused --> InProgress : resume()
  InProgress --> Completed : finish() [has logged work]
  Paused --> Completed : finish() [has logged work]
  InProgress --> Cancelled : cancel() [confirmed]
  Paused --> Cancelled : cancel() [confirmed]
  Completed --> [*]
  Cancelled --> [*]
  note right of InProgress
    entry: timer running
    log_set / log_cardio allowed
    exit: bank elapsed time
  end note
```

**Traceability to code and tests:** the diagram is implemented one-to-one as the `TRANSITIONS` table in [`fitness/session.py`](../fitness/session.py). [`tests/test_session_state.py`](../tests/test_session_state.py) fires all 5 events in all 5 states (25 pairs). That covers the 8 valid transitions and confirms that the other 17 are rejected and leave the state unchanged (sneak-path testing).
