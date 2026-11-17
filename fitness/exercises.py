"""Built-in exercise catalogue.

MET values are taken from the Compendium of Physical Activities (Ainsworth et
al.). Users cannot edit them in v1.0.
"""
from typing import Dict, List

from .enums import ExerciseCategory as C
from .models import Exercise

CATALOG: List[Exercise] = [
    Exercise("bench_press", "Bench Press", C.STRENGTH, 6.0),
    Exercise("squat", "Barbell Squat", C.STRENGTH, 6.0),
    Exercise("deadlift", "Deadlift", C.STRENGTH, 6.0),
    Exercise("bicep_curl", "Bicep Curl", C.STRENGTH, 3.5),
    Exercise("push_up", "Push-up", C.STRENGTH, 3.8),
    Exercise("sit_up", "Sit-up", C.STRENGTH, 3.8),
    Exercise("pull_up", "Pull-up", C.STRENGTH, 8.0),
    Exercise("run_8kmh", "Running (8 km/h)", C.CARDIO, 8.3),
    Exercise("walk_brisk", "Brisk Walking (5.6 km/h)", C.CARDIO, 4.3),
    Exercise("cycle_moderate", "Cycling (16-19 km/h)", C.CARDIO, 6.8),
    Exercise("jump_rope", "Jump Rope", C.CARDIO, 11.8),
    Exercise("swim_freestyle", "Swimming (freestyle, moderate)", C.CARDIO, 5.8),
    Exercise("yoga", "Yoga (Hatha)", C.CARDIO, 2.5),
]

BY_ID: Dict[str, Exercise] = {e.id: e for e in CATALOG}
BY_NAME: Dict[str, Exercise] = {e.name: e for e in CATALOG}
