"""UNIT TESTS — calorie and rep calculations against hand-computed expected values.

Each expected value is worked out in the comment beside it so a reviewer can
verify the oracle independently of the code.
"""
import unittest

from fitness import calculations as calc
from fitness.enums import ActivityLevel, Sex
from fitness.models import WorkoutSet
from fitness.validation import ValidationError


def sets(*pairs):
    return [WorkoutSet(r, w) for r, w in pairs]


class TestBodyMetrics(unittest.TestCase):
    def test_bmi(self):
        # 70 / 1.75^2 = 70 / 3.0625 = 22.857
        self.assertAlmostEqual(calc.bmi(70, 175), 22.857, places=3)

    def test_bmr_male(self):
        # 10*70 + 6.25*175 - 5*25 + 5 = 700 + 1093.75 - 125 + 5
        self.assertAlmostEqual(calc.bmr(70, 175, 25, Sex.MALE), 1673.75)

    def test_bmr_female(self):
        # 10*60 + 6.25*165 - 5*30 - 161 = 600 + 1031.25 - 150 - 161
        self.assertAlmostEqual(calc.bmr(60, 165, 30, Sex.FEMALE), 1320.25)

    def test_male_female_differ_by_166(self):
        diff = calc.bmr(70, 175, 25, Sex.MALE) - calc.bmr(70, 175, 25, Sex.FEMALE)
        self.assertAlmostEqual(diff, 166.0)

    def test_tdee_every_activity_level(self):
        expected = {ActivityLevel.SEDENTARY: 1.2, ActivityLevel.LIGHT: 1.375,
                    ActivityLevel.MODERATE: 1.55, ActivityLevel.ACTIVE: 1.725,
                    ActivityLevel.VERY_ACTIVE: 1.9}
        for level, factor in expected.items():
            with self.subTest(level=level):
                self.assertAlmostEqual(calc.tdee(1673.75, level), 1673.75 * factor)

    def test_tdee_rejects_bad_input(self):
        with self.assertRaises(ValidationError):
            calc.tdee(1500, "moderate")
        with self.assertRaises(ValidationError):
            calc.tdee(0, ActivityLevel.MODERATE)

    def test_bmr_rejects_bad_sex(self):
        with self.assertRaises(ValidationError):
            calc.bmr(70, 175, 25, "M")


class TestCalories(unittest.TestCase):
    def test_met_formula(self):
        # 8.3 * 3.5 * 70 / 200 * 30 = 305.025
        self.assertAlmostEqual(calc.calories_burned(8.3, 70, 30), 305.025)

    def test_calories_scale_linearly_with_duration(self):
        one = calc.calories_burned(6.0, 80, 10)
        self.assertAlmostEqual(calc.calories_burned(6.0, 80, 30), 3 * one)

    def test_strength_duration(self):
        # 3 sets x 10 reps x 3 s = 90 s work + 2 rests x 60 s = 210 s = 3.5 min
        self.assertAlmostEqual(calc.strength_duration_min(sets((10, 60), (10, 60), (10, 60))), 3.5)

    def test_strength_duration_single_set_has_no_rest(self):
        self.assertAlmostEqual(calc.strength_duration_min(sets((10, 60))), 0.5)

    def test_strength_calories(self):
        # 6.0 * 3.5 * 80 / 200 = 8.4 kcal/min * 3.5 min = 29.4
        self.assertAlmostEqual(
            calc.strength_calories(sets((10, 60), (10, 60), (10, 60)), 6.0, 80), 29.4)

    def test_strength_calories_empty(self):
        self.assertEqual(calc.strength_calories([], 6.0, 80), 0.0)

    def test_strength_custom_tempo(self):
        # 1 set x 20 reps x 1.5 s = 30 s = 0.5 min
        self.assertAlmostEqual(calc.strength_duration_min(sets((20, 0)), seconds_per_rep=1.5), 0.5)
        with self.assertRaises(ValidationError):
            calc.strength_duration_min(sets((10, 0)), seconds_per_rep=0)

    def test_calorie_balance(self):
        self.assertAlmostEqual(calc.calorie_balance(2000, 2500, 300), -800)
        self.assertAlmostEqual(calc.calorie_balance(3000, 2500, 0), 500)
        with self.assertRaises(ValidationError):
            calc.calorie_balance(2000, -1, 0)


class TestReps(unittest.TestCase):
    def test_total_reps(self):
        self.assertEqual(calc.total_reps(sets((10, 60), (8, 70), (6, 80))), 24)

    def test_total_reps_empty(self):
        self.assertEqual(calc.total_reps([]), 0)

    def test_volume(self):
        # 10*60 + 8*70 + 6*80 = 600 + 560 + 480 = 1640
        self.assertAlmostEqual(calc.training_volume(sets((10, 60), (8, 70), (6, 80))), 1640)

    def test_bodyweight_volume_is_zero(self):
        self.assertEqual(calc.training_volume(sets((20, 0), (15, 0))), 0)

    def test_epley(self):
        self.assertAlmostEqual(calc.one_rep_max_epley(100, 5), 116.667, places=3)
        self.assertAlmostEqual(calc.one_rep_max_epley(100, 10), 133.333, places=3)

    def test_epley_single_rep_returns_weight(self):
        self.assertEqual(calc.one_rep_max_epley(140, 1), 140)

    def test_brzycki(self):
        # 100 * 36 / (37 - 5) = 112.5
        self.assertAlmostEqual(calc.one_rep_max_brzycki(100, 5), 112.5)
        self.assertAlmostEqual(calc.one_rep_max_brzycki(100, 1), 100)

    def test_formulas_agree_at_ten_reps(self):
        self.assertAlmostEqual(calc.one_rep_max_epley(80, 10), calc.one_rep_max_brzycki(80, 10))

    def test_progress(self):
        self.assertAlmostEqual(calc.progress_percent(50, 200), 25.0)
        self.assertEqual(calc.progress_percent(250, 200), 100.0)  # clamped
        self.assertEqual(calc.progress_percent(0, 200), 0.0)
        with self.assertRaises(ValidationError):
            calc.progress_percent(-1, 200)


if __name__ == "__main__":
    unittest.main()
