# 1. Requirements — FitTrack

| Item | Value |
|---|---|
| Product | FitTrack: fitness and workout tracking app |
| Platform | Mobile: **React Native 0.88 + Expo SDK 58** (TypeScript). Android and iOS from one codebase; web for previews |
| Team | Single developer (small consumer app) |
| Process | Personal Software Process (PSP), see [04_PSP.md](04_PSP.md) |
| Cost model | Basic COCOMO, organic mode, see [03_COCOMO.md](03_COCOMO.md) |
| Testing | Unit (calorie/rep calculations), Boundary value, Usability, see [05_Testing.md](05_Testing.md) |

## 1.1 Scope (v2)

**In scope:**
- A guided assessment: gender, age, weight, height, fitness level, goal.
- Body metrics and a goal-based daily calorie target.
- Logging strength sets (reps × weight) and cardio blocks (minutes) during a timed workout, with undo.
- Exercise search.
- Calorie, rep, volume and 1RM calculations.
- Dashboard, history and profile.

The app works offline and needs no account.

**Out of scope:** cloud sync, social features, nutrition/food logging, wearable integration, custom exercises. These are the "v3" scenario costed in the COCOMO section.

## 1.2 Functional requirements

| ID | Requirement | Use case |
|---|---|---|
| FR-1 | The assessment collects gender, age (wheel), weight and height (rulers), fitness level 1–5 (gauge) and goal. All of it can be edited later. | UC1 |
| FR-2 | The app shows BMI with its WHO category, BMR (Mifflin-St Jeor) and TDEE (BMR × activity factor for the fitness level). | UC2 |
| FR-3 | The app recommends a daily calorie target: TDEE + goal adjustment (−500 / +300 / 0 / +200 kcal), rounded to 10 kcal, never below 1200 (female) or 1500 (male). | UC1 |
| FR-4 | The user can start a workout. A timer records active time only (paused time excluded). | UC3, UC6 |
| FR-5 | The user can search the exercise catalogue by name or muscle group and filter by Strength or Cardio. No matches shows a "Not Found" state. | UC10 |
| FR-6 | The user can log a strength set (1–100 reps, 0–500 kg in 2.5 kg steps; 0 = bodyweight), up to 20 sets per exercise. | UC4 |
| FR-7 | The user can log cardio in minutes (1–600 per block, 600 max per exercise per session). | UC5 |
| FR-8 | Totals (reps, volume, calories) update immediately after each log, and a confirmation is shown. | UC4, UC5 |
| FR-9 | Calories use the MET method: kcal = MET × 3.5 × body kg ÷ 200 × minutes. Strength duration is estimated at 3 s/rep plus 60 s rest between sets. | UC4, UC5 |
| FR-10 | The app estimates 1-rep max (Epley) for loaded sets of 1–12 reps. | UC4 (extend) |
| FR-11 | The user can undo the most recent set or cardio block while the workout is in progress or paused. | UC11 |
| FR-12 | Finishing requires at least one logged set or block, and shows a confirmation summary first. | UC7 |
| FR-13 | Cancelling asks for confirmation and discards the session. | UC8 |
| FR-14 | Finished workouts are saved locally and listed newest first, grouped by day, with a filter by exercise. | UC7, UC9 |
| FR-15 | Home shows today's burned kcal against the daily burn goal, a 7-day chart and a streak. | UC2, UC9 |
| FR-16 | Every numeric input is constrained by its control and validated again in the domain layer. Invalid data changes nothing. | all |
| FR-17 | The user can reset all data, after confirming. | UC1 |

## 1.3 Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Accuracy | Calculations match hand-computed reference values to 0.001 (Jest). |
| NFR-2 | Usability | A first-time user logs 3 sets in ≤ 60 s. SUS score ≥ 68. Touch targets ≥ 48 dp. |
| NFR-3 | Reliability | Stored data is re-validated on load. Corrupt data shows a recovery screen instead of crashing. |
| NFR-4 | Offline | All features work without network access. |
| NFR-5 | Privacy | Data stays on the device (AsyncStorage). No account is required. |
| NFR-6 | Maintainability | Domain logic is pure TypeScript with no React, at ≥ 90% statement coverage (enforced in CI). |
| NFR-7 | Accessibility | Pickers are `adjustable` with increment/decrement actions, and every control has an accessibility label. |
| NFR-8 | Portability | One codebase builds Android (APK) and iOS (simulator app) in CI. |

## 1.4 Use case descriptions (main flows)

### UC4 — Log Strength Set
- **Actor:** User
- **Precondition:** A workout is IN_PROGRESS.
- **Main flow:**
  1. The user selects an exercise (UC10).
  2. The user sets reps and weight with the − / + steppers.
  3. The user taps **Log set**.
  4. The system validates the input (include *Validate Input*).
  5. The system adds the set to the exercise entry.
  6. The system recalculates reps, volume and calories (include *Calculate Reps & Volume*, *Calculate Calories*).
  7. If the load is > 0 and reps ≤ 12, the system updates the estimated 1RM (extend *Estimate 1-Rep Max*).
  8. The system shows a confirmation and the new totals.
- **Alternate flows:**
  - 5a. The exercise already has 20 sets → the system shows "Maximum 20 sets per exercise".
  - *a. The workout is paused → **Log set** is disabled, and a banner says "Paused — resume to keep logging".
- **Postcondition:** The set is part of the session, and the totals are consistent.

### UC7 — Finish Workout
- **Precondition:** The workout is IN_PROGRESS or PAUSED.
- **Main flow:**
  1. The user taps **Finish**.
  2. The system shows a summary sheet (reps, kcal, time).
  3. The user confirms **Finish & save**.
  4. The system checks that at least one set or cardio block was logged.
  5. The state becomes COMPLETED and the timer stops.
  6. The system saves the WorkoutSummary (include *Save Workout Summary*).
  7. The system shows the "Workout saved" card.
- **Alternate flows:**
  - 3a. The user taps **Keep going** → nothing changes.
  - 4a. Nothing was logged → the system shows "Log at least one set…" and the state is unchanged.

### UC1 — Complete Assessment
- **Main flow:**
  1. The user answers 6 steps.
  2. The system shows BMI, BMR, TDEE and the recommended target (include UC2).
  3. The user enters a name.
  4. The system validates and saves the profile.
- **Alternate flow:** 1a. Gender or goal not chosen → **Continue** stays disabled.
