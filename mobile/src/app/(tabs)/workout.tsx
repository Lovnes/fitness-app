import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { ConfirmSheet } from '../../components/chrome';
import { Stepper } from '../../components/pickers';
import { EmptyState } from '../../components/visuals';
import { Badge, Button, Card, IconButton, IconCircle, IconName, Ionicons, Row, Screen, T } from '../../components/ui';
import { WorkoutSummary } from '../../domain/models';
import { InvalidTransition } from '../../domain/session';
import { isTerminal } from '../../domain/types';
import { DURATION, LIFT_WEIGHT, REPS, ValidationError } from '../../domain/validation';
import { useApp, useTicker } from '../../store/AppStore';
import { colors, fmt, font, radius } from '../../theme';

const STATE_LABEL = { not_started: 'Ready', in_progress: 'In progress', paused: 'Paused', completed: 'Completed', cancelled: 'Cancelled' } as const;

const buzz = (kind: 'ok' | 'err') => {
  if (Platform.OS === 'web') return;
  (kind === 'ok'
    ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)).catch(() => undefined);
};

export default function Workout() {
  const { session, startSession, mutate, finishSession, cancelSession, exercise, profile } = useApp();
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(20);
  const [minutes, setMinutes] = useState(20);
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);
  const [confirm, setConfirm] = useState<'finish' | 'cancel' | null>(null);
  const [saved, setSaved] = useState<WorkoutSummary | null>(null);

  const state = session?.state ?? null;
  const active = !!session && !isTerminal(session.state);
  useTicker(state === 'in_progress');

  // Clear stale feedback when the exercise changes (adjusting state during render, not in an effect).
  const [messageFor, setMessageFor] = useState(exercise.id);
  if (messageFor !== exercise.id) {
    setMessageFor(exercise.id);
    setMessage(null);
  }

  const run = (fn: () => void, ok?: string) => {
    try {
      fn();
      if (ok) {
        setMessage({ text: ok, tone: 'ok' });
        buzz('ok');
      }
    } catch (e) {
      if (e instanceof ValidationError || e instanceof InvalidTransition) {
        setMessage({ text: e.message, tone: 'err' });
        buzz('err');
      } else throw e;
    }
  };

  const start = () => run(() => { startSession(); setSaved(null); setMessage(null); });

  const log = () => run(() => mutate((s) => {
    if (exercise.category === 'strength') s.logSet(exercise, reps, weight);
    else s.logCardio(exercise, minutes);
  }), exercise.category === 'strength'
    ? `Logged ${exercise.name}: ${reps} reps @ ${weight ? `${fmt.kg(weight)} kg` : 'bodyweight'}`
    : `Logged ${exercise.name}: ${minutes} min`);

  const undo = () => run(() => mutate((s) => { s.undoLast(); }), 'Last entry removed');

  const doFinish = async () => {
    setConfirm(null);
    try {
      const summary = await finishSession();
      setSaved(summary);
      setMessage(null);
      buzz('ok');
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : String(e), tone: 'err' });
    }
  };

  const doCancel = () => {
    setConfirm(null);
    cancelSession();
    setMessage({ text: 'Workout discarded', tone: 'ok' });
  };

  if (!profile) return null;

  // --- Idle: no active workout ---------------------------------------------------------
  if (!active) {
    return (
      <Screen bg={colors.bg}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 16 }}>
          <T v="h1">Workout</T>
          {saved ? (
            <Card style={{ backgroundColor: colors.ink, borderColor: colors.ink, padding: 20 }}>
              <Row gap={12}>
                <IconCircle icon="trophy" bg={colors.orange} color={colors.white} size={52} />
                <View style={{ flex: 1 }}>
                  <T v="title" style={{ color: colors.white }}>Workout saved!</T>
                  <T v="caption" style={{ color: colors.gray2 }}>{saved.exercises.join(', ')}</T>
                </View>
              </Row>
              <Row style={{ marginTop: 18, justifyContent: 'space-between' }}>
                <Big label="Calories" value={fmt.int(saved.caloriesKcal)} unit="kcal" />
                <Big label="Reps" value={fmt.int(saved.totalReps)} />
                <Big label="Time" value={fmt.clock(saved.activeMinutes)} />
              </Row>
            </Card>
          ) : null}
          <EmptyState
            icon="barbell-outline"
            title={saved ? 'Go again?' : 'Ready to train?'}
            message="Start a session, then log strength sets or cardio minutes. Paused time isn't counted."
            actionLabel="Start workout"
            onAction={start}
          />
          {message ? <Banner text={message.text} tone={message.tone} /> : null}
        </ScrollView>
      </Screen>
    );
  }

  // --- Active session ------------------------------------------------------------------
  const s = session!;
  const running = state === 'in_progress';
  const isStrength = exercise.category === 'strength';

  return (
    <Screen bg={colors.bg}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 130, gap: 14 }} keyboardShouldPersistTaps="handled">
        {/* Timer header */}
        <Card dark style={{ padding: 20 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Badge text={STATE_LABEL[s.state]} tone={running ? 'orange' : 'gray'} />
            <IconButton
              icon={running ? 'pause' : 'play'}
              label={running ? 'Pause workout' : 'Resume workout'}
              bg={colors.orange}
              color={colors.white}
              onPress={() => run(() => mutate((x) => (running ? x.pause() : x.resume())))}
            />
          </Row>
          <Text accessibilityRole="timer" accessibilityLabel={`Active time ${fmt.clock(s.activeMinutes)}`}
            style={{ fontFamily: font.extrabold, fontSize: 56, color: colors.white, letterSpacing: -1.5, marginTop: 4 }}>
            {fmt.clock(s.activeMinutes)}
          </Text>
          <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <Big label="Reps" value={fmt.int(s.totalReps())} />
            <Big label="Volume" value={fmt.int(s.totalVolume())} unit="kg" />
            <Big label="Burned" value={fmt.int(s.totalCalories())} unit="kcal" accent />
          </Row>
        </Card>

        {/* Exercise selector */}
        <Card onPress={() => router.push('/exercise-picker')} accessibilityLabel={`Exercise: ${exercise.name}. Tap to change`}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={12} style={{ flex: 1 }}>
              <IconCircle icon={exercise.icon as IconName} />
              <View style={{ flex: 1 }}>
                <T v="caption">Exercise · {isStrength ? 'sets × reps' : 'minutes'}</T>
                <T v="title">{exercise.name}</T>
              </View>
            </Row>
            <Row gap={4}>
              <T style={{ color: colors.orange, fontFamily: font.bold }}>Change</T>
              <Ionicons name="chevron-forward" size={18} color={colors.orange} />
            </Row>
          </Row>
        </Card>

        {/* Inputs */}
        <Card style={{ gap: 12 }}>
          {isStrength ? (
            <View style={{ gap: 10 }}>
              <Stepper label="Reps" value={reps} onChange={setReps} min={REPS.min} max={REPS.max} />
              <Stepper label="Weight" unit="kg · 0 = bodyweight" value={weight} onChange={setWeight}
                min={LIFT_WEIGHT.min} max={LIFT_WEIGHT.max} step={2.5} format={fmt.kg} />
            </View>
          ) : (
            <Stepper label="Duration" unit="minutes" value={minutes} onChange={setMinutes} min={DURATION.min} max={DURATION.max} step={5} />
          )}
          {message ? <Banner text={message.text} tone={message.tone} /> : null}
          {!running ? <Banner text="Paused — resume to keep logging." tone="info" /> : null}
          <Row gap={10}>
            <IconButton icon="arrow-undo" label="Undo last entry" onPress={undo} disabled={!s.canUndo} size={56} />
            <Button label={isStrength ? 'Log set' : 'Log minutes'} variant="primary" icon="add" onPress={log}
              disabled={!running} style={{ flex: 1 }} />
          </Row>
        </Card>

        {/* Logged entries */}
        <T v="h2" style={{ marginTop: 4 }}>This session</T>
        {s.entries.length === 0 ? (
          <Card><T v="caption" style={{ textAlign: 'center' }}>Nothing logged yet — your sets will appear here.</T></Card>
        ) : (
          s.entries.map((e) => {
            const best = e.bestOneRepMax();
            return (
              <Card key={e.exercise.id} style={{ gap: 10 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row gap={10} style={{ flex: 1 }}>
                    <IconCircle icon={e.exercise.icon as IconName} size={36} />
                    <T v="title" style={{ flex: 1 }}>{e.exercise.name}</T>
                  </Row>
                  <Badge text={`${fmt.int(e.calories(s.bodyWeightKg))} kcal`} />
                </Row>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {e.exercise.category === 'strength'
                    ? e.sets.map((x, i) => (
                      <View key={i} style={{ backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.ink }}>
                          {i + 1}. {x.reps} × {x.weightKg ? `${fmt.kg(x.weightKg)} kg` : 'BW'}
                        </Text>
                      </View>
                    ))
                    : e.cardioBlocks.map((b, i) => (
                      <View key={i} style={{ backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.ink }}>{b} min</Text>
                      </View>
                    ))}
                </View>
                {best ? <T v="caption">Estimated 1-rep max: <Text style={{ color: colors.ink, fontFamily: font.bold }}>{fmt.one(best)} kg</Text></T> : null}
              </Card>
            );
          })
        )}

        <Row gap={10} style={{ marginTop: 6 }}>
          <Button label="Cancel" variant="outline" icon={null} onPress={() => setConfirm('cancel')} style={{ flex: 1 }} />
          <Button label="Finish" variant="dark" icon="checkmark" onPress={() => setConfirm('finish')} style={{ flex: 1.4 }} />
        </Row>
      </ScrollView>

      <ConfirmSheet
        visible={confirm === 'finish'}
        icon="trophy-outline"
        title="Finish workout?"
        message={`${fmt.int(s.totalReps())} reps · ${fmt.int(s.totalCalories())} kcal · ${fmt.clock(s.activeMinutes)}. It will be saved to your history.`}
        confirmLabel="Finish & save"
        cancelLabel="Keep going"
        onConfirm={doFinish}
        onClose={() => setConfirm(null)}
      />
      <ConfirmSheet
        visible={confirm === 'cancel'}
        tone="danger"
        icon="trash-outline"
        title="Discard workout?"
        message="Everything logged in this session will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep going"
        onConfirm={doCancel}
        onClose={() => setConfirm(null)}
      />
    </Screen>
  );
}

function Big({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <View>
      <Text style={{ fontFamily: font.medium, fontSize: 12, color: colors.gray2 }}>{label}</Text>
      <Text style={{ fontFamily: font.extrabold, fontSize: 22, color: accent ? colors.orange : colors.white }}>
        {value}{unit ? <Text style={{ fontSize: 13, fontFamily: font.semibold }}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

function Banner({ text, tone }: { text: string; tone: 'ok' | 'err' | 'info' }) {
  const map = {
    ok: [colors.successSoft, colors.success, 'checkmark-circle'],
    err: [colors.dangerSoft, colors.danger, 'alert-circle'],
    info: [colors.orangeSoft, colors.orangeDark, 'pause-circle'],
  } as const;
  const [bg, fg, icon] = map[tone];
  return (
    <Pressable accessibilityLiveRegion="polite" accessibilityRole="alert"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: bg, borderRadius: radius.md, padding: 12 }}>
      <Ionicons name={icon} size={20} color={fg} />
      <Text style={{ flex: 1, color: fg, fontFamily: font.semibold, fontSize: 14 }}>{text}</Text>
    </Pressable>
  );
}
