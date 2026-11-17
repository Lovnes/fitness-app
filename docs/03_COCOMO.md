# 3. Cost Estimation — Basic COCOMO

## 3.1 Model

Basic COCOMO (Boehm, 1981) estimates effort from size alone:

| | Formula | Organic constants |
|---|---|---|
| Effort | E = a · (KLOC)^b person-months | a = 2.4, b = 1.05 |
| Development time | D = c · (E)^d months | c = 2.5, d = 0.38 |
| Average staff | P = E / D persons | |
| Productivity | KLOC·1000 / E LOC per person-month | |

**Mode chosen: Organic.** FitTrack is small (< 50 KLOC), built by one developer who knows the domain, has stable and well-understood requirements, and has no tight hardware or real-time constraints. Semi-detached and embedded results are shown only for comparison.

## 3.2 Planning estimate (before coding)

Size was estimated per component (PSP PROBE-style proxy, by analogy with similar small apps):

| Component | Planned LOC |
|---|---|
| Mobile UI (3 screens + navigation, KV layout) | 450 |
| Workout session + state machine | 130 |
| Domain models (profile, exercise, set, entry, summary) | 110 |
| Calculations (calories, reps, 1RM, BMI/BMR/TDEE) | 90 |
| Validation (ranges, parsing) | 60 |
| Persistence (JSON repository) | 60 |
| Enums + exercise catalogue | 70 |
| Package glue | 30 |
| **Total** | **1,000 LOC = 1.0 KLOC** |

**Basic COCOMO, organic, 1.0 KLOC**

- E = 2.4 × 1.0^1.05 = **2.40 person-months**
- D = 2.5 × 2.40^0.38 = **3.49 months**
- P = 2.40 / 3.49 = **0.69 persons**, so one part-time developer is enough
- Productivity = 1000 / 2.40 = **417 LOC/PM**
- Cost at an assumed ₹/$ 4,000 per person-month = **9,600** *(replace with your own rate)*

## 3.3 Actual size and re-estimate (after coding)

Measured with `python3 tools/cocomo.py`. Counts are non-blank, non-comment, non-docstring lines. Test code is excluded.

| File | SLOC |
|---|---|
| main.py (UI + KV layout) | 483 |
| fitness/session.py | 116 |
| fitness/models.py | 103 |
| fitness/calculations.py | 79 |
| fitness/validation.py | 48 |
| fitness/storage.py | 44 |
| fitness/enums.py | 42 |
| fitness/exercises.py | 20 |
| fitness/\_\_init\_\_.py | 1 |
| **Product total** | **936** |
| *Test code (not estimated)* | *388* |

| Mode | Effort (PM) | Duration (months) | Staff | LOC/PM |
|---|---|---|---|---|
| **Organic** | **2.24** | **3.40** | **0.66** | **418** |
| Semi-detached | 2.79 | 3.58 | 0.78 | 336 |
| Embedded | 3.33 | 3.67 | 0.91 | 281 |

**Size estimation error:** (936 − 1000) / 1000 = **−6.4%**. Logic modules came in under plan. The UI came in slightly over (483 vs 450) because the declarative KV layout is verbose. This feeds back into the PSP size database for the next project (see [04_PSP.md](04_PSP.md)).

## 3.4 Scenario: full product (v2)

v2 adds cloud sync, nutrition logging, progress charts, reminders, wearable import and custom exercises. At an estimated **6 KLOC** (organic):

| Mode | Effort (PM) | Duration (months) | Staff | Cost @ 4,000/PM |
|---|---|---|---|---|
| Organic | 15.75 | 7.13 | 2.21 | 62,998 |
| Semi-detached | 22.32 | 7.41 | 3.01 | 89,271 |

This is the point where the project stops being a one-person effort: about 2 developers for 7 months.

## 3.5 Interpreting the numbers (limitations)

- **COCOMO vs. PSP hours.** 2.24 PM ≈ 340 hours (at 152 h/PM). That covers the *whole* life cycle (requirements, design, documentation, management, integration), and the model was calibrated on 1970s projects. The PSP plan in [04_PSP.md](04_PSP.md) budgets coding-centric hours from personal productivity data and comes out much lower. The gap is expected. It is a known limitation of applying Basic COCOMO below ~2 KLOC.
- **Basic COCOMO ignores cost drivers** (developer experience, tools, reliability needs). Intermediate COCOMO would apply an EAF. For example, high programmer capability (0.86) × use of modern tools (0.91) would reduce effort about 22%.
- **LOC depends on the language.** Python/Kivy needs far fewer lines than an equivalent Java/Kotlin app, so size estimates must be language-specific.

Reproduce every number here with:

```bash
python3 tools/cocomo.py                       # measure actual size
python3 tools/cocomo.py --kloc 1.0 --cost 4000
python3 tools/cocomo.py --kloc 6   --cost 4000
```
