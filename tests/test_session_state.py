"""STATE MACHINE TESTS — WorkoutSession transitions (state diagram coverage).

Covers every valid transition (all-transitions coverage) and every invalid
event in every state (sneak-path testing).
"""
import unittest

from fitness.enums import SessionState as S
from fitness.exercises import BY_ID
from fitness.session import TRANSITIONS, InvalidTransition, WorkoutSession
from fitness.validation import ValidationError

EVENTS = ("start", "pause", "resume", "finish", "cancel")


class FakeClock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t

    def advance(self, minutes):
        self.t += minutes * 60


def session_in(state, clock=None):
    s = WorkoutSession(70, clock=clock or FakeClock())
    if state is S.NOT_STARTED:
        return s
    s.start()
    s.log_set(BY_ID["push_up"], 10)
    if state is S.PAUSED:
        s.pause()
    elif state is S.COMPLETED:
        s.finish()
    elif state is S.CANCELLED:
        s.cancel()
    return s


class TestTransitions(unittest.TestCase):
    def test_initial_state(self):
        self.assertIs(WorkoutSession(70).state, S.NOT_STARTED)

    def test_every_state_event_pair(self):
        for state in S:
            for event in EVENTS:
                with self.subTest(state=state.name, event=event):
                    s = session_in(state)
                    expected = TRANSITIONS.get((state, event))
                    if expected is None:
                        with self.assertRaises(InvalidTransition):
                            getattr(s, event)()
                        self.assertIs(s.state, state)  # unchanged
                    else:
                        getattr(s, event)()
                        self.assertIs(s.state, expected)

    def test_terminal_states(self):
        self.assertTrue(S.COMPLETED.is_terminal)
        self.assertTrue(S.CANCELLED.is_terminal)
        self.assertFalse(S.PAUSED.is_terminal)


class TestGuardsAndLogging(unittest.TestCase):
    def test_cannot_finish_empty_workout(self):
        s = WorkoutSession(70)
        s.start()
        with self.assertRaises(InvalidTransition):
            s.finish()
        self.assertIs(s.state, S.IN_PROGRESS)

    def test_cannot_log_unless_in_progress(self):
        for state in (S.NOT_STARTED, S.PAUSED, S.COMPLETED, S.CANCELLED):
            with self.subTest(state=state.name):
                with self.assertRaises(InvalidTransition):
                    session_in(state).log_set(BY_ID["squat"], 5, 100)

    def test_invalid_set_leaves_no_empty_entry(self):
        s = session_in(S.NOT_STARTED)
        s.start()
        with self.assertRaises(ValidationError):
            s.log_set(BY_ID["squat"], 0, 100)
        self.assertEqual(s.entries, [])

    def test_wrong_logging_mode(self):
        s = session_in(S.NOT_STARTED)
        s.start()
        with self.assertRaises(ValidationError):
            s.log_cardio(BY_ID["squat"], 10)
        with self.assertRaises(ValidationError):
            s.log_set(BY_ID["run_8kmh"], 10)
        self.assertEqual(s.entries, [])

    def test_sets_group_by_exercise(self):
        s = session_in(S.NOT_STARTED)
        s.start()
        s.log_set(BY_ID["bench_press"], 10, 60)
        s.log_set(BY_ID["bench_press"], 8, 70)
        s.log_set(BY_ID["squat"], 5, 100)
        self.assertEqual([e.exercise.id for e in s.entries], ["bench_press", "squat"])
        self.assertEqual(s.total_reps(), 23)
        self.assertAlmostEqual(s.total_volume(), 600 + 560 + 500)


class TestTimingAndSummary(unittest.TestCase):
    def test_paused_time_not_counted(self):
        clock = FakeClock()
        s = WorkoutSession(70, clock=clock)
        s.start()
        clock.advance(10)
        s.pause()
        clock.advance(5)          # paused — must not count
        s.resume()
        clock.advance(15)
        s.log_cardio(BY_ID["run_8kmh"], 25)
        summary = s.finish()
        self.assertAlmostEqual(summary.active_minutes, 25.0)

    def test_finish_while_paused(self):
        clock = FakeClock()
        s = session_in(S.NOT_STARTED, clock)
        s.start()
        s.log_set(BY_ID["push_up"], 20)
        clock.advance(4)
        s.pause()
        clock.advance(30)
        self.assertAlmostEqual(s.finish().active_minutes, 4.0)

    def test_summary_calories(self):
        s = WorkoutSession(70, clock=FakeClock(), session_id="abc")
        s.start()
        s.log_cardio(BY_ID["run_8kmh"], 30)        # 305.025 kcal
        for _ in range(3):
            s.log_set(BY_ID["squat"], 10, 60)      # 6*3.5*70/200 * 3.5 min = 25.725
        summary = s.finish()
        self.assertEqual(summary.id, "abc")
        self.assertEqual(summary.total_reps, 30)
        self.assertAlmostEqual(summary.calories_kcal, 305.025 + 25.725)
        self.assertEqual(summary.exercises, ["Running (8 km/h)", "Barbell Squat"])

    def test_summary_matches_live_totals(self):
        """Regression for defect D-02: saved total must equal the live total.

        Bench 10x60, 8x70, 6x80 + 30 min run at 70 kg = 328.545 kcal, a value
        where rounding twice (328.5 -> 328) differs from rounding once (329).
        """
        s = WorkoutSession(70, clock=FakeClock())
        s.start()
        for reps, kg in ((10, 60), (8, 70), (6, 80)):
            s.log_set(BY_ID["bench_press"], reps, kg)
        s.log_cardio(BY_ID["run_8kmh"], 30)
        live = s.total_calories()
        summary = s.finish()
        self.assertAlmostEqual(live, 328.545)
        self.assertEqual(f"{summary.calories_kcal:.0f}", f"{live:.0f}")


if __name__ == "__main__":
    unittest.main()
