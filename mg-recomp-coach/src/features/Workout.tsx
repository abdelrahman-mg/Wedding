// Live workout: exercise cards, set rows, progression, rest timer, swaps, finish summary.
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { FINISH_MESSAGES } from '../data/messages';
import { altDisplayName, LEG_EXTENSION_OPTIN, SESSIONS, type ExerciseDef } from '../data/sessions';
import { checkExerciseSafety } from '../engine/limits';
import { deloadLoad, targetRir, workingSets } from '../engine/phase';
import { historyFor, isPR, suggestProgression, type ExerciseSession, type Suggestion } from '../engine/progression';
import type { SetLog, WorkoutLog } from '../engine/types';
import { useApp } from '../store/useApp';
import { celebrate } from '../ui/celebrate';
import { Icon } from '../ui/Icon';
import { Banner, Button, Card, Field, ProgressBar, Row, Segmented, Sheet, T } from '../ui/kit';
import { radius, space, type, useTheme } from '../ui/theme';
import { PainSheet, RedFlagSheet } from './SafetySheets';

const RIR_OPTIONS = [0, 1, 2, 3, 4].map((n) => ({ label: n === 4 ? '4+' : String(n), value: n }));

export interface PlannedExercise {
  def: ExerciseDef;
  nameUsed: string;
  swappedToday: boolean;
  sets: number;
  rir: string;
  suggestion: Suggestion;
  prefillWeight: number | null;
}

function lastTopWeight(h: ExerciseSession[]): number | null {
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i].deload) continue;
    const w = Math.max(0, ...h[i].sets.map((s) => s.weight ?? 0));
    if (w > 0) return w;
  }
  return null;
}

export function isRestricted(def: ExerciseDef, restricted: { shoulder: boolean; knee: boolean }): boolean {
  if (restricted.knee && def.lower) return true;
  if (restricted.shoulder && !def.lower && def.muscles !== 'Core') return true;
  return false;
}

export function usePlannedExercises(active: WorkoutLog, week: number, todaySwaps: Record<string, string>) {
  const data = useApp((s) => s.data);
  return useMemo(() => {
    let defs = [...SESSIONS[active.sessionKey].exercises];
    if (active.sessionKey === 'LOWER_A' && data.settings.legExtensionOptIn && week > 6) defs = [...defs, LEG_EXTENSION_OPTIN];
    const hidden = defs.filter((d) => isRestricted(d, data.settings.restricted));
    const shown = defs.filter((d) => !isRestricted(d, data.settings.restricted));
    const list: PlannedExercise[] = shown.map((def) => {
      const nameUsed = todaySwaps[def.id] ?? data.plan.exerciseSwaps[def.id] ?? def.name;
      const history = historyFor(data.workouts, nameUsed);
      const suggestion = suggestProgression(def, history);
      let sets = workingSets(def.sets, week, active.deload);
      if (def.timed && suggestion.sets && !active.deload && week > 2) sets = Math.min(4, Math.max(sets, suggestion.sets));
      const last = lastTopWeight(history);
      const prefillWeight = def.timed || def.bodyweight ? null : active.deload ? (last ? deloadLoad(last) : null) : suggestion.weight;
      return { def, nameUsed, swappedToday: !!todaySwaps[def.id], sets, rir: targetRir(def.rir, week, active.deload), suggestion, prefillWeight };
    });
    return { list, hidden };
  }, [active.sessionKey, active.deload, data.workouts, data.plan.exerciseSwaps, data.settings.restricted, data.settings.legExtensionOptIn, todaySwaps, week]);
}

