# 4. Process — Personal Software Process (PSP)

## 4.1 Why PSP

FitTrack is built by a **single developer**, which is the setting PSP (Humphrey, SEI) was designed for. Team processes such as Scrum or TSP add ceremonies that one person does not need. PSP gives an individual a disciplined, measured way to plan, track quality, and improve estimates from project to project.

| PSP level | Practice | How it is applied in FitTrack |
|---|---|---|
| **PSP0** | Current process, **time log**, **defect log** | [psp/time_log.csv](psp/time_log.csv), [psp/defect_log.csv](psp/defect_log.csv) |
| **PSP0.1** | Coding standard, **size measurement**, process improvement proposal (PIP) | TypeScript strict mode + ESLint; SLOC counted by `tools/cocomo.py`; PIPs in §4.6 |
| **PSP1** | **Size estimation** (PROBE), test report | Size history in [03_COCOMO.md](03_COCOMO.md) §3.2; test report in [05_Testing.md](05_Testing.md) |
| **PSP1.1** | Task and schedule planning | §4.3 |
| **PSP2** | **Design and code review checklists** | §4.5, derived from the defects actually found |

## 4.2 Phases

`Planning → Design → Design Review → Code → Code Review → Compile → Test → Postmortem`

For TypeScript the phases map like this:
- **Compile** = `tsc --noEmit`.
- **Code Review** includes a manual checklist pass plus `eslint` (React Compiler hook rules).
- **Test** = Jest plus the scripted UI walkthrough.

## 4.3 Project plan summary

Planned time comes from **size ÷ personal productivity**. The v1 prototype gave the first size data point. The v2 plan should use your own measured LOC/hour from the v1 time log. Until that log is filled in, the PSP default of 25 LOC/hour is used:
2,666 LOC ÷ 25 ≈ **107 hours**, split with the standard PSP phase distribution.

| Phase | Plan % | Plan (h) | Actual (h) | Actual % |
|---|---|---|---|---|
| Planning | 5% | 5.3 | | |
| Design (UML) | 15% | 16.0 | | |
| Design review | 5% | 5.3 | | |
| Code | 30% | 32.0 | | |
| Code review | 10% | 10.7 | | |
| Compile (tsc) | 5% | 5.3 | | |
| Test (unit, boundary, usability) | 20% | 21.3 | | |
| Postmortem | 10% | 10.7 | | |
| **Total** | 100% | **106.6** | | |

| Size / quality | v1 Kivy (actual) | v2 React Native (actual) |
|---|---|---|
| Product SLOC | 936 | **2,666** |
| Test SLOC | 388 | 484 |
| Automated test cases | 60 | **221** |
| Domain statement coverage | 98% | **96%** (CI gate: ≥ 90%) |
| Defects logged | 3 (D-01–D-03) | 5 (D-04–D-08) |
| Productivity (LOC/h) | *936 ÷ actual hours* | *2,666 ÷ actual hours* |

> **Fill in the "Actual" time columns from your own time log.** Leave none of them as estimates. Honest PSP data is what makes the next plan more accurate.

## 4.4 Defect log (real defects found while building)

PSP defect type standard: 10 Documentation · 20 Syntax · 30 Build/Package · 40 Assignment · 50 Interface · 60 Checking · 70 Data · 80 Function · 90 System · 100 Environment.

