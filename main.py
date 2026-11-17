"""FitTrack — mobile front end (Kivy).

Run on a desktop:   pip install -r requirements.txt && python main.py
Build for Android:  buildozer android debug        (see buildozer.spec)

The UI layer only gathers input and displays results. All calculations,
validation and state rules live in the ``fitness`` package, which is covered by
the unit tests in ``tests/``.
"""
import os

from kivy.app import App
from kivy.clock import Clock
from kivy.lang import Builder
from kivy.metrics import dp
from kivy.properties import BooleanProperty, ListProperty, ObjectProperty, StringProperty
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.label import Label
from kivy.uix.popup import Popup
from kivy.uix.screenmanager import Screen

from fitness import validation as v
from fitness.calculations import bmi_category
from fitness.enums import ActivityLevel, ExerciseCategory, SessionState, Sex
from fitness.exercises import BY_NAME, CATALOG
from fitness.models import UserProfile
from fitness.session import InvalidTransition, WorkoutSession
from fitness.storage import JsonRepository, StorageError

ACTIVITY_BY_LABEL = {a.label: a for a in ActivityLevel}
STATE_LABEL = {
    SessionState.IN_PROGRESS: "In progress",
    SessionState.PAUSED: "Paused",
    SessionState.COMPLETED: "Completed",
    SessionState.CANCELLED: "Cancelled",
}


def error(msg) -> str:
    return f"[color=ff6b6b]{msg}[/color]"


def ok(msg) -> str:
    return f"[color=7ee787]{msg}[/color]"


