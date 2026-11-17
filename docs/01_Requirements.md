# 1. Requirements — FitTrack

| Item | Value |
|---|---|
| Product | FitTrack: fitness and workout tracking app |
| Platform | Mobile (Android first, via Kivy + Buildozer; also runs on desktop for development) |
| Team | Single developer (small consumer app) |
| Process | Personal Software Process (PSP), see [04_PSP.md](04_PSP.md) |
| Cost model | Basic COCOMO, organic mode, see [03_COCOMO.md](03_COCOMO.md) |
| Testing | Unit (calorie/rep calculations), Boundary value, Usability, see [05_Testing.md](05_Testing.md) |

## 1.1 Scope (v1.0)

**In scope:** user profile with body metrics; logging strength sets (reps × weight) and cardio blocks (minutes) during a timed workout; calorie, rep, volume and 1RM calculations; local workout history. The app works offline and needs no account.

**Out of scope for v1.0:** cloud sync, social features, nutrition/food logging, wearable integration, charts, custom exercises. These are the "v2" scenario costed in the COCOMO section.

## 1.2 Functional requirements

| ID | Requirement | Use case |
|---|---|---|
| FR-1 | The user can create and edit a profile: name, age, sex, weight, height, activity level, daily calorie goal. | UC1 |
| FR-2 | The app calculates and shows BMI with its WHO category, BMR (Mifflin-St Jeor) and TDEE. | UC2 |
| FR-3 | The user can start a workout. A timer records active time only (paused time excluded). | UC3, UC6 |
| FR-4 | The user can log a strength set (1–100 reps, 0–500 kg; 0 = bodyweight), up to 20 sets per exercise. | UC4 |
| FR-5 | The user can log cardio in minutes (1–600 per block, 600 max per exercise per session). | UC5 |
| FR-6 | Totals (reps, volume, calories) update immediately after each log. | UC4, UC5 |
| FR-7 | Calories use the MET method: kcal = MET × 3.5 × body kg ÷ 200 × minutes. Strength duration is estimated at 3 s/rep plus 60 s rest between sets. | UC4, UC5 |
| FR-8 | The app estimates 1-rep max (Epley) for loaded sets of 1–12 reps. | UC4 (extend) |
| FR-9 | A workout can be finished only if at least one set or cardio block was logged. | UC7 |
| FR-10 | Cancelling a workout asks for confirmation and discards the session. | UC8 |
| FR-11 | Finished workouts are saved locally and listed newest first with totals. | UC7, UC9 |
| FR-12 | Every numeric input is validated. Invalid input produces a specific message and changes no data. | all |

## 1.3 Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Accuracy | Calculations match hand-computed reference values to 0.001 (verified by unit tests). |
| NFR-2 | Usability | A first-time user completes "log 3 sets" in ≤ 60 s. SUS score ≥ 68. Touch targets ≥ 48 dp. |
| NFR-3 | Reliability | Saves are atomic (temp file + rename), so a crash never corrupts history. |
| NFR-4 | Offline | All features work without network access. |
| NFR-5 | Privacy | Data stays on the device. No account is required. |
| NFR-6 | Maintainability | Domain logic is separate from the UI and has ≥ 90% statement coverage. |
| NFR-7 | Performance | Totals refresh within 100 ms of a log action on a mid-range phone. |

## 1.4 Use case descriptions (main flows)

### UC4 — Log Strength Set
- **Actor:** User
- **Precondition:** A workout is IN_PROGRESS.
- **Main flow:**
  1. The user selects a strength exercise.
  2. The user enters reps and weight.
  3. The user taps **Log set**.
  4. The system validates the input (include *Validate Input*).
  5. The system adds the set to the exercise entry.
  6. The system recalculates reps, volume and calories (include *Calculate Reps & Volume*, *Calculate Calories*).
  7. If the load is > 0 and reps ≤ 12, the system updates the estimated 1RM (extend *Estimate 1-Rep Max*).
  8. The system shows the confirmation and the new totals.
- **Alternate flows:**
  - 4a. Invalid input → the system shows a message such as "Reps must be between 1 and 100". No set is added.
  - 5a. The exercise already has 20 sets → the system shows "Maximum 20 sets per exercise".
  - *a. The workout is paused → the **Log set** button is disabled.
- **Postcondition:** The set is part of the session, and the totals are consistent.

### UC7 — Finish Workout
- **Precondition:** The workout is IN_PROGRESS or PAUSED.
- **Main flow:**
  1. The user taps **Finish**.
  2. The system checks that at least one set or cardio block was logged.
  3. The state becomes COMPLETED and the timer stops.
  4. The system builds a WorkoutSummary and saves it (include *Save Workout Summary*).
  5. The system shows the totals.
- **Alternate flow:** 2a. Nothing logged → the system shows "Log at least one set…" and the state stays unchanged.

### UC1 — Manage Profile
- **Main flow:**
  1. The user enters their details.
  2. The system validates every field.
  3. The system saves the profile.
  4. The system shows BMI, BMR and TDEE (include UC2).
- **Alternate flow:** 2a. Any field is invalid → the first error appears at the top of the form. Nothing is saved.
