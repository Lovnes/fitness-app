# 5. Testing — FitTrack

| Level / type | Target | Where | Automated? |
|---|---|---|---|
| **Unit testing** | Calorie, rep, volume, 1RM, BMI/BMR/TDEE, recommended intake | [calculations.test.ts](../mobile/src/domain/__tests__/calculations.test.ts) | Yes (Jest) |
| **Boundary value testing** | Every input range, category edges, set/duration caps, intake floor | [boundaries.test.ts](../mobile/src/domain/__tests__/boundaries.test.ts) | Yes (Jest) |
| State-transition testing | `WorkoutSession` life cycle and undo (supports the State diagram) | [session.test.ts](../mobile/src/domain/__tests__/session.test.ts) | Yes (Jest) |
| Persistence, search, stats | Repository round trip, corrupt or tampered data, exercise search, dashboard aggregations | [storage-stats.test.ts](../mobile/src/domain/__tests__/storage-stats.test.ts) | Yes (Jest) |
| Static checks | TypeScript strict mode, ESLint (expo + React Compiler hook rules), `expo-doctor` | CI `test` job | Yes |
| UI walkthrough | All screens, driven in a phone-sized browser (react-native-web) | §5.5 | Scripted |
| **Usability testing** | Real users completing core tasks on a phone | §5.4 (plan + SUS scorer [tools/sus_score.py](../tools/sus_score.py)) | Manual |

```bash
cd mobile
npm test                    # all Jest suites
npx jest --coverage         # with coverage report (mobile/coverage/)
npx tsc --noEmit && npx eslint src
```

## 5.1 Latest results

```
Test Suites: 4 passed, 4 total
Tests:       221 passed, 221 total
tsc: 0 errors · eslint: 0 problems · expo-doctor: 20/20 checks passed
```

The 221 cases come from parameterised tests (`test.each`). Each BVA point and each state × event pair is its own case.

Domain statement coverage (`npx jest --coverage`; the CI enforces ≥ 90%):

| Module | Statements | Branches | Lines |
|---|---|---|---|
| validation.ts | **100%** | 100% | 100% |
| stats.ts | **100%** | 100% | 100% |
| exercises.ts | **100%** | 100% | 100% |
| session.ts | 97.9% | 89.5% | 100% |
| calculations.ts | 96.8% | 94.7% | 100% |
| storage.ts | 93.1% | 80.0% | 100% |
| types.ts | 90.9% | 100% | 90.9% |
| models.ts | 87.8% | 83.8% | 88.6% |
| **All domain files** | **96.2%** | **91.2%** | **98.1%** |

## 5.2 Unit tests — calorie and rep calculations

Expected values are computed by hand, independently of the code (the test oracle).

| ID | Function | Input | Expected | Working |
|---|---|---|---|---|
| UT-01 | `bmi` | 70 kg, 175 cm | 22.857 | 70 / 1.75² |
| UT-02 | `bmr` | 70 kg, 175 cm, 25 y, male | 1673.75 | 700 + 1093.75 − 125 + 5 |
| UT-03 | `bmr` | 60 kg, 165 cm, 30 y, female | 1320.25 | 600 + 1031.25 − 150 − 161 |
| UT-04 | `tdee` | BMR 1673.75 × each of 5 levels | ×1.2 … ×1.9 | 5 cases |
| UT-05 | `recommendedIntake` | TDEE 2594.31, lose / build / keep | 2090 / 2890 / 2590 | ±adjustment, rounded to 10 |
| UT-06 | `caloriesBurned` | MET 8.3, 70 kg, 30 min | 305.025 | 8.3 × 3.5 × 70 / 200 × 30 |
| UT-07 | `caloriesBurned` | linearity: 30 min = 3 × 10 min | equal | |
| UT-08 | `strengthDurationMin` | 3 × 10 reps, 3 s/rep, 60 s rest | 3.5 min | 90 s + 2 × 60 s |
| UT-09 | `strengthDurationMin` | 1 set × 10 reps | 0.5 min | no rest after the last set |
| UT-10 | `strengthCalories` | 3 × 10, MET 6, 80 kg | 29.4 | 8.4 kcal/min × 3.5 |
| UT-11 | `totalReps` | 10, 8, 6 | 24 | |
| UT-12 | `trainingVolume` | 10×60, 8×70, 6×80 | 1640 kg | 600 + 560 + 480 |
| UT-13 | `trainingVolume` | bodyweight sets (0 kg) | 0 | |
| UT-14 | `oneRepMaxEpley` | 100 kg × 5 / × 10 / × 1 | 116.667 / 133.333 / 100 | w(1 + r/30) |
| UT-15 | `oneRepMaxBrzycki` | 100 kg × 5 | 112.5 | 100 × 36 / 32 |
| UT-16 | Epley vs Brzycki | 80 kg × 10 | equal | the formulas intersect at r = 10 |
| UT-17 | `calorieBalance` | 2000 in, 2500 TDEE, 300 ex. | −800 | |
| UT-18 | `progressPercent` | 50/200, 250/200, 0/200 | 25, 100 (clamped), 0 | |
| UT-19 | Session totals | bench 3 sets + 30 min run @ 70 kg | 328.545 kcal; saved = live | regression for D-02 |
| UT-20 | Stats | 5 workouts across 17 days | today 400 kcal; week [0,0,0,150,0,200,400]; streak 2 | |

