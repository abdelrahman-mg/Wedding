// Live workout: exercise cards, set rows, progression, rest timer, swaps, finish summary.
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, TextInput, View } from 'react-native';
import { FINISH_MESSAGES } from '../data/messages';
import { KNEE_SAFETY } from '../data/guides';
import { altDisplayName, findExercise, LOWER_SESSIONS, SESSIONS, type ExerciseDef } from '../data/sessions';
import { tutorialUrl } from '../data/tutorials';
import { checkExerciseSafety } from '../engine/limits';
import { deloadLoad, isLearningPhase, LEARNING_BANNER, workingSets } from '../engine/phase';
import { historyFor, isPR, suggestLight, suggestProgression, type ExerciseSession, type LoggedSet, type Suggestion } from '../engine/progression';
import type { SetLog, WorkoutLog } from '../engine/types';
import { useApp } from '../store/useApp';
import { celebrate } from '../ui/celebrate';
import { Icon } from '../ui/Icon';
import { Banner, Button, Card, Field, ProgressBar, Row, Segmented, Sheet, T } from '../ui/kit';
import { radius, space, type, useTheme } from '../ui/theme';
import { PainSheet, RedFlagSheet } from './SafetySheets';

export interface PlannedExercise {
  def: ExerciseDef;
  nameUsed: string;
  swappedToday: boolean;
  sets: number;
  suggestion: Suggestion;
  prefillWeight: number | null;
  /** Sets of the most recent session with this exercise, for "last time" numbers. */
  lastSets: LoggedSet[];
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
    const hidden = defs.filter((d) => isRestricted(d, data.settings.restricted));
    const shown = defs.filter((d) => !isRestricted(d, data.settings.restricted));
    const list: PlannedExercise[] = shown.map((def) => {
      const nameUsed = todaySwaps[def.id] ?? data.plan.exerciseSwaps[def.id] ?? def.name;
      const history = historyFor(data.workouts, nameUsed);
      let suggestion: Suggestion;
      if (def.lightOf) {
        const main = findExercise(def.lightOf.id);
        const mainName = todaySwaps[def.lightOf.id] ?? data.plan.exerciseSwaps[def.lightOf.id] ?? main?.name ?? def.lightOf.id;
        suggestion = { ...suggestLight(def, historyFor(data.workouts, mainName), mainName), lastSummary: suggestProgression(def, history).lastSummary };
      } else {
        suggestion = suggestProgression(def, history);
      }
      let sets = workingSets(def.sets, week, active.deload);
      if (def.timed && suggestion.sets && !active.deload && week > 2) sets = Math.min(4, Math.max(sets, suggestion.sets));
      const last = lastTopWeight(history);
      const prefillWeight = def.timed || def.bodyweight ? null : active.deload ? (last ? deloadLoad(last) : null) : suggestion.weight;
      const lastSets = history.length ? history[history.length - 1].sets : [];
      return { def, nameUsed, swappedToday: !!todaySwaps[def.id], sets, suggestion, prefillWeight, lastSets };
    });
    return { list, hidden };
  }, [active.sessionKey, active.deload, data.workouts, data.plan.exerciseSwaps, data.settings.restricted, todaySwaps, week]);
}

