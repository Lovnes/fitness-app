"""BOUNDARY VALUE TESTS.

For every input range we test the classic 7 BVA points:
    min-δ, min, min+δ, nominal, max-δ, max, max+δ
where δ = 1 for integer fields and 0.1 for decimal fields. min-δ and max+δ
must be rejected; the other five must be accepted. The generated tables are
documented in docs/05_Testing.md.
"""
import math
import unittest

from fitness import calculations as calc
from fitness import validation as v
from fitness.enums import ExerciseCategory, Sex
from fitness.models import Exercise, ExerciseEntry, UserProfile, WorkoutSet
from fitness.validation import ValidationError


def bva_points(rng):
    d = 1 if rng.integer else 0.1
    nominal = (rng.min + rng.max) / 2
    if rng.integer:
        nominal = int(nominal)
    valid = [rng.min, round(rng.min + d, 1), nominal, round(rng.max - d, 1), rng.max]
    invalid = [round(rng.min - d, 1), round(rng.max + d, 1)]
    return valid, invalid


class TestRangeBoundaries(unittest.TestCase):
    def test_every_range(self):
        for rng in v.ALL_RANGES:
            valid, invalid = bva_points(rng)
            for value in valid:
                with self.subTest(range=rng.name, value=value, expect="accept"):
                    self.assertEqual(v.check(value, rng), value)
            for value in invalid:
                with self.subTest(range=rng.name, value=value, expect="reject"):
                    with self.assertRaises(ValidationError):
                        v.check(value, rng)

    def test_invalid_types_and_specials(self):
        for bad in (None, "10", True, False, math.nan, math.inf, -math.inf, [5]):
            with self.subTest(value=bad):
                with self.assertRaises(ValidationError):
                    v.check(bad, v.REPS)

    def test_integer_fields_reject_fractions(self):
        with self.assertRaises(ValidationError):
            v.check(10.5, v.REPS)
        self.assertEqual(v.check(10.0, v.REPS), 10)
        self.assertIsInstance(v.check(10.0, v.REPS), int)


class TestParseFromTextField(unittest.TestCase):
    def test_parse(self):
        self.assertEqual(v.parse(" 70 ", v.BODY_WEIGHT), 70.0)
        self.assertEqual(v.parse("12", v.REPS), 12)

    def test_parse_rejects(self):
        cases = {"": "required", "   ": "required", None: "required",
                 "abc": "number", "12kg": "number", "nan": "finite",
                 "inf": "finite", "1e3": "between", "-5": "between"}
        for text, fragment in cases.items():
            with self.subTest(text=text):
                with self.assertRaises(ValidationError) as ctx:
                    v.parse(text, v.BODY_WEIGHT)
                self.assertIn(fragment, str(ctx.exception))


class TestEntityBoundaries(unittest.TestCase):
    def test_workout_set_reps(self):
        for reps in (1, 2, 99, 100):
            WorkoutSet(reps, 0)
        for reps in (0, 101, -1):
            with self.subTest(reps=reps), self.assertRaises(ValidationError):
                WorkoutSet(reps, 0)

    def test_workout_set_weight(self):
        for w in (0.0, 0.1, 499.9, 500.0):
            WorkoutSet(5, w)
        for w in (-0.1, 500.1):
            with self.subTest(w=w), self.assertRaises(ValidationError):
                WorkoutSet(5, w)

    def test_max_sets_per_exercise(self):
        entry = ExerciseEntry(Exercise("x", "X", ExerciseCategory.STRENGTH, 5.0))
        for _ in range(v.SETS.max):          # 20 sets OK
            entry.add_set(WorkoutSet(5, 20))
        with self.assertRaises(ValidationError):  # 21st rejected
            entry.add_set(WorkoutSet(5, 20))
        self.assertEqual(len(entry.sets), 20)

    def test_cardio_cumulative_duration_cap(self):
        entry = ExerciseEntry(Exercise("r", "Run", ExerciseCategory.CARDIO, 8.0))
        entry.add_minutes(599.0)
        with self.assertRaises(ValidationError):
            entry.add_minutes(0.5)                 # below 1-min minimum per block
        with self.assertRaises(ValidationError):
            entry.add_minutes(1.1)                 # 600.1 > 600 cumulative cap
        entry.add_minutes(1.0)                     # exactly 600 is allowed
        self.assertAlmostEqual(entry.cardio_minutes, 600.0)

    def test_profile_age(self):
        base = dict(name="A", sex=Sex.MALE, weight_kg=70, height_cm=175)
        for age in (13, 14, 99, 100):
            UserProfile(age=age, **base)
        for age in (12, 101):
            with self.subTest(age=age), self.assertRaises(ValidationError):
                UserProfile(age=age, **base)


class TestCalculationBoundaries(unittest.TestCase):
    def test_bmi_category_edges(self):
        table = [(18.49, "Underweight"), (18.5, "Normal"), (24.99, "Normal"),
                 (25.0, "Overweight"), (29.99, "Overweight"), (30.0, "Obese")]
        for value, category in table:
            with self.subTest(bmi=value):
                self.assertEqual(calc.bmi_category(value), category)

    def test_one_rep_max_rep_limit(self):
        calc.one_rep_max_epley(100, 12)
        calc.one_rep_max_brzycki(100, 12)
        for reps in (0, 13):
            with self.subTest(reps=reps):
                with self.assertRaises(ValidationError):
                    calc.one_rep_max_epley(100, reps)
                with self.assertRaises(ValidationError):
                    calc.one_rep_max_brzycki(100, reps)

    def test_extreme_but_valid_calories(self):
        # Highest valid inputs: 23 MET, 300 kg, 600 min -> 72,450 kcal (no overflow)
        self.assertAlmostEqual(calc.calories_burned(23, 300, 600), 72450.0)
        # Lowest valid inputs: 1 MET, 20 kg, 1 min -> 0.35 kcal
        self.assertAlmostEqual(calc.calories_burned(1, 20, 1), 0.35)

    def test_duration_below_minimum(self):
        with self.assertRaises(ValidationError):
            calc.calories_burned(8, 70, 0.9)
        with self.assertRaises(ValidationError):
            calc.calories_burned(8, 70, 0)

    def test_progress_goal_boundary(self):
        self.assertEqual(calc.progress_percent(1, 1), 100.0)
        with self.assertRaises(ValidationError):
            calc.progress_percent(1, 0)


if __name__ == "__main__":
    unittest.main()