## 5.3 Boundary value analysis

Each range is tested at 7 points: **min−δ, min, min+δ, nominal, max−δ, max, max+δ** (δ = 1 for integers, 0.1 for decimals). The two outer points must be rejected and the five inner points accepted. The cases are generated from `validation.ALL_RANGES`, so the tests and the documentation cannot drift apart.

| Field | Valid range | ✗ min−δ | ✓ min | ✓ min+δ | ✓ nominal | ✓ max−δ | ✓ max | ✗ max+δ |
|---|---|---|---|---|---|---|---|---|
| Age (years) | 13 – 100 int | 12 | 13 | 14 | 56 | 99 | 100 | 101 |
| Body weight (kg) | 20.0 – 300.0 | 19.9 | 20.0 | 20.1 | 160.0 | 299.9 | 300.0 | 300.1 |
| Height (cm) | 100.0 – 250.0 | 99.9 | 100.0 | 100.1 | 175.0 | 249.9 | 250.0 | 250.1 |
| Reps per set | 1 – 100 int | 0 | 1 | 2 | 50 | 99 | 100 | 101 |
| Sets per exercise | 1 – 20 int | 0 | 1 | 2 | 10 | 19 | 20 | 21 |
| Weight lifted (kg) | 0.0 – 500.0 | −0.1 | 0.0 | 0.1 | 250.0 | 499.9 | 500.0 | 500.1 |
| Cardio duration (min) | 1.0 – 600.0 | 0.9 | 1.0 | 1.1 | 300.5 | 599.9 | 600.0 | 600.1 |
| MET value | 1.0 – 23.0 | 0.9 | 1.0 | 1.1 | 12.0 | 22.9 | 23.0 | 23.1 |
| Calorie intake (kcal) | 0 – 10000 int | −1 | 0 | 1 | 5000 | 9999 | 10000 | 10001 |
| Daily burn goal (kcal) | 50 – 3000 int | 49 | 50 | 51 | 1525 | 2999 | 3000 | 3001 |
| Goal | 1 – 100000 int | 0 | 1 | 2 | 50000 | 99999 | 100000 | 100001 |
| Reps for 1RM | 1 – 12 int | 0 | 1 | 2 | 6 | 11 | 12 | 13 |
| Fitness level | 1 – 5 int | 0 | 1 | 2 | 3 | 4 | 5 | 6 |

**Additional boundary and robustness cases**

| Case | Expected |
|---|---|
| BMI 18.49 / 18.5 / 24.99 / 25.0 / 29.99 / 30.0 | Underweight / Normal / Normal / Overweight / Overweight / Obese |
| 20th set on one exercise / 21st set | accepted / rejected ("Maximum 20"); the list stays at 20 |
| Cardio: 599 + 1.0 min / 599 + 1.1 min / block of 0.5 min | 600 accepted / "capped at 600" / below the per-block minimum |
| Intake floor (female): TDEE 1690 / 1700 / 1710, lose weight | 1200 (floored) / 1200 / 1210 |
| Extreme valid calories: MET 23, 300 kg, 600 min | 72,450 kcal (no overflow) |
| Minimum valid calories: MET 1, 20 kg, 1 min | 0.35 kcal |
| Non-numbers: `null`, `undefined`, `"10"`, `true`, `false`, NaN, ±∞, `[5]`, `{}` | rejected |
| Text: `""`, `"   "`, `"abc"`, `"12kg"`, `"nan"`, `"inf"`, `"1e3"`, `"-5"` | "required", "number", "finite" or "between" message |
| Integer field given 10.5 / 10.0 | rejected ("whole number") / accepted as 10 |
| Fitness level 0 / 6 on the gauge | clamped to sedentary / athlete |
| Tampered stored profile (age 5) | rejected on load (re-validated) |
| SUS answers 0, 6, 3.5, `True`, or 9 answers | rejected (tools/test_sus.py) |

**Boundaries enforced by the UI.** The wheel, ruler and stepper controls can only produce values inside the valid range: they clamp at min/max, and the − / + buttons disable at the ends. Invalid input is prevented rather than reported. The domain layer still validates everything, as defence in depth, and that is what the BVA tests exercise.

## 5.4 Usability testing

### Plan

