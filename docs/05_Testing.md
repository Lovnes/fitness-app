# 5. Testing — FitTrack

| Level / type | Target | Where | Automated? |
|---|---|---|---|
| **Unit testing** | Calorie, rep, volume, 1RM, BMI/BMR/TDEE calculations | [tests/test_calculations.py](../tests/test_calculations.py) | Yes |
| **Boundary value testing** | Every input range, category edges, set/duration caps | [tests/test_boundaries.py](../tests/test_boundaries.py) | Yes |
| State-transition testing | `WorkoutSession` life cycle (supports the State diagram) | [tests/test_session_state.py](../tests/test_session_state.py) | Yes |
| Persistence | Save/load round trip, ordering, corrupt file | [tests/test_storage.py](../tests/test_storage.py) | Yes |
| **Usability testing** | Real users completing core tasks on a phone | §5.4 (plan + SUS scorer [tools/sus_score.py](../tools/sus_score.py)) | Manual |

Run everything with nothing but Python 3:

```bash
python3 -m unittest discover -s tests -v
```

## 5.1 Latest results

```
Ran 60 tests in 0.009s
OK
```

Statement coverage of the domain package (`coverage run --source=fitness -m unittest discover -s tests`):

| Module | Stmts | Cover |
|---|---|---|
| calculations.py | 75 | **100%** |
| validation.py | 47 | **100%** |
| session.py | 97 | 99% |
| storage.py | 44 | 98% |
| enums.py | 30 | 97% |
| models.py | 94 | 94% |
| **Total** | **394** | **98%** |

## 5.2 Unit tests — calorie and rep calculations

Expected values are computed by hand, independently of the code (the test oracle).

| ID | Function | Input | Expected | Working |
|---|---|---|---|---|
| UT-01 | `bmi` | 70 kg, 175 cm | 22.857 | 70 / 1.75² |
| UT-02 | `bmr` | 70 kg, 175 cm, 25 y, male | 1673.75 | 700 + 1093.75 − 125 + 5 |
| UT-03 | `bmr` | 60 kg, 165 cm, 30 y, female | 1320.25 | 600 + 1031.25 − 150 − 161 |
| UT-04 | `tdee` | BMR 1673.75 × each of 5 levels | ×1.2 … ×1.9 | 5 sub-tests |
| UT-05 | `calories_burned` | MET 8.3, 70 kg, 30 min | 305.025 | 8.3 × 3.5 × 70 / 200 × 30 |
| UT-06 | `calories_burned` | linearity: 30 min = 3 × 10 min | equal | |
| UT-07 | `strength_duration_min` | 3 × 10 reps, 3 s/rep, 60 s rest | 3.5 min | 90 s + 2 × 60 s |
| UT-08 | `strength_duration_min` | 1 set × 10 reps | 0.5 min | no rest after the last set |
| UT-09 | `strength_calories` | 3 × 10, MET 6, 80 kg | 29.4 | 8.4 kcal/min × 3.5 |
| UT-10 | `total_reps` | 10, 8, 6 | 24 | |
| UT-11 | `training_volume` | 10×60, 8×70, 6×80 | 1640 kg | 600 + 560 + 480 |
| UT-12 | `training_volume` | bodyweight sets (0 kg) | 0 | |
| UT-13 | `one_rep_max_epley` | 100 kg × 5 / × 10 / × 1 | 116.667 / 133.333 / 100 | w(1 + r/30) |
| UT-14 | `one_rep_max_brzycki` | 100 kg × 5 | 112.5 | 100 × 36 / 32 |
| UT-15 | Epley vs Brzycki | 80 kg × 10 | equal | the formulas intersect at r = 10 |
| UT-16 | `calorie_balance` | 2000 in, 2500 TDEE, 300 ex. | −800 | |
| UT-17 | `progress_percent` | 50/200, 250/200, 0/200 | 25, 100 (clamped), 0 | |
| UT-18 | Session totals | bench 3 sets + 30 min run @ 70 kg | 328.545 kcal; saved = live | regression for D-02 |

## 5.3 Boundary value analysis

Each range is tested at 7 points: **min−δ, min, min+δ, nominal, max−δ, max, max+δ** (δ = 1 for integers, 0.1 for decimals). The two outer points must be rejected and the five inner points accepted. The table is generated from `validation.ALL_RANGES`, so the tests and the documentation cannot drift apart.

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
| Goal | 1 – 100000 int | 0 | 1 | 2 | 50000 | 99999 | 100000 | 100001 |
| Reps for 1RM | 1 – 12 int | 0 | 1 | 2 | 6 | 11 | 12 | 13 |

