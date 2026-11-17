# 4. Process — Personal Software Process (PSP)

## 4.1 Why PSP

FitTrack is built by a **single developer**, which is the setting PSP (Humphrey, SEI) was designed for. Team processes such as Scrum or TSP add ceremonies that one person does not need. PSP gives an individual a disciplined, measured way to plan, track quality, and improve estimates from project to project.

| PSP level | Practice | How it is applied in FitTrack |
|---|---|---|
| **PSP0** | Current process, **time log**, **defect log** | [psp/time_log.csv](psp/time_log.csv), [psp/defect_log.csv](psp/defect_log.csv) |
| **PSP0.1** | Coding standard, **size measurement**, process improvement proposal (PIP) | PEP 8; SLOC counted by `tools/cocomo.py`; PIPs in §4.6 |
| **PSP1** | **Size estimation** (PROBE), test report | Component estimate in [03_COCOMO.md](03_COCOMO.md) §3.2; test report in [05_Testing.md](05_Testing.md) |
| **PSP1.1** | Task and schedule planning | §4.3 |
| **PSP2** | **Design and code review checklists** | §4.5, derived from the defects actually found |

## 4.2 Phases

`Planning → Design → Design Review → Code → Code Review → Compile/Build → Test → Postmortem`

Python has no separate compile step, so *Compile* covers interpreter syntax errors, the Kivy KV-language load, and packaging (`buildozer`).

## 4.3 Project plan summary

Planned time comes from **size ÷ personal productivity**. With no historical data yet, the plan uses 25 LOC/hour, a typical first-time PSP student rate:
1,000 planned LOC ÷ 25 = **40 hours**. These hours are split with the standard PSP phase distribution.

| Phase | Plan % | Plan (h) | Actual (h) | Actual % |
|---|---|---|---|---|
| Planning | 5% | 2.0 | | |
| Design (UML) | 15% | 6.0 | | |
| Design review | 5% | 2.0 | | |
| Code | 30% | 12.0 | | |
| Code review | 10% | 4.0 | | |
| Compile / build | 5% | 2.0 | | |
| Test (unit, boundary, usability) | 20% | 8.0 | | |
| Postmortem | 10% | 4.0 | | |
| **Total** | 100% | **40.0** | | |

| Size / quality | Plan | Actual |
|---|---|---|
| Product SLOC | 1,000 | **936** (measured) |
| Test SLOC | — | 388 |
| Unit + boundary + state tests | — | 60 test methods, all passing |
| Domain statement coverage | ≥ 90% | **98%** |
| Defects found in test | — | 3 (see §4.4) |
| Productivity (LOC/h) | 25 | *936 ÷ actual hours* |
| Size estimation error | — | −6.4% |

> **Fill in the "Actual" time columns from your own time log.** Leave none of them as estimates. Honest PSP data is what makes the next plan more accurate.

## 4.4 Defect log (real defects found while building v1.0)

PSP defect type standard: 10 Documentation · 20 Syntax · 30 Build/Package · 40 Assignment · 50 Interface · 60 Checking · 70 Data · 80 Function · 90 System · 100 Environment.

| # | Type | Injected | Removed | Description | Fix |
|---|---|---|---|---|---|
| D-01 | 60 Checking | Code (test) | Test | A stale assertion was left in `test_cardio_cumulative_duration_cap` after the test was rewritten. The test checked 599.9 min, but the logic correctly produced 600.0. | Removed the obsolete assertion. |
| D-02 | 70 Data | Design | Test (UI smoke test) | **Double rounding.** The live total showed 329 kcal, but the saved summary showed 328. `WorkoutSummary` rounded 328.545 → 328.5, then the UI's `:.0f` (round-half-even) gave 328. | Store full precision. Round only at display. Regression test `test_summary_matches_live_totals`. |
| D-03 | 80 Function (usability) | Design | Test (UI smoke test) | The profile validation error was rendered below the Save button. On a phone-sized screen it was off-screen, so tapping Save appeared to do nothing. | Error moved under the title, and the form scrolls to the top on save. |

Fix times were not recorded for these, so the CSV leaves them blank rather than guessing.

## 4.5 Review checklists (PSP2)

Built from this project's defect types. An item is added whenever a defect escapes to Test.

**Design review checklist**
- [ ] Every user-entered number has a `Range` in `validation.py`, with units stated in the UI label.
- [ ] Every state-changing operation appears in the state diagram, and illegal events are rejected (not ignored).
- [ ] Derived values (calories, volume) are computed from stored raw data. Nothing is rounded before storage. *(from D-02)*
- [ ] Every error message is visible without scrolling on a 360 × 640 dp screen. *(from D-03)*
- [ ] Persistence writes are atomic.

**Code review checklist**
- [ ] Inputs go through `v.check`/`v.parse`. `bool`, NaN and ±inf are rejected.
- [ ] Integer fields reject fractional values. Float comparisons in tests use `assertAlmostEqual`.
- [ ] Off-by-one: inclusive `min`/`max` and `>=` vs `>` match the documented range.
- [ ] A failed operation leaves no partial state, such as an empty `ExerciseEntry`.
- [ ] After editing a test, re-read the whole test body for stale assertions. *(from D-01)*
- [ ] Formatting (`:.0f`, `round`) happens only in the UI layer.

## 4.6 Process improvement proposals (PIP)

| PIP | Problem | Proposal |
|---|---|---|
| 1 | Two of three defects were found only by running the real UI | Run `smoke_ui`-style scripted UI checks before every postmortem, and add screenshot review to the Test phase |
| 2 | No historical productivity data, so 25 LOC/h is a guess | Record time for every session in `time_log.csv`, then use actual LOC/h for the next PROBE estimate |
| 3 | The UI was 7% larger than planned | Estimate declarative KV layout as its own proxy category, separate from Python logic |

## 4.7 How to keep the logs

- **Time log:** one row per work session. Δ = stop − start − interruptions.
- **Defect log:** one row per defect, recorded *when it is fixed*, with the phase where it was injected and the phase where it was removed.
- **Postmortem:** fill in the plan-vs-actual columns in §4.3, compute yield (% of defects removed before Test), and update the checklists.