function SetRow({ ex, index, existing }: { ex: PlannedExercise; index: number; existing?: SetLog }) {
  const { c } = useTheme();
  const upsert = useApp((s) => s.upsertSet);
  const setTimer = useApp((s) => s.setRestTimer);
  const unit = ex.def.timed ? 's' : 'reps';
  const [weight, setWeight] = useState(existing?.weight != null ? String(existing.weight) : ex.prefillWeight != null ? String(ex.prefillWeight) : '');
  const [reps, setReps] = useState(existing?.reps != null ? String(existing.reps) : String(ex.suggestion.targetReps));
  const [rir, setRir] = useState<number | null>(existing?.rir ?? null);
  const done = !!existing?.done;
  const noWeight = !!(ex.def.timed || ex.def.bodyweight);

  const toggle = () => {
    const w = parseFloat(weight.replace(',', '.'));
    const r = parseInt(reps, 10);
    const s: SetLog = {
      exerciseId: ex.def.id,
      nameUsed: ex.nameUsed,
      setIndex: index,
      weight: noWeight || !Number.isFinite(w) ? null : w,
      reps: Number.isFinite(r) ? r : null,
      rir: ex.def.rir === '-' ? null : rir,
      done: !done,
    };
    upsert(s);
    if (!done) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setTimer({ endsAt: Date.now() + ex.def.rest * 1000, total: ex.def.rest, label: ex.nameUsed });
    }
  };

  const inputStyle = [type.bodyStrong, { color: c.text, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.sm, minHeight: 48, minWidth: 64, textAlign: 'center' as const, paddingHorizontal: 6 }];

  return (
    <View style={{ gap: 6, paddingVertical: 6, borderTopWidth: index ? 1 : 0, borderTopColor: c.border, opacity: done ? 0.75 : 1 }}>
      <Row>
        <T v="label" style={{ width: 44 }}>Set {index + 1}</T>
        {!noWeight ? (
          <Row gap={4}>
            <TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="kg" placeholderTextColor={c.textMuted} style={inputStyle} accessibilityLabel={`Set ${index + 1} weight in kilograms`} editable={!done} />
            <T v="caption" muted>kg</T>
          </Row>
        ) : null}
        <Row gap={4}>
          <TextInput value={reps} onChangeText={setReps} keyboardType="number-pad" style={inputStyle} accessibilityLabel={`Set ${index + 1} ${unit}`} editable={!done} />
          <T v="caption" muted>{unit}</T>
        </Row>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={toggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`Set ${index + 1} done`}
          style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? c.emerald : c.surfaceAlt, borderWidth: 2, borderColor: done ? c.emerald : c.border }}
        >
          <Icon name="check" color={done ? '#fff' : c.textMuted} size={26} strokeWidth={2.5} />
        </Pressable>
      </Row>
      {ex.def.rir !== '-' && !done ? <Segmented label="RIR (reps left in the tank)" value={rir} onChange={setRir} options={RIR_OPTIONS} /> : null}
      {done && rir != null ? <T v="caption" muted>RIR {rir === 4 ? '4+' : rir}</T> : null}
    </View>
  );
}

function SwapSheet({ ex, onClose, onSwap }: { ex: PlannedExercise | null; onClose: () => void; onSwap: (name: string | null, scope: 'today' | 'always') => void }) {
  const [pick, setPick] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!ex) return null;
  const choose = (name: string) => {
    const chk = checkExerciseSafety(name);
    if (chk.blocked) {
      setError(chk.reason ?? 'Not allowed for your joints.');
      return;
    }
    setError(null);
    setPick(name);
  };
  const close = () => {
    setPick(null);
    setCustom('');
    setError(null);
    onClose();
  };
  return (
    <Sheet visible onClose={close} title="Not available / busy?">
      <T muted>Replacing: {ex.def.name}. The alternative keeps its own progression history.</T>
      {!pick ? (
        <>
          {ex.def.alt.map((a) => (
            <Button key={a} label={altDisplayName(a)} variant="secondary" icon="swap" onPress={() => choose(altDisplayName(a))} />
          ))}
          {ex.nameUsed !== ex.def.name ? <Button label={`Back to ${ex.def.name}`} variant="ghost" onPress={() => { onSwap(null, 'always'); close(); }} /> : null}
          <Field label="Type my own" value={custom} onChange={(v) => { setCustom(v); setError(null); }} keyboard="default" placeholder="e.g. Hammer strength row" />
          {error ? <Banner tone="danger" text={`Blocked: ${error}`} /> : null}
          <Button label="Use my own" disabled={custom.trim().length < 3} onPress={() => choose(custom.trim())} />
        </>
      ) : (
        <>
          <T v="heading">{pick}</T>
          <Row>
            <Button label="Just today" onPress={() => { onSwap(pick, 'today'); close(); }} flex />
            <Button label="From now on" variant="secondary" onPress={() => { onSwap(pick, 'always'); close(); }} flex />
          </Row>
        </>
      )}
    </Sheet>
  );
}

