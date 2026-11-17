# 3. Cost Estimation — Basic COCOMO

## 3.1 Model

Basic COCOMO (Boehm, 1981) estimates effort from size alone:

| | Formula | Organic constants |
|---|---|---|
| Effort | E = a · (KLOC)^b person-months | a = 2.4, b = 1.05 |
| Development time | D = c · (E)^d months | c = 2.5, d = 0.38 |
| Average staff | P = E / D persons | |
| Productivity | KLOC·1000 / E LOC per person-month | |

**Mode chosen: Organic.** FitTrack is small (< 50 KLOC). It is built by one developer who knows the domain, the requirements are stable and well understood, and there are no tight hardware or real-time constraints. Semi-detached and embedded results are shown only for comparison.

## 3.2 Size history

The product was built twice. Version 1 was a Python/Kivy prototype. It was then rewritten as the React Native app, the current product. Both versions were measured with the same rule: non-blank, non-comment lines, test code excluded.

| Version | Planned | Actual | Notes |
|---|---|---|---|
| v1 Python + Kivy (prototype) | 1,000 LOC | 936 LOC | Estimate error −6.4% |
| **v2 React Native + Expo (current)** | — | **2,666 LOC** | Same domain logic plus a far richer UI |

Breakdown of the current version (`python3 tools/cocomo.py`):

| Area | Files | SLOC |
|---|---|---|
| Screens (`src/app/`): onboarding × 9, tabs × 5, picker, root | 17 | 1,151 |
| Components (`src/components/`): ui, pickers, visuals, chrome, StepLayout | 5 | 693 |
| Domain logic (`src/domain/`) | 8 | 639 |
| State store + theme | 2 | 183 |
| **Product total** | 32 | **2,666** |
| *Test code (not estimated)* | 4 | *484* |

The domain logic grew modestly, from 453 to 639 lines. The additions were fitness goals, the recommended calorie target, undo, search and dashboard stats. The UI grew about 4×, from 483 to 2,027 lines. The custom wheel, ruler and gauge pickers, the SVG charts, and the declarative styling all take much more code than Kivy's stock widgets.

## 3.3 Estimate for the current product (2.666 KLOC)

- E = 2.4 × 2.666^1.05 = **6.72 person-months**
- D = 2.5 × 6.72^0.38 = **5.16 months**
- P = 6.72 / 5.16 = **1.30 persons**
- Productivity = 2666 / 6.72 = **397 LOC/PM**
- Cost at an assumed 4,000 per person-month = **26,880** *(replace with your own rate)*

| Mode | Effort (PM) | Duration (months) | Staff | LOC/PM |
|---|---|---|---|---|
| **Organic** | **6.72** | **5.16** | **1.30** | **397** |
| Semi-detached | 9.00 | 5.39 | 1.67 | 296 |
| Embedded | 11.68 | 5.49 | 2.13 | 228 |

For comparison, the v1 prototype (0.936 KLOC) estimated at 2.24 PM, 3.40 months and 0.66 staff. The rewrite tripled the size and the effort. It is still a one-to-two person project.

## 3.4 Scenario: full product (v3)

v3 would add cloud sync with accounts, nutrition logging, wearable import (Health Connect / HealthKit), reminders, custom exercises and social sharing. At an estimated **8 KLOC** (organic):

| Mode | Effort (PM) | Duration (months) | Staff | Cost @ 4,000/PM |
|---|---|---|---|---|
| Organic | 21.3 | 8.0 | 2.7 | ≈ 85,000 |
| Semi-detached | 30.8 | 8.3 | 3.7 | ≈ 123,000 |

At that size the project needs a small team, and Team Software Process (TSP) becomes more appropriate than PSP.

## 3.5 Interpreting the numbers (limitations)

- **COCOMO vs. PSP hours.** 6.72 PM is about 1,020 hours at 152 h/PM. That figure covers the whole life cycle (requirements, design, documentation, management, integration), and the model was calibrated on 1970s projects. The PSP plan in [04_PSP.md](04_PSP.md) counts personal hours instead. Expect the two to differ.
- **Basic COCOMO ignores cost drivers.** Expo, TypeScript, hot reload and generated native projects make developers much faster than 1981 tooling did. Intermediate COCOMO would apply an effort adjustment factor (EAF), for example modern tools 0.91 × high capability 0.86 ≈ 0.78.
- **LOC depends on the language and the UI style.** This project shows it directly: the same feature set came to 936 lines in Python/Kivy and 2,666 lines in TypeScript/React Native. Estimate with language-specific data, not a single LOC/hour rate.

Reproduce:

```bash
python3 tools/cocomo.py                        # measure mobile/src and estimate
python3 tools/cocomo.py --kloc 8 --cost 4000   # v3 scenario
```
