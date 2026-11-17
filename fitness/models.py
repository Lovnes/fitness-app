"""Domain entities (see docs/uml/class.puml)."""
from dataclasses import dataclass, field
from typing import List, Optional

from . import calculations as calc
from . import validation as v
from .enums import ActivityLevel, ExerciseCategory, Sex


@dataclass
class UserProfile:
    name: str
    age: int
    sex: Sex
    weight_kg: float
    height_cm: float
    activity_level: ActivityLevel = ActivityLevel.MODERATE
    daily_calorie_goal: int = 2000

    def __post_init__(self) -> None:
        self.name = (self.name or "").strip() or "Me"
        self.age = v.check(self.age, v.AGE)
        self.weight_kg = v.check(self.weight_kg, v.BODY_WEIGHT)
        self.height_cm = v.check(self.height_cm, v.HEIGHT)
        self.daily_calorie_goal = v.check(self.daily_calorie_goal, v.CALORIE_INTAKE)
        if not isinstance(self.sex, Sex):
            raise v.ValidationError("Sex must be MALE or FEMALE")
        if not isinstance(self.activity_level, ActivityLevel):
            raise v.ValidationError("Unknown activity level")

    def bmi(self) -> float:
        return calc.bmi(self.weight_kg, self.height_cm)

    def bmr(self) -> float:
        return calc.bmr(self.weight_kg, self.height_cm, self.age, self.sex)

    def tdee(self) -> float:
        return calc.tdee(self.bmr(), self.activity_level)

    def to_dict(self) -> dict:
        return {
            "name": self.name, "age": self.age, "sex": self.sex.value,
            "weight_kg": self.weight_kg, "height_cm": self.height_cm,
            "activity_level": self.activity_level.value,
            "daily_calorie_goal": self.daily_calorie_goal,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "UserProfile":
        return cls(name=d["name"], age=d["age"], sex=Sex(d["sex"]),
                   weight_kg=d["weight_kg"], height_cm=d["height_cm"],
                   activity_level=ActivityLevel(d["activity_level"]),
                   daily_calorie_goal=d.get("daily_calorie_goal", 2000))


@dataclass(frozen=True)
class Exercise:
    id: str
    name: str
    category: ExerciseCategory
    met: float

    def __post_init__(self) -> None:
        v.check(self.met, v.MET)


@dataclass(frozen=True)
class WorkoutSet:
    reps: int
    weight_kg: float = 0.0

    def __post_init__(self) -> None:
        object.__setattr__(self, "reps", v.check(self.reps, v.REPS))
        object.__setattr__(self, "weight_kg", v.check(self.weight_kg, v.LIFT_WEIGHT))


@dataclass
class ExerciseEntry:
    """One exercise inside a session: a list of sets (strength) or minutes (cardio)."""

    exercise: Exercise
    sets: List[WorkoutSet] = field(default_factory=list)
    cardio_minutes: float = 0.0

    def add_set(self, workout_set: WorkoutSet) -> None:
        if self.exercise.category is not ExerciseCategory.STRENGTH:
            raise v.ValidationError(f"{self.exercise.name} is logged by duration, not sets")
        if len(self.sets) >= v.SETS.max:
            raise v.ValidationError(f"Maximum {v.SETS.max} sets per exercise")
        self.sets.append(workout_set)

    def add_minutes(self, minutes: float) -> None:
        if self.exercise.category is not ExerciseCategory.CARDIO:
            raise v.ValidationError(f"{self.exercise.name} is logged by sets, not duration")
        v.check(minutes, v.DURATION)
        v.check(self.cardio_minutes + minutes, v.DURATION)  # cumulative cap
        self.cardio_minutes += float(minutes)

    def total_reps(self) -> int:
        return calc.total_reps(self.sets)

    def volume(self) -> float:
        return calc.training_volume(self.sets)

    def calories(self, body_weight_kg: float) -> float:
        if self.exercise.category is ExerciseCategory.CARDIO:
            if self.cardio_minutes == 0:
                return 0.0
            return calc.calories_burned(self.exercise.met, body_weight_kg, self.cardio_minutes)
        return calc.strength_calories(self.sets, self.exercise.met, body_weight_kg)

    def best_one_rep_max(self) -> Optional[float]:
        """Highest Epley estimate among sets with 1-12 reps and a load > 0."""
        estimates = [calc.one_rep_max_epley(s.weight_kg, s.reps)
                     for s in self.sets if s.weight_kg > 0 and s.reps <= v.REPS_FOR_1RM.max]
        return max(estimates) if estimates else None


@dataclass(frozen=True)
class WorkoutSummary:
    """Immutable record saved to history once a session is completed."""

    id: str
    date_iso: str
    active_minutes: float
    total_reps: int
    total_volume_kg: float
    calories_kcal: float
    exercises: List[str]

    def to_dict(self) -> dict:
        return dict(self.__dict__)

    @classmethod
    def from_dict(cls, d: dict) -> "WorkoutSummary":
        return cls(**d)
