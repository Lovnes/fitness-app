"""Calorie and rep calculations (FitnessCalculator utility in the class diagram).

All functions are pure: same inputs -> same outputs, no I/O, no clock. Inputs
are validated against the ranges in :mod:`fitness.validation`; invalid input
raises :class:`fitness.validation.ValidationError`.

Formulas
--------
* BMI                 = weight_kg / height_m^2
* BMR (Mifflin-St Jeor)= 10*kg + 6.25*cm - 5*age + 5 (male) / -161 (female)
* TDEE                = BMR * activity factor
* Calories burned     = MET * 3.5 * kg / 200 * minutes   (ACSM equation)
* 1RM (Epley)         = w * (1 + reps/30)
* 1RM (Brzycki)       = w * 36 / (37 - reps)
"""
from typing import Iterable, Protocol

from . import validation as v
from .enums import ActivityLevel, Sex

DEFAULT_SECONDS_PER_REP = 3.0
DEFAULT_REST_SECONDS = 60.0


class HasRepsAndWeight(Protocol):
    reps: int
    weight_kg: float


# --- Body metrics -------------------------------------------------------------

def bmi(weight_kg: float, height_cm: float) -> float:
    w = v.check(weight_kg, v.BODY_WEIGHT)
    h_m = v.check(height_cm, v.HEIGHT) / 100.0
    return w / (h_m * h_m)


def bmi_category(bmi_value: float) -> str:
    """WHO adult categories. Boundaries: 18.5, 25.0 and 30.0 start a new class."""
    if bmi_value < 18.5:
        return "Underweight"
    if bmi_value < 25.0:
        return "Normal"
    if bmi_value < 30.0:
        return "Overweight"
    return "Obese"


def bmr(weight_kg: float, height_cm: float, age: int, sex: Sex) -> float:
    """Basal metabolic rate in kcal/day (Mifflin-St Jeor)."""
    w = v.check(weight_kg, v.BODY_WEIGHT)
    h = v.check(height_cm, v.HEIGHT)
    a = v.check(age, v.AGE)
    if not isinstance(sex, Sex):
        raise v.ValidationError("Sex must be MALE or FEMALE")
    base = 10.0 * w + 6.25 * h - 5.0 * a
    return base + (5.0 if sex is Sex.MALE else -161.0)


def tdee(bmr_kcal: float, activity: ActivityLevel) -> float:
    """Total daily energy expenditure in kcal/day."""
    if not isinstance(activity, ActivityLevel):
        raise v.ValidationError("Unknown activity level")
    if bmr_kcal <= 0:
        raise v.ValidationError("BMR must be positive")
    return bmr_kcal * activity.factor


# --- Calories -----------------------------------------------------------------

def calories_burned(met: float, weight_kg: float, duration_min: float) -> float:
    """Energy for an activity of a given MET intensity and duration (kcal)."""
    m = v.check(met, v.MET)
    w = v.check(weight_kg, v.BODY_WEIGHT)
    d = v.check(duration_min, v.DURATION)
    return m * 3.5 * w / 200.0 * d


def strength_duration_min(sets: Iterable[HasRepsAndWeight],
                          seconds_per_rep: float = DEFAULT_SECONDS_PER_REP,
                          rest_seconds: float = DEFAULT_REST_SECONDS) -> float:
    """Estimated time under tension plus rest between sets (no rest after last)."""
    sets = list(sets)
    if not sets:
        return 0.0
    if seconds_per_rep <= 0 or rest_seconds < 0:
        raise v.ValidationError("Tempo must be positive and rest non-negative")
    work = total_reps(sets) * seconds_per_rep
    rest = (len(sets) - 1) * rest_seconds
    return (work + rest) / 60.0


def strength_calories(sets: Iterable[HasRepsAndWeight], met: float, body_weight_kg: float,
                      seconds_per_rep: float = DEFAULT_SECONDS_PER_REP,
                      rest_seconds: float = DEFAULT_REST_SECONDS) -> float:
    """Calories for a strength exercise, using estimated duration from the sets."""
    m = v.check(met, v.MET)
    w = v.check(body_weight_kg, v.BODY_WEIGHT)
    minutes = strength_duration_min(sets, seconds_per_rep, rest_seconds)
    return m * 3.5 * w / 200.0 * minutes


def calorie_balance(intake_kcal: int, tdee_kcal: float, exercise_kcal: float) -> float:
    """Positive = surplus, negative = deficit."""
    intake = v.check(intake_kcal, v.CALORIE_INTAKE)
    if tdee_kcal < 0 or exercise_kcal < 0:
        raise v.ValidationError("Energy expenditure cannot be negative")
    return intake - (tdee_kcal + exercise_kcal)


# --- Reps & strength ----------------------------------------------------------

def total_reps(sets: Iterable[HasRepsAndWeight]) -> int:
    return sum(v.check(s.reps, v.REPS) for s in sets)


def training_volume(sets: Iterable[HasRepsAndWeight]) -> float:
    """Volume load = sum(reps x weight) in kg. Bodyweight sets (0 kg) add 0."""
    return sum(v.check(s.reps, v.REPS) * v.check(s.weight_kg, v.LIFT_WEIGHT) for s in sets)


def one_rep_max_epley(weight_kg: float, reps: int) -> float:
    w = v.check(weight_kg, v.LIFT_WEIGHT)
    r = v.check(reps, v.REPS_FOR_1RM)
    return w if r == 1 else w * (1 + r / 30.0)


def one_rep_max_brzycki(weight_kg: float, reps: int) -> float:
    w = v.check(weight_kg, v.LIFT_WEIGHT)
    r = v.check(reps, v.REPS_FOR_1RM)
    return w * 36.0 / (37.0 - r)


def progress_percent(current: float, goal: int) -> float:
    """Progress toward a goal, clamped to 0..100 %."""
    g = v.check(goal, v.GOAL)
    if current < 0:
        raise v.ValidationError("Progress cannot be negative")
    return min(100.0, current / g * 100.0)
