"""Input limits and validators.

Every numeric input the user can type has a documented valid range here. These
ranges are the single source of truth for boundary-value testing
(tests/test_boundaries.py) and for the inline error messages in the UI.
"""
import math
from dataclasses import dataclass
from typing import Union

Number = Union[int, float]


class ValidationError(ValueError):
    """Raised when a user-supplied value is missing, malformed or out of range."""


@dataclass(frozen=True)
class Range:
    name: str
    min: Number
    max: Number
    integer: bool = False
    unit: str = ""

    def describe(self) -> str:
        unit = f" {self.unit}" if self.unit else ""
        return f"{self.name} must be between {_fmt(self.min)} and {_fmt(self.max)}{unit}"


def _fmt(x: Number) -> str:
    return str(int(x)) if float(x).is_integer() else str(x)


# --- Valid input ranges (inclusive) -------------------------------------------
AGE = Range("Age", 13, 100, integer=True, unit="years")
BODY_WEIGHT = Range("Body weight", 20.0, 300.0, unit="kg")
HEIGHT = Range("Height", 100.0, 250.0, unit="cm")
REPS = Range("Reps", 1, 100, integer=True)
SETS = Range("Sets per exercise", 1, 20, integer=True)
LIFT_WEIGHT = Range("Weight lifted", 0.0, 500.0, unit="kg")  # 0 = bodyweight
DURATION = Range("Duration", 1.0, 600.0, unit="min")
MET = Range("MET value", 1.0, 23.0)
CALORIE_INTAKE = Range("Calorie intake", 0, 10000, integer=True, unit="kcal")
GOAL = Range("Goal", 1, 100000, integer=True)
REPS_FOR_1RM = Range("Reps for 1RM estimate", 1, 12, integer=True)

ALL_RANGES = (AGE, BODY_WEIGHT, HEIGHT, REPS, SETS, LIFT_WEIGHT, DURATION,
              MET, CALORIE_INTAKE, GOAL, REPS_FOR_1RM)


def check(value: object, rng: Range) -> Number:
    """Validate a numeric value against ``rng`` and return it normalised.

    Integer ranges accept whole-valued floats (e.g. 12.0) and return ``int``.
    """
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValidationError(f"{rng.name} must be a number")
    if not math.isfinite(value):
        raise ValidationError(f"{rng.name} must be a finite number")
    if rng.integer and not float(value).is_integer():
        raise ValidationError(f"{rng.name} must be a whole number")
    if value < rng.min or value > rng.max:
        raise ValidationError(rng.describe())
    return int(value) if rng.integer else float(value)


def parse(text: object, rng: Range) -> Number:
    """Parse raw text from a form field, then validate it with :func:`check`."""
    if text is None or not str(text).strip():
        raise ValidationError(f"{rng.name} is required")
    try:
        value = float(str(text).strip())
    except ValueError:
        raise ValidationError(f"{rng.name} must be a number") from None
    return check(value, rng)
