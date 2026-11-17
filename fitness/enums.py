"""Enumerations shared by the domain model and the calculators."""
from enum import Enum


class Sex(Enum):
    MALE = "male"
    FEMALE = "female"


class ActivityLevel(Enum):
    """Harris-Benedict activity multipliers used to turn BMR into TDEE."""

    SEDENTARY = "sedentary"
    LIGHT = "light"
    MODERATE = "moderate"
    ACTIVE = "active"
    VERY_ACTIVE = "very_active"

    @property
    def factor(self) -> float:
        return _ACTIVITY_FACTORS[self]

    @property
    def label(self) -> str:
        return _ACTIVITY_LABELS[self]


_ACTIVITY_FACTORS = {
    ActivityLevel.SEDENTARY: 1.2,
    ActivityLevel.LIGHT: 1.375,
    ActivityLevel.MODERATE: 1.55,
    ActivityLevel.ACTIVE: 1.725,
    ActivityLevel.VERY_ACTIVE: 1.9,
}

_ACTIVITY_LABELS = {
    ActivityLevel.SEDENTARY: "Sedentary (little or no exercise)",
    ActivityLevel.LIGHT: "Light (1-3 days/week)",
    ActivityLevel.MODERATE: "Moderate (3-5 days/week)",
    ActivityLevel.ACTIVE: "Active (6-7 days/week)",
    ActivityLevel.VERY_ACTIVE: "Very active (hard daily training)",
}


class ExerciseCategory(Enum):
    STRENGTH = "strength"  # logged as sets x reps x weight
    CARDIO = "cardio"      # logged as duration in minutes


class SessionState(Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

    @property
    def is_terminal(self) -> bool:
        return self in (SessionState.COMPLETED, SessionState.CANCELLED)