KV = r"""
<Caption@Label>:
    size_hint_y: None
    height: dp(26)
    text_size: self.width, None
    halign: 'left'
    color: 0.72, 0.74, 0.80, 1
    font_size: '14sp'

<Field@TextInput>:
    multiline: False
    write_tab: False
    size_hint_y: None
    height: dp(48)
    font_size: '17sp'
    padding: dp(12), dp(12)

<Picker@Spinner>:
    size_hint_y: None
    height: dp(48)
    font_size: '16sp'

<Primary@Button>:
    size_hint_y: None
    height: dp(52)
    font_size: '17sp'
    background_normal: ''
    background_color: (0.15, 0.52, 0.96, 1) if not self.disabled else (0.2, 0.25, 0.35, 1)

<Secondary@Button>:
    size_hint_y: None
    height: dp(52)
    font_size: '16sp'
    background_normal: ''
    background_color: 0.24, 0.26, 0.32, 1

<Danger@Button>:
    size_hint_y: None
    height: dp(52)
    font_size: '16sp'
    background_normal: ''
    background_color: (0.78, 0.24, 0.24, 1) if not self.disabled else (0.3, 0.2, 0.2, 1)

<Title@Label>:
    size_hint_y: None
    height: dp(44)
    font_size: '24sp'
    bold: True
    text_size: self.width, None
    halign: 'left'

<Body@Label>:
    markup: True
    size_hint_y: None
    text_size: self.width, None
    height: self.texture_size[1] + dp(8)
    halign: 'left'
    valign: 'top'
    font_size: '16sp'
    line_height: 1.25

<Form@BoxLayout>:
    orientation: 'vertical'
    padding: dp(16)
    spacing: dp(8)
    size_hint_y: None
    height: self.minimum_height

<Stack@BoxLayout>:
    orientation: 'vertical'
    size_hint_y: None
    height: self.minimum_height

<NavButton@Button>:
    selected: False
    font_size: '16sp'
    background_normal: ''
    background_color: (0.15, 0.52, 0.96, 1) if self.selected else (0.13, 0.14, 0.18, 1)

<ProfileScreen>:
    ScrollView:
        id: scroll
        Form:
            Title:
                text: 'Your profile'
            Body:
                text: root.message
            Caption:
                text: 'Name'
            Field:
                id: name
                hint_text: 'e.g. Alex'
            Caption:
                text: 'Age (13-100 years)'
            Field:
                id: age
                input_filter: 'int'
                hint_text: '25'
            Caption:
                text: 'Weight (20-300 kg)'
            Field:
                id: weight
                input_filter: 'float'
                hint_text: '70'
            Caption:
                text: 'Height (100-250 cm)'
            Field:
                id: height
                input_filter: 'float'
                hint_text: '175'
            Caption:
                text: 'Sex (used by the BMR formula)'
            Picker:
                id: sex
                text: 'Male'
                values: ['Male', 'Female']
            Caption:
                text: 'Activity level'
            Picker:
                id: activity
                text: root.activity_labels[2]
                values: root.activity_labels
            Caption:
                text: 'Daily calorie goal (0-10000 kcal)'
            Field:
                id: goal
                input_filter: 'int'
                text: '2000'
            Primary:
                text: 'Save profile'
                on_release: root.save()

<WorkoutScreen>:
    ScrollView:
        Form:
            Title:
                text: 'Workout'
            Body:
                text: root.status_text
                font_size: '18sp'
            BoxLayout:
                size_hint_y: None
                height: dp(52)
                spacing: dp(8)
                Primary:
                    text: root.primary_label
                    on_release: root.on_primary()
                Secondary:
                    text: 'Finish'
                    disabled: not root.can_finish
                    on_release: root.finish()
                Danger:
                    text: 'Cancel'
                    disabled: not root.can_cancel
                    on_release: root.confirm_cancel()
            Caption:
                text: 'Exercise'
            Picker:
                id: exercise
                text: root.exercise_names[0]
                values: root.exercise_names
                on_text: root.on_exercise_changed(self.text)
            BoxLayout:
                size_hint_y: None
                height: dp(80) if root.is_strength else 0
                opacity: 1 if root.is_strength else 0
                disabled: not root.is_strength
                spacing: dp(8)
                Stack:
                    Caption:
                        text: 'Reps (1-100)'
                    Field:
                        id: reps
                        input_filter: 'int'
                        hint_text: '10'
                Stack:
                    Caption:
                        text: 'Weight kg (0 = bodyweight)'
                    Field:
                        id: lift
                        input_filter: 'float'
                        text: '0'
            BoxLayout:
                size_hint_y: None
                height: 0 if root.is_strength else dp(80)
                opacity: 0 if root.is_strength else 1
                disabled: root.is_strength
                Stack:
                    Caption:
                        text: 'Minutes (1-600)'
                    Field:
                        id: minutes
                        input_filter: 'float'
                        hint_text: '30'
            Primary:
                text: 'Log set' if root.is_strength else 'Log minutes'
                disabled: not root.can_log
                on_release: root.log()
            Body:
                text: root.message
            Body:
                text: root.log_text

<HistoryScreen>:
    ScrollView:
        Form:
            Title:
                text: 'History'
            Body:
                text: root.history_text

<Root>:
    orientation: 'vertical'
    canvas.before:
        Color:
            rgba: 0.08, 0.09, 0.12, 1
        Rectangle:
            pos: self.pos
            size: self.size
    ScreenManager:
        id: sm
        ProfileScreen:
            name: 'profile'
        WorkoutScreen:
            name: 'workout'
        HistoryScreen:
            name: 'history'
    BoxLayout:
        size_hint_y: None
        height: dp(60)
        NavButton:
            text: 'Profile'
            selected: sm.current == 'profile'
            on_release: sm.current = 'profile'
        NavButton:
            text: 'Workout'
            selected: sm.current == 'workout'
            on_release: sm.current = 'workout'
        NavButton:
            text: 'History'
            selected: sm.current == 'history'
            on_release: sm.current = 'history'
"""


