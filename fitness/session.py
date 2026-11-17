"""WorkoutSession — the state machine shown in docs/uml/state_workout_session.puml.

    NOT_STARTED --start--> IN_PROGRESS <--pause/resume--> PAUSED
    IN_PROGRESS / PAUSED --finish [has logged work]--> COMPLETED
    NOT_STARTED / IN_PROGRESS / PAUSED --cancel--> CANCELLED

The clock is injectable so tests can control time deterministically.
"""
import time
import uuid
from datetime import datetime
from typing import Callable, Dict, List, Optional, Tuple

from . import validation as v
from .enums import SessionState as S
from .models import Exercise, ExerciseEntry, WorkoutSet, WorkoutSummary


class InvalidTransition(Exception):
    """Raised when an event is not allowed in the current state."""


TRANSITIONS: Dict[Tuple[S, str], S] = {
    (S.NOT_STARTED, "start"): S.IN_PROGRESS,
    (S.IN_PROGRESS, "pause"): S.PAUSED,
    (S.PAUSED, "resume"): S.IN_PROGRESS,
    (S.IN_PROGRESS, "finish"): S.COMPLETED,
    (S.PAUSED, "finish"): S.COMPLETED,
    (S.NOT_STARTED, "cancel"): S.CANCELLED,
    (S.IN_PROGRESS, "cancel"): S.CANCELLED,
    (S.PAUSED, "cancel"): S.CANCELLED,
}


class WorkoutSession:
    def __init__(self, body_weight_kg: float,
                 clock: Callable[[], float] = time.monotonic,
                 session_id: Optional[str] = None) -> None:
        self.body_weight_kg = v.check(body_weight_kg, v.BODY_WEIGHT)
        self.id = session_id or uuid.uuid4().hex[:12]
        self.state = S.NOT_STARTED
        self.entries: List[ExerciseEntry] = []
        self._clock = clock
        self._active_seconds = 0.0
        self._resumed_at: Optional[float] = None
        self.started_at: Optional[datetime] = None

    # --- state machine --------------------------------------------------------
    def _fire(self, event: str) -> None:
        target = TRANSITIONS.get((self.state, event))
        if target is None:
            raise InvalidTransition(f"Cannot {event} a workout that is {self.state.value}")
        self.state = target

    def start(self) -> None:
        self._fire("start")
        self.started_at = datetime.now()
        self._resumed_at = self._clock()

    def pause(self) -> None:
        self._fire("pause")
        self._bank_time()

    def resume(self) -> None:
        self._fire("resume")
        self._resumed_at = self._clock()

    def finish(self) -> WorkoutSummary:
        if self.state in (S.IN_PROGRESS, S.PAUSED) and not self.has_logged_work():
            raise InvalidTransition("Log at least one set or cardio block before finishing")
        was_running = self.state is S.IN_PROGRESS
        self._fire("finish")
        if was_running:
            self._bank_time()
        return self.summary()

    def cancel(self) -> None:
        was_running = self.state is S.IN_PROGRESS
        self._fire("cancel")
        if was_running:
            self._bank_time()

    def _bank_time(self) -> None:
        if self._resumed_at is not None:
            self._active_seconds += self._clock() - self._resumed_at
            self._resumed_at = None

    # --- logging --------------------------------------------------------------
    def _require_running(self) -> None:
        if self.state is not S.IN_PROGRESS:
            raise InvalidTransition("Start or resume the workout before logging")

    def _entry_for(self, exercise: Exercise) -> ExerciseEntry:
        for entry in self.entries:
            if entry.exercise.id == exercise.id:
                return entry
        entry = ExerciseEntry(exercise)
        self.entries.append(entry)
        return entry

    def log_set(self, exercise: Exercise, reps: int, weight_kg: float = 0.0) -> WorkoutSet:
        self._require_running()
        workout_set = WorkoutSet(reps, weight_kg)  # validates first
        entry = self._entry_for(exercise)
        try:
            entry.add_set(workout_set)
        except v.ValidationError:
            if not entry.sets:
                self.entries.remove(entry)
            raise
        return workout_set

    def log_cardio(self, exercise: Exercise, minutes: float) -> None:
        self._require_running()
        entry = self._entry_for(exercise)
        try:
            entry.add_minutes(minutes)
        except v.ValidationError:
            if not entry.sets and entry.cardio_minutes == 0:
                self.entries.remove(entry)
            raise

    def has_logged_work(self) -> bool:
        return any(e.sets or e.cardio_minutes > 0 for e in self.entries)

    # --- derived values -------------------------------------------------------
    @property
    def active_minutes(self) -> float:
        seconds = self._active_seconds
        if self._resumed_at is not None:
            seconds += self._clock() - self._resumed_at
        return seconds / 60.0

    def total_reps(self) -> int:
        return sum(e.total_reps() for e in self.entries)

    def total_volume(self) -> float:
        return sum(e.volume() for e in self.entries)

    def total_calories(self) -> float:
        return sum(e.calories(self.body_weight_kg) for e in self.entries)

    def summary(self) -> WorkoutSummary:
        # Store full precision; round only when displaying. Rounding here and
        # again in the UI caused the live total (329) and the saved total (328)
        # to disagree — see PSP defect log D-02.
        return WorkoutSummary(
            id=self.id,
            date_iso=(self.started_at or datetime.now()).isoformat(timespec="seconds"),
            active_minutes=self.active_minutes,
            total_reps=self.total_reps(),
            total_volume_kg=self.total_volume(),
            calories_kcal=self.total_calories(),
            exercises=[e.exercise.name for e in self.entries],
        )
