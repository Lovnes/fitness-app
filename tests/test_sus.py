"""Tests for the SUS scorer used to analyse usability-test questionnaires."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))
from sus_score import grade, sus_score  # noqa: E402


class TestSus(unittest.TestCase):
    def test_best_and_worst(self):
        self.assertEqual(sus_score([5, 1] * 5), 100.0)
        self.assertEqual(sus_score([1, 5] * 5), 0.0)

    def test_neutral(self):
        self.assertEqual(sus_score([3] * 10), 50.0)

    def test_known_example(self):
        # odd: (4-1)*5 = 15 ; even: (5-2)*5 = 15 ; 30 * 2.5 = 75
        self.assertEqual(sus_score([4, 2] * 5), 75.0)

    def test_boundaries(self):
        with self.assertRaises(ValueError):
            sus_score([3] * 9)
        for bad in (0, 6, 3.5, True):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                sus_score([bad] + [3] * 9)

    def test_grade_cutoffs(self):
        self.assertEqual(grade(80.3), "A")
        self.assertEqual(grade(80.2), "B/C")
        self.assertEqual(grade(68), "B/C")
        self.assertEqual(grade(67.9), "D")
        self.assertEqual(grade(50.9), "F")


if __name__ == "__main__":
    unittest.main()