class ProfileScreen(Screen):
    activity_labels = ListProperty([a.label for a in ActivityLevel])
    message = StringProperty("")

    def on_pre_enter(self, *args):
        p = App.get_running_app().profile
        if p is None:
            self.message = "Welcome! Enter your details to get started."
            return
        ids = self.ids
        ids.name.text = p.name
        ids.age.text = str(p.age)
        ids.weight.text = f"{p.weight_kg:g}"
        ids.height.text = f"{p.height_cm:g}"
        ids.sex.text = "Male" if p.sex is Sex.MALE else "Female"
        ids.activity.text = p.activity_level.label
        ids.goal.text = str(p.daily_calorie_goal)
        self.message = self._metrics(p)

    def save(self):
        ids = self.ids
        # Feedback is shown under the title; scroll up so it is always visible
        # on small screens (usability defect D-03).
        ids.scroll.scroll_y = 1
        try:
            profile = UserProfile(
                name=ids.name.text,
                age=v.parse(ids.age.text, v.AGE),
                sex=Sex.MALE if ids.sex.text == "Male" else Sex.FEMALE,
                weight_kg=v.parse(ids.weight.text, v.BODY_WEIGHT),
                height_cm=v.parse(ids.height.text, v.HEIGHT),
                activity_level=ACTIVITY_BY_LABEL[ids.activity.text],
                daily_calorie_goal=v.parse(ids.goal.text, v.CALORIE_INTAKE),
            )
        except v.ValidationError as exc:
            self.message = error(exc)
            return
        app = App.get_running_app()
        try:
            app.repo.save_profile(profile)
        except (OSError, StorageError) as exc:
            self.message = error(f"Could not save: {exc}")
            return
        app.profile = profile
        self.message = ok("Profile saved.") + "\n" + self._metrics(profile)

    @staticmethod
    def _metrics(p: UserProfile) -> str:
        b = p.bmi()
        return (f"BMI [b]{b:.1f}[/b] ({bmi_category(b)})\n"
                f"BMR [b]{p.bmr():.0f}[/b] kcal/day\n"
                f"Maintenance (TDEE) [b]{p.tdee():.0f}[/b] kcal/day")


class WorkoutScreen(Screen):
    exercise_names = ListProperty([e.name for e in CATALOG])
    status_text = StringProperty("")
    primary_label = StringProperty("Start workout")
    can_finish = BooleanProperty(False)
    can_cancel = BooleanProperty(False)
    can_log = BooleanProperty(False)
    is_strength = BooleanProperty(True)
    message = StringProperty("")
    log_text = StringProperty("")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.session = None
        self._tick = None

    def on_pre_enter(self, *args):
        self.refresh()

    # --- actions ----------------------------------------------------------
    def on_primary(self):
        s = self.session
        if s is None or s.state.is_terminal:
            profile = App.get_running_app().profile
            if profile is None:
                self.message = error("Set up your profile first - calories use your body weight.")
                return
            self.session = WorkoutSession(profile.weight_kg)
            self.session.start()
            self._start_tick()
            self.message = ""
        elif s.state is SessionState.IN_PROGRESS:
            s.pause()
        elif s.state is SessionState.PAUSED:
            s.resume()
        self.refresh()

    def on_exercise_changed(self, name):
        self.is_strength = BY_NAME[name].category is ExerciseCategory.STRENGTH
        self.message = ""

    def log(self):
        exercise = BY_NAME[self.ids.exercise.text]
        try:
            if self.is_strength:
                reps = v.parse(self.ids.reps.text, v.REPS)
                lift = v.parse(self.ids.lift.text or "0", v.LIFT_WEIGHT)
                self.session.log_set(exercise, reps, lift)
                load = f"{lift:g} kg" if lift else "bodyweight"
                self.message = ok(f"Logged {exercise.name}: {reps} reps @ {load}")
            else:
                minutes = v.parse(self.ids.minutes.text, v.DURATION)
                self.session.log_cardio(exercise, minutes)
                self.message = ok(f"Logged {exercise.name}: {minutes:g} min")
        except (v.ValidationError, InvalidTransition) as exc:
            self.message = error(exc)
        self.refresh()

    def finish(self):
        try:
            summary = self.session.finish()
        except InvalidTransition as exc:
            self.message = error(exc)
            return
        self._stop_tick()
        try:
            App.get_running_app().repo.add_workout(summary)
            self.message = ok(f"Workout saved: {summary.total_reps} reps, "
                              f"{summary.calories_kcal:.0f} kcal in {summary.active_minutes:.0f} min")
        except (OSError, StorageError) as exc:
            self.message = error(f"Workout finished but could not be saved: {exc}")
        self.refresh()

    def confirm_cancel(self):
        content = BoxLayout(orientation="vertical", padding=dp(12), spacing=dp(12))
        content.add_widget(Label(text="Discard this workout?\nLogged sets will be lost.",
                                 halign="center"))
        row = BoxLayout(size_hint_y=None, height=dp(48), spacing=dp(8))
        keep = Button(text="Keep going")
        discard = Button(text="Discard", background_normal="",
                         background_color=(0.78, 0.24, 0.24, 1))
        row.add_widget(keep)
        row.add_widget(discard)
        content.add_widget(row)
        popup = Popup(title="Cancel workout", content=content,
                      size_hint=(0.85, None), height=dp(220), auto_dismiss=False)
        keep.bind(on_release=popup.dismiss)
        discard.bind(on_release=lambda *_: (popup.dismiss(), self._do_cancel()))
        popup.open()

    def _do_cancel(self):
        try:
            self.session.cancel()
        except InvalidTransition as exc:
            self.message = error(exc)
            return
        self._stop_tick()
        self.message = "Workout discarded."
        self.refresh()

    # --- display ------------------------------------------------------------
    def _start_tick(self):
        self._stop_tick()
        self._tick = Clock.schedule_interval(lambda dt: self.refresh(), 1)

    def _stop_tick(self):
        if self._tick is not None:
            self._tick.cancel()
            self._tick = None

    def refresh(self):
        s = self.session
        state = s.state if s else None
        self.primary_label = {SessionState.IN_PROGRESS: "Pause",
                              SessionState.PAUSED: "Resume"}.get(state, "Start workout")
        self.can_finish = state in (SessionState.IN_PROGRESS, SessionState.PAUSED)
        self.can_cancel = self.can_finish
        self.can_log = state is SessionState.IN_PROGRESS

        if s is None:
            self.status_text = "No active workout. Tap [b]Start workout[/b] to begin."
            self.log_text = ""
            return
        secs = int(s.active_minutes * 60)
        self.status_text = (f"[b]{STATE_LABEL.get(state, '')}[/b]   {secs // 60:02d}:{secs % 60:02d}\n"
                            f"Reps [b]{s.total_reps()}[/b]   Volume [b]{s.total_volume():.0f}[/b] kg"
                            f"   Burned [b]{s.total_calories():.0f}[/b] kcal")
        lines = []
        for e in s.entries:
            if e.sets:
                detail = ", ".join(f"{x.reps}x{x.weight_kg:g}" for x in e.sets)
                best = e.best_one_rep_max()
                if best:
                    detail += f"  (est. 1RM {best:.1f} kg)"
            else:
                detail = f"{e.cardio_minutes:g} min"
            lines.append(f"[b]{e.exercise.name}[/b]: {detail} - {e.calories(s.body_weight_kg):.0f} kcal")
        self.log_text = "\n".join(lines)