| Item | Detail |
|---|---|
| Goal | Can first-time users finish onboarding and record a workout quickly and without errors? Is the calorie/rep feedback understandable? |
| Participants | 5 people who exercise at least once a week, none involved in development (5 users find ~85% of usability problems, per Nielsen & Landauer) |
| Device | Android or iPhone, 5.5–6.7″, portrait, app installed from the CI build. Sessions are screen-recorded with consent. |
| Method | Moderated think-aloud, one participant at a time, about 20 min each, then the SUS questionnaire |
| Moderator script | Read the task card aloud. Do not help unless the participant is stuck for > 2 min (count that as a failure). |

### Tasks and success criteria

| Task | Scenario given to participant | Success = | Target time |
|---|---|---|---|
| T1 | "Set the app up for yourself." | Onboarding done, Home visible | ≤ 90 s |
| T2 | "Start a workout and log 3 sets of bench press: 10 × 60, 8 × 70, 6 × 80 kg." | 3 correct sets shown | ≤ 60 s |
| T3 | "Add 20 minutes of running." (requires the search screen) | Running entry shows 20 min | ≤ 30 s |
| T4 | "You logged a set by mistake. Remove it." | Undo used, set gone | ≤ 15 s |
| T5 | "Take a break, then continue." | Pause → Resume used | ≤ 10 s |
| T6 | "Finish the workout. How many calories did you burn? Find it again in your history." | Correct kcal stated from History | ≤ 30 s |

### Metrics

- **Effectiveness:** task completion rate. Target ≥ 80% per task.
- **Efficiency:** time on task against the targets above.
- **Errors:** wrong taps and wrong values entered, per task.
- **Satisfaction:** Single Ease Question (1–7) after each task, plus the **SUS** at the end. Target mean SUS ≥ 68.

Record SUS answers in [usability/sus_responses.csv](usability/sus_responses.csv) and score them:

```bash
python3 tools/sus_score.py docs/usability/sus_responses.csv
```

### Results sheet (fill in after the sessions)

| Task | P1 | P2 | P3 | P4 | P5 | Completion | Mean time | Errors |
|---|---|---|---|---|---|---|---|---|
| T1 | | | | | | | | |
| T2 | | | | | | | | |
| T3 | | | | | | | | |
| T4 | | | | | | | | |
| T5 | | | | | | | | |
| T6 | | | | | | | | |

### Pre-test heuristic evaluation (done by the developer, before users)

All screens were checked at 390 × 844 against Nielsen's 10 heuristics. Screenshots are in [screenshots/](screenshots/).

| ID | Heuristic | Finding | Severity (0–4) | Status |
|---|---|---|---|---|
| U-01 | Visibility of system status | v1: the validation error was off-screen below the Save button (D-03) | 3 | **Fixed in v1.** The v2 pickers make invalid input impossible, and errors show next to the action |
| U-02 | Consistency | v1: the live calorie total did not match the saved total (D-02) | 2 | **Fixed.** Regression test UT-19 |
| U-03 | Error prevention | Wheel, ruler and stepper inputs are clamped to valid ranges. Cancel and Reset ask for confirmation. | — | Implemented |
| U-04 | User control & freedom | v1 could not remove a mis-logged set | 3 | **Fixed in v2.** The Undo button removes the last set or cardio block |
| U-05 | Recognition over recall | Exercise search shows names, muscle group and MET. Category chips filter the list. | — | OK |
| U-06 | Error prevention | v1: Finish saved immediately and sat next to Pause | 2 | **Fixed in v2.** Finish opens a summary sheet ("Keep going" / "Finish & save") |
| U-07 | Visibility of status | The live timer, reps, volume and kcal update after every log, and a green banner confirms each one | — | OK |
| U-08 | Aesthetic & minimalist | v2: the selected filter chip was invisible on the orange search header (D-08) | 2 | **Fixed** |
| U-09 | Flexibility & efficiency | Reps and weight steppers keep their values between sets, so repeated sets take one tap | — | OK |
| U-10 | Accessibility | Pickers expose `adjustable` roles with increment/decrement actions. Buttons have labels. Touch targets are ≥ 48 dp. | — | Implemented. Needs a TalkBack / VoiceOver check with users |

## 5.5 UI walkthrough (scripted)

A puppeteer script drives the web build of the app at phone size (390 × 844, 2× DPR). It covers welcome → 7 onboarding steps → Home → start workout → log 2 bench sets → search ("zumba" → Not Found → "run") → log 30 min running → Finish confirm → saved → Home, History, Profile.

The run covered all 19 screens with **0 console errors**. It found three layout defects, D-06 to D-08, that the unit tests could not catch (see [04_PSP.md](04_PSP.md) §4.4). The screenshots are in [screenshots/](screenshots/).

The live totals in the walkthrough match hand calculation:
- Bench 10 × 60 + 8 × 70 gives **1,160 kg** of volume.
- 18 reps × 3 s + 60 s rest = 1.9 min × 7.35 kcal/min = **14 kcal**.
- A 30 min run at 8.3 MET adds **305 kcal**, for a total of **319 kcal**.