**Additional boundary and robustness cases**

| Case | Expected |
|---|---|
| BMI 18.49 / 18.5 / 24.99 / 25.0 / 29.99 / 30.0 | Underweight / Normal / Normal / Overweight / Overweight / Obese |
| 20th set on one exercise / 21st set | accepted / rejected, list stays at 20 |
| Cardio: 599 + 1.0 min / 599 + 1.1 min / block of 0.5 min | 600 accepted / cumulative cap exceeded / below per-block minimum |
| Extreme valid calories: MET 23, 300 kg, 600 min | 72,450 kcal (no overflow) |
| Minimum valid calories: MET 1, 20 kg, 1 min | 0.35 kcal |
| Non-numbers: `None`, `"10"`, `True`, `False`, NaN, ±∞, `[5]` | rejected (`bool` is explicitly excluded because it subclasses `int`) |
| Text fields: `""`, `"   "`, `"abc"`, `"12kg"`, `"nan"`, `"inf"`, `"1e3"`, `"-5"` | "required", "number", "finite" or "between" message |
| Integer field given 10.5 / 10.0 | rejected / accepted as `int` 10 |
| SUS answers 0, 6, 3.5, `True`, or 9 answers | rejected |
| SUS grade at 80.3 / 80.2 / 68 / 67.9 | A / B–C / B–C / D |

## 5.4 Usability testing

### Plan

| Item | Detail |
|---|---|
| Goal | Can first-time users record a workout quickly and without errors? Is the calorie/rep feedback understandable? |
| Participants | 5 people who exercise at least once a week, none involved in development (5 users find ~85% of usability problems, per Nielsen & Landauer) |
| Device | Android phone, 5.5–6.5″, portrait. Sessions are screen-recorded with consent. |
| Method | Moderated think-aloud, one participant at a time, about 20 min each, then the SUS questionnaire |
| Moderator script | Read the task card aloud. Do not help unless the participant is stuck for > 2 min (count that as a failure). |

### Tasks and success criteria

| Task | Scenario given to participant | Success = | Target time |
|---|---|---|---|
| T1 | "Set up the app with your details." | Profile saved, metrics visible | ≤ 90 s |
| T2 | "Start a workout and log 3 sets of bench press: 10 × 60, 8 × 70, 6 × 80 kg." | 3 correct sets shown | ≤ 60 s |
| T3 | "Add 20 minutes of running." | Running entry shows 20 min | ≤ 20 s |
| T4 | "Take a break, then continue." | Pause → Resume used | ≤ 10 s |
| T5 | "You typed 0 reps by mistake. What happens? Fix it." | Reads the error, logs a valid set | ≤ 20 s |
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

I walked through all screens at phone size (400 × 800 px) and checked them against Nielsen's 10 heuristics. Screenshots are in [screenshots/](screenshots/).

| ID | Heuristic | Finding | Severity (0–4) | Status |
|---|---|---|---|---|
| U-01 | Visibility of system status | The validation error on Profile was off-screen below the Save button (defect **D-03**) | 3 | **Fixed** |
| U-02 | Consistency | The live calorie total did not match the saved total (329 vs 328; defect **D-02**) | 2 | **Fixed** |
| U-03 | Error prevention | Numeric keyboards/filters stop letters in number fields. Each label shows its valid range. Cancel asks for confirmation. | — | Implemented |
| U-04 | User control & freedom | A mis-logged set cannot be deleted or undone | 3 | **Open**, planned for v1.1 |
| U-05 | Recognition over recall | The exercise picker shows names with speed/intensity, e.g. "Running (8 km/h)" | — | OK |
| U-06 | Error prevention | **Finish** sits right next to **Pause** and saves immediately with no confirmation (Cancel does confirm). A mis-tap ends the workout early. | 2 | Open |
| U-07 | Flexibility & efficiency | Reps and weight stay filled in after logging, so repeated sets take one tap | — | OK |

> U-04 and U-06 are good hypotheses to confirm or reject with real participants in T2 and T5.

## 5.5 UI smoke test

A scripted run of the real Kivy app covered all of these, with no exceptions:

- launch → invalid profile (age 12) → valid profile;
- start workout → 3 bench sets → invalid 0-rep set → 30 min run → finish → history.

The run found defects D-02 and D-03 (see [04_PSP.md](04_PSP.md) §4.4).