| # | Ver. | Type | Injected | Removed | Description | Fix |
|---|---|---|---|---|---|---|
| D-01 | v1 | 60 Checking | Code (test) | Test | A stale assertion was left in a test after the test was rewritten | Removed the obsolete assertion |
| D-02 | v1 | 70 Data | Design | Test | **Double rounding.** The live total showed 329 kcal but the saved total showed 328 (328.545 → 328.5 → 328) | Store full precision, round only for display. Regression test kept in v2 (UT-19) |
| D-03 | v1 | 80 Function | Design | Test | The validation error was rendered off-screen below the Save button | Message moved to the top. In v2, pickers prevent invalid input |
| D-04 | v2 | 50 Interface | Code | Compile | Used APIs that React Native 0.88 / Expo Router 58 removed: a `ScrollView` ref typed as the component, a tab bar `navigation` prop (now `emitter` + `navigateToTab`), and `StyleSheet.absoluteFillObject` | Switched to `ScrollViewInstance`, the new tab-bar API and `absoluteFill`, after checking the installed type definitions |
| D-05 | v2 | 80 Function | Code | Code review (lint) | React Compiler rule violations: setState inside `useEffect`, reading `ref.current` during render, and non-simple hook dependency lists | Adjusted state during render. Used a `useState` initialiser. Removed the needless memoisation |
| D-06 | v2 | 80 Function | Design | Test (UI walkthrough) | Reps and weight steppers placed side by side were wider than a 390 px screen, so the workout screen scrolled sideways | Stacked the steppers vertically, full width |
| D-07 | v2 | 80 Function | Code | Test (UI walkthrough) | The Home header collapsed to zero height on web. A `SafeAreaView` with `flex: 0` inside a ScrollView becomes `flex-basis: 0` | Replaced it with a plain `View` plus a `paddingTop` from the safe-area insets |
| D-08 | v2 | 80 Function | Design | Test (UI walkthrough) | The selected filter chip was orange on the orange search header, so it was invisible | Dark-variant chips turn white with orange text when selected |

Fix times were not recorded for these defects, so the CSV leaves them blank rather than guessing.

**Yield (v2):** 2 of 5 defects (D-04 and D-05) were removed before Test, by the compiler and the linter. That is 40%. The other 3 were layout defects that only showed when the UI was rendered. That points to PIP-4 below.

## 4.5 Review checklists (PSP2)

Built from this project's defect types. An item is added whenever a defect escapes to Test.

**Design review checklist**
- [ ] Every user-entered number has a `Range` in `validation.ts`, and the UI control clamps to it.
- [ ] Every state-changing operation appears in the state diagram, and illegal events are rejected (not ignored).
- [ ] Derived values (calories, volume) are computed from stored raw data. Nothing is rounded before storage. *(D-02)*
- [ ] Every error or feedback message appears next to the control that caused it. *(D-03)*
- [ ] Every screen fits 360 dp width with no horizontal scrolling. Rows of controls are tested at the narrowest width. *(D-06)*
- [ ] Selected and unselected states have enough contrast on **every** background the component is used on. *(D-08)*
- [ ] Destructive or final actions (Finish, Cancel, Reset) ask for confirmation. Logging actions can be undone.

**Code review checklist**
- [ ] Inputs go through `check`/`parse`. Booleans, NaN and ±Infinity are rejected.
- [ ] Off-by-one: inclusive `min`/`max` and `>=` vs `>` match the documented range.
- [ ] A failed operation leaves no partial state, such as an empty `ExerciseEntry`.
- [ ] Before using a library API, check the **installed** version's types and docs. Don't rely on memory. *(D-04)*
- [ ] No setState in effects, no `ref.current` during render, and only simple hook dependencies. *(D-05)*
- [ ] No `flex: 0` on containers inside ScrollViews. Use explicit padding or insets instead. *(D-07)*
- [ ] Formatting (`fmt.*`) happens only in the UI layer.

## 4.6 Process improvement proposals (PIP)

| PIP | Problem | Proposal | Status |
|---|---|---|---|
| 1 | v1: two of three defects were found only by running the real UI | Scripted UI checks with screenshots before every postmortem | **Adopted in v2.** The puppeteer walkthrough found D-06 to D-08 |
| 2 | No historical productivity data | Record time for every session in `time_log.csv`, and use actual LOC/h for the next estimate | Open |
| 3 | v1 UI was 7% larger than planned | Estimate UI as its own proxy category | Confirmed by v2: the UI is 76% of the code |
| 4 | v2: 60% of defects were layout defects found late | Run the walkthrough at 360 dp **and** 430 dp widths during Code, not only in Test | New |

## 4.7 How to keep the logs

- **Time log:** one row per work session. Δ = stop − start − interruptions.
- **Defect log:** one row per defect, recorded *when it is fixed*, with the phase where it was injected and the phase where it was removed.
- **Postmortem:** fill in the plan-vs-actual columns in §4.3, compute yield, and update the checklists.