function ExerciseCard({ ex, active, onSwap, onHurt }: { ex: PlannedExercise; active: WorkoutLog; onSwap: () => void; onHurt: () => void }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(true);
  const doneCount = active.sets.filter((s) => s.exerciseId === ex.def.id && s.done).length;
  const range = ex.def.timed ? `${ex.def.secs![0]}-${ex.def.secs![1]} s` : ex.def.reps![0] === ex.def.reps![1] ? `${ex.def.reps![0]}` : `${ex.def.reps![0]}-${ex.def.reps![1]}`;
  const s = ex.suggestion;
  return (
    <Card style={doneCount >= ex.sets ? { borderColor: c.emerald } : undefined}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={`${ex.nameUsed}, ${doneCount} of ${ex.sets} sets done`}>
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <T v="heading">{ex.nameUsed}</T>
            <T v="caption" muted>
              {ex.def.muscles}
              {ex.nameUsed !== ex.def.name ? ` · swap for ${ex.def.name}` : ''}
            </T>
          </View>
          <T v="label" color={doneCount >= ex.sets ? c.success : c.textMuted}>
            {doneCount}/{ex.sets}
          </T>
          <Icon name={open ? 'up' : 'down'} color={c.textMuted} />
        </Row>
      </Pressable>
      {open ? (
        <>
          <T v="label">
            {ex.sets} x {range}
            {ex.def.perSide ? ' per side' : ''} · rest {ex.def.rest}s · RIR {ex.rir}
          </T>
          <T muted>{ex.def.cue}</T>
          {s.lastSummary ? <T v="caption" muted>Last time: {s.lastSummary}</T> : null}
          <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.sm, padding: space.sm }}>
            <T v="label" color={c.primary}>
              {active.deload ? `Deload: about 90% of last weight${ex.prefillWeight ? ` (${ex.prefillWeight} kg)` : ''}, RIR 4.` : s.message}
            </T>
          </View>
          {s.stall && !active.deload ? <Banner tone="warning" text={s.stallMessage ?? ''} /> : null}
          {Array.from({ length: ex.sets }).map((_, i) => (
            <SetRow key={`${ex.nameUsed}-${i}`} ex={ex} index={i} existing={active.sets.find((x) => x.exerciseId === ex.def.id && x.setIndex === i)} />
          ))}
          <Row>
            <Button label="Not available / busy?" icon="swap" small variant="secondary" onPress={onSwap} flex />
            <Button label="Something hurt" icon="alert" small variant="ghost" onPress={onHurt} flex />
          </Row>
        </>
      ) : null}
    </Card>
  );
}