function NumInput({ value, onChange, step, label, unit, disabled, decimal }: { value: string; onChange: (v: string) => void; step: number; label: string; unit: string; disabled?: boolean; decimal?: boolean }) {
  const { c } = useTheme();
  const bump = (dir: 1 | -1) => {
    const cur = parseFloat(value.replace(',', '.'));
    const base = Number.isFinite(cur) ? cur : 0;
    const next = Math.max(0, Math.round((base + dir * step) * 100) / 100);
    onChange(String(next));
  };
  const btn = (dir: 1 | -1) => (
    <Pressable
      onPress={() => bump(dir)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${dir > 0 ? 'Increase' : 'Decrease'} ${label}`}
      hitSlop={4}
      style={{ width: 48, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceAlt, opacity: disabled ? 0.4 : 1 }}
    >
      <Icon name={dir > 0 ? 'plus' : 'minus'} color={c.primary} size={24} strokeWidth={2.5} />
    </Pressable>
  );
  return (
    <View style={{ flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface }}>
      {btn(-1)}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          placeholder="0"
          placeholderTextColor={c.textMuted}
          style={[type.heading, { color: c.text, minHeight: 52, minWidth: 56, textAlign: 'center', paddingVertical: 0 }]}
          accessibilityLabel={label}
          editable={!disabled}
          selectTextOnFocus
        />
        <T v="caption" muted style={{ marginTop: -10 }}>{unit}</T>
      </View>
      {btn(1)}
    </View>
  );
}

function SetRow({ ex, index, existing, clean }: { ex: PlannedExercise; index: number; existing?: SetLog; clean: boolean }) {
  const { c } = useTheme();
  const upsert = useApp((s) => s.upsertSet);
  const setTimer = useApp((s) => s.setRestTimer);
  const unit = ex.def.timed ? 'sec' : 'reps';
  const last = ex.lastSets[index] ?? ex.lastSets[ex.lastSets.length - 1];
  const [weight, setWeight] = useState(existing?.weight != null ? String(existing.weight) : ex.prefillWeight != null ? String(ex.prefillWeight) : '');
  const [reps, setReps] = useState(existing?.reps != null ? String(existing.reps) : String(ex.suggestion.targetReps));
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
      rir: null,
      clean,
      done: !done,
    };
    upsert(s);
    if (!done) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setTimer({ endsAt: Date.now() + ex.def.rest * 1000, total: ex.def.rest, label: ex.nameUsed });
    }
  };

  const lastText = last ? `${last.weight ? `${last.weight} kg × ` : ''}${last.reps ?? '-'}${ex.def.timed ? ' s' : ''}` : null;

  return (
    <View style={{ gap: 8, paddingVertical: 10, borderTopWidth: index ? 1 : 0, borderTopColor: c.border, opacity: done ? 0.7 : 1 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T v="bodyStrong">Set {index + 1}</T>
          {lastText ? <T v="caption" muted>Last time: {lastText}</T> : null}
        </View>
        <Pressable
          onPress={toggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`Set ${index + 1} done`}
          style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? c.emerald : c.surfaceAlt, borderWidth: 2, borderColor: done ? c.emerald : c.border }}
        >
          <Icon name="check" color={done ? '#fff' : c.textMuted} size={28} strokeWidth={2.5} />
        </Pressable>
      </Row>
      <Row>
        {!noWeight ? <NumInput value={weight} onChange={setWeight} step={2.5} label={`Set ${index + 1} weight in kilograms`} unit="kg" disabled={done} decimal /> : null}
        <NumInput value={reps} onChange={setReps} step={ex.def.timed ? 5 : 1} label={`Set ${index + 1} ${unit}`} unit={unit} disabled={done} />
      </Row>
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
  const upsert = useApp((st) => st.upsertSet);
  const doneSets = active.sets.filter((x) => x.exerciseId === ex.def.id && x.done);
  const [clean, setClean] = useState(true);
  const cleanNow = doneSets.length ? doneSets.every((x) => x.clean !== false) && clean : clean;
  const toggleClean = () => {
    const next = !cleanNow;
    setClean(next);
    for (const x of doneSets) upsert({ ...x, clean: next });
  };
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
            {ex.def.perSide ? ' per side' : ''} · rest {ex.def.rest}s
          </T>
          <T muted>{ex.def.cue}</T>
          <Button label="Watch tutorial" icon="play" small variant="secondary" onPress={() => Linking.openURL(tutorialUrl(ex.def, ex.nameUsed)).catch(() => {})} accessibilityLabel={`Watch tutorial: ${ex.nameUsed}`} />
          {s.lastSummary ? <T v="caption" muted>Last session: {s.lastSummary}</T> : null}
          <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.sm, padding: space.sm }}>
            <T v="label" color={c.primary}>
              {active.deload ? `Deload: about 90% of last weight${ex.prefillWeight ? ` (${ex.prefillWeight} kg)` : ''}, easy reps.` : s.message}
            </T>
          </View>
          {s.stall && !active.deload && s.kind !== 'deload' ? <Banner tone="warning" text={s.stallMessage ?? ''} /> : null}
          {Array.from({ length: ex.sets }).map((_, i) => (
            <SetRow key={`${ex.nameUsed}-${i}`} ex={ex} index={i} clean={cleanNow} existing={active.sets.find((x) => x.exerciseId === ex.def.id && x.setIndex === i)} />
          ))}
          {!ex.def.timed && ex.def.inc > 0 ? (
            <Pressable
              onPress={toggleClean}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: cleanNow }}
              accessibilityLabel="Form was clean on every set"
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 52, paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: cleanNow ? c.successSoft : c.warningSoft }}
            >
              <Icon name={cleanNow ? 'check' : 'alert'} color={cleanNow ? c.success : c.warning} />
              <T v="bodyStrong" color={cleanNow ? c.success : c.warning} style={{ flex: 1 }}>
                {cleanNow ? 'Form was clean' : 'Form slipped (no weight increase next time)'}
              </T>
              <T v="caption" muted>tap to change</T>
            </Pressable>
          ) : null}
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
      {active.deload ? <Banner tone="info" icon="moon" text="Deload week: lighter on purpose. Half the sets, about 90% weights." /> : null}
      {!active.deload && isLearningPhase(week) ? <Banner tone="accent" icon="star" text={LEARNING_BANNER} /> : null}
      {LOWER_SESSIONS.includes(active.sessionKey) || active.sessionKey === 'MINIMUM' ? <Banner tone="info" icon="alert" text={`Knee: pain-free range only, use the safety bars. ${KNEE_SAFETY}`} /> : null}
      {active.sessionKey === 'BENCH' ? <Banner tone="info" icon="alert" text="Shoulder: use safeties or a spotter, stop if the right shoulder pinches or feels loose." /> : null}
      {!data.checklist.doctor_bp?.done ? <Banner tone="warning" text="BP not yet checked: breathe out on the effort, no breath-holding, no grinding reps. Heavy lifts count." /> : null}
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
