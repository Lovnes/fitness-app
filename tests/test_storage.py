"""Persistence tests — profile and history survive a restart."""
import os
import tempfile
import unittest

from fitness.enums import ActivityLevel, Sex
from fitness.models import UserProfile, WorkoutSummary
from fitness.storage import JsonRepository, StorageError


def summary(i, date):
    return WorkoutSummary(id=str(i), date_iso=date, active_minutes=30.0, total_reps=50,
                          total_volume_kg=1000.0, calories_kcal=250.0, exercises=["Squat"])


class TestJsonRepository(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.dir.name, "data.json")
        self.repo = JsonRepository(self.path)

    def tearDown(self):
        self.dir.cleanup()

    def test_empty_on_first_launch(self):
        self.assertIsNone(self.repo.load_profile())
        self.assertEqual(self.repo.list_workouts(), [])

    def test_profile_roundtrip(self):
        p = UserProfile("Sam", 30, Sex.FEMALE, 60, 165, ActivityLevel.ACTIVE, 1800)
        self.repo.save_profile(p)
        loaded = JsonRepository(self.path).load_profile()
        self.assertEqual(loaded, p)
        self.assertAlmostEqual(loaded.tdee(), p.tdee())

    def test_history_newest_first(self):
        self.repo.add_workout(summary(1, "2026-11-01T08:00:00"))
        self.repo.add_workout(summary(2, "2026-11-03T08:00:00"))
        self.repo.add_workout(summary(3, "2026-11-02T08:00:00"))
        self.assertEqual([s.id for s in self.repo.list_workouts()], ["2", "3", "1"])

    def test_corrupted_file(self):
        with open(self.path, "w") as fh:
            fh.write("{not json")
        with self.assertRaises(StorageError):
            self.repo.list_workouts()


if __name__ == "__main__":
    unittest.main()