export function WorkoutView({ week }: { week: number }) {
  useKeepAwake();
  const active = useApp((s) => s.active) as WorkoutLog;
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const [todaySwaps, setTodaySwaps] = useState<Record<string, string>>({});
  const [swapFor, setSwapFor] = useState<PlannedExercise | null>(null);
  const [hurtFor, setHurtFor] = useState<string | null>(null);
  const [red, setRed] = useState(false);
  const [summary, setSummary] = useState(false);
  const [feel, setFeel] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { list, hidden } = usePlannedExercises(active, week, todaySwaps);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const total = list.reduce((a, e) => a + e.sets, 0);
  const done = active.sets.filter((s) => s.done).length;
  const elapsed = Math.round((now - active.startedAt) / 60000);
  const doneSets = active.sets.filter((s) => s.done);
  const volume = doneSets.reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0);

  const prs = useMemo(() => {
    const sets = active.sets.filter((s) => s.done);
    const names = [...new Set(sets.map((s) => s.nameUsed))];
    return names.filter((n) => {
      const cur: ExerciseSession = { date: active.date, deload: active.deload, sets: sets.filter((s) => s.nameUsed === n) };
      return !active.deload && isPR(cur, historyFor(data.workouts, n));
    });
  }, [data.workouts, active]);

  const message = FINISH_MESSAGES[(active.startedAt / 1000) % FINISH_MESSAGES.length | 0];

  const finish = () => {
    st.finishWorkout({ feel: feel ?? undefined, prs });
    setSummary(false);
    if (prs.length) celebrate({ kind: 'pr', title: 'Personal record!', text: prs.join(', ') });
  };

  return (
    <>
      <Card tone="alt">
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T v="title">{SESSIONS[active.sessionKey].name}</T>
            <T v="caption" muted>
              {elapsed} min · est. {SESSIONS[active.sessionKey].minutes} min · {active.kind === 'minimum' ? 'minimum version' : 'full session'}
            </T>
          </View>
        </Row>
        <ProgressBar label="Session" value={done} max={total} valueText={`${done} / ${total} sets`} />
      </Card>
      {active.deload ? <Banner tone="info" icon="moon" text="Deload week: lighter on purpose. Half the sets, about 90% weights, RIR 4." /> : null}
      {!data.checklist.doctor_bp?.done ? <Banner tone="warning" text="BP not yet checked: breathe out on the effort, no breath-holding, no grinding reps." /> : null}
      {hidden.length ? (
        <Banner tone="warning" text={`Paused until a doctor or physio clears you: ${hidden.map((h) => h.name).join(', ')}.`} action="Unpause in Settings" onPress={() => router.push('/settings')} />
      ) : null}

      {list.map((ex) => (
        <ExerciseCard key={ex.def.id} ex={ex} active={active} onSwap={() => setSwapFor(ex)} onHurt={() => setHurtFor(ex.nameUsed)} />
      ))}

      <Card tone="alt">
        <T v="label">Cool-down: 3-5 min easy walk.</T>
      </Card>
      <Button label="Finish workout" icon="check" variant="accent" onPress={() => setSummary(true)} disabled={done === 0} />
      <Row>
        <Button
          label="Cancel workout"
          variant="ghost"
          small
          flex
          onPress={() =>
            Alert.alert('Cancel this workout?', 'Logged sets from this session will be discarded.', [
              { text: 'Keep going', style: 'cancel' },
              { text: 'Discard', style: 'destructive', onPress: () => st.cancelWorkout() },
            ])
          }
        />
        <Button label="Something feels wrong" variant="ghost" small icon="heart" flex onPress={() => setRed(true)} />
      </Row>

      <SwapSheet
        ex={swapFor}
        onClose={() => setSwapFor(null)}
        onSwap={(name, scope) => {
          if (!swapFor) return;
          if (scope === 'today') setTodaySwaps((x) => ({ ...x, [swapFor.def.id]: name as string }));
          else {
            st.swapExercise(swapFor.def.id, name);
            setTodaySwaps((x) => {
              const n = { ...x };
              delete n[swapFor.def.id];
              return n;
            });
          }
        }}
      />
      <PainSheet visible={!!hurtFor} onClose={() => setHurtFor(null)} date={active.date} exercise={hurtFor ?? undefined} />
      <RedFlagSheet visible={red} onClose={() => setRed(false)} date={active.date} />
      <Sheet visible={summary} onClose={() => setSummary(false)} title="Workout summary">
        <Row wrap>
          <Card style={{ flex: 1 }}>
            <T v="caption" muted>Sets</T>
            <T v="number">{done}</T>
          </Card>
          <Card style={{ flex: 1 }}>
            <T v="caption" muted>Volume</T>
            <T v="number">{Math.round(volume).toLocaleString('en-US')}</T>
            <T v="caption" muted>kg x reps</T>
          </Card>
          <Card style={{ flex: 1 }}>
            <T v="caption" muted>Time</T>
            <T v="number">{Math.max(1, elapsed)}</T>
            <T v="caption" muted>min</T>
          </Card>
        </Row>
        {prs.length ? <Banner tone="accent" icon="trophy" text={`Personal records: ${prs.join(', ')}`} /> : <T muted>No new records today. Consistency is what makes the next one happen.</T>}
        <T v="bodyStrong">{message}</T>
        <Segmented label="How did it feel? (1 = awful, 5 = great)" value={feel} onChange={setFeel} options={[1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }))} />
        <Button label="Save workout" icon="check" onPress={finish} />
      </Sheet>
    </>
  );
}