class HistoryScreen(Screen):
    history_text = StringProperty("")

    def on_pre_enter(self, *args):
        app = App.get_running_app()
        try:
            items = app.repo.list_workouts()
        except StorageError as exc:
            self.history_text = error(exc)
            return
        if not items:
            self.history_text = "No workouts yet. Finish a workout to see it here."
            return
        total_kcal = sum(i.calories_kcal for i in items)
        total_reps = sum(i.total_reps for i in items)
        noun = "workout" if len(items) == 1 else "workouts"
        header = (f"[b]{len(items)}[/b] {noun}   [b]{total_reps}[/b] reps   "
                  f"[b]{total_kcal:.0f}[/b] kcal total\n")
        rows = [f"[b]{i.date_iso.replace('T', ' ')[:16]}[/b]\n"
                f"{', '.join(i.exercises)}\n"
                f"{i.active_minutes:.0f} min - {i.total_reps} reps - "
                f"{i.total_volume_kg:.0f} kg - {i.calories_kcal:.0f} kcal\n"
                for i in items]
        self.history_text = header + "\n" + "\n".join(rows)


class Root(BoxLayout):
    pass


class FitTrackApp(App):
    title = "FitTrack"
    profile = ObjectProperty(None, allownone=True)

    def build(self):
        self.repo = JsonRepository(os.path.join(self.user_data_dir, "fittrack.json"))
        try:
            self.profile = self.repo.load_profile()
        except (StorageError, KeyError, ValueError):
            self.profile = None
        Builder.load_string(KV)
        root = Root()
        root.ids.sm.current = "workout" if self.profile else "profile"
        return root


if __name__ == "__main__":
    FitTrackApp().run()
